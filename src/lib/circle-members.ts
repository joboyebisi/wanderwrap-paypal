import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { getDynamo } from "@/lib/aws/dynamo";

export interface CircleMember {
  circleId: string;
  userId: string;
  firstName?: string;
  username?: string;
  notifications: boolean;
  joinedAt: string;
  updatedAt: string;
}

declare global {
  // eslint-disable-next-line no-var
  var wanderwrapCircleMembers: Map<string, CircleMember> | undefined;
}

const members = globalThis.wanderwrapCircleMembers ?? new Map<string, CircleMember>();
if (process.env.NODE_ENV !== "production") globalThis.wanderwrapCircleMembers = members;

export async function upsertCircleMember(input: Omit<CircleMember, "joinedAt" | "updatedAt">) {
  const key = `${input.circleId}:${input.userId}`;
  const existing = members.get(key);
  const timestamp = new Date().toISOString();
  const member: CircleMember = { ...input, joinedAt: existing?.joinedAt || timestamp, updatedAt: timestamp };
  members.set(key, member);
  const dynamo = getDynamo();
  if (dynamo) await dynamo.client.send(new PutCommand({
    TableName: dynamo.table,
    Item: {
      pk: `CIRCLE#${member.circleId}`,
      sk: `MEMBER#${member.userId}`,
      gsi1pk: `USER#${member.userId}`,
      gsi1sk: `CIRCLE#${member.circleId}`,
      entity: "circle-member",
      data: member,
    },
  }));
  return member;
}

export async function listCircleSubscribers(circleId: string) {
  const dynamo = getDynamo();
  if (!dynamo) return [...members.values()].filter((member) => member.circleId === circleId && member.notifications);
  const result = await dynamo.client.send(new QueryCommand({
    TableName: dynamo.table,
    KeyConditionExpression: "pk = :pk AND begins_with(sk, :member)",
    ExpressionAttributeValues: { ":pk": `CIRCLE#${circleId}`, ":member": "MEMBER#" },
  }));
  return (result.Items ?? []).map((item) => item.data as CircleMember).filter((member) => member.notifications);
}
