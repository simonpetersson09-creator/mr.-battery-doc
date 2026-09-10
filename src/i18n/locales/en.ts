/** English — fallback language for every missing key. */
export const en = {
  common: {
    appName: "Mr. Battery Doc",
    back: "Back",
    next: "Next",
    done: "Done",
    cancel: "Cancel",
    restart: "Start over",
    step: "Step {{current}} of {{total}}",
  },
  language: {
    title: "Language",
    description:
      "The language only changes the text in the app — not country, currency or the calculation.",
  },
  countries: {
    SE: "Sweden",
    NO: "Norway",
    FI: "Finland",
    DK: "Denmark",
    DE: "Germany",
  },
  marketAreas: {
    DK1: "DK1 – Western Denmark",
    DK2: "DK2 – Eastern Denmark",
  },
  reserveProduct: {
    FCR: "FCR",
    FCR_D_UP: "FCR-D up",
    generic: "grid services",
  },
  units: {
    perYear: "/yr",
    perYearShort: "kr/yr",
    kwhPerYear: "kWh/yr",
    perKwh: "{{currency}}/kWh",
    perKwMonth: "{{currency}}/kW/month",
    phases: "{{count}}-phase",
  },
  months: {
    short: {
      "0": "Jan",
      "1": "Feb",
      "2": "Mar",
      "3": "Apr",
      "4": "May",
      "5": "Jun",
      "6": "Jul",
      "7": "Aug",
      "8": "Sep",
      "9": "Oct",
      "10": "Nov",
      "11": "Dec",
    },
  },
  intro: {
    lead: "Answer a few simple questions about your property and we will help you find a suitable battery size.",
    points: {
      capacity: {
        title: "Recommended battery size and power",
        desc: "How many kWh and kW suit your property.",
      },
      usage: {
        title: "How the battery can be used",
        desc: "Self-consumption, reduced grid import, peak shaving and ancillary services.",
      },
      economy: {
        title: "Estimated financial benefit",
        desc: "What the battery can give in annual customer benefit.",
      },
      investment: {
        title: "Reasonable investment cost",
        desc: "What the battery may cost based on your desired payback time.",
      },
    },
    cta: "Get started",
    footnote: "Takes about three minutes. Your answers are saved as you go.",
  },
  network: {
    title: "Grid and main fuse",
    intro:
      "Start by choosing a country. The right grid values and standard prices are then set automatically.",
    country: { title: "Country", description: "Where is the property located?" },
    area: {
      title: "Price area",
      description: "Choose where in the country the property is located.",
      placeholder: "Choose price area",
    },
    fuse: {
      title: "Main fuse",
      description: "Usually shown on your grid invoice.",
      other: "Other main fuse",
      otherWith: "Other main fuse ({{amps}} A)",
      manualPlaceholder: "Enter manually",
    },
    values: {
      title: "Grid values",
      description: "Set automatically from the selected country.",
      voltage: "Voltage",
      phases: "Phases",
      frequency: "Frequency",
      currency: "Currency",
      standards: "Standards: {{list}}",
      confirm: "I have checked that the grid values are correct",
    },
  },
  consumption: {
    title: "Consumption",
    intro: "Choose whichever way suits you best. You can change it later.",
    modeTitle: "How do you want to enter your consumption?",
    modeAnnual: {
      title: "Annual consumption",
      description: "I know roughly how many kWh we use per year.",
    },
    modeMonthly: {
      title: "Month by month",
      description: "I have actual values for all 12 months.",
    },
    annual: {
      title: "Annual consumption",
      label: "Consumption",
      placeholder: "e.g. 20000",
    },
    monthly: {
      title: "Actual monthly consumption",
      importDescription: "Import an image, PDF or CSV",
      monthsTitle: "Imported monthly data",
    },
    profile: { title: "When do you use the most electricity?", placeholder: "Choose profile" },
  },
  production: {
    title: "Production",
    intro: "Does the property have solar panels today?",
    modeTitle: "How do you want to enter your production?",
    modeNone: { title: "No solar installation" },
    modeAnnual: {
      title: "Annual production",
      description: "I know the system size and roughly the annual production.",
    },
    modeMonthly: {
      title: "Month by month",
      description: "I have actual production values for all 12 months.",
    },
    plant: {
      title: "Installation",
      dcKwp: "Installed panel power",
      dcKwpShort: "Panel power",
      acKw: "Inverter",
      annual: "Annual production",
    },
    monthly: {
      title: "Actual monthly production",
      importDescription: "Import an image, PDF or CSV",
      monthsTitle: "Imported monthly data",
    },
    self: {
      title: "Self-consumption of solar power (optional)",
      label: "Self-consumption",
      placeholder: "e.g. 45",
      hint: "The share of your solar production used directly in the property. If you do not know the value we calculate it from your consumption and production.",
    },
  },
  strategies: {
    title: "Battery",
    intro: "Everything is on from the start. Turn off what is not relevant to you.",
    solar: {
      title: "Optimised self-consumption of solar energy",
      description: "Store solar power and use it when the sun is not producing.",
    },
    gridImport: {
      title: "Reduced grid import",
      description: "Use the battery to reduce the amount of electricity bought from the grid.",
    },
    peak: {
      title: "Peak shaving",
      description: "Reduce the property's power peaks and any demand charge.",
    },
    ancillary: {
      title: "Grid services",
      description: "Reserve battery power for the electricity grid and get paid.",
    },
    noSolarNote:
      "You have stated that the property has no solar panels. Self-consumption of solar power therefore gives no benefit today — the other uses are unaffected.",
  },
  economics: {
    customerShare: {
      title: "Ancillary services",
      description: "The full market value rarely reaches you. Enter the share you expect to receive.",
      label: "Your share of the ancillary value",
      hint: "Estimate. Your actual share depends on aggregator, BRP, fees and contract terms.",
    },
    title: "Economy",
    intro: "Standard values for {{country}}. Change them if you want.",
    prices: {
      title: "Electricity prices",
      description:
        "Standard values used to compare different battery solutions. Check your actual electricity bill for purchased power, and use your own view of future prices for exported solar power.",
    },
    importPrice: { label: "Purchased electricity", hint: "Check your electricity bill." },
    exportPrice: { label: "Exported solar power", hint: "Use your own view of the future." },
    demandCharge: {
      label: "Demand charge",
      hintDefault:
        "Standard value based on the selected country. Change it if you know your grid operator's demand charge.",
      hintZero:
        "No demand charge assumed. Change it if your grid operator charges for peak power.",
    },
  },
  payback: {
    title: "Payback period",
    intro: "How quickly do you want the battery to pay for itself?",
    card: "Desired payback period",
    years: "{{years}} years",
    investment: {
      title: "Reasonable investment cost",
      hint: "Approximate maximum investment to reach the chosen payback period, based on the calculated annual customer benefit.",
      note: "Ancillary services are counted at your share of {{share}} %.",
      none: "With your current data the battery gives no positive calculated annual benefit, so no reasonable investment cost can be derived.",
      benefit: "Calculated annual customer benefit",
    },
  },
  results: {
    investment: {
      title: "Investment",
      targetPayback: "Desired payback period",
      maxInvestment: "Reasonable investment cost",
      benefit: "Calculated annual customer benefit",
    },
    title: "Result",
    intro: "This is the proposal for your property.",
    pdfReport: "Show PDF report",
    pdfReportPending: "The PDF report is on its way and cannot be shown yet.",
    incomplete: {
      intro: "We need a little more information.",
      title: "Fill in what is missing",
      description:
        "The calculation only starts when all data is there — we never guess for you.",
    },
    error: {
      intro: "Something went wrong.",
      title: "The calculation could not be completed",
      description:
        "Go back, check your data and try again. We would rather show nothing than an invented result.",
    },
    noBattery: {
      badge: "Conclusion",
      title: "No battery is recommended",
      text: "With your current data a battery does not give enough benefit to be recommended.",
    },
    hero: { title: "Recommended battery" },
    bestChoice: "Best choice",
    level: { lower: "Lower", recommended: "Recommended", higher: "Higher" },
    balance: {
      base: "Best balance between battery size and calculated benefit.",
      higher: "Best balance between battery size and calculated benefit.",
      higherAncillary: "Best balance between battery size and calculated benefit.",
    },
    improvements: {
      title: "How the property improves",
      summaryShifted: "{{value}} shifted solar energy",
      summaryPeak: "{{value}} lower power peak",
    },
    energy: {
      title: "Energy",
      selfConsumption: "Self-consumption",
      selfSufficiency: "Self-sufficiency",
      gridImport: "Grid import",
      shiftedSolar: "Shifted solar power",
      recoveredCurtailment: "Recovered curtailed solar power",
    },
    power: {
      title: "Power",
      peak: "Power peak",
      reduction: "Reduction",
      noReduction: "No reduction of the power peak with the selected settings.",
    },
    benefit: {
      ancillaryTitle: "Ancillary services",
      ancillaryCustomerHint: "Your calculated compensation.",
      ancillaryMarket: "Historical market value of ancillary services",
      ancillaryShare: "Your share of the ancillary value",
      ancillaryShareHint:
        "The share is an estimate. Your actual compensation depends on aggregator, balance responsible party, fees and contract terms.",
      ancillaryCustomer: "Your calculated compensation",
      title: "Calculated benefit",
      none: "With the selected settings the battery gives no calculated financial benefit.",
      energyWithSolar: "Shifted solar power and reduced purchases",
      energyNoSolar: "Reduced electricity purchases",
      energyHintSolar: "Stored solar power is used when it is needed.",
      energyHintNoSolar: "The battery charges when electricity is cheaper and is used later.",
      peak: "Peak shaving",
      peakHint: "Cuts power peaks and reduces the demand charge.",
      ancillary: "Grid services – {{product}}",
      ancillaryHint:
        "Calculated market value of the reserved battery power. Historical 2025 prices.",
      ancillaryNote:
        "Calculated market value based on historical 2025 prices. Part of the payment may go to an aggregator, balance responsible party or other market participant. The actual customer payment depends on contract, market access and terms.",
    },
    limited: {
      title: "Limited financial benefit",
      text: "The calculation shows no positive annual benefit with your current conditions and selected strategies.",
    },
    why: {
      title: "Why {{power}} kW?",
      physicalNeed: "Physical power need",
      without: "Without {{product}}",
      with: "With grid services",
      ownNeed: "For the property's own need",
      explanation:
        "The higher system power gives a larger calculated annual benefit when historical 2025 grid service prices are included. Future prices and revenues may differ.",
      textSplit:
        "The property's physical power need is about {{physical}} kW. Without {{product}}, {{without}} kW gives the highest calculated annual benefit. With historical 2025 grid service prices, {{recommended}} kW gives the highest calculated annual benefit. Future prices and revenues may differ.",
      textSimple:
        "For the property's own need {{without}} kW is enough. The higher system power of {{recommended}} kW gives a larger calculated annual benefit when historical 2025 grid service prices are included. Future prices and revenues may differ.",
      historicalNote: "Future FCR prices and revenues may be both higher and lower.",
    },
    capacityWhy: {
      none: "With your data a battery moves too little energy for a size to be recommended.",
      withSolar:
        "{{capacity}} kWh gives a good balance between how much energy the battery can move and the benefit of additional capacity. A larger battery gives relatively little extra benefit with your consumption and solar production.",
      withoutSolar:
        "{{capacity}} kWh gives a good balance between how much energy the battery can move and the benefit of additional capacity. A larger battery gives relatively little extra benefit with your consumption.",
    },
    powerWhy: {
      raised:
        "{{recommended}} kW gives the highest calculated annual benefit of the system power levels compared. The property's own power need is lower ({{physical}} kW).",
      floor:
        "{{recommended}} kW follows the battery's technical minimum in relation to the capacity. The property's own power need is lower ({{physical}} kW). A higher system power does not give a sufficiently larger calculated annual benefit.",
      matched:
        "{{recommended}} kW is sized for the property's energy flows and calculated power need ({{physical}} kW). A higher system power does not give a sufficiently larger calculated annual benefit.",
    },
    demandNote: {
      entered: "Calculated with the demand charge you entered.",
      standard: "Calculated with a standard demand charge value.",
      noTariff:
        "The power peak is reduced, but no demand charge is priced — so no financial peak saving is counted.",
    },
    sizing: {
      basePower: "Base power from physical sizing: {{power}} kW ({{crate}} C). ",
      basePhysicalUtility: "Physical energy benefit at the base power",
      withoutProduct:
        "System power with the highest calculated annual benefit without {{product}}: {{power}} kW ({{crate}} C).",
      selected:
        "After evaluating the calculated annual benefit, {{power}} kW ({{crate}} C) was chosen as the recommended system power.",
      fcrInfluenced: "Historical {{product}} revenue influenced the power choice.",
    },
  },
  technical: {
    title: "Technical details",
    calibrationGroup: "Self-consumption before the battery",
    requested: "Stated historical value",
    achieved: "Level reached by the model",
    partialNote:
      "The model has adjusted the consumption profile as far as reasonable without losing its daily pattern.",
    usageGroup: "Battery usage",
    cycles: "Cycles per year",
    powerGroup: "Power sizing",
    recommendedPower: "Recommended system power",
    physicalNeed: "Physical power need",
    heldPower: "Grid services reserved power",
    cRate: "C-rate",
  },
  importantInformation: {
    title: "Important to know",
    p1: "The result is an estimate. The real outcome may differ from the calculation.",
    p2: "Electricity prices and grid tariffs vary. Check your own contract and your grid operator's terms.",
    p3: "Grid service revenues are based on historical market prices from 2025. Future prices may be both higher and lower.",
    p4: "Part of the grid service payment goes to an aggregator, balance responsible party or other market participants. The actual customer payment is therefore lower than the calculated market value.",
    p5: "Participation in the grid services market is not guaranteed. Technical requirements, market access and contracts may be required.",
    p6: "The battery's real performance and profitability may differ depending on product, installation, degradation and use.",
    p7: "Always use an authorised or certified electrician for installation and electrical work.",
    footer:
      "Battery Doc is a calculation and decision support tool and does not replace a quote, technical design or contract terms.",
  },
  ancillary: {
    unavailableSymmetric:
      "{{where}} uses symmetric FCR. The market is configured but the calculation is not available yet – no revenue is assumed.",
    unavailableNoData:
      "Grid services cannot be calculated for {{where}} yet – verified historical price data is missing. No revenue is assumed.",
  },
  monthlyImport: {
    reading: "Reading the document…",
    reimport: "Import again",
    import: "Import monthly data",
    applied: "✓ 12 months of values imported",
    chooseSeriesTitle: "Which series should be used?",
    chooseSeriesText: "The document contains several series. Choose the one for {{kind}}.",
    kindConsumption: "consumption",
    kindProduction: "solar production",
    reviewTitle: "Check the imported values",
    annualMismatch:
      "The sum of the monthly values differs from the annual figure in the document. Check the values before continuing.",
    selfPctFound:
      "The document states {{pct}} % self-consumption. The value is used as your actual self-consumption when you approve the values.",
    sum: "Total:",
    apply: "Use values",
    missingMonths:
      "We could read {{read}} of 12 months. Check or fill in the missing values.",
  },
  errors: {
    importNoData:
      "We found no monthly data in the file. Check that the months are clearly visible.",
    importUnreadable: "The file could not be read. Try a clearer image or a PDF.",
    importTooLarge: "The file is too large. Use a file smaller than 15 MB.",
  },
  validation: {
    customerShare: "The share must be between 0 and 100 %.",
    paybackYears: "Choose a payback period between 5 and 20 years.",
    country: "Choose a country.",
    area: "Choose a price area.",
    fuse: "Enter a valid main fuse in amperes.",
    fuseGeneric: "Enter a valid main fuse.",
    confirmGrid: "Confirm that the grid values are correct before continuing.",
    months: "Fill in all 12 months with valid values.",
    monthsZero: "The monthly consumption cannot be zero.",
    annualConsumption: "Enter your annual consumption in kWh.",
    profile: "Choose the consumption profile that fits best.",
    profileGeneric: "Choose the consumption profile that resembles your property.",
    productionMonths: "Fill in all 12 months for the solar production.",
    productionAnnual: "Enter the annual solar production in kWh.",
    dcKwp: "The panel power cannot be negative.",
    acKw: "The inverter power cannot be negative.",
    importPrice: "The price of purchased electricity cannot be negative.",
    exportPrice: "The payment for exported solar power cannot be negative.",
    demandCharge: "The demand charge cannot be negative.",
    fxRateAncillary: "The exchange rate must be greater than zero when grid services are on.",
    fxRate: "The exchange rate must be greater than zero.",
  },
  meta: {
    intro: {
      title: "Mr. Battery Doc — find the right battery for your property",
      description:
        "Answer a few simple questions and find out which battery size and power rating suits your property.",
      ogTitle: "Mr. Battery Doc — the right battery for your property",
      ogDescription: "A simple guide showing battery size, power and benefit.",
    },
  },
} as const;
