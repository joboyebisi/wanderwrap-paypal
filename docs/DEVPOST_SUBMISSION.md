# WanderWrap Circles - Devpost Project Details Draft

> Status: Draft only. Nothing has been sent to Devpost. Fields marked **Confirm** require the submitter's personal confirmation before they are pasted into the form.

## Elevator pitch

WanderWrap Circles is an agentic Telegram group-gifting experience that remembers meaningful moments, turns consented context into thoughtful gift directions, coordinates private PayPal contributions, and delivers an emotional recipient reveal.

## Project Story

### About the project

## Inspiration

Group gifts begin with warmth and often turn into administration. One person creates the chat, chases replies, tracks who paid, compares gift ideas, and tries not to spoil the surprise. The payment page may collect money, but it does not do the coordination work.

WanderWrap Circles grew from the wider WanderWrap product, which builds a consent-first decision layer for thoughtful gifting. Circles brings that intelligence into Telegram, where groups already organise birthdays and celebrations. It is a feature of WanderWrap, not a separate company or product thesis.

## What it does

An organiser adds `@WanderWrapCirclesBot` to a Telegram group and asks it to create a Circle. Wrap, the conductor agent, creates the shared campaign and invite links. Specialist agents then take over bounded parts of the job:

- **Spark** recognises explicitly supplied birthdays and milestones.
- **Sage** reads only consented, gift-relevant context and extracts safe preference signals.
- **Scout** proposes distinct, budget-aware gift directions.
- **Rally** coordinates the target, participation, reminders, and private DM updates.
- **Penny** opens PayPal checkout and counts only server-verified captures.
- **Porter** prepares the purchase or fulfilment handoff behind organiser approval.
- **Ribbon** emails a private claim link and builds the recipient's unwrapping experience.
- **Wrap** owns the shared plan and explains every handoff in one coherent conversation.

Members open the Telegram Mini App from the group link or a private bot message. They can link a PayPal Sandbox identity, choose an amount, approve the payment on PayPal, and return to the exact Circle. The group sees aggregate progress but never another person's contribution amount.

Once the target is reached, the organiser can send the recipient a 30-day private reveal link. The reveal contains the group's messages and a clear claim state. PayPal Payouts remains fail-closed until the account receives the required scope, so the product never represents an unapproved payout as complete.

## How we built it

We built the product as a Next.js 16 application running on AWS Lambda behind API Gateway. Telegram signed `initData` authenticates Mini App requests, while a secret-protected Bot API webhook handles group and DM updates. DynamoDB stores Circle state, memberships, contributions, claim records, agent traces, and idempotency data.

The custom agent harness calls Amazon Bedrock through the model-agnostic Converse API. Amazon Nova 2 Lite powers specialist reasoning, but the harness owns permissions, state transitions, tool calls, retries, and approval gates. Models can propose work; only deterministic application code can execute payments, email a claim, or move a Circle to the next material state.

PayPal Orders v2 creates contribution checkouts. Log in with PayPal links a Sandbox identity. PayPal webhook signatures are verified server-side before a capture enters the Circle ledger. Amazon SES sends recipient claim invitations from the DKIM-verified `chatpye.com` domain.

## Challenges

The hardest challenge was preserving continuity across three security boundaries: Telegram, PayPal, and the web app. PayPal opens outside Telegram, so WanderWrap signs short-lived OAuth state, stores the pending contribution locally, and deep-links the member back into the correct Circle. A second challenge was distinguishing payment approval from verified money. The UI updates the total only after server-side capture reconciliation.

Payouts introduced a different boundary. The Sandbox app can collect contributions today, but its access token does not yet include the Payouts scope. We designed the claim state machine and recipient reveal, then deliberately blocked money release until PayPal enables that scope. That constraint improved the product because the agent harness now makes incomplete authority visible instead of hiding it.

## What we learned

Agentic UX works best when users experience one dependable coordinator rather than a collection of chatbots. The specialist structure matters inside the harness, while the user mainly needs clear progress, timely prompts, and understandable approvals. We also learned that the emotional end of a payment flow matters: the private messages and unwrapping sequence turn a transaction into a shared act of care.

## Accomplishments

- A working Telegram bot and Mini App with exact Circle deep links, group sharing, and private update opt-in.
- Real PayPal Sandbox identity linking, Orders v2 checkout, capture, webhook verification, and DynamoDB reconciliation.
- A custom multi-agent harness with eight named roles, durable traces, and approval-safe tool boundaries.
- Consent-controlled recipient analysis and Bedrock-powered gift curation.
- DKIM-verified Amazon SES email infrastructure and a private, expiring recipient reveal.
- A payout flow that fails closed until PayPal grants the required account scope.

## What's next

Next we will complete the PayPal Payouts approval, process item-level payout webhooks, and run the two-account Telegram test end to end. After that, we will add queued agent jobs, richer purchase-partner handoffs, real-time Circle updates, and production SES access. Private causes will remain gated behind provider approval and trust controls. Investment collections are outside this MVP and require a regulated partner.

## Built with

1. PayPal Orders v2
2. PayPal Identity / Log in with PayPal
3. PayPal Webhooks
4. PayPal Payouts state machine
5. Amazon Bedrock
6. Amazon Nova 2 Lite
7. Amazon SES
8. Amazon DynamoDB
9. AWS Lambda
10. Amazon API Gateway
11. Amazon ECR
12. AWS CloudFormation
13. Telegram Bot API
14. Telegram Mini Apps
15. TMA.js
16. Next.js
17. React
18. TypeScript
19. Node.js
20. Docker
21. GitHub Actions

## Try it out links

- Working Telegram Mini App backend: https://mvfjnli2kj.execute-api.eu-west-2.amazonaws.com
- Telegram bot: https://t.me/WanderWrapCirclesBot
- Public source code: https://github.com/joboyebisi/wanderwrap-paypal
- Parent product: https://wanderwrap.co.uk

## Project Media

### Image gallery

Primary 3:2 thumbnail: `docs/assets/wanderwrap-circles-devpost-thumbnail.png`

Recommended additional captures:

1. Telegram group: organiser creates Sarah's birthday Circle.
2. Mini App: active agents and the private contribution target.
3. PayPal Sandbox: approved contribution and verified total.
4. Telegram DM: contribution update with exact Circle link.
5. Recipient email and the WanderWrap unwrapping sequence.

### Demonstration video

**URL:** `[ADD UNLISTED YOUTUBE URL]`

Keep the recording under three minutes:

- 0:00-0:20 - the coordination problem and the Telegram group prompt;
- 0:20-0:55 - Wrap creates the Circle and specialist handoffs appear;
- 0:55-1:40 - second account joins, links a Personal Sandbox account, and contributes;
- 1:40-2:10 - verified total and group/DM updates;
- 2:10-2:40 - Ribbon emails the reveal and the recipient unwraps it;
- 2:40-2:55 - architecture, safety boundary, and PayPal Payouts next step.

## Additional info

### Submitter Type

**Suggested:** Individual  
**Confirm:** Change to Team if Dami Ige or Tunde Udomah are official hackathon team members.

### Submitter Country of Residence

**Suggested:** United Kingdom  
**Confirm:** This is inferred from the project configuration and must be confirmed by the submitter.

### Canadian province

N/A

### Organization Name

WanderWrap

### Is the project new, or did it exist before October 1, 2026?

**Suggested:** Existing

### What existed before and what changed during the submission period?

WanderWrap existed as a broader consent-first AI gifting product and working web experience. During the submission period we built WanderWrap Circles as a new Telegram-native feature: the Bot and Mini App entry points, the custom multi-agent coordination harness, Amazon Bedrock specialist calls, PayPal Sandbox identity and contribution flows, verified webhook ledger, DynamoDB persistence, Telegram group/DM updates, Amazon SES recipient invitations, and the private recipient reveal. The submitted hackathon work focuses on this new Circles implementation and its PayPal integration.

### How the project meets the main technology requirement

WanderWrap Circles integrates the PayPal developer platform in the free Sandbox environment and uses Amazon Bedrock AI.

- **PayPal Orders v2** creates one checkout order per private contribution and captures it after member approval.
- **Log in with PayPal / Identity API** links the Telegram member's Sandbox identity and restores the exact pending Circle flow.
- **PayPal Webhooks** authenticate capture events before DynamoDB counts money toward the Circle total.
- **PayPal Payouts** is represented by a guarded claim state machine. The current app detects that the Sandbox app lacks the Payouts scope and blocks release. Once enabled, the same state machine will reconcile batch and item webhooks before showing a completed claim.
- **Amazon Bedrock with Amazon Nova 2 Lite** powers recipient insight and gift-curation specialists through the Converse API.
- **The WanderWrap agent harness** routes work across eight specialists while deterministic code enforces consent, identity, idempotency, and human approval.

### Additional sponsor tools

None, used other AI tools.

### Public repository

https://github.com/joboyebisi/wanderwrap-paypal

### Working demo

https://mvfjnli2kj.execute-api.eu-west-2.amazonaws.com

### Testing instructions

1. In Telegram, create a group containing two test accounts and add `@WanderWrapCirclesBot`.
2. Ask the bot to create Sarah's birthday Circle, then open the shared Mini App link.
3. Start the Circle and approve opening the GBP 10 Sandbox collection.
4. From the second Telegram account, open the Circle and enable private DM updates.
5. Enter GBP 10 and choose **Link PayPal to contribute**.
6. Sign in with a **Personal PayPal Sandbox account** from PayPal Developer Dashboard, not a normal PayPal account.
7. Approve checkout and return to Telegram. Allow a few seconds for capture reconciliation.
8. Confirm the Circle shows GBP 10 verified, one contributor, and no individual amount in group updates.
9. As the organiser, send the private reveal to `hi@chatpye.com` while SES remains in Sandbox.
10. Open the email, unwrap the gift, and confirm the product clearly marks the PayPal payout as paused until Payouts scope is enabled.

Do not use real PayPal credentials or real money. Judges who need a Sandbox login should receive it privately; never place credentials in this public document.

### Overall PayPal integration rating

**Suggested:** 8/10  
**Confirm:** This is personal feedback and must be selected by the submitter.

### PayPal feedback

Orders v2, Sandbox accounts, and webhook verification gave us a strong end-to-end testing environment. The main friction was continuity across the external PayPal login and Telegram Mini App return, plus the delay between enabling an app feature and receiving a token with the updated scope. Clearer dashboard visibility into effective OAuth scopes and webhook event recommendations would make platform-style integrations faster to validate.

### Contact permission

**Suggested:** Yes  
**Confirm:** Personal consent required.

### APIMatic Context Plugin experience

N/A - we did not use the APIMatic Context Plugin.

### AG Grid experience

N/A - we did not use AG Grid or AG Charts.

### Eligibility attestations

- [ ] **Submitter must confirm** age of majority.
- [ ] **Submitter must confirm** eligible jurisdiction.
- [ ] **Submitter must confirm** no prohibited relationship with the promotion entities.

### AI tools used while building

Amazon Bedrock, Amazon Nova 2 Lite, and OpenAI Codex.

### Level of learning

**Suggested:** Significant

### Career-reusable AI value

**Suggested:** Yes. The project developed reusable patterns for agent routing, approval-safe tool use, payment reconciliation, cross-app identity continuity, and fail-closed financial workflows.

## Final completion checklist

- [ ] Confirm submitter type, country, organization, and project-existing answer.
- [ ] Confirm the three eligibility attestations personally.
- [ ] Add the unlisted YouTube demo URL.
- [ ] Capture the five product screenshots listed above.
- [ ] Enable PayPal Payouts on the existing Sandbox Merchant app and rerun `npm run paypal:verify`.
- [ ] Request SES production access before emailing arbitrary judge addresses.
- [ ] Recheck the public repository for secrets before the final push.
