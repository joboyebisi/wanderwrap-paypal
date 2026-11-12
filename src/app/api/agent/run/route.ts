import { NextResponse } from "next/server";
import { runCircleHarness } from "@/lib/agents/harness";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.prompt || !body.chatId || !body.actorId) return NextResponse.json({ error: "prompt, chatId and actorId are required" }, { status: 400 });
    return NextResponse.json(await runCircleHarness(body));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Agent run failed" }, { status: 500 });
  }
}
