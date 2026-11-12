import { NextResponse } from "next/server";
import { authenticateTelegramRequest } from "@/lib/telegram-auth";
import { getCircleFunding } from "@/lib/paypal-ledger";

export async function GET(request: Request) {
  if (!await authenticateTelegramRequest(request)) return NextResponse.json({ error: "Telegram authentication required" }, { status: 401 });
  const circleId = new URL(request.url).searchParams.get("circleId");
  if (!circleId) return NextResponse.json({ error: "circleId is required" }, { status: 400 });
  return NextResponse.json(await getCircleFunding(circleId));
}
