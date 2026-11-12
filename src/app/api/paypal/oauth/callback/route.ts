import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { exchangePayPalLoginCode } from "@/lib/paypal";
import { savePayPalIdentity } from "@/lib/paypal-identity";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state") || "";
    const secret = process.env.PAYPAL_OAUTH_STATE_SECRET || "";
    const [payload, suppliedSignature] = state.split(".");
    const expectedSignature = crypto.createHmac("sha256", secret).update(payload || "").digest("base64url");
    if (!code || !payload || !suppliedSignature || !secret || suppliedSignature.length !== expectedSignature.length || !crypto.timingSafeEqual(Buffer.from(suppliedSignature), Buffer.from(expectedSignature))) throw new Error("Invalid or expired PayPal login request");
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (claims.exp < Date.now()) throw new Error("PayPal login request expired");
    const profile = await exchangePayPalLoginCode(code);
    await savePayPalIdentity({ telegramUserId: claims.sub, paypalUserId: profile.user_id, name: profile.name, email: profile.email, verified: Boolean(profile.verified_account), linkedAt: new Date().toISOString() });
    const bot = process.env.TELEGRAM_BOT_USERNAME;
    const destination = bot ? `https://t.me/${bot.replace(/^@/, "")}?startapp=paypal_connected` : `${process.env.NEXT_PUBLIC_APP_URL || "/"}?paypal=connected`;
    return NextResponse.redirect(destination);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "PayPal login failed";
    console.error("PayPal OAuth callback failed", reason);
    const bot = process.env.TELEGRAM_BOT_USERNAME;
    if (bot) return NextResponse.redirect(`https://t.me/${bot.replace(/^@/, "")}?startapp=paypal_error`);
    const message = encodeURIComponent(reason);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || "/"}?paypal=error&message=${message}`);
  }
}
