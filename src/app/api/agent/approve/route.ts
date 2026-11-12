import { NextResponse } from "next/server";
import { approveCampaignAction } from "@/lib/agents/harness";

export async function POST(request: Request) {
  const { campaignId, approval } = await request.json();
  const campaign = await approveCampaignAction(campaignId, approval);
  return campaign ? NextResponse.json({ campaign }) : NextResponse.json({ error: "Approval does not match the pending action" }, { status: 409 });
}
