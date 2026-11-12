import { NextResponse } from "next/server";
import { getGiftClaim, publicGiftClaim, setGiftClaimStatus } from "@/lib/claims";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const claim = await getGiftClaim(token);
  if (!claim || claim.status === "revoked") return NextResponse.json({ error: "This gift link is invalid or has expired" }, { status: 404 });
  const updated = claim.status === "emailed" ? await setGiftClaimStatus(claim, "opened") : claim;
  return NextResponse.json({ claim: publicGiftClaim(updated) });
}
