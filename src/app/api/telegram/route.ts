import { after, NextResponse } from "next/server";
import { runCircleHarness } from "@/lib/agents/harness";
import { listChatEvents, registerImportantEvent } from "@/lib/agents/events";
import { claimTelegramUpdate } from "@/lib/telegram-updates";

declare global {
  // eslint-disable-next-line no-var
  var wanderwrapTelegramMemory: { consented: Set<string>; messages: Map<string, string[]>; suggestedEvents: Set<string> } | undefined;
}

const memory = globalThis.wanderwrapTelegramMemory ?? { consented: new Set<string>(), messages: new Map<string, string[]>(), suggestedEvents: new Set<string>() };
if (process.env.NODE_ENV !== "production") globalThis.wanderwrapTelegramMemory = memory;

const api = (token: string, method: string) => `https://api.telegram.org/bot${token}/${method}`;

async function sendMessage(token: string, chatId: number, text: string, replyMarkup?: object) {
  await fetch(api(token, "sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", reply_markup: replyMarkup }),
  });
}

async function handleTelegramUpdate(token: string, update: Record<string, any>) {
  const message = update.message;
  if (!message?.chat?.id) return;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const text = message.text || "";
  const chatKey = String(message.chat.id);

  if (text.startsWith("/remember")) {
    const match = text.match(/^\/remember(?:@\w+)?\s+([^,]+),\s*([^,]+),\s*(\d{4}-\d{2}-\d{2})/i);
    if (!match) {
      await sendMessage(token, message.chat.id, "Use <code>/remember Sarah, birthday, 2026-12-18</code>. I’ll suggest a Circle 21, 14 and 7 days before it — never create one automatically.");
    } else {
      await registerImportantEvent({ chatId: chatKey, recipient: match[1].trim(), occasion: match[2].trim(), date: match[3], recurrence: "yearly", reminderDays: [21, 14, 7], createdBy: String(message.from?.id || "unknown") });
      await sendMessage(token, message.chat.id, `🗓️ I’ll remember <b>${match[1].trim()}’s ${match[2].trim()}</b> on ${match[3]} and suggest a Circle before the day.`);
    }
    return;
  }

  if (text.startsWith("/events")) {
    const events = await listChatEvents(chatKey);
    await sendMessage(token, message.chat.id, events.length ? `🗓️ <b>Important dates</b>\n\n${events.map((event) => `• ${event.recipient} — ${event.occasion}, ${event.date}`).join("\n")}` : "No important dates saved yet. Add one with <code>/remember Sarah, birthday, 2026-12-18</code>.");
    return;
  }

  if (text.startsWith("/privacy")) {
    await sendMessage(token, message.chat.id, "🔐 <b>How WanderWrap handles group context</b>\n\nI only look for gift-relevant preferences after the group enables analysis. I avoid sensitive traits, keep contribution amounts private, and never purchase or release funds without an organiser’s approval. Use /analyse_gifts to opt in or /stop_analysis at any time.");
    return;
  }

  if (text.startsWith("/analyse_gifts")) {
    memory.consented.add(chatKey);
    memory.messages.set(chatKey, []);
    await sendMessage(token, message.chat.id, "✨ <b>Gift-only analysis is on.</b>\n\nFrom now on, Sage can use non-sensitive preference clues shared in this group to improve gift ideas. I’ll keep at most the latest 40 relevant messages in this prototype. Anyone can use /stop_analysis.");
    return;
  }

  if (text.startsWith("/stop_analysis")) {
    memory.consented.delete(chatKey);
    memory.messages.delete(chatKey);
    await sendMessage(token, message.chat.id, "Gift analysis is off and the prototype message buffer for this group has been cleared.");
    return;
  }

  if (text.startsWith("/circle") || text.startsWith("/gift")) {
    const result = await runCircleHarness({
      chatId: chatKey, actorId: String(message.from?.id || "unknown"), prompt: text.replace(/^\/(circle|gift)(@\w+)?/, "").trim() || "Create a birthday Circle",
      consentToAnalyse: memory.consented.has(chatKey), messageHistory: memory.messages.get(chatKey) ?? [],
    });
    await sendMessage(token, message.chat.id, `🎁 <b>${result.campaign.recipient}’s ${result.campaign.occasion} Circle</b>\n\n${result.reply}`, {
      inline_keyboard: [[{ text: "Review the agent plan ✨", web_app: { url: `${appUrl}?campaign=${result.campaign.id}` } }], [{ text: "Privacy & consent", callback_data: "privacy" }]],
    });
  } else if (text.startsWith("/start")) {
    await sendMessage(token, message.chat.id,
      "🎁 <b>Let’s make their day.</b>\n\nI’ll help your group choose a thoughtful gift, split the cost and keep everything moving — with secure PayPal contributions.",
      { inline_keyboard: [[{ text: "Create a gift Circle ✨", web_app: { url: appUrl } }]] });
  } else if (memory.consented.has(chatKey)) {
    const buffer = memory.messages.get(chatKey) ?? [];
    buffer.push(`${message.from?.first_name || "Member"}: ${text}`);
    memory.messages.set(chatKey, buffer.slice(-40));
    const eventMatch = text.match(/\b([A-Z][a-z]+)(?:'s)?\s+(birthday|wedding|graduation|farewell)\b.*\b(next\s+\w+|tomorrow|in\s+\d+\s+days?)\b/i);
    if (eventMatch) {
      const eventKey = `${chatKey}:${eventMatch[0].toLowerCase()}`;
      if (!memory.suggestedEvents.has(eventKey)) {
        memory.suggestedEvents.add(eventKey);
        await sendMessage(token, message.chat.id, `✨ I noticed an upcoming ${eventMatch[2].toLowerCase()} for <b>${eventMatch[1]}</b>. Want me to quietly prepare a gift Circle?`, {
          inline_keyboard: [[{ text: `Plan ${eventMatch[1]}’s Circle`, web_app: { url: `${appUrl}?event=${encodeURIComponent(eventMatch[0])}` } }], [{ text: "Not this time", callback_data: "dismiss_event" }]],
        });
      }
    }
  } else {
    await sendMessage(token, message.chat.id,
      "I can help organise a group gift. Tap below to open WanderWrap Circles.",
      { inline_keyboard: [[{ text: "Open Circles", web_app: { url: appUrl } }], [{ text: "How privacy works", callback_data: "privacy" }]] });
  }
}

export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!token) return NextResponse.json({ error: "Bot is not configured" }, { status: 503 });
  if (!expectedSecret || request.headers.get("x-telegram-bot-api-secret-token") !== expectedSecret) {
    return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 1_000_000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });

  let update: Record<string, any>;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid Telegram update" }, { status: 400 });
  }
  if (!await claimTelegramUpdate(Number(update.update_id))) return NextResponse.json({ ok: true, duplicate: true });

  after(async () => {
    try {
      await handleTelegramUpdate(token, update);
    } catch (error) {
      console.error("Telegram update processing failed", error);
    }
  });
  return NextResponse.json({ ok: true, accepted: true }, { status: 202 });
}

export function GET() {
  return NextResponse.json({ ok: true, service: "WanderWrap Telegram webhook" });
}
