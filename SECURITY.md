# Security policy

Please do not disclose vulnerabilities in a public issue.

Report suspected vulnerabilities privately to the repository owner through GitHub's private vulnerability reporting feature. Include reproduction steps, affected routes and the potential impact. Do not include real PayPal credentials, Telegram bot tokens, AWS credentials or user chat data.

Production rules:

- `ALLOW_DEMO_AUTH` must be `false`.
- AWS workloads use IAM roles rather than static access keys.
- PayPal and Telegram webhook signatures are verified.
- Telegram Mini App identity is derived only from signed, unexpired init data; request bodies cannot select another group.
- Telegram webhook update IDs are claimed idempotently before background processing.
- Secrets are loaded from AWS Secrets Manager.
- Agent side effects require the matching persisted human approval.
- DynamoDB point-in-time recovery and deletion protection are enabled for production data.
