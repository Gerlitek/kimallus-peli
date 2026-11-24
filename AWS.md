# AWS-suunnitelma ja tarkistuslista

Rastita kohdat työn edetessä. Kustannukset: `kustannukset.md`.

## 0. Ennen kuin mitään tehdään
- [ ] Root-tilille MFA, rootia ei käytetä arkeen
- [ ] Oma käyttäjä työskentelyyn (IAM Identity Center tai IAM)
- [ ] Budgets: hälytykset 2 $, 4 $ ja 6 $ (toteuma ja ennuste)
- [ ] Cost Anomaly Detection päälle
- [ ] Kalenterimuistutus: Free planin loppu (6 kk tilin luonnista). Päivitä Paid planiin ajoissa, muuten tili suljetaan.
- [ ] Päivityksen päivämäärä: ______

## 1. Alue ja rakenne
- [ ] Valittu yksi region (esim. `eu-north-1`): ______
- [ ] Tarkistettu, että käytetyt palvelut ovat regionissa
- [ ] CloudFront-varmenne (ACM) `us-east-1`:ssä, jos oma domain
- [ ] Domain: CloudFrontin oma osoite vai oma (Route 53 maksaa 0,50 $/kk)

## 2. Terraform, CDK ja julkaisu
- [ ] Terraform-pohja (`infra-bootstrap/`): state-ämpäri, budjetti, OIDC; `terraform plan` tarkistettu ennen `apply`ta
- [ ] State siirretty S3:een (`-migrate-state`), ei `*.tfstate`-tiedostoja repossa
- [ ] `cdk bootstrap` tehty (tarkista, ettei tuota kuluja)
- [ ] GitHub Actions OIDC, IAM-rooli rajattu omaan repoon ja haaraan
- [ ] Deploy-rooli voi vain ottaa käyttöön CDK:n `cdk-*`-roolit
- [ ] Julkaisuroolilla ei pysyvää `AdministratorAccess`ia
- [ ] `cdk diff` ennen jokaista deployta
- [ ] Kokeilupinot poistetaan (`cdk destroy`)
- [ ] CDK-pinon testit (`assertions`) ja Lambda-testit (Vitest)

## 3. Turvallisuus (koodi on julkista)
- [ ] Ei avaimia, tilin ID:tä eikä `cdk.context.json`-tiedostoa repossa
- [ ] S3 Block Public Access päällä, jakelu CloudFrontin kautta (OAC)
- [ ] API:n CORS rajattu pelin osoitteeseen
- [ ] Throttling ja Lambdan reserved concurrency (esim. 5)
- [ ] Syötteen validointi palvelimella (pituus, merkit, pistemäärän järkevyys)
- [ ] Vähimmäisoikeudet Lambdan rooleissa (vain tarvittava taulu ja ämpäri)

## 4. Yksityisyys (lasten peli)
- [ ] Ei henkilötietoja: nimimerkit valmiista sanalistoista, ei vapaata tekstiä
- [ ] Ei lasten nimiä koodissa, dokumenteissa, commit-viesteissä tai tiedostonimissä
- [ ] `private/` gitignoressa ennen ensimmäistä committia
- [ ] Commit-tekijänä GitHubin noreply-osoite (`git config user.email`)
- [ ] Ei IP-osoitteiden tai evästeiden tallennusta ilman tarvetta
- [ ] Lokien säilytys 7 vrk
- [ ] Lyhyt tietosuojaseloste

## 5. Kustannusvartijat
- [ ] Ei NAT Gatewayta eikä VPC:tä Lambdalle
- [ ] DynamoDB provisioitu Standard (25 WCU / 25 RCU), ei on-demand
- [ ] Ei EC2:ta, RDS:ää, ELB:tä, X-Raytä eikä WAF:ia
- [ ] S3-elinkaarisääntö raw-datalle (30 vrk)
- [ ] Cost Explorer tarkistettu viikon kuluttua ensimmäisestä deploystä
- [ ] Kuukausitarkistus: lasku vs. arvio (tavoite alle 6 $)

## 6. Dokumentaatio
- [ ] README: arkkitehtuurikuva, kustannusarvio, perustelut
- [ ] `docs/aws-vs-azure.md`: vertailu zombipeliin
- [ ] Julkaisu GitHub Actionsilla, badge READMEen

## Vaiheet
1. **Tili ja suojat:** kohta 0.
2. **Runko:** Terraform-pohja (budjetti, OIDC), `cdk bootstrap`, CDK-pinon alku (S3, CloudFront), OIDC-julkaisu.
3. **Staattinen peli verkossa:** kohdat 3 ja 5 tarkistetaan.
4. **API (jos tarvitaan):** Lambda, DynamoDB, throttling, validointi.
5. **Yöajo ja data (vapaaehtoinen):** EventBridge, S3 raw → curated.
6. **Viimeistely:** dokumentit, yksityisyystarkistus, kustannusten tarkistus.

## Päätökset
| Päivä | Päätös | Syy |
|---|---|---|
| | CDK TypeScriptillä, Lambda TS | Yksi kieli, nopea käynnistys, tunnetuin CDK-kieli |
| | Vektorigrafiikka, omat hahmot | Ei sekoitu zombipelin pikselityyliin |
| 2026-11-23 | Front ensin gerlitekin webhotelliin (rsync), AWS myöhemmin | Peli verkkoon heti ilman kuluja, sama malli kuin zombipelissä |
| 2026-11-24 | Tilin pohja Terraformilla, sovellus CDK:lla | CI:n rooli tarvitaan ennen CDK:ta, eri elinkaari, CI ei voi muuttaa omia oikeuksiaan |
