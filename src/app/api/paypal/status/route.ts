import { NextResponse } from "next/server";
import { authenticateTelegramRequest } from "@/lib/telegram-auth";
import { getPayPalIdentity } from "@/lib/paypal-identity";

export async function GET(request: Request) {
  const identity = await authenticateTelegramRequest(request);
  if (!identity) return NextResponse.json({ error: "Telegram authentication required" }, { status: 401 });
  const paypal = await getPayPalIdentity(identity.id);
  return NextResponse.json(paypal ? {
    connected: true,
    name: paypal.name,
    email: paypal.email,
    verified: paypal.verified,
    linkedAt: paypal.linkedAt,
  } : { connected: false });
}
