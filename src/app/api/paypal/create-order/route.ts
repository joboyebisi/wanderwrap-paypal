import { NextResponse } from "next/server";
import { createPayPalOrder } from "@/lib/paypal";
import { registerPayPalOrder } from "@/lib/paypal-ledger";
import { authenticateTelegramRequest } from "@/lib/telegram-auth";

export async function POST(request: Request) {
  try {
    const identity = await authenticateTelegramRequest(request);
    if (!identity) return NextResponse.json({ error: "Telegram authentication required" }, { status: 401 });
    const { amount, circleId } = await request.json();
    if (!circleId) return NextResponse.json({ error: "A Circle is required before contributing" }, { status: 400 });
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 1 || numericAmount > 500) {
      return NextResponse.json({ error: "Contribution must be between £1 and £500" }, { status: 400 });
    }
    const requestId = request.headers.get("idempotency-key") || undefined;
    const order = await createPayPalOrder(numericAmount.toFixed(2), circleId, requestId);
    await registerPayPalOrder(order.id, circleId, numericAmount, identity.id);
    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create order" }, { status: 500 });
  }
}
