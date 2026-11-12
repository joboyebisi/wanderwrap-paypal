# Product Requirements Document

## WanderWrap Circles — Agentic group gifting and private coordination

Version 2.1 · 12 November 2026 · Product extension to WanderWrap

> **Product promise:** One thoughtful room where people can plan, contribute, celebrate and complete a shared act of generosity—with an agent that keeps everything moving and people in control.

## 1. Executive summary

WanderWrap Circles is an agentic coordination experience for group gifting. It begins inside Telegram, but a Circle may also be created by an administrator as a private hosted room with its own invitation link.

An administrator can create a Circle for a gift, birthday message collection, celebration, or another permitted private collection; add or invite participants; set a target and deadline; and choose which actions require approval. Participants enter a group-style room where they can discuss ideas, vote, contribute through an approved PayPal flow, leave messages and follow progress.

Wrap, WanderWrap's persistent Circle agent, is present in the room. It provides an OpenClaw-style, action-oriented agent experience adapted to a governed group setting: Wrap can understand the room's goal, maintain shared context, call specialist agents, prepare plans, prompt the group at the right moments and perform approved actions. It does not silently spend money, analyse conversations without consent, or make decisions reserved for an administrator.

The initial product remains focused on gifting and celebration. Private-cause fundraising is a gated extension requiring payment-provider approval and additional trust controls. Investment, lending, equity, revenue sharing and promises of financial return are not enabled in the MVP and may only be introduced through an authorised regulated partner.

## 2. Problem and opportunity

Group generosity is usually coordinated across disconnected tools. A chat contains the discussion, a spreadsheet or one organiser tracks participation, payment links live elsewhere, reminders become awkward, and the final reveal loses the messages that made the gesture meaningful.

The opportunity is broader than a payment page: WanderWrap can become a private, purpose-built social room where the group and an agent coordinate the entire outcome.

The product must solve:

- fragmented invitations, discussion, decisions and payments;
- unclear ownership and permissions;
- awkward reminders and duplicated work;
- poor visibility into progress without exposing private contribution amounts;
- loss of context between chat, checkout, purchase and reveal;
- unsafe or unauthorised agent actions;
- confusion between a personal collection, charitable fundraising and a regulated investment.

## 3. Users and roles

| Role | Need | Authority |
| --- | --- | --- |
| Circle administrator | Create and safely coordinate the room | Configure, invite, moderate, approve and close |
| Co-admin | Help operate a Circle without owning it | Permissions explicitly delegated by the admin |
| Participant | Discuss, vote, contribute and leave a message | Acts only for themselves |
| Beneficiary or recipient | Receive the gift, money gift or reveal | Sees only the recipient experience until revealed |
| Wrap · Circle Conductor | Keep the room organised and route specialist work | May propose and prepare; side effects require policy and approval |
| Trust operator | Review reported or gated collections | Suspend, request evidence or release an eligible review |

One person may hold more than one human role. The recipient is not automatically a participant, which preserves surprise Circles.

## 4. Supported Circle types

### 4.1 Gift Circle — MVP

The group chooses a physical, experiential or money gift, contributes privately and approves fulfilment.

### 4.2 Celebration and message Circle — MVP

The group collects birthday, wedding, farewell, graduation or appreciation messages. A financial target is optional. The outcome may be a digital reveal, message wall, video or printable keepsake.

### 4.3 Permitted private collection — controlled pilot

A closed group collects money for a clearly stated personal cause, such as supporting a known friend after an emergency. This mode is not public crowdfunding, must not promise goods or financial return, and remains unavailable until WanderWrap has the appropriate PayPal approval, operating controls and jurisdictional review.

### 4.4 Investment or lending Circle — future regulated-partner mode only

WanderWrap will not collect or transmit investment money in the MVP. A room may coordinate discussion or link to an authorised external platform, but WanderWrap must not market, recommend, intermediate or accept money for shares, debt, loans, revenue sharing, interest, property participation or another investment interest.

Enabling an investment mode requires, at minimum:

- an authorised regulated operator responsible for the investment journey;
- written PayPal approval for the intended activity and payment model;
- jurisdiction, investor eligibility, KYC/AML and sanctions controls;
- approved financial promotions and risk disclosures;
- appropriateness or suitability checks where required;
- segregated records, complaints handling and a full audit trail;
- legal confirmation of WanderWrap's exact role and permissions.

Until those gates are met, selecting “investment” shows a clear unavailable state and offers a waitlist or an authorised external-partner handoff. It never creates a PayPal collection.

## 5. Core experience

### 5.1 Create a hosted Circle

An administrator can create a Circle from the Telegram Mini App or WanderWrap web experience.

The creation flow asks for:

- Circle type and plain-language purpose;
- title, recipient or beneficiary;
- surprise or visible mode;
- target amount, currency and deadline when money is involved;
- participation and contribution privacy;
- whether people join immediately or require admin approval;
- which actions Wrap may prepare and which require approval;
- optional cover, welcome message and first prompt.

After review, WanderWrap creates a private link with an editable slug and presents Telegram sharing controls.

### 5.2 Invite or add people

The administrator can:

- share the invite link in Telegram or another permitted channel;
- invite a known Telegram contact where Telegram permits it;
- regenerate, pause or revoke a link;
- require join approval;
- set an expiry or participant limit;
- remove a participant or promote a co-admin.

The bot must not add people to a Telegram group without the person's or group's action. “Add” means creating an invitation or membership record within the permissions Telegram provides.

When a Circle or WanderWrap URL opens in an ordinary browser, the application detects that no signed Telegram launch context exists and presents an explicit Telegram handoff. The handoff preserves the Circle ID through `startapp` so the user arrives in the correct Mini App state. Web browser presence alone never creates a member identity or authorises a payment action.

### 5.3 Enter the Circle Room

Opening the link displays a concise preview: purpose, organiser, deadline, privacy level and whether money is being collected. A participant confirms their display identity and joins.

The Circle Room feels like a focused group conversation. It contains:

- a chronological message and activity stream;
- a pinned goal, deadline and current stage;
- polls and gift options;
- a private contribution action and aggregate progress;
- shared files or links where permitted;
- a message wall hidden from the recipient until reveal;
- an agent presence with a visible status and current task;
- an approvals area for administrators;
- a members and permissions view.

The room is not presented as an end-to-end encrypted messenger. Users are told what is stored, who can see it and when the agent is using room context.

### 5.4 Coordinate with Wrap

Participants can address Wrap naturally, use a command, or tap a suggested action. Examples:

> “Wrap, give us three gift directions under £180.”

> “Summarise where we have landed and ask Jo for the final choice.”

> “Remind people who have not responded, but do not reveal who has paid.”

Wrap maintains a Circle-scoped working memory and delegates to specialist agents:

- Spark monitors explicit dates and milestones;
- Sage extracts consented, non-sensitive recipient preferences;
- Scout researches and compares gift directions;
- Rally coordinates participation, polls and considerate reminders;
- Penny prepares PayPal contribution and reconciliation work;
- Porter prepares purchase and delivery actions;
- Ribbon creates the reveal and message experience.

Every agent action appears in the room as one of: thinking, proposal, awaiting approval, running, completed or failed. Participants do not need to understand the internal multi-agent structure to use the product.

### 5.5 Collect and coordinate contributions

Before funding is shared, the organiser may give Scout a public post excerpt or a plain-language description of the recipient's interests. The organiser must affirm permission to use it. WanderWrap saves the supplied gift summary and optional source reference, but does not crawl private profiles or fetch arbitrary social URLs. Scout combines those clues with the Circle occasion and hard budget, then uses Channel3 agentic search to return live product cards with images, current offers, availability and retailer links. The selected product travels with the Circle link so every contributor understands what the collection may fund.

For eligible Circle types, Penny prepares a PayPal checkout for each contributor. The group sees only aggregate progress unless a contributor explicitly chooses otherwise. The admin does not receive another person's PayPal credentials or funding instrument details.

A contribution counts only after server-side PayPal verification. Refreshing, retrying or reopening checkout must not create duplicate credit. Refunds, reversals and disputes update the Circle ledger.

The Circle is a coordination ledger, not a bank account, escrow product, wallet or cryptocurrency service.

### 5.6 Approve, fulfil and reveal

Reaching a target does not automatically spend or release money. Wrap presents a final summary covering the chosen outcome, current price, delivery information, collected total and any shortfall or remainder. An authorised admin gives the final approval.

For gift and celebration Circles, Ribbon creates an unwrapping experience combining the gift or money-gift reveal with contributor messages, names, images and a clear next action. The recipient may then create an account, thank the group and start a future Circle.

## 6. User stories and acceptance criteria

### Epic A — Admin-created links and rooms

**As an administrator, I want to create a private Circle link so that I can coordinate people without first creating a Telegram group.**

Acceptance criteria:

- The admin can create a Gift or Celebration Circle from a guided flow.
- The review screen clearly shows purpose, recipient visibility, target, deadline and permissions.
- Publishing creates a unique, non-guessable link and a Telegram share action.
- The admin can revoke the link; a revoked link cannot admit a new participant.
- The admin can require approval and see pending join requests.
- A participant sees a preview and must intentionally join before room content is shown.

**As an administrator, I want to manage members and roles so that the room remains private and orderly.**

Acceptance criteria:

- The admin can remove a participant, promote or demote a co-admin and close the Circle.
- Every role change is visible in the activity history.
- Removed participants immediately lose access to protected room APIs.
- No agent may promote, remove or invite a member without an authorised human action.

### Epic B — Group-style coordination

**As a participant, I want one focused room for conversation, choices and progress so that I do not have to follow several services.**

Acceptance criteria:

- New messages and activity appear in chronological order with clear authorship.
- Important goal, deadline and approval state remain visible without scrolling through chat.
- A reconnecting participant resumes from their last seen position.
- A participant can vote, contribute and leave a reveal message without seeing another person's private amount.
- The room displays useful empty, loading, offline and failed-action states.

### Epic C — Persistent agent concierge

**As a group, we want Wrap present in the room so that coordination continues without one person doing all the administration.**

Acceptance criteria:

- Wrap can be prompted in natural language and with suggested actions.
- Wrap can summarise agreed facts, open questions and the next recommended step.
- Agent memory is scoped to the current Circle and respects analysis consent.
- Each material action shows what will happen and whether approval is required.
- A failed specialist or provider call produces a visible recovery option rather than a false success.
- Spending, payout, purchase, member management and recipient reveal fail closed without the required permission.

### Epic D — Birthday and message collection

**As an organiser, I want to collect birthday messages with or without money so that the recipient receives one emotional reveal.**

Acceptance criteria:

- The admin can create a message-only Circle with no funding target.
- Contributors can edit their message until the admin locks the reveal.
- The recipient cannot access surprise messages before the reveal time.
- The admin can preview the reveal without marking it delivered.
- The delivered reveal attributes messages according to each contributor's chosen display name.

### Epic E — Private causes and regulated boundaries

**As an administrator, I want to understand whether my collection is permitted so that I do not accidentally create an unsafe or regulated campaign.**

Acceptance criteria:

- Creation asks whether contributors expect a financial return, ownership, repayment, interest or rewards.
- Any “yes” routes to the disabled investment state and does not create a payment link.
- Private-cause mode remains feature-gated until provider and compliance approval is configured.
- The organiser must state the beneficiary, purpose and intended use of funds.
- Participants see that personal-cause contributions may not have purchase or donation protections.
- A report action pauses new contributions when the trust policy requires review.

### Epic F — Recipient reveal and PayPal money-gift claim

**As a recipient, I want to open an emotional reveal and claim an approved money gift through PayPal so that I can receive it even if I did not already have a PayPal account.**

The claim experience follows the useful product pattern demonstrated by Parity's gift app—an opaque gift claim, recipient invitation, guided account setup and explicit redemption—but uses PayPal rather than a crypto wallet or secret-bearing blockchain voucher.

Acceptance criteria:

- The organiser enters the recipient email only after the Circle is funded and the final money-gift amount is known.
- WanderWrap creates a single-use, high-entropy claim token, stores only its hash, and gives the claim an expiry and revocation state.
- The recipient email is sent through an approved transactional-email provider and never appears in Telegram group messages or public link metadata.
- Opening the claim displays the unwrapping experience and contributor messages before presenting the PayPal claim action.
- The recipient proves control of the destination email with a short-lived verification code before a payout can be submitted.
- If the destination email does not have PayPal, PayPal owns the account-creation and payment-claim experience; WanderWrap never collects or stores a PayPal password.
- A payout requires explicit organiser approval, an enabled PayPal Payouts capability and an idempotency key bound to the Circle and claim.
- The state machine records `draft`, `ready`, `emailed`, `opened`, `verified`, `payout_submitted`, `unclaimed`, `succeeded`, `returned`, `failed` and `revoked` states.
- PayPal payout webhooks or verified status reads—not browser redirects—are authoritative for `succeeded`, `unclaimed`, `returned` and `failed` states.
- If PayPal Payouts is unavailable, the claim page may demonstrate recipient onboarding and reveal UX, but release remains disabled and visibly says that no money was sent.
- Unclaimed and returned payouts reopen an organiser resolution task; they never silently count as delivered.
- The claim token cannot expose the Circle ID, recipient email, amount or contributor identities.

### Epic G — Consent-first live shopping and recipient choice

**As an organiser, I want to turn permitted recipient clues into real products within our budget so contributors can see a credible gift direction. As a recipient, I want to choose the personalised product or the money gift.**

Acceptance criteria:

- The organiser must explicitly confirm permission before recipient clues are saved or sent to Channel3.
- WanderWrap never logs into, crawls, or fetches a recipient's social profile; the optional URL is provenance only.
- Sage converts the approved text into an evidence-bound profile containing gift interests, style cues, values, constraints, exclusions and explicit confidence; it must not assign psychological or protected-trait labels.
- Scout creates three diverse Channel3 briefs: strongest profile fit, emotionally memorable and beautifully useful.
- Scout sends Channel3 Circle-scoped queries containing occasion, bounded profile context and the hard maximum price.
- Search uses the server-side `CHANNEL3_API_KEY`, passes a stable internal `x-user-id`, requests in-stock offers and never exposes the key to the browser.
- Deterministic code rejects over-budget or unavailable products, deduplicates candidates, scores relevance, price proximity and catalog completeness, and diversifies the final shortlist.
- Product cards show a real image when available, title, retailer, price, availability, attribution-safe buy URL, search intent, match score and evidence-grounded explanation.
- Missing credentials, provider errors and empty results are visible recovery states; no dummy product is presented as live.
- The organiser selects the direction. Selection does not place an order and is recorded in the agent trace.
- The selected product appears beside contribution progress and is copied into the immutable recipient claim snapshot.
- The recipient reveal offers PayPal money gift or recommended product when both are available and records the preference.
- Choosing a product creates a Porter task; current price, stock, delivery and any shortfall must be rechecked before organiser purchase approval.
- Choosing cash creates a Penny task; it cannot become paid without the required PayPal Payouts scope and verified item status.

Launch dependencies:

- PayPal Payouts enabled and approved for the WanderWrap merchant account;
- transactional email domain and sender verified in Amazon SES;
- payout, unclaimed, returned and denied webhook coverage;
- recipient-email retention, support and sanctions/risk review approved for launch.

## 7. Agent authority and approval policy

| Action | Wrap may do autonomously | Human approval required |
| --- | --- | --- |
| Summarise room activity | Yes, within consent | No |
| Suggest gifts or wording | Yes | No |
| Create a draft poll or reminder | Yes | Before sending if admin policy requires it |
| Send routine deadline reminder | Only within admin-configured cadence | Configuration approval |
| Enable message analysis | No | Explicit group/admin consent |
| Create PayPal order | Prepare only | Contributor's deliberate checkout action |
| Mark contribution complete | No | Verified PayPal event only |
| Purchase, pay out or release funds | No | Authorised admin plus provider verification |
| Add, remove or promote members | No | Admin action |
| Reveal recipient content | Prepare only | Admin approval or scheduled rule |
| Enable fundraising or investment | No | Platform compliance gate; investment also requires regulated partner |

## 8. Trust, safety and privacy requirements

- Invitation tokens are revocable, expire when configured and do not expose internal identifiers.
- Protected room APIs verify the participant and Circle membership server-side.
- Surprise recipients cannot discover the Circle through search, notifications or preview metadata.
- Chat analysis is off by default and begins only after clear consent.
- The product minimises storage of raw group messages and separates recipient insight from sensitive traits.
- Admins receive an audit history but cannot see private contribution amounts or payment credentials.
- Abuse reporting, rate limits and campaign suspension apply to links, messages and payments.
- The product blocks prohibited goods, deceptive claims, impersonation and unapproved public fundraising.
- Agent prompts, tool calls, approvals and material state changes are traceable for operational review.
- Closing a Circle stops new contributions and starts the configured retention/deletion lifecycle.

## 9. Reliability and agent infrastructure requirements

The experience must behave like a dependable service, not a chatbot demo.

- Each Circle has durable state, membership, event history and agent task status.
- Long-running agent and provider work runs as resumable jobs with retries and a dead-letter path.
- Incoming Telegram and PayPal events are authenticated and idempotent.
- Only one worker may execute the same material action, even after a retry.
- Specialist agents receive the minimum context and tools required for their task.
- The harness enforces permissions and state transitions independently of model output.
- The room receives real-time or near-real-time updates without requiring a manual refresh.
- Operator dashboards expose failures, latency, token usage, provider health and stuck approvals.
- A degraded AI provider does not corrupt the Circle; deterministic fallbacks keep core payment and approval states available.
- Tenant and Circle boundaries are tested so context cannot leak between rooms.

## 10. Edge cases

- The admin revokes a link while someone is completing the join flow.
- A participant opens the same link from two Telegram accounts.
- The admin leaves or loses their Telegram account before fulfilment.
- The recipient accidentally receives the invite to a surprise Circle.
- A member edits or deletes a message after Wrap used it in a summary.
- Two admins approve conflicting gift choices.
- PayPal approves checkout but the return to Telegram fails.
- A contribution is refunded after the target was reached.
- The gift price changes or becomes unavailable before purchase approval.
- A private-cause description changes after people contributed.
- A campaign is reported while an agent job is running.
- A prompt attempts to make Wrap reveal contributors, bypass approval or use another Circle's context.

Each case must produce an explicit, recoverable state rather than silently continuing.

## 11. Scope and release plan

### What we are building now

- Telegram Mini App and bot entry points;
- admin-created Gift and Celebration Circle links;
- private rooms, membership and basic role management;
- Circle message/activity stream with Wrap present;
- agent plans, summaries, gift suggestions and approval checkpoints;
- birthday and occasion message collection;
- PayPal Sandbox contribution, verification and aggregate progress;
- recipient unwrapping experience and guarded money-gift claim state machine;
- durable state, idempotent events, consent and audit history.

### Controlled pilot

- private personal-cause collections after PayPal and compliance approval;
- enhanced trust review, beneficiary evidence and reporting;
- real-time room updates and queued agent jobs at production scale;
- co-admin policies and organisation-level templates.

### Explicit non-goals for this release

- public discovery or searchable crowdfunding campaigns;
- anonymous fundraising;
- charitable receipting or claims that contributions are tax deductible;
- escrow, stored balances, crypto or an internal wallet;
- investment, lending, equity, debt, revenue share or promised returns;
- autonomous purchasing or payout without human approval;
- representing a simulated or scope-blocked payout as completed;
- importing or analysing historical Telegram chats without consent.

## 12. Success measures

- Circle creation completion rate;
- invite-to-join conversion;
- percentage of Circles reaching a decision and, where applicable, a target;
- median organiser interventions per completed Circle;
- contributor checkout completion and verified-payment reconciliation rate;
- percentage of Wrap proposals accepted, edited or rejected;
- time from Circle creation to approved outcome;
- reveal open and thank-you rates;
- repeat participation and recipient-to-organiser conversion;
- payment duplication, permission failure and cross-Circle leakage rates, each targeting zero.

## 13. Launch proof points

A convincing end-to-end demonstration shows an admin creating a birthday Circle, sharing its link in a Telegram group, a second Telegram account joining and opting into DM updates, linking a PayPal Sandbox identity, contributing through PayPal Sandbox, receiving verified aggregate updates, and opening a message-rich recipient reveal. If PayPal Payouts is enabled, the organiser then approves an email-address payout and the recipient follows PayPal's claim/account-creation experience. Without that scope, the release step visibly fails closed. A second demonstration shows a message-only Circle, while investment selection visibly fails closed and explains the regulated-partner requirement.

## 14. Policy references

Product and legal teams must confirm the current rules before enabling any collection mode:

- [PayPal UK Acceptable Use Policy](https://www.paypal.com/uk/legalhub/paypal/acceptableuse-full)
- [PayPal UK Pool Terms and Conditions](https://www.paypal.com/uk/legalhub/paypal/pool-tnc)
- [FCA: Understanding crowdfunding](https://www.fca.org.uk/investsmart/understanding-crowdfunding)
- [FCA: Consumer investment firm authorisation](https://www.fca.org.uk/firms/authorisation/consumer-investments)

This PRD describes product requirements, not legal advice. Launch approval must be based on the intended payment flow, jurisdictions and contractual role at that time.
