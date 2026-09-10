/**
 * SOURCE LANGUAGE (Swedish).
 *
 * All customer-facing copy lives here and in the sibling language files.
 * Nothing in this file affects physics, economics, market routing or currency.
 */
export const sv = {
  common: {
    appName: "Mr. Battery Doc",
    back: "Tillbaka",
    next: "Nästa",
    done: "Klar",
    cancel: "Avbryt",
    restart: "Börja om",
    step: "Steg {{current}} av {{total}}",
  },
  language: {
    title: "Språk",
    description: "Språket styr bara texten i appen — inte land, valuta eller beräkning.",
  },
  countries: {
    SE: "Sverige",
    NO: "Norge",
    FI: "Finland",
    DK: "Danmark",
    DE: "Tyskland",
  },
  marketAreas: {
    DK1: "DK1 – Västdanmark",
    DK2: "DK2 – Östdanmark",
  },
  reserveProduct: {
    FCR: "FCR",
    FCR_D_UP: "FCR-D upp",
    generic: "stödtjänster",
  },
  units: {
    perYear: "/år",
    perYearShort: "kr/år",
    kwhPerYear: "kWh/år",
    perKwh: "{{currency}}/kWh",
    perKwMonth: "{{currency}}/kW/mån",
    phases: "{{count}}-fas",
  },
  months: {
    short: {
      "0": "Jan",
      "1": "Feb",
      "2": "Mar",
      "3": "Apr",
      "4": "Maj",
      "5": "Jun",
      "6": "Jul",
      "7": "Aug",
      "8": "Sep",
      "9": "Okt",
      "10": "Nov",
      "11": "Dec",
    },
  },
  intro: {
    lead: "Svara på några enkla frågor om din fastighet, så hjälper vi dig att hitta en lämplig batteristorlek.",
    points: {
      capacity: {
        title: "Rekommenderad batteristorlek och effekt",
        desc: "Hur många kWh och kW som passar din fastighet.",
      },
      usage: {
        title: "Hur batteriet kan användas",
        desc: "Egenanvändning, minskad nätimport, effekttoppar och stödtjänster.",
      },
      economy: {
        title: "Beräknad ekonomisk nytta",
        desc: "Vad batteriet kan ge i årlig kundnytta.",
      },
      investment: {
        title: "Rimlig investeringskostnad",
        desc: "Vad batteriet får kosta utifrån din önskade återbetalningstid.",
      },
    },
    cta: "Kom igång",
    footnote: "Tar ungefär tre minuter. Dina svar sparas medan du fyller i.",
  },
  network: {
    title: "Elnät och huvudsäkring",
    intro: "Börja med att välja land. Då sätts rätt nätvärden och standardpriser automatiskt.",
    country: { title: "Land", description: "Var ligger fastigheten?" },
    area: {
      title: "Elområde",
      description: "Välj var i landet fastigheten ligger.",
      placeholder: "Välj elområde",
    },
    fuse: {
      title: "Huvudsäkring",
      description: "Finns oftast på elnätsfakturan.",
      other: "Annan huvudsäkring",
      otherWith: "Annan huvudsäkring ({{amps}} A)",
      manualPlaceholder: "Ange manuellt",
    },
    values: {
      title: "Nätvärden",
      description: "Automatiskt baserat på valt land.",
      voltage: "Spänning",
      phases: "Faser",
      frequency: "Frekvens",
      currency: "Valuta",
      standards: "Standarder: {{list}}",
      confirm: "Jag har kontrollerat att nätvärdena stämmer",
    },
  },
  consumption: {
    title: "Förbrukning",
    intro: "Välj det sätt som passar dig bäst. Du kan ändra dig senare.",
    modeTitle: "Hur vill du ange förbrukningen?",
    modeAnnual: {
      title: "Årsförbrukning",
      description: "Jag vet ungefär hur många kWh vi använder per år.",
    },
    modeMonthly: {
      title: "Månad för månad",
      description: "Jag har faktiska värden för alla 12 månader.",
    },
    annual: {
      title: "Årsförbrukning",
      label: "Förbrukning",
      placeholder: "t.ex. 20000",
    },
    monthly: {
      title: "Faktisk månadsförbrukning",
      importDescription: "Importera en bild, PDF eller CSV",
      monthsTitle: "Importerad månadsdata",
    },
    profile: { title: "När använder du mest el?", placeholder: "Välj profil" },
  },
  production: {
    title: "Produktion",
    intro: "Har fastigheten solceller idag?",
    modeTitle: "Hur vill du ange din produktion?",
    modeNone: { title: "Ingen solcellsanläggning" },
    modeAnnual: {
      title: "Årsproduktion",
      description: "Jag vet anläggningens storlek och ungefärlig årsproduktion.",
    },
    modeMonthly: {
      title: "Månad för månad",
      description: "Jag har faktiska produktionsvärden för alla 12 månader.",
    },
    plant: {
      title: "Anläggning",
      dcKwp: "Installerad paneleffekt",
      dcKwpShort: "Paneleffekt",
      acKw: "Växelriktare",
      annual: "Årsproduktion",
    },
    monthly: {
      title: "Faktisk månadsproduktion",
      importDescription: "Importera en bild, PDF eller CSV",
      monthsTitle: "Importerad månadsdata",
    },
    self: {
      title: "Egenanvändning av solel (valfritt)",
      label: "Egenanvändning",
      placeholder: "t.ex. 45",
      hint: "Andelen av din producerade solel som används direkt i fastigheten. Om du inte vet värdet beräknar vi det utifrån din förbrukning och produktion.",
    },
  },
  strategies: {
    title: "Batteri",
    intro: "Allt är påslaget från start. Slå av det som inte är intressant för dig.",
    solar: {
      title: "Optimerad egenanvändning av solenergi",
      description: "Lagra solel och använd den när solen inte producerar.",
    },
    gridImport: {
      title: "Minskad nätimport",
      description: "Använd batteriet för att minska mängden el som köps från nätet.",
    },
    peak: {
      title: "Peak shaving",
      description: "Minska fastighetens effekttoppar och eventuell effektavgift.",
    },
    ancillary: {
      title: "Stödtjänster",
      description: "Reservera batterieffekt för elnätet och få ersättning.",
    },
    noSolarNote:
      "Du har angett att fastigheten inte har solceller. Då ger egenanvändning av solel ingen nytta idag — övriga användningssätt påverkas inte.",
  },
  economics: {
    customerShare: {
      title: "Stödtjänster",
      description: "Hela stödtjänstvärdet tillfaller sällan dig. Ange hur stor del du räknar med att få.",
      label: "Din andel av stödtjänstvärdet",
      hint: "Schablon. Din faktiska andel beror på aggregator, balansansvarig, avgifter och avtal.",
    },
    title: "Ekonomi",
    intro: "Standardvärden för {{country}}. Ändra om du vill.",
    prices: {
      title: "Elpriser",
      description:
        "Schablonvärden för att jämföra olika batterilösningar. Se din faktiska elräkning för köpt el, och utgå från vad du tror om framtida priser för såld solel.",
    },
    importPrice: { label: "Köpt el", hint: "Kolla din elräkning." },
    exportPrice: { label: "Såld solel", hint: "Utgå från vad du tror om framtiden." },
    demandCharge: {
      label: "Effektavgift",
      hintDefault:
        "Schablon baserad på valt land. Ändra om du känner till ditt elnätsföretags effektavgift.",
      hintZero: "Ingen effektavgift antagen. Ändra om ditt elnätsföretag tar ut en effektavgift.",
    },
  },
  payback: {
    title: "Återbetalningstid",
    intro: "Hur snabbt vill du att batteriet ska ha betalat sig?",
    card: "Önskad återbetalningstid",
    years: "{{years}} år",
    investment: {
      title: "Rimlig investeringskostnad",
      hint: "Ungefärlig högsta investering för att nå vald återbetalningstid, utifrån beräknad årlig kundnytta.",
      note: "Stödtjänster räknas med utifrån din andel på {{share}} %.",
      none: "Med dina nuvarande uppgifter ger batteriet ingen positiv beräknad årlig nytta. Då går det inte att räkna fram någon rimlig investeringskostnad.",
      benefit: "Beräknad årlig kundnytta",
    },
  },
  results: {
    section: {
      battery: "Batteriet",
      benefit: "Nyttan",
      economy: "Ekonomin",
      details: "Detaljer",
    },
    investment: {
      title: "Maxinvestering vid din valda återbetalningstid",
      basedOn: "Baserat på din valda återbetalningstid på {{years}}",
      otherTitle: "Maxinvestering vid olika återbetalningstider",
      yourChoice: "Ditt val",
      approx: "ca",
      explain: "Kortare återbetalningstid innebär en lägre maxinvestering. Här ser du hur maxinvesteringen förändras om du accepterar en kortare eller längre återbetalningstid.",
    },
    title: "Resultat",
    intro: "Så här ser förslaget ut för din fastighet.",
    pdfReport: "Visa PDF-rapport",
    pdfReportPending: "PDF-rapporten är på väg och kan inte visas ännu.",
    incomplete: {
      intro: "Vi behöver lite mer information.",
      title: "Fyll i det som saknas",
      description:
        "Beräkningen startar först när alla uppgifter finns — vi gissar aldrig åt dig.",
    },
    error: {
      intro: "Något gick fel.",
      title: "Beräkningen kunde inte genomföras",
      description:
        "Gå tillbaka och kontrollera dina uppgifter, och försök igen. Vi visar hellre inget än ett påhittat resultat.",
    },
    noBattery: {
      badge: "Slutsats",
      title: "Inget batteri rekommenderas",
      text: "Med dina nuvarande uppgifter ger ett batteri inte tillräcklig nytta för att rekommenderas.",
    },
    hero: { title: "Rekommenderat batteri" },
    bestChoice: "Bäst val",
    yourBattery: "Ditt batteri",
    level: { lower: "Mindre", recommended: "Bäst val", higher: "Större" },
    balance: {
      base: "Bäst balans mellan batteristorlek och beräknad nytta.",
      higher: "Bäst balans mellan batteristorlek och beräknad nytta.",
      higherAncillary: "Bäst balans mellan batteristorlek och beräknad nytta.",
    },
    improvements: {
      title: "Så förbättras fastigheten",
      summaryShifted: "{{value}} flyttad solel",
      summaryPeak: "{{value}} lägre effekttopp",
    },
    energy: {
      title: "Energi",
      selfConsumption: "Egenanvändning",
      selfSufficiency: "Självförsörjning",
      gridImport: "Nätimport",
      shiftedSolar: "Flyttad solel",
      recoveredCurtailment: "Återvunnen kapad solel",
    },
    power: {
      title: "Effekt",
      peak: "Effekttopp",
      reduction: "Minskning",
      noReduction: "Ingen minskning av effekttoppen med de valda inställningarna.",
    },
    benefit: {
      ancillaryTitle: "Stödtjänster",
      ancillaryCustomerHint: "Din beräknade ersättning.",
      ancillaryMarket: "Historiskt marknadsvärde för stödtjänster",
      ancillaryShare: "Din andel av stödtjänstvärdet",
      ancillaryShareHint:
        "Andelen är en schablon. Faktisk ersättning beror bland annat på aggregator, balansansvarig, avgifter och avtalsvillkor.",
      showCalculation: "Visa beräkningen för stödtjänster",
      ancillaryCustomer: "Din beräknade ersättning",
      title: "Beräknad nytta",
      none: "Med de valda inställningarna ger batteriet ingen beräknad ekonomisk nytta.",
      energyWithSolar: "Flyttad solel och minskat elköp",
      energyNoSolar: "Minskat elköp",
      energyHintSolar: "Lagrad solel används när den behövs.",
      energyHintNoSolar: "Batteriet laddas när elen är billigare och används senare.",
      peak: "Peak shaving",
      peakHint: "Kapar effekttoppar och minskar effektavgiften.",
      ancillary: "Stödtjänster – {{product}}",
      ancillaryHint: "Beräknat marknadsvärde för reserverad batterieffekt. Historiska priser 2025.",
      ancillaryNote: "Beräknat marknadsvärde baserat på historiska priser 2025.",
    },
    limited: {
      title: "Begränsad ekonomisk nytta",
      text: "Beräkningen visar ingen positiv beräknad årlig nytta med dina nuvarande förutsättningar och valda strategier.",
    },
    why: {
      title: "Varför {{power}} kW?",
      physicalNeed: "Fysiskt effektbehov",
      without: "Utan {{product}}",
      with: "Med stödtjänst",
      ownNeed: "För fastighetens eget behov",
      explanation:
        "Den högre systemeffekten ger större beräknad årlig nytta när historiska stödtjänst-priser från 2025 ingår. Framtida priser och intäkter kan avvika.",
      textSplit:
        "Fastighetens fysiska effektbehov är cirka {{physical}} kW. Utan {{product}} ger {{without}} kW högst beräknad årlig nytta. Med historiska stödtjänst-priser från 2025 ger {{recommended}} kW högst beräknad årlig nytta. Framtida priser och intäkter kan avvika.",
      textSimple:
        "För fastighetens eget behov räcker {{without}} kW. Den högre systemeffekten {{recommended}} kW ger större beräknad årlig nytta när historiska stödtjänst-priser från 2025 ingår. Framtida priser och intäkter kan avvika.",
      historicalNote: "Framtida FCR-priser och intäkter kan bli både högre och lägre.",
    },
    capacityWhy: {
      none: "Med dina uppgifter flyttar ett batteri för lite energi för att en storlek ska kunna rekommenderas.",
      withSolar:
        "{{capacity}} kWh ger en bra balans mellan hur mycket energi batteriet kan flytta och nyttan av ytterligare kapacitet. Ett större batteri ger relativt liten ytterligare nytta med din förbrukning och solproduktion.",
      withoutSolar:
        "{{capacity}} kWh ger en bra balans mellan hur mycket energi batteriet kan flytta och nyttan av ytterligare kapacitet. Ett större batteri ger relativt liten ytterligare nytta med din förbrukning.",
    },
    powerWhy: {
      raised:
        "{{recommended}} kW ger högst beräknad årlig nytta av de systemeffekter som har jämförts. Fastighetens eget effektbehov är lägre ({{physical}} kW).",
      floor:
        "{{recommended}} kW följer batteriets tekniska minimikrav i förhållande till kapaciteten. Fastighetens eget effektbehov är lägre ({{physical}} kW). Högre systemeffekt ger inte tillräckligt större beräknad årlig nytta.",
      matched:
        "{{recommended}} kW är dimensionerad efter fastighetens energiflöden och beräknade effektbehov ({{physical}} kW). Högre systemeffekt ger inte tillräckligt större beräknad årlig nytta.",
    },
    demandNote: {
      entered: "Beräknat med den effektavgift du angett.",
      standard: "Beräknat med ett schablonvärde för effektavgift.",
      noTariff:
        "Effekttoppen minskar, men ingen effektavgift är prissatt — därför räknas ingen ekonomisk effektbesparing.",
    },
    sizing: {
      basePower: "Grundeffekt från fysisk dimensionering: {{power}} kW ({{crate}} C). ",
      basePhysicalUtility: "Fysisk energinytta vid grundeffekten",
      withoutProduct:
        "Systemeffekt med högst beräknad årlig nytta utan {{product}}: {{power}} kW ({{crate}} C).",
      selected:
        "Efter utvärdering av den beräknade årliga nyttan valdes {{power}} kW ({{crate}} C) som rekommenderad systemeffekt.",
      fcrInfluenced: "Historisk {{product}}-intäkt påverkade effektvalet.",
    },
  },
  technical: {
    title: "Tekniska detaljer",
    calibrationGroup: "Egenanvändning före batteri",
    requested: "Angivet historiskt värde",
    achieved: "Modellens uppnådda nivå",
    partialNote:
      "Modellen har anpassat förbrukningsprofilen så långt det är rimligt utan att förlora dess dygnsmönster.",
    usageGroup: "Batterianvändning",
    cycles: "Cykler per år",
    powerGroup: "Effektdimensionering",
    recommendedPower: "Rekommenderad systemeffekt",
    physicalNeed: "Fysiskt effektbehov",
    heldPower: "Stödtjänster hållen effekt",
    cRate: "C-rate",
  },
  importantInformation: {
    title: "Viktigt att känna till",
    p1: "Resultatet är en uppskattning. Verkligt utfall kan skilja sig från beräkningen.",
    p2: "Elpriser och nättariffer varierar. Kontrollera ditt eget avtal och elnätsföretagets villkor.",
    p3: "Stödtjänstintäkter baseras på historiska marknadspriser från 2025. Framtida priser kan bli både högre och lägre.",
    p4: "En del av stödtjänstersättningen går till aggregator, balansansvarig eller andra marknadsaktörer. Den faktiska kundersättningen är därför lägre än det beräknade marknadsvärdet.",
    p5: "Deltagande på stödtjänstmarknaden är inte garanterat. Tekniska krav, marknadstillträde och avtal kan krävas.",
    p6: "Batteriets verkliga prestanda och lönsamhet kan avvika beroende på produkt, installation, degradering och användning.",
    p7: "Anlita alltid en behörig eller certifierad elinstallatör för installation och elarbeten.",
    footer:
      "Battery Doc är ett beräknings- och beslutsstöd och ersätter inte offert, teknisk projektering eller avtalsvillkor.",
  },
  ancillary: {
    unavailableSymmetric:
      "{{where}} använder symmetrisk FCR. Marknaden är konfigurerad men beräkningen är ännu inte tillgänglig – ingen intäkt antas.",
    unavailableNoData:
      "Stödtjänster kan inte beräknas för {{where}} ännu – verifierat historiskt prisunderlag saknas. Ingen intäkt antas.",
  },
  monthlyImport: {
    reading: "Läser dokumentet…",
    reimport: "Importera på nytt",
    import: "Importera månadsdata",
    applied: "✓ 12 månaders värden importerade",
    chooseSeriesTitle: "Vilken serie ska användas?",
    chooseSeriesText: "Dokumentet innehåller flera serier. Välj den som gäller {{kind}}.",
    kindConsumption: "förbrukning",
    kindProduction: "solproduktion",
    reviewTitle: "Kontrollera importerade värden",
    annualMismatch:
      "Summan av månadsvärdena skiljer sig från årsuppgiften i dokumentet. Kontrollera värdena innan du fortsätter.",
    selfPctFound:
      "Dokumentet anger {{pct}} % egenanvändning. Värdet används som din faktiska egenanvändning när du godkänner värdena.",
    sum: "Summa:",
    apply: "Använd värden",
    missingMonths:
      "Vi kunde läsa {{read}} av 12 månader. Kontrollera eller fyll i de saknade värdena.",
  },
  errors: {
    importNoData:
      "Vi hittade ingen månadsdata i filen. Kontrollera att månaderna syns tydligt.",
    importUnreadable: "Filen kunde inte läsas. Försök med en tydligare bild eller en PDF.",
    importTooLarge: "Filen är för stor. Använd en fil som är mindre än 15 MB.",
  },
  validation: {
    customerShare: "Andelen måste vara mellan 0 och 100 %.",
    paybackYears: "Välj en återbetalningstid mellan 5 och 20 år.",
    country: "Välj land.",
    area: "Välj elområde.",
    fuse: "Ange en giltig huvudsäkring i ampere.",
    fuseGeneric: "Ange en giltig huvudsäkring.",
    confirmGrid: "Bekräfta att nätvärdena stämmer innan du fortsätter.",
    months: "Fyll i alla 12 månader med giltiga värden.",
    monthsZero: "Månadsförbrukningen kan inte vara noll.",
    annualConsumption: "Ange din årsförbrukning i kWh.",
    profile: "Välj den förbrukningsprofil som passar bäst.",
    profileGeneric: "Välj den förbrukningsprofil som liknar din fastighet.",
    productionMonths: "Fyll i alla 12 månader för solproduktionen.",
    productionAnnual: "Ange solcellernas årsproduktion i kWh.",
    dcKwp: "Paneleffekten kan inte vara negativ.",
    acKw: "Växelriktarens effekt kan inte vara negativ.",
    importPrice: "Priset på köpt el kan inte vara negativt.",
    exportPrice: "Ersättningen för såld solel kan inte vara negativ.",
    demandCharge: "Effektavgiften kan inte vara negativ.",
    fxRateAncillary: "Valutakursen måste vara större än noll när stödtjänster är påslaget.",
    fxRate: "Valutakursen måste vara större än noll.",
  },
  meta: {
    intro: {
      title: "Mr. Battery Doc — hitta rätt batteri till din fastighet",
      description:
        "Svara på några enkla frågor och få veta vilken batteristorlek och effekt som passar din fastighet.",
      ogTitle: "Mr. Battery Doc — rätt batteri till din fastighet",
      ogDescription: "Enkel guide som visar batteristorlek, effekt och nytta.",
    },
  },
} as const;

export type TranslationSchema = typeof sv;
