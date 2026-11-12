import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { authenticateTelegramRequest } from "@/lib/telegram-auth";
import { campaignStore } from "@/lib/agents/store";
import { getCircleFunding } from "@/lib/paypal-ledger";
import { createGiftClaim, setGiftClaimStatus } from "@/lib/claims";
import { sendClaimInvitation } from "@/lib/agents/email-agent";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const identity = await authenticateTelegramRequest(request);
    if (!identity) return NextResponse.json({ error: "Telegram authentication required" }, { status: 401 });
    const body = await request.json();
    const circleId = String(body.circleId || "");
    const recipientEmail = String(body.recipientEmail || "").trim().toLowerCase();
    if (!circleId || !EMAIL_PATTERN.test(recipientEmail)) return NextResponse.json({ error: "A valid recipient email is required" }, { status: 400 });
    const [campaign, funding] = await Promise.all([campaignStore.get(circleId), getCircleFunding(circleId)]);
    if (!campaign) return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    if (campaign.organizerId && campaign.organizerId !== identity.id) return NextResponse.json({ error: "Only the Circle organiser can send the claim" }, { status: 403 });
    if (funding.total < campaign.targetAmount) return NextResponse.json({ error: "The verified target must be reached before a claim can be sent" }, { status: 409 });
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];
    const messages = rawMessages.slice(0, 20).map((item: { from?: unknown; message?: unknown }) => ({
      from: String(item.from || "A friend").trim().slice(0, 60),
      message: String(item.message || "").trim().slice(0, 600),
    })).filter((item: { message: string }) => item.message);
    const { claim, token } = await createGiftClaim({
      circleId,
      recipientName: campaign.recipient,
      recipientEmail,
      occasion: campaign.occasion,
      amount: campaign.targetAmount,
      currency: "GBP",
      payoutEnabled: process.env.PAYPAL_PAYOUTS_ENABLED === "true",
      messages,
      createdBy: identity.id,
    });
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, "");
    const claimUrl = `${appUrl}/unwrap/${token}`;
    try {
      await sendClaimInvitation({ to: recipientEmail, recipientName: campaign.recipient, occasion: campaign.occasion, claimUrl });
      await setGiftClaimStatus(claim, "emailed");
      campaign.traces.push({ id: crypto.randomUUID(), agent: "reveal-director", label: "Private reveal sent", summary: `Ribbon emailed a 30-day claim link to ${recipientEmail}.`, status: "complete", at: new Date().toISOString() });
      if (process.env.PAYPAL_PAYOUTS_ENABLED !== "true") campaign.traces.push({ id: crypto.randomUUID(), agent: "treasury", label: "Money release safely paused", summary: "Penny will not represent a payout as complete until PayPal grants the Payouts scope.", status: "blocked", at: new Date().toISOString() });
      campaign.phase = "reveal_ready";
      campaign.updatedAt = new Date().toISOString();
      await campaignStore.save(campaign);
      return NextResponse.json({ ok: true, status: "emailed", payoutEnabled: process.env.PAYPAL_PAYOUTS_ENABLED === "true" });
    } catch (error) {
      await setGiftClaimStatus(claim, "email_failed");
      throw error;
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Claim invitation failed" }, { status: 500 });
  }
}
