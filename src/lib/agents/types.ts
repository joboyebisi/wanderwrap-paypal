export type AgentId =
  | "conductor"
  | "event-radar"
  | "recipient-insight"
  | "gift-curator"
  | "circle-coordinator"
  | "treasury"
  | "fulfilment"
  | "reveal-director";

export type CirclePhase =
  | "discovery"
  | "gift_selection"
  | "funding"
  | "purchase_approval"
  | "fulfilment"
  | "reveal_ready"
  | "delivered";

export type ApprovalKind = "analyse_chat" | "open_funding" | "purchase_gift" | "release_money_gift" | "dispatch_gift";

export interface AgentTrace {
  id: string;
  agent: AgentId;
  label: string;
  summary: string;
  status: "complete" | "waiting" | "blocked";
  at: string;
}

export interface GiftCandidate {
  id: string;
  name: string;
  price: number;
  emoji: string;
  rationale: string;
  confidence: number;
  kind: "physical" | "experience" | "money";
}

export interface CircleCampaign {
  id: string;
  slug: string;
  chatId: string;
  organizerId?: string;
  recipient: string;
  occasion: string;
  eventDate: string;
  phase: CirclePhase;
  targetAmount: number;
  raisedAmount: number;
  currency: "GBP";
  contributorCount: number;
  expectedContributors: number;
  chatAnalysisConsent: boolean;
  personality: string[];
  selectedGiftId?: string;
  gifts: GiftCandidate[];
  pendingApproval?: ApprovalKind;
  traces: AgentTrace[];
  createdAt: string;
  updatedAt: string;
}

export interface HarnessInput {
  chatId: string;
  actorId: string;
  prompt: string;
  recipient?: string;
  occasion?: string;
  eventDate?: string;
  targetAmount?: number;
  expectedContributors?: number;
  messageHistory?: string[];
  consentToAnalyse?: boolean;
  skipChatAnalysis?: boolean;
  campaignId?: string;
}

export interface HarnessResult {
  campaign: CircleCampaign;
  reply: string;
  activeAgent: AgentId;
  suggestions: string[];
}
