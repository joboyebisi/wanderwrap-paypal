import crypto from "node:crypto";

export function validateTelegramInitData(initData: string, botToken: string, maxAgeSeconds = 3600) {
  if (!initData || !botToken) return false;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  const authDate = Number(params.get("auth_date"));
  const age = Date.now() / 1000 - authDate;
  if (!hash || !authDate || age > maxAgeSeconds || age < -30 || !/^[a-f0-9]{64}$/i.test(hash)) return false;

  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const suppliedBuffer = Buffer.from(hash, "hex");
  return expectedBuffer.length === suppliedBuffer.length && crypto.timingSafeEqual(expectedBuffer, suppliedBuffer);
}
