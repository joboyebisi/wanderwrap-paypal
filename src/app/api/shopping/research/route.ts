import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { campaignStore } from "@/lib/agents/store";
import { Channel3ConfigurationError, searchChannel3Products } from "@/lib/channel3";
import { authenticateTelegramRequest } from "@/lib/telegram-auth";
import { buildGiftProfile, planGiftSearches, rankAndDiversifyProducts } from "@/lib/agents/gift-recommender";

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

    const timestamp = new Date().toISOString();
    const profile = await buildGiftProfile({ recipient: campaign.recipient, occasion: campaign.occasion, publicClues });
    const searchBriefs = await planGiftSearches({ recipient: campaign.recipient, occasion: campaign.occasion, budget: campaign.targetAmount, profile });
    const query = searchBriefs.map((brief) => brief.query).join(" | ");
    campaign.recipientResearch = { consented: true, publicClues, sourceUrl: safeSourceUrl(body.sourceUrl), query, updatedAt: timestamp };
    campaign.giftProfile = profile;
    campaign.searchBriefs = searchBriefs;
    campaign.traces.push({ id: crypto.randomUUID(), agent: "recipient-insight", label: "Evidence-bound gift profile ready", summary: `Sage found ${profile.interests.length + profile.styles.length + profile.values.length} gift-relevant signals at ${Math.round(profile.confidence * 100)}% confidence without assigning a psychological diagnosis.`, status: "complete", at: timestamp });
    campaign.traces.push({ id: crypto.randomUUID(), agent: "gift-curator", label: "Search strategy planned", summary: `Scout created ${searchBriefs.length} diverse, budget-bound Channel3 search briefs.`, status: "complete", at: timestamp });
    try {
      const searches = await Promise.allSettled(searchBriefs.map((brief) => searchChannel3Products({
        query: brief.query,
        maxPrice: campaign.targetAmount,
        userId: `circle_${campaign.id}`,
        rationale: `Scout matched this to organiser-approved evidence for ${campaign.recipient}.`,
        searchIntent: brief.label,
        limit: 6,
      })));
      const configurationFailure = searches.find((result): result is PromiseRejectedResult => result.status === "rejected" && result.reason instanceof Channel3ConfigurationError);
      if (configurationFailure) throw configurationFailure.reason;
      if (searches.every((result) => result.status === "rejected")) throw searches[0].reason;
      const candidates = searches.flatMap((result) => result.status === "fulfilled" ? result.value : []);
      const uniqueCandidates = [...new Map(candidates.map((product) => [product.id, product])).values()];
      const products = rankAndDiversifyProducts(uniqueCandidates, profile, campaign.targetAmount, 6);
      if (!products.length) return NextResponse.json({ error: "Scout could not find an in-stock match within this budget. Try broader clues or adjust the target." }, { status: 404 });
      campaign.productRecommendations = products;
      campaign.selectedProductId = products[0].id;
      campaign.traces.push({ id: crypto.randomUUID(), agent: "gift-curator", label: "Live products found with Channel3", summary: `Scout found ${products.length} in-stock option${products.length === 1 ? "" : "s"} within the £${campaign.targetAmount} budget.`, status: "complete", at: timestamp });
      campaign.updatedAt = timestamp;
      await campaignStore.save(campaign);
      return NextResponse.json({ campaign, profile, searchBriefs, products });
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
