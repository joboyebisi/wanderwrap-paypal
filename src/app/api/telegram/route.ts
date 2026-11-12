import { after, NextResponse } from "next/server";
import { runCircleHarness } from "@/lib/agents/harness";
import { listChatEvents, registerImportantEvent } from "@/lib/agents/events";
import { claimTelegramAction, claimTelegramUpdate } from "@/lib/telegram-updates";
import { campaignStore } from "@/lib/agents/store";
import { upsertCircleMember } from "@/lib/circle-members";
import { getCircleFunding } from "@/lib/paypal-ledger";
import { addBotToGroupLink, circleDmOptInLink, circleMiniAppLink, escapeTelegramHtml, mainMiniAppLink } from "@/lib/telegram-bot";
import { notifyCircleCreated } from "@/lib/circle-notifications";

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
  const callback = update.callback_query;
  const unsubscribe = callback?.data?.match(/^unsubscribe:([A-Za-z0-9-]{1,48})$/);
  if (unsubscribe && callback.from?.id) {
    await upsertCircleMember({
      circleId: unsubscribe[1],
      userId: String(callback.from.id),
      firstName: callback.from.first_name,
      username: callback.from.username,
      notifications: false,
    });
    await fetch(api(token, "answerCallbackQuery"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callback.id, text: "Private Circle updates are off" }),
    });
    if (callback.message?.chat?.id) await sendMessage(token, callback.message.chat.id, "Private updates are off. You can opt in again from the Circle at any time.");
    return;
  }
  if (callback?.data === "how_it_works" && callback.message?.chat?.id) {
    await fetch(api(token, "answerCallbackQuery"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callback_query_id: callback.id }) });
    await sendMessage(token, callback.message.chat.id, "✨ <b>How a WanderWrap Circle works</b>\n\n1️⃣ Start in a group or the Mini App\n2️⃣ Share one private Circle link\n3️⃣ Friends contribute through PayPal\n4️⃣ Everyone sees only the group total\n5️⃣ The organiser approves any purchase or release\n6️⃣ The recipient gets a beautiful reveal 🎀", { inline_keyboard: [[{ text: "🎁 Open WanderWrap", url: mainMiniAppLink() }]] });
    return;
  }
  if (callback?.data === "privacy" && callback.message?.chat?.id) {
    await fetch(api(token, "answerCallbackQuery"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callback_query_id: callback.id }) });
    await sendMessage(token, callback.message.chat.id, "🔐 <b>Private by design</b>\n\nContribution amounts are never posted to the group. Gift-related context is analysed only after consent. Purchases and money-gift releases always pause for organiser approval.");
    return;
  }
  const message = update.message;
  if (!message?.chat?.id) return;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const text = message.text || "";
  const chatKey = String(message.chat.id);

  const circleStart = text.match(/^\/start(?:@\w+)?\s+circle_([A-Za-z0-9-]{1,48})$/i);
  if (circleStart) {
    const campaign = await campaignStore.get(circleStart[1]);
    if (!campaign) {
      await sendMessage(token, message.chat.id, "That Circle link is no longer available. Ask the organiser for a fresh link.");
      return;
    }
    const userId = String(message.from?.id || message.chat.id);
    await upsertCircleMember({
      circleId: campaign.id,
      userId,
      firstName: message.from?.first_name,
      username: message.from?.username,
      notifications: true,
    });
    const funding = await getCircleFunding(campaign.id);
    await sendMessage(token, message.chat.id,
      `🎁 <b>You’re in ${escapeTelegramHtml(campaign.recipient)}’s ${escapeTelegramHtml(campaign.occasion)} Circle.</b>\n\nThe group has raised <b>£${funding.total.toFixed(2)} of £${campaign.targetAmount.toFixed(2)}</b>. I’ll send private milestone updates without revealing anyone else’s amount.`,
      { inline_keyboard: [[{ text: "Open Circle & contribute", url: circleMiniAppLink(campaign.id) }], [{ text: "Stop updates", callback_data: `unsubscribe:${campaign.id}` }]] });
    return;
  }

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

  if (text.startsWith("/research_gift")) {
    const campaign = await campaignStore.findByChat(chatKey);
    if (!campaign) {
      await sendMessage(token, message.chat.id, "Create a Circle first with <code>/circle Sarah's birthday, £100, 5 friends</code>. Then Scout can research live gifts inside that Circle.");
      return;
    }
    await sendMessage(token, message.chat.id, `🔎 <b>Scout is ready to research for ${escapeTelegramHtml(campaign.recipient)}.</b>\n\nOpen the Circle, add only public gift clues you have permission to use, and Sage will build an evidence-bound profile before Scout searches live Channel3 products.`, {
      inline_keyboard: [[{ text: "Research live gifts ✨", url: circleMiniAppLink(campaign.id) }], [{ text: "Privacy & consent", callback_data: "privacy" }]],
    });
    return;
  }

  if (text.startsWith("/circle") || text.startsWith("/gift")) {
    const prompt = text.replace(/^\/(circle|gift)(@\w+)?/, "").trim();
    const recipientEmail = prompt.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase();
    if (!prompt || !recipientEmail) {
      await sendMessage(token, message.chat.id, "Include the private gift-delivery email when you create the link:\n\n<code>/circle Sarah's birthday on 2026-12-18, £10, 2 friends, sarah@example.com</code>\n\nOnly the organiser can use it to send the final reveal. Contributors never see it.");
      return;
    }
    const result = await runCircleHarness({
      chatId: chatKey, actorId: String(message.from?.id || "unknown"), prompt,
      consentToAnalyse: memory.consented.has(chatKey), messageHistory: memory.messages.get(chatKey) ?? [],
      recipientEmail, forceNew: true,
    });
    after(() => notifyCircleCreated(result.campaign.id));
    await sendMessage(token, message.chat.id, `🎁 <b>${result.campaign.recipient}’s ${result.campaign.occasion} Circle</b>\n\n${result.reply}\n\nShare this message so each person can open the exact Circle and opt into private updates.`, {
      inline_keyboard: [[{ text: "Open Circle ✨", url: circleMiniAppLink(result.campaign.id) }], [{ text: "Research live gifts 🔎", url: circleMiniAppLink(result.campaign.id) }], [{ text: "Get private updates", url: circleDmOptInLink(result.campaign.id) }], [{ text: "Privacy & consent", callback_data: "privacy" }]],
    });
  } else if (text.startsWith("/start")) {
    const welcomeKey = String(message.from?.id || message.chat.id);
    if (!await claimTelegramAction(`WELCOME#${welcomeKey}`, 300)) return;
    await sendMessage(token, message.chat.id,
      "🎁 <b>Welcome to WanderWrap</b>\n<i>Great gifts. Together.</i>\n\n✨ Create or join a gift Circle\n💳 Contribute securely with PayPal\n🔔 Get thoughtful private reminders\n🔐 Keep individual amounts private\n🎀 Build a reveal they’ll remember\n\nStart here — I’ll keep the coordination simple.",
      { inline_keyboard: [[{ text: "🎁 Open WanderWrap", url: mainMiniAppLink() }], [{ text: "➕ Add me to a group", url: addBotToGroupLink() }], [{ text: "✨ How it works", callback_data: "how_it_works" }, { text: "🔐 Privacy", callback_data: "privacy" }]] });
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
