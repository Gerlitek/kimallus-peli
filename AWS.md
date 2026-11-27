# AWS plan and checklist

Tick the items as the work goes on. Costs: `costs.md`.

## 0. Before anything else
- [ ] MFA on the root user; root is not used for daily work
- [ ] Own user for daily work (IAM Identity Center or IAM)
- [ ] Budgets: alerts at 2, 4 and 6 USD (actual spend)
- [ ] Cost Anomaly Detection on (new accounts have a default monitor: check it)
- [ ] Calendar reminder: the Free plan ends (6 months after the account was created). Upgrade to the Paid plan in time, otherwise the account is closed.
- [ ] Upgrade date: ______

## 1. Region and structure
- [x] Region chosen: `eu-north-1` (Stockholm)
- [ ] Checked that the services used are available in the region
- [ ] CloudFront certificate (ACM) in `us-east-1` for the custom domain
- [x] Domain: `kimallus.gerlitek.fi` with a CNAME at the current DNS provider, no Route 53 (a hosted zone costs 0.50 USD/month)

## 2. Terraform, CDK and deployment
- [ ] Terraform baseline (`infra-bootstrap/`): state bucket, budget, OIDC; `terraform plan` reviewed before `apply`
- [ ] State moved to S3 (`-migrate-state`), no `*.tfstate` files in the repo
- [ ] `cdk bootstrap` done (check that it creates no costs)
- [ ] GitHub Actions OIDC, IAM role limited to this repo's `production` environment
- [x] GitHub environment `production`: owner approval required, `main` branch only
- [x] `main` protected from force pushes and deletion (repository ruleset)
- [ ] The deploy role can only assume CDK's `cdk-*` roles
- [ ] No permanent `AdministratorAccess` for the deploy role
- [ ] `cdk diff` before every deploy
- [ ] Trial stacks removed (`cdk destroy`)
- [ ] CDK stack tests (`assertions`) and Lambda tests (Vitest)

## 3. Security (the code is public)
- [ ] No keys, no account ID and no `cdk.context.json` in the repo
- [ ] S3 Block Public Access on, delivery through CloudFront (OAC)
- [ ] No CORS: the API is served under the game's own origin through CloudFront
- [ ] Lambda reserved concurrency (5) and daily request caps
- [x] Input validation on the server (size, fields, name indexes, plausible score)
- [ ] Least privilege in Lambda roles (only the table and bucket they need)

## 4. Privacy (a game for children)
- [x] No personal data: player names from fixed word lists, no free text
- [ ] No children's names in code, documents, commit messages or file names
- [x] `private/` in `.gitignore` before the first commit
- [ ] GitHub's noreply address as the commit author, also for merges made on github.com (Settings > Emails > Keep my email addresses private)
- [ ] No IP addresses or cookies stored
- [ ] Log retention 7 days
- [ ] Short privacy notice

## 5. Cost guards
- [ ] No NAT Gateway, no VPC for Lambda
- [ ] DynamoDB provisioned Standard within the always-free 25 WCU / 25 RCU (table and index 5 each), not on-demand
- [ ] No EC2, RDS, ELB, X-Ray or WAF
- [ ] S3 lifecycle rule for raw data (30 days)
- [ ] CloudFront cache key without query strings, headers or cookies, so the leaderboard cache cannot be bypassed
- [ ] Function URL with IAM auth (OAC) only: direct calls are refused before the function runs
- [ ] Kill switch: a CloudWatch alarm on CloudFront requests (and the budget alert) triggers a small Lambda that disables the distribution. The site stays off until the owner turns it back on.
- [ ] The kill switch mails the owner itself (SNS): what was turned off, which limit was passed, how to turn it back on
- [ ] Kill switch tested once on purpose, and the way back documented. A full shutdown: visitors see CloudFront's error page.
- [x] Uptime check from GitHub Actions twice a day (`monitor.yml`): pages answer, certificate is renewed. A second line only: GitHub pauses schedules after 60 days without repository activity.
- [ ] `monitor.yml` checked after the move to CloudFront (same address, certificate from ACM)
- [ ] Find out: CloudFront flat-rate Free plan (0 USD, no overage). Open questions: is it available to this account type, and does it accept a Lambda Function URL origin? The kill switch stays either way.
- [ ] No CloudFront access logs (they would store IP addresses)
- [ ] Cost Explorer checked a week after the first deploy
- [ ] Monthly check: bill against the estimate (target under 6 USD)

## 6. Documentation
- [ ] README: architecture diagram, cost estimate, reasons
- [ ] Comparison with the Azure sister project (zombie game), as a section in the README or `docs/architecture.md`
- [x] Deployment with GitHub Actions, badge in the README

## Stages
1. **Account and guards:** section 0.
2. **Skeleton:** Terraform baseline (budget, OIDC), `cdk bootstrap`, the first CDK stack (S3, CloudFront), OIDC deployment.
3. **Static game online:** sections 3 and 5 checked.
4. **API:** Lambda, DynamoDB, daily caps, validation.
5. **Nightly job and data:** EventBridge, S3 raw → curated.
6. **Finishing:** documents, privacy check, cost check.

## Decisions
| Date | Decision | Reason |
|---|---|---|
| | CDK in TypeScript, Lambda in TypeScript | one language, fast cold start, the most widely used CDK language |
| | Vector art, own characters | does not mix with the zombie game's pixel style |
| 2026-11-23 | Front first to the Gerlitek web host (rsync), AWS later | the game online at once without costs, the same model as in the zombie game |
| 2026-11-24 | Account baseline in Terraform, application in CDK | the CI role is needed before CDK, different lifecycles, CI cannot change its own permissions |
| 2026-11-26 | Region `eu-north-1`, state bucket SSE-S3, budget alerts on actual spend | closest region; SSE-S3 is free; forecast alerts at low amounts are noise |
| 2026-11-27 | Own kill switch: full shutdown of the distribution, the switch mails the owner | request charges need a cap that works without anyone watching |
| 2026-11-27 | Leaderboard per UTC year, old scores deleted by TTL | only what is shown is kept |
| 2026-11-27 | Uptime check from GitHub Actions twice a day | free, no secrets; a second line next to the kill switch |
