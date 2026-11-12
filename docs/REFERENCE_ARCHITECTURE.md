# Reference architecture decisions

WanderWrap borrows proven patterns from the [AWS Telegram Mini App sample](https://github.com/aws-samples/sample-telegram-miniapp) and the official [Telegram Mini Apps SDK](https://github.com/Telegram-Mini-Apps/tma.js), while keeping the current product deliberately smaller than either reference.

## Adopted now

| Reference pattern | WanderWrap implementation | Why it matters |
| --- | --- | --- |
| Shared TypeScript client and server contracts | One Next.js application and typed agent harness | Fewer authentication and state mismatches |
| Official Mini App lifecycle | `@tma.js/sdk` mounts theme, viewport, native buttons, closing behaviour and signed init data | Graceful capability checks across Telegram versions |
| Server-side init-data validation | `@tma.js/init-data` with a one-hour expiry | Prevents forged users, stale sessions and group impersonation |
| Fast, idempotent bot webhooks | Secret token, payload limit, DynamoDB update claim and post-response processing | Telegram retries cannot create duplicate Circles |
| Least-privilege workload identity | App Runner instance role and Secrets Manager references | No static AWS credentials in the service |
| Durable operational controls | DynamoDB PITR, encryption, TTL, retention and deletion protection | Safer recovery and bounded idempotency records |
| Bedrock safety layer | Optional Guardrail on every Converse request | Central safety policy beyond specialist prompts |
| Native Mini App ergonomics | Telegram share link, haptics, viewport CSS variables, Main/Back buttons and close confirmation | The PayPal handoff feels native without assuming unsupported features |

## Deliberately deferred

The AWS sample uses Lambda, CloudFront, S3 and WAF. WanderWrap keeps App Runner for the first sandbox tests because its Next.js server, PayPal callbacks and bot webhook deploy as one observable unit. AWS now limits App Runner to existing customers, so account eligibility must be checked before deployment. If it is unavailable, AWS recommends ECS Express Mode for the closest container path; the sample's Lambda + CloudFront pattern is the scale-to-zero alternative. A serverless split also becomes valuable when measurements show idle-cost pressure, static asset scale or a need for edge WAF rules.

Before public launch, add a custom domain and edge WAF, CloudWatch alarms, a dead-letter queue for failed Telegram jobs, and automated restore testing. The current background webhook work is fast and retry-safe, but a queue is the correct next step when delivery guarantees matter across process restarts.

## Security boundary

The browser is untrusted. It may propose a prompt, contribution amount or campaign action, but it cannot choose the authenticated Telegram user/group, mark a PayPal capture complete, or skip a pending human approval. The harness and verified provider callbacks own those transitions.
