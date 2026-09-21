/** Danish report copy. Same structure as the Swedish source text. */
import type { ReportCopy } from "./copy";

export const da: ReportCopy = {
  title: "Batterirapport",
  brand: "Mr. Battery Doc",
  created: "Oprettet",
  perYear: "/år",
  reportIdLabel: "Rapport-ID",
  pageLabel: "Side",
  ofLabel: "af",
  engineVersionLabel: "Beregningsversion",
  notAvailable: "Oplysning mangler",
  cannotBeCalculated: "Kan ikke beregnes",
  before: "Uden batteri",
  after: "Med batteri",
  tagline: "En smartere måde at bruge din solstrøm på",
  footerTagline: "Bedre beslutninger for en lysere fremtid",

  source: {
    user: "Din oplysning",
    calculated: "Beregnet",
    default: "Standardantagelse",
    external: "Ekstern datakilde",
  },

  searchLimit: {
    atLeastCapacity: "Mindst {value}",
    atLeastPower: "Mindst {value}",
    capacityNote:
      "Analysens øvre kapacitetsgrænse er nået. Et større batteri kan give yderligere nytte.",
    powerNote:
      "Analysens øvre effektgrænse er nået. Et anlæg med højere effekt kan kræve en separat analyse.",
    bothNote:
      "Ejendommen ligger på analysens øvre dimensioneringsgrænse. Større anlæg bør dimensioneres med en udvidet teknisk gennemgang.",
  },

  summary: {
    title: "Sammenfatning",
    capacity: "Batterikapacitet",
    power: "Batterieffekt",
    benefit: "Beregnet økonomisk værdi, år 1",
    maxInvestment: "Maksimal investering ved din valgte tilbagebetalingstid",
    improvements: "Sådan forbedres ejendommen",
    selfConsumption: "Egetforbrug",
    selfSufficiency: "Selvforsyning",
    gridImport: "Netimport",
    peak: "Effekttop",
    shifted: "flyttet solstrøm",
    peakLower: "lavere top",
    recommendedBattery: "Anbefalet batteri",
    paybackLabel: "Valgt tilbagebetalingstid",
    valueSplit: "Sådan fordeler den økonomiske værdi sig",
    shiftedSolar: "Flyttet solstrøm",
    ancillaryShareNote:
      "Af den beregnede økonomiske værdi kommer {value} fra systemydelser baseret på historiske markedspriser.",
    subtitle: "Anbefalet batteri og beregnet værdi for din ejendom",
    improvementsSubtitle:
      "Batteriet gør, at du bruger mere af din egen strøm og køber mindre fra nettet.",
    selfConsumptionHint: "Andel af solstrømmen, der bruges direkte i ejendommen.",
    selfSufficiencyHint: "Andel af elforbruget, der dækkes af egen strøm.",
    gridImportHint: "Strøm købt fra nettet.",
    shiftedSolarHint:
      "Mere af din egen solproduktion bruges i ejendommen i stedet for at blive sendt ud på nettet.",
    percentagePoints: "procentpoint",
    perYearLong: "pr. år",
  },

  benefit: {
    title: "Hvor kommer værdien fra?",
    total: "Beregnet økonomisk værdi, år 1",
    energy: "Flyttet solstrøm og reduceret elkøb",
    energyHint:
      "Batteriet lagrer overskudsproduktion og bruger energien, når ejendommen har brug for den.",
    energyNoSolarHint:
      "Batteriet lader op, når strømmen er billigere, og bruges, når ejendommen har brug for den.",
    peak: "Topkapning",
    peakHint:
      "Batteriet kan kappe effekttoppe og dermed sænke omkostningen, hvor der er effekttarif.",
    ancillary: "Systemydelser",
    ancillaryHint:
      "Beregnet betaling fra den valgte ydelse ud fra historiske markedspriser og beregningens antagelser.",
    none: "Beregningen viser ingen målbar økonomisk nytte med dine nuværende oplysninger.",
    note: "Beregningen omfatter år 1. Rapporten indeholder ingen flerårig prognose, fordi beregningen ikke modellerer fremtidige priser eller nedbrydning.",
    historicalBox: "Historisk beregning – ikke en garanteret fremtidig indtægt.",
    shareOfTotal: "af totalen",
  },

  ancillary: {
    title: "Systemydelser",
    product: "Valgt ydelse",
    offered: "Tilbudt effekt",
    reservable: "Fysisk reserverbar effekt (gennemsnit)",
    technicalTitle: "Teknisk grundlag",
    technicalNote:
      "Fysisk reserverbar effekt er et separat gennemsnitsmål for reserverbarhed, ikke den effekt betalingen beregnes ud fra.",
    held: "Holdt effekt (gennemsnit)",
    monetized: "Beregnet betalbar effekt",
    availability: "Tilgængelighed",
    limiting: "Hvad begrænser batteristørrelsen",
    limitingPower: "Batterieffekt",
    limitingEnergy: "Lagret energi / SOC",
    limitingGrid: "Netkapacitet",
    limitingNone: "Ingen begrænsning",
    reservedEnergy: "Reserveret energi",
    reservedHours: "Timer med reservation",
    marketValue: "Beregnet markedsværdi",
    share: "Din andel af markedsværdien",
    customerValue: "Beregnet betaling til dig",
    priceBasis: "Prisgrundlag",
    priceBasisValue: "Historiske markedspriser",
    nominalPower: "Nominel batterieffekt",
    historicalWarning:
      "Historisk beregning – ikke en garanteret fremtidig indtægt. Den faktiske betaling afhænger blandt andet af fremtidige markedspriser, tilgængelighed, aggregatoraftaler og markedsregler.",
    noPriceData:
      "Der kan ikke beregnes en økonomisk værdi for dette marked, fordi verificerede prisdata mangler. Effekt og tilgængelighed beregnes, men ingen indtægt oplyses.",
    note: "Deltagelse kræver normalt en aggregator, prækvalifikation og en godkendt installation. Den faktiske betaling afhænger af aftale, markedsadgang og vilkår.",
  },

  ancillaryScenario: {
    title: "Sammenligning af batteristørrelser til systemydelser",
    intro:
      "Standarddimensioneringen finder ikke noget batteribehov. Nedenfor sammenlignes, hvordan forskellige batteristørrelser ville blive betalt for systemydelser.",
    notRecommendation: "Dette er et sammenligningsscenarie, ikke en anbefalet batteristørrelse.",
    technicalTitle: "Teknisk forslag",
    technicalHint:
      "Størrelsen er valgt, så mindst 95 % af den beregnede kapacitet til systemydelser for din tilslutning og forbrugsprofil kan udnyttes. Det er et teknisk forslag, ikke en påstand om det mest lønsomme batteri.",
    battery: "Batteri",
    compensation: "Betaling for systemydelser",
    totalBenefit: "Beregnet samlet nytte",
    maxInvestment: "Maksimal investering ved valgt tilbagebetalingstid",
    maxInvestmentNone: "Kan ikke beregnes",
    note: "Beregningen bygger på historiske betalingsniveauer. Faktisk betaling, tilgængelighed og mulighed for at deltage i systemydelser afhænger blandt andet af marked, aggregator og tekniske krav.",
  },

  ancillaryOnly: {
    summaryProposal: "Teknisk dimensioneringsforslag",
    summaryBenefit: "Samlet beregnet nytte",
    summaryMaxInvestment: "Maksimal investering ved valgt tilbagebetalingstid",
    summaryExplanation:
      "Beregningen gælder et batteri uden solcelleanlæg. Det tekniske dimensioneringsforslag bygger på nettilslutningen og systemydelsens tekniske krav. Derefter bruges dit forbrug til at beregne, hvor meget reserve der kan holdes tilgængelig, og den beregnede betaling.",
    comparisonIntro:
      "Sammenligningen viser, hvordan batteriets energikapacitet påvirker den beregnede nytte af systemydelser. Det tekniske forslag bygger på ydelsens krav og nettilslutningens grænser.",
    comparisonExplanation:
      "Systemydelser betales primært efter den effekt, der kan holdes tilgængelig. Når batteriet har energikapacitet nok til at opretholde den effekt, øger flere kWh ikke automatisk betalingen.",
    sizingProposal: "Teknisk dimensioneringsforslag",
    sizingExplanation:
      "kW angiver, hvor meget effekt batteriet kan levere. kWh angiver, hvor meget energi det kan lagre. Systemydelser kræver energikapacitet nok til at opretholde den reserverede effekt inden for ydelsens tekniske krav. Når kravet er opfyldt, øger flere kWh ikke automatisk betalingen.",
    serviceCompensation: "Beregnet betaling til dig",
    servicePriceBasis: "Prisgrundlag",
    servicePowerExplanation:
      "Batteriets nominelle effekt er ikke automatisk den samme som den effekt, der kan holdes tilgængelig og give betaling. Beregningen tager højde for de tekniske grænser i batteriet, systemydelsen og nettilslutningen.",
    investmentExplanation:
      "Den maksimale investering viser den samlede investering, der svarer til den valgte tilbagebetalingstid, hvis den beregnede nytte i år 1 fortsatte.",
    investmentNotAQuote:
      "Beløbet er ikke en beregnet markedspris, et tilbud eller en garanti for fremtidig lønsomhed.",
    risks: [
      "faktisk elforbrug og forbrugsprofil",
      "batteriets virkningsgrad",
      "batteriets nedbrydning",
      "batteriets tilgængelighed",
      "markedspriser for systemydelser",
      "aggregatorens vilkår og eventuelle gebyrer",
      "markedsadgang og prækvalifikation",
      "ændringer i markedsreglerne",
      "begrænsninger i elnettet",
    ],
    installer: [
      "Bekræft den foreslåede batterikapacitet.",
      "Bekræft den foreslåede batteri- og inverter-effekt.",
      "Kontrollér hovedsikring og nettilslutning.",
      "Kontrollér tilladt lade- og afladeeffekt.",
      "Kontrollér eventuelle krav fra netselskabet.",
      "Kontrollér installationen og eltavlen.",
      "Kontrollér placering og brandsikkerhed.",
      "Kontrollér garantier og forventet batterilevetid.",
      "Kontrollér, at batteriet understøtter den valgte systemydelse.",
      "Kontrollér krav fra aggregator og prækvalifikation.",
      "Kontrollér aggregatorens gebyrer og indtægtsdeling.",
      "Sammenlign det faktiske tilbud med rapportens maksimale investering.",
    ],
    faq: [
      {
        q: "Hvad betyder kW og kWh?",
        a: "kW angiver, hvor meget effekt batteriet kan levere. kWh angiver, hvor meget energi det kan lagre.",
      },
      {
        q: "Hvorfor anbefales denne batteristørrelse?",
        a: "Størrelsen er et teknisk dimensioneringsforslag baseret på nettilslutningen og systemydelsens tekniske krav. Derefter bruges dit forbrug til at beregne, hvor meget reserve der kan holdes tilgængelig, og den beregnede betaling.",
      },
      {
        q: "Hvordan beregnes betalingen for systemydelser?",
        a: "Den beregnes ud fra den effekt, der kan holdes tilgængelig, historiske markedspriser og den kundeandel, beregningen bruger.",
      },
      {
        q: "Hvorfor er batterieffekten højere end den betalbare effekt?",
        a: "Nominel batterieffekt begrænses i praksis af energikapacitet, SOC, ydelsens udholdenhedskrav og ledig plads i nettilslutningen.",
      },
      {
        q: "Hvorfor øger et større batteri ikke altid betalingen?",
        a: "Når batteriet kan opretholde den betalbare effekt i den tid, ydelsen kræver, øger yderligere energikapacitet ikke automatisk betalingen.",
      },
      {
        q: "Er betalingen for systemydelser garanteret?",
        a: "Nej. Den bygger på historiske priser og antagelser om tilgængelighed, markedsadgang og aftalevilkår.",
      },
      {
        q: "Har jeg brug for en aggregator?",
        a: "Et husstandsbatteri deltager normalt via en aggregator, som typisk håndterer markedsadgang, prækvalifikation og afregning.",
      },
      {
        q: "Hvad betyder maksimal investering?",
        a: "Det er den samlede investering, der svarer til den valgte tilbagebetalingstid, hvis den beregnede nytte i år 1 fortsatte.",
      },
      {
        q: "Er maksimal investering det samme som batteriets markedspris?",
        a: "Nej. Maksimal investering er hverken en beregnet markedspris eller et tilbud.",
      },
      {
        q: "Hvorfor kan installatørens eller aggregatorens beregning afvige?",
        a: "Forskellige antagelser om tekniske begrænsninger, priser, tilgængelighed, gebyrer, kundeandel og markedsvilkår kan give et andet resultat.",
      },
      {
        q: "Er rapporten et tilbud?",
        a: "Nej. Rapporten er beslutningsgrundlag og bør suppleres med et tilbud, et teknisk eftersyn og aggregatorens vilkår.",
      },
    ],
  },

  sizing: {
    title: "Hvorfor dette batteri?",
    capacity: "Kapacitet",
    power: "Effekt",
    cRate: "C-rate",
    physicalNeed: "Fysisk effektbehov",
    basePower: "Grundeffekt til energihåndtering",
    alternatives: "Simulerede alternativer",
    lower: "Mindre",
    yours: "Dit batteri",
    higher: "Større",
    balance:
      "Det midterste alternativ er den størrelse, hvor beregningen finder den bedste balance mellem batteristørrelse og beregnet nytte. Det er ikke en påstand om, at den er objektivt bedst i alle henseender.",
    consumerExplanation:
      "Mr. Battery Doc simulerer flere batteristørrelser ud fra ejendommens forbrug, solproduktion og valgte anvendelser. Her giver den anbefalede størrelse en god balance mellem batteristørrelse og beregnet nytte. Et større batteri giver begrænset yderligere nytte og anbefales derfor ikke.",
    recommendedLabel: "Anbefalet",
    powerTitle: "Batterieffekt: {value}",
    powerAncillaryExplanation:
      "Omkring {value} er nødvendigt til ejendommens energihåndtering. Den højere anbefalede effekt giver mere kapacitet til den valgte systemydelse.",
  },

  energy: {
    title: "Energibalance uden og med batteri",
    load: "Årsforbrug",
    pv: "Solproduktion",
    importBefore: "Netimport uden batteri",
    importAfter: "Netimport med batteri",
    exportLabel: "Eksport til nettet",
    exportBefore: "Eksport uden batteri",
    exportAfter: "Eksport med batteri",
    selfConsumptionBefore: "Egetforbrug uden batteri",
    selfConsumptionAfter: "Egetforbrug med batteri",
    selfSufficiencyBefore: "Selvforsyning uden batteri",
    selfSufficiencyAfter: "Selvforsyning med batteri",
    gridCharged: "Energi ladet fra nettet",
    shifted: "Flyttet solstrøm",
    losses: "Batteritab",
    cycles: "Ækvivalente fulde cyklusser pr. år",
  },

  grid: {
    title: "Effekt og elnet",
    fuse: "Hovedsikring",
    connection: "Nettilslutning",
    theoretical: "Teoretisk netkapacitet",
    peakBefore: "Højeste import uden batteri",
    peakAfter: "Højeste import med batteri",
    reduction: "Topkapning",
    curtailed: "Blokeret eksport",
    status: "Netvurdering",
    kwKwh:
      "kW er effekt, altså hvor meget batteriet kan lade eller aflade samtidig. kWh er energi, altså hvor meget der kan lagres.",
  },

  investment: {
    title: "Maksimal investering og tilbagebetalingstid",
    selected: "Valgt tilbagebetalingstid",
    max: "Maksimal investering",
    scenarios: "Maksimal investering ved forskellige tilbagebetalingstider",
    yourChoice: "Dit valg",
    explanation:
      "Den maksimale investering er ikke en beregnet markedspris eller et tilbud. Den viser det investeringsniveau, der passer til din valgte tilbagebetalingstid, ud fra den økonomiske værdi, beregningen giver.",
    notAQuote:
      "Beløbet er hverken en beregnet markedspris eller et tilbud. Det følger kun af den beregnede økonomiske værdi og din valgte tilbagebetalingstid.",
    unavailable:
      "Maksimal investering kan ikke beregnes, fordi beregningen ikke viser nogen positiv økonomisk værdi.",
    headline: "Dit referencepunkt for et tilbud",
    paybackText:
      "Ved en valgt tilbagebetalingstid på {years} giver beregningen en maksimal investering på cirka {amount}.",
    ancillaryDependencyTitle: "Med og uden systemydelser",
    withAncillary: "Økonomisk værdi med den valgte systemydelse",
    withoutAncillary: "Økonomisk værdi eksklusive systemydelser",
    dependencyNote:
      "Sammenligningen viser, hvor stor en del af beregningen der afhænger af den beregnede betaling for systemydelser.",
  },

  assumptions: {
    title: "Dine oplysninger og beregningens antagelser",
    property: "Ejendommen",
    battery: "Batteriet",
    economy: "Økonomi",
    ancillary: "Systemydelser",
    annualConsumption: "Årsforbrug",
    solarProduction: "Solproduktion",
    consumptionProfile: "Forbrugsprofil",
    fuse: "Hovedsikring",
    connection: "Tilslutning",
    capacity: "Kapacitet",
    power: "Effekt",
    efficiency: "Virkningsgrad tur-retur",
    socWindow: "SOC-grænser",
    reserveSoc: "Reserveret SOC",
    serviceSocUp: "Ydelses-SOC, opregulering",
    serviceSocDown: "Ydelses-SOC, nedregulering",
    maxCycles: "Maksimalt antal cyklusser pr. år",
    importPrice: "Købt strøm",
    exportPrice: "Solgt solstrøm (spotpris)",
    demandCharge: "Effekttarif",
    payback: "Valgt tilbagebetalingstid",
    market: "Valgt marked",
    share: "Antaget kundeandel",
    horizonNote:
      "Beregningsperioden er ét år. Der indgår hverken nedbrydning, prisudvikling eller diskonteringsrente i den oplyste nytte.",
  },

  risks: {
    title: "Hvad kan påvirke resultatet?",
    text: "Rapporten er beslutningsgrundlag, ikke en garanti og ikke et tilbud. Det faktiske resultat kan afvige, blandt andet på grund af:",
    items: [
      "faktisk elforbrug og forbrugsprofil",
      "faktisk solproduktion",
      "elpriser og nettariffer",
      "effekttariffer og tarifmodeller",
      "batteriets virkningsgrad og nedbrydning",
      "batteriets tilgængelighed over året",
      "priser og vilkår på markedet for systemydelser",
      "aggregatorens vilkår og eventuelle gebyrer",
      "markedsregler og begrænsninger i elnettet",
    ],
  },

  installer: {
    title: "Til gennemgang med installatøren",
    items: [
      "Bekræft, at den foreslåede batterikapacitet passer til ejendommen.",
      "Bekræft, at den foreslåede batteri- og inverter-effekt er teknisk mulig.",
      "Kontrollér hovedsikring og nettilslutning med netselskabet.",
      "Kontrollér, om installationen kræver ændringer i eltavlen.",
      "Kontrollér placering, temperaturkrav og brandsikkerhed.",
      "Kontrollér garantier og forventet batterilevetid.",
      "Kontrollér tilladt lade- og afladeeffekt.",
      "Kontrollér kompatibilitet med et eksisterende eller planlagt solcelleanlæg.",
      "Kontrollér vilkår for systemydelser, aggregator og prækvalifikation.",
      "Sammenlign tilbuddets pris med rapportens maksimale investering.",
    ],
  },

  faq: {
    title: "Ofte stillede spørgsmål",
    items: [
      {
        q: "Hvad betyder kW og kWh?",
        a: "kW er effekt, altså hvor hurtigt batteriet kan lade eller aflade. kWh er energi, altså hvor meget det kan lagre.",
      },
      {
        q: "Hvorfor anbefales denne batteristørrelse?",
        a: "Beregningen simulerer flere størrelser og vælger den, der giver den bedste balance mellem størrelse og beregnet nytte ud fra dine oplysninger.",
      },
      {
        q: "Hvad betyder egetforbrug?",
        a: "Den andel af solproduktionen, der bruges i ejendommen i stedet for at blive sendt ud på nettet.",
      },
      {
        q: "Hvad betyder selvforsyning?",
        a: "Den andel af ejendommens elforbrug, der dækkes af egen strøm i stedet for købt strøm.",
      },
      {
        q: "Hvad er topkapning?",
        a: "Batteriet kapper de højeste effekttoppe, hvilket kan sænke effekttariffen.",
      },
      {
        q: "Hvordan beregnes betalingen for systemydelser?",
        a: "Ud fra den effekt, batteriet fysisk kan holde tilgængelig, og historiske markedspriser, minus den andel, der ikke går til dig.",
      },
      {
        q: "Er indtægten fra systemydelser garanteret?",
        a: "Nej. Den bygger på historiske priser og antagelser om tilgængelighed og aftalevilkår.",
      },
      {
        q: "Hvad betyder maksimal investering?",
        a: "Cirka hvor meget batteriet må koste for at matche din valgte tilbagebetalingstid ud fra den beregnede årlige nytte.",
      },
      {
        q: "Er den maksimale investering det samme som markedsprisen?",
        a: "Nej. Den siger intet om, hvad batterier koster, kun hvad beregningen understøtter.",
      },
      {
        q: "Hvorfor kan installatørens beregning afvige?",
        a: "Forskellige antagelser om priser, forbrugsprofil, virkningsgrad, tilgængelighed og systemydelser giver forskellige resultater.",
      },
      {
        q: "Er rapporten et tilbud?",
        a: "Nej. Rapporten er beslutningsgrundlag og bør suppleres med et tilbud og en vurdering på stedet.",
      },
    ],
  },

  about: {
    pageTitle: "Vigtigt at vide",
    title: "Om denne rapport",
    items: [
      "Rapporten er beslutningsgrundlag og bør suppleres med et tilbud og en vurdering på stedet.",
      "Rapporten er ikke et tilbud og siger intet om, hvad et batteri koster på markedet.",
      "Resultatet er en beregning ud fra dine oplysninger og beregningens antagelser, ikke en garanti.",
      "Beregningen omfatter år 1.",
      "Ingen fremtidig prisudvikling indgår i beregningen.",
      "Ingen fremtidig nedbrydning af batteriet indgår i beregningen.",
    ],
  },

  terms: {
    kwKwh:
      "kW er effekt, altså hvor meget batteriet kan lade eller aflade samtidig. kWh er energi, altså hvor meget der kan lagres.",
    selfConsumption:
      "Egetforbrug er den andel af solstrømmen, der bruges i ejendommen i stedet for at blive sendt ud på nettet.",
    selfSufficiency:
      "Selvforsyning er den andel af ejendommens elforbrug, der dækkes af egen strøm i stedet for købt strøm.",
    peakShaving:
      "Topkapning betyder, at batteriet kapper de højeste effekttoppe, hvilket kan sænke effekttariffen.",
  },
};
