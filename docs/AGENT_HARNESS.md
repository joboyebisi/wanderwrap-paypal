# WanderWrap agent harness

## Operating model

Wrap is the only agent that speaks as WanderWrap in the Telegram group. Specialists work behind it so the experience feels like one thoughtful coordinator rather than a noisy room of bots.

```text
Telegram group
      │
      ▼
Circle Conductor (Wrap)
      ├── Event Radar (Spark) ───── important-date suggestions
      ├── Recipient Insight (Sage) ─ consented preference signals
      ├── Gift Curator (Scout) ───── three gift directions
      ├── Circle Coordinator (Rally)  votes, reminders, group tone
      ├── PayPal Treasury (Penny) ── orders, captures, private ledger
      ├── Fulfilment (Porter) ────── purchase and delivery plan
      └── Reveal Director (Ribbon) ─ messages and unwrapping
```

The custom harness in `src/lib/agents/harness.ts` owns campaign state, specialist sequencing, traces, and approval boundaries. Amazon Bedrock specialists are deliberately advisory. Deterministic application code owns payments, persistence, permissions, and state transitions.

## Why this split

- A routing agent keeps Telegram replies coherent.
- Recipient analysis and gift selection have different safety and evaluation criteria.
- Treasury and fulfilment use narrower tools and stricter approval gates.
- The reveal agent may be creative, but it cannot invent contributor messages.
- Missing Bedrock access falls back to deterministic demo specialists without breaking the product tour.

## Bedrock provider strategy

The runtime uses Amazon Bedrock `Converse` so the harness is not coupled to one model vendor's request shape. `BEDROCK_MODEL_ID` accepts a model ID or inference profile ID; the default is the EU Amazon Nova 2 Lite profile for responsive, cost-conscious specialist calls. Evaluate a stronger reasoning profile for recipient synthesis and complex gift constraints before production.

The App Runner task role receives `bedrock:InvokeModel`; static AWS keys are neither required nor supported. Model output remains advisory. Application code executes tools, checks approval state and writes durable records.

## Approval boundaries

The harness pauses before:

1. Reading group messages for gift preferences.
2. Opening a PayPal contribution campaign.
3. Purchasing a selected physical or experience gift.
4. Releasing a money gift to a recipient.
5. Dispatching a physical gift.

Approval is checked against the pending action in persisted campaign state; a stale or mismatched approval returns `409`.

## Telegram privacy contract

- `/analyse_gifts` starts a clearly disclosed, bounded preference-analysis window.
- `/stop_analysis` immediately clears the prototype chat buffer.
- `/privacy` explains the contract in the group.
- The system excludes sensitive traits and treats all personality cues as uncertain.
- Payment amounts are private; group updates reveal only aggregate funding progress.
- In production, configure BotFather group privacy deliberately and publish a retention policy before enabling ambient event detection.

## Event loop

Explicit dates can be saved with `/remember Name, occasion, YYYY-MM-DD`. Spark suggests — but never automatically creates — a Circle 21, 14, and 7 days before the event. Recurring birthdays can roll forward yearly after the first delivered Circle.

## PayPal ledger

Every order has a Circle reference and idempotency key. A Circle total is derived only from `COMPLETED` captures. The webhook signature is verified with PayPal before a capture is recorded. A Circle is a virtual campaign ledger, not a bank account, wallet, or pooled-balance claim.

## State and deployment

Local development uses bounded in-memory stores. Setting `DYNAMODB_TABLE` switches campaigns, important events, and contributions to the AWS single-table layout defined in `infra/apprunner.yaml`.

## Minimum eval set before production

- Event detector does not trigger on past, hypothetical, or unrelated dates.
- Recipient insight never returns a protected or sensitive trait.
- Gift shortlist respects region, delivery date and hard budget.
- No reminder shames or identifies a non-contributor.
- Replayed PayPal create/capture/webhook calls do not double-count.
- Purchase and dispatch fail closed without the matching organiser approval.
- Reveal contains only submitted contributor messages.
- `/stop_analysis` prevents new messages entering the analysis buffer.
