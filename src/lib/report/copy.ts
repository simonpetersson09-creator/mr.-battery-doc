/**
 * REPORT COPY.
 *
 * Presentation strings for the PDF report only. Swedish is the source language and
 * English is the fallback for every other UI language, exactly like the app's central
 * i18n rule (FALLBACK_LANGUAGE = "en"). No value, number or unit is produced here.
 */

export interface ReportCopy {
  title: string;
  brand: string;
  created: string;
  perYear: string;
  reportIdLabel: string;
  pageLabel: string;
  ofLabel: string;
  engineVersionLabel: string;
  notAvailable: string;
  cannotBeCalculated: string;
  before: string;
  after: string;
  /** Brand line in the report header. */
  tagline: string;
  /** Brand line in the page footer. */
  footerTagline: string;

  source: {
    user: string;
    calculated: string;
    default: string;
    external: string;
  };

  searchLimit: {
    atLeastCapacity: string;
    atLeastPower: string;
    capacityNote: string;
    powerNote: string;
    bothNote: string;
  };

  summary: {
    title: string;
    capacity: string;
    power: string;
    benefit: string;
    maxInvestment: string;
    improvements: string;
    selfConsumption: string;
    selfSufficiency: string;
    gridImport: string;
    peak: string;
    shifted: string;
    peakLower: string;
    /** Page 1 (consumer report): recommendation headline and the value split. */
    recommendedBattery: string;
    paybackLabel: string;
    valueSplit: string;
    shiftedSolar: string;
    ancillaryShareNote: string;
    subtitle: string;
    improvementsSubtitle: string;
    selfConsumptionHint: string;
    selfSufficiencyHint: string;
    gridImportHint: string;
    shiftedSolarHint: string;
    percentagePoints: string;
    perYearLong: string;
  };

  benefit: {
    title: string;
    total: string;
    energy: string;
    energyHint: string;
    energyNoSolarHint: string;
    peak: string;
    peakHint: string;
    ancillary: string;
    ancillaryHint: string;
    none: string;
    note: string;
    /** Page 2 (consumer report). */
    historicalBox: string;
    shareOfTotal: string;
  };

  ancillary: {
    title: string;
    product: string;
    offered: string;
    reservable: string;
    technicalTitle: string;
    technicalNote: string;
    held: string;
    monetized: string;
    availability: string;
    limiting: string;
    limitingPower: string;
    limitingEnergy: string;
    limitingGrid: string;
    limitingNone: string;
    reservedEnergy: string;
    reservedHours: string;
    marketValue: string;
    share: string;
    customerValue: string;
    priceBasis: string;
    priceBasisValue: string;
    /** Page 5 (consumer report). */
    nominalPower: string;
    historicalWarning: string;
    noPriceData: string;
    note: string;
  };

  ancillaryScenario: {
    title: string;
    intro: string;
    notRecommendation: string;
    technicalTitle: string;
    technicalHint: string;
    battery: string;
    compensation: string;
    totalBenefit: string;
    maxInvestment: string;
    maxInvestmentNone: string;
    note: string;
  };

  ancillaryOnly: {
    summaryProposal: string;
    summaryBenefit: string;
    summaryMaxInvestment: string;
    summaryExplanation: string;
    comparisonIntro: string;
    comparisonExplanation: string;
    sizingProposal: string;
    sizingExplanation: string;
    serviceCompensation: string;
    servicePriceBasis: string;
    servicePowerExplanation: string;
    investmentExplanation: string;
    investmentNotAQuote: string;
    risks: string[];
    installer: string[];
    faq: { q: string; a: string }[];
  };

  sizing: {
    title: string;
    capacity: string;
    power: string;
    cRate: string;
    physicalNeed: string;
    basePower: string;
    alternatives: string;
    lower: string;
    yours: string;
    higher: string;
    balance: string;
    /** Page 3 (consumer report): no internal thresholds or algorithm wording. */
    consumerExplanation: string;
    recommendedLabel: string;
    powerTitle: string;
    powerAncillaryExplanation: string;
  };

  energy: {
    title: string;
    load: string;
    pv: string;
    importBefore: string;
    importAfter: string;
    exportLabel: string;
    exportBefore: string;
    exportAfter: string;
    selfConsumptionBefore: string;
    selfConsumptionAfter: string;
    selfSufficiencyBefore: string;
    selfSufficiencyAfter: string;
    gridCharged: string;
    shifted: string;
    losses: string;
    cycles: string;
  };

  grid: {
    title: string;
    fuse: string;
    connection: string;
    theoretical: string;
    peakBefore: string;
    peakAfter: string;
    reduction: string;
    curtailed: string;
    status: string;
    kwKwh: string;
  };

  investment: {
    title: string;
    selected: string;
    max: string;
    scenarios: string;
    yourChoice: string;
    explanation: string;
    notAQuote: string;
    unavailable: string;
    /** Page 6 (consumer report). */
    headline: string;
    paybackText: string;
    ancillaryDependencyTitle: string;
    withAncillary: string;
    withoutAncillary: string;
    dependencyNote: string;
  };

  assumptions: {
    title: string;
    property: string;
    battery: string;
    economy: string;
    ancillary: string;
    annualConsumption: string;
    solarProduction: string;
    consumptionProfile: string;
    fuse: string;
    connection: string;
    capacity: string;
    power: string;
    efficiency: string;
    socWindow: string;
    reserveSoc: string;
    serviceSocUp: string;
    serviceSocDown: string;
    maxCycles: string;
    importPrice: string;
    exportPrice: string;
    demandCharge: string;
    payback: string;
    market: string;
    share: string;
    horizonNote: string;
  };

  risks: { title: string; text: string; items: string[] };
  installer: { title: string; items: string[] };
  faq: { title: string; items: { q: string; a: string }[] };

  /** Page 8 (consumer report): "Viktigt att veta" wraps risks, checklist and this. */
  about: { pageTitle: string; title: string; items: string[] };

  /**
   * Short term explanations, printed where the term is actually used instead of in a
   * separate FAQ at the end of the report.
   */
  terms: {
    kwKwh: string;
    selfConsumption: string;
    selfSufficiency: string;
    peakShaving: string;
  };
}

const sv: ReportCopy = {
  title: "Batterirapport",
  brand: "Mr. Battery Doc",
  created: "Skapad",
  perYear: "/år",
  reportIdLabel: "Rapport-ID",
  pageLabel: "Sida",
  ofLabel: "av",
  engineVersionLabel: "Beräkningsversion",
  notAvailable: "Uppgift saknas",
  cannotBeCalculated: "Kan inte beräknas",
  before: "Utan batteri",
  after: "Med batteri",
  tagline: "Ett smartare sätt att använda din solel",
  footerTagline: "Bättre beslut för en ljusare framtid",

  source: {
    user: "Ditt värde",
    calculated: "Beräknat",
    default: "Standardantagande",
    external: "Extern datakälla",
  },

  searchLimit: {
    atLeastCapacity: "Minst {value}",
    atLeastPower: "Minst {value}",
    capacityNote:
      "Analysens övre kapacitetsgräns har nåtts. Ett större batteri kan ge ytterligare nytta.",
    powerNote:
      "Analysens övre effektgräns har nåtts. Ett system med högre effekt kan behöva analyseras separat.",
    bothNote:
      "Anläggningen ligger vid analysens övre dimensioneringsgräns. Större system bör dimensioneras med en utökad projekteringsanalys.",
  },

  summary: {
    title: "Sammanfattning",
    capacity: "Batterikapacitet",
    power: "Batterieffekt",
    benefit: "Beräknat ekonomiskt värde år 1",
    maxInvestment: "Maxinvestering vid vald återbetalningstid",
    improvements: "Så förbättras fastigheten",
    selfConsumption: "Egenanvändning",
    selfSufficiency: "Självförsörjning",
    gridImport: "Nätimport",
    peak: "Effekttopp",
    shifted: "flyttad solel",
    peakLower: "lägre effekttopp",
    recommendedBattery: "Rekommenderat batteri",
    paybackLabel: "Vald återbetalningstid",
    valueSplit: "Så fördelas det ekonomiska värdet",
    shiftedSolar: "Flyttad solel",
    ancillaryShareNote:
      "Av det beräknade ekonomiska värdet kommer {value} från stödtjänster baserat på historiska marknadspriser.",
    subtitle: "Rekommenderat batteri och beräknat värde för din fastighet",
    improvementsSubtitle:
      "Batteriet gör att du använder mer av din egen el och minskar ditt elköp.",
    selfConsumptionHint: "Andel av solelen som används direkt i fastigheten.",
    selfSufficiencyHint: "Andel av elanvändningen som täcks av egen el.",
    gridImportHint: "El som köps från elnätet.",
    shiftedSolarHint:
      "Mer av din egen solproduktion används i fastigheten i stället för att matas ut på nätet.",
    percentagePoints: "procentenheter",
    perYearLong: "per år",
  },

  benefit: {
    title: "Varifrån kommer värdet?",
    total: "Beräknat ekonomiskt värde år 1",
    energy: "Flyttad solel och minskat elköp",
    energyHint:
      "Batteriet lagrar överskottsproduktion och använder energin när fastigheten behöver den.",
    energyNoSolarHint:
      "Batteriet laddas när elen är billigare och används när fastigheten behöver den.",
    peak: "Peak shaving",
    peakHint:
      "Batteriet kan kapa effekttoppar och därmed minska kostnaden där effektavgift används.",
    ancillary: "Stödtjänster",
    ancillaryHint:
      "Beräknad ersättning från vald stödtjänst baserad på historiska marknadspriser och kalkylens antaganden.",
    none: "Beräkningen ger ingen mätbar ekonomisk nytta med dina nuvarande förutsättningar.",
    note: "Kalkylen avser år 1. Rapporten innehåller ingen flerårsprognos, eftersom beräkningen inte modellerar framtida pris- eller degraderingsutveckling.",
    historicalBox: "Historisk beräkning – inte garanterad framtida intäkt.",
    shareOfTotal: "av totalen",
  },

  ancillary: {
    title: "Stödtjänster",
    product: "Vald stödtjänst",
    offered: "Erbjuden effekt",
    reservable: "Fysiskt reserverbar effekt (medel)",
    technicalTitle: "Tekniskt underlag",
    technicalNote:
      "Fysiskt reserverbar effekt är ett separat genomsnittligt reservabilitetsmått och inte den effekt som ersättningen beräknas på.",
    held: "Hållen effekt (medel)",
    monetized: "Beräknad ersättningsgrundande effekt",
    availability: "Tillgänglighet",
    limiting: "Vad begränsar batteristorleken",
    limitingPower: "Batteriets effekt",
    limitingEnergy: "Lagrad energi / SOC",
    limitingGrid: "Nätets kapacitet",
    limitingNone: "Ingen begränsning",
    reservedEnergy: "Reserverad energi",
    reservedHours: "Timmar med reservation",
    marketValue: "Beräknat marknadsvärde",
    share: "Din andel av marknadsvärdet",
    customerValue: "Beräknad ersättning till dig",
    priceBasis: "Prisunderlag",
    priceBasisValue: "Historiska marknadspriser",
    nominalPower: "Batteriets nominella effekt",
    historicalWarning:
      "Historisk beräkning – inte garanterad framtida intäkt. Faktisk ersättning beror bland annat på framtida marknadspriser, tillgänglighet, aggregatoravtal och marknadsregler.",
    noPriceData:
      "Ekonomiskt värde kan inte beräknas för den här marknaden eftersom verifierat prisunderlag saknas. Effekt och tillgänglighet är beräknade, men ingen intäkt redovisas.",
    note: "Deltagande förutsätter normalt aggregator, förkvalificering och godkänd anläggning. Faktisk ersättning beror på avtal, marknadstillträde och villkor.",
  },

  ancillaryScenario: {
    title: "Jämförelse av batteristorlekar för stödtjänster",
    intro:
      "Den vanliga dimensioneringen ger inget batteribehov. Nedan jämförs hur olika batteristorlekar skulle ersättas för stödtjänster.",
    notRecommendation: "Detta är ett jämförelsescenario, inte en rekommenderad batteristorlek.",
    technicalTitle: "Tekniskt förslag",
    technicalHint:
      "Storleken är vald för att kunna utnyttja minst 95 % av den beräknade stödtjänstkapaciteten för din anslutning och förbrukningsprofil. Det är ett tekniskt förslag, inte ett påstående om det mest lönsamma batteriet.",
    battery: "Batteri",
    compensation: "Stödtjänstersättning",
    totalBenefit: "Beräknad total nytta",
    maxInvestment: "Maxinvestering vid vald återbetalningstid",
    maxInvestmentNone: "Kan inte beräknas",
    note: "Beräkningen bygger på historiska ersättningsnivåer. Faktisk ersättning, tillgänglighet och möjlighet att delta i stödtjänster beror bland annat på marknad, aggregator och tekniska krav.",
  },

  ancillaryOnly: {
    summaryProposal: "Tekniskt dimensioneringsförslag",
    summaryBenefit: "Beräknad total nytta",
    summaryMaxInvestment: "Maxinvestering vid vald återbetalningstid",
    summaryExplanation:
      "Beräkningen avser ett fristående batteri utan solcellsanläggning. Batteriets tekniska dimensioneringsförslag baseras på nätanslutningen och stödtjänstens tekniska krav. Din förbrukning används därefter för att beräkna hur mycket reserv som kan hållas tillgänglig och den beräknade ersättningen.",
    comparisonIntro:
      "Jämförelsen visar hur batteriets energikapacitet påverkar den beräknade stödtjänstnyttan. Det tekniska förslaget baseras på stödtjänstens tekniska krav och nätanslutningens begränsningar.",
    comparisonExplanation:
      "Stödtjänster ersätts främst utifrån den effekt som kan hållas tillgänglig. När batteriet redan har tillräcklig energikapacitet för att upprätthålla denna effekt ger ytterligare kWh inte automatiskt högre ersättning.",
    sizingProposal: "Tekniskt dimensioneringsförslag",
    sizingExplanation:
      "kW anger hur stor effekt batteriet kan leverera. kWh anger hur mycket energi batteriet kan lagra. För stödtjänster behövs tillräcklig energikapacitet för att den reserverade effekten ska kunna hållas inom tjänstens tekniska krav. När batteriet har tillräcklig energikapacitet för detta ger fler kWh inte automatiskt högre stödtjänstersättning.",
    serviceCompensation: "Beräknad ersättning till dig",
    servicePriceBasis: "Prisunderlag",
    servicePowerExplanation:
      "Batteriets nominella effekt är inte automatiskt samma som den effekt som kan hållas tillgänglig och ligga till grund för ersättningen. Beräkningen tar hänsyn till batteriets, stödtjänstens och nätanslutningens tekniska begränsningar.",
    investmentExplanation:
      "Maxinvesteringen visar vilken total investering som motsvarar den valda återbetalningstiden om den beräknade nyttan för år 1 skulle bestå.",
    investmentNotAQuote:
      "Beloppet är inte ett uppskattat marknadspris, en offert eller en garanti för framtida lönsamhet.",
    risks: [
      "faktisk elanvändning och lastprofil",
      "batteriets verkningsgrad",
      "batteriets degradering",
      "batteriets tillgänglighet",
      "priser på stödtjänstmarknaden",
      "aggregatorns villkor och eventuella avgifter",
      "marknadstillträde och förkvalificering",
      "förändrade marknadsregler",
      "nätbegränsningar",
    ],
    installer: [
      "Bekräfta föreslagen batterikapacitet.",
      "Bekräfta föreslagen batteri- och växelriktareffekt.",
      "Kontrollera huvudsäkring och nätanslutning.",
      "Kontrollera tillåten laddnings- och urladdningseffekt.",
      "Kontrollera eventuella krav från nätföretaget.",
      "Kontrollera installation och elcentral.",
      "Kontrollera installationsplats och brandskydd.",
      "Kontrollera garantier och batterilivslängd.",
      "Kontrollera att batteriet stöder aktuell stödtjänst.",
      "Kontrollera aggregator och förkvalificering.",
      "Kontrollera aggregatorns avgifter och intäktsdelning.",
      "Jämför faktisk offert med rapportens maxinvestering.",
    ],
    faq: [
      {
        q: "Vad betyder kW och kWh?",
        a: "kW anger hur stor effekt batteriet kan leverera. kWh anger hur mycket energi batteriet kan lagra.",
      },
      {
        q: "Varför rekommenderas just den här batteristorleken?",
        a: "Storleken är ett tekniskt dimensioneringsförslag baserat på nätanslutningen och stödtjänstens tekniska krav. Din förbrukning används därefter för att beräkna hur mycket reserv som kan hållas tillgänglig och den beräknade ersättningen.",
      },
      {
        q: "Hur beräknas ersättningen från stödtjänster?",
        a: "Den beräknas från den effekt som kan hållas tillgänglig, historiska marknadspriser och den kundandel som används i kalkylen.",
      },
      {
        q: "Varför är batterieffekten högre än den ersättningsgrundande effekten?",
        a: "Batteriets nominella effekt begränsas i praktiken av bland annat energikapacitet, SOC, tjänstens uthållighetskrav och nätanslutningens tillgängliga utrymme.",
      },
      {
        q: "Varför ger ett större batteri inte alltid högre stödtjänstersättning?",
        a: "När batteriet redan kan hålla den ersättningsgrundande effekten under tjänstens tekniska krav ger ytterligare energikapacitet inte automatiskt högre ersättning.",
      },
      {
        q: "Är ersättningen från stödtjänster garanterad?",
        a: "Nej. Den bygger på historiska priser och antaganden om tillgänglighet, marknadstillträde och avtalsvillkor.",
      },
      {
        q: "Behöver jag en aggregator?",
        a: "Ett villabatteri deltar normalt via en aggregator. Aggregatorn hanterar vanligen marknadstillträde, förkvalificering och avräkning.",
      },
      {
        q: "Vad betyder maxinvestering?",
        a: "Det är den totalinvestering som motsvarar vald återbetalningstid om den beräknade nyttan för år 1 skulle bestå.",
      },
      {
        q: "Är maxinvesteringen samma sak som batteriets marknadspris?",
        a: "Nej. Maxinvesteringen är varken ett uppskattat marknadspris eller en offert.",
      },
      {
        q: "Varför kan installatörens eller aggregatorns kalkyl skilja sig?",
        a: "Andra antaganden om tekniska begränsningar, priser, tillgänglighet, avgifter, kundandel och marknadsvillkor kan ge ett annat resultat.",
      },
      {
        q: "Är rapporten en offert?",
        a: "Nej. Rapporten är ett beslutsunderlag och ska kompletteras med offert, teknisk kontroll och aggregatorns villkor.",
      },
    ],
  },

  sizing: {
    title: "Varför detta batteri?",
    capacity: "Kapacitet",
    power: "Effekt",
    cRate: "C-rate",
    physicalNeed: "Fysiskt effektbehov",
    basePower: "Grundeffekt för energihantering",
    alternatives: "Simulerade alternativ",
    lower: "Mindre",
    yours: "Ditt batteri",
    higher: "Större",
    balance:
      "Mittenalternativet är den storlek beräkningen ger bäst balans mellan batteristorlek och beräknad nytta. Det är inte ett påstående om att det är objektivt bäst i alla avseenden.",
    consumerExplanation:
      "Mr. Battery Doc simulerar flera batteristorlekar utifrån fastighetens förbrukning, solproduktion och valda användningsområden. Den rekommenderade storleken ger i detta fall en bra balans mellan batteristorlek och beräknad nytta. Ett större batteri ger begränsad ytterligare nytta och rekommenderas därför inte.",
    recommendedLabel: "Rekommenderat",
    powerTitle: "Batteriets effekt: {value}",
    powerAncillaryExplanation:
      "Cirka {value} behövs för fastighetens energihantering. Den högre rekommenderade effekten möjliggör större kapacitet för vald stödtjänst.",
  },

  energy: {
    title: "Energibalans utan och med batteri",
    load: "Årsförbrukning",
    pv: "Solproduktion",
    importBefore: "Nätimport utan batteri",
    importAfter: "Nätimport med batteri",
    exportLabel: "Export till nätet",
    exportBefore: "Export utan batteri",
    exportAfter: "Export med batteri",
    selfConsumptionBefore: "Egenanvändning utan batteri",
    selfConsumptionAfter: "Egenanvändning med batteri",
    selfSufficiencyBefore: "Självförsörjning utan batteri",
    selfSufficiencyAfter: "Självförsörjning med batteri",
    gridCharged: "Laddad energi från nätet",
    shifted: "Flyttad solel",
    losses: "Batteriförluster",
    cycles: "Ekvivalenta cykler per år",
  },

  grid: {
    title: "Effekt och nät",
    fuse: "Huvudsäkring",
    connection: "Nätanslutning",
    theoretical: "Teoretisk nätkapacitet",
    peakBefore: "Högsta import utan batteri",
    peakAfter: "Högsta import med batteri",
    reduction: "Peak shaving",
    curtailed: "Blockerad export",
    status: "Nätbedömning",
    kwKwh:
      "kW är effekt, alltså hur mycket batteriet kan ladda eller ladda ur samtidigt. kWh är energi, alltså hur mycket som kan lagras.",
  },

  investment: {
    title: "Maxinvestering och återbetalningstid",
    selected: "Vald återbetalningstid",
    max: "Maxinvestering",
    scenarios: "Maxinvestering vid olika återbetalningstider",
    yourChoice: "Ditt val",
    explanation:
      "Maxinvesteringen är inte ett uppskattat marknadspris eller en offert. Den visar vilken investeringsnivå som motsvarar vald återbetalningstid utifrån kalkylens beräknade ekonomiska värde.",
    notAQuote:
      "Beloppet är inte ett uppskattat marknadspris och inte en offert. Det är enbart en följd av det beräknade ekonomiska värdet och din valda återbetalningstid.",
    unavailable:
      "Maxinvestering kan inte beräknas eftersom beräkningen inte ger något positivt ekonomiskt värde.",
    headline: "Din riktpunkt för offert",
    paybackText:
      "För vald återbetalningstid på {years} ger kalkylen en maximal investering på cirka {amount}.",
    ancillaryDependencyTitle: "Med och utan stödtjänster",
    withAncillary: "Ekonomiskt värde med vald stödtjänst",
    withoutAncillary: "Ekonomiskt värde exklusive stödtjänster",
    dependencyNote:
      "Jämförelsen visar hur stor del av kalkylen som är beroende av den beräknade stödtjänstersättningen.",
  },

  assumptions: {
    title: "Dina förutsättningar och kalkylantaganden",
    property: "Fastigheten",
    battery: "Batteriet",
    economy: "Ekonomi",
    ancillary: "Stödtjänster",
    annualConsumption: "Årsförbrukning",
    solarProduction: "Solproduktion",
    consumptionProfile: "Förbrukningsprofil",
    fuse: "Huvudsäkring",
    connection: "Anslutning",
    capacity: "Kapacitet",
    power: "Effekt",
    efficiency: "Verkningsgrad (round trip)",
    socWindow: "SOC-gränser",
    reserveSoc: "Reserverad SOC",
    serviceSocUp: "Service-SOC, uppreglering",
    serviceSocDown: "Service-SOC, nedreglering",
    maxCycles: "Maximalt antal cykler per år",
    importPrice: "Köpt el",
    exportPrice: "Såld solel (spotpris)",
    demandCharge: "Effektavgift",
    payback: "Vald återbetalningstid",
    market: "Vald marknad",
    share: "Antagen kundandel",
    horizonNote:
      "Kalkylperioden är ett år. Ingen degradering, prisutveckling eller kalkylränta ingår i den redovisade nyttan.",
  },

  risks: {
    title: "Vad kan påverka utfallet?",
    text: "Rapporten är ett beslutsunderlag, inte en garanti och inte en offert. Faktiskt utfall kan avvika, bland annat på grund av:",
    items: [
      "faktisk elanvändning och lastprofil",
      "faktisk solproduktion",
      "elpriser och nätavgifter",
      "effektavgifter och tariffmodeller",
      "batteriets verkningsgrad och degradering",
      "batteriets tillgänglighet över året",
      "priser och villkor på stödtjänstmarknaden",
      "aggregatorns villkor och eventuella avgifter",
      "marknadsregler och nätbegränsningar",
    ],
  },

  installer: {
    title: "Att gå igenom med installatören",
    items: [
      "Bekräfta att föreslagen batterikapacitet passar fastigheten.",
      "Bekräfta att föreslagen batteri- och växelriktareffekt är tekniskt möjlig.",
      "Kontrollera huvudsäkring och nätanslutning med nätföretaget.",
      "Kontrollera om installationen kräver ändringar i elcentralen.",
      "Kontrollera installationsplats, temperaturkrav och brandskydd.",
      "Kontrollera garantier och förväntad batterilivslängd.",
      "Kontrollera tillåten laddnings- och urladdningseffekt.",
      "Kontrollera kompatibilitet med befintlig eller planerad solcellsanläggning.",
      "Kontrollera villkor för stödtjänster, aggregator och förkvalificering.",
      "Jämför offertpriset med rapportens maxinvestering för vald återbetalningstid.",
    ],
  },

  faq: {
    title: "Vanliga frågor",
    items: [
      {
        q: "Vad betyder kW och kWh?",
        a: "kW är effekt, alltså hur snabbt batteriet kan ladda eller ladda ur. kWh är energi, alltså hur mycket som kan lagras.",
      },
      {
        q: "Varför rekommenderas just den här batteristorleken?",
        a: "Beräkningen simulerar flera storlekar och väljer den som ger bäst balans mellan storlek och beräknad nytta för dina förutsättningar.",
      },
      {
        q: "Vad betyder egenanvändning?",
        a: "Den andel av solelen som används i fastigheten i stället för att matas ut på nätet.",
      },
      {
        q: "Vad betyder självförsörjning?",
        a: "Den andel av fastighetens elanvändning som täcks av egen el i stället för av köpt el.",
      },
      {
        q: "Vad är peak shaving?",
        a: "Att batteriet kapar de högsta effekttopparna, vilket kan minska effektavgiften.",
      },
      {
        q: "Hur beräknas ersättningen från stödtjänster?",
        a: "Utifrån hur mycket effekt batteriet fysiskt kan hålla tillgänglig och historiska marknadspriser, med avdrag för den andel som inte tillfaller dig.",
      },
      {
        q: "Är ersättningen från stödtjänster garanterad?",
        a: "Nej. Den bygger på historiska priser och antaganden om tillgänglighet och avtalsvillkor.",
      },
      {
        q: "Vad betyder maxinvestering?",
        a: "Ungefär hur mycket batteriet får kosta för att motsvara den återbetalningstid du valt, utifrån den beräknade årliga nyttan.",
      },
      {
        q: "Är maxinvesteringen samma sak som batteriets marknadspris?",
        a: "Nej. Den säger ingenting om vad batterier kostar, bara vad kalkylen tål.",
      },
      {
        q: "Varför kan installatörens kalkyl skilja sig från rapporten?",
        a: "Olika antaganden om elpriser, förbrukningsprofil, verkningsgrad, tillgänglighet och stödtjänster ger olika resultat.",
      },
      {
        q: "Är rapporten en offert?",
        a: "Nej. Rapporten är ett beslutsunderlag och ska kompletteras med offert och installatörens bedömning på plats.",
      },
    ],
  },

  about: {
    pageTitle: "Viktigt att veta",
    title: "Om rapporten",
    items: [
      "Rapporten är ett beslutsunderlag och ska kompletteras med offert och installatörens bedömning på plats.",
      "Rapporten är inte en offert och säger ingenting om vad ett batteri kostar på marknaden.",
      "Resultatet är en beräkning utifrån dina uppgifter och kalkylens antaganden, inte en garanti.",
      "Kalkylen avser år 1.",
      "Ingen framtida prisutveckling ingår i beräkningen.",
      "Ingen framtida degradering av batteriet ingår i beräkningen.",
    ],
  },

  terms: {
    kwKwh:
      "kW är effekt, alltså hur mycket batteriet kan ladda eller ladda ur samtidigt. kWh är energi, alltså hur mycket som kan lagras.",
    selfConsumption:
      "Egenanvändning är den andel av solelen som används i fastigheten i stället för att matas ut på nätet.",
    selfSufficiency:
      "Självförsörjning är den andel av fastighetens elanvändning som täcks av egen el i stället för av köpt el.",
    peakShaving:
      "Peak shaving innebär att batteriet kapar de högsta effekttopparna, vilket kan minska effektavgiften.",
  },
};

const en: ReportCopy = {
  title: "Battery report",
  brand: "Mr. Battery Doc",
  created: "Created",
  perYear: "/yr",
  reportIdLabel: "Report ID",
  pageLabel: "Page",
  ofLabel: "of",
  engineVersionLabel: "Calculation version",
  notAvailable: "Not available",
  cannotBeCalculated: "Cannot be calculated",
  before: "Without battery",
  after: "With battery",
  tagline: "A smarter way to use your electricity",
  footerTagline: "Better decisions for a brighter future",

  source: {
    user: "Your value",
    calculated: "Calculated",
    default: "Default assumption",
    external: "External data source",
  },

  searchLimit: {
    atLeastCapacity: "At least {value}",
    atLeastPower: "At least {value}",
    capacityNote:
      "The upper capacity limit of the analysis has been reached. A larger battery may add further benefit.",
    powerNote:
      "The upper power limit of the analysis has been reached. A system with higher power may need a separate analysis.",
    bothNote:
      "The property is at the upper sizing limit of the analysis. Larger systems should be sized with an extended engineering study.",
  },

  summary: {
    title: "Summary",
    capacity: "Battery capacity",
    power: "Battery power",
    benefit: "Estimated economic value, year 1",
    maxInvestment: "Maximum investment at your chosen payback time",
    improvements: "How the property improves",
    selfConsumption: "Self-consumption",
    selfSufficiency: "Self-sufficiency",
    gridImport: "Grid import",
    peak: "Peak power",
    shifted: "solar shifted",
    peakLower: "lower peak",
    recommendedBattery: "Recommended battery",
    paybackLabel: "Chosen payback time",
    valueSplit: "How the economic value is distributed",
    shiftedSolar: "Shifted solar",
    ancillaryShareNote:
      "Of the estimated economic value, {value} comes from ancillary services based on historical market prices.",
    subtitle: "Recommended battery and estimated value for your property",
    improvementsSubtitle:
      "The battery lets you use more of your own electricity and buy less from the grid.",
    selfConsumptionHint: "Share of the solar electricity used directly in the property.",
    selfSufficiencyHint: "Share of electricity use covered by your own electricity.",
    gridImportHint: "Electricity bought from the grid.",
    shiftedSolarHint:
      "More of your own solar production is used in the property instead of being exported to the grid.",
    percentagePoints: "percentage points",
    perYearLong: "per year",
  },

  benefit: {
    title: "Where does the value come from?",
    total: "Estimated economic value, year 1",
    energy: "Shifted solar and reduced electricity purchase",
    energyHint:
      "The battery stores surplus production and uses the energy when the property needs it.",
    energyNoSolarHint:
      "The battery charges when electricity is cheaper and is used when the property needs it.",
    peak: "Peak shaving",
    peakHint:
      "The battery can cut peak power and thereby reduce the cost where a demand charge applies.",
    ancillary: "Ancillary services",
    ancillaryHint:
      "Estimated compensation from the selected service, based on historical market prices and the assumptions of the calculation.",
    none: "The calculation shows no measurable economic benefit with your current inputs.",
    note: "The calculation covers year 1. The report contains no multi-year forecast, because the calculation does not model future prices or degradation.",
    historicalBox: "Historical calculation – not a guaranteed future income.",
    shareOfTotal: "of the total",
  },

  ancillary: {
    title: "Ancillary services",
    product: "Selected service",
    offered: "Offered power",
    reservable: "Physically reservable power (average)",
    technicalTitle: "Technical basis",
    technicalNote:
      "Physically reservable power is a separate average reservability measure, not the power the compensation is calculated from.",
    held: "Held power (average)",
    monetized: "Estimated compensable power",
    availability: "Availability",
    limiting: "What limits the battery size",
    limitingPower: "Battery power",
    limitingEnergy: "Stored energy / SOC",
    limitingGrid: "Grid capacity",
    limitingNone: "No limitation",
    reservedEnergy: "Reserved energy",
    reservedHours: "Hours with reservation",
    marketValue: "Estimated market value",
    share: "Your share of the market value",
    customerValue: "Estimated compensation to you",
    priceBasis: "Price basis",
    priceBasisValue: "Historical market prices",
    nominalPower: "Nominal battery power",
    historicalWarning:
      "Historical calculation – not a guaranteed future income. Actual compensation depends on future market prices, availability, aggregator agreements and market rules, among other factors.",
    noPriceData:
      "No economic value can be calculated for this market because verified price data is missing. Power and availability are calculated, but no revenue is reported.",
    note: "Participation normally requires an aggregator, prequalification and an approved installation. Actual compensation depends on contract, market access and terms.",
  },

  ancillaryScenario: {
    title: "Comparison of battery sizes for ancillary services",
    intro:
      "The standard sizing finds no battery need. Below is a comparison of how different battery sizes would be compensated for ancillary services.",
    notRecommendation: "This is a comparison scenario, not a recommended battery size.",
    technicalTitle: "Technical proposal",
    technicalHint:
      "The size is chosen so that at least 95 % of the calculated ancillary service capacity for your connection and consumption profile can be used. It is a technical proposal, not a claim about the most profitable battery.",
    battery: "Battery",
    compensation: "Ancillary compensation",
    totalBenefit: "Calculated total benefit",
    maxInvestment: "Maximum investment at the chosen payback time",
    maxInvestmentNone: "Cannot be calculated",
    note: "The calculation is based on historical compensation levels. Actual compensation, availability and the ability to take part in ancillary services depend on the market, the aggregator and technical requirements, among other things.",
  },

  ancillaryOnly: {
    summaryProposal: "Technical sizing proposal",
    summaryBenefit: "Total estimated benefit",
    summaryMaxInvestment: "Maximum investment at the chosen payback time",
    summaryExplanation:
      "The calculation concerns a standalone battery without a solar installation. The technical sizing proposal is based on the grid connection and the technical requirements of the ancillary service. Your consumption is then used to calculate how much reserve can remain available and the estimated compensation.",
    comparisonIntro:
      "The comparison shows how battery energy capacity affects the estimated ancillary-service benefit. The technical proposal is based on the service requirements and the limits of the grid connection.",
    comparisonExplanation:
      "Ancillary services are compensated mainly according to the power that can remain available. Once the battery has enough energy capacity to sustain that power, additional kWh do not automatically increase compensation.",
    sizingProposal: "Technical sizing proposal",
    sizingExplanation:
      "kW indicates how much power the battery can deliver. kWh indicates how much energy it can store. Ancillary services require enough energy capacity to sustain the reserved power within the service's technical requirements. Once that requirement is met, additional kWh do not automatically increase compensation.",
    serviceCompensation: "Estimated compensation to you",
    servicePriceBasis: "Price basis",
    servicePowerExplanation:
      "The battery's nominal power is not automatically the same as the power that can remain available and qualify for compensation. The calculation accounts for the technical limits of the battery, the ancillary service and the grid connection.",
    investmentExplanation:
      "The maximum investment shows the total investment corresponding to the chosen payback time if the estimated year-1 benefit were to persist.",
    investmentNotAQuote:
      "The amount is not an estimated market price, a quote or a guarantee of future profitability.",
    risks: [
      "actual electricity use and load profile",
      "battery efficiency",
      "battery degradation",
      "battery availability",
      "ancillary-service market prices",
      "aggregator terms and possible fees",
      "market access and prequalification",
      "changes to market rules",
      "grid constraints",
    ],
    installer: [
      "Confirm the proposed battery capacity.",
      "Confirm the proposed battery and inverter power.",
      "Check the main fuse and grid connection.",
      "Check the permitted charge and discharge power.",
      "Check any requirements from the grid operator.",
      "Check the installation and distribution board.",
      "Check the installation location and fire safety.",
      "Check warranties and expected battery lifetime.",
      "Check that the battery supports the selected ancillary service.",
      "Check the aggregator and prequalification requirements.",
      "Check aggregator fees and revenue sharing.",
      "Compare the actual quote with the report's maximum investment.",
    ],
    faq: [
      {
        q: "What do kW and kWh mean?",
        a: "kW indicates how much power the battery can deliver. kWh indicates how much energy it can store.",
      },
      {
        q: "Why is this battery size recommended?",
        a: "The size is a technical sizing proposal based on the grid connection and the ancillary service's technical requirements. Your consumption is then used to calculate how much reserve can remain available and the estimated compensation.",
      },
      {
        q: "How is ancillary-service compensation calculated?",
        a: "It is calculated from the power that can remain available, historical market prices and the customer share used by the calculation.",
      },
      {
        q: "Why is battery power higher than compensable power?",
        a: "Nominal battery power is constrained in practice by energy capacity, SOC, service endurance requirements and available grid headroom.",
      },
      {
        q: "Why does a larger battery not always increase compensation?",
        a: "Once the battery can sustain the compensable power for the service's technical requirements, additional energy capacity does not automatically increase compensation.",
      },
      {
        q: "Is ancillary-service compensation guaranteed?",
        a: "No. It is based on historical prices and assumptions about availability, market access and contract terms.",
      },
      {
        q: "Do I need an aggregator?",
        a: "A residential battery normally participates through an aggregator, which usually handles market access, prequalification and settlement.",
      },
      {
        q: "What does maximum investment mean?",
        a: "It is the total investment corresponding to the chosen payback time if the estimated year-1 benefit were to persist.",
      },
      {
        q: "Is maximum investment the same as the battery's market price?",
        a: "No. Maximum investment is neither an estimated market price nor a quote.",
      },
      {
        q: "Why can the installer's or aggregator's calculation differ?",
        a: "Different assumptions about technical constraints, prices, availability, fees, customer share and market terms can produce a different result.",
      },
      {
        q: "Is the report a quote?",
        a: "No. The report is decision support and should be complemented by a quote, a technical inspection and the aggregator's terms.",
      },
    ],
  },

  sizing: {
    title: "Why this battery?",
    capacity: "Capacity",
    power: "Power",
    cRate: "C-rate",
    physicalNeed: "Physical power need",
    basePower: "Base power for energy handling",
    alternatives: "Simulated alternatives",
    lower: "Smaller",
    yours: "Your battery",
    higher: "Larger",
    balance:
      "The middle alternative is the size the calculation finds the best balance between battery size and estimated benefit. It is not a claim that it is objectively best in every respect.",
    consumerExplanation:
      "Mr. Battery Doc simulates several battery sizes based on the property's consumption, solar production and selected uses. In this case the recommended size gives a good balance between battery size and estimated benefit. A larger battery adds limited further benefit and is therefore not recommended.",
    recommendedLabel: "Recommended",
    powerTitle: "Battery power: {value}",
    powerAncillaryExplanation:
      "About {value} is needed for the property's energy handling. The higher recommended power enables more capacity for the selected ancillary service.",
  },

  energy: {
    title: "Energy balance without and with battery",
    load: "Annual consumption",
    pv: "Solar production",
    importBefore: "Grid import without battery",
    importAfter: "Grid import with battery",
    exportLabel: "Grid export",
    exportBefore: "Export without battery",
    exportAfter: "Export with battery",
    selfConsumptionBefore: "Self-consumption without battery",
    selfConsumptionAfter: "Self-consumption with battery",
    selfSufficiencyBefore: "Self-sufficiency without battery",
    selfSufficiencyAfter: "Self-sufficiency with battery",
    gridCharged: "Energy charged from the grid",
    shifted: "Shifted solar",
    losses: "Battery losses",
    cycles: "Equivalent full cycles per year",
  },

  grid: {
    title: "Power and grid",
    fuse: "Main fuse",
    connection: "Grid connection",
    theoretical: "Theoretical grid capacity",
    peakBefore: "Highest import without battery",
    peakAfter: "Highest import with battery",
    reduction: "Peak shaving",
    curtailed: "Blocked export",
    status: "Grid assessment",
    kwKwh:
      "kW is power, how much the battery can charge or discharge at once. kWh is energy, how much it can store.",
  },

  investment: {
    title: "Maximum investment and payback time",
    selected: "Chosen payback time",
    max: "Maximum investment",
    scenarios: "Maximum investment at different payback times",
    yourChoice: "Your choice",
    explanation:
      "The maximum investment is not an estimated market price or a quote. It shows the investment level that matches your chosen payback time, based on the economic value the calculation produces.",
    notAQuote:
      "The amount is not an estimated market price and not a quote. It only follows from the estimated economic value and your chosen payback time.",
    unavailable:
      "Maximum investment cannot be calculated because the calculation shows no positive economic value.",
    headline: "Your reference point for a quote",
    paybackText:
      "For a chosen payback time of {years}, the calculation gives a maximum investment of approximately {amount}.",
    ancillaryDependencyTitle: "With and without ancillary services",
    withAncillary: "Economic value with the selected ancillary service",
    withoutAncillary: "Economic value excluding ancillary services",
    dependencyNote:
      "The comparison shows how much of the calculation depends on the estimated ancillary compensation.",
  },

  assumptions: {
    title: "Your inputs and calculation assumptions",
    property: "The property",
    battery: "The battery",
    economy: "Economy",
    ancillary: "Ancillary services",
    annualConsumption: "Annual consumption",
    solarProduction: "Solar production",
    consumptionProfile: "Consumption profile",
    fuse: "Main fuse",
    connection: "Connection",
    capacity: "Capacity",
    power: "Power",
    efficiency: "Round-trip efficiency",
    socWindow: "SOC limits",
    reserveSoc: "Reserved SOC",
    serviceSocUp: "Service SOC, upward regulation",
    serviceSocDown: "Service SOC, downward regulation",
    maxCycles: "Maximum cycles per year",
    importPrice: "Purchased electricity",
    exportPrice: "Sold solar (spot price)",
    demandCharge: "Demand charge",
    payback: "Chosen payback time",
    market: "Selected market",
    share: "Assumed customer share",
    horizonNote:
      "The calculation period is one year. No degradation, price development or discount rate is included in the reported benefit.",
  },

  risks: {
    title: "What can affect the outcome?",
    text: "The report is decision support, not a guarantee and not a quote. The actual outcome may differ, among other things because of:",
    items: [
      "actual electricity use and load profile",
      "actual solar production",
      "electricity prices and grid fees",
      "demand charges and tariff models",
      "battery efficiency and degradation",
      "battery availability over the year",
      "prices and terms on the ancillary service market",
      "aggregator terms and possible fees",
      "market rules and grid constraints",
    ],
  },

  installer: {
    title: "To go through with the installer",
    items: [
      "Confirm that the proposed battery capacity suits the property.",
      "Confirm that the proposed battery and inverter power is technically possible.",
      "Check the main fuse and grid connection with the grid operator.",
      "Check whether the installation requires changes to the distribution board.",
      "Check installation location, temperature requirements and fire safety.",
      "Check warranties and expected battery lifetime.",
      "Check the permitted charge and discharge power.",
      "Check compatibility with an existing or planned solar installation.",
      "Check terms for ancillary services, aggregator and prequalification.",
      "Compare the quoted price with the maximum investment in this report.",
    ],
  },

  faq: {
    title: "Frequently asked questions",
    items: [
      {
        q: "What do kW and kWh mean?",
        a: "kW is power, how fast the battery can charge or discharge. kWh is energy, how much it can store.",
      },
      {
        q: "Why is this battery size recommended?",
        a: "The calculation simulates several sizes and picks the one with the best balance between size and estimated benefit for your inputs.",
      },
      {
        q: "What does self-consumption mean?",
        a: "The share of solar production used in the property instead of exported to the grid.",
      },
      {
        q: "What does self-sufficiency mean?",
        a: "The share of the property's electricity use covered by own electricity instead of purchased electricity.",
      },
      {
        q: "What is peak shaving?",
        a: "The battery cuts the highest power peaks, which can reduce the demand charge.",
      },
      {
        q: "How is ancillary service compensation calculated?",
        a: "From the power the battery can physically keep available and historical market prices, less the share that does not go to you.",
      },
      {
        q: "Is the ancillary service revenue guaranteed?",
        a: "No. It is based on historical prices and assumptions about availability and contract terms.",
      },
      {
        q: "What does maximum investment mean?",
        a: "Roughly how much the battery may cost to match your chosen payback time, given the calculated annual benefit.",
      },
      {
        q: "Is the maximum investment the same as the market price?",
        a: "No. It says nothing about what batteries cost, only what the calculation supports.",
      },
      {
        q: "Why can the installer's calculation differ?",
        a: "Different assumptions about prices, load profile, efficiency, availability and ancillary services give different results.",
      },
      {
        q: "Is the report a quote?",
        a: "No. The report is decision support and should be complemented with a quote and an on-site assessment.",
      },
    ],
  },

  about: {
    pageTitle: "Important to know",
    title: "About this report",
    items: [
      "The report is decision support and should be complemented with a quote and an on-site assessment.",
      "The report is not a quote and says nothing about what a battery costs on the market.",
      "The result is a calculation based on your inputs and the assumptions of the calculation, not a guarantee.",
      "The calculation covers year 1.",
      "No future price development is included in the calculation.",
      "No future battery degradation is included in the calculation.",
    ],
  },

  terms: {
    kwKwh:
      "kW is power, how much the battery can charge or discharge at once. kWh is energy, how much it can store.",
    selfConsumption:
      "Self-consumption is the share of solar production used in the property instead of exported to the grid.",
    selfSufficiency:
      "Self-sufficiency is the share of the property's electricity use covered by own electricity instead of purchased electricity.",
    peakShaving:
      "Peak shaving means the battery cuts the highest peaks, which can reduce the demand charge.",
  },
};

/** Swedish is the source language; unknown languages fall back to English. */
export function getReportCopy(language: string): ReportCopy {
  switch (language) {
    case "sv":
      return sv;
    case "da":
      return da;
    case "fi":
      return fiCopy;
    case "de":
      return deCopy;
    default:
      return en;
  }
}

