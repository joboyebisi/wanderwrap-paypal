import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { agentPrompts } from "./prompts";
import type { AgentId } from "./types";

let client: BedrockRuntimeClient | undefined;

export async function askSpecialist(id: AgentId, input: string) {
  const modelId = process.env.BEDROCK_MODEL_ID;
  if (!modelId) return null;
  client ??= new BedrockRuntimeClient({ region: process.env.AWS_REGION || "eu-west-2" });
  try {
    const response = await client.send(new ConverseCommand({
      modelId,
      system: [{ text: agentPrompts[id] }],
      messages: [{ role: "user", content: [{ text: input }] }],
      inferenceConfig: { maxTokens: 700, temperature: 0.25, topP: 0.9 },
    }));
    return response.output?.message?.content?.map((part) => "text" in part ? part.text : "").join("").trim() || null;
  } catch (error) {
    console.error(`Bedrock specialist ${id} failed`, error instanceof Error ? error.message : error);
    return null;
  }
}
