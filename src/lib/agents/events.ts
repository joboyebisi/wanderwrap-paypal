import crypto from "node:crypto";
import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { getDynamo } from "@/lib/aws/dynamo";

export interface ImportantEvent {
  id: string; chatId: string; recipient: string; occasion: string; date: string;
  recurrence: "none" | "yearly"; reminderDays: number[]; createdBy: string; createdAt: string;
}

declare global { var wanderwrapEvents: Map<string, ImportantEvent> | undefined; }
const events = globalThis.wanderwrapEvents ?? new Map<string, ImportantEvent>();
if (process.env.NODE_ENV !== "production") globalThis.wanderwrapEvents = events;

export async function registerImportantEvent(input: Omit<ImportantEvent, "id" | "createdAt">) {
  const event: ImportantEvent = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  events.set(event.id, event);
  const dynamo = getDynamo();
  if (dynamo) await dynamo.client.send(new PutCommand({ TableName: dynamo.table, Item: { pk: `EVENT#${event.id}`, sk: "STATE", gsi1pk: `CHAT#${event.chatId}`, gsi1sk: `EVENT#${event.date}`, entity: "event", data: event } }));
  return event;
}

export async function listChatEvents(chatId: string) {
  const dynamo = getDynamo();
  if (!dynamo) return [...events.values()].filter((event) => event.chatId === chatId).sort((a, b) => a.date.localeCompare(b.date));
  const result = await dynamo.client.send(new QueryCommand({ TableName: dynamo.table, IndexName: "gsi1", KeyConditionExpression: "gsi1pk = :pk AND begins_with(gsi1sk, :event)", ExpressionAttributeValues: { ":pk": `CHAT#${chatId}`, ":event": "EVENT#" } }));
  return (result.Items ?? []).map((item) => item.data as ImportantEvent);
}
