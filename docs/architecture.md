# Architecture and decisions

**Kimallus** ("sparkle"): a browser game on AWS at `kimallus.gerlitek.fi`. Goal: a readable, cheap system described as code, where every choice can be justified. Costs: `costs.md`. Checklist: `AWS.md`.

Hard requirement: a few dollars a month, also after the AWS Free plan ends (budget limit 6 USD). Every new resource is weighed against this before it is added.

## 1. Overview

```
Browser
  │  https://kimallus.gerlitek.fi       (static front: Vite + TypeScript + Canvas 2D)
  ▼
CloudFront ─────────────────────────────────────────────────────────────┐
  │  /*            ──► S3  web/        game files (private, OAC)          │
  │  /stats.json   ──► S3  public/     nightly summary                    │
  │  /api/*        ──► Lambda Function URL (OAC, no direct access)        │
  │                      POST /api/scores     ──► DynamoDB  (scores)      │
  │                      GET  /api/leaderboard ◄── DynamoDB               │
  │                      POST /api/events     ──► S3  raw/  (NDJSON, 30 days)
  ▼                                                                       │
EventBridge Scheduler, once a day                                         │
  └─► Lambda curate:  raw/ ──► public/stats.json ─────────────────────────┘

GitHub Actions ──(OIDC, no keys)─────► AWS       CDK stacks and code
Owner ──(Terraform, by hand)─────────► account   budget, OIDC role, state bucket
```

Everything goes through one CloudFront distribution. The front and the API share one origin, so no CORS is needed, and neither the Lambda nor S3 can be called directly past CloudFront.

The first AWS version is the static front alone (S3 + CloudFront). The API and the nightly job follow.

**Interim hosting before AWS:** the front is published first to Gerlitek's shared web host (Apache), the same way as the sister project (zombie game): GitHub Actions, rsync over SSH, approval in the `production` environment. The game is online without AWS costs. When the web stack (S3 + CloudFront) is ready, the CNAME is pointed to CloudFront and the rsync step is removed. See section 6.

**Status (2026-11-26):** the game is live on the interim host. In development: the Terraform baseline, the CDK app and the AWS deployment. The score API runs locally against DynamoDB Local until then.

## 2. Front

### Choices
- **Vite + TypeScript, Canvas 2D, an own game loop.** No game engine. The game is a one-button runner with a few calm mini-games, for which an engine would be heavy.
- **Vector art in code:** characters are drawn with `Path2D` as Bézier curves. No image files, no pixel art.
- **Squash and stretch** with canvas transforms (`scale`, `rotate`): the jump stretches, the landing squashes.
- **Menus, the player name and texts in the DOM.** Text stays sharp, accessible and easy to translate.
- **React for the DOM parts only, not the game.** The stats page is a React app, and the leaderboard on the game page is a React island. The game loop and the canvas stay framework-free, since React adds nothing to drawing. React loads only on pages that use it.
- **Controls:** space and mouse on desktop, tap on touch screens.

### Structure
```
web/
  index.html            start page: logo, instructions, game, credits, stats and source links, privacy note
  tilastot/index.html   stats page (reads stats.json)
  src/
    main.ts             start-up, game loop (requestAnimationFrame, fixed time step)
    art/                drawing: unicorn, cat friend, props, stars, sparkles, nails, clips, background, palette
    data/               content as data: obstacles, levels, polishes, clips
    logic/              pure rules: physics, collision, spawn, score, hearts, stars, nails, names, easing, random
    scenes/             ride.ts, nail-station.ts, mane-station.ts, share-moment.ts, home-moment.ts, cards.ts
    systems/            input, particles, lumens, storage, api
    leaderboard/        rows.ts (fetch, ranking), store.ts (bridge to the game), Leaderboard.tsx, index.ts (lazy load)
    stats/              stats page in React: summary.ts (pure functions), useSummary.ts (fetch), StatsPage.tsx, BarCard.tsx
```

Three rules keep the code explainable:

1. **Content is data.** An obstacle, a station and a level are rows in `data/`. A new obstacle needs no new code.
2. **Rules are pure functions.** `logic/` never touches the canvas. Randomness comes in as a parameter, so the rules are tested with Vitest without a browser.
3. **A scene is an interface.** Every scene has `enter`, `update(dt)`, `draw(ctx)` and `exit`. The game loop does not know which scene is running.

### Scenes
| Scene | Content |
|---|---|
| Ride | the runner: the unicorn jumps over obstacles, the cat shoots hearts from its tail, stars are collected |
| Stations | a calm mini-game on top of the ride; the ride stops. Nail polishing in close-up (7 polishes, metallic and glitter ones too; three brush strokes per nail, 5 points per finished nail, 10 bonus for all four). Mane clips (5 clips: heart, star, bow, flower, gem; same points as the nails). The two alternate on the track |
| Moments | sharing a cupcake, and coming home at the end of the last level |
| Cards | cards over the game: the start screen and the result at the end of a round |

### Obstacles
| Obstacle | Mechanic |
|---|---|
| Gem | short jump. Six colours: diamond, emerald, ruby, sapphire, amethyst and topaz |
| Diamond river | low but long; at slow speed it needs a held jump |
| Rainbow bar on clouds | high jump, needs a held jump |
| Porridge bowl | Mum has left hot porridge to cool: the bowl shows porridge, a knob of butter, berries and a spoon. Short jump, comes rarely (weight 0.7) |

There is only one Mum: she appears once per game, waving behind the first porridge bowl (a bowl in her speech bubble). She is not an obstacle; the unicorn passes in front of her.

Each obstacle's jump type (`jump: 'tap' | 'hold'`) is in the data, and a test checks that the promised jump clears it at every level's speed with a 25 % margin, since a child's timing is not perfect. The rainbow is taller than it is wide, so a slow jump clears it visibly too.

### Levels and the finish
Levels are data (`data/levels.ts`): speed, obstacle spacing and whether the level is gentle.

| Level | Speed | Obstacle spacing | Hitting an obstacle |
|---|---|---|---|
| 1 | 210 px/s | 3–4.5 s | the unicorn stumbles and slows down for a moment, the game goes on |
| 2 | 290 px/s | 2.4–3.6 s | the round ends |
| 3 | 370 px/s | 1.9–2.9 s | the round ends |

- The level 1 gate comes at 14000 px at the earliest (a good minute of running), and only after two stations (visited or skipped) and Mum have been seen. Nails and mane alternate whenever a station is offered, so a skipped station is followed by the other one. If the porridge has not come up by 8000 px, it comes next. On levels 2 and 3 the gate or home comes after 8000 px.
- Speed is constant within a level. The player may stay on level 1 as long as they like.
- The next level is reached through a star gate, which works like any pickup: run through or jump over. The gate has as many stars as the level it leads to. A gate jumped over comes back 4000 px later.
- On the last level, home replaces the gate as the finish. Mum waits there with porridge (`scenes/home-moment.ts`, +50 sparkle), and the round ends happily.
- The own best score is saved in the browser as soon as it is beaten, not at the end of the round, so it is kept even if the game is quit with Esc or the window is closed.
- Every round starts from level 1, so a fast level chosen by accident does not stay on.
- The level shows as stars at the top of the game and on the result card; a player who got home has a house on the card.
- The leaderboard (stage 4) stores the level reached and whether the player got home, as well as the score.

Sharing moment (`scenes/share-moment.ts`): after six collected stars a big glowing cupcake with an arrow comes onto the track, like the nail polish bottle. It is the only treat on the track. Running into it starts the sharing; jumping over skips it (it comes again later). There is one cupcake on the plate, and a cupcake in the star friend's thought bubble. On a press the cupcake splits in two, each gets a half, the friend floats closer and they eat four slow bites together (+15 sparkle). No sad phase. Once per game.

Nail polishing (`scenes/nail-station.ts`): the hooves are shown in close-up with the same drawing code as elsewhere, only at a larger scale. Each press is one brush stroke: the first two are slow (1.1 s), the rest faster (0.6 s), so a multicoloured nail does not get boring. A hoof is finished with three side-by-side strokes. Strokes stay visible as stripes, and the polish can be changed between strokes. A finished hoof gets a heart or star sticker. When all four are done, the view zooms out and the unicorn hops slowly.

Mane clips (`scenes/mane-station.ts`): a close-up of the mane, the cat watching beside it. On a press the chosen clip floats slowly to the next tuft. When all five tufts have a clip, the view zooms out. Clips and polished hooves stay on the unicorn on the track for the rest of the game. The rules are the same as for the nails, so they come from `logic/nails.ts`.

Starting and continuing: no prompt images. On the start screen the unicorn bounces, and the game starts from any press. Moments continue by themselves. A small hint for adults at the bottom of the play area.

Hearts: the cat shoots hearts from its tail (X, right mouse button or the heart button on touch screens) diagonally upwards. Sad grey clouds float in the sky. A hit makes a cloud happy (smile, heart eyes, hug or star eyes), and it floats away. Rules in `logic/hearts.ts`.

Stars: in an arc above an obstacle (collected by jumping over) or in a row on the ground. Rules in `logic/stars.ts`. Treats are not collected: the only cupcake is the one that is shared.

### Pictures first
The players are young children who cannot read yet. Inside the game everything is told with faces and pictures: a sad and a happy face, a thought bubble, an arrow, a big ▶ button, a food bowl. Text appears only in the instructions for parents on the start page and as a small hint on the cards.

### Calm and safe
A young child plays: little happens on screen at a time. No fast flashing; all brightness changes are slow. The theme still shows: chubby pastel stars, softly twinkling sparkles and a little quietly floating glitter. The pace is slow, since the player is about four years old: on level 1 the speed is 210 px/s and obstacles come every 3–4.5 s (see Levels and the finish), the jump floats (short about 0.85 s, long about 1.2 s), clouds every 5–8 s, at most 3 light orbs at a time. No bursts of rewards: sparkle comes a few flakes at a time, and movements start and end softly (`logic/ease.ts`). No prompts to press: the game starts from any press, and moments continue by themselves.

### Sparkle (points)
In text, points are called sparkle ("kimallus": "+15 kimallusta"). In the game they show as glowing light orbs (in code `lumen`, the unit of light) that fly to the counter, and the counter icon pulses. The word lumen is not shown to the player without an explanation.

| Source | Sparkle |
|---|---|
| Distance | 1 per 200 px (about one per second) |
| Star | 5 |
| Shared cupcake | 15 |
| Home (finish) | 50 |
| Happy cloud | 10 |
| Nail polishing | 5 per nail, 10 bonus for all |
| Mane clips | 5 per clip, 10 bonus for all |

Setting: a pink, sparkling star world with asteroids. The word *stellar* appears in the game, for example as the name of an asteroid field or an achievement.

### Player names
Long, cute names are combined from word lists (heart, star, unicorn, rainbow …). A name is stored as **indexes into the word lists**, never as free text. The server accepts only valid indexes, so nobody can write anything they like into the public table. The word lists are in the shared `shared/` package.

A name has the form "Säihkyvä Tähtisydän Yksisarvinen" ("Glittering Starheart Unicorn": a describing word, a compound of two theme words, a character). It always has three words, so it can be read to a child and remembered; no numbers. There are 228,000 combinations (30 × 20 × 19 × 20), so the same name rarely comes up twice, and rows are told apart by the session id anyway. New words are added to the end of a list, since stored names are indexes. The name is drawn on the first visit, stored in the browser as indexes and shown above the game; "Arvo uusi" (draw a new one) draws another. The lists and the validity rule are in the `shared/` package (`words.ts`, `names.ts`), used by both the front and the API; the drawing is in `web/src/logic/names.ts`.

### State in the browser
- `localStorage`: the player name (as indexes) and the best round (`{ score, level, home }`: sparkle, level reached, whether the player got home). Reads and writes inside `try/catch`.
- `sessionStorage`: a random session id (`crypto.randomUUID()`).
- No cookies, no third-party scripts, no external fonts.

The game never waits for the network. If the API does not answer, the game goes on and the table shows local results.

### Leaderboard and stats page before the API
Both layouts are ready, and both work without a server. When a round ends, the game sends the result (`submitScore`, `leaderboard/rows.ts`) with the session id; nothing waits for it. The API address is given at build time (`VITE_API_URL`, `systems/api.ts`); when it is empty, nothing is sent over the network.

- **Leaderboard** (`src/leaderboard/`, below the game, a React island): the top ten rows from the server (`GET /api/leaderboard`) with the own best highlighted at its rank. A row is `{ name: [indexes], score, level, home }`; the level shows as stars and getting home as a house. Without the API only this device's best is shown. Rows from the server are validated (name indexes, numbers) before they are shown. The game is not a React app: it only calls `refreshLeaderboard()` when the name changes or a round ends. A small store (`store.ts`) keeps the own best and a round counter, and the component reads it with `useSyncExternalStore`. React and the component load through a dynamic import once the game is on screen, so the game's own bundle does not grow and the first frame never waits for React.
- **Stats page** (`src/stats/`, `tilastot/`, React): draws the nightly summary (`stats.json` at the site root, type `Summary`): games, sessions, games that got home, duration and sparkle (medians), games per day, highest level, station visits and skips, favourite polishes and clips, and the obstacles players stumbled on. Bars are plain HTML and CSS, no chart library. The numbers become cards in pure functions (`summary.ts`), so they are tested without a browser; the components only draw. Fetching is in its own hook (`useSummary`), which aborts the request when the component unmounts. The page header is static HTML, so it shows without JavaScript too.
- **Example data:** `?demo` after the address shows made-up rows and numbers (`stats/demo.ts`), and the page says clearly that they are examples.

### Phones and tablets
The game works by touch: a tap jumps, a long press leaps high, the heart button shoots. On a touch device the game fills the whole window while playing (`body.playing`), since not every device has full screen, and a small ✕ button replaces Esc. The aspect ratio is 16:9, so the device is best held in landscape. Detection: `(hover: none) and (pointer: coarse)`.

## 3. API

One Lambda (Node.js, TypeScript), bundled with CDK's `NodejsFunction` (esbuild). Routing in one handler, logic as pure functions in `api/src/logic/`. The handler is built and tested; it runs locally against DynamoDB Local and is not deployed yet.

| Route | Purpose | Limits |
|---|---|---|
| `POST /api/scores` | the result of a round; the session's best stays | one row per session, validation in `shared/score.ts` (400), body at most 1 KB; answer `{ best }` |
| `GET /api/leaderboard` | top 10 | CloudFront cache 60 s |
| `POST /api/events` | a batch of events to the raw layer (planned) | at most 50 events and 16 KB |

**Lambda Function URL behind CloudFront (OAC)**, no API Gateway: a Function URL is free, and the HTTP API free tier does not continue after 12 months.

### Cost guards
- Lambda reserved concurrency 5.
- Daily caps with a DynamoDB counter (UTC day): 2000 scores, 5000 leaderboard reads; above the cap the API answers 429. The counter is atomic (`ADD`), the cap is a condition (`n < max`), and the row expires with TTL (`expires`) the day after. A malformed request is rejected before the counter, so it costs no write.
- Input validation: size, fields, indexes, maximum score.
- Plausibility (`shared/score.ts`): at most 5000 points, home only from the last level, and each level has the minimum score that the track length gives (level 2: 70, level 3: 110, home: 200). The test `web/test/score-rules.test.ts` ties the numbers to the levels. The rules stop a careless fake, not a careful one: the game runs in the browser. The owner removes an odd row by hand.

## 4. Data

| Store | Content | Lifecycle |
|---|---|---|
| DynamoDB, one table and one index, provisioned Standard (5 RCU / 5 WCU each) | scores, daily counters | scores stay, counters expire with TTL |
| S3 `raw/` | events as NDJSON, `raw/yyyy/mm/dd/` | deleted after 30 days |
| S3 `public/stats.json` | nightly summary for the stats page | replaced every night |

### Table design
- Table key `pk`. A score is `SESSION#<session id>`, and the row holds the session's best round. The write is conditional (`attribute_not_exists(pk) OR score < :score`), so a lower score never replaces a higher one and two concurrent requests cannot mix up. Counters: `COUNT#<route>#<day>`.
- Index `leaderboard` (GSI): partition key `board` (the same value on every score), sort key `score`, projection `INCLUDE` (only `name`, `level`, `home`). The top ten are read with one Query in descending order, never a Scan.
- The index is sparse: counter rows have no `board` attribute, so they are not in the index.
- Code: `api/src/logic/items.ts` (row shape), `api/src/store.ts` (DynamoDB calls), `api/src/handler.ts` (routing).

The nightly job (EventBridge Scheduler → Lambda) reads the previous day's raw files and updates `stats.json`. The stats page reads it straight from CloudFront without a Lambda.

Events hold no personal data: a session id, the event type, the time and game values. No player names and no IP addresses are stored. The session id changes when the tab is closed, so events cannot be linked into one player's history across days.

## 5. Infrastructure as code (Terraform and CDK)

Planned; neither folder is in the repo yet.

Two tools, each with its own job. The same resource is never in both.

| Layer | Tool | Content | Who runs it |
|---|---|---|---|
| Account baseline | Terraform | budget and alerts, GitHub OIDC provider, deploy role, state bucket | the owner, by hand |
| Application | CDK (TypeScript) | S3, CloudFront, Lambda, DynamoDB, nightly job | GitHub Actions after approval |

Reasons:
- **Chicken and egg.** A CDK deploy from CI needs the OIDC role, so the role cannot live in CDK. The baseline must exist before the application.
- **Different lifecycles.** The baseline changes rarely and lives independently of the application. The application changes often, and its Lambda code is in the same TypeScript project.
- **Separation of permissions.** The CI role cannot change its own permissions, because the role is in Terraform, which CI does not run.
- **Work sample.** Both are common in industry; baseline in Terraform and application in CDK is a usual split.

### Terraform: `infra-bootstrap/`

```
infra-bootstrap/
  versions.tf      Terraform and provider versions, S3 backend
  state.tf         state bucket: versioning, SSE-S3 encryption, Block Public Access
  budget.tf        budget 6 USD/month, alerts at 2, 4 and 6 USD (actual spend)
  github-oidc.tf   OIDC provider and deploy role
  variables.tf     region, repo, alert email
  outputs.tf       deploy role ARN (for a GitHub variable)
```

- Region `eu-north-1` (Stockholm). Budgets and IAM are global.
- State in S3, locked with S3's own lock file (`use_lockfile`), no DynamoDB table. The first run uses local state, then `terraform init -migrate-state` moves it to the bucket.
- The backend bucket name is in `backend.hcl` and the variables in `terraform.tfvars`; neither is in the repo. `.terraform.lock.hcl` is in the repo.
- The deploy role trusts only this repo's `production` environment. In GitHub, `production` requires the owner's approval and allows only the `main` branch. The role's only permission is to assume CDK's bootstrap roles (`cdk-*`); no direct permissions to resources.
- `cdk bootstrap` (the CDKToolkit stack) stays CDK's own, since CDK expects its structure.

### CDK: `infra/`

```
infra/
  bin/app.ts
  lib/
    cert-stack.ts         ACM certificate in us-east-1               (only for a custom domain)
    web-stack.ts          S3, CloudFront, OAC
    api-stack.ts          Lambda, Function URL, DynamoDB, raw bucket
    jobs-stack.ts         EventBridge Scheduler, curate Lambda
  test/                   stack tests (aws-cdk-lib/assertions)
```

- Account ID and region from environment variables, never in code. `cdk.context.json` is not in the repo.
- Every resource has the tag `project=kimallus`, so costs show in Cost Explorer.
- Log retention 7 days on every Lambda.
- Tests check the cost guards: no NAT Gateway, DynamoDB not on-demand, S3 Block Public Access on, Lambda concurrency limited.

### Domain
`kimallus.gerlitek.fi`. DNS stays with the current provider: a CNAME to CloudFront and ACM DNS validation by hand. No Route 53.

## 6. CI/CD (GitHub Actions)

| Workflow | Steps |
|---|---|
| `web.yml` | type check, Vitest, build; when started by hand, approval and rsync to the web host (interim) |
| `api.yml` (planned) | lint, test |
| `infra.yml` (planned) | `cdk synth`, tests, `cdk diff` on pull requests, deploy from main behind approval (GitHub environment) |
| `bootstrap.yml` (planned) | `terraform fmt -check` and `terraform validate`, no AWS credentials; `apply` only from the owner's machine |

AWS login with OIDC. The role trusts only this repo's `main` branch and `production` environment.

Practices from the sister project:
- Pushes and pull requests only test and build. A deploy is started by hand (`workflow_dispatch`) from `main` and approved in the GitHub environment `production`.
- Actions are pinned to a commit SHA, not a tag.
- A running deploy is never cancelled (`concurrency`).
- `main` cannot be force-pushed or deleted (repository ruleset).
- Account-level resources (budget, OIDC role, state bucket) are applied by the owner with Terraform after reviewing `terraform plan`.

### Interim: publishing to the web host
- The front is copied to shared hosting (Apache) with rsync over SSH. `--delete` removes files from old builds.
- The SSH key is the `production` environment secret `DEPLOY_SSH_KEY`, so only an approved run gets it. The server user name is the variable `DEPLOY_USER`. The key is made for this game only, and on the server it is limited to the game's folder (`command=` restriction and `rrsync` in `authorized_keys`).
- The server's host key is pinned in the workflow. If it changes, the deploy fails instead of trusting a stranger.
- Before syncing, the workflow checks that the build has `index.html`, `tilastot/index.html` and `.htaccess`, so an incomplete build never empties the site.
- `web/public/.htaccess`: HTTPS redirect, no directory listing, a strict CSP (own origin only, no external scripts or fonts), caching: hashed files for a year, pages and JSON always fresh. HSTS is added once the certificate has renewed once without problems.
- When the API comes, its address is added to the CSP `connect-src`.

## 7. Repo

```
web/        game and stats page
api/        Lambda handler and logic
shared/     types, word lists, validation (front and API)
infra/      CDK (application, planned)
infra-bootstrap/  Terraform (account baseline, planned)
docs/       documents
private/    not in the repo (.gitignore)
```

npm workspaces, one `package.json` at the root.

## 8. Stages

1. **Local game:** the ride scene, the unicorn, the cat, the first obstacles. No AWS. Done.
2. **Online:** first to the web host with rsync (interim, done), then the Terraform baseline (budget, OIDC), the web stack and CI. The game public on CloudFront.
3. **Content:** the rest of the obstacles, the cupcake, heart clouds, stations. Done.
4. **API:** scores and the leaderboard, cost guards. Handler done and tested locally; deployment pending.
5. **Data:** events, the nightly job, the stats page.
6. **Finishing:** README and a comparison with the Azure sister project.

### Version 1 and later
Version 1 is complete in content: three levels and the finish, four obstacles, stars and heart clouds, two stations (nails and mane), sharing a cupcake, the player name, the own best score, the leaderboard and the stats page (with example data until the API is deployed). What remains is the AWS work (stages 2, 4 and 5).

Ideas for version 2:
- **Figure play:** a station where the player plays with figures together with the unicorn.
- **Treat station:** feeding the unicorn. Under consideration, since the share of treats in the game was reduced on purpose.
- **Sounds:** soft sounds and a mute button. To be decided later.
- **Story:** told in pictures, since the player cannot read.

After each stage the items in `AWS.md` and Cost Explorer are checked.

## 9. Decisions

| Decision | Reason |
|---|---|
| Name Kimallus, `kimallus.gerlitek.fi` | easy to say, remember and write, no Finnish special letters in the address |
| Lumens: collectable light orbs and the point unit | lumen (light) stays visible in the game |
| Vector art, no pixels | an own look that does not mix with the earlier game |
| Hearts hit grey clouds | shooting gets a purpose, an emotional skill: sad → happy |
| Canvas 2D without a game engine | light and explainable; an engine adds weight the game does not need |
| React for the stats page and the leaderboard, not the game (2026-11-26) | the DOM parts are ordinary UI, where components and hooks help; the game stays light. Also a React work sample |
| CDK in TypeScript, Lambda on Node.js | application and infrastructure in one language, the most widely used CDK language |
| Account baseline in Terraform, application in CDK (2026-11-24) | chicken and egg (the CI role before CDK), different lifecycles, CI cannot change its own permissions; a sample of both tools |
| Front first to the web host with rsync, then S3 + CloudFront (2026-11-23) | the game online at once without costs, the same proven model as in the zombie game; the AWS work does not delay publishing |
| Region `eu-north-1`, state bucket with SSE-S3, budget alerts on actual spend only (2026-11-26) | closest region; SSE-S3 is free where a KMS key costs 1 USD/month; forecast alerts at low amounts are mostly noise |

## 10. Open questions

- Figure play: in or out (amount of work).
