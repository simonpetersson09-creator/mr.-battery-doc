/** Dutch. */
export const nl = {
  common: {
    appName: "Mr. Battery Doc",
    back: "Terug",
    next: "Volgende",
    showResult: "Toon resultaat",
    calculating: "Berekenen…",
    simulating: "Simuleren",
    done: "Klaar",
    cancel: "Annuleren",
    restart: "Begin opnieuw",
    locked: "Vergrendeld",
    step: "Stap {{current}} van {{total}}",
    mostCommon: "Meest gekozen",
  },
  language: {
    title: "Taal",
    description:
      "De taal wijzigt alleen de tekst in de app — niet het land, de valuta of de berekening.",
  },
  countries: {
    SE: "Zweden",
    NO: "Noorwegen",
    FI: "Finland",
    DK: "Denemarken",
    DE: "Duitsland",
    NL: "Nederland",
    AT: "Oostenrijk",
    CH: "Zwitserland",
  },
  marketAreas: {
    DK1: "DK1 – West-Denemarken",
    DK2: "DK2 – Oost-Denemarken",
  },
  reserveProduct: {
    FCR: "FCR",
    FCR_D_UP: "FCR-D op en neer",
    generic: "netdiensten",
  },
  units: {
    perYear: "/jr",
    kwhPerYear: "kWh/jr",
    perKwh: "{{currency}}/kWh",
    perKwMonth: "{{currency}}/kW/maand",
    phases: "{{count}}-fase",
  },
  months: {
    short: {
      "0": "Jan",
      "1": "Feb",
      "2": "Mrt",
      "3": "Apr",
      "4": "Mei",
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
    title: "Vind de juiste thuisbatterij voor jouw woning",
    subtitle:
      "Dimensionering en financiële analyse voor een thuisbatterij met zonnepanelen of een losse batterij voor netdiensten.",
    lead: "Beantwoord een paar simpele vragen over je woning en we helpen je de juiste maat thuisbatterij te vinden.",
    points: {
      capacity: {
        title: "Aanbevolen batterijformaat",
        desc: "Zie welke capaciteit en vermogen bij je woning passen.",
      },
      economy: {
        title: "Geschat financieel voordeel",
        desc: "Zie het voordeel van eigen verbruik, piekafvlakking en netdiensten.",
      },
      investment: {
        title: "Geschatte maximale investering",
        desc: "Zie wat de batterij mag kosten op basis van je gewenste terugverdientijd.",
      },
    },
    stats: {
      powerLabel: "200 kW / 500 kWh",
      powerSub: "max. batterijformaat",
      simsLabel: "≈ 800.000",
      simsSub: "uurlijkse berekeningen per analyse",
    },
    cta: "Start",
    footnote: "Duurt ongeveer drie minuten. Je antwoorden worden gaandeweg opgeslagen.",
  },
  network: {
    phase: {
      title: "Aansluiting",
      description: "Kies of de woning een 1-fase of 3-fase aansluiting heeft.",
    },
    title: "Net en hoofdzekering",
    intro:
      "Begin met het kiezen van een land. De juiste netwaarden en standaardprijzen worden dan automatisch ingesteld.",
    country: { title: "Land", description: "Waar staat de woning?" },
    area: {
      title: "Prijsgebied",
      description: "Kies waar in het land de woning zich bevindt.",
      placeholder: "Kies prijsgebied",
    },
    fuse: {
      title: "Hoofdzekering",
      description: "Staat meestal op je netbeheerfactuur.",
      other: "Andere hoofdzekering",
      otherWith: "Andere hoofdzekering ({{amps}} A)",
      manualPlaceholder: "Handmatig invoeren",
    },
    values: {
      title: "Netwaarden",
      description: "Automatisch ingesteld op basis van het gekozen land.",
      voltage: "Spanning",
      phases: "Fasen",
      frequency: "Frequentie",
      currency: "Valuta",
      standards: "Standaarden: {{list}}",
      confirm: "Ik heb gecontroleerd dat de netwaarden correct zijn",
    },
  },
  consumption: {
    title: "Verbruik",
    intro: "Kies de manier die jou het beste uitkomt. Je kunt dit later nog wijzigen.",
    modeTitle: "Hoe wil je je verbruik invoeren?",
    modeAnnual: {
      title: "Jaarverbruik",
      description: "Ik weet ongeveer hoeveel kWh we per jaar verbruiken.",
    },
    modeMonthly: {
      title: "Maand per maand",
      description: "Ik heb de werkelijke waarden voor alle 12 maanden.",
    },
    annual: {
      title: "Jaarverbruik",
      label: "Verbruik",
      placeholder: "bijv. 20000",
    },
    monthly: {
      title: "Werkelijk maandverbruik",
      importDescription: "Importeer een afbeelding, PDF of CSV",
      monthsTitle: "Geïmporteerde maanddata",
    },
    profile: {
      title: "Wanneer verbruik je de meeste stroom? (dagprofiel)",
      placeholder: "Kies profiel",
      chartCaption: "Typische weekdag",
      chartPeaks: "Pieken",
      chartBase: "Basislast",
    },
  },
  production: {
    title: "Productie",
    intro: "Heeft de woning al zonnepanelen?",
    modeTitle: "Hoe wil je je productie invoeren?",
    modeNone: { title: "Geen zonnepanelen" },
    modeAnnual: {
      title: "Jaarproductie",
      description: "Ik weet de systeemgrootte en de geschatte jaarproductie.",
    },
    modeMonthly: {
      title: "Maand per maand",
      description: "Ik heb de werkelijke productiedata voor alle 12 maanden.",
    },
    plant: {
      title: "Zonnepaneelinstallatie",
      dcKwp: "Geïnstalleerd paneelvermogen",
      dcKwpShort: "Paneelvermogen",
      acKw: "Omvormer",
      annual: "Jaarproductie",
    },
    monthly: {
      title: "Werkelijke maandproductie",
      importDescription: "Importeer een afbeelding, PDF of CSV",
      monthsTitle: "Geïmporteerde maanddata",
    },
    self: {
      title: "Eigen verbruik van zonnestroom (optioneel)",
      label: "Eigen verbruik",
      placeholder: "bijv. 45",
      hint: "Het aandeel van je zonneproductie dat direct in de woning wordt verbruikt. Als je de waarde niet weet, berekenen we die op basis van je verbruik en productie.",
    },
  },
  strategies: {
    title: "Batterij",
    intro: "Alles staat standaard aan. Zet uit wat niet relevant voor je is.",
    solar: {
      title: "Geoptimaliseerd eigen verbruik van zonne-energie",
      description: "Sla zonnestroom op en gebruik het als de zon niet produceert.",
    },
    gridImport: {
      title: "Minder import van het net",
      description: "Gebruik de batterij om minder stroom van het net te hoeven kopen.",
    },
    peak: {
      title: "Piekafvlakking",
      description: "Verlaag de vermogenspieken van de woning en eventuele capaciteitstarieven.",
    },
    ancillary: {
      title: "Netdiensten",
      description: "Reserveer batterijvermogen voor het stroomnet en krijg betaald.",
    },
    noSolarNote:
      "Je hebt aangegeven dat de woning geen zonnepanelen heeft. Eigen verbruik van zonnestroom levert daarom nu geen voordeel op — de andere functies blijven ongewijzigd.",
  },
  economics: {
    customerShare: {
      title: "Netdiensten",
      description:
        "De volledige marktwaarde bereikt jou zelden. Voer het aandeel in dat je verwacht te ontvangen.",
      label: "Jouw aandeel in de waarde van netdiensten",
      hint: "Schatting. Je werkelijke aandeel hangt af van aggregator, BRP, kosten en contractvoorwaarden.",
    },
    title: "Economie",
    intro: "Standaardwaarden voor {{country}}. Pas ze aan als je wilt.",
    prices: {
      lockedNote:
        "Prijzen hebben geen invloed op de berekening als je geen zonnepanelen hebt gekozen — de velden zijn vergrendeld.",
      showFields: "Toon velden toch",
      title: "Stroomprijzen",
      description:
        "Standaardwaarden om verschillende batterijoplossingen te vergelijken. Controleer je werkelijke energierekening voor ingekochte stroom, en gebruik je eigen visie op toekomstige prijzen voor geëxporteerde zonnestroom.",
    },
    importPrice: {
      label: "Ingekochte stroom (incl. netwerkkosten)",
      hint: "Controleer je energierekening.",
    },
    exportPrice: {
      label: "Geëxporteerde zonnestroom (spotprijs)",
      hint: "Gebruik je eigen toekomstvisie.",
    },
    demandCharge: {
      label: "Capaciteitstarief",
      hintDefault:
        "Standaardwaarde gebaseerd op het gekozen land. Pas het aan als je het capaciteitstarief van je netbeheerder weet.",
      hintZero:
        "Geen capaciteitstarief aangenomen. Pas het aan als je netbeheerder kosten rekent voor piekvermogen.",
    },
  },
  payback: {
    title: "Terugverdientijd",
    intro: "Hoe snel wil je dat de batterij zichzelf terugverdient?",
    card: "Gewenste terugverdientijd",
    years: "{{years}} jaar",
    guide: "Je bepaalt de installatiekosten op basis van je gekozen terugverdientijd.",
    investment: {
      title: "Redelijke investeringskosten",
      hint: "Geschatte maximale investering om de gekozen terugverdientijd te halen, gebaseerd op het berekende jaarlijkse klantvoordeel.",
      note: "Netdiensten worden meegerekend tegen jouw aandeel van {{share}} %.",
      none: "Met je huidige gegevens levert de batterij geen positief berekend jaarlijks voordeel op, dus er kunnen geen redelijke investeringskosten worden afgeleid.",
      benefit: "Berekend jaarlijks klantvoordeel",
    },
  },
  results: {
    ancillaryScenario: {
      title: "Scenario netdiensten",
      intro:
        "Zelfs zonder dat een batterij nodig is voor zon of piekverbruik, kan een batterij worden gebruikt voor netdiensten. Hier kun je vergelijken hoe verschillende batterijformaten de berekende vergoeding beïnvloeden.",
      notRecommendation: "Dit is een vergelijkingsscenario, geen aanbevolen batterijformaat.",
      technicalTitle: "Technisch voorstel",
      technicalHint:
        "Het formaat is zo gekozen dat ten minste 95% van de berekende capaciteit voor netdiensten voor jouw netaansluiting en verbruiksprofiel kan worden benut. Het is een technisch voorstel, geen bewering over de meest winstgevende batterij.",
      driven:
        "Het formaat wordt bepaald door de mogelijkheid om netdiensten te leveren via je netaansluiting en is niet gedimensioneerd voor de energiebehoefte van het huishouden.",
      lead: "Netdiensten kunnen een batterij alsnog rendabel maken. Vergelijk hieronder een paar formaten.",
      battery: "Batterij",
      compensation: "Vergoeding netdiensten",
      totalBenefit: "Berekend totaal voordeel",
      maxInvestment: "Maximale investering bij jouw gekozen terugverdientijd",
      maxInvestmentNone: "Kan niet worden berekend",
      note: "De berekening is gebaseerd op historische vergoedingsniveaus. De werkelijke vergoeding, beschikbaarheid en de mogelijkheid om deel te nemen aan netdiensten hangen onder andere af van de markt, de aggregator en technische vereisten.",
      benefitNote:
        "De standaard dimensionering vindt geen noodzaak voor een batterij. Netdiensten kunnen nog steeds rendabel zijn — zie het scenario hieronder.",
      investmentNote:
        "De standaard dimensionering vindt geen noodzaak voor een batterij. De maximale investering per batterijformaat wordt getoond in het scenario hieronder.",
    },
    section: {
      battery: "Batterij",
      benefit: "Voordeel",
      economy: "Economie",
      details: "Details",
    },
    investment: {
      title: "Maximale investering bij jouw gekozen terugverdientijd",
      basedOn: "Gebaseerd op jouw gekozen terugverdientijd van {{years}} jaar",
      otherTitle: "Maximale investering bij verschillende terugverdientijden",
      yourChoice: "Jouw keuze",
      approx: "ca.",
      explain:
        "Een kortere terugverdientijd betekent een lagere maximale investering. Hier zie je hoe de maximale investering verandert als je een kortere of langere terugverdientijd accepteert.",
    },
    title: "Resultaat",
    intro: "Dit is het voorstel voor jouw woning.",
    pdfReport: "Download rapport als PDF",
    incomplete: {
      intro: "We hebben nog wat meer informatie nodig.",
      title: "Vul aan wat ontbreekt",
      description: "De berekening start pas als alle gegevens er zijn — we doen nooit aannames voor je.",
    },
    error: {
      intro: "Er is iets misgegaan.",
      title: "De berekening kon niet worden voltooid",
      description:
        "Ga terug, controleer je gegevens en probeer het opnieuw. We tonen liever niets dan een verzonnen resultaat.",
    },
    noBattery: {
      badge: "Conclusie",
      title: "Geen batterij aanbevolen",
      text: "Met je huidige gegevens levert een batterij niet genoeg voordeel op om te worden aanbevolen.",
    },
    hero: { title: "Aanbevolen batterij" },
    bestChoice: "Beste keuze",
    yourBattery: "Jouw batterij",
    level: { lower: "Kleiner", recommended: "Beste keuze", higher: "Groter" },
    withoutAncillary: {
      title: "Aanbevolen zonder inkomsten uit netdiensten",
      description: "Dezelfde woning, zonder inkomsten uit netdiensten.",
    },
    balance: {
      base: "Beste balans tussen batterijformaat en berekend voordeel.",
      higher: "Beste balans tussen batterijformaat en berekend voordeel.",
      higherAncillary: "Beste balans tussen batterijformaat en berekend voordeel.",
    },
    improvements: {
      title: "Hoe de woning verbetert",
      summaryShifted: "{{value}} verschoven zonne-energie",
      summaryPeak: "{{value}} lagere vermogenspiek",
    },
    energy: {
      title: "Energie",
      selfConsumption: "Eigen verbruik",
      selfSufficiency: "Zelfvoorziening",
      gridImport: "Netimport",
      shiftedSolar: "Verschoven zonnestroom",
      recoveredCurtailment: "Teruggewonnen afgetopte zonnestroom",
    },
    power: {
      title: "Vermogen",
      peak: "Vermogenspiek",
      reduction: "Reductie",
      noReduction: "Geen reductie van de vermogenspiek met de gekozen instellingen.",
    },
    breakdown: {
      title: "Verdeling van het jaarlijkse voordeel",
      total: "Totaal berekend klantvoordeel",
    },
    benefit: {
      nonPositive:
        "Met je huidige invoer levert de batterij geen positief berekend economisch voordeel per jaar op. Het technische resultaat wordt hieronder nog wel getoond.",
      ancillaryTitle: "Netdiensten",
      ancillaryCustomerHint: "Jouw berekende vergoeding.",
      ancillaryPower: "Geschat vergoedbaar vermogen",
      ancillaryMarket: "Historische marktwaarde van netdiensten",
      ancillaryShare: "Jouw aandeel in de waarde van netdiensten",
      ancillaryShareHint:
        "Het aandeel is een schatting. Je werkelijke vergoeding hangt af van aggregator, balance responsible party, kosten en contractvoorwaarden.",
      showCalculation: "Toon de berekening voor netdiensten",
      ancillaryCustomer: "Jouw berekende vergoeding",
      title: "Berekend voordeel",
      none: "Met de gekozen instellingen levert de batterij geen berekend financieel voordeel op.",
      energyWithSolar: "Verschoven zonnestroom en verminderde inkoop",
      energyNoSolar: "Verminderde stroominkoop",
      energyHintSolar: "Opgeslagen zonnestroom wordt gebruikt wanneer het nodig is.",
      energyHintNoSolar: "De batterij laadt op als stroom goedkoper is en wordt later gebruikt.",
      peak: "Piekafvlakking",
      peakHint: "Vlakt vermogenspieken af en verlaagt het capaciteitstarief.",
      ancillary: "Netdiensten – {{product}}",
      ancillaryHint:
        "Berekende marktwaarde van het gereserveerde batterijvermogen. Historische 2025 prijzen.",
      ancillaryNote: "Berekende marktwaarde op basis van historische 2025 prijzen.",
      priceBasis: "Gebaseerd op prijzen voor netdiensten uit 2025.",
    },
    limited: {
      title: "Beperkt financieel voordeel",
      text: "De berekening toont geen positief jaarlijks voordeel met je huidige omstandigheden en gekozen strategieën.",
    },
    why: {
      title: "Waarom {{power}} kW?",
      physicalNeed: "Fysieke vermogensbehoefte",
      without: "Zonder {{product}}",
      with: "Met netdiensten",
      ownNeed: "Voor de eigen behoefte van de woning",
      explanation:
        "Het hogere systeemvermogen geeft een groter berekend jaarlijks voordeel wanneer historische prijzen voor netdiensten uit 2025 worden meegerekend. Toekomstige prijzen en opbrengsten kunnen afwijken.",
      textSplit:
        "De fysieke vermogensbehoefte van de woning is ongeveer {{physical}} kW. Zonder {{product}} geeft {{without}} kW het hoogste berekende jaarlijkse voordeel. Met historische prijzen voor netdiensten uit 2025 geeft {{recommended}} kW het hoogste berekende jaarlijkse voordeel. Toekomstige prijzen en opbrengsten kunnen afwijken.",
      textSimple:
        "Voor de eigen behoefte van de woning is {{without}} kW voldoende. Het hogere systeemvermogen van {{recommended}} kW geeft een groter berekend jaarlijks voordeel wanneer historische prijzen voor netdiensten uit 2025 worden meegerekend. Toekomstige prijzen en opbrengsten kunnen afwijken.",
      historicalNote: "Toekomstige FCR prijzen en opbrengsten kunnen zowel hoger als lager zijn.",
    },
    capacityWhy: {
      none: "Met jouw gegevens verplaatst een batterij te weinig energie om een formaat aan te bevelen.",
      withSolar:
        "{{capacity}} kWh geeft een goede balans tussen hoeveel energie de batterij kan verplaatsen en het voordeel van extra capaciteit. Een grotere batterij levert relatief weinig extra voordeel op met jouw verbruik en zonneproductie.",
      withoutSolar:
        "{{capacity}} kWh geeft een goede balans tussen hoeveel energie de batterij kan verplaatsen en het voordeel van extra capaciteit. Een grotere batterij levert relatief weinig extra voordeel op met jouw verbruik.",
    },
    searchLimit: {
      atLeast: "Minstens {{value}}",
      capacityNote:
        "De bovengrens van de capaciteit in deze analyse is bereikt. Een grotere batterij kan mogelijk meer voordeel opleveren.",
      powerNote:
        "De bovengrens van het vermogen in deze analyse is bereikt. Een systeem met een hoger vermogen vereist mogelijk een aparte analyse.",
      bothNote:
        "De woning bevindt zich aan de bovengrens van de dimensionering in deze analyse. Grotere systemen moeten worden gedimensioneerd met een uitgebreide technische studie.",
    },
    powerCap: {
      note: "De berekende fysieke vermogensbehoefte van de woning ({{physical}} kW) is groter dan het grootste beschikbare productniveau ({{product}} kW). De aanbeveling is daarom beperkt tot {{product}} kW.",
    },
    powerWhy: {
      raised:
        "{{recommended}} kW geeft het hoogste berekende jaarlijkse voordeel van de vergeleken systeemvermogens. De eigen vermogensbehoefte van de woning is lager ({{physical}} kW).",
      floor:
        "{{recommended}} kW volgt het technische minimum van de batterij in verhouding tot de capaciteit. De eigen vermogensbehoefte van de woning is lager ({{physical}} kW). Een hoger systeemvermogen geeft geen voldoende groter berekend jaarlijks voordeel.",
      matched:
        "{{recommended}} kW is gedimensioneerd voor de energiestromen en de berekende vermogensbehoefte ({{physical}} kW) van de woning. Een hoger systeemvermogen geeft geen voldoende groter berekend jaarlijks voordeel.",
    },
    demandNote: {
      entered: "Berekend met het capaciteitstarief dat je hebt ingevoerd.",
      standard: "Berekend met een standaardwaarde voor het capaciteitstarief.",
      noTariff:
        "De vermogenspiek wordt verlaagd, maar er is geen capaciteitstarief ingeprijsd — er wordt dus geen financiële piekbesparing berekend.",
    },
    sizing: {
      basePower: "Basisvermogen uit fysieke dimensionering: {{power}} kW ({{crate}} C). ",
      basePhysicalUtility: "Fysiek energievoordeel bij het basisvermogen",
      withoutProduct:
        "Systeemvermogen met het hoogste berekende jaarlijkse voordeel zonder {{product}}: {{power}} kW ({{crate}} C).",
      selected:
        "Na evaluatie van het berekende jaarlijkse voordeel is {{power}} kW ({{crate}} C) gekozen als het aanbevolen systeemvermogen.",
      fcrInfluenced: "Historische {{product}} opbrengsten hebben de vermogenskeuze beïnvloed.",
    },
  },
  technical: {
    title: "Technische details",
    calibrationGroup: "Eigen verbruik vóór de batterij",
    requested: "Opgegeven historische waarde",
    achieved: "Niveau bereikt door het model",
    partialNote:
      "Het model heeft het verbruiksprofiel zo ver als redelijk is aangepast zonder het dagelijkse patroon te verliezen.",
    usageGroup: "Batterijgebruik",
    cycles: "Cycli per jaar",
    powerGroup: "Vermogensdimensionering",
    recommendedPower: "Aanbevolen systeemvermogen",
    physicalNeed: "Fysieke vermogensbehoefte",
    basePowerForEnergy: "Basisvermogen voor energiebeheer",
    ancillaryRaisedNote:
      "Het hogere aanbevolen vermogen komt voort uit de dimensionering voor netdiensten.",
    potentialTitle: "Potentieel voor netdiensten",
    potentialNote:
      "Een hoger geïnstalleerd vermogen kan het berekende voordeel uit netdiensten verhogen. Voor deze netaansluiting kan de engine productstappen tot {max} kW testen.",
    potentialColumn: "Extra berekend jaarlijks voordeel",
    heldPower: "Gereserveerd vermogen voor netdiensten",
    cRate: "C-rate",
    socWindow: "SOC-venster",
    roundTrip: "Round-trip efficiëntie",
    ancillaryGroup: "Netdiensten",
    reservedPower: "Gereserveerd vermogen",
    reservablePower: "Fysiek reserveerbaar vermogen (gemiddeld)",
    reservableNote:
      "Een aparte, gemiddelde reserveerbaarheidsmaat – niet het vermogen waarover de vergoeding wordt berekend.",
    reservationNote:
      "De engine reserveert het niveau dat het hoogste totale berekende voordeel oplevert. Meer van het batterijvermogen kan technisch beschikbaar zijn voor netdiensten, maar wordt niet gebruikt als eigen verbruik en piekafvlakking meer voordeel opleveren.",
    selectedServices: "Geselecteerde diensten",
    limitingFactor: "Wat de batterijgrootte beperkt",
    limiting: {
      power: "Batterijvermogen",
      energy: "Batterijcapaciteit",
      grid: "Netaansluiting",
      none: "Geen",
    },
  },
  importantInformation: {
    title: "Belangrijk om te weten",
    p1: "Het resultaat is een schatting. Het werkelijke resultaat kan afwijken van de berekening.",
    p2: "Stroomprijzen en nettarieven variëren. Controleer je eigen contract en de voorwaarden van je netbeheerder.",
    p3: "Opbrengsten uit netdiensten zijn gebaseerd op historische marktprijzen uit 2025. Toekomstige prijzen kunnen zowel hoger als lager zijn.",
    p4: "Een deel van de vergoeding voor netdiensten gaat naar een aggregator, balance responsible party of andere marktpartijen. De werkelijke uitbetaling aan de klant is daarom lager dan de berekende marktwaarde.",
    p5: "Deelname aan de markt voor netdiensten is niet gegarandeerd. Technische vereisten, markttoegang en contracten kunnen nodig zijn.",
    p6: "De werkelijke prestaties en winstgevendheid van de batterij kunnen verschillen afhankelijk van product, installatie, degradatie en gebruik.",
    p7: "Gebruik altijd een erkende of gecertificeerde elektricien voor installatie en elektrisch werk.",
    footer:
      "Battery Doc is een reken- en beslissingsondersteuningstool en vervangt geen offerte, technisch ontwerp of contractvoorwaarden.",
  },
  ancillary: {
    priceDataNotConfigured:
      "Netdiensten voor {{where}}: prijsdata is nog niet geconfigureerd. Inkomsten uit netdiensten worden als 0 geteld – er worden geen prijzen van andere landen gebruikt.",
    unavailableSymmetric:
      "{{where}} gebruikt symmetrische FCR. De markt is geconfigureerd, maar de berekening is nog niet beschikbaar – er wordt geen opbrengst aangenomen.",
    unavailableNoData:
      "Netdiensten kunnen nog niet worden berekend voor {{where}} – geverifieerde historische prijsdata ontbreekt. Er wordt geen opbrengst aangenomen.",
  },
  monthlyImport: {
    takePhoto: "Maak foto",
    choosePhoto: "Kies afbeelding",
    chooseFile: "Kies bestand",
    reading: "Document lezen…",
    reimport: "Importeer opnieuw",
    import: "Importeer maanddata",
    applied: "✓ 12 maanden aan waarden geïmporteerd",
    chooseSeriesTitle: "Welke reeks moet worden gebruikt?",
    chooseSeriesText: "Het document bevat meerdere reeksen. Kies degene voor {{kind}}.",
    kindConsumption: "verbruik",
    kindProduction: "zonneproductie",
    reviewTitle: "Controleer de geïmporteerde waarden",
    annualMismatch:
      "De som van de maandelijkse waarden verschilt van het jaarcijfer in het document. Controleer de waarden voordat je doorgaat.",
    selfPctFound:
      "Het document vermeldt {{pct}} % eigen verbruik. Deze waarde wordt gebruikt als je werkelijke eigen verbruik wanneer je de waarden goedkeurt.",
    sum: "Totaal:",
    apply: "Gebruik waarden",
    missingMonths:
      "We konden {{read}} van de 12 maanden lezen. Controleer of vul de ontbrekende waarden in.",
  },
  errors: {
    importImageUnreadable:
      "Deze afbeelding kon niet worden gelezen. Probeer een nieuwe foto te maken of kies een JPG-, PNG- of PDF-bestand.",
    importFilesDenied:
      "Toegang tot bestanden is uitgeschakeld. Sta toegang toe in je iPhone-instellingen om een document te kiezen.",
    importPickerUnavailable: "De kiezer kon nu niet worden geopend. Probeer het opnieuw.",
    importUnsupportedType:
      "Dat bestandstype wordt niet ondersteund. Gebruik een afbeelding, een PDF of een CSV-bestand.",
    importCameraDenied:
      "Cameratoegang is uitgeschakeld. Sta de camera toe in je iPhone-instellingen om een document te fotograferen.",
    importPhotosDenied:
      "Toegang tot foto's is uitgeschakeld. Sta toegang toe in je iPhone-instellingen om een document te kiezen.",
    importNoData: "We vonden geen maandelijkse data in het bestand. Controleer of de maanden duidelijk zichtbaar zijn.",
    importUnreadable: "Het bestand kon niet worden gelezen. Probeer een duidelijkere afbeelding of een PDF.",
    importTooLarge: "Het bestand is te groot. Gebruik een bestand kleiner dan 15 MB.",
    importNotConfigured: "De AI-dienst is niet geconfigureerd.",
    importRateLimited: "Te veel verzoeken op dit moment. Wacht even en probeer het opnieuw.",
    importCreditsExhausted: "De AI-credits zijn op. Waardeer op om documenten te lezen.",
    importUnparsable: "We konden de inhoud van het document niet interpreteren.",
    egValue: "bijv. {{value}}",
  },
  validation: {
    customerShare: "Het aandeel moet tussen 0 en 100 % liggen.",
    paybackYears: "Kies een terugverdientijd tussen 5 en 20 jaar.",
    country: "Kies een land.",
    area: "Kies een prijsgebied.",
    fuse: "Voer een geldige hoofdzekering in ampères in.",
    fuseGeneric: "Voer een geldige hoofdzekering in.",
    confirmGrid: "Bevestig dat de netwaarden correct zijn voordat je verdergaat.",
    months: "Vul alle 12 maanden in met geldige waarden.",
    monthsZero: "Het maandelijkse verbruik kan niet nul zijn.",
    annualConsumption: "Voer je jaarverbruik in kWh in.",
    profile: "Kies het verbruiksprofiel dat het beste past.",
    profileGeneric: "Kies het verbruiksprofiel dat op jouw woning lijkt.",
    productionMonths: "Vul alle 12 maanden in voor de zonneproductie.",
    productionAnnual: "Voer de jaarlijkse zonneproductie in kWh in.",
    dcKwp: "Het paneelvermogen kan niet negatief zijn.",
    acKw: "Het omvormervermogen kan niet negatief zijn.",
    importPrice: "De prijs van ingekochte stroom kan niet negatief zijn.",
    exportPrice: "De vergoeding voor geëxporteerde zonnestroom kan niet negatief zijn.",
    demandCharge: "Het capaciteitstarief kan niet negatief zijn.",
    fxRateAncillary: "De wisselkoers moet groter dan nul zijn als netdiensten aanstaan.",
    fxRate: "De wisselkoers moet groter dan nul zijn.",
    reminder: "Voer een waarde in.",
  },
  meta: {
    intro: {
      title: "Mr. Battery Doc — vind de juiste thuisbatterij voor jouw woning",
      description:
        "Beantwoord een paar simpele vragen en ontdek welke batterijgrootte en vermogen bij jouw woning passen.",
      ogTitle: "Mr. Battery Doc — de juiste thuisbatterij voor jouw woning",
      ogDescription: "Een simpele gids die batterijgrootte, vermogen en voordeel toont.",
    },
  },
  paywall: {
    title: "Je batterijberekening is klaar",
    subtitle: "Ontgrendel het resultaat en je persoonlijke batterijrapport.",
    ready: "Berekening voltooid",
    includesTitle: "Je krijgt toegang tot:",
    includes: {
      size: "Aanbevolen batterijformaat en -vermogen",
      benefit: "Geschat jaarlijks voordeel",
      selfSufficiency: "Eigen verbruik en zelfvoorziening voor/na",
      peak: "Piekafvlakking en netimpact",
      ancillary: "Berekening voor netdiensten",
      investment: "Maximale investering voor jouw terugverdientijd",
      pdf: "Compleet persoonlijk PDF-rapport",
    },
    premium: {
      label: "Premium · 1 jaar",
      badge: "Beste waarde",
      description: "Onbeperkt berekeningen en rapporten voor 1 jaar.",
      cta: "Start Premium",
      value: "Premium loont vanaf 5 rapporten per jaar.",
      renewal:
        "{{price}}. Het abonnement wordt automatisch verlengd tenzij opgezegd volgens de voorwaarden van de App Store.",
      loadingPrice: "Prijs ophalen…",
    },
    single: {
      label: "Eén rapport",
      description: "Ontgrendel deze berekening en het PDF-rapport.",
      cta: "Koop rapport voor {{price}}",
      ctaPending: "Koop rapport",
      loadingPrice: "Prijs ophalen…",
      adjustmentsIncluded: "Inclusief 3 aanpassingen binnen 24 uur na aankoop.",
    },
    priceUnavailable: "Prijs komt uit de App Store.",
    restore: "Herstel aankopen",
    restoring: "Herstellen…",
    manage: "Beheer abonnement",
    manageWeb: "Abonnementen worden beheerd via Apple op je iPhone.",
    restored: "Premium hersteld.",
    restoreNothing: "Geen actief abonnement gevonden.",
    processing: "Aankoop verwerken…",
    pending:
      "De aankoop wacht op goedkeuring. Het resultaat wordt ontgrendeld zodra dit is afgerond.",
    unresolved:
      "De aankoop is gelukt, maar kon nog niet worden bevestigd. We voltooien dit automatisch zodra de verbinding werkt.",
    retry: "Probeer opnieuw",
    back: "Terug naar je gegevens",
    errors: {
      network: "Geen verbinding met de App Store. Controleer je netwerk en probeer het opnieuw.",
      products: "We konden de prijzen nu niet laden.",
      productUnavailable: "Het product is tijdelijk niet beschikbaar.",
      verification: "De aankoop kon niet worden geverifieerd.",
      notSupported: "Aankopen worden gedaan in de iOS-app.",
      unknown: "Er is iets misgegaan. Probeer het opnieuw.",
    },
    legal: { terms: "Gebruiksvoorwaarden", privacy: "Privacybeleid" },
    locked: {
      title: "Het resultaat is vergrendeld",
      description: "Ontgrendel deze berekening om het resultaat en het rapport te zien.",
      cta: "Ga naar betalen",
    },
  },
  settings: {
    title: "Instellingen",
    languageTitle: "Taal",
    languageHint: "De valuta volgt het land van je adres, niet de taal.",
    premium: {
      title: "Premium",
      badge: "Meest populair",
      points: {
        calculations: "Onbeperkt berekeningen",
        pdf: "Onbeperkt PDF-rapporten",
        full: "Volledige toegang tot het resultaat",
      },
      cta: "Start Premium",
      active: "Premium is actief",
      renewal: "Wordt elk jaar automatisch verlengd. Altijd opzegbaar.",
    },
    single: {
      title: "Eén berekening",
      description: "Ontgrendelt het volledige resultaat en het PDF-rapport voor die berekening.",
      cta: "Gekocht bij je volgende berekening",
      note: "De eenmalige aankoop gebeurt wanneer je een nieuwe berekening start — niet vanaf hier.",
    },
    restore: "Herstel aankopen",
    subscription: "Beheer abonnement",
    history: "Geschiedenis",
    terms: "Gebruiksvoorwaarden",
    privacy: "Privacybeleid",
    eula: "Licentieovereenkomst (Apple)",
    reset: {
      title: "Begin opnieuw",
      confirm: "Opnieuw beginnen? Alle ingevoerde waarden in de gids worden gewist.",
    },
    historyPanel: {
      premiumActive: "Premium actief tot {{date}}",
      premiumInactive: "Geen actieve Premium",
      reports: "Ontgrendelde rapporten: {{count}}",
    },
    version: "Mr. Battery Doc · V1.0.0",
  },
  history: {
    title: "Geschiedenis",
    subtitle: "Je eerder gekochte batterijberekeningen.",
    adjustmentsLeft: "Je hebt nog {{count}} aanpassingen over van je laatste aankoop.",
    adjustmentsUnlimited: "Onbeperkt aanpassingen met Premium.",
    itemTitle: "Batterijberekening",
    benefit: "Geschat voordeel {{value}}",
    open: "Open resultaat",
    edit: "Wijzig gegevens",
    notVerified:
      "De aankoop kon niet op dit apparaat worden geverifieerd. Probeer 'Herstel aankopen'.",
    empty: {
      title: "Nog geen geschiedenis",
      text: "Berekeningen die je ontgrendelt, worden hier verzameld.",
    },
    missing: {
      intro: "Deze berekening is hier niet opgeslagen.",
      title: "Resultaat ontbreekt op dit apparaat",
      text: "Berekeningen worden lokaal opgeslagen. Deze staat niet op dit apparaat – voer een nieuwe berekening uit om een resultaat te zien.",
    },
    locked: {
      intro: "De aankoop kon niet worden geverifieerd.",
      title: "Momenteel geen toegang",
      text: "Probeer 'Herstel aankopen' in Instellingen. Er worden nooit opnieuw kosten in rekening gebracht voor een berekening die je al hebt gekocht.",
    },
  },
  legal: {
    terms: {
      title: "Gebruiksvoorwaarden",
      p1: "Mr. Battery Doc geeft een schatting van de economie van batterijopslag op basis van de informatie die je invoert. De resultaten zijn indicatief en vormen geen financieel, technisch of juridisch advies.",
      p2: "Het kopen van een rapport ontgrendelt die specifieke berekening. Premium geeft onbeperkt berekeningen gedurende de abonnementsperiode. Aankopen worden afgehandeld door de App Store en eventuele terugbetalingen volgen de voorwaarden van Apple.",
      p3: "Wij zijn niet aansprakelijk voor beslissingen die op basis van de berekeningen worden genomen. Stroomprijzen, netdiensten en netwerkkosten kunnen in de loop van de tijd veranderen zonder dat dit invloed heeft op eerdere berekeningen.",
    },
    privacy: {
      title: "Privacybeleid",
      p1: "Alle berekeningen worden lokaal op je apparaat uitgevoerd. Je verbruiksgegevens en resultaten verlaten het apparaat nooit.",
      p2: "Aankopen worden geverifieerd via de App Store. We ontvangen of bewaren nooit betalingsgegevens.",
      p3: "Geschiedenis en instellingen worden alleen opgeslagen in de lokale opslag van het apparaat en worden verwijderd als de app wordt verwijderd.",
    },
  },
  adjustment: {
    title: "Aanpassing over",
    body: "Je hebt nog {{count}} aanpassingen over van je laatste aankoop. Ze vervallen over {{time}}.",
    continue: "Doorgaan",
    hours: "uur",
    minutes: "minuten",
    and: "en",
    lessThanMinute: "minder dan een minuut",
  },
} as const;