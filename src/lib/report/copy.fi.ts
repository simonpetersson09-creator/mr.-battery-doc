/** Finnish report copy. Same structure as the Swedish source text. */
import type { ReportCopy } from "./copy";

export const fi: ReportCopy = {
  title: "Akkuraportti",
  brand: "Mr. Battery Doc",
  created: "Luotu",
  perYear: "/v",
  reportIdLabel: "Raportin tunnus",
  pageLabel: "Sivu",
  ofLabel: "/",
  engineVersionLabel: "Laskentaversio",
  notAvailable: "Tieto puuttuu",
  cannotBeCalculated: "Ei voida laskea",
  before: "Ilman akkua",
  after: "Akun kanssa",
  tagline: "Fiksumpi tapa käyttää omaa aurinkosähköä",
  footerTagline: "Parempia päätöksiä valoisampaa tulevaisuutta varten",

  source: {
    user: "Oma tietosi",
    calculated: "Laskettu",
    default: "Oletusoletus",
    external: "Ulkoinen tietolähde",
  },

  searchLimit: {
    atLeastCapacity: "Vähintään {value}",
    atLeastPower: "Vähintään {value}",
    capacityNote:
      "Analyysin ylin kapasiteettiraja on saavutettu. Suurempi akku voi tuoda lisähyötyä.",
    powerNote:
      "Analyysin ylin tehoraja on saavutettu. Suuremman tehon järjestelmä voi vaatia erillisen analyysin.",
    bothNote:
      "Kiinteistö on analyysin ylimmällä mitoitusrajalla. Suuremmat järjestelmät tulisi mitoittaa laajemmalla teknisellä selvityksellä.",
  },

  summary: {
    title: "Yhteenveto",
    capacity: "Akkukapasiteetti",
    power: "Akkuteho",
    benefit: "Laskettu taloudellinen arvo, vuosi 1",
    maxInvestment: "Enimmäisinvestointi valitsemallasi takaisinmaksuajalla",
    improvements: "Näin kiinteistö paranee",
    selfConsumption: "Oma käyttö",
    selfSufficiency: "Omavaraisuus",
    gridImport: "Verkosta ostettu sähkö",
    peak: "Huipputeho",
    shifted: "siirrettyä aurinkosähköä",
    peakLower: "matalampi huippu",
    recommendedBattery: "Suositeltu akku",
    paybackLabel: "Valittu takaisinmaksuaika",
    valueSplit: "Näin taloudellinen arvo jakautuu",
    shiftedSolar: "Siirretty aurinkosähkö",
    ancillaryShareNote:
      "Lasketusta taloudellisesta arvosta {value} tulee tukipalveluista historiallisten markkinahintojen perusteella.",
    subtitle: "Suositeltu akku ja laskettu arvo kiinteistöllesi",
    improvementsSubtitle:
      "Akun ansiosta käytät enemmän omaa sähköäsi ja ostat vähemmän verkosta.",
    selfConsumptionHint: "Osuus aurinkosähköstä, joka käytetään suoraan kiinteistössä.",
    selfSufficiencyHint: "Osuus sähkönkäytöstä, joka katetaan omalla sähköllä.",
    gridImportHint: "Verkosta ostettu sähkö.",
    shiftedSolarHint:
      "Suurempi osa omasta aurinkotuotannosta käytetään kiinteistössä sen sijaan, että se syötettäisiin verkkoon.",
    percentagePoints: "prosenttiyksikköä",
    perYearLong: "vuodessa",
  },

  benefit: {
    title: "Mistä arvo muodostuu?",
    total: "Laskettu taloudellinen arvo, vuosi 1",
    energy: "Siirretty aurinkosähkö ja pienempi sähkön osto",
    energyHint:
      "Akku varastoi ylijäämätuotannon ja käyttää energian, kun kiinteistö tarvitsee sitä.",
    energyNoSolarHint:
      "Akku latautuu, kun sähkö on halvempaa, ja purkautuu, kun kiinteistö tarvitsee sähköä.",
    peak: "Huipputehon leikkaus",
    peakHint:
      "Akku voi leikata tehohuippuja ja siten pienentää kustannusta siellä, missä on tehomaksu.",
    ancillary: "Tukipalvelut",
    ancillaryHint:
      "Laskettu korvaus valitusta palvelusta historiallisten markkinahintojen ja laskennan oletusten perusteella.",
    none: "Laskenta ei osoita mitattavaa taloudellista hyötyä nykyisillä tiedoillasi.",
    note: "Laskenta kattaa vuoden 1. Raportti ei sisällä monivuotista ennustetta, koska laskenta ei mallinna tulevia hintoja tai akun heikkenemistä.",
    historicalBox: "Historiallinen laskenta – ei taattu tuleva tulo.",
    shareOfTotal: "kokonaisuudesta",
  },

  ancillary: {
    title: "Tukipalvelut",
    product: "Valittu palvelu",
    offered: "Tarjottu teho",
    reservable: "Fyysisesti varattavissa oleva teho (keskiarvo)",
    technicalTitle: "Tekninen perusta",
    technicalNote:
      "Fyysisesti varattavissa oleva teho on erillinen keskiarvomittari, ei se teho, jonka perusteella korvaus lasketaan.",
    held: "Ylläpidetty teho (keskiarvo)",
    monetized: "Laskettu korvattava teho",
    availability: "Käytettävyys",
    limiting: "Mikä rajoittaa akun kokoa",
    limitingPower: "Akkuteho",
    limitingEnergy: "Varastoitu energia / SOC",
    limitingGrid: "Verkkokapasiteetti",
    limitingNone: "Ei rajoitusta",
    reservedEnergy: "Varattu energia",
    reservedHours: "Tunnit varauksella",
    marketValue: "Laskettu markkina-arvo",
    share: "Sinun osuutesi markkina-arvosta",
    customerValue: "Laskettu korvaus sinulle",
    priceBasis: "Hintaperusta",
    priceBasisValue: "Historialliset markkinahinnat",
    nominalPower: "Akun nimellisteho",
    historicalWarning:
      "Historiallinen laskenta – ei taattu tuleva tulo. Todellinen korvaus riippuu muun muassa tulevista markkinahinnoista, käytettävyydestä, aggregaattorisopimuksista ja markkinasäännöistä.",
    noPriceData:
      "Tälle markkinalle ei voida laskea taloudellista arvoa, koska todennettua hintatietoa ei ole. Teho ja käytettävyys lasketaan, mutta tuloa ei raportoida.",
    note: "Osallistuminen edellyttää yleensä aggregaattoria, esikelpuutusta ja hyväksyttyä asennusta. Todellinen korvaus riippuu sopimuksesta, markkinapääsystä ja ehdoista.",
  },

  ancillaryScenario: {
    title: "Akkukokojen vertailu tukipalveluihin",
    intro:
      "Vakiomitoitus ei löydä akkutarvetta. Alla verrataan, miten eri akkukoot saisivat korvausta tukipalveluista.",
    notRecommendation: "Tämä on vertailuskenaario, ei suositeltu akkukoko.",
    technicalTitle: "Tekninen ehdotus",
    technicalHint:
      "Koko on valittu niin, että vähintään 95 % liittymällesi ja kulutusprofiilillesi lasketusta tukipalvelukapasiteetista voidaan hyödyntää. Kyseessä on tekninen ehdotus, ei väite kannattavimmasta akusta.",
    battery: "Akku",
    compensation: "Tukipalvelukorvaus",
    totalBenefit: "Laskettu kokonaishyöty",
    maxInvestment: "Enimmäisinvestointi valitulla takaisinmaksuajalla",
    maxInvestmentNone: "Ei voida laskea",
    note: "Laskenta perustuu historiallisiin korvaustasoihin. Todellinen korvaus, käytettävyys ja mahdollisuus osallistua tukipalveluihin riippuvat muun muassa markkinasta, aggregaattorista ja teknisistä vaatimuksista.",
  },

  ancillaryOnly: {
    summaryProposal: "Tekninen mitoitusehdotus",
    summaryBenefit: "Laskettu kokonaishyöty",
    summaryMaxInvestment: "Enimmäisinvestointi valitulla takaisinmaksuajalla",
    summaryExplanation:
      "Laskenta koskee akkua ilman aurinkosähköjärjestelmää. Tekninen mitoitusehdotus perustuu verkkoliittymään ja tukipalvelun teknisiin vaatimuksiin. Tämän jälkeen kulutuksesi avulla lasketaan, kuinka paljon reserviä voidaan pitää käytettävissä ja mikä on laskettu korvaus.",
    comparisonIntro:
      "Vertailu näyttää, miten akun energiakapasiteetti vaikuttaa laskettuun tukipalveluhyötyyn. Tekninen ehdotus perustuu palvelun vaatimuksiin ja verkkoliittymän rajoihin.",
    comparisonExplanation:
      "Tukipalveluista maksetaan pääosin sen tehon mukaan, joka voidaan pitää käytettävissä. Kun akussa on riittävästi energiakapasiteettia tuon tehon ylläpitoon, lisäkilowattitunnit eivät automaattisesti kasvata korvausta.",
    sizingProposal: "Tekninen mitoitusehdotus",
    sizingExplanation:
      "kW kertoo, kuinka paljon tehoa akku voi antaa. kWh kertoo, kuinka paljon energiaa se voi varastoida. Tukipalvelut edellyttävät riittävää energiakapasiteettia varatun tehon ylläpitoon palvelun teknisten vaatimusten mukaisesti. Kun vaatimus täyttyy, lisäkilowattitunnit eivät automaattisesti kasvata korvausta.",
    serviceCompensation: "Laskettu korvaus sinulle",
    servicePriceBasis: "Hintaperusta",
    servicePowerExplanation:
      "Akun nimellisteho ei ole automaattisesti sama kuin teho, joka voidaan pitää käytettävissä ja josta maksetaan korvaus. Laskenta huomioi akun, tukipalvelun ja verkkoliittymän tekniset rajat.",
    investmentExplanation:
      "Enimmäisinvestointi näyttää kokonaisinvestoinnin, joka vastaa valittua takaisinmaksuaikaa, jos laskettu ensimmäisen vuoden hyöty jatkuisi.",
    investmentNotAQuote:
      "Summa ei ole laskettu markkinahinta, tarjous eikä takuu tulevasta kannattavuudesta.",
    risks: [
      "todellinen sähkönkäyttö ja kulutusprofiili",
      "akun hyötysuhde",
      "akun heikkeneminen",
      "akun käytettävyys",
      "tukipalvelumarkkinan hinnat",
      "aggregaattorin ehdot ja mahdolliset maksut",
      "markkinapääsy ja esikelpuutus",
      "muutokset markkinasäännöissä",
      "sähköverkon rajoitukset",
    ],
    installer: [
      "Vahvista ehdotettu akkukapasiteetti.",
      "Vahvista ehdotettu akun ja invertterin teho.",
      "Tarkista pääsulake ja verkkoliittymä.",
      "Tarkista sallittu lataus- ja purkuteho.",
      "Tarkista verkkoyhtiön mahdolliset vaatimukset.",
      "Tarkista asennus ja sähkökeskus.",
      "Tarkista asennuspaikka ja paloturvallisuus.",
      "Tarkista takuut ja akun odotettu käyttöikä.",
      "Tarkista, että akku tukee valittua tukipalvelua.",
      "Tarkista aggregaattorin ja esikelpuutuksen vaatimukset.",
      "Tarkista aggregaattorin maksut ja tulonjako.",
      "Vertaa saatua tarjousta raportin enimmäisinvestointiin.",
    ],
    faq: [
      {
        q: "Mitä kW ja kWh tarkoittavat?",
        a: "kW kertoo, kuinka paljon tehoa akku voi antaa. kWh kertoo, kuinka paljon energiaa se voi varastoida.",
      },
      {
        q: "Miksi tätä akkukokoa suositellaan?",
        a: "Koko on tekninen mitoitusehdotus, joka perustuu verkkoliittymään ja tukipalvelun teknisiin vaatimuksiin. Tämän jälkeen kulutuksesi avulla lasketaan, kuinka paljon reserviä voidaan pitää käytettävissä ja mikä on laskettu korvaus.",
      },
      {
        q: "Miten tukipalvelukorvaus lasketaan?",
        a: "Se lasketaan käytettävissä pidettävästä tehosta, historiallisista markkinahinnoista ja laskennan käyttämästä asiakasosuudesta.",
      },
      {
        q: "Miksi akkuteho on suurempi kuin korvattava teho?",
        a: "Akun nimellistehoa rajoittavat käytännössä energiakapasiteetti, SOC, palvelun kestovaatimukset ja verkkoliittymän vapaa tila.",
      },
      {
        q: "Miksi suurempi akku ei aina kasvata korvausta?",
        a: "Kun akku pystyy ylläpitämään korvattavan tehon palvelun vaatiman ajan, lisäenergiakapasiteetti ei automaattisesti kasvata korvausta.",
      },
      {
        q: "Onko tukipalvelukorvaus taattu?",
        a: "Ei. Se perustuu historiallisiin hintoihin sekä oletuksiin käytettävyydestä, markkinapääsystä ja sopimusehdoista.",
      },
      {
        q: "Tarvitsenko aggregaattorin?",
        a: "Kotitalouden akku osallistuu yleensä aggregaattorin kautta, joka tavallisesti hoitaa markkinapääsyn, esikelpuutuksen ja selvityksen.",
      },
      {
        q: "Mitä enimmäisinvestointi tarkoittaa?",
        a: "Se on kokonaisinvestointi, joka vastaa valittua takaisinmaksuaikaa, jos laskettu ensimmäisen vuoden hyöty jatkuisi.",
      },
      {
        q: "Onko enimmäisinvestointi sama kuin akun markkinahinta?",
        a: "Ei. Enimmäisinvestointi ei ole laskettu markkinahinta eikä tarjous.",
      },
      {
        q: "Miksi asentajan tai aggregaattorin laskelma voi poiketa?",
        a: "Erilaiset oletukset teknisistä rajoista, hinnoista, käytettävyydestä, maksuista, asiakasosuudesta ja markkinaehdoista voivat antaa eri tuloksen.",
      },
      {
        q: "Onko raportti tarjous?",
        a: "Ei. Raportti on päätöksenteon tuki, ja sitä tulee täydentää tarjouksella, teknisellä tarkastuksella ja aggregaattorin ehdoilla.",
      },
    ],
  },

  sizing: {
    title: "Miksi tämä akku?",
    capacity: "Kapasiteetti",
    power: "Teho",
    cRate: "C-arvo",
    physicalNeed: "Fyysinen tehontarve",
    basePower: "Perusteho energianhallintaan",
    alternatives: "Simuloidut vaihtoehdot",
    lower: "Pienempi",
    yours: "Sinun akkusi",
    higher: "Suurempi",
    balance:
      "Keskimmäinen vaihtoehto on koko, jossa laskenta löytää parhaan tasapainon akun koon ja lasketun hyödyn välillä. Se ei ole väite siitä, että se olisi objektiivisesti paras kaikilta osin.",
    consumerExplanation:
      "Mr. Battery Doc simuloi useita akkukokoja kiinteistön kulutuksen, aurinkotuotannon ja valittujen käyttötapojen perusteella. Tässä tapauksessa suositeltu koko antaa hyvän tasapainon akun koon ja lasketun hyödyn välillä. Suurempi akku tuo vain rajallista lisähyötyä, joten sitä ei suositella.",
    recommendedLabel: "Suositeltu",
    powerTitle: "Akkuteho: {value}",
    powerAncillaryExplanation:
      "Noin {value} tarvitaan kiinteistön energianhallintaan. Korkeampi suositeltu teho mahdollistaa enemmän kapasiteettia valitulle tukipalvelulle.",
  },

  energy: {
    title: "Energiatase ilman akkua ja akun kanssa",
    load: "Vuosikulutus",
    pv: "Aurinkotuotanto",
    importBefore: "Verkosta ostettu ilman akkua",
    importAfter: "Verkosta ostettu akun kanssa",
    exportLabel: "Verkkoon syötetty",
    exportBefore: "Verkkoon syötetty ilman akkua",
    exportAfter: "Verkkoon syötetty akun kanssa",
    selfConsumptionBefore: "Oma käyttö ilman akkua",
    selfConsumptionAfter: "Oma käyttö akun kanssa",
    selfSufficiencyBefore: "Omavaraisuus ilman akkua",
    selfSufficiencyAfter: "Omavaraisuus akun kanssa",
    gridCharged: "Verkosta ladattu energia",
    shifted: "Siirretty aurinkosähkö",
    losses: "Akun häviöt",
    cycles: "Vastaavat täydet syklit vuodessa",
  },

  grid: {
    title: "Teho ja sähköverkko",
    fuse: "Pääsulake",
    connection: "Verkkoliittymä",
    theoretical: "Teoreettinen verkkokapasiteetti",
    peakBefore: "Suurin otto verkosta ilman akkua",
    peakAfter: "Suurin otto verkosta akun kanssa",
    reduction: "Huipputehon leikkaus",
    curtailed: "Estetty syöttö verkkoon",
    status: "Verkkoarvio",
    kwKwh:
      "kW on teho eli kuinka paljon akku voi ladata tai purkaa kerralla. kWh on energia eli kuinka paljon se voi varastoida.",
  },

  investment: {
    title: "Enimmäisinvestointi ja takaisinmaksuaika",
    selected: "Valittu takaisinmaksuaika",
    max: "Enimmäisinvestointi",
    scenarios: "Enimmäisinvestointi eri takaisinmaksuajoilla",
    yourChoice: "Sinun valintasi",
    explanation:
      "Enimmäisinvestointi ei ole laskettu markkinahinta eikä tarjous. Se näyttää investointitason, joka vastaa valitsemaasi takaisinmaksuaikaa laskennan tuottaman taloudellisen arvon perusteella.",
    notAQuote:
      "Summa ei ole laskettu markkinahinta eikä tarjous. Se seuraa vain lasketusta taloudellisesta arvosta ja valitsemastasi takaisinmaksuajasta.",
    unavailable:
      "Enimmäisinvestointia ei voida laskea, koska laskenta ei osoita positiivista taloudellista arvoa.",
    headline: "Vertailukohtasi tarjoukselle",
    paybackText:
      "Valitulla {years} takaisinmaksuajalla laskenta antaa noin {amount} enimmäisinvestoinnin.",
    ancillaryDependencyTitle: "Tukipalvelujen kanssa ja ilman",
    withAncillary: "Taloudellinen arvo valitun tukipalvelun kanssa",
    withoutAncillary: "Taloudellinen arvo ilman tukipalveluja",
    dependencyNote:
      "Vertailu näyttää, kuinka suuri osa laskennasta riippuu lasketusta tukipalvelukorvauksesta.",
  },

  assumptions: {
    title: "Antamasi tiedot ja laskennan oletukset",
    property: "Kiinteistö",
    battery: "Akku",
    economy: "Talous",
    ancillary: "Tukipalvelut",
    annualConsumption: "Vuosikulutus",
    solarProduction: "Aurinkotuotanto",
    consumptionProfile: "Kulutusprofiili",
    fuse: "Pääsulake",
    connection: "Liittymä",
    capacity: "Kapasiteetti",
    power: "Teho",
    efficiency: "Kokonaishyötysuhde",
    socWindow: "SOC-rajat",
    reserveSoc: "Varattu SOC",
    serviceSocUp: "Palvelun SOC, ylössäätö",
    serviceSocDown: "Palvelun SOC, alassäätö",
    maxCycles: "Enimmäismäärä syklejä vuodessa",
    importPrice: "Ostettu sähkö",
    exportPrice: "Myyty aurinkosähkö (spot-hinta)",
    demandCharge: "Tehomaksu",
    payback: "Valittu takaisinmaksuaika",
    market: "Valittu markkina",
    share: "Oletettu asiakasosuus",
    horizonNote:
      "Laskentajakso on yksi vuosi. Raportoituun hyötyyn ei sisälly akun heikkenemistä, hintakehitystä eikä diskonttokorkoa.",
  },

  risks: {
    title: "Mikä voi vaikuttaa lopputulokseen?",
    text: "Raportti on päätöksenteon tuki, ei takuu eikä tarjous. Todellinen lopputulos voi poiketa muun muassa seuraavista syistä:",
    items: [
      "todellinen sähkönkäyttö ja kulutusprofiili",
      "todellinen aurinkotuotanto",
      "sähkön hinnat ja siirtomaksut",
      "tehomaksut ja tariffimallit",
      "akun hyötysuhde ja heikkeneminen",
      "akun käytettävyys vuoden aikana",
      "tukipalvelumarkkinan hinnat ja ehdot",
      "aggregaattorin ehdot ja mahdolliset maksut",
      "markkinasäännöt ja verkon rajoitukset",
    ],
  },

  installer: {
    title: "Käytävä läpi asentajan kanssa",
    items: [
      "Vahvista, että ehdotettu akkukapasiteetti sopii kiinteistöön.",
      "Vahvista, että ehdotettu akun ja invertterin teho on teknisesti mahdollinen.",
      "Tarkista pääsulake ja verkkoliittymä verkkoyhtiön kanssa.",
      "Tarkista, vaatiiko asennus muutoksia sähkökeskukseen.",
      "Tarkista asennuspaikka, lämpötilavaatimukset ja paloturvallisuus.",
      "Tarkista takuut ja akun odotettu käyttöikä.",
      "Tarkista sallittu lataus- ja purkuteho.",
      "Tarkista yhteensopivuus nykyisen tai suunnitellun aurinkojärjestelmän kanssa.",
      "Tarkista tukipalvelujen, aggregaattorin ja esikelpuutuksen ehdot.",
      "Vertaa tarjouksen hintaa tämän raportin enimmäisinvestointiin.",
    ],
  },

  faq: {
    title: "Usein kysytyt kysymykset",
    items: [
      {
        q: "Mitä kW ja kWh tarkoittavat?",
        a: "kW on teho eli kuinka nopeasti akku voi latautua tai purkautua. kWh on energia eli kuinka paljon se voi varastoida.",
      },
      {
        q: "Miksi tätä akkukokoa suositellaan?",
        a: "Laskenta simuloi useita kokoja ja valitsee sen, jossa koon ja lasketun hyödyn tasapaino on paras antamillasi tiedoilla.",
      },
      {
        q: "Mitä oma käyttö tarkoittaa?",
        a: "Osuutta aurinkotuotannosta, joka käytetään kiinteistössä sen sijaan, että se syötettäisiin verkkoon.",
      },
      {
        q: "Mitä omavaraisuus tarkoittaa?",
        a: "Osuutta kiinteistön sähkönkäytöstä, joka katetaan omalla sähköllä ostetun sijaan.",
      },
      {
        q: "Mitä huipputehon leikkaus on?",
        a: "Akku leikkaa korkeimmat tehohuiput, mikä voi pienentää tehomaksua.",
      },
      {
        q: "Miten tukipalvelukorvaus lasketaan?",
        a: "Tehosta, jonka akku voi fyysisesti pitää käytettävissä, ja historiallisista markkinahinnoista, vähennettynä osuudella, joka ei tule sinulle.",
      },
      {
        q: "Onko tukipalvelutulo taattu?",
        a: "Ei. Se perustuu historiallisiin hintoihin sekä oletuksiin käytettävyydestä ja sopimusehdoista.",
      },
      {
        q: "Mitä enimmäisinvestointi tarkoittaa?",
        a: "Suunnilleen sitä, kuinka paljon akku saa maksaa, jotta valitsemasi takaisinmaksuaika toteutuisi lasketulla vuosihyödyllä.",
      },
      {
        q: "Onko enimmäisinvestointi sama kuin markkinahinta?",
        a: "Ei. Se ei kerro mitään akkujen hinnoista, vain siitä, mihin laskenta antaa katetta.",
      },
      {
        q: "Miksi asentajan laskelma voi poiketa?",
        a: "Erilaiset oletukset hinnoista, kulutusprofiilista, hyötysuhteesta, käytettävyydestä ja tukipalveluista antavat eri tuloksia.",
      },
      {
        q: "Onko raportti tarjous?",
        a: "Ei. Raportti on päätöksenteon tuki, ja sitä tulee täydentää tarjouksella ja paikan päällä tehtävällä arvioinnilla.",
      },
    ],
  },

  about: {
    pageTitle: "Tärkeää tietää",
    title: "Tietoa tästä raportista",
    items: [
      "Raportti on päätöksenteon tuki, ja sitä tulee täydentää tarjouksella ja paikan päällä tehtävällä arvioinnilla.",
      "Raportti ei ole tarjous eikä kerro, mitä akku maksaa markkinoilla.",
      "Tulos on laskelma antamiesi tietojen ja laskennan oletusten perusteella, ei takuu.",
      "Laskenta kattaa vuoden 1.",
      "Laskennassa ei ole mukana tulevaa hintakehitystä.",
      "Laskennassa ei ole mukana akun tulevaa heikkenemistä.",
    ],
  },

  terms: {
    kwKwh:
      "kW on teho eli kuinka paljon akku voi ladata tai purkaa kerralla. kWh on energia eli kuinka paljon se voi varastoida.",
    selfConsumption:
      "Oma käyttö on se osuus aurinkotuotannosta, joka käytetään kiinteistössä sen sijaan, että se syötettäisiin verkkoon.",
    selfSufficiency:
      "Omavaraisuus on se osuus kiinteistön sähkönkäytöstä, joka katetaan omalla sähköllä ostetun sähkön sijaan.",
    peakShaving:
      "Huipputehon leikkaus tarkoittaa, että akku leikkaa korkeimmat tehohuiput, mikä voi pienentää tehomaksua.",
  },
};
