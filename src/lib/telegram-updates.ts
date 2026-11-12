import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { getDynamo } from "@/lib/aws/dynamo";

declare global {
  // eslint-disable-next-line no-var
  var wanderwrapTelegramUpdates: Set<number> | undefined;
}

const memory = globalThis.wanderwrapTelegramUpdates ?? new Set<number>();
if (process.env.NODE_ENV !== "production") globalThis.wanderwrapTelegramUpdates = memory;

export async function claimTelegramUpdate(updateId: number) {
  if (!Number.isSafeInteger(updateId) || updateId < 0) return false;
  const db = getDynamo();
  if (!db) {
    if (memory.has(updateId)) return false;
    memory.add(updateId);
    if (memory.size > 2_000) memory.delete(memory.values().next().value!);
    return true;
  }

  try {
    await db.client.send(new PutCommand({
      TableName: db.table,
      Item: {
        pk: `TELEGRAM_UPDATE#${updateId}`,
        sk: "RECEIVED",
        expiresAt: Math.floor(Date.now() / 1000) + 86_400,
      },
      ConditionExpression: "attribute_not_exists(pk)",
    }));
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === "ConditionalCheckFailedException") return false;
    throw error;
  }
}
