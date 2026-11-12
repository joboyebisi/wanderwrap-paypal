import { after, NextResponse } from "next/server";
import { verifyPayPalWebhook } from "@/lib/paypal";
import { getCircleFunding, recordCompletedCapture } from "@/lib/paypal-ledger";
import { campaignStore } from "@/lib/agents/store";
import { listCircleSubscribers } from "@/lib/circle-members";
import { circleMiniAppLink, escapeTelegramHtml, sendTelegramMessage } from "@/lib/telegram-bot";

async function notifyCircle(circleId: string) {
  const [campaign, funding, subscribers] = await Promise.all([
    campaignStore.get(circleId),
    getCircleFunding(circleId),
    listCircleSubscribers(circleId),
  ]);
  if (!campaign) return;
  const text = `🎉 <b>${escapeTelegramHtml(campaign.recipient)}’s Circle moved forward.</b>\n\nA contribution was verified. The group has now raised <b>£${funding.total.toFixed(2)} of £${campaign.targetAmount.toFixed(2)}</b> from ${funding.contributorCount} contributor${funding.contributorCount === 1 ? "" : "s"}. Individual amounts remain private.`;
  const markup = { inline_keyboard: [[{ text: "Open Circle", url: circleMiniAppLink(circleId) }]] };
  const destinations = new Set(subscribers.map((member) => member.userId));
  if (/^-?\d+$/.test(campaign.chatId)) destinations.add(campaign.chatId);
  await Promise.allSettled([...destinations].map((chatId) => sendTelegramMessage(chatId, text, markup)));
}

export async function POST(request: Request) {
  try {
    const event = await request.json();
    if (!await verifyPayPalWebhook(request.headers, event)) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const resource = event.resource;
      const contribution = await recordCompletedCapture({
        id: resource.supplementary_data?.related_ids?.order_id,
        purchase_units: [{ custom_id: resource.custom_id, reference_id: resource.invoice_id, payments: { captures: [resource] } }],
      });
      if (contribution) after(() => notifyCircle(contribution.circleId));
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook failed" }, { status: 500 });
  }
}
