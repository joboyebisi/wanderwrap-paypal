import { after, NextResponse } from "next/server";
import { verifyPayPalWebhook } from "@/lib/paypal";
import { recordCompletedCapture } from "@/lib/paypal-ledger";
import { notifyContributionCompleted } from "@/lib/circle-notifications";

export async function POST(request: Request) {
  try {
    const event = await request.json();
    if (!await verifyPayPalWebhook(request.headers, event)) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const resource = event.resource;
      const completed = await recordCompletedCapture({
        id: resource.supplementary_data?.related_ids?.order_id,
        purchase_units: [{ custom_id: resource.custom_id, reference_id: resource.invoice_id, payments: { captures: [resource] } }],
      });
      if (completed?.newlyCompleted) after(() => notifyContributionCompleted(completed.contribution));
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook failed" }, { status: 500 });
  }
}
