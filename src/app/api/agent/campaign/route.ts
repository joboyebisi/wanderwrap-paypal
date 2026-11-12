import { NextResponse } from "next/server";
import { authenticateTelegramRequest } from "@/lib/telegram-auth";
import { campaignStore } from "@/lib/agents/store";

export async function GET(request: Request) {
  const identity = await authenticateTelegramRequest(request);
  if (!identity) return NextResponse.json({ error: "Open WanderWrap from Telegram" }, { status: 401 });
  const chatId = identity.chatId || identity.chatInstance || `user:${identity.id}`;
  const campaign = await campaignStore.findByChat(chatId);
  return NextResponse.json({ campaign: campaign ?? null });
}
