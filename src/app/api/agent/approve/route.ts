import { NextResponse } from "next/server";
import { approveCampaignAction } from "@/lib/agents/harness";
import { authenticateTelegramRequest } from "@/lib/telegram-auth";

export async function POST(request: Request) {
  if (!authenticateTelegramRequest(request)) return NextResponse.json({ error: "Telegram authentication required" }, { status: 401 });
  const { campaignId, approval } = await request.json();
  const campaign = await approveCampaignAction(campaignId, approval);
  return campaign ? NextResponse.json({ campaign }) : NextResponse.json({ error: "Approval does not match the pending action" }, { status: 409 });
}
