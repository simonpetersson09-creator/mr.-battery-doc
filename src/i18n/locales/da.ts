/** Dansk */
export const da = {
  common: {
    appName: "Mr. Battery Doc",
    back: "Tilbage",
    next: "Næste",
    done: "Færdig",
    cancel: "Annuller",
    restart: "Start forfra",
    step: "Trin {{current}} af {{total}}",
  },
  language: {
    title: "Sprog",
    description:
      "Sproget ændrer kun teksten i appen — ikke land, valuta eller beregningen.",
  },
  countries: {
    SE: "Sverige",
    NO: "Norge",
    FI: "Finland",
    DK: "Danmark",
    DE: "Tyskland",
  },
  marketAreas: {
    DK1: "DK1 – Vestdanmark",
    DK2: "DK2 – Østdanmark",
  },
  reserveProduct: {
    FCR: "FCR",
    FCR_D_UP: "FCR-D op",
    generic: "systemydelser",
  },
  units: {
    perYear: "/år",
    kwhPerYear: "kWh/år",
    perKwh: "{{currency}}/kWh",
    perKwMonth: "{{currency}}/kW/md.",
    phases: "{{count}}-faset",
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
    lead: "Svar på nogle enkle spørgsmål om din ejendom, så hjælper vi dig med at finde en passende batteristørrelse.",
    points: {
      capacity: {
        title: "Anbefalet batteristorrelse og effekt",
        desc: "Hvor mange kWh og kW der passer til din ejendom.",
      },
      usage: {
        title: "Hvordan batteriet kan bruges",
        desc: "Egenforbrug, mindsket netimport, spidslastafskæring og systemtjenester.",
      },
      economy: {
        title: "Anslået økonomisk nytte",
        desc: "Hvad batteriet kan give i årlig kundenytte.",
      },
      investment: {
        title: "Fornuftig investeringsomkostning",
        desc: "Hvad batteriet må koste ud fra din ønskede tilbagebetalingstid.",
      },
    },
    cta: "Kom i gang",
    footnote: "Tager cirka tre minutter. Dine svar gemmes undervejs.",
  },
  network: {
    title: "ElNet og hovedsikring",
    intro:
      "Start med at vælge land. Så sættes de rigtige netværdier og standardpriser automatisk.",
    country: { title: "Land", description: "Hvor ligger ejendommen?" },
    area: {
      title: "Prisområde",
      description: "Vælg hvor i landet ejendommen ligger.",
      placeholder: "Vælg prisområde",
    },
    fuse: {
      title: "Hovedsikring",
      description: "Står som regel på netregningen.",
      other: "Anden hovedsikring",
      otherWith: "Anden hovedsikring ({{amps}} A)",
      manualPlaceholder: "Indtast manuelt",
    },
    values: {
      title: "Netværdier",
      description: "Sættes automatisk ud fra det valgte land.",
      voltage: "Spænding",
      phases: "Faser",
      frequency: "Frekvens",
      currency: "Valuta",
      standards: "Standarder: {{list}}",
      confirm: "Jeg har kontrolleret, at netværdierne passer",
    },
  },
  consumption: {
    title: "Forbrug",
    intro: "Vælg den måde, der passer dig bedst. Du kan ændre det senere.",
    modeTitle: "Hvordan vil du angive forbruget?",
    modeAnnual: {
      title: "Årsforbrug",
      description: "Jeg ved cirka, hvor mange kWh vi bruger om året.",
    },
    modeMonthly: {
      title: "Måned for måned",
      description: "Jeg har faktiske værdier for alle 12 måneder.",
    },
    annual: {
      title: "Årsforbrug",
      label: "Forbrug",
      placeholder: "f.eks. 20000",
    },
    monthly: {
      title: "Faktisk månedsforbrug",
      importDescription:
        "Importér et billede, en PDF eller CSV — værdierne udfylder månedsfelterne nedenfor.",
      monthsTitle: "Importeret månedlig data",
    },
    profile: { title: "Hvornår bruger du mest strøm?", placeholder: "Vælg profil" },
  },
  production: {
    title: "Produktion",
    intro: "Har ejendommen solceller i dag?",
    modeTitle: "Hvordan vil du angive din produktion?",
    modeNone: { title: "Intet solcelleanlæg" },
    modeAnnual: {
      title: "Årsproduktion",
      description: "Jeg kender anlæggets størrelse og den omtrentlige årsproduktion.",
    },
    modeMonthly: {
      title: "Måned for måned",
      description: "Jeg har faktiske produktionsværdier for alle 12 måneder.",
    },
    plant: {
      title: "Anlæg",
      dcKwp: "Installeret paneleffekt",
      dcKwpShort: "Paneleffekt",
      acKw: "Inverter",
      annual: "Årsproduktion",
    },
    monthly: {
      title: "Faktisk månedsproduktion",
      importDescription:
        "Importér et billede, en PDF eller CSV — værdierne udfylder månedsfelterne nedenfor.",
      monthsTitle: "Importeret månedlig data",
    },
    self: {
      title: "Egetforbrug af solstrøm (valgfrit)",
      label: "Egetforbrug",
      placeholder: "f.eks. 45",
      hint: "Den andel af din solstrøm, der bruges direkte i ejendommen. Hvis du ikke kender værdien, beregner vi den ud fra dit forbrug og din produktion.",
    },
  },
  strategies: {
    title: "Batteri",
    intro: "Alt er slået til fra start. Slå det fra, som ikke er relevant for dig.",
    solar: {
      title: "Optimeret egetforbrug af solenergi",
      description: "Gem solstrøm, og brug den, når solen ikke producerer.",
    },
    gridImport: {
      title: "Mindre netimport",
      description: "Brug batteriet til at reducere mængden af el, der købes fra nettet.",
    },
    peak: {
      title: "Peak shaving",
      description: "Reducer ejendommens effektspidser og eventuel effektbetaling.",
    },
    ancillary: {
      title: "Systemydelser",
      description: "Reservér batterieffekt til elnettet, og få betaling.",
    },
    noSolarNote:
      "Du har angivet, at ejendommen ikke har solceller. Derfor giver egetforbrug af solstrøm ingen nytte i dag — de øvrige anvendelser påvirkes ikke.",
  },
  economics: {
    customerShare: {
      title: "Støttetjenester",
      description: "Hele markedsværdien tilfalder sjældent dig. Angiv den andel, du forventer at få.",
      label: "Din andel af værdien fra støttetjenester",
      hint: "Vejledende. Din faktiske andel afhænger af aggregator, balanceansvarlig, gebyrer og aftale.",
    },
    title: "Økonomi",
    intro: "Standardværdier for {{country}}. Ret dem, hvis du vil.",
    prices: {
      title: "Elpriser",
      description:
        "Standardværdier til at sammenligne forskellige batteriløsninger. Se din faktiske elregning for købt el, og tag udgangspunkt i din forventning til fremtidige priser for solgt solstrøm.",
    },
    importPrice: { label: "Købt el", hint: "Tjek din elregning." },
    exportPrice: { label: "Solgt solstrøm", hint: "Tag udgangspunkt i din forventning." },
    demandCharge: {
      label: "Effektbetaling",
      hintDefault:
        "Standardværdi for det valgte land. Ret den, hvis du kender dit netselskabs effektbetaling.",
      hintZero:
        "Ingen effektbetaling antaget. Ret den, hvis dit netselskab opkræver effektbetaling.",
    },
  },
  payback: {
    title: "Tilbagebetalingstid",
    intro: "Hvor hurtigt skal batteriet have tjent sig hjem?",
    card: "Ønsket tilbagebetalingstid",
    years: "{{years}} år",
    investment: {
      title: "Rimelig investeringsomkostning",
      hint: "Omtrentlig maksimal investering for at nå den valgte tilbagebetalingstid ud fra den beregnede årlige kundegevinst.",
      note: "Støttetjenester regnes med din andel på {{share}} %.",
      none: "Med dine nuværende oplysninger giver batteriet ingen positiv beregnet årlig gevinst, og derfor kan der ikke beregnes en rimelig investeringsomkostning.",
      benefit: "Beregnet årlig kundegevinst",
    },
  },
  results: {
    investment: {
      title: "Investering",
      targetPayback: "Ønsket tilbagebetalingstid",
      maxInvestment: "Rimelig investeringsomkostning",
      benefit: "Beregnet årlig kundegevinst",
    },
    title: "Resultat",
    intro: "Sådan ser forslaget ud for din ejendom.",
    pdfReport: "Vis PDF-rapport",
    pdfReportPending: "PDF-rapporten er på vej og kan endnu ikke vises.",
    incomplete: {
      intro: "Vi mangler lidt mere information.",
      title: "Udfyld det, der mangler",
      description:
        "Beregningen starter først, når alle oplysninger er der — vi gætter aldrig for dig.",
    },
    error: {
      intro: "Noget gik galt.",
      title: "Beregningen kunne ikke gennemføres",
      description:
        "Gå tilbage, kontrollér dine oplysninger og prøv igen. Vi viser hellere ingenting end et opdigtet resultat.",
    },
    noBattery: {
      badge: "Konklusion",
      title: "Intet batteri anbefales",
      text: "Med dine nuværende oplysninger giver et batteri ikke nok nytte til at blive anbefalet.",
    },
    hero: { title: "Anbefalet batteri" },
    level: { lower: "Mindre", recommended: "Anbefalet", higher: "Større" },
    balance: {
      base: "Anbefalet er den størrelse, der giver den bedste balance ud fra ejendommens energibehov.",
      higher:
        "Anbefalet er den størrelse, der giver den bedste balance ud fra ejendommens energibehov. Et større batteri kan give højere beregnet nytte.",
      higherAncillary:
        "Anbefalet er den størrelse, der giver den bedste balance ud fra ejendommens energibehov. Et større batteri kan give højere beregnet nytte, især med systemydelser.",
    },
    energy: {
      title: "Energi",
      selfConsumption: "Egetforbrug",
      selfSufficiency: "Selvforsyning",
      gridImport: "Netimport",
      shiftedSolar: "Flyttet solstrøm",
      recoveredCurtailment: "Genvundet afkortet solstrøm",
    },
    power: {
      title: "Effekt",
      peak: "Effekttop",
      reduction: "Reduktion",
      noReduction: "Ingen reduktion af effekttoppen med de valgte indstillinger.",
    },
    benefit: {
      ancillaryTitle: "Støttetjenester",
      ancillaryCustomerHint: "Din beregnede betaling.",
      ancillaryMarket: "Historisk markedsværdi for støttetjenester",
      ancillaryShare: "Din andel af værdien fra støttetjenester",
      ancillaryShareHint:
        "Andelen er et skøn. Den faktiske betaling afhænger blandt andet af aggregator, balanceansvarlig, gebyrer og aftalevilkår.",
      ancillaryCustomer: "Din beregnede betaling",
      title: "Beregnet nytte",
      none: "Med de valgte indstillinger giver batteriet ingen beregnet økonomisk nytte.",
      energyWithSolar: "Flyttet solstrøm og mindre elkøb",
      energyNoSolar: "Mindre elkøb",
      energyHintSolar: "Lagret solstrøm bruges, når der er behov for den.",
      energyHintNoSolar: "Batteriet lades, når elen er billigere, og bruges senere.",
      peak: "Peak shaving",
      peakHint: "Skærer effekttoppe og reducerer effektbetalingen.",
      ancillary: "Systemydelser – {{product}}",
      ancillaryHint:
        "Beregnet markedsværdi af den reserverede batterieffekt. Historiske priser 2025.",
      ancillaryNote:
        "Beregnet markedsværdi baseret på historiske priser fra 2025. En del af betalingen kan gå til aggregator, balanceansvarlig eller andre markedsaktører. Den faktiske kundebetaling afhænger af aftale, markedsadgang og vilkår.",
    },
    limited: {
      title: "Begrænset økonomisk nytte",
      text: "Beregningen viser ingen positiv årlig nytte med dine nuværende forudsætninger og valgte strategier.",
    },
    why: {
      title: "Hvorfor {{power}} kW?",
      physicalNeed: "Fysisk effektbehov",
      without: "Uden {{product}}",
      with: "Med systemydelse",
      ownNeed: "Til ejendommens eget behov",
      explanation:
        "Den højere systemeffekt giver større beregnet årlig nytte, når historiske priser for systemydelser fra 2025 indgår. Fremtidige priser og indtægter kan afvige.",
      textSplit:
        "Ejendommens fysiske effektbehov er cirka {{physical}} kW. Uden {{product}} giver {{without}} kW den højeste beregnede årlige nytte. Med historiske priser for systemydelser fra 2025 giver {{recommended}} kW den højeste beregnede årlige nytte. Fremtidige priser og indtægter kan afvige.",
      textSimple:
        "Til ejendommens eget behov er {{without}} kW nok. Den højere systemeffekt på {{recommended}} kW giver større beregnet årlig nytte, når historiske priser for systemydelser fra 2025 indgår. Fremtidige priser og indtægter kan afvige.",
      historicalNote: "Fremtidige FCR-priser og indtægter kan blive både højere og lavere.",
    },
    capacityWhy: {
      none: "Med dine oplysninger flytter et batteri for lidt energi til, at en størrelse kan anbefales.",
      withSolar:
        "{{capacity}} kWh giver en god balance mellem, hvor meget energi batteriet kan flytte, og nytten af yderligere kapacitet. Et større batteri giver relativt lidt ekstra nytte med dit forbrug og din solproduktion.",
      withoutSolar:
        "{{capacity}} kWh giver en god balance mellem, hvor meget energi batteriet kan flytte, og nytten af yderligere kapacitet. Et større batteri giver relativt lidt ekstra nytte med dit forbrug.",
    },
    powerWhy: {
      raised:
        "{{recommended}} kW giver den højeste beregnede årlige nytte af de sammenlignede systemeffekter. Ejendommens eget effektbehov er lavere ({{physical}} kW).",
      floor:
        "{{recommended}} kW følger batteriets tekniske minimumskrav i forhold til kapaciteten. Ejendommens eget effektbehov er lavere ({{physical}} kW). Højere systemeffekt giver ikke tilstrækkeligt større beregnet årlig nytte.",
      matched:
        "{{recommended}} kW er dimensioneret efter ejendommens energistrømme og beregnede effektbehov ({{physical}} kW). Højere systemeffekt giver ikke tilstrækkeligt større beregnet årlig nytte.",
    },
    demandNote: {
      entered: "Beregnet med den effektbetaling, du har angivet.",
      standard: "Beregnet med en standardværdi for effektbetaling.",
      noTariff:
        "Effekttoppen falder, men der er ikke prissat nogen effektbetaling — derfor regnes ingen økonomisk besparelse.",
    },
    sizing: {
      basePower: "Grundeffekt fra fysisk dimensionering: {{power}} kW ({{crate}} C). ",
      basePhysicalUtility: "Fysisk energinytte ved grundeffekten",
      withoutProduct:
        "Systemeffekt med den højeste beregnede årlige nytte uden {{product}}: {{power}} kW ({{crate}} C).",
      selected:
        "Efter vurdering af den beregnede årlige nytte blev {{power}} kW ({{crate}} C) valgt som anbefalet systemeffekt.",
      fcrInfluenced: "Historisk indtægt fra {{product}} påvirkede valget af effekt.",
    },
  },
  technical: {
    title: "Tekniske detaljer",
    calibrationGroup: "Egetforbrug før batteri",
    requested: "Angivet historisk værdi",
    achieved: "Modellens opnåede niveau",
    partialNote:
      "Modellen har tilpasset forbrugsprofilen så langt, det er rimeligt, uden at miste døgnmønstret.",
    usageGroup: "Batteribrug",
    cycles: "Cyklusser om året",
    powerGroup: "Effektdimensionering",
    recommendedPower: "Anbefalet systemeffekt",
    physicalNeed: "Fysisk effektbehov",
    heldPower: "Effekt reserveret til systemydelser",
    cRate: "C-rate",
  },
  importantInformation: {
    title: "Vigtigt at vide",
    p1: "Resultatet er et skøn. Det faktiske udfald kan afvige fra beregningen.",
    p2: "Elpriser og nettariffer varierer. Kontrollér din egen aftale og netselskabets vilkår.",
    p3: "Indtægter fra systemydelser er baseret på historiske markedspriser fra 2025. Fremtidige priser kan blive både højere og lavere.",
    p4: "En del af betalingen for systemydelser går til aggregator, balanceansvarlig eller andre markedsaktører. Den faktiske kundebetaling er derfor lavere end den beregnede markedsværdi.",
    p5: "Deltagelse på markedet for systemydelser er ikke garanteret. Tekniske krav, markedsadgang og aftaler kan være nødvendige.",
    p6: "Batteriets faktiske ydeevne og økonomi kan afvige afhængigt af produkt, installation, degradering og brug.",
    p7: "Brug altid en autoriseret eller certificeret elinstallatør til installation og elarbejde.",
    footer:
      "Battery Doc er et beregnings- og beslutningsværktøj og erstatter ikke tilbud, teknisk projektering eller aftalevilkår.",
  },
  ancillary: {
    unavailableSymmetric:
      "{{where}} bruger symmetrisk FCR. Markedet er konfigureret, men beregningen er endnu ikke tilgængelig – ingen indtægt antages.",
    unavailableNoData:
      "Systemydelser kan endnu ikke beregnes for {{where}} – verificerede historiske prisdata mangler. Ingen indtægt antages.",
  },
  monthlyImport: {
    reading: "Læser dokumentet…",
    reimport: "Importér igen",
    import: "Importér månedsdata",
    applied: "✓ 12 måneders værdier importeret",
    chooseSeriesTitle: "Hvilken serie skal bruges?",
    chooseSeriesText: "Dokumentet indeholder flere serier. Vælg den, der gælder {{kind}}.",
    kindConsumption: "forbrug",
    kindProduction: "solproduktion",
    reviewTitle: "Kontrollér de importerede værdier",
    annualMismatch:
      "Summen af månedsværdierne afviger fra årsangivelsen i dokumentet. Kontrollér værdierne, før du fortsætter.",
    selfPctFound:
      "Dokumentet angiver {{pct}} % egetforbrug. Værdien bruges som dit faktiske egetforbrug, når du godkender værdierne.",
    sum: "Sum:",
    apply: "Brug værdier",
    missingMonths:
      "Vi kunne læse {{read}} af 12 måneder. Kontrollér eller udfyld de manglende værdier.",
  },
  errors: {
    importNoData:
      "Vi fandt ingen månedsdata i filen. Kontrollér, at månederne er tydeligt synlige.",
    importUnreadable: "Filen kunne ikke læses. Prøv med et tydeligere billede eller en PDF.",
    importTooLarge: "Filen er for stor. Brug en fil på under 15 MB.",
  },
  validation: {
    customerShare: "Andelen skal være mellem 0 og 100 %.",
    paybackYears: "Vælg en tilbagebetalingstid mellem 5 og 20 år.",
    country: "Vælg land.",
    area: "Vælg prisområde.",
    fuse: "Angiv en gyldig hovedsikring i ampere.",
    fuseGeneric: "Angiv en gyldig hovedsikring.",
    confirmGrid: "Bekræft, at netværdierne passer, før du fortsætter.",
    months: "Udfyld alle 12 måneder med gyldige værdier.",
    monthsZero: "Månedsforbruget kan ikke være nul.",
    annualConsumption: "Angiv dit årsforbrug i kWh.",
    profile: "Vælg den forbrugsprofil, der passer bedst.",
    profileGeneric: "Vælg den forbrugsprofil, der ligner din ejendom.",
    productionMonths: "Udfyld alle 12 måneder for solproduktionen.",
    productionAnnual: "Angiv solcellernes årsproduktion i kWh.",
    dcKwp: "Paneleffekten kan ikke være negativ.",
    acKw: "Inverterens effekt kan ikke være negativ.",
    importPrice: "Prisen på købt el kan ikke være negativ.",
    exportPrice: "Betalingen for solgt solstrøm kan ikke være negativ.",
    demandCharge: "Effektbetalingen kan ikke være negativ.",
    fxRateAncillary: "Valutakursen skal være større end nul, når systemydelser er slået til.",
    fxRate: "Valutakursen skal være større end nul.",
  },
  meta: {
    intro: {
      title: "Mr. Battery Doc — find det rigtige batteri til din ejendom",
      description:
        "Svar på nogle enkle spørgsmål og find ud af, hvilken batteristørrelse og effekt der passer til din ejendom.",
      ogTitle: "Mr. Battery Doc — det rigtige batteri til din ejendom",
      ogDescription: "Enkel guide, der viser batteristørrelse, effekt og nytte.",
    },
  },
} as const;
