import crypto from "node:crypto";
import { askSpecialist } from "./bedrock-runtime";
import { campaignStore } from "./store";
import type { AgentId, AgentTrace, CircleCampaign, HarnessInput, HarnessResult } from "./types";

const now = () => new Date().toISOString();
const trace = (agent: AgentId, label: string, summary: string, status: AgentTrace["status"] = "complete"): AgentTrace => ({ id: crypto.randomUUID(), agent, label, summary, status, at: now() });

function parseRecipient(prompt: string) {
  const match = prompt.match(/\bfor\s+([A-Z][a-z]+)/) ?? prompt.match(/\bcelebrat(?:e|ing)\s+([A-Z][a-z]+)/) ?? prompt.match(/\b([A-Z][a-z]+)(?:'s)?\s+birthday\b/);
  return match?.[1];
}

function giftDirections(recipient: string, occasion: string, target: number, signals: string[]) {
  const context = signals.length ? ` based on ${signals.join(" and ")}` : ` for their ${occasion.toLowerCase()}`;
  return [
    { id: "keepsake", name: `A personalised keepsake for ${recipient}`, price: Math.max(1, Math.round(target * 0.7)), emoji: "🎁", rationale: `A lasting, personal direction${context}. The group should confirm the exact item before purchase.`, confidence: 78, kind: "physical" as const },
    { id: "experience", name: `A shared ${occasion.toLowerCase()} experience`, price: Math.max(1, Math.round(target * 0.9)), emoji: "✨", rationale: `A memory-first direction${context}. Scout will refine it after the group adds preferences.`, confidence: 74, kind: "experience" as const },
    { id: "money-gift", name: `A flexible gift for ${recipient}`, price: target, emoji: "💛", rationale: "The group contributes toward the target and the recipient chooses how to use it. Release still requires organiser approval.", confidence: 70, kind: "money" as const },
  ];
}

function newCampaign(input: HarnessInput): CircleCampaign {
  const recipient = input.recipient?.trim() || parseRecipient(input.prompt);
  if (!recipient) throw new Error("Tell me who the Circle is for");
  const targetFromPrompt = input.prompt.match(/£\s?(\d+(?:\.\d{1,2})?)/)?.[1];
  const targetAmount = Number(input.targetAmount || targetFromPrompt || 0);
  if (!Number.isFinite(targetAmount) || targetAmount < 1 || targetAmount > 10000) throw new Error("Set a target between £1 and £10,000");
  const occasion = input.occasion?.trim() || (/wedding/i.test(input.prompt) ? "Wedding" : /farewell/i.test(input.prompt) ? "Farewell" : /graduation/i.test(input.prompt) ? "Graduation" : /birthday/i.test(input.prompt) ? "Birthday" : "Celebration");
  const eventDate = input.eventDate?.trim() || input.prompt.match(/\b(\d{4}-\d{2}-\d{2}|next\s+\w+|tomorrow|in\s+\d+\s+days?)\b/i)?.[1] || "To be confirmed";
  const expectedFromPrompt = input.prompt.match(/\b(\d+)\s+(?:friends?|people|contributors?|gifters?)\b/i)?.[1];
  const expectedContributors = Math.max(1, Math.min(500, Number(input.expectedContributors || expectedFromPrompt || 1)));
  const created = now();
  return {
    id: crypto.randomUUID(), slug: `${recipient.toLowerCase()}-${Date.now().toString(36)}`, chatId: input.chatId,
    organizerId: input.actorId,
    recipient, occasion, eventDate, phase: "discovery", targetAmount, raisedAmount: 0, currency: "GBP",
    contributorCount: 0, expectedContributors, chatAnalysisConsent: false, personality: [], gifts: [], traces: [],
    createdAt: created, updatedAt: created,
  };
}

function deterministicPersonality(history: string[]) {
  const text = history.join(" ").toLowerCase();
  const signals = [] as string[];
  if (/photo|camera|film/.test(text)) signals.push("loves photography");
  if (/travel|trip|holiday|flight/.test(text)) signals.push("curious traveller");
  if (/experience|concert|museum|workshop/.test(text)) signals.push("values experiences");
  return signals;
}

export async function runCircleHarness(input: HarnessInput): Promise<HarnessResult> {
  const existing = input.campaignId ? await campaignStore.get(input.campaignId) : await campaignStore.findByChat(input.chatId);
  const campaign = existing ?? newCampaign(input);
  campaign.traces.push(trace("conductor", "Intent understood", `A ${campaign.occasion.toLowerCase()} Circle for ${campaign.recipient} is being prepared.`));

  if (!input.consentToAnalyse && !input.skipChatAnalysis && !campaign.chatAnalysisConsent) {
    campaign.pendingApproval = "analyse_chat";
    campaign.traces.push(trace("recipient-insight", "Waiting for consent", "Chat analysis is paused until the organiser confirms.", "waiting"));
    await campaignStore.save(campaign);
    return { campaign, activeAgent: "conductor", reply: `I can create a Circle for ${campaign.recipient}. With the group’s permission, Sage can look only at gift-relevant messages for preference clues — or we can continue with a few quick questions instead.`, suggestions: ["Allow gift-only chat analysis", "Ask me three questions", "Create without analysis"] };
  }

  campaign.chatAnalysisConsent = Boolean(input.consentToAnalyse || campaign.chatAnalysisConsent);
  campaign.personality = deterministicPersonality(input.messageHistory ?? []);
  campaign.traces.push(trace("recipient-insight", "Recipient signals ready", campaign.personality.join(", ")));
  const bedrockInsight = await askSpecialist("recipient-insight", `Recipient: ${campaign.recipient}. Consented excerpts: ${(input.messageHistory ?? []).join("\n")}. Summarise only safe gift-relevant signals.`);
  if (bedrockInsight) campaign.traces.push(trace("recipient-insight", "Bedrock synthesis", bedrockInsight.slice(0, 320)));

  campaign.gifts = giftDirections(campaign.recipient, campaign.occasion, campaign.targetAmount, campaign.personality);
  campaign.phase = "gift_selection";
  campaign.traces.push(trace("gift-curator", "Shortlist created", "Three distinct, budget-aware directions are ready for a group vote."));
  const bedrockCuration = await askSpecialist("gift-curator", `Create three gift directions for ${campaign.recipient}, ${campaign.personality.join(", ")}, budget £${campaign.targetAmount}.`);
  if (bedrockCuration) campaign.traces.push(trace("gift-curator", "Bedrock curation rationale", bedrockCuration.slice(0, 320)));

  campaign.selectedGiftId = campaign.gifts[0]?.id;
  campaign.phase = "funding";
  campaign.pendingApproval = "open_funding";
  campaign.traces.push(trace("circle-coordinator", "Contribution plan drafted", `£${campaign.targetAmount} target for ${campaign.expectedContributors} friends; suggested £20 each.`));
  campaign.traces.push(trace("treasury", "PayPal collection prepared", "Funding can open after organiser approval.", "waiting"));
  campaign.updatedAt = now();
  await campaignStore.save(campaign);
  const signalSummary = campaign.personality.length ? `Sage found ${campaign.personality.join(" and ")}. ` : "No chat-derived preferences were supplied, so Scout kept the directions broad. ";
  const suggestedAmount = Math.ceil(campaign.targetAmount / campaign.expectedContributors);
  return { campaign, activeAgent: "conductor", reply: `${signalSummary}Scout prepared three directions for ${campaign.recipient}. Rally suggests about £${suggestedAmount} each for ${campaign.expectedContributors} contributor${campaign.expectedContributors === 1 ? "" : "s"}, and Penny is ready to open PayPal contributions when you approve.`, suggestions: ["Approve funding", "Show all three directions", "Adjust the target"] };
}

export async function approveCampaignAction(campaignId: string, approval: string) {
  const campaign = await campaignStore.get(campaignId);
  if (!campaign || campaign.pendingApproval !== approval) return null;
  if (approval === "open_funding") {
    campaign.pendingApproval = undefined;
    campaign.phase = "funding";
    campaign.traces.push(trace("treasury", "Funding opened", "PayPal contribution links are ready. Only completed captures count toward the total."));
  } else if (approval === "purchase_gift") {
    campaign.pendingApproval = "dispatch_gift";
    campaign.phase = "fulfilment";
    campaign.traces.push(trace("fulfilment", "Purchase approved", "Order preparation started; dispatch still requires confirmation."));
  }
  campaign.updatedAt = now();
  return campaignStore.save(campaign);
}
