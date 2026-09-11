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
  engineVersionLabel: string;
  notAvailable: string;
  cannotBeCalculated: string;
  before: string;
  after: string;

  source: {
    user: string;
    calculated: string;
    default: string;
    external: string;
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
    noPriceData: string;
    note: string;
  };

  sizing: {
    title: string;
    capacity: string;
    power: string;
    cRate: string;
    physicalNeed: string;
    alternatives: string;
    lower: string;
    yours: string;
    higher: string;
    balance: string;
  };

  energy: {
    title: string;
    load: string;
    pv: string;
    importBefore: string;
    importAfter: string;
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
}

const sv: ReportCopy = {
  title: "Batterirapport",
  brand: "Mr. Battery Doc",
  created: "Skapad",
  perYear: "/år",
  reportIdLabel: "Rapport-ID",
  engineVersionLabel: "Beräkningsversion",
  notAvailable: "Uppgift saknas",
  cannotBeCalculated: "Kan inte beräknas",
  before: "Utan batteri",
  after: "Med batteri",

  source: {
    user: "Ditt värde",
    calculated: "Beräknat",
    default: "Standardantagande",
    external: "Extern datakälla",
  },

  summary: {
    title: "Sammanfattning",
    capacity: "Batterikapacitet",
    power: "Batterieffekt",
    benefit: "Beräknad nytta",
    maxInvestment: "Maxinvestering vid vald återbetalningstid",
    improvements: "Så förbättras fastigheten",
    selfConsumption: "Egenanvändning",
    selfSufficiency: "Självförsörjning",
    gridImport: "Nätimport",
    peak: "Effekttopp",
    shifted: "flyttad solel",
    peakLower: "lägre effekttopp",
  },

  benefit: {
    title: "Beräknad nytta",
    total: "Total beräknad nytta",
    energy: "Flyttad solel och minskat elköp",
    energyHint: "Lagrad solel används när den behövs.",
    energyNoSolarHint: "Batteriet minskar elköp under dyra timmar.",
    peak: "Peak shaving",
    peakHint: "Kapar effekttoppar och minskar effektavgiften.",
    ancillary: "Stödtjänster",
    ancillaryHint: "Beräknad ersättning från valda stödtjänster.",
    none: "Beräkningen ger ingen mätbar ekonomisk nytta med dina nuvarande förutsättningar.",
    note: "Kalkylen avser år 1. Rapporten innehåller ingen flerårsprognos, eftersom beräkningen inte modellerar framtida pris- eller degraderingsutveckling.",
  },

  ancillary: {
    title: "Stödtjänster",
    product: "Vald stödtjänst",
    offered: "Erbjuden effekt",
    reservable: "Fysiskt reserverbar effekt (medel)",
    technicalTitle: "Tekniska detaljer",
    technicalNote:
      "Fysiskt reserverbar effekt är ett separat genomsnittligt reservabilitetsmått och inte den effekt som ersättningen beräknas på.",
    held: "Hållen effekt (medel)",
    monetized: "Beräknad ersättningsgrundande effekt",
    availability: "Tillgänglighet",
    limiting: "Begränsande faktor",
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
    noPriceData:
      "Ekonomiskt värde kan inte beräknas för den här marknaden eftersom verifierat prisunderlag saknas. Effekt och tillgänglighet är beräknade, men ingen intäkt redovisas.",
    note: "Deltagande förutsätter normalt aggregator, förkvalificering och godkänd anläggning. Faktisk ersättning beror på avtal, marknadstillträde och villkor.",
  },

  sizing: {
    title: "Varför detta batteri?",
    capacity: "Kapacitet",
    power: "Effekt",
    cRate: "C-rate",
    physicalNeed: "Fysiskt effektbehov",
    alternatives: "Simulerade alternativ",
    lower: "Mindre",
    yours: "Ditt batteri",
    higher: "Större",
    balance:
      "Mittenalternativet är den storlek beräkningen ger bäst balans mellan batteristorlek och beräknad nytta. Det är inte ett påstående om att det är objektivt bäst i alla avseenden.",
  },

  energy: {
    title: "Energibalans utan och med batteri",
    load: "Årsförbrukning",
    pv: "Solproduktion",
    importBefore: "Nätimport utan batteri",
    importAfter: "Nätimport med batteri",
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
      "För att nå den valda återbetalningstiden bör den totala investeringen vara högst cirka detta belopp enligt kalkylens antaganden.",
    notAQuote:
      "Beloppet är inte ett uppskattat marknadspris och inte en offert. Det är enbart en följd av den beräknade årliga nyttan och din valda återbetalningstid.",
    unavailable:
      "Maxinvestering kan inte beräknas eftersom beräkningen inte ger någon positiv årlig nytta.",
  },

  assumptions: {
    title: "Viktigaste kalkylantaganden",
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
    maxCycles: "Maximalt antal cykler per år",
    importPrice: "Köpt el",
    exportPrice: "Såld solel",
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
};

const en: ReportCopy = {
  title: "Battery report",
  brand: "Mr. Battery Doc",
  created: "Created",
  perYear: "/yr",
  reportIdLabel: "Report ID",
  engineVersionLabel: "Calculation version",
  notAvailable: "Not available",
  cannotBeCalculated: "Cannot be calculated",
  before: "Without battery",
  after: "With battery",

  source: {
    user: "Your value",
    calculated: "Calculated",
    default: "Default assumption",
    external: "External data source",
  },

  summary: {
    title: "Summary",
    capacity: "Battery capacity",
    power: "Battery power",
    benefit: "Estimated benefit",
    maxInvestment: "Maximum investment at your chosen payback time",
    improvements: "How the property improves",
    selfConsumption: "Self-consumption",
    selfSufficiency: "Self-sufficiency",
    gridImport: "Grid import",
    peak: "Peak power",
    shifted: "solar shifted",
    peakLower: "lower peak",
  },

  benefit: {
    title: "Estimated benefit",
    total: "Total estimated benefit",
    energy: "Shifted solar and reduced electricity purchase",
    energyHint: "Stored solar is used when it is needed.",
    energyNoSolarHint: "The battery reduces purchases during expensive hours.",
    peak: "Peak shaving",
    peakHint: "Cuts peak power and reduces the demand charge.",
    ancillary: "Ancillary services",
    ancillaryHint: "Estimated compensation from the selected services.",
    none: "The calculation shows no measurable economic benefit with your current inputs.",
    note: "The calculation covers year 1. The report contains no multi-year forecast, because the calculation does not model future prices or degradation.",
  },

  ancillary: {
    title: "Ancillary services",
    product: "Selected service",
    offered: "Offered power",
    reservable: "Physically reservable power (average)",
    technicalTitle: "Technical details",
    technicalNote:
      "Physically reservable power is a separate average reservability measure, not the power the compensation is calculated from.",
    held: "Held power (average)",
    monetized: "Estimated compensable power",
    availability: "Availability",
    limiting: "Limiting factor",
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
    noPriceData:
      "No economic value can be calculated for this market because verified price data is missing. Power and availability are calculated, but no revenue is reported.",
    note: "Participation normally requires an aggregator, prequalification and an approved installation. Actual compensation depends on contract, market access and terms.",
  },

  sizing: {
    title: "Why this battery?",
    capacity: "Capacity",
    power: "Power",
    cRate: "C-rate",
    physicalNeed: "Physical power need",
    alternatives: "Simulated alternatives",
    lower: "Smaller",
    yours: "Your battery",
    higher: "Larger",
    balance:
      "The middle alternative is the size the calculation finds the best balance between battery size and estimated benefit. It is not a claim that it is objectively best in every respect.",
  },

  energy: {
    title: "Energy balance without and with battery",
    load: "Annual consumption",
    pv: "Solar production",
    importBefore: "Grid import without battery",
    importAfter: "Grid import with battery",
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
      "To reach the chosen payback time, the total investment should be at most approximately this amount according to the assumptions of the calculation.",
    notAQuote:
      "The amount is not an estimated market price and not a quote. It only follows from the calculated annual benefit and your chosen payback time.",
    unavailable:
      "Maximum investment cannot be calculated because the calculation shows no positive annual benefit.",
  },

  assumptions: {
    title: "Key calculation assumptions",
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
    maxCycles: "Maximum cycles per year",
    importPrice: "Purchased electricity",
    exportPrice: "Sold solar",
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
};

/** Swedish is the source language; every other UI language falls back to English. */
export function getReportCopy(language: string): ReportCopy {
  return language === "sv" ? sv : en;
}
