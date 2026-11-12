const paypalBase = process.env.PAYPAL_ENV === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("PayPal is not configured");
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(`${paypalBase}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Unable to authenticate with PayPal");
  return (await response.json() as { access_token: string }).access_token;
}

async function paypalRequest(path: string, init: RequestInit) {
  const token = await getAccessToken();
  const response = await fetch(`${paypalBase}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.message || "PayPal request failed");
  return body;
}

export async function createPayPalOrder(amount: string, circleId: string, requestId?: string) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return paypalRequest("/v2/checkout/orders", {
    method: "POST",
    headers: { "PayPal-Request-Id": requestId || `${circleId}-${crypto.randomUUID()}` },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: circleId,
        custom_id: circleId,
        description: "Contribution to a WanderWrap Circle",
        amount: { currency_code: "GBP", value: amount },
      }],
      payment_source: { paypal: { experience_context: {
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
        return_url: `${appUrl}/?capture=1`,
        cancel_url: `${appUrl}/?cancelled=1`,
      } } },
    }),
  });
}

export async function capturePayPalOrder(orderId: string) {
  return paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { method: "POST" });
}

export async function verifyPayPalWebhook(headers: Headers, event: unknown) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) throw new Error("PayPal webhook ID is not configured");
  const result = await paypalRequest("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: JSON.stringify({
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_time: headers.get("paypal-transmission-time"),
      cert_url: headers.get("paypal-cert-url"),
      auth_algo: headers.get("paypal-auth-algo"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      webhook_id: webhookId,
      webhook_event: event,
    }),
  });
  return result.verification_status === "SUCCESS";
}
