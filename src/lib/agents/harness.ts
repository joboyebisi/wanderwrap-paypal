import crypto from "node:crypto";
import { askSpecialist } from "./openai-runtime";
import { campaignStore } from "./store";
import type { AgentId, AgentTrace, CircleCampaign, HarnessInput, HarnessResult } from "./types";

const giftSeed = [
  { id: "camera", name: "Instant camera bundle", price: 145, emoji: "📸", rationale: "Turns future trips into tangible memories everyone can share.", confidence: 92, kind: "physical" as const },
  { id: "workshop", name: "Photography experience", price: 150, emoji: "🎟️", rationale: "A memorable day out built around her creative side.", confidence: 88, kind: "experience" as const },
  { id: "travel-fund", name: "Adventure money gift", price: 160, emoji: "✈️", rationale: "Lets her choose what would make her next trip feel special.", confidence: 81, kind: "money" as const },
];

const now = () => new Date().toISOString();
const trace = (agent: AgentId, label: string, summary: string, status: AgentTrace["status"] = "complete"): AgentTrace => ({ id: crypto.randomUUID(), agent, label, summary, status, at: now() });

function parseRecipient(prompt: string) {
  const match = prompt.match(/\bfor\s+([A-Z][a-z]+)/) ?? prompt.match(/\bcelebrat(?:e|ing)\s+([A-Z][a-z]+)/) ?? prompt.match(/\b([A-Z][a-z]+)(?:'s)?\s+birthday\b/);
  return match?.[1] || "Sarah";
}

function newCampaign(input: HarnessInput): CircleCampaign {
  const recipient = parseRecipient(input.prompt);
  const created = now();
  return {
    id: crypto.randomUUID(), slug: `${recipient.toLowerCase()}-${Date.now().toString(36)}`, chatId: input.chatId,
    recipient, occasion: /wedding/i.test(input.prompt) ? "Wedding" : /farewell/i.test(input.prompt) ? "Farewell" : "Birthday",
    eventDate: "Next Friday", phase: "discovery", targetAmount: 160, raisedAmount: 0, currency: "GBP",
    contributorCount: 0, expectedContributors: 8, chatAnalysisConsent: false, personality: [], gifts: [], traces: [],
    createdAt: created, updatedAt: created,
  };
}

function deterministicPersonality(history: string[]) {
  const text = history.join(" ").toLowerCase();
  const signals = [] as string[];
  if (/photo|camera|film/.test(text)) signals.push("loves photography");
  if (/travel|trip|holiday|flight/.test(text)) signals.push("curious traveller");
  if (/experience|concert|museum|workshop/.test(text)) signals.push("values experiences");
  return signals.length ? signals : ["creative", "adventure-loving", "thoughtful keepsake person"];
}

export async function runCircleHarness(input: HarnessInput): Promise<HarnessResult> {
  const existing = input.campaignId ? await campaignStore.get(input.campaignId) : await campaignStore.findByChat(input.chatId);
  const campaign = existing ?? newCampaign(input);
  campaign.traces.push(trace("conductor", "Intent understood", `A ${campaign.occasion.toLowerCase()} Circle for ${campaign.recipient} is being prepared.`));

  if (!input.consentToAnalyse && !campaign.chatAnalysisConsent) {
    campaign.pendingApproval = "analyse_chat";
    campaign.traces.push(trace("recipient-insight", "Waiting for consent", "Chat analysis is paused until the organiser confirms.", "waiting"));
    await campaignStore.save(campaign);
    return { campaign, activeAgent: "conductor", reply: `I can create a Circle for ${campaign.recipient}. With the group’s permission, Sage can look only at gift-relevant messages for preference clues — or we can continue with a few quick questions instead.`, suggestions: ["Allow gift-only chat analysis", "Ask me three questions", "Create without analysis"] };
  }

  campaign.chatAnalysisConsent = Boolean(input.consentToAnalyse || campaign.chatAnalysisConsent);
  campaign.personality = deterministicPersonality(input.messageHistory ?? []);
  campaign.traces.push(trace("recipient-insight", "Recipient signals ready", campaign.personality.join(", ")));
  await askSpecialist("recipient-insight", `Recipient: ${campaign.recipient}. Consented excerpts: ${(input.messageHistory ?? []).join("\n")}. Summarise only safe gift-relevant signals.`);

  campaign.gifts = giftSeed;
  campaign.phase = "gift_selection";
  campaign.traces.push(trace("gift-curator", "Shortlist created", "Three distinct, budget-aware directions are ready for a group vote."));
  await askSpecialist("gift-curator", `Create three gift directions for ${campaign.recipient}, ${campaign.personality.join(", ")}, budget £${campaign.targetAmount}.`);

  campaign.selectedGiftId = "camera";
  campaign.phase = "funding";
  campaign.pendingApproval = "open_funding";
  campaign.traces.push(trace("circle-coordinator", "Contribution plan drafted", `£${campaign.targetAmount} target for ${campaign.expectedContributors} friends; suggested £20 each.`));
  campaign.traces.push(trace("treasury", "PayPal collection prepared", "Funding can open after organiser approval.", "waiting"));
  campaign.updatedAt = now();
  await campaignStore.save(campaign);
  return { campaign, activeAgent: "conductor", reply: `Sage found ${campaign.personality.join(" and ")}. Scout’s strongest match is the instant camera bundle. Rally has a comfortable £20 suggestion for eight friends, and Penny is ready to open PayPal contributions when you approve.`, suggestions: ["Approve funding", "Show all three gifts", "Adjust the target"] };
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
