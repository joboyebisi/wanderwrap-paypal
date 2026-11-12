# Security policy

Please do not disclose vulnerabilities in a public issue.

Report suspected vulnerabilities privately to the repository owner through GitHub's private vulnerability reporting feature. Include reproduction steps, affected routes and the potential impact. Do not include real PayPal credentials, Telegram bot tokens, AWS credentials or user chat data.

Production rules:

- `ALLOW_DEMO_AUTH` must be `false`.
- AWS workloads use IAM roles rather than static access keys.
- PayPal and Telegram webhook signatures are verified.
- Secrets are loaded from AWS Secrets Manager.
- Agent side effects require the matching persisted human approval.
