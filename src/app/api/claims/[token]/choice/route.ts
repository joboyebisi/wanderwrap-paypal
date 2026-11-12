import { NextResponse } from "next/server";
import { getGiftClaim, publicGiftClaim, setGiftClaimChoice } from "@/lib/claims";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const claim = await getGiftClaim(token);
  if (!claim || claim.status === "revoked") return NextResponse.json({ error: "This gift link is invalid or has expired" }, { status: 404 });
  const body = await request.json();
  const choice = String(body.choice || "");
  if (choice !== "cash" && choice !== "gift") return NextResponse.json({ error: "Choose the PayPal gift or the recommended gift" }, { status: 400 });
  if (choice === "gift" && !claim.recommendedProduct) return NextResponse.json({ error: "This Circle does not have a selected product" }, { status: 409 });
  const updated = await setGiftClaimChoice(claim, choice);
  return NextResponse.json({
    claim: publicGiftClaim(updated),
    message: choice === "gift"
      ? "Your gift preference is saved. Porter will recheck price and availability, then ask the organiser to approve purchase."
      : claim.payoutEnabled
        ? "Your PayPal cash-gift preference is saved. Continue only through the secure PayPal handoff."
        : "Your cash-gift preference is saved. No payout is represented as complete while PayPal Payouts remains disabled.",
  });
}
