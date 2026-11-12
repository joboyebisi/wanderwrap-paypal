import { NextResponse } from "next/server";
import { runCircleHarness } from "@/lib/agents/harness";
import { authenticateTelegramRequest } from "@/lib/telegram-auth";

export async function POST(request: Request) {
  try {
    const identity = authenticateTelegramRequest(request);
    if (!identity) return NextResponse.json({ error: "Open this Circle from Telegram to continue" }, { status: 401 });
    const body = await request.json();
    if (!body.prompt || !body.chatId) return NextResponse.json({ error: "prompt and chatId are required" }, { status: 400 });
    return NextResponse.json(await runCircleHarness({ ...body, actorId: identity.id }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Agent run failed" }, { status: 500 });
  }
}
