# Kimallus

[![web](https://github.com/Gerlitek/kimallus-peli/actions/workflows/web.yml/badge.svg)](https://github.com/Gerlitek/kimallus-peli/actions/workflows/web.yml)

> **In English:** *Kimallus* ("sparkle" in Finnish) is a small, very pink browser game: a cat rides a unicorn through a sparkly galaxy, jumping over diamonds and rainbows. Vector art drawn in code (Canvas 2D, no game engine), TypeScript, hosted on AWS (CDK). Docs are in Finnish; code and commits in English. *Work in progress: playable locally, AWS deployment coming.*

**Tila:** kehityksessä. Peli toimii paikallisesti (`npm run dev`). AWS-julkaisu osoitteeseen kimallus.gerlitek.fi tulee myöhemmin.

Söpö selainpeli: kissa ratsastaa yksisarvisella pinkissä tähtimaailmassa ja hyppii timanttien ja sateenkaarten yli.

## Kehitys

```bash
npm install
npm run dev     # peli osoitteessa http://localhost:5173
npm test        # Vitest
npm run build
```

Ohjaus: välilyönti, nuoli ylös, hiiri tai napautus. Pidä pohjassa, niin hyppy on korkeampi.

## Dokumentit

- `docs/architecture.md`: arkkitehtuuri ja päätökset
- `kustannukset.md`: kustannussuunnitelma
- `AWS.md`: tarkistuslista AWS-työhön

## Rakenne

| Kansio | Sisältö |
|---|---|
| `web/` | Peli: Vite, TypeScript, Canvas 2D |
| `api/` | Pisteiden API: yksi Lambda-käsittelijä, DynamoDB |
| `shared/` | Frontin ja API:n yhteinen koodi: sanalistat, validointi |
| `docs/` | Dokumentit |
| `.github/workflows/` | CI: testit ja build jokaisesta pushista |
