import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { authenticateTelegramRequest } from "@/lib/telegram-auth";
import { createPayPalLoginUrl } from "@/lib/paypal";

export async function POST(request: Request) {
  const identity = authenticateTelegramRequest(request);
  if (!identity) return NextResponse.json({ error: "Telegram authentication required" }, { status: 401 });
  const secret = process.env.PAYPAL_OAUTH_STATE_SECRET;
  if (!secret) return NextResponse.json({ error: "PayPal login is not configured" }, { status: 503 });
  const payload = Buffer.from(JSON.stringify({ sub: identity.id, exp: Date.now() + 10 * 60_000, nonce: crypto.randomUUID() })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return NextResponse.json({ url: createPayPalLoginUrl(`${payload}.${signature}`) });
}
