import { after, NextResponse } from "next/server";
import { approveCampaignAction } from "@/lib/agents/harness";
import { authenticateTelegramRequest } from "@/lib/telegram-auth";
import { notifyFundingOpened } from "@/lib/circle-notifications";
import { campaignStore } from "@/lib/agents/store";

export async function POST(request: Request) {
  const identity = await authenticateTelegramRequest(request);
  if (!identity) return NextResponse.json({ error: "Telegram authentication required" }, { status: 401 });
  const { campaignId, approval } = await request.json();
  const existing = await campaignStore.get(String(campaignId || ""));
  if (!existing) return NextResponse.json({ error: "Circle not found" }, { status: 404 });
  if (existing.organizerId && existing.organizerId !== identity.id) return NextResponse.json({ error: "Only the Circle organiser can approve this action" }, { status: 403 });
  const campaign = await approveCampaignAction(campaignId, approval);
  if (campaign && approval === "open_funding") after(() => notifyFundingOpened(campaign.id));
  return campaign ? NextResponse.json({ campaign }) : NextResponse.json({ error: "Approval does not match the pending action" }, { status: 409 });
}
