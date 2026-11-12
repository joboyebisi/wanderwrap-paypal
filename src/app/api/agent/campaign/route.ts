import { NextResponse } from "next/server";
import { authenticateTelegramRequest } from "@/lib/telegram-auth";
import { campaignStore } from "@/lib/agents/store";
import { circleDmOptInLink, circleMiniAppLink } from "@/lib/telegram-bot";

function response(campaign: Awaited<ReturnType<typeof campaignStore.get>>, viewerId: string) {
  const visibleCampaign = campaign && campaign.organizerId !== viewerId
    ? { ...campaign, recipientEmail: undefined, recipientResearch: campaign.recipientResearch ? { ...campaign.recipientResearch, publicClues: "Private organiser-provided gift clues", sourceUrl: undefined } : undefined }
    : campaign;
  return NextResponse.json({
    campaign: visibleCampaign ?? null,
    links: campaign ? { miniApp: circleMiniAppLink(campaign.id), dmOptIn: circleDmOptInLink(campaign.id) } : null,
  });
}

export async function GET(request: Request) {
  const identity = await authenticateTelegramRequest(request);
  if (!identity) return NextResponse.json({ error: "Open WanderWrap from Telegram" }, { status: 401 });
  const requestedCircleId = new URL(request.url).searchParams.get("circleId");
  if (requestedCircleId) {
    const campaign = await campaignStore.get(requestedCircleId);
    return campaign ? response(campaign, identity.id) : NextResponse.json({ error: "Circle not found" }, { status: 404 });
  }
  const chatId = identity.chatId || identity.chatInstance || `user:${identity.id}`;
  const campaign = await campaignStore.findByChat(chatId);
  return response(campaign, identity.id);
}
