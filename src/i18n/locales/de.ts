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
    perYearShort: "kr/Jahr",
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
      importDescription: "Bild, PDF oder CSV importieren",
      monthsTitle: "Importierte monatliche Daten",
    },
    profile: { title: "Wann verbrauchen Sie am meisten Strom?", placeholder: "Profil wählen" },
  },
  production: {
    title: "Erzeugung",
    intro: "Hat die Immobilie heute eine PV-Anlage?",
    modeTitle: "Wie möchten Sie Ihre Erzeugung angeben?",
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
      importDescription: "Bild, PDF oder CSV importieren",
      monthsTitle: "Importierte monatliche Daten",
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
    section: {
      battery: "Batterie",
      benefit: "Nutzen",
      economy: "Wirtschaft",
      details: "Details",
    },
    investment: {
      title: "Maximale Investition bei Ihrer gewählten Amortisationszeit",
      basedOn: "Basierend auf Ihrer gewählten Amortisationszeit von {{years}}",
      otherTitle: "Maximale Investition bei verschiedenen Amortisationszeiten",
      yourChoice: "Ihre Wahl",
      approx: "ca.",
      explain: "Eine kürzere Amortisationszeit bedeutet eine niedrigere maximale Investition. Hier sehen Sie, wie sich die maximale Investition verändert, wenn Sie eine kürzere oder längere Amortisationszeit akzeptieren.",
    },
    title: "Ergebnis",
    intro: "So sieht der Vorschlag für Ihre Immobilie aus.",
    pdfReport: "Bericht als PDF herunterladen",
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
    bestChoice: "Beste Wahl",
    yourBattery: "Deine Batterie",
    level: { lower: "Kleiner", recommended: "Beste Wahl", higher: "Größer" },
    balance: {
      base: "Beste Balance zwischen Batteriegröße und berechnetem Nutzen.",
      higher: "Beste Balance zwischen Batteriegröße und berechnetem Nutzen.",
      higherAncillary: "Beste Balance zwischen Batteriegröße und berechnetem Nutzen.",
    },
    improvements: {
      title: "So verbessert sich die Immobilie",
      summaryShifted: "{{value}} verschobener Solarstrom",
      summaryPeak: "{{value}} niedrigere Lastspitze",
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
      showCalculation: "Berechnung der Systemdienstleistungen anzeigen",
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
      ancillaryNote: "Berechneter Marktwert auf Basis historischer Preise 2025.",
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
    ancillaryGroup: "Systemdienstleistungen",
    reservedPower: "Reservierte Leistung",
    selectedServices: "Gewählte Systemdienstleistungen",
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
    takePhoto: "Foto aufnehmen",
    choosePhoto: "Bild auswählen",
    chooseFile: "Datei auswählen",
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
    importUnsupportedType: "Dieser Dateityp wird nicht unterstützt. Verwenden Sie ein Bild, eine PDF- oder eine CSV-Datei.",
    importCameraDenied: "Kein Kamerazugriff. Erlauben Sie die Kamera in den iPhone-Einstellungen, um Unterlagen zu fotografieren.",
    importPhotosDenied: "Kein Zugriff auf Fotos. Erlauben Sie den Zugriff in den iPhone-Einstellungen, um Unterlagen auszuwählen.",
    importNoData:
      "Wir haben in der Datei keine Monatsdaten gefunden. Prüfen Sie, ob die Monate deutlich sichtbar sind.",
    importUnreadable:
      "Die Datei konnte nicht gelesen werden. Versuchen Sie ein klareres Bild oder ein PDF.",
    importTooLarge: "Die Datei ist zu groß. Verwenden Sie eine Datei unter 15 MB.",
    importNotConfigured: "Der KI-Dienst ist nicht konfiguriert.",
    importRateLimited: "Zu viele Anfragen im Moment. Warten Sie kurz und versuchen Sie es erneut.",
    importCreditsExhausted: "Die KI-Credits sind aufgebraucht. Laden Sie auf, um Dokumente zu lesen.",
    importUnparsable: "Wir konnten den Inhalt des Dokuments nicht auswerten.",
    egValue: "z. B. {{value}}",
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
  paywall: {
    title: "Ihre Batterieberechnung ist fertig",
    subtitle: "Schalten Sie das Ergebnis und Ihren persönlichen Batteriebericht frei.",
    ready: "Berechnung abgeschlossen",
    includesTitle: "Sie erhalten Zugriff auf:",
    includes: {
      size: "Empfohlene Batteriegröße und Leistung",
      benefit: "Berechneter jährlicher Nutzen",
      selfSufficiency: "Eigenverbrauch und Autarkie vorher/nachher",
      peak: "Lastspitzenkappung und Netzwirkung",
      ancillary: "Berechnung der Systemdienstleistungen",
      investment: "Maximale Investition bei Ihrer Amortisationszeit",
      pdf: "Vollständiger persönlicher PDF-Bericht",
    },
    premium: {
      label: "Premium · 1 Jahr",
      badge: "Bester Wert",
      description: "Unbegrenzte Berechnungen und Berichte für 1 Jahr.",
      cta: "Premium starten",
      value: "Premium lohnt sich ab 5 Berichten pro Jahr.",
      renewal:
        "{{price}}. Das Abonnement verlängert sich automatisch, sofern es nicht gemäß den App-Store-Bedingungen gekündigt wird.",
      loadingPrice: "Preis wird geladen…",
    },
    single: {
      label: "Ein Bericht",
      description: "Diese Berechnung und den PDF-Bericht freischalten.",
      cta: "Bericht für {{price}} kaufen",
      ctaPending: "Bericht kaufen",
      loadingPrice: "Preis wird geladen…",
    },
    priceUnavailable: "Der Preis kommt aus dem App Store.",
    restore: "Käufe wiederherstellen",
    restoring: "Wird wiederhergestellt…",
    restored: "Premium wiederhergestellt.",
    restoreNothing: "Kein aktives Abonnement gefunden.",
    processing: "Kauf wird verarbeitet…",
    pending: "Der Kauf wartet auf Freigabe. Das Ergebnis wird danach freigeschaltet.",
    unresolved: "Der Kauf wurde getätigt, konnte aber noch nicht bestätigt werden. Wir schließen ihn automatisch ab, sobald die Verbindung steht.",
    retry: "Erneut versuchen",
    back: "Zurück zu Ihren Angaben",
    errors: {
      network: "Keine Verbindung zum App Store. Bitte Netzwerk prüfen und erneut versuchen.",
      products: "Die Preise konnten gerade nicht geladen werden.",
      productUnavailable: "Das Produkt ist vorübergehend nicht verfügbar.",
      verification: "Der Kauf konnte nicht verifiziert werden.",
      notSupported: "Käufe erfolgen in der iOS-App.",
      unknown: "Etwas ist schiefgelaufen. Bitte erneut versuchen.",
    },
    legal: { terms: "Nutzungsbedingungen", privacy: "Datenschutzerklärung" },
    locked: {
      title: "Das Ergebnis ist gesperrt",
      description: "Schalten Sie diese Berechnung frei, um Ergebnis und Bericht zu sehen.",
      cta: "Zur Freischaltung",
    },
  },
  settings: {
    title: "Einstellungen",
    languageTitle: "Sprache",
    languageHint: "Die Währung richtet sich nach dem Land Ihrer Adresse, nicht nach der Sprache.",
    premium: {
      title: "Premium",
      badge: "Am beliebtesten",
      points: {
        calculations: "Unbegrenzte Berechnungen",
        pdf: "Unbegrenzte PDF-Berichte",
        full: "Voller Zugriff auf das Ergebnis",
      },
      cta: "Premium starten",
      active: "Premium ist aktiv",
      renewal: "Verlängert sich automatisch jährlich. Jederzeit kündbar.",
    },
    single: {
      title: "Eine Berechnung",
      description: "Schaltet das vollständige Ergebnis und den PDF-Bericht für diese Berechnung frei.",
      cta: "Wird bei Ihrer nächsten Berechnung gekauft",
      note: "Der Einmalkauf erfolgt beim Start einer neuen Berechnung – nicht hier.",
    },
    restore: "Käufe wiederherstellen",
    subscription: "Abonnement verwalten",
    history: "Verlauf",
    terms: "Nutzungsbedingungen",
    privacy: "Datenschutzerklärung",
    eula: "Lizenzvereinbarung (Apple)",
    historyPanel: {
      premiumActive: "Premium aktiv bis {{date}}",
      premiumInactive: "Kein aktives Premium",
      reports: "Freigeschaltete Berichte: {{count}}",
    },
    version: "Mr. Battery Doc · V1.0.0",
  },
  history: {
    title: "Verlauf",
    subtitle: "Ihre bereits gekauften Batterieberechnungen.",
    itemTitle: "Batterieberechnung",
    benefit: "Berechneter Nutzen {{value}}",
    open: "Ergebnis öffnen",
    edit: "Angaben ändern",
    notVerified: "Der Kauf konnte auf diesem Gerät nicht bestätigt werden. Versuchen Sie „Käufe wiederherstellen“.",
    empty: {
      title: "Noch kein Verlauf",
      text: "Hier sammeln sich die Berechnungen, die Sie freigeschaltet haben.",
    },
    missing: {
      intro: "Diese Berechnung ist hier nicht gespeichert.",
      title: "Ergebnis auf diesem Gerät nicht vorhanden",
      text: "Berechnungen werden lokal gespeichert. Diese liegt nicht auf diesem Gerät – starten Sie eine neue Berechnung.",
    },
    locked: {
      intro: "Der Kauf konnte nicht bestätigt werden.",
      title: "Derzeit kein Zugriff",
      text: "Versuchen Sie „Käufe wiederherstellen“ in den Einstellungen. Für eine bereits gekaufte Berechnung zahlen Sie nie erneut.",
    },
  },
  legal: {
    terms: {
      title: "Nutzungsbedingungen",
      p1: "Mr. Battery Doc erstellt eine Schätzung der Wirtschaftlichkeit von Batteriespeichern auf Grundlage Ihrer Angaben. Die Ergebnisse sind Richtwerte und stellen keine Finanz-, Technik- oder Rechtsberatung dar.",
      p2: "Der Kauf eines Berichts schaltet die jeweilige Berechnung frei. Premium ermöglicht unbegrenzte Berechnungen während der Abonnementlaufzeit. Käufe werden über den App Store abgewickelt, Erstattungen richten sich nach Apples Bedingungen.",
      p3: "Wir haften nicht für Entscheidungen auf Grundlage der Berechnungen. Strompreise, Regelleistung und Netzentgelte können sich ändern, ohne ältere Berechnungen zu verändern.",
    },
    privacy: {
      title: "Datenschutzerklärung",
      p1: "Alle Berechnungen laufen lokal auf Ihrem Gerät. Ihre Verbrauchsdaten und Ergebnisse verlassen das Gerät nie.",
      p2: "Käufe werden über den App Store geprüft. Wir erhalten und speichern niemals Zahlungsdaten.",
      p3: "Verlauf und Einstellungen werden nur im lokalen Speicher des Geräts gespeichert und beim Löschen der App entfernt.",
    },
  },
} as const;
