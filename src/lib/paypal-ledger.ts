export interface ContributionRecord {
  orderId: string;
  circleId: string;
  amount: number;
  currency: string;
  status: "CREATED" | "COMPLETED" | "REFUNDED";
  captureId?: string;
  contributorId?: string;
  updatedAt: string;
}

export interface CompletedCaptureResult {
  contribution: ContributionRecord;
  newlyCompleted: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var wanderwrapLedger: Map<string, ContributionRecord> | undefined;
}

const ledger = globalThis.wanderwrapLedger ?? new Map<string, ContributionRecord>();
if (process.env.NODE_ENV !== "production") globalThis.wanderwrapLedger = ledger;

export async function registerPayPalOrder(orderId: string, circleId: string, amount: number, contributorId?: string) {
  const dynamo = getDynamo();
  if (dynamo) {
    const found = await dynamo.client.send(new GetCommand({ TableName: dynamo.table, Key: { pk: `ORDER#${orderId}`, sk: "PAYPAL" } }));
    if (found.Item?.data) return found.Item.data as ContributionRecord;
  }
  const existing = ledger.get(orderId);
  if (existing) return existing;
  const record: ContributionRecord = { orderId, circleId, amount, currency: "GBP", status: "CREATED", contributorId, updatedAt: new Date().toISOString() };
  ledger.set(orderId, record);
  if (dynamo) await dynamo.client.send(new PutCommand({ TableName: dynamo.table, Item: { pk: `ORDER#${orderId}`, sk: "PAYPAL", gsi1pk: `CIRCLE#${circleId}`, gsi1sk: record.updatedAt, entity: "contribution", data: record } }));
  return record;
}

export async function recordCompletedCapture(payload: any): Promise<CompletedCaptureResult | null> {
  const orderId = payload.id as string;
  const purchase = payload.purchase_units?.[0];
  const capture = purchase?.payments?.captures?.[0];
  if (!orderId || capture?.status !== "COMPLETED") return null;
  const dynamo = getDynamo();
  const remote = dynamo ? await dynamo.client.send(new GetCommand({ TableName: dynamo.table, Key: { pk: `ORDER#${orderId}`, sk: "PAYPAL" } })) : null;
  const existing = (remote?.Item?.data as ContributionRecord | undefined) ?? ledger.get(orderId);
  const circleId = existing?.circleId || purchase?.custom_id || purchase?.reference_id;
  if (!circleId) return null;
  const record: ContributionRecord = {
    orderId, circleId, amount: Number(capture.amount?.value || existing?.amount || 0),
    currency: capture.amount?.currency_code || existing?.currency || "GBP", status: "COMPLETED",
    captureId: capture.id, contributorId: existing?.contributorId, updatedAt: new Date().toISOString(),
  };
  const newlyCompleted = existing?.status !== "COMPLETED";
  ledger.set(orderId, record);
  if (dynamo) {
    try {
      await dynamo.client.send(new PutCommand({
        TableName: dynamo.table,
        Item: { pk: `ORDER#${orderId}`, sk: "PAYPAL", gsi1pk: `CIRCLE#${circleId}`, gsi1sk: record.updatedAt, entity: "contribution", data: record },
        ConditionExpression: "attribute_not_exists(pk) OR #data.#status <> :completed",
        ExpressionAttributeNames: { "#data": "data", "#status": "status" },
        ExpressionAttributeValues: { ":completed": "COMPLETED" },
      }));
    } catch (error) {
      if (error instanceof Error && error.name === "ConditionalCheckFailedException") {
        const saved = await dynamo.client.send(new GetCommand({ TableName: dynamo.table, Key: { pk: `ORDER#${orderId}`, sk: "PAYPAL" } }));
        return { contribution: saved.Item?.data as ContributionRecord ?? record, newlyCompleted: false };
      }
      throw error;
    }
  }
  return { contribution: record, newlyCompleted };
}

export async function getCircleFunding(circleId: string) {
  const dynamo = getDynamo();
  const completed = dynamo
    ? ((await dynamo.client.send(new QueryCommand({ TableName: dynamo.table, IndexName: "gsi1", KeyConditionExpression: "gsi1pk = :pk", ExpressionAttributeValues: { ":pk": `CIRCLE#${circleId}` } }))).Items ?? []).map((item) => item.data as ContributionRecord).filter((item) => item.status === "COMPLETED")
    : [...ledger.values()].filter((item) => item.circleId === circleId && item.status === "COMPLETED");
  return { total: completed.reduce((sum, item) => sum + item.amount, 0), contributorCount: new Set(completed.map((item) => item.contributorId || item.orderId)).size };
}
import { GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { getDynamo } from "@/lib/aws/dynamo";
