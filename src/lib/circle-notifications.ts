import { campaignStore } from "@/lib/agents/store";
import { listCircleSubscribers, upsertCircleMember } from "@/lib/circle-members";
import type { ContributionRecord } from "@/lib/paypal-ledger";
import { getCircleFunding } from "@/lib/paypal-ledger";
import { circleMiniAppLink, escapeTelegramHtml, sendTelegramMessage } from "@/lib/telegram-bot";
import { claimTelegramAction } from "@/lib/telegram-updates";

const openMarkup = (circleId: string) => ({
  inline_keyboard: [[{ text: "Open Circle 🎁", url: circleMiniAppLink(circleId) }]],
});

async function sendQuietly(chatId: string, text: string, circleId: string) {
  try {
    await sendTelegramMessage(chatId, text, openMarkup(circleId));
    return true;
  } catch {
    return false;
  }
}

export async function notifyCircleCreated(circleId: string) {
  const campaign = await campaignStore.get(circleId);
  if (!campaign?.organizerId || !await claimTelegramAction(`CIRCLE_CREATED#${circleId}`, 60 * 60 * 24 * 30)) return;
  const delivered = await sendQuietly(
    campaign.organizerId,
    `🎁 <b>${escapeTelegramHtml(campaign.recipient)}’s Circle is ready.</b>\n\nThe share link, £${campaign.targetAmount.toFixed(2)} target and private recipient handoff are saved. I’ll send you aggregate progress updates here.`,
    circleId,
  );
  await upsertCircleMember({ circleId, userId: campaign.organizerId, notifications: delivered });
}

export async function notifyFundingOpened(circleId: string) {
  const campaign = await campaignStore.get(circleId);
  if (!campaign || !await claimTelegramAction(`FUNDING_OPENED#${circleId}`, 60 * 60 * 24 * 30)) return;
  const subscribers = await listCircleSubscribers(circleId);
  const destinations = new Set(subscribers.map((member) => member.userId));
  if (campaign.organizerId) destinations.add(campaign.organizerId);
  if (/^-\d+$/.test(campaign.chatId)) destinations.add(campaign.chatId);
  const text = `💛 <b>Contributions are open for ${escapeTelegramHtml(campaign.recipient)}.</b>\n\nThe target is £${campaign.targetAmount.toFixed(2)}. PayPal verifies every completed contribution; individual amounts stay private.`;
  await Promise.allSettled([...destinations].map((id) => sendTelegramMessage(id, text, openMarkup(circleId))));
}

export async function notifyContributionCompleted(record: ContributionRecord) {
  const eventId = record.captureId || record.orderId;
  if (!await claimTelegramAction(`PAYPAL_CAPTURE#${eventId}`, 60 * 60 * 24 * 90)) return;
  const [campaign, funding, subscribers] = await Promise.all([
    campaignStore.get(record.circleId),
    getCircleFunding(record.circleId),
    listCircleSubscribers(record.circleId),
  ]);
  if (!campaign) return;

  const aggregate = `🎉 <b>${escapeTelegramHtml(campaign.recipient)}’s Circle moved forward.</b>\n\nA contribution was verified. Together you’ve raised <b>£${funding.total.toFixed(2)} of £${campaign.targetAmount.toFixed(2)}</b> from ${funding.contributorCount} contributor${funding.contributorCount === 1 ? "" : "s"}. Individual amounts remain private.`;
  const destinations = new Set(subscribers.map((member) => member.userId));
  if (campaign.organizerId) destinations.add(campaign.organizerId);
  if (/^-\d+$/.test(campaign.chatId)) destinations.add(campaign.chatId);

  if (record.contributorId) {
    const receipt = `✅ <b>Your £${record.amount.toFixed(2)} contribution is verified.</b>\n\n${escapeTelegramHtml(campaign.recipient)}’s Circle is now at <b>£${funding.total.toFixed(2)} of £${campaign.targetAmount.toFixed(2)}</b>. Your amount is visible only in this private confirmation.`;
    const delivered = await sendQuietly(record.contributorId, receipt, record.circleId);
    await upsertCircleMember({ circleId: record.circleId, userId: record.contributorId, notifications: delivered });
    destinations.delete(record.contributorId);
  }
  await Promise.allSettled([...destinations].map((id) => sendTelegramMessage(id, aggregate, openMarkup(record.circleId))));
}

export async function notifyClaimSent(circleId: string) {
  const campaign = await campaignStore.get(circleId);
  if (!campaign || !await claimTelegramAction(`CLAIM_SENT#${circleId}`, 60 * 60 * 24 * 90)) return;
  const subscribers = await listCircleSubscribers(circleId);
  const destinations = new Set(subscribers.map((member) => member.userId));
  if (campaign.organizerId) destinations.add(campaign.organizerId);
  if (/^-\d+$/.test(campaign.chatId)) destinations.add(campaign.chatId);
  const text = `🎀 <b>${escapeTelegramHtml(campaign.recipient)}’s private gift reveal was sent.</b>\n\nThe Circle is now in the recipient handoff stage. I’ll keep the group updated without exposing their email or anyone’s contribution amount.`;
  await Promise.allSettled([...destinations].map((id) => sendTelegramMessage(id, text, openMarkup(circleId))));
}

export async function notifyGiftSelected(circleId: string, productId: string, productTitle: string) {
  const campaign = await campaignStore.get(circleId);
  if (!campaign || !await claimTelegramAction(`GIFT_SELECTED#${circleId}#${productId}`, 60 * 60 * 24 * 90)) return;
  const subscribers = await listCircleSubscribers(circleId);
  const destinations = new Set(subscribers.map((member) => member.userId));
  if (campaign.organizerId) destinations.add(campaign.organizerId);
  if (/^-\d+$/.test(campaign.chatId)) destinations.add(campaign.chatId);
  const text = `✨ <b>A gift direction was chosen for ${escapeTelegramHtml(campaign.recipient)}.</b>\n\n${escapeTelegramHtml(productTitle)} is now the Circle’s leading option. Price and availability will be checked again before any organiser-approved purchase.`;
  await Promise.allSettled([...destinations].map((id) => sendTelegramMessage(id, text, openMarkup(circleId))));
}
