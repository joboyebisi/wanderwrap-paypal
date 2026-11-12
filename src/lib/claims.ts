import crypto from "node:crypto";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { getDynamo } from "@/lib/aws/dynamo";

export type ClaimStatus = "ready" | "emailed" | "email_failed" | "opened" | "revoked" | "paid";
export interface GiftClaimMessage { from: string; message: string; }
export interface GiftClaim {
  id: string; tokenHash: string; circleId: string; recipientName: string; recipientEmail: string;
  occasion: string; amount: number; currency: "GBP"; status: ClaimStatus; payoutEnabled: boolean;
  messages: GiftClaimMessage[]; createdBy: string; createdAt: string; updatedAt: string; expiresAt: number;
}

declare global { var wanderwrapClaims: Map<string, GiftClaim> | undefined; }
const claims = globalThis.wanderwrapClaims ?? new Map<string, GiftClaim>();
if (process.env.NODE_ENV !== "production") globalThis.wanderwrapClaims = claims;

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

async function putClaim(claim: GiftClaim) {
  claims.set(claim.tokenHash, claim);
  const dynamo = getDynamo();
  if (!dynamo) return;
  const item = { entity: "gift-claim", data: claim, expiresAt: claim.expiresAt };
  await Promise.all([
    dynamo.client.send(new PutCommand({ TableName: dynamo.table, Item: { pk: `CLAIM#${claim.tokenHash}`, sk: "STATE", ...item } })),
    dynamo.client.send(new PutCommand({ TableName: dynamo.table, Item: { pk: `CIRCLE#${claim.circleId}`, sk: "CLAIM", ...item } })),
  ]);
}

export async function createGiftClaim(input: Omit<GiftClaim, "id" | "tokenHash" | "status" | "createdAt" | "updatedAt" | "expiresAt">) {
  const token = crypto.randomBytes(32).toString("base64url");
  const timestamp = new Date().toISOString();
  const claim: GiftClaim = { ...input, id: crypto.randomUUID(), tokenHash: hashToken(token), status: "ready", createdAt: timestamp, updatedAt: timestamp, expiresAt: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 };
  await putClaim(claim);
  return { claim, token };
}

export async function getGiftClaim(token: string) {
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(token)) return null;
  const tokenHash = hashToken(token);
  const local = claims.get(tokenHash);
  if (local) return local.expiresAt > Math.floor(Date.now() / 1000) ? local : null;
  const dynamo = getDynamo();
  if (!dynamo) return null;
  const result = await dynamo.client.send(new GetCommand({ TableName: dynamo.table, Key: { pk: `CLAIM#${tokenHash}`, sk: "STATE" } }));
  const claim = result.Item?.data as GiftClaim | undefined;
  return claim && claim.expiresAt > Math.floor(Date.now() / 1000) ? claim : null;
}

export async function setGiftClaimStatus(claim: GiftClaim, status: ClaimStatus) {
  const updated = { ...claim, status, updatedAt: new Date().toISOString() };
  await putClaim(updated);
  return updated;
}

export const publicGiftClaim = (claim: GiftClaim) => ({ id: claim.id, recipientName: claim.recipientName, occasion: claim.occasion, amount: claim.amount, currency: claim.currency, status: claim.status, payoutEnabled: claim.payoutEnabled, messages: claim.messages, expiresAt: claim.expiresAt });
