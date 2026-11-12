import { NextResponse } from "next/server";
import { circleMiniAppLink, mainMiniAppLink } from "@/lib/telegram-bot";

const CIRCLE_ID = /^[A-Za-z0-9-]{1,64}$/;

export function GET(request: Request) {
  const requestedCircleId = new URL(request.url).searchParams.get("circleId") || "";
  const circleId = CIRCLE_ID.test(requestedCircleId) ? requestedCircleId : undefined;
  const username = (process.env.TELEGRAM_BOT_USERNAME || "").replace(/^@/, "");
  return NextResponse.json({
    surface: "web",
    botUsername: username || null,
    botUrl: username ? `https://t.me/${username}` : null,
    telegramLaunchUrl: circleId ? circleMiniAppLink(circleId) : mainMiniAppLink(),
    circleId: circleId || null,
  }, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" } });
}
