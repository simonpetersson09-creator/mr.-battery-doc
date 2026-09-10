/** Suomi */
export const fi = {
  common: {
    appName: "Mr. Battery Doc",
    back: "Takaisin",
    next: "Seuraava",
    done: "Valmis",
    cancel: "Peruuta",
    restart: "Aloita alusta",
    step: "Vaihe {{current}} / {{total}}",
  },
  language: {
    title: "Kieli",
    description: "Kieli vaihtaa vain sovelluksen tekstit — ei maata, valuuttaa tai laskentaa.",
  },
  countries: {
    SE: "Ruotsi",
    NO: "Norja",
    FI: "Suomi",
    DK: "Tanska",
    DE: "Saksa",
  },
  marketAreas: {
    DK1: "DK1 – Länsi-Tanska",
    DK2: "DK2 – Itä-Tanska",
  },
  reserveProduct: {
    FCR: "FCR",
    FCR_D_UP: "FCR-D ylös",
    generic: "reservipalvelut",
  },
  units: {
    perYear: "/v",
    perYearShort: "kr/v",
    kwhPerYear: "kWh/v",
    perKwh: "{{currency}}/kWh",
    perKwMonth: "{{currency}}/kW/kk",
    phases: "{{count}}-vaiheinen",
  },
  months: {
    short: {
      "0": "Tam",
      "1": "Hel",
      "2": "Maa",
      "3": "Huh",
      "4": "Tou",
      "5": "Kes",
      "6": "Hei",
      "7": "Elo",
      "8": "Syy",
      "9": "Lok",
      "10": "Mar",
      "11": "Jou",
    },
  },
  intro: {
    lead: "Vastaa muutamaan yksinkertaiseen kysymykseen kiinteistöstäsi, niin autamme löytämään sopivan akkukoon.",
    points: {
      capacity: {
        title: "Suositeltu akun koko ja teho",
        desc: "Kuinka monta kWh ja kW sopivat kiinteistöösi.",
      },
      usage: {
        title: "Miten akkua voidaan käyttää",
        desc: "Oma kulutus, vähentynyt verkkotuonti, huippukuormituksen tasaus ja järjestelmäpalvelut.",
      },
      economy: {
        title: "Arvioitu taloudellinen hyöty",
        desc: "Mitä akku voi tuottaa vuotuisena asiakashyötynä.",
      },
      investment: {
        title: "Kohtuulliset investointikustannukset",
        desc: "Mitä akku saa maksaa halutun takaisinmaksuajan perusteella.",
      },
    },
    cta: "Aloita",
    footnote: "Kestää noin kolme minuuttia. Vastauksesi tallentuvat matkan varrella.",
  },
  network: {
    title: "Sähköverkko ja pääsulake",
    intro: "Valitse ensin maa. Silloin verkkoarvot ja oletushinnat asetetaan automaattisesti.",
    country: { title: "Maa", description: "Missä kiinteistö sijaitsee?" },
    area: {
      title: "Hinta-alue",
      description: "Valitse, missä päin maata kiinteistö sijaitsee.",
      placeholder: "Valitse hinta-alue",
    },
    fuse: {
      title: "Pääsulake",
      description: "Löytyy yleensä verkkolaskusta.",
      other: "Muu pääsulake",
      otherWith: "Muu pääsulake ({{amps}} A)",
      manualPlaceholder: "Syötä käsin",
    },
    values: {
      title: "Verkkoarvot",
      description: "Asetetaan automaattisesti valitun maan mukaan.",
      voltage: "Jännite",
      phases: "Vaiheet",
      frequency: "Taajuus",
      currency: "Valuutta",
      standards: "Standardit: {{list}}",
      confirm: "Olen tarkistanut, että verkkoarvot ovat oikein",
    },
  },
  consumption: {
    title: "Kulutus",
    intro: "Valitse sinulle sopivin tapa. Voit vaihtaa myöhemmin.",
    modeTitle: "Miten haluat syöttää kulutuksen?",
    modeAnnual: {
      title: "Vuosikulutus",
      description: "Tiedän suunnilleen, montako kilowattituntia käytämme vuodessa.",
    },
    modeMonthly: {
      title: "Kuukausi kerrallaan",
      description: "Minulla on todelliset arvot kaikille 12 kuukaudelle.",
    },
    annual: {
      title: "Vuosikulutus",
      label: "Kulutus",
      placeholder: "esim. 20000",
    },
    monthly: {
      title: "Todellinen kuukausikulutus",
      importDescription: "Tuo kuva, PDF tai CSV",
      monthsTitle: "Tuodut kuukausitiedot",
    },
    profile: { title: "Milloin käytät eniten sähköä?", placeholder: "Valitse profiili" },
  },
  production: {
    title: "Tuotanto",
    intro: "Onko kiinteistössä aurinkopaneeleita tällä hetkellä?",
    modeTitle: "Miten haluat syöttää tuotantosi?",
    modeNone: { title: "Ei aurinkosähköjärjestelmää" },
    modeAnnual: {
      title: "Vuosituotanto",
      description: "Tiedän järjestelmän koon ja suunnilleen vuosituotannon.",
    },
    modeMonthly: {
      title: "Kuukausi kerrallaan",
      description: "Minulla on todelliset tuotantoarvot kaikille 12 kuukaudelle.",
    },
    plant: {
      title: "Järjestelmä",
      dcKwp: "Asennettu paneeliteho",
      dcKwpShort: "Paneeliteho",
      acKw: "Invertteri",
      annual: "Vuosituotanto",
    },
    monthly: {
      title: "Todellinen kuukausituotanto",
      importDescription: "Tuo kuva, PDF tai CSV",
      monthsTitle: "Tuodut kuukausitiedot",
    },
    self: {
      title: "Aurinkosähkön oma käyttö (valinnainen)",
      label: "Oma käyttö",
      placeholder: "esim. 45",
      hint: "Se osuus tuottamastasi aurinkosähköstä, joka käytetään suoraan kiinteistössä. Jos et tiedä arvoa, laskemme sen kulutuksesi ja tuotantosi perusteella.",
    },
  },
  strategies: {
    title: "Akku",
    intro: "Kaikki on aluksi päällä. Kytke pois se, mikä ei ole sinulle kiinnostavaa.",
    solar: {
      title: "Optimoitu aurinkoenergian oma käyttö",
      description: "Varastoi aurinkosähköä ja käytä sitä, kun aurinko ei tuota.",
    },
    gridImport: {
      title: "Pienempi verkosta osto",
      description: "Käytä akkua vähentääksesi verkosta ostetun sähkön määrää.",
    },
    peak: {
      title: "Huipputehon leikkaus",
      description: "Pienennä kiinteistön tehohuippuja ja mahdollista tehomaksua.",
    },
    ancillary: {
      title: "Reservipalvelut",
      description: "Varaa akkutehoa sähköverkolle ja saa korvaus.",
    },
    noSolarNote:
      "Olet ilmoittanut, ettei kiinteistössä ole aurinkopaneeleita. Siksi aurinkosähkön oma käyttö ei tuo tällä hetkellä hyötyä — muut käyttötavat eivät muutu.",
  },
  economics: {
    customerShare: {
      title: "Tukipalvelut",
      description: "Koko markkina-arvo päätyy harvoin sinulle. Anna osuus, jonka arvioit saavasi.",
      label: "Osuutesi tukipalveluiden arvosta",
      hint: "Ohjearvo. Todellinen osuus riippuu aggregaattorista, tasevastaavasta, maksuista ja sopimuksesta.",
    },
    title: "Talous",
    intro: "Oletusarvot maalle {{country}}. Muuta halutessasi.",
    prices: {
      title: "Sähkön hinnat",
      description:
        "Vakioarvot eri akkuratkaisujen vertailuun. Tarkista ostosähkön hinta sähkölaskustasi ja käytä omaa näkemystäsi myydyn aurinkosähkön tulevista hinnoista.",
    },
    importPrice: { label: "Ostosähkö", hint: "Tarkista sähkölaskusi." },
    exportPrice: { label: "Myyty aurinkosähkö", hint: "Käytä omaa näkemystäsi tulevasta." },
    demandCharge: {
      label: "Tehomaksu",
      hintDefault:
        "Vakioarvo valitun maan mukaan. Muuta, jos tiedät verkkoyhtiösi tehomaksun.",
      hintZero: "Tehomaksua ei oleteta. Muuta, jos verkkoyhtiösi perii tehomaksun.",
    },
  },
  payback: {
    title: "Takaisinmaksuaika",
    intro: "Kuinka nopeasti haluat akun maksavan itsensä takaisin?",
    card: "Toivottu takaisinmaksuaika",
    years: "{{years}} vuotta",
    investment: {
      title: "Järkevä investointikustannus",
      hint: "Arvioitu enimmäisinvestointi valitulla takaisinmaksuajalla laskennallisen vuotuisen asiakashyödyn perusteella.",
      note: "Tukipalvelut lasketaan osuudellasi {{share}} %.",
      none: "Nykyisillä tiedoilla akku ei tuota positiivista laskennallista vuosihyötyä, joten järkevää investointikustannusta ei voi laskea.",
      benefit: "Laskennallinen vuotuinen asiakashyöty",
    },
  },
  results: {
    investment: {
      title: "Investointi",
      targetPayback: "Toivottu takaisinmaksuaika",
      maxInvestment: "Järkevä investointikustannus",
      benefit: "Laskennallinen vuotuinen asiakashyöty",
    },
    title: "Tulos",
    intro: "Tältä ehdotus näyttää kiinteistöllesi.",
    pdfReport: "Näytä PDF-raportti",
    pdfReportPending: "PDF-raportti on tekeillä eikä sitä voi vielä näyttää.",
    incomplete: {
      intro: "Tarvitsemme vielä hieman tietoja.",
      title: "Täytä puuttuvat tiedot",
      description: "Laskenta alkaa vasta, kun kaikki tiedot ovat mukana — emme arvaa puolestasi.",
    },
    error: {
      intro: "Jokin meni pieleen.",
      title: "Laskentaa ei voitu suorittaa",
      description:
        "Palaa takaisin, tarkista tiedot ja yritä uudelleen. Näytämme mieluummin tyhjää kuin keksityn tuloksen.",
    },
    noBattery: {
      badge: "Johtopäätös",
      title: "Akkua ei suositella",
      text: "Nykyisillä tiedoillasi akku ei tuo riittävää hyötyä suositeltavaksi.",
    },
    hero: { title: "Suositeltu akku" },
    bestChoice: "Paras valinta",
    level: { lower: "Pienempi", recommended: "Suositeltu", higher: "Suurempi" },
    balance: {
      base: "Paras tasapaino akun koon ja lasketun hyödyn välillä.",
      higher: "Paras tasapaino akun koon ja lasketun hyödyn välillä.",
      higherAncillary: "Paras tasapaino akun koon ja lasketun hyödyn välillä.",
    },
    energy: {
      title: "Energia",
      selfConsumption: "Oma käyttö",
      selfSufficiency: "Omavaraisuus",
      gridImport: "Verkosta osto",
      shiftedSolar: "Siirretty aurinkosähkö",
      recoveredCurtailment: "Talteen otettu rajoitettu aurinkosähkö",
    },
    power: {
      title: "Teho",
      peak: "Tehohuippu",
      reduction: "Vähennys",
      noReduction: "Tehohuippu ei pienene valituilla asetuksilla.",
    },
    benefit: {
      ancillaryTitle: "Tukipalvelut",
      ancillaryCustomerHint: "Laskennallinen korvauksesi.",
      ancillaryMarket: "Tukipalveluiden historiallinen markkina-arvo",
      ancillaryShare: "Osuutesi tukipalveluiden arvosta",
      ancillaryShareHint:
        "Osuus on arvio. Todellinen korvaus riippuu muun muassa aggregaattorista, tasevastaavasta, maksuista ja sopimusehdoista.",
      ancillaryCustomer: "Laskennallinen korvauksesi",
      title: "Laskettu hyöty",
      none: "Valituilla asetuksilla akku ei tuo laskettua taloudellista hyötyä.",
      energyWithSolar: "Siirretty aurinkosähkö ja pienempi sähkön osto",
      energyNoSolar: "Pienempi sähkön osto",
      energyHintSolar: "Varastoitu aurinkosähkö käytetään silloin, kun sitä tarvitaan.",
      energyHintNoSolar: "Akku latautuu, kun sähkö on halvempaa, ja käytetään myöhemmin.",
      peak: "Huipputehon leikkaus",
      peakHint: "Leikkaa tehohuiput ja pienentää tehomaksua.",
      ancillary: "Reservipalvelut – {{product}}",
      ancillaryHint: "Varatun akkutehon laskettu markkina-arvo. Historialliset hinnat 2025.",
      ancillaryNote:
        "Laskettu markkina-arvo perustuu vuoden 2025 historiallisiin hintoihin. Osa korvauksesta voi mennä aggregaattorille, tasevastaavalle tai muille markkinatoimijoille. Todellinen asiakaskorvaus riippuu sopimuksesta, markkinoille pääsystä ja ehdoista.",
    },
    limited: {
      title: "Rajallinen taloudellinen hyöty",
      text: "Laskenta ei osoita positiivista vuosihyötyä nykyisillä lähtötiedoilla ja valituilla strategioilla.",
    },
    why: {
      title: "Miksi {{power}} kW?",
      physicalNeed: "Fyysinen tehontarve",
      without: "Ilman tuotetta {{product}}",
      with: "Reservipalvelun kanssa",
      ownNeed: "Kiinteistön omaan tarpeeseen",
      explanation:
        "Suurempi järjestelmäteho tuo suuremman lasketun vuosihyödyn, kun vuoden 2025 historialliset reservipalveluhinnat otetaan mukaan. Tulevat hinnat ja tuotot voivat poiketa.",
      textSplit:
        "Kiinteistön fyysinen tehontarve on noin {{physical}} kW. Ilman tuotetta {{product}} suurin laskettu vuosihyöty saadaan teholla {{without}} kW. Vuoden 2025 historiallisilla reservipalveluhinnoilla suurin laskettu vuosihyöty saadaan teholla {{recommended}} kW. Tulevat hinnat ja tuotot voivat poiketa.",
      textSimple:
        "Kiinteistön omaan tarpeeseen riittää {{without}} kW. Suurempi järjestelmäteho {{recommended}} kW tuo suuremman lasketun vuosihyödyn, kun vuoden 2025 historialliset reservipalveluhinnat otetaan mukaan. Tulevat hinnat ja tuotot voivat poiketa.",
      historicalNote: "Tulevat FCR-hinnat ja tuotot voivat olla sekä korkeampia että matalampia.",
    },
    capacityWhy: {
      none: "Tiedoillasi akku siirtää liian vähän energiaa, jotta kokoa voitaisiin suositella.",
      withSolar:
        "{{capacity}} kWh antaa hyvän tasapainon sen välillä, kuinka paljon energiaa akku voi siirtää ja mitä lisäkapasiteetti tuo. Suurempi akku tuo suhteellisen vähän lisähyötyä kulutuksellasi ja aurinkotuotannollasi.",
      withoutSolar:
        "{{capacity}} kWh antaa hyvän tasapainon sen välillä, kuinka paljon energiaa akku voi siirtää ja mitä lisäkapasiteetti tuo. Suurempi akku tuo suhteellisen vähän lisähyötyä kulutuksellasi.",
    },
    powerWhy: {
      raised:
        "{{recommended}} kW antaa suurimman lasketun vuosihyödyn vertailluista järjestelmätehoista. Kiinteistön oma tehontarve on pienempi ({{physical}} kW).",
      floor:
        "{{recommended}} kW seuraa akun teknistä vähimmäisvaatimusta suhteessa kapasiteettiin. Kiinteistön oma tehontarve on pienempi ({{physical}} kW). Suurempi järjestelmäteho ei tuo riittävästi suurempaa laskettua vuosihyötyä.",
      matched:
        "{{recommended}} kW on mitoitettu kiinteistön energiavirtojen ja lasketun tehontarpeen mukaan ({{physical}} kW). Suurempi järjestelmäteho ei tuo riittävästi suurempaa laskettua vuosihyötyä.",
    },
    demandNote: {
      entered: "Laskettu antamallasi tehomaksulla.",
      standard: "Laskettu tehomaksun vakioarvolla.",
      noTariff:
        "Tehohuippu pienenee, mutta tehomaksua ei ole hinnoiteltu — siksi taloudellista säästöä ei lasketa.",
    },
    sizing: {
      basePower: "Perusteho fyysisestä mitoituksesta: {{power}} kW ({{crate}} C). ",
      basePhysicalUtility: "Fyysinen energiahyöty perusteholla",
      withoutProduct:
        "Järjestelmäteho, jolla laskettu vuosihyöty on suurin ilman tuotetta {{product}}: {{power}} kW ({{crate}} C).",
      selected:
        "Lasketun vuosihyödyn arvioinnin jälkeen suositelluksi järjestelmätehoksi valittiin {{power}} kW ({{crate}} C).",
      fcrInfluenced: "Historiallinen {{product}}-tuotto vaikutti tehon valintaan.",
    },
  },
  technical: {
    title: "Tekniset tiedot",
    calibrationGroup: "Oma käyttö ennen akkua",
    requested: "Ilmoitettu historiallinen arvo",
    achieved: "Mallin saavuttama taso",
    partialNote:
      "Malli on sovittanut kulutusprofiilia niin pitkälle kuin on järkevää menettämättä vuorokausikuviota.",
    usageGroup: "Akun käyttö",
    cycles: "Sykliä vuodessa",
    powerGroup: "Tehomitoitus",
    recommendedPower: "Suositeltu järjestelmäteho",
    physicalNeed: "Fyysinen tehontarve",
    heldPower: "Reservipalveluihin varattu teho",
    cRate: "C-arvo",
  },
  importantInformation: {
    title: "Tärkeää tietää",
    p1: "Tulos on arvio. Todellinen lopputulos voi poiketa laskelmasta.",
    p2: "Sähkön hinnat ja siirtotariffit vaihtelevat. Tarkista oma sopimuksesi ja verkkoyhtiön ehdot.",
    p3: "Reservipalvelutuotot perustuvat vuoden 2025 historiallisiin markkinahintoihin. Tulevat hinnat voivat olla sekä korkeampia että matalampia.",
    p4: "Osa reservipalvelukorvauksesta menee aggregaattorille, tasevastaavalle tai muille markkinatoimijoille. Todellinen asiakaskorvaus on siksi laskettua markkina-arvoa pienempi.",
    p5: "Osallistumista reservimarkkinoille ei ole taattu. Tekniset vaatimukset, markkinoille pääsy ja sopimukset voivat olla tarpeen.",
    p6: "Akun todellinen suorituskyky ja kannattavuus voivat poiketa tuotteen, asennuksen, ikääntymisen ja käytön mukaan.",
    p7: "Käytä asennukseen ja sähkötöihin aina valtuutettua tai sertifioitua sähköasentajaa.",
    footer:
      "Battery Doc on laskenta- ja päätöksenteon tuki eikä korvaa tarjousta, teknistä suunnittelua tai sopimusehtoja.",
  },
  ancillary: {
    unavailableSymmetric:
      "{{where}} käyttää symmetristä FCR:ää. Markkina on määritetty, mutta laskenta ei ole vielä käytettävissä – tuottoa ei oleteta.",
    unavailableNoData:
      "Reservipalveluita ei voida vielä laskea alueelle {{where}} – varmennettu historiallinen hinta-aineisto puuttuu. Tuottoa ei oleteta.",
  },
  monthlyImport: {
    reading: "Luetaan asiakirjaa…",
    reimport: "Tuo uudelleen",
    import: "Tuo kuukausitiedot",
    applied: "✓ 12 kuukauden arvot tuotu",
    chooseSeriesTitle: "Mitä sarjaa käytetään?",
    chooseSeriesText: "Asiakirjassa on useita sarjoja. Valitse se, joka koskee kohdetta {{kind}}.",
    kindConsumption: "kulutus",
    kindProduction: "aurinkotuotanto",
    reviewTitle: "Tarkista tuodut arvot",
    annualMismatch:
      "Kuukausiarvojen summa poikkeaa asiakirjan vuositiedosta. Tarkista arvot ennen jatkamista.",
    selfPctFound:
      "Asiakirjassa ilmoitetaan {{pct}} % oma käyttö. Arvoa käytetään todellisena omana käyttönä, kun hyväksyt arvot.",
    sum: "Summa:",
    apply: "Käytä arvoja",
    missingMonths:
      "Luimme {{read}} kuukautta 12:sta. Tarkista tai täytä puuttuvat arvot.",
  },
  errors: {
    importNoData:
      "Emme löytäneet tiedostosta kuukausitietoja. Tarkista, että kuukaudet näkyvät selvästi.",
    importUnreadable: "Tiedostoa ei voitu lukea. Kokeile selkeämpää kuvaa tai PDF-tiedostoa.",
    importTooLarge: "Tiedosto on liian suuri. Käytä alle 15 Mt:n tiedostoa.",
  },
  validation: {
    customerShare: "Osuuden on oltava 0–100 %.",
    paybackYears: "Valitse takaisinmaksuaika 5–20 vuoden väliltä.",
    country: "Valitse maa.",
    area: "Valitse hinta-alue.",
    fuse: "Anna kelvollinen pääsulake ampeereina.",
    fuseGeneric: "Anna kelvollinen pääsulake.",
    confirmGrid: "Vahvista verkkoarvot ennen jatkamista.",
    months: "Täytä kaikki 12 kuukautta kelvollisilla arvoilla.",
    monthsZero: "Kuukausikulutus ei voi olla nolla.",
    annualConsumption: "Anna vuosikulutuksesi kilowattitunteina.",
    profile: "Valitse parhaiten sopiva kulutusprofiili.",
    profileGeneric: "Valitse kiinteistöäsi vastaava kulutusprofiili.",
    productionMonths: "Täytä kaikki 12 kuukautta aurinkotuotannolle.",
    productionAnnual: "Anna aurinkopaneelien vuosituotanto kilowattitunteina.",
    dcKwp: "Paneeliteho ei voi olla negatiivinen.",
    acKw: "Invertterin teho ei voi olla negatiivinen.",
    importPrice: "Ostosähkön hinta ei voi olla negatiivinen.",
    exportPrice: "Myydyn aurinkosähkön korvaus ei voi olla negatiivinen.",
    demandCharge: "Tehomaksu ei voi olla negatiivinen.",
    fxRateAncillary: "Valuuttakurssin on oltava nollaa suurempi, kun reservipalvelut ovat päällä.",
    fxRate: "Valuuttakurssin on oltava nollaa suurempi.",
  },
  meta: {
    intro: {
      title: "Mr. Battery Doc — löydä oikea akku kiinteistöösi",
      description:
        "Vastaa muutamaan yksinkertaiseen kysymykseen ja selvitä, mikä akkukoko ja teho sopivat kiinteistöösi.",
      ogTitle: "Mr. Battery Doc — oikea akku kiinteistöösi",
      ogDescription: "Yksinkertainen opas akun kokoon, tehoon ja hyötyyn.",
    },
  },
} as const;
