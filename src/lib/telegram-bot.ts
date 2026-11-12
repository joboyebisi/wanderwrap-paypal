const telegramApi = (token: string, method: string) => `https://api.telegram.org/bot${token}/${method}`;

export function escapeTelegramHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function circleMiniAppLink(circleId: string) {
  const username = (process.env.TELEGRAM_BOT_USERNAME || "").replace(/^@/, "");
  return username ? `https://t.me/${username}?startapp=circle_${circleId}` : `${process.env.NEXT_PUBLIC_APP_URL}?circleId=${circleId}`;
}

export function circleDmOptInLink(circleId: string) {
  const username = (process.env.TELEGRAM_BOT_USERNAME || "").replace(/^@/, "");
  return username ? `https://t.me/${username}?start=circle_${circleId}` : circleMiniAppLink(circleId);
}

export function mainMiniAppLink() {
  const username = (process.env.TELEGRAM_BOT_USERNAME || "").replace(/^@/, "");
  return username ? `https://t.me/${username}?startapp` : (process.env.NEXT_PUBLIC_APP_URL || "");
}

export function addBotToGroupLink() {
  const username = (process.env.TELEGRAM_BOT_USERNAME || "").replace(/^@/, "");
  return username ? `https://t.me/${username}?startgroup=new_circle` : (process.env.NEXT_PUBLIC_APP_URL || "");
}

export async function sendTelegramMessage(chatId: string | number, text: string, replyMarkup?: object) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Telegram bot is not configured");
  const response = await fetch(telegramApi(token, "sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", reply_markup: replyMarkup }),
    signal: AbortSignal.timeout(12_000),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.description || "Telegram message failed");
  return result.result;
}
