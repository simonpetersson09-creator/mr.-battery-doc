/** Dutch report copy. Same structure as the Swedish source text. */
import type { ReportCopy } from "./copy";

export const nl: ReportCopy = {
  title: "Batterijrapport",
  brand: "Mr. Battery Doc",
  created: "Aangemaakt",
  perYear: "/jr",
  reportIdLabel: "Rapport-ID",
  pageLabel: "Pagina",
  ofLabel: "van",
  engineVersionLabel: "Berekeningsversie",
  notAvailable: "Niet beschikbaar",
  cannotBeCalculated: "Kan niet worden berekend",
  before: "Zonder batterij",
  after: "Met batterij",
  tagline: "Een slimmere manier om je elektriciteit te gebruiken",
  footerTagline: "Betere beslissingen voor een slimmere toekomst",

  source: {
    user: "Jouw waarde",
    calculated: "Berekend",
    default: "Standaardaanname",
    external: "Externe databron",
  },

  searchLimit: {
    atLeastCapacity: "Minstens {value}",
    atLeastPower: "Minstens {value}",
    capacityNote:
      "De bovengrens van de capaciteit voor deze analyse is bereikt. Een grotere batterij kan mogelijk extra voordeel opleveren.",
    powerNote:
      "De bovengrens van het vermogen voor deze analyse is bereikt. Een systeem met een hoger vermogen vereist mogelijk een aparte analyse.",
    bothNote:
      "De woning bevindt zich aan de bovengrens van deze analyse. Grotere systemen moeten worden gedimensioneerd met een uitgebreide technische studie.",
  },

  summary: {
    title: "Samenvatting",
    capacity: "Batterijcapaciteit",
    power: "Batterijvermogen",
    benefit: "Geschatte economische waarde, jaar 1",
    maxInvestment: "Maximale investering bij jouw gekozen terugverdientijd",
    improvements: "Hoe de woning verbetert",
    selfConsumption: "Eigen verbruik",
    selfSufficiency: "Zelfvoorziening",
    gridImport: "Netimport",
    peak: "Piekvermogen",
    shifted: "verschoven zonne-energie",
    peakLower: "lagere piek",
    recommendedBattery: "Aanbevolen batterij",
    paybackLabel: "Gekozen terugverdientijd",
    valueSplit: "Hoe de economische waarde is verdeeld",
    shiftedSolar: "Verschoven zonne-energie",
    ancillaryShareNote:
      "Van de geschatte economische waarde komt {value} uit netdiensten, gebaseerd op historische marktprijzen.",
    subtitle: "Aanbevolen batterij en geschatte waarde voor jouw woning",
    improvementsSubtitle:
      "Met de batterij gebruik je meer van je eigen stroom en koop je minder van het net.",
    selfConsumptionHint: "Aandeel van de zonnestroom die direct in de woning wordt gebruikt.",
    selfSufficiencyHint: "Aandeel van het elektriciteitsverbruik dat wordt gedekt door je eigen stroom.",
    gridImportHint: "Elektriciteit die van het net wordt gekocht.",
    shiftedSolarHint:
      "Meer van je eigen zonneproductie wordt in de woning gebruikt in plaats van aan het net geleverd.",
    percentagePoints: "procentpunten",
    perYearLong: "per jaar",
  },

  benefit: {
    title: "Waar komt de waarde vandaan?",
    total: "Geschatte economische waarde, jaar 1",
    energy: "Verschoven zonne-energie en minder netafname",
    energyHint:
      "De batterij slaat een overschot aan zonnestroom op en gebruikt de energie wanneer de woning het nodig heeft.",
    energyNoSolarHint:
      "De batterij laadt op als elektriciteit goedkoper is en wordt gebruikt wanneer de woning het nodig heeft.",
    peak: "Piekafvlakking",
    peakHint:
      "De batterij kan piekvermogen afvlakken en zo de kosten verlagen waar een capaciteitstarief geldt.",
    ancillary: "Netdiensten",
    ancillaryHint:
      "Geschatte vergoeding van de geselecteerde dienst, gebaseerd op historische marktprijzen en de aannames van de berekening.",
    none: "De berekening toont geen meetbaar economisch voordeel met je huidige invoer.",
    note: "De berekening heeft betrekking op jaar 1. Het rapport bevat geen meerjarenprognose, omdat de berekening geen rekening houdt met toekomstige prijzen of degradatie.",
    historicalBox: "Historische berekening – geen garantie voor toekomstige inkomsten.",
    shareOfTotal: "van het totaal",
  },

  ancillary: {
    title: "Netdiensten",
    product: "Geselecteerde dienst",
    offered: "Aangeboden vermogen",
    reservable: "Fysiek reserveerbaar vermogen (gemiddeld)",
    technicalTitle: "Technische basis",
    technicalNote:
      "Fysiek reserveerbaar vermogen is een afzonderlijke maat voor gemiddelde reserveerbaarheid, niet het vermogen waarover de vergoeding wordt berekend.",
    held: "Gereserveerd vermogen (gemiddeld)",
    monetized: "Geschat vergoedbaar vermogen",
    availability: "Beschikbaarheid",
    limiting: "Wat de batterijgrootte beperkt",
    limitingPower: "Batterijvermogen",
    limitingEnergy: "Opgeslagen energie / SOC",
    limitingGrid: "Netcapaciteit",
    limitingNone: "Geen beperking",
    reservedEnergy: "Gereserveerde energie",
    reservedHours: "Uren met reservering",
    marketValue: "Geschatte marktwaarde",
    share: "Jouw aandeel van de marktwaarde",
    customerValue: "Geschatte vergoeding aan jou",
    priceBasis: "Prijsbasis",
    priceBasisValue: "Historische marktprijzen",
    nominalPower: "Nominaal batterijvermogen",
    historicalWarning:
      "Historische berekening – geen garantie voor toekomstige inkomsten. De werkelijke vergoeding hangt onder andere af van toekomstige marktprijzen, beschikbaarheid, overeenkomsten met de aggregator en marktregels.",
    noPriceData:
      "Er kan geen economische waarde worden berekend voor deze markt omdat geverifieerde prijsdata ontbreekt. Vermogen en beschikbaarheid worden wel berekend, maar er worden geen inkomsten gerapporteerd.",
    note: "Deelname vereist normaal gesproken een aggregator, prekwalificatie en een goedgekeurde installatie. De werkelijke vergoeding is afhankelijk van contract, markttoegang en voorwaarden.",
  },

  ancillaryScenario: {
    title: "Vergelijking van batterijgroottes voor netdiensten",
    intro:
      "De standaardberekening vindt geen noodzaak voor een batterij. Hieronder staat een vergelijking van hoe verschillende batterijgroottes vergoed zouden worden voor netdiensten.",
    notRecommendation: "Dit is een vergelijkingsscenario, geen aanbevolen batterijgrootte.",
    technicalTitle: "Technisch voorstel",
    technicalHint:
      "De grootte is zo gekozen dat ten minste 95% van de berekende capaciteit voor netdiensten voor jouw aansluiting en verbruiksprofiel kan worden benut. Het is een technisch voorstel, geen claim over de meest winstgevende batterij.",
    battery: "Batterij",
    compensation: "Vergoeding netdiensten",
    totalBenefit: "Berekend totaal voordeel",
    maxInvestment: "Maximale investering bij de gekozen terugverdientijd",
    maxInvestmentNone: "Kan niet worden berekend",
    note: "De berekening is gebaseerd op historische vergoedingsniveaus. Werkelijke vergoeding, beschikbaarheid en de mogelijkheid om deel te nemen aan netdiensten hangen onder andere af van de markt, de aggregator en technische vereisten.",
  },

  ancillaryOnly: {
    summaryProposal: "Technisch dimensioneringsvoorstel",
    summaryBenefit: "Totaal geschat voordeel",
    summaryMaxInvestment: "Maximale investering bij de gekozen terugverdientijd",
    summaryExplanation:
      "De berekening betreft een standalone batterij zonder zonnepanelen. Het technische dimensioneringsvoorstel is gebaseerd op de netaansluiting en de technische eisen van de netdienst. Jouw verbruik wordt vervolgens gebruikt om te berekenen hoeveel reserve beschikbaar kan blijven en wat de geschatte vergoeding is.",
    comparisonIntro:
      "De vergelijking laat zien hoe de energiecapaciteit van de batterij het geschatte voordeel uit netdiensten beïnvloedt. Het technische voorstel is gebaseerd op de eisen van de dienst en de limieten van de netaansluiting.",
    comparisonExplanation:
      "Netdiensten worden voornamelijk vergoed op basis van het vermogen dat beschikbaar kan blijven. Zodra de batterij genoeg energiecapaciteit heeft om dat vermogen te ondersteunen, verhogen extra kWh niet automatisch de vergoeding.",
    sizingProposal: "Technisch dimensioneringsvoorstel",
    sizingExplanation:
      "kW geeft aan hoeveel vermogen de batterij kan leveren. kWh geeft aan hoeveel energie hij kan opslaan. Netdiensten vereisen voldoende energiecapaciteit om het gereserveerde vermogen binnen de technische eisen van de dienst te ondersteunen. Zodra aan die eis is voldaan, verhogen extra kWh niet automatisch de vergoeding.",
    serviceCompensation: "Geschatte vergoeding aan jou",
    servicePriceBasis: "Prijsbasis",
    servicePowerExplanation:
      "Het nominale vermogen van de batterij is niet automatisch hetzelfde als het vermogen dat beschikbaar kan blijven en in aanmerking komt voor vergoeding. De berekening houdt rekening met de technische limieten van de batterij, de netdienst en de netaansluiting.",
    investmentExplanation:
      "De maximale investering toont de totale investering die overeenkomt met de gekozen terugverdientijd, ervan uitgaande dat het geschatte voordeel van jaar 1 aanhoudt.",
    investmentNotAQuote:
      "Het bedrag is geen geschatte marktprijs, geen offerte en geen garantie voor toekomstige winstgevendheid.",
    risks: [
      "werkelijk elektriciteitsverbruik en verbruiksprofiel",
      "efficiëntie van de batterij",
      "degradatie van de batterij",
      "beschikbaarheid van de batterij",
      "marktprijzen voor netdiensten",
      "voorwaarden en mogelijke kosten van de aggregator",
      "markttoegang en prekwalificatie",
      "wijzigingen in marktregels",
      "beperkingen van het elektriciteitsnet",
    ],
    installer: [
      "Bevestig de voorgestelde batterijcapaciteit.",
      "Bevestig het voorgestelde vermogen van de batterij en omvormer.",
      "Controleer de hoofdzekering en netaansluiting.",
      "Controleer het toegestane laad- en ontlaadvermogen.",
      "Controleer eventuele eisen van de netbeheerder.",
      "Controleer de installatie en de meterkast.",
      "Controleer de installatielocatie en brandveiligheid.",
      "Controleer garanties en de verwachte levensduur van de batterij.",
      "Controleer of de batterij de geselecteerde netdienst ondersteunt.",
      "Controleer de vereisten van de aggregator en voor prekwalificatie.",
      "Controleer de kosten en opbrengstverdeling van de aggregator.",
      "Vergelijk de daadwerkelijke offerte met de maximale investering in het rapport.",
    ],
    faq: [
      {
        q: "Wat betekenen kW en kWh?",
        a: "kW geeft aan hoeveel vermogen de batterij kan leveren. kWh geeft aan hoeveel energie hij kan opslaan.",
      },
      {
        q: "Waarom wordt deze batterijgrootte aanbevolen?",
        a: "De grootte is een technisch dimensioneringsvoorstel gebaseerd op de netaansluiting en de technische eisen van de netdienst. Jouw verbruik wordt vervolgens gebruikt om te berekenen hoeveel reserve beschikbaar kan blijven en wat de geschatte vergoeding is.",
      },
      {
        q: "Hoe wordt de vergoeding voor netdiensten berekend?",
        a: "Deze wordt berekend op basis van het vermogen dat beschikbaar kan blijven, historische marktprijzen en het klantenaandeel dat in de berekening wordt gebruikt.",
      },
      {
        q: "Waarom is het batterijvermogen hoger dan het vergoedbare vermogen?",
        a: "Het nominale batterijvermogen wordt in de praktijk beperkt door energiecapaciteit, SOC, duurvereisten van de dienst en beschikbare netruimte.",
      },
      {
        q: "Waarom leidt een grotere batterij niet altijd tot een hogere vergoeding?",
        a: "Zodra de batterij het vergoedbare vermogen kan volhouden volgens de technische eisen van de dienst, verhoogt extra energiecapaciteit niet automatisch de vergoeding.",
      },
      {
        q: "Is de vergoeding voor netdiensten gegarandeerd?",
        a: "Nee. Deze is gebaseerd op historische prijzen en aannames over beschikbaarheid, markttoegang en contractvoorwaarden.",
      },
      {
        q: "Heb ik een aggregator nodig?",
        a: "Een thuisbatterij neemt normaal gesproken deel via een aggregator, die meestal de markttoegang, prekwalificatie en afrekening verzorgt.",
      },
      {
        q: "Wat betekent maximale investering?",
        a: "Dit is de totale investering die overeenkomt met de gekozen terugverdientijd, ervan uitgaande dat het geschatte voordeel van jaar 1 aanhoudt.",
      },
      {
        q: "Is de maximale investering hetzelfde als de marktprijs van de batterij?",
        a: "Nee. De maximale investering is geen geschatte marktprijs en ook geen offerte.",
      },
      {
        q: "Waarom kan de berekening van de installateur of aggregator verschillen?",
        a: "Andere aannames over technische beperkingen, prijzen, beschikbaarheid, kosten, klantenaandeel en marktvoorwaarden kunnen een ander resultaat opleveren.",
      },
      {
        q: "Is dit rapport een offerte?",
        a: "Nee. Het rapport is een hulpmiddel bij je beslissing en moet worden aangevuld met een offerte, een technische inspectie en de voorwaarden van de aggregator.",
      },
    ],
  },

  sizing: {
    title: "Waarom deze batterij?",
    capacity: "Capaciteit",
    power: "Vermogen",
    cRate: "C-rate",
    physicalNeed: "Fysieke vermogensbehoefte",
    basePower: "Basisvermogen voor energiebeheer",
    alternatives: "Gesimuleerde alternatieven",
    lower: "Kleiner",
    yours: "Jouw batterij",
    higher: "Groter",
    balance:
      "Het middelste alternatief is de grootte waarbij de berekening de beste balans vindt tussen batterijgrootte en geschat voordeel. Dit is geen claim dat het objectief gezien in alle opzichten de beste is.",
    consumerExplanation:
      "Mr. Battery Doc simuleert verschillende batterijgroottes op basis van het verbruik van de woning, de zonneproductie en de geselecteerde toepassingen. In dit geval geeft de aanbevolen grootte een goede balans tussen batterijgrootte en geschat voordeel. Een grotere batterij voegt beperkt extra voordeel toe en wordt daarom niet aanbevolen.",
    recommendedLabel: "Aanbevolen",
    powerTitle: "Batterijvermogen: {value}",
    powerAncillaryExplanation:
      "Ongeveer {value} is nodig voor het energiebeheer van de woning. Het hoger aanbevolen vermogen maakt meer capaciteit mogelijk voor de geselecteerde netdienst.",
  },

  energy: {
    title: "Energiebalans zonder en met batterij",
    load: "Jaarlijks verbruik",
    pv: "Zonneproductie",
    importBefore: "Netimport zonder batterij",
    importAfter: "Netimport met batterij",
    exportLabel: "Netexport",
    exportBefore: "Export zonder batterij",
    exportAfter: "Export met batterij",
    selfConsumptionBefore: "Eigen verbruik zonder batterij",
    selfConsumptionAfter: "Eigen verbruik met batterij",
    selfSufficiencyBefore: "Zelfvoorziening zonder batterij",
    selfSufficiencyAfter: "Zelfvoorziening met batterij",
    gridCharged: "Energie geladen vanaf het net",
    shifted: "Verschoven zonne-energie",
    losses: "Batterijverliezen",
    cycles: "Equivalente volledige cycli per jaar",
  },

  grid: {
    title: "Vermogen en netaansluiting",
    fuse: "Hoofdzekering",
    connection: "Netaansluiting",
    theoretical: "Theoretische netcapaciteit",
    peakBefore: "Hoogste import zonder batterij",
    peakAfter: "Hoogste import met batterij",
    reduction: "Piekafvlakking",
    curtailed: "Geblokkeerde export",
    status: "Netbeoordeling",
    kwKwh:
      "kW is vermogen, hoeveel de batterij tegelijk kan laden of ontladen. kWh is energie, hoeveel hij kan opslaan.",
  },

  investment: {
    title: "Maximale investering en terugverdientijd",
    selected: "Gekozen terugverdientijd",
    max: "Maximale investering",
    scenarios: "Maximale investering bij verschillende terugverdientijden",
    yourChoice: "Jouw keuze",
    explanation:
      "De maximale investering is geen geschatte marktprijs of offerte. Het toont het investeringsniveau dat past bij jouw gekozen terugverdientijd, gebaseerd op de economische waarde die de berekening oplevert.",
    notAQuote:
      "Het bedrag is geen geschatte marktprijs en geen offerte. Het volgt enkel uit de geschatte economische waarde en jouw gekozen terugverdientijd.",
    unavailable:
      "Maximale investering kan niet worden berekend omdat de berekening geen positieve economische waarde aantoont.",
    headline: "Jouw referentiepunt voor een offerte",
    paybackText:
      "Voor een gekozen terugverdientijd van {years} jaar geeft de berekening een maximale investering van ongeveer {amount}.",
    ancillaryDependencyTitle: "Met en zonder netdiensten",
    withAncillary: "Economische waarde met de geselecteerde netdienst",
    withoutAncillary: "Economische waarde exclusief netdiensten",
    dependencyNote:
      "De vergelijking laat zien welk deel van de berekening afhankelijk is van de geschatte vergoeding voor netdiensten.",
  },

  assumptions: {
    title: "Jouw invoer en rekenaannames",
    property: "De woning",
    battery: "De batterij",
    economy: "Economie",
    ancillary: "Netdiensten",
    annualConsumption: "Jaarlijks verbruik",
    solarProduction: "Zonneproductie",
    consumptionProfile: "Verbruiksprofiel",
    fuse: "Hoofdzekering",
    connection: "Aansluiting",
    gridPowerLimit: "Max. aansluitvermogen",
    capacity: "Capaciteit",
    power: "Vermogen",
    efficiency: "Round-trip efficiëntie",
    socWindow: "SOC-limieten",
    reserveSoc: "Gereserveerde SOC",
    serviceSocUp: "SOC voor dienst, opregelen",
    serviceSocDown: "SOC voor dienst, afregelen",
    maxCycles: "Maximum cycli per jaar",
    importPrice: "Ingekochte elektriciteit",
    exportPrice: "Verkochte zonnestroom (spotprijs)",
    demandCharge: "Capaciteitstarief",
    payback: "Gekozen terugverdientijd",
    market: "Geselecteerde markt",
    share: "Aangenomen klantenaandeel",
    horizonNote:
      "De berekeningsperiode is één jaar. Er wordt geen degradatie, prijsontwikkeling of discontovoet meegenomen in het gerapporteerde voordeel.",
  },

  risks: {
    title: "Wat kan het resultaat beïnvloeden?",
    text: "Het rapport is een hulpmiddel bij je beslissing, geen garantie en geen offerte. Het werkelijke resultaat kan afwijken, onder andere door:",
    items: [
      "werkelijk elektriciteitsverbruik en verbruiksprofiel",
      "werkelijke zonneproductie",
      "elektriciteitsprijzen en netwerkkosten",
      "capaciteitstarieven en tariefmodellen",
      "efficiëntie en degradatie van de batterij",
      "beschikbaarheid van de batterij gedurende het jaar",
      "prijzen en voorwaarden op de markt voor netdiensten",
      "voorwaarden en mogelijke kosten van de aggregator",
      "marktregels en beperkingen van het elektriciteitsnet",
    ],
  },

  installer: {
    title: "Om door te nemen met de installateur",
    items: [
      "Bevestig dat de voorgestelde batterijcapaciteit bij de woning past.",
      "Bevestig dat het voorgestelde vermogen van de batterij en omvormer technisch mogelijk is.",
      "Controleer de hoofdzekering en netaansluiting bij de netbeheerder.",
      "Controleer of de installatie aanpassingen in de meterkast vereist.",
      "Controleer de installatielocatie, temperatuureisen en brandveiligheid.",
      "Controleer garanties en de verwachte levensduur van de batterij.",
      "Controleer het toegestane laad- en ontlaadvermogen.",
      "Controleer de compatibiliteit met een bestaande of geplande installatie voor zonnepanelen.",
      "Controleer de voorwaarden voor netdiensten, aggregator en prekwalificatie.",
      "Vergelijk de geoffreerde prijs met de maximale investering in dit rapport.",
    ],
  },

  faq: {
    title: "Veelgestelde vragen",
    items: [
      {
        q: "Wat betekenen kW en kWh?",
        a: "kW is vermogen, hoe snel de batterij kan laden of ontladen. kWh is energie, hoeveel hij kan opslaan.",
      },
      {
        q: "Waarom wordt deze batterijgrootte aanbevolen?",
        a: "De berekening simuleert verschillende groottes en kiest degene met de beste balans tussen grootte en geschat voordeel voor jouw invoer.",
      },
      {
        q: "Wat betekent eigen verbruik?",
        a: "Het aandeel van de zonneproductie dat in de woning wordt gebruikt in plaats van aan het net geleverd.",
      },
      {
        q: "Wat betekent zelfvoorziening?",
        a: "Het aandeel van het elektriciteitsverbruik van de woning dat wordt gedekt door eigen stroom in plaats van ingekochte stroom.",
      },
      {
        q: "Wat is piekafvlakking?",
        a: "De batterij vlakt de hoogste vermogenspieken af, wat het capaciteitstarief kan verlagen.",
      },
      {
        q: "Hoe wordt de vergoeding voor netdiensten berekend?",
        a: "Op basis van het vermogen dat de batterij fysiek beschikbaar kan houden en historische marktprijzen, verminderd met het aandeel dat niet naar jou gaat.",
      },
      {
        q: "Is de opbrengst uit netdiensten gegarandeerd?",
        a: "Nee. Deze is gebaseerd op historische prijzen en aannames over beschikbaarheid en contractvoorwaarden.",
      },
      {
        q: "Wat betekent maximale investering?",
        a: "Ongeveer hoeveel de batterij mag kosten om je gekozen terugverdientijd te halen, gegeven het berekende jaarlijkse voordeel.",
      },
      {
        q: "Is de maximale investering hetzelfde als de marktprijs?",
        a: "Nee. Het zegt niets over wat batterijen kosten, alleen wat de berekening ondersteunt.",
      },
      {
        q: "Waarom kan de berekening van de installateur verschillen?",
        a: "Andere aannames over prijzen, verbruiksprofiel, efficiëntie, beschikbaarheid en netdiensten geven andere resultaten.",
      },
      {
        q: "Is dit rapport een offerte?",
        a: "Nee. Het rapport is een hulpmiddel bij je beslissing en moet worden aangevuld met een offerte en een inspectie ter plaatse.",
      },
    ],
  },

  about: {
    pageTitle: "Belangrijk om te weten",
    title: "Over dit rapport",
    items: [
      "Het rapport is een hulpmiddel bij je beslissing en moet worden aangevuld met een offerte en een inspectie ter plaatse.",
      "Het rapport is geen offerte en zegt niets over wat een batterij op de markt kost.",
      "Het resultaat is een berekening gebaseerd op jouw invoer en de aannames van de berekening, geen garantie.",
      "De berekening heeft betrekking op jaar 1.",
      "Er is geen toekomstige prijsontwikkeling meegenomen in de berekening.",
      "Er is geen toekomstige batterijdegradatie meegenomen in de berekening.",
    ],
  },

  terms: {
    kwKwh:
      "kW is vermogen, hoeveel de batterij tegelijk kan laden of ontladen. kWh is energie, hoeveel hij kan opslaan.",
    selfConsumption:
      "Eigen verbruik is het aandeel van de zonneproductie dat in de woning wordt gebruikt in plaats van aan het net geleverd.",
    selfSufficiency:
      "Zelfvoorziening is het aandeel van het elektriciteitsverbruik van de woning dat wordt gedekt door eigen stroom in plaats van ingekochte stroom.",
    peakShaving:
      "Piekafvlakking betekent dat de batterij de hoogste pieken afvlakt, wat het capaciteitstarief kan verlagen.",
  },
};