/** Deutsch */
export const de = {
  common: {
    appName: "Mr. Battery Doc",
    back: "Zurück",
    next: "Weiter",
    done: "Fertig",
    cancel: "Abbrechen",
    restart: "Neu beginnen",
    step: "Schritt {{current}} von {{total}}",
  },
  language: {
    title: "Sprache",
    description:
      "Die Sprache ändert nur die Texte in der App – nicht Land, Währung oder Berechnung.",
  },
  countries: {
    SE: "Schweden",
    NO: "Norwegen",
    FI: "Finnland",
    DK: "Dänemark",
    DE: "Deutschland",
  },
  marketAreas: {
    DK1: "DK1 – Westdänemark",
    DK2: "DK2 – Ostdänemark",
  },
  reserveProduct: {
    FCR: "FCR",
    FCR_D_UP: "FCR-D up",
    generic: "Systemdienstleistungen",
  },
  units: {
    perYear: "/Jahr",
    kwhPerYear: "kWh/Jahr",
    perKwh: "{{currency}}/kWh",
    perKwMonth: "{{currency}}/kW/Monat",
    phases: "{{count}}-phasig",
  },
  months: {
    short: {
      "0": "Jan",
      "1": "Feb",
      "2": "Mär",
      "3": "Apr",
      "4": "Mai",
      "5": "Jun",
      "6": "Jul",
      "7": "Aug",
      "8": "Sep",
      "9": "Okt",
      "10": "Nov",
      "11": "Dez",
    },
  },
  intro: {
    lead: "Beantworten Sie ein paar einfache Fragen zu Ihrer Immobilie, und wir helfen Ihnen, eine passende Batteriegröße zu finden.",
    points: {
      capacity: {
        title: "Empfohlene Batteriegröße und Leistung",
        desc: "Wie viele kWh und kW zu Ihrer Immobilie passen.",
      },
      usage: {
        title: "Wie die Batterie genutzt werden kann",
        desc: "Eigenverbrauch, reduzierter Netzbezug, Spitzenlastkappung und Systemdienstleistungen.",
      },
      economy: {
        title: "Geschätzter wirtschaftlicher Nutzen",
        desc: "Welchen jährlichen Kundennutzen die Batterie bringen kann.",
      },
      investment: {
        title: "Angemessene Investitionskosten",
        desc: "Was die Batterie kosten darf, basierend auf Ihrer gewünschten Amortisationszeit.",
      },
    },
    cta: "Loslegen",
    footnote: "Dauert etwa drei Minuten. Ihre Angaben werden währenddessen gespeichert.",
  },
  network: {
    title: "Stromnetz und Hauptsicherung",
    intro:
      "Wählen Sie zuerst das Land. Danach werden Netzwerte und Standardpreise automatisch gesetzt.",
    country: { title: "Land", description: "Wo liegt die Immobilie?" },
    area: {
      title: "Preiszone",
      description: "Wählen Sie, wo im Land die Immobilie liegt.",
      placeholder: "Preiszone wählen",
    },
    fuse: {
      title: "Hauptsicherung",
      description: "Steht meist auf der Netzrechnung.",
      other: "Andere Hauptsicherung",
      otherWith: "Andere Hauptsicherung ({{amps}} A)",
      manualPlaceholder: "Manuell eingeben",
    },
    values: {
      title: "Netzwerte",
      description: "Automatisch anhand des gewählten Landes.",
      voltage: "Spannung",
      phases: "Phasen",
      frequency: "Frequenz",
      currency: "Währung",
      standards: "Standards: {{list}}",
      confirm: "Ich habe geprüft, dass die Netzwerte stimmen",
    },
  },
  consumption: {
    title: "Verbrauch",
    intro: "Wählen Sie den Weg, der Ihnen am besten passt. Sie können später wechseln.",
    modeTitle: "Wie möchten Sie Ihren Verbrauch angeben?",
    modeAnnual: {
      title: "Jahresverbrauch",
      description: "Ich weiß ungefähr, wie viele kWh wir pro Jahr verbrauchen.",
    },
    modeMonthly: {
      title: "Monat für Monat",
      description: "Ich habe echte Werte für alle 12 Monate.",
    },
    annual: {
      title: "Jahresverbrauch",
      label: "Verbrauch",
      placeholder: "z. B. 20000",
    },
    monthly: {
      title: "Tatsächlicher Monatsverbrauch",
      importDescription:
        "Bild, PDF oder CSV importieren – die Werte füllen die Monatsfelder unten.",
    },
    profile: { title: "Verbrauchsprofil", placeholder: "Profil wählen" },
  },
  production: {
    title: "Erzeugung",
    intro: "Hat die Immobilie heute eine PV-Anlage?",
    modeNone: { title: "Keine PV-Anlage" },
    modeAnnual: {
      title: "Jahresertrag",
      description: "Ich kenne die Anlagengröße und den ungefähren Jahresertrag.",
    },
    modeMonthly: {
      title: "Monat für Monat",
      description: "Ich habe echte Ertragswerte für alle 12 Monate.",
    },
    plant: {
      title: "Anlage",
      dcKwp: "Installierte Modulleistung",
      dcKwpShort: "Modulleistung",
      acKw: "Wechselrichter",
      annual: "Jahresertrag",
    },
    monthly: {
      title: "Tatsächlicher Monatsertrag",
      importDescription:
        "Bild, PDF oder CSV importieren – die Werte füllen die Monatsfelder unten.",
    },
    self: {
      title: "Eigenverbrauch des Solarstroms (optional)",
      label: "Eigenverbrauch",
      placeholder: "z. B. 45",
      hint: "Der Anteil Ihres Solarstroms, der direkt in der Immobilie genutzt wird. Wenn Sie den Wert nicht kennen, berechnen wir ihn aus Verbrauch und Erzeugung.",
    },
  },
  strategies: {
    title: "Batterie",
    intro: "Alles ist zu Beginn aktiviert. Schalten Sie ab, was für Sie nicht relevant ist.",
    solar: {
      title: "Optimierter Eigenverbrauch von Solarenergie",
      description: "Solarstrom speichern und nutzen, wenn die Sonne nicht produziert.",
    },
    gridImport: {
      title: "Weniger Netzbezug",
      description: "Die Batterie nutzen, um die aus dem Netz gekaufte Strommenge zu verringern.",
    },
    peak: {
      title: "Lastspitzenkappung",
      description: "Die Lastspitzen der Immobilie und eine eventuelle Leistungspreiskomponente senken.",
    },
    ancillary: {
      title: "Systemdienstleistungen",
      description: "Batterieleistung für das Stromnetz reservieren und eine Vergütung erhalten.",
    },
    noSolarNote:
      "Sie haben angegeben, dass die Immobilie keine PV-Anlage hat. Eigenverbrauch von Solarstrom bringt daher heute keinen Nutzen – die übrigen Anwendungen sind davon unberührt.",
  },
  economics: {
    customerShare: {
      title: "Systemdienstleistungen",
      description: "Der volle Marktwert erreicht Sie selten. Geben Sie den Anteil an, mit dem Sie rechnen.",
      label: "Ihr Anteil am Wert der Systemdienstleistungen",
      hint: "Richtwert. Ihr tatsächlicher Anteil hängt von Aggregator, Bilanzkreisverantwortlichem, Gebühren und Vertrag ab.",
    },
    title: "Wirtschaftlichkeit",
    intro: "Standardwerte für {{country}}. Bei Bedarf anpassen.",
    prices: {
      title: "Strompreise",
      description:
        "Pauschalwerte, um Batterielösungen zu vergleichen. Für bezogenen Strom Ihre Stromrechnung heranziehen und für eingespeisten Solarstrom Ihre eigene Erwartung künftiger Preise.",
    },
    importPrice: { label: "Bezogener Strom", hint: "Prüfen Sie Ihre Stromrechnung." },
    exportPrice: {
      label: "Eingespeister Solarstrom",
      hint: "Gehen Sie von Ihrer eigenen Erwartung aus.",
    },
    demandCharge: {
      label: "Leistungspreis",
      hintDefault:
        "Pauschalwert für das gewählte Land. Ändern Sie ihn, wenn Sie den Leistungspreis Ihres Netzbetreibers kennen.",
      hintZero:
        "Kein Leistungspreis angenommen. Ändern Sie ihn, wenn Ihr Netzbetreiber einen Leistungspreis erhebt.",
    },
  },
  payback: {
    title: "Amortisationszeit",
    intro: "Wie schnell soll sich der Speicher bezahlt machen?",
    card: "Gewünschte Amortisationszeit",
    years: "{{years}} Jahre",
    investment: {
      title: "Sinnvolle Investitionskosten",
      hint: "Ungefähre maximale Investition für die gewählte Amortisationszeit, basierend auf dem berechneten jährlichen Kundennutzen.",
      note: "Systemdienstleistungen werden mit Ihrem Anteil von {{share}} % berücksichtigt.",
      none: "Mit Ihren aktuellen Angaben ergibt der Speicher keinen positiven berechneten Jahresnutzen. Daher lassen sich keine sinnvollen Investitionskosten ableiten.",
      benefit: "Berechneter jährlicher Kundennutzen",
    },
  },
  results: {
    investment: {
      title: "Investition",
      targetPayback: "Gewünschte Amortisationszeit",
      maxInvestment: "Sinnvolle Investitionskosten",
      benefit: "Berechneter jährlicher Kundennutzen",
    },
    title: "Ergebnis",
    intro: "So sieht der Vorschlag für Ihre Immobilie aus.",
    pdfReport: "PDF-Bericht anzeigen",
    pdfReportPending: "Der PDF-Bericht ist in Arbeit und kann noch nicht angezeigt werden.",
    incomplete: {
      intro: "Wir brauchen noch ein paar Angaben.",
      title: "Fehlende Angaben ergänzen",
      description:
        "Die Berechnung startet erst, wenn alle Angaben vorliegen – wir raten nie für Sie.",
    },
    error: {
      intro: "Etwas ist schiefgelaufen.",
      title: "Die Berechnung konnte nicht durchgeführt werden",
      description:
        "Gehen Sie zurück, prüfen Sie Ihre Angaben und versuchen Sie es erneut. Lieber kein Ergebnis als ein erfundenes.",
    },
    noBattery: {
      badge: "Fazit",
      title: "Keine Batterie empfohlen",
      text: "Mit Ihren aktuellen Angaben bringt eine Batterie keinen ausreichenden Nutzen für eine Empfehlung.",
    },
    hero: { title: "Empfohlene Batterie" },
    level: { lower: "Kleiner", recommended: "Empfohlen", higher: "Größer" },
    balance: {
      base: "Empfohlen ist die Größe mit der besten Balance für den Energiebedarf der Immobilie.",
      higher:
        "Empfohlen ist die Größe mit der besten Balance für den Energiebedarf der Immobilie. Eine größere Batterie kann einen höheren berechneten Nutzen bringen.",
      higherAncillary:
        "Empfohlen ist die Größe mit der besten Balance für den Energiebedarf der Immobilie. Eine größere Batterie kann einen höheren berechneten Nutzen bringen, besonders mit Systemdienstleistungen.",
    },
    energy: {
      title: "Energie",
      selfConsumption: "Eigenverbrauch",
      selfSufficiency: "Autarkie",
      gridImport: "Netzbezug",
      shiftedSolar: "Verschobener Solarstrom",
      recoveredCurtailment: "Zurückgewonnener abgeregelter Solarstrom",
    },
    power: {
      title: "Leistung",
      peak: "Lastspitze",
      reduction: "Reduktion",
      noReduction: "Keine Reduktion der Lastspitze mit den gewählten Einstellungen.",
    },
    benefit: {
      ancillaryTitle: "Systemdienstleistungen",
      ancillaryCustomerHint: "Ihre berechnete Vergütung.",
      ancillaryMarket: "Historischer Marktwert der Systemdienstleistungen",
      ancillaryShare: "Ihr Anteil am Wert der Systemdienstleistungen",
      ancillaryShareHint:
        "Der Anteil ist ein Richtwert. Die tatsächliche Vergütung hängt unter anderem von Aggregator, Bilanzkreisverantwortlichem, Gebühren und Vertragsbedingungen ab.",
      ancillaryCustomer: "Ihre berechnete Vergütung",
      title: "Berechneter Nutzen",
      none: "Mit den gewählten Einstellungen bringt die Batterie keinen berechneten wirtschaftlichen Nutzen.",
      energyWithSolar: "Verschobener Solarstrom und weniger Strombezug",
      energyNoSolar: "Weniger Strombezug",
      energyHintSolar: "Gespeicherter Solarstrom wird genutzt, wenn er gebraucht wird.",
      energyHintNoSolar:
        "Die Batterie lädt, wenn der Strom günstiger ist, und wird später genutzt.",
      peak: "Lastspitzenkappung",
      peakHint: "Kappt Lastspitzen und senkt den Leistungspreis.",
      ancillary: "Systemdienstleistungen – {{product}}",
      ancillaryHint:
        "Berechneter Marktwert der reservierten Batterieleistung. Historische Preise 2025.",
      ancillaryNote:
        "Berechneter Marktwert auf Basis historischer Preise 2025. Ein Teil der Vergütung kann an Aggregatoren, Bilanzkreisverantwortliche oder andere Marktakteure gehen. Die tatsächliche Kundenvergütung hängt von Vertrag, Marktzugang und Bedingungen ab.",
    },
    limited: {
      title: "Begrenzter wirtschaftlicher Nutzen",
      text: "Die Berechnung zeigt mit Ihren aktuellen Voraussetzungen und gewählten Strategien keinen positiven jährlichen Nutzen.",
    },
    why: {
      title: "Warum {{power}} kW?",
      physicalNeed: "Physischer Leistungsbedarf",
      without: "Ohne {{product}}",
      with: "Mit Systemdienstleistung",
      ownNeed: "Für den Eigenbedarf der Immobilie",
      explanation:
        "Die höhere Systemleistung bringt einen größeren berechneten Jahresnutzen, wenn historische Preise für Systemdienstleistungen aus 2025 einbezogen werden. Künftige Preise und Erlöse können abweichen.",
      textSplit:
        "Der physische Leistungsbedarf der Immobilie liegt bei etwa {{physical}} kW. Ohne {{product}} bringt {{without}} kW den höchsten berechneten Jahresnutzen. Mit historischen Preisen für Systemdienstleistungen aus 2025 bringt {{recommended}} kW den höchsten berechneten Jahresnutzen. Künftige Preise und Erlöse können abweichen.",
      textSimple:
        "Für den Eigenbedarf der Immobilie reichen {{without}} kW. Die höhere Systemleistung von {{recommended}} kW bringt einen größeren berechneten Jahresnutzen, wenn historische Preise für Systemdienstleistungen aus 2025 einbezogen werden. Künftige Preise und Erlöse können abweichen.",
      historicalNote: "Künftige FCR-Preise und Erlöse können höher und niedriger ausfallen.",
    },
    capacityWhy: {
      none: "Mit Ihren Angaben verschiebt eine Batterie zu wenig Energie, um eine Größe zu empfehlen.",
      withSolar:
        "{{capacity}} kWh bieten eine gute Balance zwischen der verschiebbaren Energiemenge und dem Nutzen zusätzlicher Kapazität. Eine größere Batterie bringt bei Ihrem Verbrauch und Ihrer Solarerzeugung relativ wenig Zusatznutzen.",
      withoutSolar:
        "{{capacity}} kWh bieten eine gute Balance zwischen der verschiebbaren Energiemenge und dem Nutzen zusätzlicher Kapazität. Eine größere Batterie bringt bei Ihrem Verbrauch relativ wenig Zusatznutzen.",
    },
    powerWhy: {
      raised:
        "{{recommended}} kW bringt den höchsten berechneten Jahresnutzen der verglichenen Systemleistungen. Der Eigenbedarf der Immobilie ist niedriger ({{physical}} kW).",
      floor:
        "{{recommended}} kW folgt der technischen Mindestanforderung der Batterie im Verhältnis zur Kapazität. Der Eigenbedarf der Immobilie ist niedriger ({{physical}} kW). Eine höhere Systemleistung bringt keinen ausreichend größeren berechneten Jahresnutzen.",
      matched:
        "{{recommended}} kW ist auf die Energieflüsse und den berechneten Leistungsbedarf der Immobilie ausgelegt ({{physical}} kW). Eine höhere Systemleistung bringt keinen ausreichend größeren berechneten Jahresnutzen.",
    },
    demandNote: {
      entered: "Berechnet mit dem von Ihnen angegebenen Leistungspreis.",
      standard: "Berechnet mit einem pauschalen Leistungspreis.",
      noTariff:
        "Die Lastspitze sinkt, aber es ist kein Leistungspreis hinterlegt – daher wird keine wirtschaftliche Einsparung angerechnet.",
    },
    sizing: {
      basePower: "Grundleistung aus der physischen Auslegung: {{power}} kW ({{crate}} C). ",
      basePhysicalUtility: "Physischer Energienutzen bei der Grundleistung",
      withoutProduct:
        "Systemleistung mit dem höchsten berechneten Jahresnutzen ohne {{product}}: {{power}} kW ({{crate}} C).",
      selected:
        "Nach Bewertung des berechneten Jahresnutzens wurden {{power}} kW ({{crate}} C) als empfohlene Systemleistung gewählt.",
      fcrInfluenced: "Historische {{product}}-Erlöse haben die Leistungswahl beeinflusst.",
    },
  },
  technical: {
    title: "Technische Details",
    calibrationGroup: "Eigenverbrauch vor der Batterie",
    requested: "Angegebener historischer Wert",
    achieved: "Vom Modell erreichter Wert",
    partialNote:
      "Das Modell hat das Verbrauchsprofil so weit angepasst, wie es ohne Verlust des Tagesmusters sinnvoll ist.",
    usageGroup: "Batterienutzung",
    cycles: "Zyklen pro Jahr",
    powerGroup: "Leistungsauslegung",
    recommendedPower: "Empfohlene Systemleistung",
    physicalNeed: "Physischer Leistungsbedarf",
    heldPower: "Für Systemdienstleistungen reservierte Leistung",
    cRate: "C-Rate",
  },
  importantInformation: {
    title: "Wichtig zu wissen",
    p1: "Das Ergebnis ist eine Schätzung. Das tatsächliche Ergebnis kann abweichen.",
    p2: "Strompreise und Netzentgelte variieren. Prüfen Sie Ihren Vertrag und die Bedingungen Ihres Netzbetreibers.",
    p3: "Erlöse aus Systemdienstleistungen basieren auf historischen Marktpreisen aus 2025. Künftige Preise können höher und niedriger sein.",
    p4: "Ein Teil der Vergütung für Systemdienstleistungen geht an Aggregatoren, Bilanzkreisverantwortliche oder andere Marktakteure. Die tatsächliche Kundenvergütung ist daher niedriger als der berechnete Marktwert.",
    p5: "Die Teilnahme am Markt für Systemdienstleistungen ist nicht garantiert. Technische Anforderungen, Marktzugang und Verträge können erforderlich sein.",
    p6: "Die tatsächliche Leistung und Wirtschaftlichkeit der Batterie kann je nach Produkt, Installation, Degradation und Nutzung abweichen.",
    p7: "Beauftragen Sie für Installation und Elektroarbeiten immer eine zugelassene oder zertifizierte Elektrofachkraft.",
    footer:
      "Battery Doc ist ein Berechnungs- und Entscheidungswerkzeug und ersetzt weder Angebot noch technische Planung oder Vertragsbedingungen.",
  },
  ancillary: {
    unavailableSymmetric:
      "{{where}} nutzt symmetrische FCR. Der Markt ist konfiguriert, die Berechnung ist aber noch nicht verfügbar – es werden keine Erlöse angenommen.",
    unavailableNoData:
      "Systemdienstleistungen können für {{where}} noch nicht berechnet werden – es fehlen verifizierte historische Preisdaten. Es werden keine Erlöse angenommen.",
  },
  monthlyImport: {
    reading: "Dokument wird gelesen…",
    reimport: "Erneut importieren",
    import: "Monatsdaten importieren",
    applied: "✓ Werte für 12 Monate importiert",
    chooseSeriesTitle: "Welche Reihe soll verwendet werden?",
    chooseSeriesText:
      "Das Dokument enthält mehrere Reihen. Wählen Sie die Reihe für {{kind}}.",
    kindConsumption: "Verbrauch",
    kindProduction: "Solarerzeugung",
    reviewTitle: "Importierte Werte prüfen",
    annualMismatch:
      "Die Summe der Monatswerte weicht von der Jahresangabe im Dokument ab. Prüfen Sie die Werte, bevor Sie fortfahren.",
    selfPctFound:
      "Das Dokument gibt {{pct}} % Eigenverbrauch an. Der Wert wird als Ihr tatsächlicher Eigenverbrauch übernommen, wenn Sie die Werte bestätigen.",
    sum: "Summe:",
    apply: "Werte übernehmen",
    missingMonths:
      "Wir konnten {{read}} von 12 Monaten lesen. Prüfen oder ergänzen Sie die fehlenden Werte.",
  },
  errors: {
    importNoData:
      "Wir haben in der Datei keine Monatsdaten gefunden. Prüfen Sie, ob die Monate deutlich sichtbar sind.",
    importUnreadable:
      "Die Datei konnte nicht gelesen werden. Versuchen Sie ein klareres Bild oder ein PDF.",
  },
  validation: {
    customerShare: "Der Anteil muss zwischen 0 und 100 % liegen.",
    paybackYears: "Wählen Sie eine Amortisationszeit zwischen 5 und 20 Jahren.",
    country: "Land wählen.",
    area: "Preiszone wählen.",
    fuse: "Geben Sie eine gültige Hauptsicherung in Ampere an.",
    fuseGeneric: "Geben Sie eine gültige Hauptsicherung an.",
    confirmGrid: "Bestätigen Sie die Netzwerte, bevor Sie fortfahren.",
    months: "Füllen Sie alle 12 Monate mit gültigen Werten aus.",
    monthsZero: "Der Monatsverbrauch kann nicht null sein.",
    annualConsumption: "Geben Sie Ihren Jahresverbrauch in kWh an.",
    profile: "Wählen Sie das am besten passende Verbrauchsprofil.",
    profileGeneric: "Wählen Sie das Verbrauchsprofil, das Ihrer Immobilie ähnelt.",
    productionMonths: "Füllen Sie alle 12 Monate für die Solarerzeugung aus.",
    productionAnnual: "Geben Sie den Jahresertrag der PV-Anlage in kWh an.",
    dcKwp: "Die Modulleistung kann nicht negativ sein.",
    acKw: "Die Wechselrichterleistung kann nicht negativ sein.",
    importPrice: "Der Preis für bezogenen Strom kann nicht negativ sein.",
    exportPrice: "Die Vergütung für eingespeisten Solarstrom kann nicht negativ sein.",
    demandCharge: "Der Leistungspreis kann nicht negativ sein.",
    fxRateAncillary:
      "Der Wechselkurs muss größer als null sein, wenn Systemdienstleistungen aktiv sind.",
    fxRate: "Der Wechselkurs muss größer als null sein.",
  },
  meta: {
    intro: {
      title: "Mr. Battery Doc — die richtige Batterie für Ihre Immobilie",
      description:
        "Beantworten Sie ein paar einfache Fragen und erfahren Sie, welche Batteriegröße und Leistung zu Ihrer Immobilie passt.",
      ogTitle: "Mr. Battery Doc — die richtige Batterie für Ihre Immobilie",
      ogDescription: "Einfacher Leitfaden zu Batteriegröße, Leistung und Nutzen.",
    },
  },
} as const;
