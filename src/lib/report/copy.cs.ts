/** Czech report copy. Same structure as the Swedish source text. */
import type { ReportCopy } from "./copy";

export const cs: ReportCopy = {
  "notAvailable": "Není k dispozici",
  "created": "Vytvořeno",
  "before": "Bez baterie",
  "ofLabel": "z",
  "after": "S baterií",
  "brand": "Mr. Battery Doc",
  "engineVersionLabel": "Verze výpočtu",
  "footerTagline": "Lepší rozhodnutí pro světlejší budoucnost",
  "pageLabel": "Stránka",
  "source": {
    "user": "Vaše hodnota",
    "calculated": "Vypočteno",
    "default": "Výchozí předpoklad",
    "external": "Externí zdroj dat"
  },
  "perYear": "/rok",
  "cannotBeCalculated": "Nelze vypočítat",
  "reportIdLabel": "ID zprávy",
  "title": "Zpráva o baterii",
  "searchLimit": {
    "atLeastCapacity": "Minimálně {value}",
    "atLeastPower": "Minimálně {value}",
    "capacityNote": "Bylo dosaženo horního limitu kapacity pro tuto analýzu. Větší baterie může přinést další výhody.",
    "powerNote": "Bylo dosaženo horního limitu výkonu pro tuto analýzu. Systém s vyšším výkonem může vyžadovat samostatnou analýzu.",
    "bothNote": "Objekt dosáhl horního limitu dimenzování pro tuto analýzu. Větší systémy by měly být dimenzovány na základě rozšířené technické studie."
  },
  "sizing": {
    "title": "Proč tato baterie?",
    "capacity": "Kapacita",
    "power": "Výkon",
    "cRate": "C-rate",
    "physicalNeed": "Fyzická potřeba výkonu",
    "basePower": "Základní výkon pro práci s energií",
    "alternatives": "Simulované alternativy",
    "lower": "Menší",
    "yours": "Vaše baterie",
    "higher": "Větší",
    "balance": "Prostřední alternativa je velikost, u které výpočet nalezl nejlepší rovnováhu mezi velikostí baterie a odhadovaným přínosem. Nejde o tvrzení, že je objektivně nejlepší v každém ohledu.",
    "consumerExplanation": "Mr. Battery Doc simuluje několik velikostí baterií na základě spotřeby nemovitosti, solární výroby a zvoleného využití. V tomto případě doporučená velikost poskytuje dobrou rovnováhu mezi velikostí baterie a odhadovaným přínosem. Větší baterie přináší jen omezený další přínos, a proto se nedoporučuje.",
    "recommendedLabel": "Doporučeno",
    "powerTitle": "Výkon baterie: {value}",
    "powerAncillaryExplanation": "Pro práci s energií v nemovitosti je potřeba přibližně {value}. Vyšší doporučený výkon umožňuje větší kapacitu pro zvolenou podpůrnou službu."
  },
  "faq": {
    "title": "Často kladené otázky",
    "items": [
      {
        "q": "Co znamenají kW a kWh?",
        "a": "kW je výkon, tedy jak rychle se baterie může nabíjet nebo vybíjet. kWh je energie, tedy kolik dokáže uložit."
      },
      {
        "q": "Proč je doporučena tato velikost baterie?",
        "a": "Výpočet simuluje několik velikostí a vybírá tu s nejlepším poměrem mezi velikostí a odhadovaným přínosem pro vaše vstupy."
      },
      {
        "q": "Co znamená vlastní spotřeba?",
        "a": "Podíl solární výroby spotřebované v objektu namísto exportu do sítě."
      },
      {
        "q": "Co znamená soběstačnost?",
        "a": "Podíl spotřeby elektřiny v objektu pokrytý vlastní elektřinou namísto elektřiny nakoupené."
      },
      {
        "q": "Co je ořezávání špiček (peak shaving)?",
        "a": "Baterie ořezává nejvyšší výkonové špičky, což může snížit poplatky za rezervovaný příkon."
      },
      {
        "q": "Jak se počítá odměna za podpůrné služby?",
        "a": "Z výkonu, který může baterie fyzicky poskytnout, a z historických tržních cen, po odečtení podílu, který nezískáte vy."
      },
      {
        "q": "Je příjem z podpůrných služeb zaručen?",
        "a": "Ne. Vychází z historických cen a předpokladů o dostupnosti a smluvních podmínkách."
      },
      {
        "q": "Co znamená maximální investice?",
        "a": "Přibližně kolik může baterie stát, aby odpovídala vaší zvolené době návratnosti při daném vypočteném ročním přínosu."
      },
      {
        "q": "Je maximální investice stejná jako tržní cena?",
        "a": "Ne. Neříká nic o tom, kolik baterie stojí, pouze co podporuje výpočet."
      },
      {
        "q": "Proč se může výpočet instalatéra lišit?",
        "a": "Odlišné předpoklady o cenách, profilu zátěže, účinnosti, dostupnosti a podpůrných službách dávají odlišné výsledky."
      },
      {
        "q": "Je report cenová nabídka?",
        "a": "Ne. Report je podpora pro rozhodování a měl by být doplněn cenovou nabídkou a posouzením na místě."
      }
    ]
  },
  "tagline": "Chytřejší způsob, jak využívat elektřinu",
  "ancillaryScenario": {
    "title": "Porovnání velikostí baterií pro podpůrné služby",
    "intro": "Standardní výpočet nenavrhl žádnou baterii. Níže uvádíme srovnání odměn za podpůrné služby pro různé velikosti baterií.",
    "notRecommendation": "Toto je srovnávací scénář, nikoli doporučená velikost baterie.",
    "technicalTitle": "Technický návrh",
    "technicalHint": "Velikost je zvolena tak, aby bylo možné využít alespoň 95 % vypočteného výkonu pro podpůrné služby pro vaše odběrné místo a profil spotřeby. Jde o technický návrh, ne o doporučení nejvýnosnější baterie.",
    "battery": "Baterie",
    "compensation": "Odměna za podpůrné služby",
    "totalBenefit": "Vypočtený celkový přínos",
    "maxInvestment": "Maximální investice při zvolené době návratnosti",
    "maxInvestmentNone": "Nelze vypočítat",
    "note": "Výpočet je založen na historických úrovních odměn. Skutečná odměna, dostupnost a možnost účasti na podpůrných službách závisí mimo jiné na trhu, agregátorovi a technických požadavcích."
  },
  "ancillary": {
    "title": "Služby výkonové rovnováhy",
    "product": "Zvolená služba",
    "offered": "Nabízený výkon",
    "reservable": "Fyzicky rezervovatelný výkon (průměr)",
    "technicalTitle": "Technický podklad",
    "technicalNote": "Fyzicky rezervovatelný výkon je samostatná metrika průměrné rezervovatelnosti, nikoliv výkon, ze kterého se počítá odměna.",
    "held": "Držený výkon (průměr)",
    "monetized": "Odhadovaný honorovaný výkon",
    "availability": "Dostupnost",
    "limiting": "Co omezuje velikost baterie",
    "limitingPower": "Výkon baterie",
    "limitingEnergy": "Uložená energie / SOC",
    "limitingGrid": "Kapacita sítě",
    "limitingNone": "Bez omezení",
    "reservedEnergy": "Rezervovaná energie",
    "reservedHours": "Hodiny s rezervací",
    "marketValue": "Odhadovaná tržní hodnota",
    "share": "Váš podíl z tržní hodnoty",
    "customerValue": "Odhadovaná odměna pro vás",
    "priceBasis": "Cenový podklad",
    "priceBasisValue": "Historické tržní ceny",
    "nominalPower": "Jmenovitý výkon baterie",
    "historicalWarning": "Historický výpočet – nejedná se o záruku budoucího příjmu. Skutečná odměna závisí mimo jiné na budoucích tržních cenách, dostupnosti, smlouvách s agregátorem a pravidlech trhu.",
    "noPriceData": "Pro tento trh nelze vypočítat ekonomickou hodnotu, protože chybí ověřená cenová data. Výkon a dostupnost jsou vypočteny, ale nejsou uvedeny žádné výnosy.",
    "note": "Účast obvykle vyžaduje agregátora, prekvalifikaci a schválenou instalaci. Skutečná odměna závisí na smlouvě, přístupu na trh a podmínkách."
  },
  "summary": {
    "title": "Souhrn",
    "capacity": "Kapacita baterie",
    "power": "Výkon baterie",
    "benefit": "Odhadovaný přínos, 1. rok",
    "maxInvestment": "Maximální investice při zvolené návratnosti",
    "improvements": "Jak se nemovitost zlepší",
    "selfConsumption": "Vlastní spotřeba",
    "selfSufficiency": "Soběstačnost",
    "gridImport": "Nákup ze sítě",
    "peak": "Špičkový výkon",
    "shifted": "přesunutá solární",
    "peakLower": "nižší špička",
    "recommendedBattery": "Doporučená baterie",
    "paybackLabel": "Zvolená doba návratnosti",
    "valueSplit": "Jak je rozdělen ekonomický přínos",
    "shiftedSolar": "Přesunutá solární energie",
    "ancillaryShareNote": "Z odhadovaného ekonomického přínosu pochází {value} z podpůrných služeb na základě historických tržních cen.",
    "subtitle": "Doporučená baterie a odhadovaný přínos pro vaši nemovitost",
    "improvementsSubtitle": "Baterie vám umožní využívat více vlastní elektřiny a méně nakupovat ze sítě.",
    "selfConsumptionHint": "Podíl solární elektřiny spotřebované přímo v nemovitosti.",
    "selfSufficiencyHint": "Podíl spotřeby elektřiny pokrytý z vlastních zdrojů.",
    "gridImportHint": "Elektřina nakoupená ze sítě.",
    "shiftedSolarHint": "Více vlastní solární energie je využito v nemovitosti místo prodeje do sítě.",
    "percentagePoints": "procentní body",
    "perYearLong": "ročně"
  },
  "assumptions": {
    "title": "Vaše vstupy a předpoklady pro výpočet",
    "property": "Nemovitost",
    "battery": "Baterie",
    "economy": "Ekonomika",
    "ancillary": "Služby výkonové rovnováhy",
    "annualConsumption": "Roční spotřeba",
    "solarProduction": "Solární výroba",
    "consumptionProfile": "Profil spotřeby",
    "fuse": "Hlavní jistič",
    "connection": "Připojení",
    "gridPowerLimit": "Rezervovaný příkon",
    "capacity": "Kapacita",
    "power": "Výkon",
    "efficiency": "Účinnost (nabití a vybití)",
    "socWindow": "Limity SOC",
    "reserveSoc": "Rezervní SOC",
    "serviceSocUp": "Provozní SOC, regulace nahoru",
    "serviceSocDown": "Provozní SOC, regulace dolů",
    "maxCycles": "Maximální počet cyklů za rok",
    "importPrice": "Nakupovaná elektřina",
    "exportPrice": "Prodaná solární energie (spotová cena)",
    "demandCharge": "Platba za rezervovaný příkon",
    "payback": "Zvolená doba návratnosti",
    "market": "Zvolený trh",
    "share": "Předpokládaný podíl zákazníka",
    "horizonNote": "Výpočet je proveden pro období jednoho roku. Uváděný přínos nezahrnuje degradaci baterie, vývoj cen ani diskontní sazbu."
  },
  "investment": {
    "title": "Maximální investice a doba návratnosti",
    "selected": "Zvolená doba návratnosti",
    "max": "Maximální investice",
    "scenarios": "Maximální investice při různých dobách návratnosti",
    "yourChoice": "Vaše volba",
    "explanation": "Maximální investice není odhadem tržní ceny ani nabídkou. Ukazuje výši investice, která odpovídá vaší zvolené době návratnosti na základě ekonomické hodnoty zjištěné výpočtem.",
    "notAQuote": "Částka není odhadem tržní ceny ani nabídkou. Vychází pouze z odhadované ekonomické hodnoty a vámi zvolené doby návratnosti.",
    "unavailable": "Maximální investici nelze vypočítat, protože výpočet nevykazuje žádnou kladnou ekonomickou hodnotu.",
    "headline": "Váš referenční bod pro cenovou nabídku",
    "paybackText": "Při zvolené době návratnosti {years} vychází z výpočtu maximální investice přibližně {amount}.",
    "ancillaryDependencyTitle": "S podpůrnými službami a bez nich",
    "withAncillary": "Ekonomická hodnota se zvolenou podpůrnou službou",
    "withoutAncillary": "Ekonomická hodnota bez podpůrných služeb",
    "dependencyNote": "Srovnání ukazuje, jak velká část výpočtu závisí na odhadované kompenzaci za podpůrné služby."
  },
  "about": {
    "pageTitle": "Důležité vědět",
    "title": "O této zprávě",
    "items": [
      "Zpráva je podkladem pro rozhodování a měla by být doplněna cenovou nabídkou a posouzením na místě.",
      "Zpráva není cenovou nabídkou a neuvádí, kolik baterie na trhu stojí.",
      "Výsledek je výpočet založený na vámi zadaných údajích a předpokladech výpočtu a není zárukou.",
      "Výpočet se vztahuje na 1. rok.",
      "Výpočet nezahrnuje budoucí vývoj cen.",
      "Výpočet nezahrnuje budoucí degradaci baterie."
    ]
  },
  "installer": {
    "title": "Proberte s instalační firmou",
    "items": [
      "Ověřte, že navržená kapacita baterie je vhodná pro vaši nemovitost.",
      "Ověřte, že navržený výkon baterie a střídače je technicky proveditelný.",
      "Ověřte u provozovatele sítě hodnotu hlavního jističe a možnosti připojení.",
      "Zkontrolujte, zda si instalace vyžádá úpravy v rozvaděči.",
      "Zkontrolujte místo instalace, teplotní požadavky a požární bezpečnost.",
      "Zkontrolujte záruky a očekávanou životnost baterie.",
      "Zkontrolujte povolený výkon pro nabíjení a vybíjení.",
      "Zkontrolujte kompatibilitu se stávající nebo plánovanou solární instalací.",
      "Prověřte si podmínky pro podpůrné služby, agregátora a prekvalifikaci.",
      "Porovnejte nabídkovou cenu s maximální investicí uvedenou v tomto reportu."
    ]
  },
  "terms": {
    "kwKwh": "kW je výkon, tedy jak rychle se baterie může nabíjet nebo vybíjet. kWh je energie, tedy kolik jí dokáže uložit.",
    "selfConsumption": "Vlastní spotřeba udává, jakou část vyrobené solární energie spotřebujete sami, místo abyste ji poslali do sítě.",
    "selfSufficiency": "Soběstačnost udává, jakou část spotřeby elektřiny pokryjete z vlastních zdrojů namísto nákupu ze sítě.",
    "peakShaving": "Ořezávání špiček znamená, že baterie pokryje nejvyšší odběrové špičky, což může snížit platby za rezervovaný příkon."
  },
  "benefit": {
    "title": "Odkud se bere hodnota?",
    "total": "Odhadovaná ekonomická hodnota, 1. rok",
    "energy": "Využití solární energie a úspora za elektřinu",
    "energyHint": "Baterie ukládá přebytky z výroby a využívá energii, když ji nemovitost potřebuje.",
    "energyNoSolarHint": "Baterie se nabíjí, když je elektřina levnější, a využívá se, když ji nemovitost potřebuje.",
    "peak": "Omezení výkonové špičky",
    "peakHint": "Baterie může omezit výkonovou špičku a tím snížit náklady tam, kde se účtuje poplatek za rezervovaný příkon.",
    "ancillary": "Podpůrné služby",
    "ancillaryHint": "Odhadovaná kompenzace z vybrané služby na základě historických tržních cen a předpokladů výpočtu.",
    "none": "Výpočet s vašimi aktuálními vstupy neukazuje žádný měřitelný ekonomický přínos.",
    "note": "Výpočet se vztahuje na 1. rok. Zpráva neobsahuje víceletou prognózu, protože výpočet nemodeluje budoucí ceny ani degradaci.",
    "historicalBox": "Historický výpočet – nejedná se o zaručený budoucí příjem.",
    "shareOfTotal": "z celku"
  },
  "risks": {
    "title": "Co může ovlivnit výsledek?",
    "text": "Tato zpráva je podkladem pro rozhodování, nikoli zárukou nebo cenovou nabídkou. Skutečný výsledek se může lišit, mimo jiné z následujících důvodů:",
    "items": [
      "skutečná spotřeba elektřiny a zátěžový profil",
      "skutečná výroba ze solárních panelů",
      "ceny elektřiny a poplatky za distribuci",
      "platby za rezervovaný příkon a tarifní modely",
      "účinnost a degradace baterie",
      "dostupnost baterie v průběhu roku",
      "ceny a podmínky na trhu s podpůrnými službami",
      "podmínky agregátora a případné poplatky",
      "pravidla trhu a omezení v síti"
    ]
  },
  "grid": {
    "title": "Výkon a síť",
    "fuse": "Hlavní jistič",
    "connection": "Připojení k síti",
    "theoretical": "Teoretický výkon přípojky",
    "peakBefore": "Nejvyšší odběr bez baterie",
    "peakAfter": "Nejvyšší odběr s baterií",
    "reduction": "Omezení špiček",
    "curtailed": "Zablokovaný přetok",
    "status": "Vyhodnocení přípojky",
    "kwKwh": "kW je výkon, tedy jak rychle se baterie nabíjí a vybíjí. kWh je energie, tedy kolik se jí do baterie vejde."
  },
  "energy": {
    "title": "Energetická bilance bez a s baterií",
    "load": "Roční spotřeba",
    "pv": "Solární produkce",
    "importBefore": "Nákup ze sítě bez baterie",
    "importAfter": "Nákup ze sítě s baterií",
    "exportLabel": "Prodej do sítě",
    "exportBefore": "Prodej do sítě bez baterie",
    "exportAfter": "Prodej do sítě s baterií",
    "selfConsumptionBefore": "Vlastní spotřeba bez baterie",
    "selfConsumptionAfter": "Vlastní spotřeba s baterií",
    "selfSufficiencyBefore": "Soběstačnost bez baterie",
    "selfSufficiencyAfter": "Soběstačnost s baterií",
    "gridCharged": "Energie nabitá ze sítě",
    "shifted": "Přesunutá solární energie",
    "losses": "Ztráty baterie",
    "cycles": "Ekvivalentních plných cyklů za rok"
  },
  "ancillaryOnly": {
    "summaryProposal": "Technický návrh dimenzování",
    "summaryBenefit": "Celkový odhadovaný přínos",
    "summaryMaxInvestment": "Maximální investice při zvolené době návratnosti",
    "summaryExplanation": "Výpočet se týká samostatné baterie bez solární instalace. Technický návrh dimenzování vychází z parametrů přípojky a technických požadavků podpůrné služby. Vaše spotřeba se pak použije k výpočtu, kolik rezervovaného výkonu může zůstat k dispozici, a k odhadu kompenzace.",
    "comparisonIntro": "Srovnání ukazuje, jak energetická kapacita baterie ovlivňuje odhadovaný přínos z podpůrné služby. Technický návrh vychází z požadavků služby a limitů elektrické přípojky.",
    "comparisonExplanation": "Podpůrné služby jsou kompenzovány hlavně podle výkonu, který může zůstat k dispozici. Jakmile má baterie dostatek energetické kapacity k udržení tohoto výkonu, další kWh automaticky nezvyšují kompenzaci.",
    "sizingProposal": "Technický návrh dimenzování",
    "sizingExplanation": "kW udává, jaký výkon může baterie dodat. kWh udává, kolik energie dokáže uložit. Podpůrné služby vyžadují dostatečnou energetickou kapacitu k udržení rezervovaného výkonu v rámci technických požadavků služby. Jakmile je tento požadavek splněn, další kWh automaticky nezvyšují kompenzaci.",
    "serviceCompensation": "Odhadovaná kompenzace pro vás",
    "servicePriceBasis": "Cenový základ",
    "servicePowerExplanation": "Jmenovitý výkon baterie není automaticky stejný jako výkon, který může zůstat k dispozici a být předmětem kompenzace. Výpočet zohledňuje technické limity baterie, podpůrné služby a elektrické přípojky.",
    "investmentExplanation": "Maximální investice ukazuje celkovou investici odpovídající zvolené době návratnosti za předpokladu, že by odhadovaný přínos v prvním roce přetrval.",
    "investmentNotAQuote": "Částka není odhadem tržní ceny, cenovou nabídkou ani zárukou budoucí ziskovosti.",
    "risks": [
      "skutečná spotřeba elektřiny a zátěžový profil",
      "účinnost baterie",
      "degradace baterie",
      "dostupnost baterie",
      "tržní ceny podpůrných služeb",
      "podmínky agregátora a případné poplatky",
      "přístup na trh a předkvalifikace",
      "změny pravidel trhu",
      "omezení v síti"
    ],
    "installer": [
      "Zkontrolujte navrženou kapacitu baterie.",
      "Zkontrolujte navržený výkon baterie a střídače.",
      "Zkontrolujte hlavní jistič a elektrickou přípojku.",
      "Zkontrolujte povolený nabíjecí a vybíjecí výkon.",
      "Zkontrolujte případné požadavky provozovatele sítě.",
      "Zkontrolujte instalaci a rozvaděč.",
      "Zkontrolujte místo instalace a požární bezpečnost.",
      "Zkontrolujte záruky a očekávanou životnost baterie.",
      "Zkontrolujte, zda baterie podporuje vybranou podpůrnou službu.",
      "Zkontrolujte požadavky agregátora a předkvalifikace.",
      "Zkontrolujte poplatky agregátora a rozdělení výnosů.",
      "Porovnejte skutečnou cenovou nabídku s maximální investicí v reportu."
    ],
    "faq": [
      {
        "q": "Co znamená kW a kWh?",
        "a": "kW udává, jaký výkon může baterie dodat. kWh udává, kolik energie dokáže uložit."
      },
      {
        "q": "Proč je doporučena tato velikost baterie?",
        "a": "Velikost je technický návrh dimenzování založený na elektrické přípojce a technických požadavcích podpůrné služby. Vaše spotřeba se pak použije k výpočtu, kolik rezervovaného výkonu může zůstat k dispozici, a k odhadu kompenzace."
      },
      {
        "q": "Jak se počítá kompenzace za podpůrné služby?",
        "a": "Počítá se z výkonu, který může zůstat k dispozici, historických tržních cen a zákaznického podílu použitého ve výpočtu."
      },
      {
        "q": "Proč je výkon baterie vyšší než kompenzovatelný výkon?",
        "a": "Jmenovitý výkon baterie je v praxi omezen energetickou kapacitou, stavem nabití (SOC), požadavky na výdrž služby a dostupnou kapacitou přípojky."
      },
      {
        "q": "Proč větší baterie ne vždy zvyšuje kompenzaci?",
        "a": "Jakmile je baterie schopna udržet kompenzovatelný výkon po dobu technických požadavků služby, další energetická kapacita automaticky kompenzaci nezvyšuje."
      },
      {
        "q": "Je kompenzace za podpůrné služby zaručena?",
        "a": "Ne. Vychází z historických cen a předpokladů o dostupnosti, přístupu na trh a smluvních podmínkách."
      },
      {
        "q": "Potřebuji agregátora?",
        "a": "Domácí baterie se běžně účastní prostřednictvím agregátora, který obvykle zajišťuje přístup na trh, předkvalifikaci a vypořádání."
      },
      {
        "q": "Co znamená maximální investice?",
        "a": "Je to celková investice odpovídající zvolené době návratnosti za předpokladu, že by odhadovaný přínos v prvním roce přetrval."
      },
      {
        "q": "Je maximální investice totéž co tržní cena baterie?",
        "a": "Ne. Maximální investice není odhadem tržní ceny ani cenovou nabídkou."
      },
      {
        "q": "Proč se může výpočet instalační firmy nebo agregátora lišit?",
        "a": "Odlišné předpoklady o technických omezeních, cenách, dostupnosti, poplatcích, podílu zákazníka a tržních podmínkách mohou vést k odlišnému výsledku."
      },
      {
        "q": "Je tento report cenovou nabídkou?",
        "a": "Ne. Report slouží jako podpora pro rozhodování a měl by být doplněn cenovou nabídkou, technickou prohlídkou a podmínkami agregátora."
      }
    ]
  }
};
