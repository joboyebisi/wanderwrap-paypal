import { validateTelegramInitData } from "./telegram";

export interface TelegramIdentity { id: string; firstName?: string; username?: string; demo: boolean; }

export function authenticateTelegramRequest(request: Request): TelegramIdentity | null {
  if (process.env.ALLOW_DEMO_AUTH === "true") return { id: "demo-user", firstName: "Demo", demo: true };
  const initData = request.headers.get("x-telegram-init-data") || "";
  const token = process.env.TELEGRAM_BOT_TOKEN || "";
  if (!validateTelegramInitData(initData, token)) return null;
  try {
    const rawUser = new URLSearchParams(initData).get("user");
    if (!rawUser) return null;
    const user = JSON.parse(rawUser);
    return { id: String(user.id), firstName: user.first_name, username: user.username, demo: false };
  } catch { return null; }
}

export function telegramAuthHeaders() {
  if (typeof window === "undefined") return {};
  return { "X-Telegram-Init-Data": window.Telegram?.WebApp.initData || "" };
}
