import { NextResponse } from "next/server";
import { authenticateTelegramRequest } from "@/lib/telegram-auth";
import { campaignStore } from "@/lib/agents/store";
import { upsertCircleMember } from "@/lib/circle-members";
import { circleDmOptInLink, circleMiniAppLink, escapeTelegramHtml, sendTelegramMessage } from "@/lib/telegram-bot";

export async function POST(request: Request) {
  const identity = await authenticateTelegramRequest(request);
  if (!identity) return NextResponse.json({ error: "Open this Circle from Telegram" }, { status: 401 });
  const { circleId } = await request.json();
  const campaign = typeof circleId === "string" ? await campaignStore.get(circleId) : null;
  if (!campaign) return NextResponse.json({ error: "Circle not found" }, { status: 404 });

  try {
    await sendTelegramMessage(identity.id, `🎁 <b>Private updates are on</b>\n\nI’ll message you when ${escapeTelegramHtml(campaign.recipient)}’s Circle reaches a meaningful milestone. Individual contribution amounts stay private.`, {
      inline_keyboard: [[{ text: "Open Circle", url: circleMiniAppLink(campaign.id) }]],
    });
    await upsertCircleMember({ circleId: campaign.id, userId: identity.id, firstName: identity.firstName, username: identity.username, notifications: true });
    return NextResponse.json({ subscribed: true });
  } catch {
    await upsertCircleMember({ circleId: campaign.id, userId: identity.id, firstName: identity.firstName, username: identity.username, notifications: false });
    return NextResponse.json({ subscribed: false, requiresBotStart: true, dmUrl: circleDmOptInLink(campaign.id) }, { status: 409 });
  }
}
