# WanderWrap Circles

Great gifts, together. WanderWrap Circles turns a Telegram conversation into a coordinated group-gifting experience: AI-assisted gift ideas, a shared funding goal, PayPal contributions, organiser approval, and a personal recipient reveal.

This MVP borrows the strong Telegram Mini App + webhook shape from Gifty, but contains no wallet, crypto, token, chain, or Web3 integration. PayPal is the only payment rail.

## Included

- Telegram-optimised mobile Mini App with Circle, AI gift ideas, contribution progress, message wall, invite sharing, and new-Circle flow
- Custom supervised multi-agent harness with eight scoped agents, durable traces and human approval gates
- Important-event memory through `/remember`, plus consented Telegram preference analysis
- Telegram bot webhook for `/start` and `/gift`, protected with Telegram's webhook secret header
- PayPal Orders v2 create/capture, verified webhooks, idempotency and a private Circle ledger
- Telegram Web App SDK integration and server-side init-data validation helper
- Demo-safe payment behaviour when PayPal credentials are absent
- Docker and AWS App Runner deployment infrastructure
- DynamoDB persistence for campaigns, event memory and contribution records on AWS
- Emotional recipient experience at `/unwrap/{token}` for physical, experience or money gifts
- Responsive browser fallback for judging and demos outside Telegram

## Run locally

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Without PayPal credentials, the interface runs in clearly labelled demo mode when a contribution is made. Add sandbox credentials to exercise real PayPal approval and capture.

## Environment

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Canonical HTTPS URL used in Telegram and PayPal return paths |
| `TELEGRAM_BOT_TOKEN` | BotFather token; server only |
| `TELEGRAM_WEBHOOK_SECRET` | Validates Telegram webhook calls |
| `PAYPAL_CLIENT_ID` | PayPal REST application ID; server only |
| `PAYPAL_CLIENT_SECRET` | PayPal REST secret; server only |
| `PAYPAL_ENV` | `sandbox` or `live` |

## Production hardening after the hackathon

The current UI uses an illustrative in-memory campaign snapshot to keep the demo deterministic. Before taking real contributions, persist Circles, members, approvals, PayPal order IDs, and webhook events in DynamoDB; verify PayPal webhook signatures; make capture idempotent; and reconcile every displayed total from completed capture records. Never accept a funding total from the client.

AWS deployment steps are in [`infra/README.md`](infra/README.md).

The agent topology, privacy contract and production eval checklist are in [`docs/AGENT_HARNESS.md`](docs/AGENT_HARNESS.md).
