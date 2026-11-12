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
        return_url: `${appUrl}/api/paypal/return?circle=${encodeURIComponent(circleId)}`,
        cancel_url: `${appUrl}/api/paypal/return?circle=${encodeURIComponent(circleId)}&cancelled=1`,
      } } },
    }),
  });
}

export function createPayPalLoginUrl(state: string) {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  if (!clientId) throw new Error("PayPal is not configured");
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const loginBase = process.env.PAYPAL_ENV === "live" ? "https://www.paypal.com" : "https://www.sandbox.paypal.com";
  const query = new URLSearchParams({ flowEntry: "static", client_id: clientId, response_type: "code", scope: "openid profile email", redirect_uri: `${appUrl}/api/paypal/oauth/callback`, state });
  return `${loginBase}/connect?${query}`;
}

export async function exchangePayPalLoginCode(code: string) {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("PayPal is not configured");
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const tokenResponse = await fetch(`${paypalBase}/v1/oauth2/token`, {
    method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: `${appUrl}/api/paypal/oauth/callback` }), cache: "no-store",
  });
  const token = await tokenResponse.json();
  if (!tokenResponse.ok) throw new Error(token.error_description || "PayPal login could not be completed");
  const profileResponse = await fetch(`${paypalBase}/v1/identity/openidconnect/userinfo`, { headers: { Authorization: `Bearer ${token.access_token}`, Accept: "application/json" }, cache: "no-store" });
  const profile = await profileResponse.json();
  if (!profileResponse.ok) throw new Error(`PayPal profile could not be read (${profileResponse.status}${profile?.error ? `: ${profile.error}` : ""})`);
  const userId = profile.user_id || profile.payer_id || profile.sub;
  if (!userId) throw new Error("PayPal profile did not include an account identifier");
  return {
    user_id: String(userId),
    name: profile.name,
    email: profile.email,
    verified_account: Boolean(profile.verified_account ?? profile.email_verified),
  } as { user_id: string; name?: string; email?: string; verified_account?: boolean };
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
