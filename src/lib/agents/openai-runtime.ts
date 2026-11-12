import { Agent, run } from "@openai/agents";
import { agentPrompts } from "./prompts";
import type { AgentId } from "./types";

const agentCache = new Map<AgentId, Agent>();

function getAgent(id: AgentId) {
  const existing = agentCache.get(id);
  if (existing) return existing;
  const agent = new Agent({
    name: id,
    instructions: agentPrompts[id],
    model: process.env.OPENAI_MODEL || "gpt-5-mini",
  });
  agentCache.set(id, agent);
  return agent;
}

export async function askSpecialist(id: AgentId, input: string) {
  if (!process.env.OPENAI_API_KEY) return null;
  const result = await run(getAgent(id), input, { maxTurns: 3 });
  return typeof result.finalOutput === "string" ? result.finalOutput : JSON.stringify(result.finalOutput);
}
