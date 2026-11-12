import { NextResponse } from "next/server";
import { listChatEvents, registerImportantEvent } from "@/lib/agents/events";

export async function GET(request: Request) {
  const chatId = new URL(request.url).searchParams.get("chatId");
  if (!chatId) return NextResponse.json({ error: "chatId is required" }, { status: 400 });
  return NextResponse.json({ events: await listChatEvents(chatId) });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.chatId || !body.recipient || !/^\d{4}-\d{2}-\d{2}$/.test(body.date || "")) return NextResponse.json({ error: "chatId, recipient and an ISO date are required" }, { status: 400 });
  const event = await registerImportantEvent({ chatId: body.chatId, recipient: body.recipient, occasion: body.occasion || "Birthday", date: body.date, recurrence: body.recurrence === "none" ? "none" : "yearly", reminderDays: [21, 14, 7], createdBy: body.createdBy || "unknown" });
  return NextResponse.json({ event }, { status: 201 });
}
