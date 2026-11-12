import crypto from "node:crypto";
import { after, NextResponse } from "next/server";
import { campaignStore } from "@/lib/agents/store";
import { authenticateTelegramRequest } from "@/lib/telegram-auth";
import { notifyGiftSelected } from "@/lib/circle-notifications";

export async function POST(request: Request) {
  const identity = await authenticateTelegramRequest(request);
  if (!identity) return NextResponse.json({ error: "Open WanderWrap from Telegram" }, { status: 401 });
  const body = await request.json();
  const campaign = await campaignStore.get(String(body.circleId || ""));
  if (!campaign) return NextResponse.json({ error: "Circle not found" }, { status: 404 });
  if (campaign.organizerId && campaign.organizerId !== identity.id) return NextResponse.json({ error: "Only the Circle organiser can choose the gift" }, { status: 403 });
  const product = campaign.productRecommendations?.find((item) => item.id === String(body.productId || ""));
  if (!product) return NextResponse.json({ error: "That recommendation is no longer available" }, { status: 404 });
  campaign.selectedProductId = product.id;
  campaign.updatedAt = new Date().toISOString();
  campaign.traces.push({ id: crypto.randomUUID(), agent: "gift-curator", label: "Gift direction selected", summary: `${product.title} is now shown with the contribution and recipient claim journeys. Price and availability must be rechecked before purchase.`, status: "complete", at: campaign.updatedAt });
  await campaignStore.save(campaign);
  after(() => notifyGiftSelected(campaign.id, product.id, product.title));
  return NextResponse.json({ campaign });
}
