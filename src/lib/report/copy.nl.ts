/** Dutch report copy. Same structure as the Swedish source text. */
import type { ReportCopy } from "./copy";

export const nl: ReportCopy = {
  "title": "Batterijrapport",
  "brand": "Mr. Battery Doc",
  "created": "Aangemaakt",
  "perYear": "/jr",
  "reportIdLabel": "Rapport-ID",
  "pageLabel": "Pagina",
  "ofLabel": "of",
  "engineVersionLabel": "Versie van de berekening",
  "notAvailable": "Niet beschikbaar",
  "cannotBeCalculated": "Kan niet berekend worden",
  "before": "Zonder batterij",
  "after": "Met batterij",
  "tagline": "Een slimmere manier om je elektriciteit te gebruiken",
  "footerTagline": "Betere beslissingen voor een stralende toekomst",
  "source": {
    "user": "Uw waarde",
    "calculated": "Berekend",
    "default": "Standaard aanname",
    "external": "Externe databron"
  },
  "searchLimit": {
    "atLeastCapacity": "Minstens {value}",
    "atLeastPower": "Minstens {value}",
    "capacityNote": "De bovengrens van de capaciteit voor deze analyse is bereikt. Een grotere batterij kan extra voordelen bieden.",
    "powerNote": "De bovengrens van het vermogen voor deze analyse is bereikt. Een systeem met een hoger vermogen vereist mogelijk een aparte analyse.",
    "bothNote": "De installatie heeft de bovengrens voor dimensionering in deze analyse bereikt. Grotere systemen moeten worden gedimensioneerd met een uitgebreide technische studie."
  },
  "summary": {
    "title": "Overzicht",
    "capacity": "Batterijcapaciteit",
    "power": "Batterijvermogen",
    "benefit": "Geschatte economische waarde, jaar 1",
    "maxInvestment": "Maximale investering bij de gekozen terugverdientijd",
    "improvements": "Hoe de woning verbetert",
    "selfConsumption": "Eigen verbruik",
    "selfSufficiency": "Zelfvoorziening",
    "gridImport": "Netimport",
    "peak": "Piekvermogen",
    "shifted": "verschoven zonne-energie",
    "peakLower": "lagere piek",
    "recommendedBattery": "Aanbevolen batterij",
    "paybackLabel": "Gekozen terugverdientijd",
    "valueSplit": "Verdeling van de economische waarde",
    "shiftedSolar": "Verschoven zonne-energie",
    "ancillaryShareNote": "Van de geschatte economische waarde is {value} afkomstig van ondersteunende diensten, gebaseerd op historische marktprijzen.",
    "subtitle": "Aanbevolen batterij en geschatte waarde voor uw woning",
    "improvementsSubtitle": "Met de batterij gebruikt u meer van uw eigen elektriciteit en koopt u minder van het net.",
    "selfConsumptionHint": "Aandeel van de zonne-elektriciteit die rechtstreeks in de woning wordt gebruikt.",
    "selfSufficiencyHint": "Aandeel van het elektriciteitsverbruik dat door uw eigen elektriciteit wordt gedekt.",
    "gridImportHint": "Elektriciteit aangekocht van het net.",
    "shiftedSolarHint": "Meer van uw eigen zonneproductie wordt in de woning gebruikt in plaats van naar het net te exporteren.",
    "percentagePoints": "procentpunten",
    "perYearLong": "per jaar"
  },
  "benefit": {
    "title": "Herkomst van de waarde",
    "total": "Geschatte economische waarde, jaar 1",
    "energy": "Verschoven zonne-energie en verminderde stroomaankoop",
    "energyHint": "De batterij slaat overtollige productie op en gebruikt de energie wanneer het pand die nodig heeft.",
    "energyNoSolarHint": "De batterij laadt op wanneer elektriciteit goedkoper is en wordt gebruikt wanneer het pand die nodig heeft.",
    "peak": "Piekreductie",
    "peakHint": "De batterij kan stroompieken afvlakken en zo de kosten verlagen waar een capaciteitstarief van toepassing is.",
    "ancillary": "Nevendiensten",
    "ancillaryHint": "Geschatte vergoeding van de geselecteerde dienst, gebaseerd op historische marktprijzen en de aannames van de berekening.",
    "none": "De berekening toont geen meetbaar economisch voordeel met uw huidige invoer.",
    "note": "De berekening omvat jaar 1. Het rapport bevat geen meerjarenprognose, omdat de berekening geen toekomstige prijzen of degradatie modelleert.",
    "historicalBox": "Historische berekening – geen garantie op toekomstige inkomsten.",
    "shareOfTotal": "van het totaal"
  },
  "ancillary": {
    "title": "Systeemdiensten",
    "product": "Geselecteerde dienst",
    "offered": "Aangeboden vermogen",
    "reservable": "Fysiek reserveerbaar vermogen (gemiddeld)",
    "technicalTitle": "Technische basis",
    "technicalNote": "Fysiek reserveerbaar vermogen is een afzonderlijke maatstaf voor gemiddelde reserveerbaarheid, niet het vermogen waarop de vergoeding wordt berekend.",
    "held": "Gereserveerd vermogen (gemiddeld)",
    "monetized": "Geschat vergoedbaar vermogen",
    "availability": "Beschikbaarheid",
    "limiting": "Wat de batterijgrootte beperkt",
    "limitingPower": "Batterijvermogen",
    "limitingEnergy": "Opgeslagen energie / SOC",
    "limitingGrid": "Netcapaciteit",
    "limitingNone": "Geen beperking",
    "reservedEnergy": "Gereserveerde energie",
    "reservedHours": "Uren met reservering",
    "marketValue": "Geschatte marktwaarde",
    "share": "Jouw aandeel in de marktwaarde",
    "customerValue": "Geschatte vergoeding voor jou",
    "priceBasis": "Prijsbasis",
    "priceBasisValue": "Historische marktprijzen",
    "nominalPower": "Nominaal batterijvermogen",
    "historicalWarning": "Historische berekening – geen garantie op toekomstige inkomsten. De werkelijke vergoeding hangt onder andere af van toekomstige marktprijzen, beschikbaarheid, overeenkomsten met aggregatoren en marktregels.",
    "noPriceData": "Er kan geen economische waarde worden berekend voor deze markt omdat geverifieerde prijsgegevens ontbreken. Vermogen en beschikbaarheid worden berekend, maar er worden geen inkomsten gerapporteerd.",
    "note": "Deelname vereist normaal gezien een aggregator, prekwalificatie en een goedgekeurde installatie. De werkelijke vergoeding hangt af van het contract, de markttoegang en de voorwaarden."
  },
  "ancillaryScenario": {
    "title": "Vergelijking van batterijgroottes voor ondersteunende diensten",
    "intro": "Bij de standaardberekening is geen batterij nodig. Hieronder vergelijken we de vergoeding voor ondersteunende diensten bij verschillende batterijgroottes.",
    "notRecommendation": "Dit is een vergelijkingsscenario, geen aanbevolen batterijgrootte.",
    "technicalTitle": "Technisch voorstel",
    "technicalHint": "De grootte is zo gekozen dat minstens 95% van de berekende capaciteit voor ondersteunende diensten voor uw aansluiting en verbruiksprofiel kan worden gebruikt. Het is een technisch voorstel, geen bewering over de meest winstgevende batterij.",
    "battery": "Batterij",
    "compensation": "Vergoeding voor ondersteunende diensten",
    "totalBenefit": "Berekend totaal voordeel",
    "maxInvestment": "Maximale investering bij de gekozen terugverdientijd",
    "maxInvestmentNone": "Niet te berekenen",
    "note": "De berekening is gebaseerd op historische vergoedingsniveaus. De werkelijke vergoeding, beschikbaarheid en de mogelijkheid om deel te nemen aan ondersteunende diensten hangen onder andere af van de markt, de aggregator en technische vereisten."
  },
  "ancillaryOnly": {
    "summaryProposal": "Technisch dimensioneringsvoorstel",
    "summaryBenefit": "Totaal geschat voordeel",
    "summaryMaxInvestment": "Maximale investering bij de gekozen terugverdientijd",
    "summaryExplanation": "De berekening betreft een standalone batterij zonder zonnepanelen. Het technisch dimensioneringsvoorstel is gebaseerd op de netaansluiting en de technische vereisten van de balanceringsdienst. Uw verbruik wordt vervolgens gebruikt om te berekenen hoeveel reserve beschikbaar kan blijven en wat de geschatte vergoeding is.",
    "comparisonIntro": "De vergelijking toont hoe de energiecapaciteit van de batterij het geschatte voordeel uit balanceringsdiensten beïnvloedt. Het technisch voorstel is gebaseerd op de vereisten van de dienst en de limieten van de netaansluiting.",
    "comparisonExplanation": "Balanceringsdiensten worden voornamelijk vergoed op basis van het vermogen dat beschikbaar kan blijven. Zodra de batterij voldoende energiecapaciteit heeft om dat vermogen te ondersteunen, leidt extra kWh niet automatisch tot een hogere vergoeding.",
    "sizingProposal": "Technisch dimensioneringsvoorstel",
    "sizingExplanation": "kW geeft aan hoeveel vermogen de batterij kan leveren. kWh geeft aan hoeveel energie ze kan opslaan. Balanceringsdiensten vereisen voldoende energiecapaciteit om het gereserveerde vermogen te ondersteunen binnen de technische vereisten van de dienst. Zodra aan die eis is voldaan, leidt extra kWh niet automatisch tot een hogere vergoeding.",
    "serviceCompensation": "Geschatte vergoeding voor u",
    "servicePriceBasis": "Prijsbasis",
    "servicePowerExplanation": "Het nominale vermogen van de batterij is niet automatisch hetzelfde als het vermogen dat beschikbaar kan blijven en in aanmerking komt voor een vergoeding. De berekening houdt rekening met de technische limieten van de batterij, de balanceringsdienst en de netaansluiting.",
    "investmentExplanation": "De maximale investering toont de totale investering die overeenkomt met de gekozen terugverdientijd, ervan uitgaande dat het geschatte voordeel van jaar 1 aanhoudt.",
    "investmentNotAQuote": "Het bedrag is geen geschatte marktprijs, geen offerte en geen garantie op toekomstige winstgevendheid.",
    "risks": [
      "werkelijk elektriciteitsverbruik en laadprofiel",
      "batterij-efficiëntie",
      "batterijdegradatie",
      "beschikbaarheid van de batterij",
      "marktprijzen voor balanceringsdiensten",
      "voorwaarden en mogelijke kosten van de aggregator",
      "markttoegang en prekwalificatie",
      "wijzigingen in de marktregels",
      "netbeperkingen"
    ],
    "installer": [
      "Bevestig de voorgestelde batterijcapaciteit.",
      "Bevestig het voorgestelde vermogen van batterij en omvormer.",
      "Controleer de hoofdzekering en netaansluiting.",
      "Controleer het toegestane laad- en ontlaadvermogen.",
      "Controleer eventuele vereisten van de netbeheerder.",
      "Controleer de installatie en het verdeelbord.",
      "Controleer de installatielocatie en brandveiligheid.",
      "Controleer garanties en de verwachte levensduur van de batterij.",
      "Controleer of de batterij de gekozen balanceringsdienst ondersteunt.",
      "Controleer de vereisten van de aggregator en voor prekwalificatie.",
      "Controleer de kosten en de verdeling van de opbrengsten bij de aggregator.",
      "Vergelijk de effectieve offerte met de maximale investering uit het rapport."
    ],
    "faq": [
      {
        "q": "Wat betekenen kW en kWh?",
        "a": "kW geeft aan hoeveel vermogen de batterij kan leveren. kWh geeft aan hoeveel energie ze kan opslaan."
      },
      {
        "q": "Waarom wordt deze batterijgrootte aanbevolen?",
        "a": "De grootte is een technisch dimensioneringsvoorstel gebaseerd op de netaansluiting en de technische vereisten van de balanceringsdienst. Uw verbruik wordt vervolgens gebruikt om te berekenen hoeveel reserve beschikbaar kan blijven en wat de geschatte vergoeding is."
      },
      {
        "q": "Hoe wordt de vergoeding voor balanceringsdiensten berekend?",
        "a": "Ze wordt berekend op basis van het vermogen dat beschikbaar kan blijven, historische marktprijzen en het aandeel voor de klant dat in de berekening wordt gebruikt."
      },
      {
        "q": "Waarom is het batterijvermogen hoger dan het vergoedbare vermogen?",
        "a": "Het nominale batterijvermogen wordt in de praktijk beperkt door de energiecapaciteit, de laadstatus (SOC), de vereisten voor de duurtijd van de dienst en de beschikbare ruimte op het net."
      },
      {
        "q": "Waarom verhoogt een grotere batterij niet altijd de vergoeding?",
        "a": "Zodra de batterij het vergoedbare vermogen kan ondersteunen volgens de technische vereisten van de dienst, leidt extra energiecapaciteit niet automatisch tot een hogere vergoeding."
      },
      {
        "q": "Is de vergoeding voor balanceringsdiensten gegarandeerd?",
        "a": "Nee. Ze is gebaseerd op historische prijzen en aannames over beschikbaarheid, markttoegang en contractvoorwaarden."
      },
      {
        "q": "Heb ik een aggregator nodig?",
        "a": "Een thuisbatterij neemt normaal deel via een aggregator, die doorgaans de markttoegang, prekwalificatie en afrekening verzorgt."
      },
      {
        "q": "Wat betekent maximale investering?",
        "a": "Het is de totale investering die overeenkomt met de gekozen terugverdientijd, ervan uitgaande dat het geschatte voordeel van jaar 1 aanhoudt."
      },
      {
        "q": "Is de maximale investering hetzelfde als de marktprijs van de batterij?",
        "a": "Nee. De maximale investering is geen geschatte marktprijs en ook geen offerte."
      },
      {
        "q": "Waarom kan de berekening van de installateur of aggregator verschillen?",
        "a": "Andere aannames over technische beperkingen, prijzen, beschikbaarheid, kosten, het aandeel voor de klant en marktvoorwaarden kunnen tot een ander resultaat leiden."
      },
      {
        "q": "Is het rapport een offerte?",
        "a": "Nee. Het rapport dient als hulp bij uw beslissing en moet worden aangevuld met een offerte, een technische inspectie en de voorwaarden van de aggregator."
      }
    ]
  },
  "sizing": {
    "title": "Waarom deze batterij?",
    "capacity": "Capaciteit",
    "power": "Vermogen",
    "cRate": "C-rate",
    "physicalNeed": "Fysieke vermogensbehoefte",
    "basePower": "Basisvermogen voor energiebeheer",
    "alternatives": "Gesimuleerde alternatieven",
    "lower": "Kleiner",
    "yours": "Jouw batterij",
    "higher": "Groter",
    "balance": "Het middelste alternatief is de grootte die volgens de berekening de beste balans biedt tussen batterijgrootte en geschat voordeel. Dit betekent niet dat het objectief gezien in alle opzichten de beste keuze is.",
    "consumerExplanation": "Mr. Battery Doc simuleert verschillende batterijgroottes op basis van het verbruik, de zonneproductie en de gekozen toepassingen van de woning. In dit geval biedt de aanbevolen grootte een goede balans tussen de omvang van de batterij en het geschatte voordeel. Een grotere batterij voegt beperkt extra voordeel toe en wordt daarom niet aanbevolen.",
    "recommendedLabel": "Aanbevolen",
    "powerTitle": "Batterijvermogen: {value}",
    "powerAncillaryExplanation": "Ongeveer {value} is nodig voor het energiebeheer van de woning. Het hoger aanbevolen vermogen maakt meer capaciteit mogelijk voor de geselecteerde nevendienst."
  },
  "energy": {
    "title": "Energiebalans zonder en met batterij",
    "load": "Jaarlijks verbruik",
    "pv": "Zonneproductie",
    "importBefore": "Netimport zonder batterij",
    "importAfter": "Netimport met batterij",
    "exportLabel": "Netexport",
    "exportBefore": "Export zonder batterij",
    "exportAfter": "Export met batterij",
    "selfConsumptionBefore": "Eigen verbruik zonder batterij",
    "selfConsumptionAfter": "Eigen verbruik met batterij",
    "selfSufficiencyBefore": "Zelfvoorziening zonder batterij",
    "selfSufficiencyAfter": "Zelfvoorziening met batterij",
    "gridCharged": "Energie geladen van het net",
    "shifted": "Verschoven zonne-energie",
    "losses": "Batterijverliezen",
    "cycles": "Equivalente volledige cycli per jaar"
  },
  "grid": {
    "title": "Vermogen en net",
    "fuse": "Hoofdzekering",
    "connection": "Netaansluiting",
    "theoretical": "Theoretische netcapaciteit",
    "peakBefore": "Hoogste afname zonder batterij",
    "peakAfter": "Hoogste afname met batterij",
    "reduction": "Piekvermindering",
    "curtailed": "Geblokkeerde injectie",
    "status": "Netbeoordeling",
    "kwKwh": "kW is vermogen, hoeveel de batterij tegelijk kan laden of ontladen. kWh is energie, hoeveel ze kan opslaan."
  },
  "investment": {
    "title": "Maximale investering en terugverdientijd",
    "selected": "Gekozen terugverdientijd",
    "max": "Maximale investering",
    "scenarios": "Maximale investering bij verschillende terugverdientijden",
    "yourChoice": "Jouw keuze",
    "explanation": "De maximale investering is geen geschatte marktprijs of offerte. Het toont het investeringsniveau dat past bij jouw gekozen terugverdientijd, op basis van de berekende economische waarde.",
    "notAQuote": "Het bedrag is geen geschatte marktprijs en geen offerte. Het volgt enkel uit de geschatte economische waarde en jouw gekozen terugverdientijd.",
    "unavailable": "De maximale investering kan niet berekend worden omdat de berekening geen positieve economische waarde oplevert.",
    "headline": "Jouw referentiepunt voor een offerte",
    "paybackText": "Bij een gekozen terugverdientijd van {years} geeft de berekening een maximale investering van ongeveer {amount}.",
    "ancillaryDependencyTitle": "Met en zonder nevendiensten",
    "withAncillary": "Economische waarde met de geselecteerde nevendienst",
    "withoutAncillary": "Economische waarde exclusief nevendiensten",
    "dependencyNote": "De vergelijking toont hoeveel van de berekening afhangt van de geschatte vergoeding voor nevendiensten."
  },
  "assumptions": {
    "title": "Uw invoer en rekenaannames",
    "property": "De woning",
    "battery": "De batterij",
    "economy": "Economie",
    "ancillary": "Ondersteunende diensten",
    "annualConsumption": "Jaarlijks verbruik",
    "solarProduction": "Productie zonnepanelen",
    "consumptionProfile": "Verbruiksprofiel",
    "fuse": "Hoofdzekering",
    "connection": "Aansluiting",
    "gridPowerLimit": "Max. netaansluitingsvermogen",
    "capacity": "Capaciteit",
    "power": "Vermogen",
    "efficiency": "Round-trip efficiëntie",
    "socWindow": "SOC-limieten",
    "reserveSoc": "Gereserveerde SOC",
    "serviceSocUp": "Dienst-SOC, opwaartse regeling",
    "serviceSocDown": "Dienst-SOC, neerwaartse regeling",
    "maxCycles": "Maximum cycli per jaar",
    "importPrice": "Aankoopprijs elektriciteit",
    "exportPrice": "Verkochte zonne-energie (spotprijs)",
    "demandCharge": "Capaciteitstarief",
    "payback": "Gekozen terugverdientijd",
    "market": "Geselecteerde markt",
    "share": "Aangenomen aandeel klant",
    "horizonNote": "De berekening is gebaseerd op één jaar. Degradatie, prijsevoluties en disconteringsvoet zijn niet meegerekend in het voordeel."
  },
  "risks": {
    "title": "Wat kan de uitkomst beïnvloeden?",
    "text": "Het rapport is een hulpmiddel bij uw beslissing, geen garantie en geen offerte. De werkelijke uitkomst kan afwijken, onder andere door:",
    "items": [
      "werkelijk elektriciteitsverbruik en belastingsprofiel",
      "werkelijke zonneproductie",
      "elektriciteitsprijzen en nettarieven",
      "capaciteitstarieven en tariefmodellen",
      "efficiëntie en degradatie van de batterij",
      "beschikbaarheid van de batterij doorheen het jaar",
      "prijzen en voorwaarden op de markt voor nevendiensten",
      "voorwaarden en mogelijke kosten van de aggregator",
      "marktregels en netbeperkingen"
    ]
  },
  "installer": {
    "title": "Door te nemen met de installateur",
    "items": [
      "Ga na of de voorgestelde batterijcapaciteit geschikt is voor de woning.",
      "Ga na of het voorgestelde vermogen van de batterij en omvormer technisch mogelijk is.",
      "Controleer de hoofdzekering en netaansluiting bij de netbeheerder.",
      "Ga na of de installatie aanpassingen aan de verdeelkast vereist.",
      "Controleer de installatielocatie, temperatuurvereisten en brandveiligheid.",
      "Controleer de garanties en de verwachte levensduur van de batterij.",
      "Controleer het toegestane laad- en ontlaadvermogen.",
      "Controleer de compatibiliteit met een bestaande of geplande zonnepaneleninstallatie.",
      "Controleer de voorwaarden voor ondersteunende diensten, aggregator en prekwalificatie.",
      "Vergelijk de offerteprijs met de maximale investering in dit rapport."
    ]
  },
  "faq": {
    "title": "Veelgestelde vragen",
    "items": [
      {
        "q": "Wat betekenen kW en kWh?",
        "a": "kW is vermogen, hoe snel de batterij kan laden of ontladen. kWh is energie, hoeveel ze kan opslaan."
      },
      {
        "q": "Waarom wordt deze batterijgrootte aanbevolen?",
        "a": "De berekening simuleert verschillende groottes en kiest de beste balans tussen grootte en geschat voordeel voor uw invoer."
      },
      {
        "q": "Wat betekent eigen verbruik?",
        "a": "Het aandeel van de zonneproductie dat in het gebouw wordt gebruikt in plaats van naar het net wordt geëxporteerd."
      },
      {
        "q": "Wat betekent zelfvoorziening?",
        "a": "Het aandeel van het elektriciteitsverbruik van het gebouw dat wordt gedekt door eigen elektriciteit in plaats van aangekochte elektriciteit."
      },
      {
        "q": "Wat is piekafvlakking?",
        "a": "De batterij vlakt de hoogste stroompieken af, wat het capaciteitstarief kan verlagen."
      },
      {
        "q": "Hoe wordt de vergoeding voor ondersteunende diensten berekend?",
        "a": "Op basis van het vermogen dat de batterij fysiek beschikbaar kan houden en historische marktprijzen, verminderd met het deel dat niet naar u gaat."
      },
      {
        "q": "Zijn de inkomsten uit ondersteunende diensten gegarandeerd?",
        "a": "Nee. Ze zijn gebaseerd op historische prijzen en aannames over beschikbaarheid en contractvoorwaarden."
      },
      {
        "q": "Wat betekent maximale investering?",
        "a": "Ongeveer hoeveel de batterij mag kosten om uw gekozen terugverdientijd te evenaren, gezien het berekende jaarlijkse voordeel."
      },
      {
        "q": "Is de maximale investering hetzelfde als de marktprijs?",
        "a": "Nee. Dit zegt niets over wat batterijen kosten, enkel wat de berekening ondersteunt."
      },
      {
        "q": "Waarom kan de berekening van de installateur verschillen?",
        "a": "Verschillende aannames over prijzen, verbruiksprofiel, efficiëntie, beschikbaarheid en ondersteunende diensten geven verschillende resultaten."
      },
      {
        "q": "Is het rapport een offerte?",
        "a": "Nee. Het rapport is een hulpmiddel bij uw beslissing en moet worden aangevuld met een offerte en een beoordeling ter plaatse."
      }
    ]
  },
  "about": {
    "pageTitle": "Belangrijk om te weten",
    "title": "Over dit rapport",
    "items": [
      "Het rapport is een hulp bij uw beslissing en moet worden aangevuld met een offerte en een plaatsbezoek.",
      "Het rapport is geen offerte en zegt niets over wat een batterij op de markt kost.",
      "Het resultaat is een berekening op basis van uw input en de aannames van de berekening, geen garantie.",
      "De berekening geldt voor jaar 1.",
      "Er is geen toekomstige prijsontwikkeling meegenomen in de berekening.",
      "Er is geen toekomstige batterijdegradatie meegenomen in de berekening."
    ]
  },
  "terms": {
    "kwKwh": "kW is vermogen, hoeveel de batterij tegelijk kan laden of ontladen. kWh is energie, hoeveel ze kan opslaan.",
    "selfConsumption": "Zelfconsumptie is het aandeel van de zonneproductie dat in de woning wordt verbruikt in plaats van naar het net te exporteren.",
    "selfSufficiency": "Zelfvoorziening is het aandeel van het elektriciteitsverbruik dat door eigen stroom wordt gedekt in plaats van stroom van het net.",
    "peakShaving": "Piekreductie betekent dat de batterij de hoogste pieken afvlakt, waardoor het capaciteitstarief kan dalen."
  }
};
