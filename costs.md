# Kimallus: cost plan

## Goal
- Runs on AWS for more than 6 months at a few dollars a month.
- Budget limit 6 USD/month. Alerts at 2, 4 and 6 USD (actual spend).
- A budget only notifies, so costs are prevented by design.

## Architecture (serverless)
| Part | Service | Cost |
|---|---|---|
| Game delivery | S3 + CloudFront | CloudFront always free (1 TB, 10 million requests). S3 cents. |
| API | Lambda + Function URL behind CloudFront | Lambda 1 million requests/month free; Function URL free |
| Scores | DynamoDB, provisioned Standard (5 WCU / 5 RCU for the table and the index) | Within the always-free 25 WCU / 25 RCU |
| Events | S3, deleted after 30 days | Cents |
| Scheduling | EventBridge Scheduler | Free at small volume |
| Infrastructure as code | Terraform (account baseline) and AWS CDK (application) | Free. Terraform's state bucket costs cents. |
| Deployment | GitHub Actions + OIDC | Free, no stored keys |

## Technology choices
- **Infrastructure:** account baseline (budget, OIDC) in Terraform, application in CDK with TypeScript (the Azure sister project uses Bicep). Reasons: `docs/architecture.md` section 5.
- **API:** Lambda in TypeScript, bundled with esbuild. Fast cold start.
- **Front:** Canvas 2D with vector art drawn in code, no game engine, no pixel art. React for the stats page and the leaderboard.
- **Style:** own characters, soft and free-form (Bézier paths, blob shapes), no strict geometry. Rounded corners, bouncy motion, sparkle.
- **Tests:** Vitest, and CDK stack tests (`assertions`).

## Cost estimate after six months
- Most likely cents, at most a couple of dollars a month.
- The estimate is not measured. Check it with the AWS Pricing Calculator and Cost Explorer.

## Costs to avoid
- NAT Gateway and VPC for Lambda (about 30 USD/month).
- DynamoDB on-demand (not free).
- EC2, RDS and ELB (fixed monthly cost).
- Route 53 hosted zone (0.50 USD/month).
- KMS customer managed keys (1 USD/month each): SSE-S3 instead.
- X-Ray and heavy CloudWatch logging (retention 7 days).
- Forgotten trial resources.

## Guards
- Lambda reserved concurrency (5).
- Daily request caps in the API (DynamoDB counter, 429 above the cap). They protect the database, not the request charges of CloudFront and Lambda.
- Kill switch for the request charges: an alarm on the request count disables the CloudFront distribution without anyone watching the mail.
- Small DynamoDB capacity works as a ceiling.
- S3 lifecycle rule for raw data.
- Cost Explorer weekly.

## Timeline
- **Months 0–6:** Free plan, credits. Set up Budgets at once.
- **Before the end of month 6:** upgrade to the Paid plan (otherwise the account is closed). Requires a payment card.
- **From month 6:** the always-free limits stay, the rest is cents.

## Public code: privacy
- No children's names in code, comments, documents, commit messages or file names.
- `private/` in `.gitignore` before the first commit.
- GitHub's noreply address as the commit author.
- No drawings or photos in the repo.
- No AWS account ID, ARNs or `cdk.context.json` in the repo.
