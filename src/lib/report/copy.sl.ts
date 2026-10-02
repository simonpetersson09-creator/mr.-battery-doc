/** Slovenian report copy. Same structure as the Swedish source text. */
import type { ReportCopy } from "./copy";

export const sl: ReportCopy = {
  "notAvailable": "Ni na voljo",
  "after": "Z baterijo",
  "perYear": "/leto",
  "brand": "Mr. Battery Doc",
  "reportIdLabel": "ID poročila",
  "pageLabel": "Stran",
  "engineVersionLabel": "Različica izračuna",
  "ofLabel": "od",
  "cannotBeCalculated": "Ni mogoče izračunati",
  "title": "Poročilo baterije",
  "created": "Ustvarjeno",
  "before": "Brez baterije",
  "footerTagline": "Boljše odločitve za svetlejšo prihodnost",
  "source": {
    "user": "Vaša vrednost",
    "calculated": "Izračunano",
    "default": "Privzeta predpostavka",
    "external": "Zunanji vir podatkov"
  },
  "grid": {
    "title": "Moč in omrežje",
    "fuse": "Glavna varovalka",
    "connection": "Priključek na omrežje",
    "theoretical": "Teoretična zmogljivost priključka",
    "peakBefore": "Največji odjem brez baterije",
    "peakAfter": "Največji odjem z baterijo",
    "reduction": "Zmanjšanje konic",
    "curtailed": "Blokirano oddajanje",
    "status": "Ocena omrežja",
    "kwKwh": "kW je moč, ki pove, kako hitro se baterija lahko polni ali prazni. kWh je energija, ki pove, koliko lahko shrani."
  },
  "energy": {
    "title": "Energijska bilanca brez in z baterijo",
    "load": "Letna poraba",
    "pv": "Proizvodnja sončne elektrarne",
    "importBefore": "Uvoz iz omrežja brez baterije",
    "importAfter": "Uvoz iz omrežja z baterijo",
    "exportLabel": "Izvoz v omrežje",
    "exportBefore": "Izvoz brez baterije",
    "exportAfter": "Izvoz z baterijo",
    "selfConsumptionBefore": "Samooskrba brez baterije",
    "selfConsumptionAfter": "Samooskrba z baterijo",
    "selfSufficiencyBefore": "Neodvisnost od omrežja brez baterije",
    "selfSufficiencyAfter": "Neodvisnost od omrežja z baterijo",
    "gridCharged": "Energija, polnjena iz omrežja",
    "shifted": "Preusmerjena sončna energija",
    "losses": "Izgube baterije",
    "cycles": "Ekvivalentni polni cikli na leto"
  },
  "risks": {
    "title": "Kaj lahko vpliva na rezultat?",
    "text": "Poročilo je podpora pri odločanju in ne predstavlja jamstva ali ponudbe. Dejanski rezultat se lahko razlikuje, med drugim zaradi:",
    "items": [
      "dejanske porabe električne energije in profila obremenitve",
      "dejanske proizvodnje sončne elektrarne",
      "cen električne energije in omrežnin",
      "obračunske moči in tarifnih modelov",
      "izkoristka in degradacije baterije",
      "razpoložljivosti baterije med letom",
      "cen in pogojev na trgu sistemskih storitev",
      "pogojev in morebitnih provizij agregatorja",
      "tržnih pravil in omejitev omrežja"
    ]
  },
  "benefit": {
    "title": "Kako nastane vrednost?",
    "total": "Ocenjena ekonomska vrednost, 1. leto",
    "energy": "Premik sončne energije in zmanjšan nakup elektrike",
    "energyHint": "Baterija shrani presežke proizvodnje in porabi energijo, ko jo objekt potrebuje.",
    "energyNoSolarHint": "Baterija se polni, ko je elektrika cenejša, in se uporablja, ko jo objekt potrebuje.",
    "peak": "Zmanjšanje konične moči",
    "peakHint": "Baterija lahko zmanjša konično moč in s tem zniža stroške, kjer se obračunava presežna moč.",
    "ancillary": "Sistemske storitve",
    "ancillaryHint": "Ocenjeno nadomestilo iz izbrane storitve na podlagi zgodovinskih tržnih cen in predpostavk izračuna.",
    "none": "Izračun z vašimi trenutnimi vhodi ne kaže merljivih ekonomskih koristi.",
    "note": "Izračun zajema 1. leto. Poročilo ne vsebuje večletne napovedi, saj izračun ne modelira prihodnjih cen ali degradacije.",
    "historicalBox": "Zgodovinski izračun – ni zagotovljen prihodnji dohodek.",
    "shareOfTotal": "celotne vrednosti"
  },
  "investment": {
    "title": "Največja investicija in vračilna doba",
    "selected": "Izbrana vračilna doba",
    "max": "Največja investicija",
    "scenarios": "Največja investicija pri različnih vračilnih dobah",
    "yourChoice": "Vaša izbira",
    "explanation": "Največja investicija ni ocena tržne cene ali ponudba. Prikazuje znesek naložbe, ki ustreza vaši izbrani vračilni dobi, glede na izračunano ekonomsko vrednost.",
    "notAQuote": "Znesek ni ocenjena tržna cena in ne ponudba. Izhaja le iz ocenjene ekonomske vrednosti in vaše izbrane vračilne dobe.",
    "unavailable": "Največje investicije ni mogoče izračunati, ker izračun ne kaže pozitivne ekonomske vrednosti.",
    "headline": "Vaša referenčna točka za ponudbo",
    "paybackText": "Za izbrano vračilno dobo {years} let izračun pokaže največjo investicijo v višini približno {amount}.",
    "ancillaryDependencyTitle": "Z in brez sistemskih storitev",
    "withAncillary": "Ekonomska vrednost z izbrano sistemsko storitvijo",
    "withoutAncillary": "Ekonomska vrednost brez sistemskih storitev",
    "dependencyNote": "Primerjava prikazuje, kolikšen del izračuna je odvisen od ocenjenega nadomestila za sistemske storitve."
  },
  "tagline": "Pametnejši način rabe vaše elektrike",
  "assumptions": {
    "title": "Vaši vnosi in predpostavke izračuna",
    "property": "Nepremičnina",
    "battery": "Baterija",
    "economy": "Ekonomika",
    "ancillary": "Sistemske storitve",
    "annualConsumption": "Letna poraba",
    "solarProduction": "Proizvodnja sončne elektrarne",
    "consumptionProfile": "Profil porabe",
    "fuse": "Glavna varovalka",
    "connection": "Priključek",
    "gridPowerLimit": "Največja moč priključka",
    "capacity": "Kapaciteta",
    "power": "Moč",
    "efficiency": "Učinkovitost cikla (polnjenje-praznjenje)",
    "socWindow": "Omejitve SOC",
    "reserveSoc": "Rezerviran SOC",
    "serviceSocUp": "Delovni SOC, regulacija navzgor",
    "serviceSocDown": "Delovni SOC, regulacija navzdol",
    "maxCycles": "Največje število ciklov na leto",
    "importPrice": "Nakupna cena elektrike",
    "exportPrice": "Prodajna cena sončne energije (spot cena)",
    "demandCharge": "Obračunska moč",
    "payback": "Izbrana doba povračila",
    "market": "Izbrani trg",
    "share": "Predviden delež stranke",
    "horizonNote": "Obračunsko obdobje je eno leto. Prikazane koristi ne vključujejo degradacije, sprememb cen ali diskontne stopnje."
  },
  "searchLimit": {
    "atLeastCapacity": "Vsaj {value}",
    "atLeastPower": "Vsaj {value}",
    "capacityNote": "Dosežena je zgornja meja kapacitete za analizo. Večja baterija lahko prinese dodatne koristi.",
    "powerNote": "Dosežena je zgornja meja moči za analizo. Za sistem z večjo močjo je morda potrebna ločena analiza.",
    "bothNote": "Dosežena je zgornja meja dimenzioniranja za to analizo. Za dimenzioniranje večjih sistemov je priporočljiva razširjena inženirska študija."
  },
  "about": {
    "pageTitle": "Pomembno je vedeti",
    "title": "O tem poročilu",
    "items": [
      "Poročilo služi kot pomoč pri odločanju in ga je treba dopolniti s ponudbo ter ogledom na lokaciji.",
      "Poročilo ni ponudba in ne podaja informacij o tržni ceni baterije.",
      "Rezultat je izračun, ki temelji na vaših vnesenih podatkih in predpostavkah, ter ne predstavlja jamstva.",
      "Izračun zajema prvo leto.",
      "Izračun ne vključuje prihodnjega gibanja cen.",
      "Izračun ne vključuje prihodnje degradacije baterije."
    ]
  },
  "ancillaryScenario": {
    "title": "Primerjava velikosti baterij za sistemske storitve",
    "intro": "Standardna analiza ni pokazala potrebe po bateriji. Spodaj je primerjava, kako bi bile različne velikosti baterij kompenzirane za sistemske storitve.",
    "notRecommendation": "To je primerjalni scenarij in ne priporočena velikost baterije.",
    "technicalTitle": "Tehnični predlog",
    "technicalHint": "Velikost je izbrana tako, da omogoča uporabo vsaj 95 % izračunane zmogljivosti za sistemske storitve glede na vaš priključek in profil porabe. To je tehnični predlog in ne trditev o najbolj donosni bateriji.",
    "battery": "Baterija",
    "compensation": "Nadomestilo za sistemske storitve",
    "totalBenefit": "Izračunana skupna korist",
    "maxInvestment": "Najvišja naložba pri izbrani vračilni dobi",
    "maxInvestmentNone": "Ni mogoče izračunati",
    "note": "Izračun temelji na zgodovinskih ravneh nadomestil. Dejansko nadomestilo, razpoložljivost in možnost sodelovanja pri sistemskih storitvah so med drugim odvisni od trga, agregatorja in tehničnih zahtev."
  },
  "ancillary": {
    "title": "Sistemske storitve",
    "product": "Izbrana storitev",
    "offered": "Ponujena moč",
    "reservable": "Fizično rezervirana moč (povprečje)",
    "technicalTitle": "Tehnična osnova",
    "technicalNote": "Fizično rezervirana moč je ločena povprečna vrednost in ni osnova za izračun nadomestila.",
    "held": "Zadržana moč (povprečje)",
    "monetized": "Ocenjena moč za nadomestilo",
    "availability": "Razpoložljivost",
    "limiting": "Kaj omejuje velikost baterije",
    "limitingPower": "Moč baterije",
    "limitingEnergy": "Shranjena energija / SOC",
    "limitingGrid": "Zmogljivost omrežja",
    "limitingNone": "Brez omejitev",
    "reservedEnergy": "Rezervirana energija",
    "reservedHours": "Ure z rezervacijo",
    "marketValue": "Ocenjena tržna vrednost",
    "share": "Vaš delež tržne vrednosti",
    "customerValue": "Ocenjeno nadomestilo za vas",
    "priceBasis": "Osnova za ceno",
    "priceBasisValue": "Zgodovinske tržne cene",
    "nominalPower": "Nazivna moč baterije",
    "historicalWarning": "Zgodovinski izračun – ne zagotavlja prihodnjega dohodka. Dejansko nadomestilo je med drugim odvisno od prihodnjih tržnih cen, razpoložljivosti, pogodb z agregatorjem in tržnih pravil.",
    "noPriceData": "Za ta trg ni mogoče izračunati ekonomske vrednosti, ker manjkajo preverjeni podatki o cenah. Moč in razpoložljivost sta izračunani, vendar prihodek ni prikazan.",
    "note": "Sodelovanje običajno zahteva agregatorja, predkvalifikacijo in odobreno namestitev. Dejansko nadomestilo je odvisno od pogodbe, dostopa do trga in pogojev."
  },
  "terms": {
    "kwKwh": "kW je moč, koliko lahko baterija napolni ali izprazni naenkrat. kWh je energija, koliko jo lahko shrani.",
    "selfConsumption": "Lastna poraba je delež sončne proizvodnje, porabljen v objektu namesto izvožen v omrežje.",
    "selfSufficiency": "Samooskrba je delež porabe električne energije v objektu, ki je pokrit z lastno elektriko namesto s kupljeno iz omrežja.",
    "peakShaving": "Rezanje konic pomeni, da baterija odreže najvišje konice porabe, kar lahko zmanjša obračunsko moč."
  },
  "installer": {
    "title": "Kaj preveriti z inštalaterjem",
    "items": [
      "Preverite, ali predlagana kapaciteta baterije ustreza nepremičnini.",
      "Preverite, ali je predlagana moč baterije in razsmernika tehnično izvedljiva.",
      "Pri operaterju omrežja preverite glavno varovalko in priključek na omrežje.",
      "Preverite, ali namestitev zahteva spremembe na razdelilni omari.",
      "Preverite lokacijo namestitve, temperaturne zahteve in požarno varnost.",
      "Preverite garancije in pričakovano življenjsko dobo baterije.",
      "Preverite dovoljeno moč polnjenja in praznjenja.",
      "Preverite združljivost z obstoječo ali načrtovano sončno elektrarno.",
      "Preverite pogoje za sistemske storitve, agregatorja in predkvalifikacijo.",
      "Primerjajte ponujeno ceno z najvišjo naložbo v tem poročilu."
    ]
  },
  "summary": {
    "title": "Povzetek",
    "capacity": "Kapaciteta baterije",
    "power": "Moč baterije",
    "benefit": "Ocenjena ekonomska vrednost, 1. leto",
    "maxInvestment": "Največja naložba pri izbrani dobi vračila",
    "improvements": "Kako se nepremičnina izboljša",
    "selfConsumption": "Lastna poraba",
    "selfSufficiency": "Samoskrbnost",
    "gridImport": "Uvoz iz omrežja",
    "peak": "Konica",
    "shifted": "premaknjena sončna",
    "peakLower": "nižja konica",
    "recommendedBattery": "Priporočena baterija",
    "paybackLabel": "Izbrana doba vračila",
    "valueSplit": "Razdelitev ekonomske vrednosti",
    "shiftedSolar": "Premaknjena sončna energija",
    "ancillaryShareNote": "Od ocenjene ekonomske vrednosti {value} prihaja iz sistemskih storitev na podlagi zgodovinskih tržnih cen.",
    "subtitle": "Priporočena baterija in ocenjena vrednost za vašo nepremičnino",
    "improvementsSubtitle": "Baterija vam omogoča, da porabite več lastne električne energije in je manj kupujete iz omrežja.",
    "selfConsumptionHint": "Delež sončne energije, ki je porabljena neposredno v nepremičnini.",
    "selfSufficiencyHint": "Delež celotne porabe električne energije, ki je pokrit z lastno proizvodnjo.",
    "gridImportHint": "Električna energija, kupljena iz omrežja.",
    "shiftedSolarHint": "Več lastne sončne proizvodnje se porabi v nepremičnini, namesto da bi se oddajala v omrežje.",
    "percentagePoints": "odstotne točke",
    "perYearLong": "na leto"
  },
  "sizing": {
    "title": "Zakaj ta baterija?",
    "capacity": "Kapaciteta",
    "power": "Moč",
    "cRate": "Stopnja C",
    "physicalNeed": "Potreba nepremičnine po moči",
    "basePower": "Osnovna moč za upravljanje z energijo",
    "alternatives": "Simulirane alternative",
    "lower": "Manjša",
    "yours": "Vaša baterija",
    "higher": "Večja",
    "balance": "Srednja alternativa je velikost, pri kateri izračun najde najboljše ravnovesje med velikostjo baterije in ocenjeno koristjo. To ni trditev, da je objektivno najboljša v vseh pogledih.",
    "consumerExplanation": "Mr. Battery Doc simulira več velikosti baterij na podlagi porabe nepremičnine, sončne proizvodnje in izbranih načinov uporabe. V tem primeru priporočena velikost zagotavlja dobro ravnovesje med velikostjo baterije in ocenjeno koristjo. Večja baterija prinaša le omejene dodatne koristi, zato ni priporočljiva.",
    "recommendedLabel": "Priporočeno",
    "powerTitle": "Moč baterije: {value}",
    "powerAncillaryExplanation": "Za upravljanje z energijo nepremičnine je potrebnih približno {value}. Višja priporočena moč omogoča večjo zmogljivost za izbrano pomožno storitev."
  },
  "faq": {
    "title": "Pogosta vprašanja",
    "items": [
      {
        "q": "Kaj pomenita kW in kWh?",
        "a": "kW je moč, torej kako hitro se baterija polni ali prazni. kWh je energija, torej koliko jo lahko shrani."
      },
      {
        "q": "Zakaj je priporočena ta velikost baterije?",
        "a": "Izračun simulira več velikosti in izbere tisto z najboljšim razmerjem med velikostjo in ocenjeno koristjo glede na vaše podatke."
      },
      {
        "q": "Kaj pomeni lastna poraba?",
        "a": "Delež proizvedene sončne energije, ki se porabi v stavbi, namesto da bi se oddala v omrežje."
      },
      {
        "q": "Kaj pomeni samooskrba?",
        "a": "Delež porabe električne energije v stavbi, pokrit z lastno električno energijo namesto z elektriko iz omrežja."
      },
      {
        "q": "Kaj je glajenje konic?",
        "a": "Baterija odreže najvišje konice moči, kar lahko zmanjša obračunsko moč."
      },
      {
        "q": "Kako se izračuna nadomestilo za sistemske storitve?",
        "a": "Izračuna se iz moči, ki jo lahko baterija zagotavlja, in zgodovinskih tržnih cen, od katerih se odšteje delež, ki ne pripada vam."
      },
      {
        "q": "Ali je prihodek od sistemskih storitev zagotovljen?",
        "a": "Ne. Temelji na zgodovinskih cenah in predpostavkah o razpoložljivosti ter pogodbenih pogojih."
      },
      {
        "q": "Kaj pomeni najvišja naložba?",
        "a": "Približno koliko lahko stane baterija, da bi dosegli izbrani čas vračila naložbe, glede na izračunano letno korist."
      },
      {
        "q": "Ali je najvišja naložba enaka tržni ceni?",
        "a": "Ne. To ni podatek o ceni baterij na trgu, ampak o tem, kakšno naložbo podpirajo izračunani prihranki."
      },
      {
        "q": "Zakaj se lahko izračun monterja razlikuje?",
        "a": "Različne predpostavke o cenah, profilu porabe, učinkovitosti, razpoložljivosti in sistemskih storitvah dajo različne rezultate."
      },
      {
        "q": "Ali je poročilo ponudba?",
        "a": "Ne. Poročilo je podpora pri odločanju in ga je treba dopolniti s ponudbo in ogledom na lokaciji."
      }
    ]
  },
  "ancillaryOnly": {
    "summaryProposal": "Predlog tehnične dimenzije",
    "summaryBenefit": "Skupna ocenjena korist",
    "summaryMaxInvestment": "Najvišja naložba pri izbrani dobi povračila",
    "summaryExplanation": "Izračun se nanaša na samostojno baterijo brez sončne elektrarne. Predlog tehnične dimenzije temelji na omrežnem priključku in tehničnih zahtevah sistemske storitve. Vaša poraba se nato uporabi za izračun, koliko rezerve lahko ostane na voljo, in za oceno nadomestila.",
    "comparisonIntro": "Primerjava prikazuje, kako energijska kapaciteta baterije vpliva na ocenjeno korist od sistemskih storitev. Tehnični predlog temelji na zahtevah storitve in omejitvah omrežnega priključka.",
    "comparisonExplanation": "Sistemske storitve se plačujejo predvsem glede na moč, ki lahko ostane na voljo. Ko ima baterija dovolj energijske kapacitete za vzdrževanje te moči, dodatni kWh ne povečajo samodejno nadomestila.",
    "sizingProposal": "Predlog tehnične dimenzije",
    "sizingExplanation": "kW označuje moč, ki jo baterija lahko odda. kWh označuje energijo, ki jo lahko shrani. Sistemske storitve zahtevajo dovolj energijske kapacitete za vzdrževanje rezervirane moči v okviru tehničnih zahtev storitve. Ko je ta zahteva izpolnjena, dodatni kWh ne povečajo samodejno nadomestila.",
    "serviceCompensation": "Ocenjeno nadomestilo za vas",
    "servicePriceBasis": "Osnova za ceno",
    "servicePowerExplanation": "Nazivna moč baterije ni samodejno enaka moči, ki lahko ostane na voljo in je upravičena do nadomestila. Izračun upošteva tehnične omejitve baterije, sistemske storitve in omrežnega priključka.",
    "investmentExplanation": "Najvišja naložba prikazuje celotno naložbo, ki ustreza izbrani dobi povračila, če bi ocenjena korist v prvem letu ostala nespremenjena.",
    "investmentNotAQuote": "Znesek ni ocena tržne cene, ponudba ali jamstvo za prihodnjo donosnost.",
    "risks": [
      "dejanska poraba elektrike in profil obremenitve",
      "učinkovitost baterije",
      "degradacija baterije",
      "razpoložljivost baterije",
      "tržne cene sistemskih storitev",
      "pogoji agregatorja in morebitne provizije",
      "dostop do trga in predkvalifikacija",
      "spremembe tržnih pravil",
      "omejitve omrežja"
    ],
    "installer": [
      "Potrdite predlagano kapaciteto baterije.",
      "Potrdite predlagano moč baterije in razsmernika.",
      "Preverite glavno varovalko in omrežni priključek.",
      "Preverite dovoljeno moč polnjenja in praznjenja.",
      "Preverite morebitne zahteve operaterja omrežja.",
      "Preverite inštalacijo in razdelilno omarico.",
      "Preverite lokacijo namestitve in požarno varnost.",
      "Preverite garancije in pričakovano življenjsko dobo baterije.",
      "Preverite, ali baterija podpira izbrano sistemsko storitev.",
      "Preverite zahteve agregatorja in predkvalifikacije.",
      "Preverite provizije agregatorja in delitev prihodkov.",
      "Primerjajte dejansko ponudbo z najvišjo naložbo v poročilu."
    ],
    "faq": [
      {
        "q": "Kaj pomenita kW in kWh?",
        "a": "kW označuje moč, ki jo baterija lahko odda. kWh označuje energijo, ki jo lahko shrani."
      },
      {
        "q": "Zakaj je priporočena ta velikost baterije?",
        "a": "Velikost je predlog tehnične dimenzije, ki temelji na omrežnem priključku in tehničnih zahtevah sistemske storitve. Vaša poraba se nato uporabi za izračun, koliko rezerve lahko ostane na voljo, in za oceno nadomestila."
      },
      {
        "q": "Kako se izračuna nadomestilo za sistemske storitve?",
        "a": "Izračuna se iz moči, ki lahko ostane na voljo, zgodovinskih tržnih cen in deleža stranke, uporabljenega v izračunu."
      },
      {
        "q": "Zakaj je moč baterije večja od moči, ki se upošteva za nadomestilo?",
        "a": "Nazivno moč baterije v praksi omejujejo energijska kapaciteta, stanje napolnjenosti (SOC), zahteve po vzdržljivosti storitve in razpoložljiva moč priključka."
      },
      {
        "q": "Zakaj večja baterija ne poveča vedno nadomestila?",
        "a": "Ko lahko baterija vzdržuje moč, upravičeno do nadomestila, v skladu s tehničnimi zahtevami storitve, dodatna energijska kapaciteta ne poveča samodejno nadomestila."
      },
      {
        "q": "Ali je nadomestilo za sistemske storitve zagotovljeno?",
        "a": "Ne. Temelji na zgodovinskih cenah in predpostavkah o razpoložljivosti, dostopu do trga in pogodbenih pogojih."
      },
      {
        "q": "Ali potrebujem agregatorja?",
        "a": "Baterija v gospodinjstvu običajno sodeluje prek agregatorja, ki praviloma poskrbi za dostop do trga, predkvalifikacijo in obračun."
      },
      {
        "q": "Kaj pomeni najvišja naložba?",
        "a": "To je celotna naložba, ki ustreza izbrani dobi povračila, če bi ocenjena korist v prvem letu ostala nespremenjena."
      },
      {
        "q": "Ali je najvišja naložba enaka tržni ceni baterije?",
        "a": "Ne. Najvišja naložba ni ocena tržne cene niti ponudba."
      },
      {
        "q": "Zakaj se lahko izračun inštalaterja ali agregatorja razlikuje?",
        "a": "Različne predpostavke o tehničnih omejitvah, cenah, razpoložljivosti, provizijah, deležu stranke in tržnih pogojih lahko dajo drugačen rezultat."
      },
      {
        "q": "Ali je poročilo ponudba?",
        "a": "Ne. Poročilo je podpora pri odločanju in ga je treba dopolniti s ponudbo, tehničnim pregledom in pogoji agregatorja."
      }
    ]
  }
};
