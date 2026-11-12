import { after, NextResponse } from "next/server";
import { runCircleHarness } from "@/lib/agents/harness";
import { authenticateTelegramRequest } from "@/lib/telegram-auth";
import { notifyCircleCreated } from "@/lib/circle-notifications";

export async function POST(request: Request) {
  try {
    const identity = await authenticateTelegramRequest(request);
    if (!identity) return NextResponse.json({ error: "Open this Circle from Telegram to continue" }, { status: 401 });
    const body = await request.json();
    if (!body.prompt) return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    const chatId = identity.demo ? (body.chatId || "telegram-demo") : (identity.chatId || identity.chatInstance || `user:${identity.id}`);
    const result = await runCircleHarness({ ...body, chatId, actorId: identity.id });
    after(() => notifyCircleCreated(result.campaign.id));
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Agent run failed" }, { status: 500 });
  }
}
