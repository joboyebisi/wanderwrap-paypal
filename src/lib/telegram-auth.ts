import { safeValidate } from "@tma.js/init-data";

export interface TelegramIdentity {
  id: string;
  firstName?: string;
  username?: string;
  chatId?: string;
  chatInstance?: string;
  demo: boolean;
}

export async function authenticateTelegramRequest(request: Request): Promise<TelegramIdentity | null> {
  if (process.env.ALLOW_DEMO_AUTH === "true") return { id: "demo-user", firstName: "Demo", demo: true };
  const initData = request.headers.get("x-telegram-init-data") || "";
  const token = process.env.TELEGRAM_BOT_TOKEN || "";
  if (!initData || !token) return null;
  const result = await safeValidate(initData, token, { expiresIn: 3600 });
  if (!result.ok || !result.data.user) return null;
  const { user, chat, chat_instance } = result.data;
  return {
    id: String(user.id),
    firstName: user.first_name,
    username: user.username,
    chatId: chat ? String(chat.id) : undefined,
    chatInstance: chat_instance,
    demo: false,
  };
}
