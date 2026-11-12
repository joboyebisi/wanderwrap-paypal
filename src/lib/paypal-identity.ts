import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { getDynamo } from "@/lib/aws/dynamo";

export interface LinkedPayPalIdentity { telegramUserId: string; paypalUserId: string; name?: string; email?: string; verified: boolean; linkedAt: string; }
declare global { var wanderwrapPayPalIdentities: Map<string, LinkedPayPalIdentity> | undefined; }
const identities = globalThis.wanderwrapPayPalIdentities ?? new Map<string, LinkedPayPalIdentity>();
if (process.env.NODE_ENV !== "production") globalThis.wanderwrapPayPalIdentities = identities;

export async function savePayPalIdentity(identity: LinkedPayPalIdentity) {
  identities.set(identity.telegramUserId, identity);
  const dynamo = getDynamo();
  if (dynamo) await dynamo.client.send(new PutCommand({ TableName: dynamo.table, Item: { pk: `USER#${identity.telegramUserId}`, sk: "PAYPAL", entity: "paypal-identity", data: identity } }));
  return identity;
}
