import { NextResponse } from "next/server";
import { listChatEvents, registerImportantEvent } from "@/lib/agents/events";
import { authenticateTelegramRequest } from "@/lib/telegram-auth";

export async function GET(request: Request) {
  const identity = await authenticateTelegramRequest(request);
  if (!identity) return NextResponse.json({ error: "Telegram authentication required" }, { status: 401 });
  const requestedChatId = new URL(request.url).searchParams.get("chatId");
  const chatId = identity.demo ? requestedChatId : (identity.chatId || identity.chatInstance || `user:${identity.id}`);
  if (!chatId) return NextResponse.json({ error: "chatId is required" }, { status: 400 });
  return NextResponse.json({ events: await listChatEvents(chatId) });
}

export async function POST(request: Request) {
  const identity = await authenticateTelegramRequest(request);
  if (!identity) return NextResponse.json({ error: "Telegram authentication required" }, { status: 401 });
  const body = await request.json();
  const chatId = identity.demo ? (body.chatId || "telegram-demo") : (identity.chatId || identity.chatInstance || `user:${identity.id}`);
  if (!body.recipient || !/^\d{4}-\d{2}-\d{2}$/.test(body.date || "")) return NextResponse.json({ error: "recipient and an ISO date are required" }, { status: 400 });
  const event = await registerImportantEvent({ chatId, recipient: body.recipient, occasion: body.occasion || "Birthday", date: body.date, recurrence: body.recurrence === "none" ? "none" : "yearly", reminderDays: [21, 14, 7], createdBy: identity.id });
  return NextResponse.json({ event }, { status: 201 });
}
