/** Dutch. Same keys as the Swedish source; English is the fallback. */
export const nl = {
  "language": {
    "title": "Taal",
    "description": "De taal wijzigt enkel de tekst in de app — niet het land, de valuta of de berekening."
  },
  "marketAreas": {
    "DK1": "DK1 – West-Denemarken",
    "DK2": "DK2 – Oost-Denemarken"
  },
  "reserveProduct": {
    "FCR": "FCR",
    "FCR_D_UP": "FCR-D op- en afregelen",
    "generic": "netdiensten"
  },
  "months": {
    "short": {
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
      "11": "Dec"
    }
  },
  "units": {
    "perYear": "/jr",
    "kwhPerYear": "kWh/jr",
    "perKwh": "{{currency}}/kWh",
    "perKwMonth": "{{currency}}/kW/maand",
    "phases": "{{count}}-fase"
  },
  "countries": {
    "SE": "Zweden",
    "NO": "Noorwegen",
    "FI": "Finland",
    "DK": "Denemarken",
    "DE": "Duitsland",
    "AT": "Oostenrijk",
    "CH": "Zwitserland",
    "BE": "België",
    "FR": "Frankrijk",
    "CZ": "Tsjechië",
    "SI": "Slovenië"
  },
  "adjustment": {
    "title": "Aanpassingen over",
    "body": "Je hebt nog {{count}} aanpassingen over van je laatste aankoop. Ze vervallen over {{time}}.",
    "continue": "Doorgaan",
    "hours": "uur",
    "minutes": "minuten",
    "and": "en",
    "lessThanMinute": "minder dan een minuut"
  },
  "common": {
    "appName": "Mr. Battery Doc",
    "back": "Terug",
    "next": "Volgende",
    "showResult": "Toon resultaat",
    "calculating": "Berekenen…",
    "simulating": "Simuleren",
    "done": "Klaar",
    "cancel": "Annuleren",
    "restart": "Opnieuw beginnen",
    "locked": "Vergrendeld",
    "step": "Stap {{current}} van {{total}}",
    "mostCommon": "Meest voorkomend"
  },
  "validation": {
    "customerShare": "Het aandeel moet tussen 0 en 100% liggen.",
    "paybackYears": "Kies een terugverdientijd tussen 5 en 20 jaar.",
    "country": "Kies een land.",
    "area": "Kies een prijszone.",
    "fuse": "Voer een geldige hoofdzekering in ampère in.",
    "fuseGeneric": "Voer een geldige hoofdzekering in.",
    "confirmGrid": "Bevestig dat de netwaarden correct zijn voordat je verdergaat.",
    "months": "Vul alle 12 maanden in met geldige waarden.",
    "monthsZero": "Het maandelijkse verbruik mag niet nul zijn.",
    "annualConsumption": "Voer je jaarverbruik in kWh in.",
    "profile": "Kies het verbruiksprofiel dat het beste past.",
    "profileGeneric": "Kies het verbruiksprofiel dat het beste bij je woning past.",
    "productionMonths": "Vul alle 12 maanden in voor de zonneproductie.",
    "productionAnnual": "Voer de jaarlijkse zonneproductie in kWh in.",
    "dcKwp": "Het paneelvermogen mag niet negatief zijn.",
    "acKw": "Het omvormervermogen mag niet negatief zijn.",
    "importPrice": "De prijs van aangekochte elektriciteit mag niet negatief zijn.",
    "exportPrice": "De vergoeding voor geëxporteerde zonnestroom mag niet negatief zijn.",
    "demandCharge": "Het capaciteitstarief mag niet negatief zijn.",
    "fxRateAncillary": "De wisselkoers moet groter dan nul zijn als netdiensten zijn ingeschakeld.",
    "fxRate": "De wisselkoers moet groter dan nul zijn.",
    "reminder": "Voer een waarde in."
  },
  "strategies": {
    "title": "Batterij",
    "intro": "Alles staat standaard aan. Schakel uit wat voor u niet relevant is.",
    "solar": {
      "title": "Geoptimaliseerd eigen verbruik van zonne-energie",
      "description": "Sla zonne-energie op en gebruik ze wanneer de zon niet schijnt."
    },
    "gridImport": {
      "title": "Minder afname van het net",
      "description": "Gebruik de batterij om minder elektriciteit van het net te kopen."
    },
    "peak": {
      "title": "Piekvermindering",
      "description": "Verlaag de vermogenspieken van het gebouw en het eventuele capaciteitstarief."
    },
    "ancillary": {
      "title": "Netdiensten",
      "description": "Reserveer batterijvermogen voor het elektriciteitsnet en word ervoor betaald."
    },
    "noSolarNote": "U hebt aangegeven dat het gebouw geen zonnepanelen heeft. Eigen verbruik van zonne-energie levert vandaag dus geen voordeel op — de andere toepassingen blijven ongewijzigd."
  },
  "monthlyImport": {
    "takePhoto": "Neem foto",
    "choosePhoto": "Kies afbeelding",
    "chooseFile": "Kies bestand",
    "reading": "Document lezen…",
    "reimport": "Opnieuw importeren",
    "import": "Importeer maandelijkse data",
    "applied": "✓ 12 maandelijkse waarden geïmporteerd",
    "chooseSeriesTitle": "Welke reeks gebruiken?",
    "chooseSeriesText": "Het document bevat meerdere reeksen. Kies de reeks voor {{kind}}.",
    "kindConsumption": "verbruik",
    "kindProduction": "zonneproductie",
    "reviewTitle": "Controleer de geïmporteerde waarden",
    "annualMismatch": "De som van de maandelijkse waarden is anders dan het jaartotaal in het document. Controleer de waarden voor u verdergaat.",
    "selfPctFound": "Het document vermeldt {{pct}} % zelfverbruik. Deze waarde wordt gebruikt als uw werkelijk zelfverbruik wanneer u de waarden goedkeurt.",
    "sum": "Totaal:",
    "apply": "Waarden gebruiken",
    "missingMonths": "We konden {{read}} van de 12 maanden lezen. Controleer of vul de ontbrekende waarden in."
  },
  "payback": {
    "title": "Terugverdientijd",
    "intro": "Hoe snel wil je dat de batterij zichzelf terugverdient?",
    "card": "Gewenste terugverdientijd",
    "years": "{{years}} jaar",
    "guide": "De installatiekost is gebaseerd op je gekozen terugverdientijd.",
    "investment": {
      "title": "Redelijke investeringskost",
      "hint": "Geschatte maximale investering om de gekozen terugverdientijd te behalen, gebaseerd op het berekende jaarlijkse klantvoordeel.",
      "note": "Systeemdiensten worden meegerekend aan je aandeel van {{share}} %.",
      "none": "Met je huidige gegevens levert de batterij geen positief berekend jaarlijks voordeel op, dus kan er geen redelijke investeringskost worden afgeleid.",
      "benefit": "Berekend jaarlijks klantvoordeel"
    }
  },
  "consumption": {
    "title": "Verbruik",
    "intro": "Kies de methode die het best bij je past. Je kan dit later nog wijzigen.",
    "modeTitle": "Hoe wil je je verbruik invoeren?",
    "modeAnnual": {
      "title": "Jaarverbruik",
      "description": "Ik weet ongeveer hoeveel kWh ik per jaar verbruik."
    },
    "modeMonthly": {
      "title": "Maand per maand",
      "description": "Ik heb de werkelijke waarden voor alle 12 maanden."
    },
    "annual": {
      "title": "Jaarverbruik",
      "label": "Verbruik",
      "placeholder": "bv. 20000"
    },
    "monthly": {
      "title": "Werkelijk maandelijks verbruik",
      "importDescription": "Importeer een afbeelding, PDF of CSV",
      "monthsTitle": "Geïmporteerde maandgegevens"
    },
    "profile": {
      "title": "Wanneer verbruik je de meeste elektriciteit? (dagprofiel)",
      "placeholder": "Kies profiel",
      "chartCaption": "Typische weekdag",
      "chartPeaks": "Pieken",
      "chartBase": "Basislast"
    }
  },
  "meta": {
    "intro": {
      "title": "Mr. Battery Doc — vind de juiste batterij voor uw woning",
      "description": "Beantwoord enkele eenvoudige vragen en ontdek welke batterijcapaciteit en welk vermogen bij uw woning passen.",
      "ogTitle": "Mr. Battery Doc — de juiste batterij voor uw woning",
      "ogDescription": "Een eenvoudige gids over batterijcapaciteit, vermogen en voordelen."
    }
  },
  "network": {
    "phase": {
      "title": "Aansluiting",
      "description": "Kies of de woning een monofasige of driefasige aansluiting heeft."
    },
    "title": "Net en hoofdzekering",
    "intro": "Begin met het kiezen van een land. De juiste netwaarden en standaardprijzen worden dan automatisch ingesteld.",
    "country": {
      "title": "Land",
      "description": "Waar is de woning gelegen?"
    },
    "area": {
      "title": "Prijsgebied",
      "description": "Kies waar in het land de woning is gelegen.",
      "placeholder": "Kies prijsgebied"
    },
    "fuse": {
      "title": "Hoofdzekering",
      "description": "Staat meestal vermeld op je netfactuur.",
      "other": "Andere hoofdzekering",
      "otherWith": "Andere hoofdzekering ({{amps}} A)",
      "manualPlaceholder": "Handmatig invoeren"
    },
    "values": {
      "title": "Netwaarden",
      "description": "Automatisch ingesteld op basis van het gekozen land.",
      "voltage": "Spanning",
      "phases": "Fasen",
      "frequency": "Frequentie",
      "currency": "Valuta",
      "standards": "Standaarden: {{list}}",
      "confirm": "Ik heb gecontroleerd dat de netwaarden correct zijn"
    }
  },
  "technical": {
    "title": "Technische details",
    "calibrationGroup": "Eigen verbruik vóór de batterij",
    "requested": "Opgegeven historische waarde",
    "achieved": "Niveau bereikt door het model",
    "partialNote": "Het model heeft het verbruiksprofiel bijgesteld, met behoud van het dagelijkse patroon.",
    "usageGroup": "Batterijgebruik",
    "cycles": "Cycli per jaar",
    "powerGroup": "Vermogensbepaling",
    "recommendedPower": "Aanbevolen systeemvermogen",
    "physicalNeed": "Fysieke vermogensbehoefte",
    "basePowerForEnergy": "Basisvermogen voor energiebeheer",
    "ancillaryRaisedNote": "Het hoger aanbevolen vermogen is het resultaat van de dimensionering voor netdiensten.",
    "potentialTitle": "Potentieel voor netdiensten",
    "potentialNote": "Een hoger geïnstalleerd vermogen kan het berekende voordeel uit netdiensten verhogen. Voor deze netaansluiting kan de engine productstappen testen tot {{max}} kW.",
    "potentialColumn": "Extra berekend jaarlijks voordeel",
    "heldPower": "Gereserveerd vermogen voor netdiensten",
    "cRate": "C-rate",
    "socWindow": "SOC-venster",
    "roundTrip": "Round-trip efficiëntie",
    "ancillaryGroup": "Netdiensten",
    "reservedPower": "Gereserveerd vermogen",
    "reservablePower": "Fysiek reserveerbaar vermogen (gemiddeld)",
    "reservableNote": "Een afzonderlijke, gemiddelde maat voor reserveerbaarheid – niet het vermogen waarop de vergoeding wordt berekend.",
    "avgHeldPower": "Gemiddeld werkelijk vastgehouden",
    "fullDeliveryHours": "Uren met volledige levering",
    "fullDeliveryNote": "Aandeel van de gereserveerde uren waarin het volledige aangeboden vermogen kon worden vastgehouden. De vergoeding wordt alleen berekend op het werkelijk vastgehouden vermogen.",
    "reservationNote": "De engine reserveert het niveau dat het hoogste totale berekende voordeel oplevert. Meer vermogen van de batterij kan technisch beschikbaar zijn voor netdiensten, maar wordt niet gebruikt als eigen verbruik en peak shaving een groter voordeel bieden.",
    "selectedServices": "Geselecteerde diensten",
    "limitingFactor": "Beperkende factor",
    "limiting": {
      "power": "Batterijvermogen",
      "energy": "Batterijcapaciteit",
      "grid": "Netaansluiting",
      "none": "Geen"
    }
  },
  "errors": {
    "importImageUnreadable": "Deze afbeelding kon niet worden gelezen. Probeer een nieuwe foto te nemen of kies een JPG-, PNG- of PDF-bestand.",
    "importFilesDenied": "Bestandstoegang is uitgeschakeld. Sta toegang toe in je iPhone-instellingen om een document te kiezen.",
    "importPickerUnavailable": "De bestandskeuze kon nu niet worden geopend. Probeer het opnieuw.",
    "importUnsupportedType": "Dit bestandstype wordt niet ondersteund. Gebruik een afbeelding, een PDF- of een CSV-bestand.",
    "importCameraDenied": "Cameratoegang is uitgeschakeld. Sta de camera toe in je iPhone-instellingen om een document te fotograferen.",
    "importPhotosDenied": "Toegang tot foto's is uitgeschakeld. Sta toegang toe in je iPhone-instellingen om een document te kiezen.",
    "importNoData": "We hebben geen maandelijkse gegevens in het bestand gevonden. Controleer of de maanden duidelijk zichtbaar zijn.",
    "importUnreadable": "Het bestand kon niet worden gelezen. Probeer een duidelijkere afbeelding of een PDF.",
    "importTooLarge": "Het bestand is te groot. Gebruik een bestand kleiner dan 15 MB.",
    "importNotConfigured": "De AI-dienst is niet geconfigureerd.",
    "importRateLimited": "Te veel verzoeken op dit moment. Wacht even en probeer het opnieuw.",
    "importCreditsExhausted": "De AI-credits zijn opgebruikt. Waardeer op om documenten te lezen.",
    "importUnparsable": "We konden de inhoud van het document niet interpreteren.",
    "egValue": "bv. {{value}}"
  },
  "settings": {
    "title": "Instellingen",
    "languageTitle": "Taal",
    "languageHint": "De munteenheid is gebaseerd op het land van je adres, niet op de taal.",
    "premium": {
      "title": "Premium",
      "badge": "Populairst",
      "points": {
        "calculations": "Onbeperkt aantal berekeningen",
        "pdf": "Onbeperkt aantal pdf-rapporten",
        "full": "Volledige toegang tot het resultaat"
      },
      "cta": "Start Premium",
      "active": "Premium is actief",
      "renewal": "Wordt jaarlijks automatisch verlengd. Altijd opzegbaar."
    },
    "single": {
      "title": "Eén berekening",
      "description": "Ontgrendelt het volledige resultaat en het pdf-rapport voor die berekening.",
      "cta": "Aangekocht bij je volgende berekening",
      "note": "De eenmalige aankoop gebeurt wanneer je een nieuwe berekening start, niet van hieruit."
    },
    "restore": "Aankopen herstellen",
    "subscription": "Abonnement beheren",
    "history": "Geschiedenis",
    "terms": "Gebruiksvoorwaarden",
    "privacy": "Privacybeleid",
    "eula": "Licentieovereenkomst (Apple)",
    "reset": {
      "title": "Opnieuw beginnen",
      "confirm": "Opnieuw beginnen? Alle ingevoerde waarden in de gids worden gewist."
    },
    "historyPanel": {
      "premiumActive": "Premium actief tot {{date}}",
      "premiumInactive": "Geen actieve Premium",
      "reports": "Ontgrendelde rapporten: {{count}}"
    },
    "version": "Mr. Battery Doc · V1.0.0"
  },
  "ancillary": {
    "priceDataNotConfigured": "Netdiensten voor {{where}}: de prijsdata is nog niet geconfigureerd. De opbrengst wordt als 0 gerekend – er worden geen prijzen uit andere landen gebruikt.",
    "unavailableSymmetric": "{{where}} gebruikt symmetrische FCR. De markt is geconfigureerd, maar de berekening is nog niet beschikbaar – er wordt geen opbrengst aangenomen.",
    "unavailableNoData": "Netdiensten kunnen voor {{where}} nog niet berekend worden – geverifieerde historische prijsdata ontbreekt. Er wordt geen opbrengst aangenomen."
  },
  "legal": {
    "terms": {
      "title": "Gebruiksvoorwaarden",
      "p1": "Mr. Battery Doc geeft een schatting van de rendabiliteit van batterijopslag op basis van de informatie die u invoert. De resultaten zijn indicatief en vormen geen financieel, technisch of juridisch advies.",
      "p2": "De aankoop van een rapport ontgrendelt die specifieke berekening. Premium geeft onbeperkte berekeningen tijdens de abonnementsperiode. Aankopen worden verwerkt via de App Store en eventuele terugbetalingen volgen de voorwaarden van Apple.",
      "p3": "Wij zijn niet aansprakelijk voor beslissingen die worden genomen op basis van de berekeningen. Elektriciteitsprijzen, balanceringsdiensten en nettarieven kunnen in de loop van de tijd veranderen zonder dat dit invloed heeft op eerdere berekeningen."
    },
    "privacy": {
      "title": "Privacybeleid",
      "p1": "Alle berekeningen worden lokaal op uw toestel uitgevoerd. Uw verbruiksgegevens en resultaten verlaten nooit het toestel.",
      "p2": "Aankopen worden geverifieerd via de App Store. Wij ontvangen of bewaren nooit betalingsgegevens.",
      "p3": "Geschiedenis en instellingen worden enkel lokaal op uw toestel opgeslagen en worden verwijderd als de app wordt verwijderd."
    }
  },
  "economics": {
    "customerShare": {
      "title": "Nevendiensten",
      "description": "U ontvangt zelden de volledige marktwaarde. Vul het aandeel in dat u verwacht te krijgen.",
      "label": "Uw aandeel van de waarde van nevendiensten",
      "hint": "Maak een schatting. Uw werkelijke aandeel hangt af van de aggregator, BRP, kosten en contractvoorwaarden."
    },
    "title": "Economie",
    "intro": "Standaardwaarden voor {{country}}. Pas ze aan als u dat wilt.",
    "prices": {
      "lockedNote": "De prijzen beïnvloeden de berekening niet als u geen zonne-installatie heeft gekozen — de velden zijn vergrendeld.",
      "showFields": "Toon velden toch",
      "title": "Elektriciteitsprijzen",
      "description": "Standaardwaarden om verschillende batterijoplossingen te vergelijken. Controleer uw elektriciteitsfactuur voor aangekochte stroom en gebruik uw eigen visie op toekomstige prijzen voor geëxporteerde zonnestroom."
    },
    "importPrice": {
      "label": "Aangekochte elektriciteit (incl. nettarief)",
      "hint": "Kijk op uw elektriciteitsfactuur."
    },
    "exportPrice": {
      "label": "Geëxporteerde zonnestroom (spotprijs)",
      "hint": "Gebruik uw eigen visie op de toekomst."
    },
    "demandCharge": {
      "label": "Capaciteitstarief",
      "hintDefault": "Standaardwaarde gebaseerd op het geselecteerde land. Pas dit aan als u het capaciteitstarief van uw netbeheerder kent.",
      "hintZero": "Geen capaciteitstarief aangenomen. Pas dit aan als uw netbeheerder kosten aanrekent voor piekvermogen."
    }
  },
  "production": {
    "title": "Productie",
    "intro": "Heeft de woning vandaag zonnepanelen?",
    "modeTitle": "Hoe wilt u uw productie invoeren?",
    "modeNone": {
      "title": "Geen zonnepaneleninstallatie"
    },
    "modeAnnual": {
      "title": "Jaarlijkse productie",
      "description": "Ik ken het vermogen van de installatie en de geschatte jaarlijkse productie."
    },
    "modeMonthly": {
      "title": "Maand per maand",
      "description": "Ik heb de werkelijke productiegegevens voor alle 12 maanden."
    },
    "plant": {
      "title": "Zonnepaneleninstallatie",
      "dcKwp": "Geïnstalleerd paneelvermogen",
      "dcKwpShort": "Paneelvermogen",
      "acKw": "Omvormer",
      "annual": "Jaarlijkse productie"
    },
    "monthly": {
      "title": "Werkelijke maandelijkse productie",
      "importDescription": "Importeer een afbeelding, PDF of CSV",
      "monthsTitle": "Geïmporteerde maandelijkse gegevens"
    },
    "self": {
      "title": "Eigen verbruik van zonne-energie (optioneel)",
      "label": "Eigen verbruik",
      "placeholder": "bv. 45",
      "hint": "Het aandeel van uw zonneproductie dat rechtstreeks in de woning wordt verbruikt. Als u deze waarde niet kent, berekenen we die op basis van uw verbruik en productie."
    }
  },
  "history": {
    "title": "Historiek",
    "subtitle": "Jouw eerder aangekochte batterijberekeningen.",
    "adjustmentsLeft": "Je hebt nog {{count}} aanpassingen over van je laatste aankoop.",
    "adjustmentsUnlimited": "Onbeperkt aanpassingen met Premium.",
    "itemTitle": "Batterijberekening",
    "benefit": "Geschat voordeel {{value}}",
    "open": "Resultaat openen",
    "edit": "Details wijzigen",
    "notVerified": "De aankoop kon niet worden geverifieerd op dit toestel. Probeer Aankoop herstellen.",
    "delete": "Verwijderen",
    "deleteConfirm": "Deze berekening uit de geschiedenis verwijderen? Dit kan niet ongedaan worden gemaakt.",
    "empty": {
      "title": "Nog geen historiek",
      "text": "Berekeningen die je ontgrendelt, worden hier verzameld."
    },
    "missing": {
      "intro": "Deze berekening is hier niet opgeslagen.",
      "title": "Resultaat ontbreekt op dit toestel",
      "text": "Berekeningen worden lokaal opgeslagen. Deze staat niet op dit toestel – voer een nieuwe berekening uit om een resultaat te zien."
    },
    "locked": {
      "intro": "De aankoop kon niet worden geverifieerd.",
      "title": "Momenteel geen toegang",
      "text": "Probeer Aankoop herstellen in Instellingen. Je betaalt nooit opnieuw voor een berekening die je al kocht."
    }
  },
  "intro": {
    "title": "Vind de juiste batterij voor jouw pand",
    "subtitle": "Dimensionering en financiële analyse voor een batterij met zonnepanelen of een standalone batterij voor nevendiensten.",
    "lead": "Beantwoord enkele eenvoudige vragen over je pand en we helpen je de geschikte batterijgrootte te vinden.",
    "points": {
      "capacity": {
        "title": "Aanbevolen batterijgrootte",
        "desc": "Ontdek welke capaciteit en welk vermogen bij jouw pand passen."
      },
      "economy": {
        "title": "Geschat financieel voordeel",
        "desc": "Bekijk het voordeel van zelfconsumptie, vermogenspieken en nevendiensten."
      },
      "investment": {
        "title": "Geschatte maximale investering",
        "desc": "Zie wat de batterij maximaal mag kosten op basis van je gewenste terugverdientijd."
      }
    },
    "stats": {
      "powerLabel": "200 kW / 500 kWh",
      "powerSub": "maximale batterijgrootte",
      "simsLabel": "≈ 800,000",
      "simsSub": "uurlijkse berekeningen per analyse"
    },
    "cta": "Ga van start",
    "footnote": "Duurt ongeveer drie minuten. Je antwoorden worden automatisch opgeslagen."
  },
  "importantInformation": {
    "title": "Belangrijk om te weten",
    "p1": "Het resultaat is een schatting. Het werkelijke resultaat kan afwijken van de berekening.",
    "p2": "Elektriciteitsprijzen en nettarieven variëren. Controleer uw eigen contract en de voorwaarden van uw netbeheerder.",
    "p3": "Inkomsten uit netdiensten zijn gebaseerd op historische marktprijzen vanaf 2025. Toekomstige prijzen kunnen zowel hoger als lager zijn.",
    "p4": "Een deel van de vergoeding voor netdiensten gaat naar een aggregator, balansverantwoordelijke partij of andere marktdeelnemers. De werkelijke vergoeding voor de klant is daarom lager dan de berekende marktwaarde.",
    "p5": "Deelname aan de markt voor netdiensten is niet gegarandeerd. Mogelijk zijn technische vereisten, markttoegang en contracten nodig.",
    "p6": "De werkelijke prestaties en winstgevendheid van de batterij kunnen verschillen afhankelijk van het product, de installatie, degradatie en het gebruik.",
    "p7": "Gebruik altijd een erkende of gecertificeerde elektricien voor de installatie en elektrische werken.",
    "footer": "Battery Doc is een hulpmiddel voor berekeningen en beslissingen en vervangt geen offerte, technisch ontwerp of contractvoorwaarden."
  },
  "paywall": {
    "title": "Je batterijberekening is klaar",
    "subtitle": "Ontgrendel het resultaat en je persoonlijk batterijrapport.",
    "ready": "Berekening voltooid",
    "includesTitle": "Je krijgt toegang tot:",
    "includes": {
      "size": "Aanbevolen batterijcapaciteit en vermogen",
      "benefit": "Geschat jaarlijks voordeel",
      "selfSufficiency": "Eigen verbruik en zelfvoorziening voor/na",
      "peak": "Piekreductie en impact op het net",
      "ancillary": "Berekening van nevendiensten",
      "investment": "Maximale investering voor je terugverdientijd",
      "pdf": "Volledig persoonlijk pdf-rapport"
    },
    "premium": {
      "label": "Premium · 1 jaar",
      "badge": "Beste deal",
      "description": "Onbeperkt berekeningen en rapporten voor 1 jaar.",
      "cta": "Start Premium",
      "value": "Premium loont vanaf 5 rapporten per jaar.",
      "renewal": "{{price}}. Het abonnement wordt automatisch verlengd, tenzij opgezegd volgens de voorwaarden van de App Store.",
      "loadingPrice": "Prijs ophalen…"
    },
    "single": {
      "label": "Eén rapport",
      "description": "Ontgrendel deze berekening en het pdf-rapport.",
      "cta": "Koop rapport voor {{price}}",
      "ctaPending": "Koop rapport",
      "loadingPrice": "Prijs ophalen…",
      "adjustmentsIncluded": "Inclusief 3 aanpassingen binnen 24 u na aankoop."
    },
    "priceUnavailable": "Prijs komt uit de App Store.",
    "restore": "Aankopen herstellen",
    "restoring": "Herstellen…",
    "manage": "Abonnement beheren",
    "manageWeb": "Abonnementen worden beheerd via Apple op je iPhone.",
    "restored": "Premium hersteld.",
    "restoreNothing": "Geen actief abonnement gevonden.",
    "processing": "Aankoop verwerken…",
    "pending": "De aankoop wacht op goedkeuring. Het resultaat wordt ontgrendeld zodra dit voltooid is.",
    "unresolved": "De aankoop is gelukt, maar kon nog niet worden bevestigd. We voltooien dit automatisch zodra de verbinding werkt.",
    "retry": "Probeer opnieuw",
    "back": "Terug naar je gegevens",
    "errors": {
      "network": "Geen verbinding met de App Store. Controleer je netwerk en probeer opnieuw.",
      "products": "We kunnen de prijzen momenteel niet laden.",
      "productUnavailable": "Het product is tijdelijk niet beschikbaar.",
      "verification": "De aankoop kon niet worden geverifieerd.",
      "notSupported": "Aankopen gebeuren in de iOS-app.",
      "unknown": "Er is iets misgegaan. Probeer het opnieuw."
    },
    "legal": {
      "terms": "Gebruiksvoorwaarden",
      "privacy": "Privacybeleid"
    },
    "locked": {
      "title": "Het resultaat is vergrendeld",
      "description": "Ontgrendel deze berekening om het resultaat en het rapport te zien.",
      "cta": "Afrekenen"
    }
  },
  "results": {
    "ancillaryScenario": {
      "title": "Scenario voor netdiensten",
      "intro": "Ook als een batterij niet nodig is voor zonne-energie of piekverbruik, kan ze worden gebruikt voor netdiensten. Hier kunt u vergelijken hoe verschillende batterijgroottes de berekende vergoeding beïnvloeden.",
      "notRecommendation": "Dit is een vergelijkingsscenario, geen aanbevolen batterijgrootte.",
      "technicalTitle": "Technisch voorstel",
      "technicalHint": "De grootte is zo gekozen dat minstens 95% van de berekende capaciteit voor netdiensten voor uw aansluiting en verbruiksprofiel kan worden benut. Het is een technisch voorstel, geen claim over de meest winstgevende batterij.",
      "driven": "De grootte is bepaald door de mogelijkheid om netdiensten te leveren via uw netaansluiting en is niet gedimensioneerd voor de energiebehoeften van het huishouden.",
      "lead": "Netdiensten kunnen een batterij alsnog rendabel maken. Vergelijk hieronder enkele groottes.",
      "battery": "Batterij",
      "compensation": "Vergoeding netdiensten",
      "totalBenefit": "Berekend totaal voordeel",
      "maxInvestment": "Maximale investering bij uw gekozen terugverdientijd",
      "maxInvestmentNone": "Kan niet berekend worden",
      "note": "De berekening is gebaseerd op historische vergoedingen. De werkelijke vergoeding, beschikbaarheid en de mogelijkheid om deel te nemen aan netdiensten hangen onder andere af van de markt, de aggregator en technische vereisten.",
      "benefitNote": "De standaard dimensionering vindt geen noodzaak voor een batterij. Netdiensten kunnen alsnog rendabel zijn — zie het scenario hieronder.",
      "investmentNote": "De standaard dimensionering vindt geen noodzaak voor een batterij. De maximale investering per batterijgrootte wordt getoond in het scenario hieronder."
    },
    "section": {
      "battery": "Batterij",
      "benefit": "Voordeel",
      "economy": "Economie",
      "details": "Details"
    },
    "investment": {
      "title": "Maximale investering bij uw gekozen terugverdienperiode",
      "basedOn": "Gebaseerd op uw gekozen terugverdienperiode van {{years}}",
      "otherTitle": "Maximale investering bij verschillende terugverdienperiodes",
      "yourChoice": "Uw keuze",
      "approx": "ca.",
      "explain": "Een kortere terugverdienperiode betekent een lagere maximale investering. Hier ziet u hoe de maximale investering verandert als u een kortere of langere terugverdienperiode aanvaardt."
    },
    "title": "Resultaat",
    "intro": "Dit is het voorstel voor uw pand.",
    "pdfReport": "Rapport downloaden als PDF",
    "incomplete": {
      "intro": "We hebben wat meer informatie nodig.",
      "title": "Vul in wat ontbreekt",
      "description": "De berekening start pas als alle gegevens er zijn — we doen nooit aannames voor u."
    },
    "error": {
      "intro": "Er is iets misgegaan.",
      "title": "De berekening kon niet worden voltooid",
      "description": "Ga terug, controleer uw gegevens en probeer het opnieuw. We tonen liever niets dan een verzonnen resultaat."
    },
    "noBattery": {
      "badge": "Conclusie",
      "title": "Geen batterij aanbevolen",
      "text": "Met uw huidige gegevens levert een batterij onvoldoende voordeel op om aanbevolen te worden."
    },
    "hero": {
      "title": "Aanbevolen batterij"
    },
    "bestChoice": "Beste keuze",
    "yourBattery": "Uw batterij",
    "level": {
      "lower": "Kleiner",
      "recommended": "Beste keuze",
      "higher": "Groter"
    },
    "withoutAncillary": {
      "title": "Aanbevolen zonder inkomsten uit netdiensten",
      "description": "Hetzelfde pand, zonder inkomsten uit netdiensten."
    },
    "balance": {
      "base": "Beste balans tussen batterijgrootte en berekend voordeel.",
      "higher": "Beste balans tussen batterijgrootte en berekend voordeel.",
      "higherAncillary": "Beste balans tussen batterijgrootte en berekend voordeel."
    },
    "improvements": {
      "title": "Hoe het pand verbetert",
      "summaryShifted": "{{value}} verschoven zonne-energie",
      "summaryPeak": "{{value}} lagere vermogenspiek"
    },
    "energy": {
      "title": "Energie",
      "selfConsumption": "Eigen verbruik",
      "selfSufficiency": "Zelfvoorziening",
      "gridImport": "Afname van het net",
      "shiftedSolar": "Verschoven zonne-energie",
      "recoveredCurtailment": "Herstelde afgetopte zonne-energie"
    },
    "power": {
      "title": "Vermogen",
      "peak": "Vermogenspiek",
      "reduction": "Reductie",
      "noReduction": "Geen reductie van de vermogenspiek met de geselecteerde instellingen."
    },
    "breakdown": {
      "energyNegativeNote": "Het energiedeel is negatief: batterijverliezen en laden kosten meer dan de bespaarde stroom. Het totaal is toch positief dankzij de systeemdiensten.",
      "title": "Verdeling van het jaarlijks voordeel",
      "total": "Totaal berekend klantvoordeel"
    },
    "benefit": {
      "nonPositive": "Met uw huidige invoer levert de batterij geen positief berekend economisch voordeel per jaar op. Het technische resultaat wordt hieronder nog wel getoond.",
      "ancillaryTitle": "Netdiensten",
      "ancillaryCustomerHint": "Uw berekende vergoeding.",
      "ancillaryPower": "Geschat vergoedbaar vermogen",
      "ancillaryMarket": "Historische marktwaarde van netdiensten",
      "ancillaryShare": "Uw aandeel in de waarde van de netdiensten",
      "ancillaryShareHint": "Het aandeel is een schatting. Uw werkelijke vergoeding hangt af van de aggregator, de evenwichtsverantwoordelijke partij, kosten en contractvoorwaarden.",
      "showCalculation": "Toon de berekening voor netdiensten",
      "ancillaryCustomer": "Uw berekende vergoeding",
      "title": "Berekend voordeel",
      "none": "Met de geselecteerde instellingen levert de batterij geen berekend financieel voordeel op.",
      "energyWithSolar": "Verschoven zonne-energie en verminderde aankoop",
      "energyNoSolar": "Verminderde aankoop van elektriciteit",
      "energyHintSolar": "Opgeslagen zonne-energie wordt gebruikt wanneer het nodig is.",
      "energyHintNoSolar": "De batterij laadt op wanneer elektriciteit goedkoper is en wordt later gebruikt.",
      "peak": "Piekreductie",
      "peakHint": "Verlaagt vermogenspieken en reduceert het capaciteitstarief.",
      "ancillary": "Netdiensten – {{product}}",
      "ancillaryHint": "Berekende marktwaarde van het gereserveerde batterijvermogen. Historische prijzen 2025.",
      "ancillaryNote": "Berekende marktwaarde op basis van historische prijzen 2025.",
      "priceBasis": "Gebaseerd op prijzen voor netdiensten van 2025."
    },
    "limited": {
      "title": "Beperkt financieel voordeel",
      "text": "De berekening toont geen positief jaarlijks voordeel met uw huidige omstandigheden en geselecteerde strategieën."
    },
    "why": {
      "title": "Waarom {{power}} kW?",
      "physicalNeed": "Fysieke vermogensbehoefte",
      "without": "Zonder {{product}}",
      "with": "Met netdiensten",
      "ownNeed": "Voor de eigen behoefte van het pand",
      "explanation": "Het hogere systeemvermogen levert een groter berekend jaarlijks voordeel op wanneer de historische prijzen voor netdiensten van 2025 worden meegerekend. Toekomstige prijzen en inkomsten kunnen verschillen.",
      "textSplit": "De fysieke vermogensbehoefte van het pand is ongeveer {{physical}} kW. Zonder {{product}} geeft {{without}} kW het hoogste berekende jaarlijkse voordeel. Met de historische prijzen voor netdiensten van 2025 geeft {{recommended}} kW het hoogste berekende jaarlijkse voordeel. Toekomstige prijzen en inkomsten kunnen verschillen.",
      "textSimple": "Voor de eigen behoefte van het pand is {{without}} kW voldoende. Het hogere systeemvermogen van {{recommended}} kW levert een groter berekend jaarlijks voordeel op wanneer de historische prijzen voor netdiensten van 2025 worden meegerekend. Toekomstige prijzen en inkomsten kunnen verschillen.",
      "historicalNote": "Toekomstige FCR-prijzen en -inkomsten kunnen zowel hoger als lager zijn."
    },
    "capacityWhy": {
      "none": "Met uw gegevens verplaatst een batterij te weinig energie om een grootte aan te bevelen.",
      "withSolar": "{{capacity}} kWh geeft een goede balans tussen de hoeveelheid energie die de batterij kan verplaatsen en het voordeel van extra capaciteit. Een grotere batterij levert relatief weinig extra voordeel op met uw verbruik en zonneproductie.",
      "withoutSolar": "{{capacity}} kWh geeft een goede balans tussen de hoeveelheid energie die de batterij kan verplaatsen en het voordeel van extra capaciteit. Een grotere batterij levert relatief weinig extra voordeel op met uw verbruik."
    },
    "searchLimit": {
      "atLeast": "Minstens {{value}}",
      "capacityNote": "De bovengrens van de capaciteit voor de analyse is bereikt. Een grotere batterij kan mogelijk extra voordeel opleveren.",
      "powerNote": "De bovengrens van het vermogen voor de analyse is bereikt. Een systeem met een hoger vermogen vereist mogelijk een aparte analyse.",
      "bothNote": "Het pand bevindt zich aan de bovengrens van de dimensionering voor deze analyse. Grotere systemen moeten worden gedimensioneerd met een uitgebreide technische studie."
    },
    "powerCap": {
      "note": "De berekende fysieke vermogensbehoefte van het pand ({{physical}} kW) is groter dan het hoogst beschikbare productniveau ({{product}} kW). De aanbeveling is daarom beperkt tot {{product}} kW."
    },
    "powerWhy": {
      "raised": "{{recommended}} kW geeft het hoogste berekende jaarlijkse voordeel van de vergeleken systeemvermogens. De eigen vermogensbehoefte van het pand is lager ({{physical}} kW).",
      "floor": "{{recommended}} kW volgt het technische minimum van de batterij in verhouding tot de capaciteit. De eigen vermogensbehoefte van het pand is lager ({{physical}} kW). Een hoger systeemvermogen levert geen significant groter berekend jaarlijks voordeel op.",
      "matched": "{{recommended}} kW is gedimensioneerd voor de energiestromen en de berekende vermogensbehoefte van het pand ({{physical}} kW). Een hoger systeemvermogen levert geen significant groter berekend jaarlijks voordeel op."
    },
    "demandNote": {
      "entered": "Berekend met het door u ingevoerde capaciteitstarief.",
      "standard": "Berekend met een standaardwaarde voor het capaciteitstarief.",
      "noTariff": "De vermogenspiek wordt verlaagd, maar er is geen capaciteitstarief ingeprijsd — er wordt dus geen financiële piekbesparing meegerekend."
    },
    "sizing": {
      "basePower": "Basisvermogen uit fysieke dimensionering: {{power}} kW ({{crate}} C). ",
      "basePhysicalUtility": "Fysiek energievoordeel bij het basisvermogen",
      "withoutProduct": "Systeemvermogen met het hoogste berekende jaarlijkse voordeel zonder {{product}}: {{power}} kW ({{crate}} C).",
      "selected": "Na evaluatie van het berekende jaarlijkse voordeel, werd {{power}} kW ({{crate}} C) gekozen als het aanbevolen systeemvermogen.",
      "fcrInfluenced": "Historische {{product}}-inkomsten beïnvloedden de vermogenskeuze."
    }
  }
} as const;
