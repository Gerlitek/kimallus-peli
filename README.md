# Kimallus

[![web](https://github.com/Gerlitek/kimallus-peli/actions/workflows/web.yml/badge.svg)](https://github.com/Gerlitek/kimallus-peli/actions/workflows/web.yml)

> **Suomeksi:** Kimallus on pinkki selainpeli leikki-ikäisille: kissa ratsastaa yksisarvisella tähtimaailmassa ja hyppii timanttien ja sateenkaarten yli. TypeScript, Canvas 2D ja React, julkaisu AWS:ään (Terraform, CDK). Pelattavissa osoitteessa [kimallus.gerlitek.fi](https://kimallus.gerlitek.fi).

*Kimallus* ("sparkle") is a very pink browser game for young children: a cat rides a unicorn through a sparkly star world, jumping over gems and rainbows. Vector art drawn in code (Canvas 2D, no game engine), TypeScript, React for the stats page and the leaderboard. The game is in Finnish; inside the game everything is told with pictures, since the players cannot read yet.

**Status:** live at [kimallus.gerlitek.fi](https://kimallus.gerlitek.fi), served from an interim web host. In development: the AWS part (Terraform baseline, CDK app on S3, CloudFront, Lambda and DynamoDB) is not deployed yet, and the score API runs locally against DynamoDB Local until then.

## Development

```bash
npm install
npm run dev     # game at http://localhost:5173
npm test        # Vitest
npm run build
```

The leaderboard locally (Docker), in three terminals:

```bash
npm run db          # DynamoDB Local, empty on every start
npm run dev:api     # API at http://localhost:3001, creates the table
npm run dev:online  # game, /api forwarded to the local API
```

Example data: add `?demo` to the address of the game or the stats page (`/tilastot/?demo`).

Controls: space, arrow up, mouse or tap. Hold for a higher jump.

## Documents

- `docs/architecture.md`: architecture and decisions
- `costs.md`: cost plan
- `AWS.md`: checklist for the AWS work

## Structure

| Folder | Content |
|---|---|
| `web/` | The game (Vite, TypeScript, Canvas 2D) and the stats page (React) |
| `api/` | Score API: one Lambda handler, DynamoDB |
| `shared/` | Code shared by the front and the API: word lists, validation |
| `docs/` | Documents |
| `.github/workflows/` | CI: tests and build on every push; deploy started by hand and approved |
