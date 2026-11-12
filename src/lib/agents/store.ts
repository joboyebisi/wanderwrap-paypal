import type { CircleCampaign } from "./types";
import { GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { getDynamo } from "@/lib/aws/dynamo";

declare global {
  // eslint-disable-next-line no-var
  var wanderwrapCampaigns: Map<string, CircleCampaign> | undefined;
}

const campaigns = globalThis.wanderwrapCampaigns ?? new Map<string, CircleCampaign>();
if (process.env.NODE_ENV !== "production") globalThis.wanderwrapCampaigns = campaigns;

export const campaignStore = {
  async get(id: string) {
    const dynamo = getDynamo();
    if (!dynamo) return campaigns.get(id);
    const result = await dynamo.client.send(new GetCommand({ TableName: dynamo.table, Key: { pk: `CIRCLE#${id}`, sk: "STATE" } }));
    return result.Item?.data as CircleCampaign | undefined;
  },
  async findByChat(chatId: string) {
    const dynamo = getDynamo();
    if (!dynamo) return [...campaigns.values()].find((campaign) => campaign.chatId === chatId);
    const result = await dynamo.client.send(new QueryCommand({ TableName: dynamo.table, IndexName: "gsi1", KeyConditionExpression: "gsi1pk = :pk AND begins_with(gsi1sk, :circle)", ExpressionAttributeValues: { ":pk": `CHAT#${chatId}`, ":circle": "CIRCLE#" }, ScanIndexForward: false, Limit: 1 }));
    return result.Items?.[0]?.data as CircleCampaign | undefined;
  },
  async save(campaign: CircleCampaign) {
    const dynamo = getDynamo();
    if (!dynamo) { campaigns.set(campaign.id, campaign); return campaign; }
    await dynamo.client.send(new PutCommand({ TableName: dynamo.table, Item: { pk: `CIRCLE#${campaign.id}`, sk: "STATE", gsi1pk: `CHAT#${campaign.chatId}`, gsi1sk: `CIRCLE#${campaign.updatedAt}`, entity: "circle", data: campaign } }));
    return campaign;
  },
  async list() { return [...campaigns.values()]; },
};
