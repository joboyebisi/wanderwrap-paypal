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

## Demonstrable handoffs

The sandbox journey produces durable evidence that multiple specialists are doing different work rather than presenting one model behind several names:

| Handoff | Input | Agent output | Deterministic boundary |
| --- | --- | --- | --- |
| Wrap to Sage | recipient, occasion, consented excerpts | safe preference signals | no analysis before recorded consent |
| Sage to Scout | bounded signals, organiser-approved public clues and budget | Channel3 query plus live product shortlist | hard target and currency remain application state; missing key never falls back to fake products |
| Scout to Channel3 | Circle-scoped shopping query and stable internal user ID | product images, offers, availability and attributed buy links | API key remains server-side; source URL is never fetched |
| Scout to Rally | selected direction and member count | contribution plan and prompts | reminders never reveal who has or has not paid |
| Rally to Penny | approved target | PayPal order and aggregate ledger | only verified captures move the total |
| Penny to Ribbon | target reached and organiser email action | private 30-day reveal | raw token is emailed once; DynamoDB stores its SHA-256 hash |
| Ribbon to Penny or Porter | recipient chooses cash or personalised product | durable claim preference and next task | payout/purchase remains blocked until authority and final verification |

Each handoff adds an `AgentTrace` with `complete`, `waiting`, or `blocked` status. The Mini App renders those traces in the Circle, which makes the agent team inspectable without exposing internal prompts.

## Why this split

- A routing agent keeps Telegram replies coherent.
- Recipient analysis and gift selection have different safety and evaluation criteria.
- Treasury and fulfilment use narrower tools and stricter approval gates.
- The reveal agent may be creative, but it cannot invent contributor messages.
- Missing Bedrock access falls back to deterministic demo specialists without breaking the product tour.

## Bedrock provider strategy

The runtime uses Amazon Bedrock `Converse` so the harness is not coupled to one model vendor's request shape. `BEDROCK_MODEL_ID` accepts a model ID or inference profile ID; the default is the EU Amazon Nova 2 Lite profile for responsive, cost-conscious specialist calls. Evaluate a stronger reasoning profile for recipient synthesis and complex gift constraints before production.

The App Runner task role receives `bedrock:InvokeModel`; static AWS keys are neither required nor supported. Model output remains advisory. Application code executes tools, checks approval state and writes durable records.

## Channel3 commerce tool

Scout uses Channel3's `/v1/search` endpoint in agentic mode after the organiser confirms they can use the supplied clues. The server sends a hard maximum price, in-stock filter and stable `circle_<id>` attribution value. The adapter normalises product images and retailer offers, accepts both documented price shapes, rejects non-HTTPS buy links, and chooses an eligible offer within budget. The raw API key is never returned to the Mini App.

Channel3 enriches the recommendation; it does not have purchase authority. Porter must recheck the selected offer and obtain organiser approval before any future checkout handoff. The recipient's cash-or-gift choice is likewise a preference, not proof of payout or purchase.

The full replacement for social personality scoring is documented in [GIFT_RECOMMENDER.md](GIFT_RECOMMENDER.md). Sage produces an evidence-bound profile rather than a psychological label. Scout plans three complementary searches. A deterministic ranker then applies hard eligibility, relevance-dominant scoring, price proximity, catalog-quality weighting, deduplication and diversity before the organiser sees the shortlist.

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

## Recipient claim and email authority

Ribbon can send an Amazon SES email only when Telegram authentication succeeds, the Circle exists, and verified funding reaches the target. New Circles record the organiser's Telegram ID, so another member cannot create the recipient claim. Claim links expire after 30 days, and DynamoDB receives only a SHA-256 hash of the random bearer token.

`PAYPAL_PAYOUTS_ENABLED` defaults to `false`. This flag is an additional deployment gate, not proof of account authority. It may be enabled only after `npm run paypal:verify` confirms the Payouts scope and the payout execution plus item-level webhook worker have been implemented and reviewed. The production worker must still wait for item-level webhook state before marking a claim paid.

## State and deployment

Local development uses bounded in-memory stores. Setting `DYNAMODB_TABLE` switches campaigns, important events, contributions, Circle members, and recipient claims to the AWS single-table layout defined in `infra/circles-lambda-dev.yaml`.

## Minimum eval set before production

- Event detector does not trigger on past, hypothetical, or unrelated dates.
- Recipient insight never returns a protected or sensitive trait.
- Gift shortlist respects region, delivery date and hard budget.
- No reminder shames or identifies a non-contributor.
- Replayed PayPal create/capture/webhook calls do not double-count.
- Purchase and dispatch fail closed without the matching organiser approval.
- Reveal contains only submitted contributor messages.
- `/stop_analysis` prevents new messages entering the analysis buffer.
