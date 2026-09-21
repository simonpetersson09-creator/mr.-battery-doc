/** German report copy. Same structure as the Swedish source text. */
import type { ReportCopy } from "./copy";

export const de: ReportCopy = {
  title: "Batteriebericht",
  brand: "Mr. Battery Doc",
  created: "Erstellt",
  perYear: "/Jahr",
  reportIdLabel: "Bericht-ID",
  pageLabel: "Seite",
  ofLabel: "von",
  engineVersionLabel: "Berechnungsversion",
  notAvailable: "Angabe fehlt",
  cannotBeCalculated: "Kann nicht berechnet werden",
  before: "Ohne Batterie",
  after: "Mit Batterie",
  tagline: "Ein klügerer Weg, Ihren Solarstrom zu nutzen",
  footerTagline: "Bessere Entscheidungen für eine hellere Zukunft",

  source: {
    user: "Ihre Angabe",
    calculated: "Berechnet",
    default: "Standardannahme",
    external: "Externe Datenquelle",
  },

  searchLimit: {
    atLeastCapacity: "Mindestens {value}",
    atLeastPower: "Mindestens {value}",
    capacityNote:
      "Die obere Kapazitätsgrenze der Analyse ist erreicht. Eine größere Batterie kann weiteren Nutzen bringen.",
    powerNote:
      "Die obere Leistungsgrenze der Analyse ist erreicht. Eine Anlage mit höherer Leistung kann eine separate Analyse erfordern.",
    bothNote:
      "Das Objekt liegt an der oberen Auslegungsgrenze der Analyse. Größere Anlagen sollten mit einer erweiterten technischen Untersuchung ausgelegt werden.",
  },

  summary: {
    title: "Zusammenfassung",
    capacity: "Batteriekapazität",
    power: "Batterieleistung",
    benefit: "Berechneter wirtschaftlicher Wert, Jahr 1",
    maxInvestment: "Maximale Investition bei Ihrer gewählten Amortisationszeit",
    improvements: "So verbessert sich das Objekt",
    selfConsumption: "Eigenverbrauch",
    selfSufficiency: "Autarkie",
    gridImport: "Netzbezug",
    peak: "Leistungsspitze",
    shifted: "verschobener Solarstrom",
    peakLower: "niedrigere Spitze",
    recommendedBattery: "Empfohlene Batterie",
    paybackLabel: "Gewählte Amortisationszeit",
    valueSplit: "So verteilt sich der wirtschaftliche Wert",
    shiftedSolar: "Verschobener Solarstrom",
    ancillaryShareNote:
      "Vom berechneten wirtschaftlichen Wert stammen {value} aus Systemdienstleistungen auf Basis historischer Marktpreise.",
    subtitle: "Empfohlene Batterie und berechneter Wert für Ihr Objekt",
    improvementsSubtitle:
      "Mit der Batterie nutzen Sie mehr von Ihrem eigenen Strom und kaufen weniger aus dem Netz.",
    selfConsumptionHint: "Anteil des Solarstroms, der direkt im Objekt genutzt wird.",
    selfSufficiencyHint: "Anteil des Stromverbrauchs, der durch eigenen Strom gedeckt wird.",
    gridImportHint: "Aus dem Netz gekaufter Strom.",
    shiftedSolarHint:
      "Mehr von Ihrer eigenen Solarproduktion wird im Objekt genutzt, statt ins Netz eingespeist zu werden.",
    percentagePoints: "Prozentpunkte",
    perYearLong: "pro Jahr",
  },

  benefit: {
    title: "Woher kommt der Wert?",
    total: "Berechneter wirtschaftlicher Wert, Jahr 1",
    energy: "Verschobener Solarstrom und geringerer Stromeinkauf",
    energyHint:
      "Die Batterie speichert Überschussproduktion und nutzt die Energie, wenn das Objekt sie braucht.",
    energyNoSolarHint:
      "Die Batterie lädt, wenn Strom günstiger ist, und wird genutzt, wenn das Objekt Strom braucht.",
    peak: "Lastspitzenkappung",
    peakHint:
      "Die Batterie kann Leistungsspitzen kappen und so die Kosten senken, wo ein Leistungspreis gilt.",
    ancillary: "Systemdienstleistungen",
    ancillaryHint:
      "Berechnete Vergütung aus der gewählten Dienstleistung auf Basis historischer Marktpreise und der Annahmen der Berechnung.",
    none: "Die Berechnung zeigt mit Ihren aktuellen Angaben keinen messbaren wirtschaftlichen Nutzen.",
    note: "Die Berechnung umfasst Jahr 1. Der Bericht enthält keine mehrjährige Prognose, da die Berechnung weder künftige Preise noch Alterung modelliert.",
    historicalBox: "Historische Berechnung – keine garantierten künftigen Einnahmen.",
    shareOfTotal: "des Gesamtwerts",
  },

  ancillary: {
    title: "Systemdienstleistungen",
    product: "Gewählte Dienstleistung",
    offered: "Angebotene Leistung",
    reservable: "Physikalisch reservierbare Leistung (Durchschnitt)",
    technicalTitle: "Technische Grundlage",
    technicalNote:
      "Die physikalisch reservierbare Leistung ist ein separater Durchschnittswert der Reservierbarkeit, nicht die Leistung, aus der die Vergütung berechnet wird.",
    held: "Gehaltene Leistung (Durchschnitt)",
    monetized: "Berechnete vergütungsfähige Leistung",
    availability: "Verfügbarkeit",
    limiting: "Was die Batteriegröße begrenzt",
    limitingPower: "Batterieleistung",
    limitingEnergy: "Gespeicherte Energie / SOC",
    limitingGrid: "Netzkapazität",
    limitingNone: "Keine Begrenzung",
    reservedEnergy: "Reservierte Energie",
    reservedHours: "Stunden mit Reservierung",
    marketValue: "Berechneter Marktwert",
    share: "Ihr Anteil am Marktwert",
    customerValue: "Berechnete Vergütung für Sie",
    priceBasis: "Preisgrundlage",
    priceBasisValue: "Historische Marktpreise",
    nominalPower: "Nennleistung der Batterie",
    historicalWarning:
      "Historische Berechnung – keine garantierten künftigen Einnahmen. Die tatsächliche Vergütung hängt unter anderem von künftigen Marktpreisen, Verfügbarkeit, Aggregatorverträgen und Marktregeln ab.",
    noPriceData:
      "Für diesen Markt kann kein wirtschaftlicher Wert berechnet werden, da verifizierte Preisdaten fehlen. Leistung und Verfügbarkeit werden berechnet, Einnahmen werden nicht ausgewiesen.",
    note: "Die Teilnahme erfordert in der Regel einen Aggregator, eine Präqualifikation und eine zugelassene Installation. Die tatsächliche Vergütung hängt von Vertrag, Marktzugang und Bedingungen ab.",
  },

  ancillaryScenario: {
    title: "Vergleich von Batteriegrößen für Systemdienstleistungen",
    intro:
      "Die Standardauslegung findet keinen Batteriebedarf. Nachfolgend wird verglichen, wie verschiedene Batteriegrößen für Systemdienstleistungen vergütet würden.",
    notRecommendation: "Dies ist ein Vergleichsszenario, keine empfohlene Batteriegröße.",
    technicalTitle: "Technischer Vorschlag",
    technicalHint:
      "Die Größe ist so gewählt, dass mindestens 95 % der für Ihren Anschluss und Ihr Verbrauchsprofil berechneten Kapazität für Systemdienstleistungen genutzt werden kann. Es ist ein technischer Vorschlag, keine Aussage über die wirtschaftlichste Batterie.",
    battery: "Batterie",
    compensation: "Vergütung für Systemdienstleistungen",
    totalBenefit: "Berechneter Gesamtnutzen",
    maxInvestment: "Maximale Investition bei gewählter Amortisationszeit",
    maxInvestmentNone: "Kann nicht berechnet werden",
    note: "Die Berechnung beruht auf historischen Vergütungsniveaus. Tatsächliche Vergütung, Verfügbarkeit und die Möglichkeit zur Teilnahme an Systemdienstleistungen hängen unter anderem von Markt, Aggregator und technischen Anforderungen ab.",
  },

  ancillaryOnly: {
    summaryProposal: "Technischer Auslegungsvorschlag",
    summaryBenefit: "Berechneter Gesamtnutzen",
    summaryMaxInvestment: "Maximale Investition bei gewählter Amortisationszeit",
    summaryExplanation:
      "Die Berechnung betrifft eine Batterie ohne Solaranlage. Der technische Auslegungsvorschlag beruht auf dem Netzanschluss und den technischen Anforderungen der Systemdienstleistung. Anschließend wird mit Ihrem Verbrauch berechnet, wie viel Reserve verfügbar gehalten werden kann und wie hoch die berechnete Vergütung ist.",
    comparisonIntro:
      "Der Vergleich zeigt, wie die Energiekapazität der Batterie den berechneten Nutzen aus Systemdienstleistungen beeinflusst. Der technische Vorschlag beruht auf den Anforderungen der Dienstleistung und den Grenzen des Netzanschlusses.",
    comparisonExplanation:
      "Systemdienstleistungen werden vor allem nach der Leistung vergütet, die verfügbar gehalten werden kann. Sobald die Batterie genug Energiekapazität hat, um diese Leistung zu halten, erhöhen zusätzliche kWh die Vergütung nicht automatisch.",
    sizingProposal: "Technischer Auslegungsvorschlag",
    sizingExplanation:
      "kW gibt an, wie viel Leistung die Batterie liefern kann. kWh gibt an, wie viel Energie sie speichern kann. Systemdienstleistungen erfordern genug Energiekapazität, um die reservierte Leistung innerhalb der technischen Anforderungen zu halten. Ist diese Anforderung erfüllt, erhöhen zusätzliche kWh die Vergütung nicht automatisch.",
    serviceCompensation: "Berechnete Vergütung für Sie",
    servicePriceBasis: "Preisgrundlage",
    servicePowerExplanation:
      "Die Nennleistung der Batterie ist nicht automatisch die Leistung, die verfügbar gehalten und vergütet werden kann. Die Berechnung berücksichtigt die technischen Grenzen von Batterie, Systemdienstleistung und Netzanschluss.",
    investmentExplanation:
      "Die maximale Investition zeigt die Gesamtinvestition, die der gewählten Amortisationszeit entspricht, wenn der berechnete Nutzen aus Jahr 1 fortbestünde.",
    investmentNotAQuote:
      "Der Betrag ist weder ein berechneter Marktpreis noch ein Angebot oder eine Garantie künftiger Wirtschaftlichkeit.",
    risks: [
      "tatsächlicher Stromverbrauch und Lastprofil",
      "Wirkungsgrad der Batterie",
      "Alterung der Batterie",
      "Verfügbarkeit der Batterie",
      "Marktpreise für Systemdienstleistungen",
      "Bedingungen des Aggregators und mögliche Gebühren",
      "Marktzugang und Präqualifikation",
      "Änderungen der Marktregeln",
      "Netzbeschränkungen",
    ],
    installer: [
      "Bestätigen Sie die vorgeschlagene Batteriekapazität.",
      "Bestätigen Sie die vorgeschlagene Batterie- und Wechselrichterleistung.",
      "Prüfen Sie Hauptsicherung und Netzanschluss.",
      "Prüfen Sie die zulässige Lade- und Entladeleistung.",
      "Prüfen Sie mögliche Anforderungen des Netzbetreibers.",
      "Prüfen Sie Installation und Verteilerkasten.",
      "Prüfen Sie Aufstellort und Brandschutz.",
      "Prüfen Sie Garantien und erwartete Batterielebensdauer.",
      "Prüfen Sie, ob die Batterie die gewählte Systemdienstleistung unterstützt.",
      "Prüfen Sie die Anforderungen von Aggregator und Präqualifikation.",
      "Prüfen Sie Gebühren und Erlösaufteilung des Aggregators.",
      "Vergleichen Sie das tatsächliche Angebot mit der maximalen Investition im Bericht.",
    ],
    faq: [
      {
        q: "Was bedeuten kW und kWh?",
        a: "kW gibt an, wie viel Leistung die Batterie liefern kann. kWh gibt an, wie viel Energie sie speichern kann.",
      },
      {
        q: "Warum wird diese Batteriegröße empfohlen?",
        a: "Die Größe ist ein technischer Auslegungsvorschlag auf Basis des Netzanschlusses und der technischen Anforderungen der Systemdienstleistung. Anschließend wird mit Ihrem Verbrauch berechnet, wie viel Reserve verfügbar gehalten werden kann und wie hoch die berechnete Vergütung ist.",
      },
      {
        q: "Wie wird die Vergütung für Systemdienstleistungen berechnet?",
        a: "Aus der verfügbar gehaltenen Leistung, historischen Marktpreisen und dem in der Berechnung verwendeten Kundenanteil.",
      },
      {
        q: "Warum ist die Batterieleistung höher als die vergütungsfähige Leistung?",
        a: "Die Nennleistung wird in der Praxis durch Energiekapazität, SOC, Ausdaueranforderungen der Dienstleistung und freien Netzanschlussspielraum begrenzt.",
      },
      {
        q: "Warum erhöht eine größere Batterie die Vergütung nicht immer?",
        a: "Sobald die Batterie die vergütungsfähige Leistung über die geforderte Dauer halten kann, erhöht zusätzliche Energiekapazität die Vergütung nicht automatisch.",
      },
      {
        q: "Ist die Vergütung für Systemdienstleistungen garantiert?",
        a: "Nein. Sie beruht auf historischen Preisen und Annahmen zu Verfügbarkeit, Marktzugang und Vertragsbedingungen.",
      },
      {
        q: "Brauche ich einen Aggregator?",
        a: "Eine Hausbatterie nimmt in der Regel über einen Aggregator teil, der meist Marktzugang, Präqualifikation und Abrechnung übernimmt.",
      },
      {
        q: "Was bedeutet maximale Investition?",
        a: "Es ist die Gesamtinvestition, die der gewählten Amortisationszeit entspricht, wenn der berechnete Nutzen aus Jahr 1 fortbestünde.",
      },
      {
        q: "Ist die maximale Investition dasselbe wie der Marktpreis der Batterie?",
        a: "Nein. Die maximale Investition ist weder ein berechneter Marktpreis noch ein Angebot.",
      },
      {
        q: "Warum kann die Berechnung von Installateur oder Aggregator abweichen?",
        a: "Andere Annahmen zu technischen Grenzen, Preisen, Verfügbarkeit, Gebühren, Kundenanteil und Marktbedingungen können zu einem anderen Ergebnis führen.",
      },
      {
        q: "Ist der Bericht ein Angebot?",
        a: "Nein. Der Bericht ist eine Entscheidungsgrundlage und sollte durch ein Angebot, eine technische Prüfung und die Bedingungen des Aggregators ergänzt werden.",
      },
    ],
  },

  sizing: {
    title: "Warum diese Batterie?",
    capacity: "Kapazität",
    power: "Leistung",
    cRate: "C-Rate",
    physicalNeed: "Physikalischer Leistungsbedarf",
    basePower: "Grundleistung für die Energienutzung",
    alternatives: "Simulierte Alternativen",
    lower: "Kleiner",
    yours: "Ihre Batterie",
    higher: "Größer",
    balance:
      "Die mittlere Alternative ist die Größe, bei der die Berechnung die beste Balance zwischen Batteriegröße und berechnetem Nutzen findet. Das ist keine Aussage, dass sie in jeder Hinsicht objektiv die beste ist.",
    consumerExplanation:
      "Mr. Battery Doc simuliert mehrere Batteriegrößen anhand von Verbrauch, Solarproduktion und gewählten Nutzungen des Objekts. Hier bietet die empfohlene Größe eine gute Balance zwischen Batteriegröße und berechnetem Nutzen. Eine größere Batterie bringt nur begrenzten Zusatznutzen und wird daher nicht empfohlen.",
    recommendedLabel: "Empfohlen",
    powerTitle: "Batterieleistung: {value}",
    powerAncillaryExplanation:
      "Rund {value} werden für die Energienutzung des Objekts benötigt. Die höhere empfohlene Leistung ermöglicht mehr Kapazität für die gewählte Systemdienstleistung.",
  },

  energy: {
    title: "Energiebilanz ohne und mit Batterie",
    load: "Jahresverbrauch",
    pv: "Solarproduktion",
    importBefore: "Netzbezug ohne Batterie",
    importAfter: "Netzbezug mit Batterie",
    exportLabel: "Netzeinspeisung",
    exportBefore: "Einspeisung ohne Batterie",
    exportAfter: "Einspeisung mit Batterie",
    selfConsumptionBefore: "Eigenverbrauch ohne Batterie",
    selfConsumptionAfter: "Eigenverbrauch mit Batterie",
    selfSufficiencyBefore: "Autarkie ohne Batterie",
    selfSufficiencyAfter: "Autarkie mit Batterie",
    gridCharged: "Aus dem Netz geladene Energie",
    shifted: "Verschobener Solarstrom",
    losses: "Batterieverluste",
    cycles: "Äquivalente Vollzyklen pro Jahr",
  },

  grid: {
    title: "Leistung und Netz",
    fuse: "Hauptsicherung",
    connection: "Netzanschluss",
    theoretical: "Theoretische Netzkapazität",
    peakBefore: "Höchster Netzbezug ohne Batterie",
    peakAfter: "Höchster Netzbezug mit Batterie",
    reduction: "Lastspitzenkappung",
    curtailed: "Blockierte Einspeisung",
    status: "Netzbewertung",
    kwKwh:
      "kW ist Leistung, also wie viel die Batterie gleichzeitig laden oder entladen kann. kWh ist Energie, also wie viel gespeichert werden kann.",
  },

  investment: {
    title: "Maximale Investition und Amortisationszeit",
    selected: "Gewählte Amortisationszeit",
    max: "Maximale Investition",
    scenarios: "Maximale Investition bei verschiedenen Amortisationszeiten",
    yourChoice: "Ihre Wahl",
    explanation:
      "Die maximale Investition ist weder ein berechneter Marktpreis noch ein Angebot. Sie zeigt das Investitionsniveau, das zu Ihrer gewählten Amortisationszeit passt, basierend auf dem berechneten wirtschaftlichen Wert.",
    notAQuote:
      "Der Betrag ist weder ein berechneter Marktpreis noch ein Angebot. Er ergibt sich nur aus dem berechneten wirtschaftlichen Wert und Ihrer gewählten Amortisationszeit.",
    unavailable:
      "Die maximale Investition kann nicht berechnet werden, da die Berechnung keinen positiven wirtschaftlichen Wert zeigt.",
    headline: "Ihr Bezugspunkt für ein Angebot",
    paybackText:
      "Bei einer gewählten Amortisationszeit von {years} ergibt die Berechnung eine maximale Investition von rund {amount}.",
    ancillaryDependencyTitle: "Mit und ohne Systemdienstleistungen",
    withAncillary: "Wirtschaftlicher Wert mit der gewählten Systemdienstleistung",
    withoutAncillary: "Wirtschaftlicher Wert ohne Systemdienstleistungen",
    dependencyNote:
      "Der Vergleich zeigt, wie stark die Berechnung von der berechneten Vergütung für Systemdienstleistungen abhängt.",
  },

  assumptions: {
    title: "Ihre Angaben und die Annahmen der Berechnung",
    property: "Das Objekt",
    battery: "Die Batterie",
    economy: "Wirtschaftlichkeit",
    ancillary: "Systemdienstleistungen",
    annualConsumption: "Jahresverbrauch",
    solarProduction: "Solarproduktion",
    consumptionProfile: "Verbrauchsprofil",
    fuse: "Hauptsicherung",
    connection: "Anschluss",
    capacity: "Kapazität",
    power: "Leistung",
    efficiency: "Wirkungsgrad (Round-Trip)",
    socWindow: "SOC-Grenzen",
    reserveSoc: "Reservierter SOC",
    serviceSocUp: "Dienstleistungs-SOC, positive Regelung",
    serviceSocDown: "Dienstleistungs-SOC, negative Regelung",
    maxCycles: "Maximale Zyklen pro Jahr",
    importPrice: "Gekaufter Strom",
    exportPrice: "Verkaufter Solarstrom (Spotpreis)",
    demandCharge: "Leistungspreis",
    payback: "Gewählte Amortisationszeit",
    market: "Gewählter Markt",
    share: "Angenommener Kundenanteil",
    horizonNote:
      "Der Berechnungszeitraum beträgt ein Jahr. Alterung, Preisentwicklung und Diskontierung sind im ausgewiesenen Nutzen nicht enthalten.",
  },

  risks: {
    title: "Was kann das Ergebnis beeinflussen?",
    text: "Der Bericht ist eine Entscheidungsgrundlage, keine Garantie und kein Angebot. Das tatsächliche Ergebnis kann abweichen, unter anderem wegen:",
    items: [
      "tatsächlicher Stromverbrauch und Lastprofil",
      "tatsächliche Solarproduktion",
      "Strompreise und Netzentgelte",
      "Leistungspreise und Tarifmodelle",
      "Wirkungsgrad und Alterung der Batterie",
      "Verfügbarkeit der Batterie über das Jahr",
      "Preise und Bedingungen am Markt für Systemdienstleistungen",
      "Bedingungen des Aggregators und mögliche Gebühren",
      "Marktregeln und Netzbeschränkungen",
    ],
  },

  installer: {
    title: "Mit dem Installateur durchzugehen",
    items: [
      "Bestätigen, dass die vorgeschlagene Batteriekapazität zum Objekt passt.",
      "Bestätigen, dass die vorgeschlagene Batterie- und Wechselrichterleistung technisch möglich ist.",
      "Hauptsicherung und Netzanschluss mit dem Netzbetreiber prüfen.",
      "Prüfen, ob die Installation Änderungen am Verteilerkasten erfordert.",
      "Aufstellort, Temperaturanforderungen und Brandschutz prüfen.",
      "Garantien und erwartete Batterielebensdauer prüfen.",
      "Zulässige Lade- und Entladeleistung prüfen.",
      "Kompatibilität mit vorhandener oder geplanter Solaranlage prüfen.",
      "Bedingungen für Systemdienstleistungen, Aggregator und Präqualifikation prüfen.",
      "Den Angebotspreis mit der maximalen Investition in diesem Bericht vergleichen.",
    ],
  },

  faq: {
    title: "Häufige Fragen",
    items: [
      {
        q: "Was bedeuten kW und kWh?",
        a: "kW ist Leistung, also wie schnell die Batterie laden oder entladen kann. kWh ist Energie, also wie viel sie speichern kann.",
      },
      {
        q: "Warum wird diese Batteriegröße empfohlen?",
        a: "Die Berechnung simuliert mehrere Größen und wählt die mit der besten Balance zwischen Größe und berechnetem Nutzen für Ihre Angaben.",
      },
      {
        q: "Was bedeutet Eigenverbrauch?",
        a: "Der Anteil der Solarproduktion, der im Objekt genutzt statt ins Netz eingespeist wird.",
      },
      {
        q: "Was bedeutet Autarkie?",
        a: "Der Anteil des Stromverbrauchs im Objekt, der durch eigenen statt gekauften Strom gedeckt wird.",
      },
      {
        q: "Was ist Lastspitzenkappung?",
        a: "Die Batterie kappt die höchsten Leistungsspitzen, was den Leistungspreis senken kann.",
      },
      {
        q: "Wie wird die Vergütung für Systemdienstleistungen berechnet?",
        a: "Aus der Leistung, die die Batterie physikalisch verfügbar halten kann, und historischen Marktpreisen, abzüglich des Anteils, der nicht an Sie geht.",
      },
      {
        q: "Sind die Einnahmen aus Systemdienstleistungen garantiert?",
        a: "Nein. Sie beruhen auf historischen Preisen und Annahmen zu Verfügbarkeit und Vertragsbedingungen.",
      },
      {
        q: "Was bedeutet maximale Investition?",
        a: "Ungefähr, wie viel die Batterie kosten darf, damit Ihre gewählte Amortisationszeit mit dem berechneten Jahresnutzen erreicht wird.",
      },
      {
        q: "Ist die maximale Investition dasselbe wie der Marktpreis?",
        a: "Nein. Sie sagt nichts darüber aus, was Batterien kosten, sondern nur, was die Berechnung trägt.",
      },
      {
        q: "Warum kann die Berechnung des Installateurs abweichen?",
        a: "Andere Annahmen zu Preisen, Lastprofil, Wirkungsgrad, Verfügbarkeit und Systemdienstleistungen führen zu anderen Ergebnissen.",
      },
      {
        q: "Ist der Bericht ein Angebot?",
        a: "Nein. Der Bericht ist eine Entscheidungsgrundlage und sollte durch ein Angebot und eine Begutachtung vor Ort ergänzt werden.",
      },
    ],
  },

  about: {
    pageTitle: "Wichtig zu wissen",
    title: "Über diesen Bericht",
    items: [
      "Der Bericht ist eine Entscheidungsgrundlage und sollte durch ein Angebot und eine Begutachtung vor Ort ergänzt werden.",
      "Der Bericht ist kein Angebot und sagt nichts darüber aus, was eine Batterie am Markt kostet.",
      "Das Ergebnis ist eine Berechnung auf Basis Ihrer Angaben und der Annahmen der Berechnung, keine Garantie.",
      "Die Berechnung umfasst Jahr 1.",
      "Eine künftige Preisentwicklung ist in der Berechnung nicht enthalten.",
      "Eine künftige Alterung der Batterie ist in der Berechnung nicht enthalten.",
    ],
  },

  terms: {
    kwKwh:
      "kW ist Leistung, also wie viel die Batterie gleichzeitig laden oder entladen kann. kWh ist Energie, also wie viel gespeichert werden kann.",
    selfConsumption:
      "Eigenverbrauch ist der Anteil der Solarproduktion, der im Objekt genutzt statt ins Netz eingespeist wird.",
    selfSufficiency:
      "Autarkie ist der Anteil des Stromverbrauchs im Objekt, der durch eigenen statt gekauften Strom gedeckt wird.",
    peakShaving:
      "Lastspitzenkappung bedeutet, dass die Batterie die höchsten Leistungsspitzen kappt, was den Leistungspreis senken kann.",
  },
};
