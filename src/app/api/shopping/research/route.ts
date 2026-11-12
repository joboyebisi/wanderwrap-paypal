import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { campaignStore } from "@/lib/agents/store";
import { Channel3ConfigurationError, searchChannel3Products } from "@/lib/channel3";
import { authenticateTelegramRequest } from "@/lib/telegram-auth";

function safeSourceUrl(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString().slice(0, 500) : undefined;
  } catch {
    return undefined;
  }
}

export async function POST(request: Request) {
  try {
    const identity = await authenticateTelegramRequest(request);
    if (!identity) return NextResponse.json({ error: "Open WanderWrap from Telegram" }, { status: 401 });
    const body = await request.json();
    const circleId = String(body.circleId || "");
    const publicClues = String(body.publicClues || "").trim().slice(0, 2_000);
    if (!circleId || !publicClues) return NextResponse.json({ error: "Add a few gift-relevant clues first" }, { status: 400 });
    if (body.consent !== true) return NextResponse.json({ error: "Confirm you have permission to use these public clues" }, { status: 400 });
    const campaign = await campaignStore.get(circleId);
    if (!campaign) return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    if (campaign.organizerId && campaign.organizerId !== identity.id) return NextResponse.json({ error: "Only the Circle organiser can research gifts" }, { status: 403 });

    const query = `Gift for ${campaign.recipient}'s ${campaign.occasion}. Interests: ${publicClues}. Budget up to GBP ${campaign.targetAmount}. Thoughtful, giftable, and in stock.`;
    const timestamp = new Date().toISOString();
    campaign.recipientResearch = { consented: true, publicClues, sourceUrl: safeSourceUrl(body.sourceUrl), query, updatedAt: timestamp };
    try {
      const products = await searchChannel3Products({
        query,
        maxPrice: campaign.targetAmount,
        userId: `circle_${campaign.id}`,
        rationale: `Scout matched this to the organiser-approved clues: ${publicClues.slice(0, 140)}`,
      });
      if (!products.length) return NextResponse.json({ error: "Scout could not find an in-stock match within this budget. Try broader clues or adjust the target." }, { status: 404 });
      campaign.productRecommendations = products;
      campaign.selectedProductId = products[0].id;
      campaign.traces.push({ id: crypto.randomUUID(), agent: "gift-curator", label: "Live products found with Channel3", summary: `Scout found ${products.length} in-stock option${products.length === 1 ? "" : "s"} within the £${campaign.targetAmount} budget.`, status: "complete", at: timestamp });
      campaign.updatedAt = timestamp;
      await campaignStore.save(campaign);
      return NextResponse.json({ campaign, products });
    } catch (error) {
      campaign.traces.push({ id: crypto.randomUUID(), agent: "gift-curator", label: "Channel3 connection needed", summary: error instanceof Error ? error.message.slice(0, 240) : "Product research is temporarily unavailable.", status: "blocked", at: timestamp });
      campaign.updatedAt = timestamp;
      await campaignStore.save(campaign);
      if (error instanceof Channel3ConfigurationError) return NextResponse.json({ error: error.message, code: "CHANNEL3_NOT_CONFIGURED" }, { status: 503 });
      throw error;
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Product research failed" }, { status: 502 });
  }
}
