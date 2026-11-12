# AWS deployment

## Fast development environment

`circles-build.yaml` creates an ECR repository and a small CodeBuild project that builds this public GitHub repository without requiring Docker locally. `circles-lambda-dev.yaml` then runs the container with Lambda Web Adapter behind an HTTP API, using DynamoDB, Bedrock, and SES on a pay-per-use basis. The development stack resolves its PayPal and Telegram configuration from the `wanderwrap/circles/development` Secrets Manager secret and disables browser demo authentication.

The original App Runner template remains available for an eligible existing App Runner account. The Lambda development path is the preferred way to get the current prototype online quickly.

The app ships as a standalone Next.js container for AWS App Runner. App Runner gives the Telegram webhook a stable HTTPS endpoint and keeps the same service available for the Mini App UI and PayPal callbacks. The stack also provisions DynamoDB point-in-time recovery and encryption, update deduplication TTL, explicit autoscaling, X-Ray tracing and retained production data.

> **Account check:** AWS now limits App Runner to existing customers. Run `aws apprunner list-services --region eu-west-2` before treating this as the deployment target. If the account cannot create App Runner services, AWS recommends ECS Express Mode; the Lambda + CloudFront architecture in the AWS Telegram sample is also a scale-to-zero option. Do not weaken the application controls to fit a different host.

## 1. Build and push

Create an ECR repository, authenticate Docker, then build and push:

```bash
aws ecr create-repository --repository-name wanderwrap-circles
aws ecr get-login-password --region eu-west-2 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.eu-west-2.amazonaws.com
docker build -t wanderwrap-circles .
docker tag wanderwrap-circles:latest ACCOUNT_ID.dkr.ecr.eu-west-2.amazonaws.com/wanderwrap-circles:latest
docker push ACCOUNT_ID.dkr.ecr.eu-west-2.amazonaws.com/wanderwrap-circles:latest
```

## 2. Store secrets

Create plain-text values in AWS Secrets Manager for `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_OAUTH_STATE_SECRET`, `TELEGRAM_BOT_TOKEN`, and a long random `TELEGRAM_WEBHOOK_SECRET`. Keep PayPal in sandbox mode until the end-to-end flow has been reviewed. The OAuth state secret should be at least 32 random bytes.

## 3. Deploy App Runner

Deploy `infra/apprunner.yaml`, passing the ECR image URI, public app URL, Telegram bot username, secret ARNs and `EnvironmentType` (`sandbox` or `production`). The template grants the App Runner instance role scoped read access to those secrets and permission to invoke Amazon Bedrock. For production, create a Bedrock Guardrail and pass its ID and version; the application applies it to every specialist call.

## 4. Connect Telegram

Register the Mini App URL in BotFather, then set the webhook:

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://circles.wanderwrap.co.uk/api/telegram","secret_token":"YOUR_WEBHOOK_SECRET"}'
```

For production, deploy with `EnvironmentType=production` (which selects PayPal live mode and enables DynamoDB deletion protection), configure the custom domain in App Runner, and set the same final HTTPS URL in `NEXT_PUBLIC_APP_URL`.

## 5. Configure the existing PayPal webhook

Use one PayPal webhook for this app. Its URL remains:

```text
https://mvfjnli2kj.execute-api.eu-west-2.amazonaws.com/api/paypal/webhook
```

Edit that webhook in the PayPal Developer Dashboard and keep the existing `PAYPAL_WEBHOOK_ID`. Do not replace `TELEGRAM_WEBHOOK_SECRET`; Telegram and PayPal use unrelated verification mechanisms. Subscribe the PayPal webhook to:

- `PAYMENT.CAPTURE.COMPLETED`
- `PAYMENT.PAYOUTSBATCH.DENIED`
- `PAYMENT.PAYOUTSBATCH.PROCESSING`
- `PAYMENT.PAYOUTSBATCH.SUCCESS`
- `PAYMENT.PAYOUTS-ITEM.BLOCKED`
- `PAYMENT.PAYOUTS-ITEM.CANCELED`
- `PAYMENT.PAYOUTS-ITEM.FAILED`
- `PAYMENT.PAYOUTS-ITEM.HELD`
- `PAYMENT.PAYOUTS-ITEM.REFUNDED`
- `PAYMENT.PAYOUTS-ITEM.RETURNED`
- `PAYMENT.PAYOUTS-ITEM.SUCCEEDED`
- `PAYMENT.PAYOUTS-ITEM.UNCLAIMED`

If the existing webhook is edited, neither `.env.local` nor Secrets Manager changes. If a second webhook is created, its ID is different and the current verifier must be extended before both can be accepted.

## 6. Enable PayPal Payouts

In **PayPal Developer Dashboard → Apps & Credentials → Sandbox → the existing WanderWrap Merchant app**, open **Features**, enable **Payouts**, and save. Do not create a second app. Previously issued access tokens may retain the old scope until they expire, so rerun:

```powershell
npm run paypal:verify
```

Keep `PAYPAL_PAYOUTS_ENABLED=false` until the script reports that the effective access token has Payouts and the payout execution plus item-level webhook worker have been implemented and reviewed. The flag is a deployment gate, not a substitute for PayPal approval or verified payout status.

## 7. Amazon SES recipient email

The development account uses the DKIM-verified `chatpye.com` identity in `eu-west-2`, with `WanderWrap <hi@chatpye.com>` as the sender. SES production access is enabled, so recipient addresses do not need separate verification. Continue using transactional-only content, monitor bounces and complaints, and honour the SES suppression list.

## Operational checks

- Confirm `/api/telegram` returns healthy before setting the Telegram webhook.
- Verify X-Ray traces and App Runner logs after a test `/circle` command.
- Restore a DynamoDB point-in-time recovery snapshot in a non-production account before launch.
- Keep App Runner at one warm instance for predictable webhook latency; revisit Lambda + CloudFront only when measured traffic or cost justifies the migration.
