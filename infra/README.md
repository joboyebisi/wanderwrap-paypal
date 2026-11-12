# AWS deployment

The app ships as a standalone Next.js container for AWS App Runner. App Runner gives the Telegram webhook a stable HTTPS endpoint and keeps the same service available for the Mini App UI and PayPal callbacks.

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

Deploy `infra/apprunner.yaml`, passing the ECR image URI, public app URL, Telegram bot username, and secret ARNs. The template grants the App Runner instance role scoped read access to those secrets and permission to invoke Amazon Bedrock.

## 4. Connect Telegram

Register the Mini App URL in BotFather, then set the webhook:

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://circles.wanderwrap.co.uk/api/telegram","secret_token":"YOUR_WEBHOOK_SECRET"}'
```

For production, change `PAYPAL_ENV` to `live`, configure the custom domain in App Runner, and set the same final HTTPS URL in `NEXT_PUBLIC_APP_URL`.
