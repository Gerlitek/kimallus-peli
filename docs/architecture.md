# Arkkitehtuuri ja päätökset

**Kimallus**: pieni selainpeli AWS:ssä, osoitteessa `kimallus.gerlitek.fi`. Tavoite: luettava, halpa ja koodina kuvattu kokonaisuus, jonka jokaisen ratkaisun voi perustella. Kustannukset: `kustannukset.md`. Tarkistuslista: `AWS.md`.

Kova vaatimus: kulut muutamia dollareita kuussa myös Free planin jälkeen (budjettiraja 6 $). Jokainen uusi resurssi arvioidaan tätä vasten ennen kuin se lisätään.

## 1. Kokonaiskuva

```
Selain
  │  https://kimallus.gerlitek.fi       (staattinen front: Vite + TypeScript + Canvas 2D)
  ▼
CloudFront ─────────────────────────────────────────────────────────────┐
  │  /*            ──► S3  web/        pelin tiedostot (yksityinen, OAC)  │
  │  /stats.json   ──► S3  public/     yöajon yhteenveto                  │
  │  /api/*        ──► Lambda Function URL (OAC, ei suoraa pääsyä)        │
  │                      POST /api/scores     ──► DynamoDB  (pisteet)     │
  │                      GET  /api/leaderboard ◄── DynamoDB               │
  │                      POST /api/events     ──► S3  raw/  (NDJSON, 30 vrk)
  ▼                                                                       │
EventBridge Scheduler, kerran vuorokaudessa                               │
  └─► Lambda curate:  raw/ ──► public/stats.json ─────────────────────────┘

GitHub Actions ──(OIDC, ei avaimia)──► AWS     CDK-pinot ja koodi
Omistaja ──(käsin, kerran)───────────► tili    bootstrap, budjetti, OIDC-rooli
```

Kaikki kulkee yhden CloudFront-jakelun kautta. Silloin front ja API ovat samassa osoitteessa, CORSia ei tarvita, eikä Lambdaa tai S3:a voi kutsua suoraan ohi CloudFrontin.

Versio 1 on pelkkä staattinen front (S3 + CloudFront). API ja yöajo tulevat myöhemmin.

## 2. Front

### Valinnat
- **Vite + TypeScript, Canvas 2D, oma pieni pelisilmukka.** Ei pelimoottoria. Peli on yhden napin juoksupeli ja muutama rauhallinen minipeli, joihin moottori olisi raskas.
- **Vektorigrafiikka koodilla:** hahmot piirretään `Path2D`:llä Bézier-käyrinä. Ei kuvatiedostoja eikä pikseligrafiikkaa.
- **Squash and stretch** canvasin muunnoksilla (`scale`, `rotate`): hyppy venyttää, lasku litistää.
- **Valikot, nimimerkki ja tarinatekstit DOMissa.** Teksti pysyy terävänä, saavutettavana ja helposti käännettävänä.
- **Ohjaus:** välilyönti ja hiiri pöytäkoneella, napautus kosketusnäytöllä.

### Rakenne
```
web/
  index.html            aloitussivu: logo, ohjeet, peli, tekijätiedot, tilastot- ja lähdekoodilinkit, tietosuoja
  tilastot/index.html   tilastosivu (lukee stats.json:n)
  src/
    main.ts             käynnistys, pelisilmukka (requestAnimationFrame, kiinteä aika-askel)
    art/                palette.ts, shapes.ts (blob, sydän, tähti), cat.ts, unicorn.ts, props.ts
    data/               obstacles.ts, stations.ts, emotions.ts, story.ts, nicknames.ts
    logic/              physics.ts, collision.ts, spawn.ts, score.ts, nickname.ts
    systems/            input.ts, particles.ts (kimallus, sydänpilvet), audio.ts, telemetry.ts, storage.ts
    scenes/             Menu, Ride, Station, Story, End
```

Kolme sääntöä pitävät koodin selitettävänä:

1. **Sisältö on dataa.** Este, piste (station), tunnehetki ja tarinalause ovat rivejä `data/`-kansiossa. Uusi este ei vaadi uutta koodia.
2. **Säännöt ovat puhtaita funktioita.** `logic/` ei koske canvasiin. Satunnaisuus tulee parametrina, joten säännöt testataan Vitestillä ilman selainta.
3. **Kohtaus on rajapinta.** Jokaisella kohtauksella on `enter`, `update(dt)`, `draw(ctx)` ja `exit`. Pelisilmukka ei tiedä, mikä kohtaus on käynnissä.

### Kohtaukset
| Kohtaus | Sisältö |
|---|---|
| Menu | nimimerkin arvonta, aloitus |
| Ride | juoksupeli: yksisarvinen hyppii esteiden yli, kissa ampuu hännästä sydämiä, kuppikakut keräillään |
| Station | rauhallinen minipeli ratsastuksen päällä, ratsastus pysähtyy. Tehty: kynsien lakkaus (7 lakkaa, myös metalli- ja kimallelakat; 5 pistettä per kynsi, 10 bonusta kaikista neljästä). Tulossa: harja ja klipsit, sydänsipsit, figuurit jos aikaa |
| Story | tarinalauseet nousevat pilvissä ylöspäin; tunnehetket (esim. jakaminen) |
| End | tulos, pistetaulukko |

### Esteet
| Este | Mekaniikka |
|---|---|
| Timantti | lyhyt hyppy |
| Timanttijoki | matala mutta pitkä, hitaalla nopeudella vaatii pidon |
| Sateenkaaripuomi pilvien päällä | korkea hyppy, vaatii pidon |
| "Syömään!"-äiti | kukkamekko ja ruskeat kiharat, vilkuttaa ja pitää ruokakulhoa (kuplassa kulho). Lyhyt hyppy oikeaan aikaan; ohituksen jälkeen kissasta pöllähtää sydämiä |

Jokaisen esteen hyppytyyppi (`jump: 'tap' | 'hold'`) on datassa, ja testi varmistaa, että este ylittyy luvatulla hypyllä sekä hitaimmalla että suurimmalla nopeudella 25 % pelivaralla, koska lapsen ajoitus ei ole täydellinen.

Tunnehetki (`scenes/share-moment.ts`): kuuden kerätyn kuppikakun jälkeen radalle tulee iso hehkuva erikoiskuppikakku nuolen kanssa, kuten kynsilakkapullo. Siihen juoksemalla pääsee jakamaan, yli hyppäämällä sen ohittaa (tulee myöhemmin uudelleen). Kissalla on lautasella kaksi kuppikakkua, tähtiystävän lautanen on tyhjä ja sen ajatuskuplassa on kuppikakku. Kissan kasvot ja tunnepilvi ovat surulliset, nuoli kehottaa antamaan. Napautuksella toinen kuppikakku lentää kaarena ystävän lautaselle, molemmat syövät kolmella haukulla ja ilahtuvat (+15 kimallusta). Tarkoituksella rauhallinen: ei taustavälkkeitä eikä räjähdyksiä. Kerran pelikerrassa.

Kynsien lakkaus: valmiin kavion jälkeen yksisarvinen pomppaa ja kavioon ilmestyy sydän- tai tähtitarra. Kun kaikki neljä on lakattu, yksisarvinen tanssii ja kimallusta sataa.

Aloitus ja jatkaminen: ei kehotekuvia. Aloitusnäkymässä yksisarvinen pomppii, ja peli alkaa mistä tahansa painalluksesta. Tunnehetket jatkuvat itsestään. Aikuisten vihje pienenä pelialueen alareunassa.

Sydämet: kissa ampuu hännästä sydämiä (X, hiiren oikea tai kosketusnäytön sydännappi) viistosti ylös. Taivaalla leijuu surullisia harmaita pilviä. Osuma muuttaa pilven iloiseksi (hymy, sydänsilmät, halaus tai tähtisilmät), ja se leijuu pois. Säännöt `logic/hearts.ts`.

Kuppikakut: kaarena esteen yllä (kerätään hyppäämällä yli) tai rivinä maassa. Päällä vuorotellen sydän tai tähti. Säännöt `logic/cupcakes.ts`.

### Kuvat ensin
Pelaajat ovat pieniä lapsia, jotka eivät vielä lue. Pelin sisällä asiat kerrotaan ilmeillä ja kuvilla: surullinen ja iloinen kasvo, ajatuskupla, nuoli, iso ▶-nappi, ruokakulho. Tekstiä on vain aloitussivun ohjeissa vanhemmille ja pienenä vihjeenä korteissa.

### Rauhallinen ja turvallinen
Pieni lapsi pelaa: ruudulla tapahtuu vähän kerrallaan. Ei nopeaa välkkymistä, kaikki kirkkauden muutokset ovat hitaita. Teema näkyy silti: pulleat pastellitähdet, pehmeästi tuikkivat kimallukset ja vähän hiljaa leijuvaa glitteriä. Esteiden väli 1,6–2,6 s, pilviä 5–8 s välein, valopalloja enintään 3 kerrallaan. Ei kehotteita painaa: peli alkaa mistä tahansa painalluksesta, ja tunnehetket jatkuvat itsestään.

### Kimallus (pisteet)
Pisteitä kutsutaan tekstissä kimallukseksi ("+15 kimallusta"). Pelissä ne näkyvät hehkuvina valopalloina (koodissa lumen, valon yksikkö), jotka lentävät laskuriin, ja laskurin kuvake sykähtää. Sana lumen ei näy pelaajalle ilman selitystä.

| Lähde | Kimallusta |
|---|---|
| Matka | 1 per 200 px (noin 2 sekunnissa) |
| Kuppikakku | 5 |
| Iloinen pilvi | 10 |
| Kynsien lakkaus | 5 per kynsi, 10 bonusta kaikista |

Miljöö: pinkki, kimalteleva tähtimaailma ja asteroidit. Termi *stellar* (loistava, tähtien) vilahtaa pelissä esim. asteroidikentän tai saavutuksen nimenä.

### Nimimerkit
Pitkät söpöt nimet yhdistellään sanalistoista (sydän, tähti, yksisarvinen, sateenkaari …). Nimi tallennetaan **sanalistojen indekseinä**, ei vapaana tekstinä. Palvelin hyväksyy vain kelvolliset indeksit, joten julkiseen tauluun ei voi kirjoittaa mitä tahansa. Sanalistat ovat jaetussa `shared/`-paketissa.

### Tila selaimessa
- `localStorage`: nimimerkki (indekseinä), omat parhaat, ääniasetus. Luku ja kirjoitus `try/catch`issa.
- `sessionStorage`: satunnainen istuntotunniste (`crypto.randomUUID()`).
- Ei evästeitä, ei kolmannen osapuolen skriptejä, ei ulkoisia fontteja.

Peli ei koskaan odota verkkoa. Jos API ei vastaa, peli jatkuu ja taulu näyttää paikalliset tulokset.

## 3. API

Yksi Lambda (Node.js, TypeScript), paketointi CDK:n `NodejsFunction`illa (esbuild). Reititys yhdessä käsittelijässä, logiikka puhtaina funktioina `api/src/logic/`.

| Reitti | Tehtävä | Rajat |
|---|---|---|
| `POST /api/scores` | tuloksen tallennus | yksi tulos per istunto, pistemäärän järkevyystarkistus |
| `GET /api/leaderboard` | 20 parasta | CloudFront-välimuisti 60 s |
| `POST /api/events` | tapahtumaerä raw-kerrokseen | enintään 50 tapahtumaa ja 16 kt |

**Lambda Function URL CloudFrontin takana (OAC)**, ei API Gatewayta: Function URL on ilmainen, eikä HTTP API:n ilmaisosuus jatku 12 kk:n jälkeen.

### Kulusuojat
- Lambdan reserved concurrency 5.
- Vuorokausikatot DynamoDB-laskurilla: kirjoitukset ja pyynnöt, ylitys palauttaa 429.
- Syötteen validointi: koko, kentät, indeksit, pistemäärän yläraja.

## 4. Data

| Säilö | Sisältö | Elinkaari |
|---|---|---|
| DynamoDB, yksi taulu, provisioitu Standard (5 RCU / 5 WCU) | pisteet, vuorokausilaskurit | pisteet pysyvät, laskurit TTL:llä |
| S3 `raw/` | tapahtumat NDJSON:na, `raw/yyyy/mm/dd/` | poisto 30 vrk |
| S3 `public/stats.json` | yöajon yhteenveto tilastosivulle | korvataan joka yö |

Yöajo (EventBridge Scheduler → Lambda) lukee edellisen päivän raw-tiedostot ja päivittää `stats.json`:n. Tilastosivu lukee sen suoraan CloudFrontista ilman Lambdaa.

Tapahtumat eivät sisällä henkilötietoja: istuntotunniste, tapahtuman tyyppi, aika ja pelin arvot. IP-osoitteita ei tallenneta.

## 5. Infra koodina (CDK, TypeScript)

```
infra/
  bin/app.ts
  lib/
    bootstrap-stack.ts    GitHub OIDC -rooli, budjetti, hälytykset   (deploy käsin kerran)
    cert-stack.ts         ACM-varmenne us-east-1:ssä                (vain jos oma domain)
    web-stack.ts          S3, CloudFront, OAC
    api-stack.ts          Lambda, Function URL, DynamoDB, raw-ämpäri
    jobs-stack.ts         EventBridge Scheduler, curate-Lambda
  test/                   pinojen testit (aws-cdk-lib/assertions)
```

- Tilin ID ja region ympäristömuuttujista, ei koodissa. `cdk.context.json` ei ole repossa.
- Jokaisessa resurssissa tagi `project=kimallus`, jotta kulut näkyvät Cost Explorerissa.
- Lokien säilytys 7 vrk kaikilla Lambdoilla.
- Testit varmistavat kulusuojat: ei NAT Gatewayta, DynamoDB ei on-demand, S3 Block Public Access päällä, Lambdan concurrency rajattu.

### Domain
`kimallus.gerlitek.fi`. DNS pysyy nykyisellä palveluntarjoajalla: CNAME CloudFrontiin ja ACM:n DNS-validointi käsin. Ei Route 53:a.

## 6. CI/CD (GitHub Actions)

| Työnkulku | Vaiheet |
|---|---|
| `web.yml` | lint, test, build |
| `api.yml` | lint, test |
| `infra.yml` | `cdk synth`, testit, PR:ssä `cdk diff`, mainissa deploy hyväksynnän takana (GitHub Environment) |

Kirjautuminen AWS:ään OIDC:llä. Rooli luottaa vain tämän repon `main`-haaraan ja `production`-ympäristöön.

Käytännöt zombipelin mallin mukaan:
- Push ja pull request vain testaavat ja buildaavat. Deploy käynnistetään käsin (`workflow_dispatch`) `main`ista ja hyväksytään GitHubin ympäristössä `production`.
- Actionit lukitaan commit-SHA:han, ei tagiin.
- Käynnissä olevaa deployta ei peruta (`concurrency`).
- Tilitason asiat (bootstrap, budjetti, OIDC-rooli) omistaja deployaa käsin.

## 7. Repo

```
web/        peli ja tilastosivu
api/        Lambda-käsittelijät ja logiikka
shared/     tyypit, sanalistat, validointi (frontti ja API)
infra/      CDK
docs/       dokumentit
private/    ei repossa (.gitignore)
```

npm workspaces, yksi `package.json` juuressa.

## 8. Vaiheet

1. **Paikallinen peli:** Ride-kohtaus, yksisarvinen, kissa, kaksi estettä. Ei AWS:ää.
2. **Verkkoon:** bootstrap-pino, web-pino, CI. Peli julkisesti CloudFrontissa.
3. **Sisältö:** loput esteet, kuppikakut, sydänpilvet, yksi Station, tarinalauseet.
4. **API:** pisteet ja pistetaulukko, kulusuojat.
5. **Data:** tapahtumat, yöajo, tilastosivu.
6. **Viimeistely:** loput Stationit, tunnehetket, äänet, README ja `docs/aws-vs-azure.md`.

Jokaisen vaiheen jälkeen tarkistetaan `AWS.md`:n kohdat ja Cost Explorer.

## 9. Päätökset

| Päätös | Syy |
|---|---|
| Nimi Kimallus, `kimallus.gerlitek.fi` | helppo sanoa, muistaa ja kirjoittaa, ei ääkkösiä osoitteessa |
| Lumenit: kerättävät valopallot ja pisteyksikkö | Lumen (valo) pysyy pelissä esillä |
| Vektorigrafiikka, ei pikseleitä | oma ilme, ei sekoitu aiempaan peliin |
| Sydämet osuvat harmaisiin pilviin | ampumiselle tavoite, tunnetaito: suru → ilo |
| Canvas 2D ilman pelimoottoria | pieni peli, kevyt ja selitettävä |
| CDK TypeScript, Lambda Node.js | yksi kieli, tunnetuin CDK-kieli |

## 10. Avoimet kysymykset

- Figuurileikki: mukaan vai pois (työmäärä).
