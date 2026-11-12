import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

let documentClient: DynamoDBDocumentClient | undefined;

export function getDynamo() {
  if (!process.env.DYNAMODB_TABLE) return null;
  documentClient ??= DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions: { removeUndefinedValues: true } });
  return { client: documentClient, table: process.env.DYNAMODB_TABLE };
}
