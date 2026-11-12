import { after, NextResponse } from "next/server";
import { capturePayPalOrder } from "@/lib/paypal";
import { recordCompletedCapture } from "@/lib/paypal-ledger";
import { authenticateTelegramRequest } from "@/lib/telegram-auth";
import { notifyContributionCompleted } from "@/lib/circle-notifications";

export async function POST(request: Request) {
  try {
    if (!await authenticateTelegramRequest(request)) return NextResponse.json({ error: "Telegram authentication required" }, { status: 401 });
    const { orderId } = await request.json();
    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json({ error: "A PayPal order ID is required" }, { status: 400 });
    }
    const capture = await capturePayPalOrder(orderId);
    const completed = await recordCompletedCapture(capture);
    if (completed?.newlyCompleted) after(() => notifyContributionCompleted(completed.contribution));
    return NextResponse.json(capture);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not capture order" }, { status: 500 });
  }
}
