# Kimallus: kustannussuunnitelma (alustava)

## Tavoite
- Pyörii AWS:ssä yli 6 kk, kulut muutamia dollareita kuussa.
- Budjettiraja 6 $/kk. Hälytykset 2 $, 4 $ ja 6 $ (toteuma ja ennuste).
- Budjetti ilmoittaa vain, joten kulut estetään rakenteella.

## Arkkitehtuuri (serverless)
| Osa | Palvelu | Kustannus |
|---|---|---|
| Pelin jakelu | S3 + CloudFront | CloudFront aina ilmainen (1 Tt, 10 milj. pyyntöä). S3 senttejä. |
| API | Lambda + Function URL tai HTTP API | Lambda 1 milj. pyyntöä/kk ilmaiseksi |
| Pisteet | DynamoDB, provisioitu Standard (25 WCU / 25 RCU) | Aina ilmainen raja |
| Tapahtumat | S3, poisto 30 vrk | Senttejä |
| Ajastus | EventBridge Scheduler | Ilmainen pienellä käytöllä |
| Koodina | AWS CDK (TypeScript) | Ilmainen |
| Julkaisu | GitHub Actions + OIDC | Ilmainen, ei avaimia |

## Teknologiavalinnat
- **Infra:** CDK TypeScriptillä (zombipelissä Bicep). Erottuu pilvellä, ei kielellä.
- **API:** Lambda TypeScriptillä, paketointi esbuildilla. Kylmäkäynnistys nopea.
- **Frontti:** vektorigrafiikka (SVG tai canvas), ei pikseligrafiikkaa. Phaser/Pixi vain jos tarvitaan pelisilmukka.
- **Tyyli:** omat hahmot, pehmeitä ja vapaamuotoisia (Bézier-polut, blob-muodot), ei tiukkaa geometriaa. Pyöristetyt kulmat, pomppiva liike, kimallus.
- **Testit:** Vitest, ja CDK-pinon testit (`assertions`).

## Kustannusarvio puolen vuoden jälkeen
- Todennäköisesti senttejä, enintään pari dollaria kuussa.
- Arvio ei ole mitattu. Tarkista AWS:n hintalaskurilla ja Cost Explorerista.

## Vältettävät kulut
- NAT Gateway ja VPC Lambdalle (noin 30 $/kk).
- DynamoDB on-demand (ei ilmainen).
- EC2, RDS ja ELB (maksavat tasaisesti).
- Route 53 -hosted zone (0,50 $/kk).
- X-Ray ja runsas CloudWatch-lokitus (säilytys 7 vrk).
- Unohtuneet kokeilu-resurssit.

## Suojat
- Lambda reserved concurrency (esim. 5).
- API:n throttling (pieni rate ja burst).
- Pieni DynamoDB-kapasiteetti toimii kattona.
- S3-elinkaarisääntö raw-datalle.
- Cost Explorer viikoittain.

## Aikajana
- **Kk 0–6:** Free plan, krediitit. Aseta Budgets heti.
- **Ennen kuun 6 loppua:** päivitys Paid planiin (muuten tili suljetaan). Vaatii maksukortin.
- **Kk 6 eteenpäin:** aina ilmaiset rajat pysyvät, loput senttejä.

## Auki
- Tarvitaanko pisteet ja tilastot, vai riittääkö staattinen peli? Staattinen on lähes ilmainen.

## Julkinen koodi: yksityisyys
- Ei lasten nimiä koodissa, kommenteissa, dokumenteissa, commit-viesteissä eikä tiedostonimissä.
- `private/` gitignoreen ennen ensimmäistä committia.
- Commit-tekijänä GitHubin noreply-osoite.
- Ei lasten piirustuksia tai kuvia repoon.
- Ei AWS-tilin ID:tä, ARN:eja eikä `cdk.context.json`-tiedostoa repoon.
