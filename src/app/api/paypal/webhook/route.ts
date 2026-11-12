import { NextResponse } from "next/server";
import { verifyPayPalWebhook } from "@/lib/paypal";
import { recordCompletedCapture } from "@/lib/paypal-ledger";

export async function POST(request: Request) {
  try {
    const event = await request.json();
    if (!await verifyPayPalWebhook(request.headers, event)) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const resource = event.resource;
      await recordCompletedCapture({
        id: resource.supplementary_data?.related_ids?.order_id,
        purchase_units: [{ custom_id: resource.custom_id, reference_id: resource.invoice_id, payments: { captures: [resource] } }],
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook failed" }, { status: 500 });
  }
}
