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
const clientId = env.PAYPAL_CLIENT_ID;
const clientSecret = env.PAYPAL_CLIENT_SECRET;
const webhookId = env.PAYPAL_WEBHOOK_ID;
const appUrl = (env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
const baseUrl = env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

if (!clientId || !clientSecret || !webhookId || !appUrl) {
  throw new Error("PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID, and NEXT_PUBLIC_APP_URL are required");
}

const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
  method: "POST",
  headers: {
    authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    "content-type": "application/x-www-form-urlencoded",
  },
  body: "grant_type=client_credentials",
  signal: AbortSignal.timeout(15_000),
});
const tokenResult = await tokenResponse.json();
if (!tokenResponse.ok || !tokenResult.access_token) {
  throw new Error(`PayPal authentication failed: ${tokenResult.error_description || tokenResponse.status}`);
}

const webhooksResponse = await fetch(`${baseUrl}/v1/notifications/webhooks`, {
  headers: { authorization: `Bearer ${tokenResult.access_token}` },
  signal: AbortSignal.timeout(15_000),
});
const webhooksResult = await webhooksResponse.json();
if (!webhooksResponse.ok) throw new Error(`Unable to list PayPal webhooks: ${webhooksResult.message || webhooksResponse.status}`);

const webhook = webhooksResult.webhooks?.find((candidate) => candidate.id === webhookId);
console.log(JSON.stringify({
  environment: env.PAYPAL_ENV === "live" ? "live" : "sandbox",
  authenticated: true,
  payoutsScopeAvailable: String(tokenResult.scope || "").includes("https://uri.paypal.com/services/payments/payouts"),
  webhookFound: Boolean(webhook),
  configuredWebhookUrl: webhook?.url || null,
  expectedWebhookUrl: `${appUrl}/api/paypal/webhook`,
  webhookUrlMatches: webhook?.url === `${appUrl}/api/paypal/webhook`,
  subscribedEvents: webhook?.event_types?.map((event) => event.name) || [],
}, null, 2));
