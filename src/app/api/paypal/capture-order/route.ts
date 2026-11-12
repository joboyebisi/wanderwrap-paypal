import { NextResponse } from "next/server";
import { capturePayPalOrder } from "@/lib/paypal";
import { recordCompletedCapture } from "@/lib/paypal-ledger";

export async function POST(request: Request) {
  try {
    const { orderId } = await request.json();
    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json({ error: "A PayPal order ID is required" }, { status: 400 });
    }
    const capture = await capturePayPalOrder(orderId);
    await recordCompletedCapture(capture);
    return NextResponse.json(capture);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not capture order" }, { status: 500 });
  }
}
