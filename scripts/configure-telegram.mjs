import fs from "node:fs";
import path from "node:path";

function readEnvFile(file) {
  const values = {};
  for (const rawLine of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const separator = line.indexOf("=");
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

const env = readEnvFile(path.resolve(process.cwd(), ".env.local"));
const token = env.TELEGRAM_BOT_TOKEN;
const webhookSecret = env.TELEGRAM_WEBHOOK_SECRET;
const appUrl = (env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");

if (!token || !webhookSecret || !appUrl) {
  throw new Error("TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, and NEXT_PUBLIC_APP_URL are required");
}
if (!/^[A-Za-z0-9_-]{1,256}$/.test(webhookSecret)) {
  throw new Error("TELEGRAM_WEBHOOK_SECRET may contain only letters, digits, underscores, and hyphens");
}
if (!appUrl.startsWith("https://")) throw new Error("NEXT_PUBLIC_APP_URL must use HTTPS");

const apiBase = `https://api.telegram.org/bot${token}`;

async function telegram(method, body) {
  process.stdout.write(`Telegram: ${method}... `);
  const response = await fetch(`${apiBase}/${method}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(`${method}: ${result.description || `HTTP ${response.status}`}`);
  console.log("ok");
  return result.result;
}

const bot = await telegram("getMe", {});
await telegram("setChatMenuButton", {
  menu_button: { type: "web_app", text: "Open WanderWrap", web_app: { url: appUrl } },
});
await telegram("setMyCommands", {
  commands: [
    { command: "start", description: "Open WanderWrap" },
    { command: "circle", description: "Create a group gift Circle" },
    { command: "gift", description: "Plan a thoughtful group gift" },
    { command: "remember", description: "Remember a birthday or event" },
    { command: "events", description: "Show remembered events" },
    { command: "analyse_gifts", description: "Enable consented gift analysis" },
    { command: "stop_analysis", description: "Stop gift analysis" },
    { command: "privacy", description: "Explain privacy and approvals" },
  ],
});
await telegram("setWebhook", {
  url: `${appUrl}/api/telegram`,
  secret_token: webhookSecret,
  allowed_updates: ["message"],
  max_connections: 20,
});

const menu = await telegram("getChatMenuButton");
const webhook = await telegram("getWebhookInfo");
console.log(JSON.stringify({
  botUsername: bot.username,
  menu: { type: menu.type, text: menu.text, url: menu.web_app?.url },
  webhook: {
    url: webhook.url,
    pendingUpdateCount: webhook.pending_update_count,
    lastError: webhook.last_error_message || null,
  },
}, null, 2));
