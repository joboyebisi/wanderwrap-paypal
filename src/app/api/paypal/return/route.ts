import { after, NextResponse } from "next/server";
import { capturePayPalOrder } from "@/lib/paypal";
import { recordCompletedCapture } from "@/lib/paypal-ledger";
import { notifyContributionCompleted } from "@/lib/circle-notifications";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const circle = url.searchParams.get("circle") || "circle";
  const bot = process.env.TELEGRAM_BOT_USERNAME;
  const fallback = process.env.NEXT_PUBLIC_APP_URL || "/";
  if (url.searchParams.get("cancelled")) return NextResponse.redirect(bot ? `https://t.me/${bot.replace(/^@/, "")}?startapp=payment_cancelled` : `${fallback}?paypal=cancelled`);
  const orderId = url.searchParams.get("token");
  if (!orderId) return NextResponse.redirect(`${fallback}?paypal=error`);
  try {
    const capture = await capturePayPalOrder(orderId);
    const completed = await recordCompletedCapture(capture);
    if (completed?.newlyCompleted) after(() => notifyContributionCompleted(completed.contribution));
    return NextResponse.redirect(bot ? `https://t.me/${bot.replace(/^@/, "")}?startapp=paid_${encodeURIComponent(circle)}` : `${fallback}?paypal=success`);
  } catch {
    return NextResponse.redirect(`${fallback}?paypal=error`);
  }
}
