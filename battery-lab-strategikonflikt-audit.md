# Battery Engine v1.0.0 — strategikonfliktaudit (READ-ONLY)

Ingen kod, modell, dispatch, ekonomi, dimensionering, profil, default, UI eller test ändrad.
Allt nedan är läst ur koden och verifierat programmatiskt mot den befintliga motorn.

Aktiva strategier: optimerad egenanvändning, minskad nätimport, peak shaving, FCR-D upp.

---

## 1. Faktisk dispatch-ordning per timme (`dispatch.ts`, rad 492–837)

| # | Steg (kod) | Får använda kW | Får använda kWh | Reserverar | Företräde |
|---|---|---|---|---|---|
| 1 | Självurladdning (495–500) | — | soc ned till `win.socFloorKWh` (ej timmens FCR-golv) | — | passiv förlust, går före allt |
| 2 | Standby 20 W (504–508) | — | bokförs som AC-last/förlust | — | passiv |
| 3 | FCR-reservation för timmen (519–552) | sätter `dischargeLimitKw = powerKw − upPowerKw`, `chargeLimitKw = powerKw − downPowerKw` | sätter `hourFloor` (upp-energi + headroom) och `hourCeil` | ja: kW och kWh | **högst** — allt nedan räknar från de reducerade gränserna |
| 4 | Direkt solel till last (554–558) | inget batteri | inget batteri | — | alltid först, gratis |
| 5 | Beräkning av peak-reserv (595–601) | — | `peakNeedKWh(h)/η`, ovanpå `hourFloor` | ja: kWh, endast mot steg 7b/7c | näst högst |
| 6 | Urladdning (606–646): 6a peak shaving, 6b minskad import, 6c arbitrage-export | `min(want, dischargeLimitKw, (soc−hourFloor)·η)` | 6a får ta peak-reserven; 6b/6c bara `soc − hourFloor − peakReserve` | — | peak > import > export |
| 7 | Laddning, endast om steg 6 gav 0 kWh (652–802): 7a solöverskott (curtailment-toppen först), 7b peak-shaving-nätladdning, 7c FCR-beredskapsladdning, 7d arbitrage | 7a/7b/7d ur `chargeLimitKw`; 7c ur full `chargeKw − redan laddat` | upp till `hourCeil` | — | sol före nät i kodordning |
| 8 | Nätutbyte (808–836) | — | — | — | hård gräns: export `maxExportKw`, import `maxImportKw`; överskott bokförs som curtailment / otäckt last |

Hårda gränser: batteriets kW och SOC-fönster appliceras i varje delsteg (före), nätgränsen appliceras
sist (efter). Ingen senare strategi kan skriva över ett tidigare beslut: varje delsteg drar ner
`powerLeft`, `acceptable` och `soc` innan nästa körs, och ladda/urladda kan aldrig ske samma timme.

## 2. FCR-D upp mot övriga strategier

- **Effekt:** 3 kW batteri, 1,5 kW FCR ⇒ övriga strategier får 1,5 kW urladdning
  (`dischargeLimitKw = 3 − 1,5`) och full 3 kW laddning (down-reservation = 0 i FCR-D upp).
  Programmatisk kontroll över 8 760 timmar: max (hållen FCR-kW + faktisk urladdnings-kW) = **3,0000 kW**,
  aldrig över. 7 412 timmar hade både hållen reservation och verklig energiflytt — utan överskridande.
- **Energi:** `hourFloor` = max(SOC-min, tjänstens min-SOC, SOC-min + upp-energi/η + headroom) = 3,00 kWh
  i standardfallet. Peak shaving, minskad import, arbitrage och export räknar alla från `hourFloor`.
  0 timmar där reserven användes av någon annan strategi.
- **SOC:** en strategi kan inte köra SOC under FCR-golvet. **Men självurladdningen kan** — den begränsas
  bara av `win.socFloorKWh` (0,75 kWh), inte av timmens FCR-golv. Det inträffar 1 348 timmar/år.
  Konsekvens: ingen felaktig utbetalning (timmen räknas som ej redo), men availability blir 84,6 %
  i stället för ~100 %, se fynd F1.

## 3. Peak shaving mot minskad nätimport

Peak-reserven: månadströskel = baslinjens högsta import i månaden × (1 − 20 %); timmens `excess`
= baslinjeimport − tröskel; `peakNeedKWh(h)` = summan av excess i de kommande **24 timmarna**
(fast fönster, deterministiskt, `PEAK_LOOKAHEAD_HOURS = 24`). Reserven = `peakNeed/η`, begränsad av
fönstrets storlek.

- Minskad import får **inte** använda peak-reserven (`energyUnreserved`).
- Egenanvändningens *urladdning* är samma post som minskad import och är alltså också utestängd;
  egenanvändningens *laddning* fyller reserven.
- FCR påverkar reserven indirekt: reserven ligger ovanpå `hourFloor`, så FCR tar först.
- Räcker inte batteriet får peak shaving det som finns, minskad import får resten (0 kr straff).

Verklig konkurrens, 15 jan (kWh/h, standardfallet, tröskel 4,26 kW):

```text
    h  last     sol  baseImp   soc_in  soc_ut   import  FCR hållen
  353  3,911  0,000    3,911    3,016   3,016    3,931   1,50   minskad import blockerad av FCR-golvet
  354  4,275  0,000    4,275    3,016   3,000    4,280   1,50   peak shaving får bara 0,016 kWh (golvet)
  355  3,820  0,000    3,820    3,000   3,000    3,840   0,00   inget kvar, FCR ej redo denna timme
```

## 4. Peak shaving mot nätladdning

Verifierat i koden (694–726) och numeriskt:

| Krav | Utfall |
|---|---|
| bara vid import-headroom | ja, `gridChargeHeadroomKw(deficit, maxImportKw)` |
| skapar ingen ny topp | ja, extra tak `thr − deficit` — laddning kan aldrig nå över månadströskeln |
| aldrig över nätgränsen | ja, 0 timmar över `maxImportKw` i samtliga 13 körda fall |
| laddar inte mer än peakbehovet | ja, `targetSoc = hourFloor + need/η` |
| förstör inte FCR-headroom | ja, taket är `hourCeil` |
| räknas inte som energibesparing | ja, ekonomin använder bara verklig import/export-differens |
| kostnaden syns | ja, laddningen ökar faktisk import och sänker energinyttan |

Undantag: **FCR-beredskapsladdningen** (737–762) har *inte* tröskeltaket, bara importgränsen. Den kan
alltså i princip lyfta månadstoppen. I standardfallet är den 0,06 kWh/år, i "nästan tomt batteri"-fallet
2,21 kWh/år. Fynd F3.

## 5. Soloptimering mot peak shaving

Laddningsordningen är sol → nät, och nätladdning är gated på `acceptable > 0 && powerLeft > 0`, som
solladdningen redan har konsumerat. I samtliga standardkonfigurationer: **0 timmar** med nätladdning
medan oanvänt solöverskott fanns. Peak-reserven orsakar ingen extra curtailment, eftersom reserven är
ett *golv* (behåll energi) och inte ett tak; taket är alltid `hourCeil`.

Soldygn 15 maj: solen laddar batteriet till 14,25 kWh kl 08–10, resten exporteras (4,0 kW), och
kvällens last 17–21 täcks av batteriet — utan en enda kWh nätladdning inför toppen.

## 6. Soloptimering mot FCR-D upp

FCR-D upp reserverar bara *upp*-riktning, så `downPowerKw = 0` och `hourCeil = 14,25 kWh` = vanliga
SOC-taket. Därför konkurrerar solen inte om nedregleringsheadroom i denna version — solen laddar till
taket, resten exporteras/curtailas som utan FCR. Egenanvändningen kan inte äta FCR-reserven, eftersom
laddning bara höjer SOC. När konflikten inte kan lösas (fullt batteri, mycket sol) redovisas det som
curtailment respektive availability, aldrig som intäkt. Testfall H (nästan fullt batteri, 25 000 kWh sol,
FCR 3 kW): 0 gränsöverskridanden, availability 100 %, energinytta −193 kr, curtailment 1 546 → 1 531 kWh.

## 7. Alla strategier samtidigt — villa 10 000 kWh / 12 000 kWh sol / 15 kWh / 3 kW

Fysik (historiskt optimal reservation 1,5 kW):

| Post | Värde |
|---|---|
| Kapacitet / effekt | 15 kWh / 3 kW |
| FCR erbjuden | 1,50 kW |
| FCR faktiskt hållen (medel över året) | 1,2692 kW |
| FCR reserverad energi | 0,525 kWh (+ 5 % headroom ⇒ golv 3,00 kWh) |
| FCR availability | 84,61 % (7 412 av 8 760 timmar) |
| Nätimport | 5 106,79 kWh (utan FCR 4 910,54) |
| Nätexport | 6 692,65 kWh |
| Laddning från sol | 2 372,59 kWh |
| Laddning från nät | 50,61 kWh (varav beredskap 0,06) |
| Urladdning till last | 2 065,50 kWh |
| Batteriförluster | 371,00 kWh (inkl. standby 175,2 + självurladdning) |
| Peak före → efter | 5,5338 → 4,4872 kW |
| Curtailment före → efter | 0 → 0 kWh |
| Cykler | 161,80 |
| SOC min / max | 3,00 / 14,25 kWh (fönster 0,75–14,25) |

Ekonomi:

| Post | kr/år | Additiv? |
|---|---|---|
| Energinytta | 1 568,96 | ja |
| Minskad effektkostnad | 740,92 | ja |
| FCR-D upp brutto | 770,75 | ja |
| FCR alternativkostnad | −130,55 | nej, diagnostik |
| FCR inkrementellt netto | 640,20 | nej, diagnostik |
| **Total operativ nytta** | **3 080,63** | summa av de tre additiva |

Additiva nycklar i resultatet: `["energy","peak","fcrGross"]` — inget annat summeras.

## 8. Energi- och effektkonservering, timme för timme (8 760 timmar × 13 fall)

| Kontroll | Resultat |
|---|---|
| hållen FCR-kW + urladdnings-kW ≤ batteriets kW | 0 avvikelser (max 3,0000 av 3 kW) |
| laddnings-kW ≤ batteriets kW | 0 avvikelser |
| SOC inom fönstret | 0 avvikelser |
| FCR-reserven tömd i en betald timme | 0 avvikelser |
| SOC över FCR-taket i reserverad timme | 0 avvikelser |
| import ≤ importgräns, export ≤ exportgräns | 0 avvikelser |
| timvis balans (last + laddning − sol − urladdning = import − export) | 0 avvikelser |
| ladda och urladda samma timme | 0 timmar |
| årlig energibalans | OK i alla 13 fall (residual < 1e-9 kWh) |

Ett undantag: med **egenanvändning + curtailment recovery avstängda** (peak shaving kvar på) finns
3 042 timmar med samtidig import och export. Magnitud: 0,1425 kWh import/år totalt, största enskilda
0,000076 kW. Fysikaliskt inkonsekvent men numeriskt försumbart. Fynd F4.

## 9. Faktisk prioritetsordning

1. Hårda batterigränser (SOC-fönster, kW) och hårda nätgränser
2. FCR-D upp: riktad kW- och kWh-reservation (`hourFloor`, `hourCeil`, reducerade kW-tak)
3. Direkt solel till last (inget batteri inblandat)
4. Peak-reserv (24 timmars deterministisk framåtblick)
5. Urladdning: peak shaving → minskad nätimport → arbitrage-export
6. Laddning: solöverskott (curtailment-toppen först) → peak-shaving-nätladdning → FCR-beredskapsladdning → arbitrage
7. Nätutbyte, curtailment och otäckt last bokförs sist

Bedömning: ordningen är fysikaliskt rimlig och till största delen uttrycklig (kommenterad, testad).
Tre saker är dock **kodordningseffekter snarare än dokumenterade designbeslut**:

- FCR-beredskapsladdningen ligger *efter* peak-laddningen och får använda full `chargeKw` (inte
  `chargeLimitKw`) och saknar peak-tröskeltaket.
- Availability-bedömningen ligger *före* timmens beredskapsladdning (fynd F1).
- `targetSoc = min(hourCeil, resNow ? hourFloor : hourFloor)` — ternären är identisk i båda grenarna,
  så förladdning inför en *kommande* reserverad timme sker aldrig (vilande så länge planen är helår).

## 10. Ekonomiska krockar

| Kontroll | Utfall |
|---|---|
| minskad import värderas en gång | ja — enda energiposten är `energyValueBattery − energyValueBaseline`; "värde av minskat elköp" ligger i diagnostiklistan |
| förlorad export värderas en gång | ja — samma differens, diagnostikposten summeras inte |
| nätladdning ger ingen falsk nytta | ja — nätladdning höjer import och sänker därmed energinyttan |
| effektkostnad bara på faktisk månadspeak | ja — `monthlyReductionKw` per kalendermånad ur simulerade serier |
| FCR betalas bara på faktiskt hållen effekt | ja — `ancillaryReservedPowerKwByHour`, 0 i ej redo-timmar |
| alternativkostnad dras inte av igen | ja — endast i `diagnostic`, med explicit not |
| FCR-optimeringen jämför total operativ ekonomi | ja — energi + effekt + FCR-brutto, 0 % alltid kandidat, tie-break 25 kr till lägre reservation |

FCR-sweep i standardfallet: 0 kW → 2 440 kr, 0,75 → 2 667, **1,5 → 3 081 (vinnare)**, 2,25 → 2 999,
3 kW → 1 590. Vinnaren är alltså inte en gränseffekt.

En asymmetri: `monthlyReductionKw = max(0, base − battery)`. En månad där batteriet *höjer* toppen
kostar inget i modellen. I FCR-3 kW-fallet är den okostade höjningen 13,20 kr/år (0,02 kW/månad,
standby-driven). Fynd F2.

## 11. Stressfall (samtliga med alla fyra strategier på)

| Fall | Fysisk gräns bruten | Använde reserverad kW | Använde reserverad kWh | Otillåten import/export | Värde utan fysisk nytta |
|---|---|---|---|---|---|
| A liten sol 1 500 kWh | nej | nej | nej | nej | nej (energinytta −32 kr redovisas negativ) |
| B stor sol 30 000 kWh | nej | nej | nej | nej | nej |
| C ingen sol | nej | nej | nej | nej | nej (energinytta −277 kr) |
| D kort hög topp (elbil, 40 % mål) | nej | nej | nej | nej | nej |
| E lång topp (värmepump 25 MWh) | nej | nej | nej | nej | nej, otäckt last 66 → 0 kWh |
| F liten säkring 10 A | nej | nej | nej | nej | nej, otäckt last 72,7 → 1,9 kWh |
| G exportbegränsad 3 kW | nej | nej | nej | nej | nej, curtailment 2 908 → 2 457 kWh |
| H nästan fullt + mycket sol + FCR 3 kW | nej | nej | nej | nej | nej, 0 cykler och negativ energinytta redovisas |
| I nästan tomt + kommande peak + FCR 3 kW | nej | nej | nej | nej | nej |
| J 200 kW / 500 kWh / 400 MWh | nej | nej | nej | nej | nej, FCR 49 577 kr på 79,8 % availability |
| K egenanvändning AV, peak PÅ | nej | nej | nej | 3 042 timmar samtidig import+export, 0,14 kWh/år | nej |
| L FCR = hela 3 kW | nej | nej | nej | nej | nej, alla energistrategier tystas (dischargeLimit 0) |

## 12. Fynd

**F1 — FCR-availability bedöms före timmens beredskapsladdning (klass A, konservativ).**
Självurladdningen appliceras först och begränsas bara av det ordinarie SOC-golvet, inte av FCR-golvet.
1 348 timmar/år (15,4 %) bedöms därför som "ej redo" — och i **samtliga** 1 348 fall är SOC tillbaka på
eller över golvet vid timmens slut, tack vare beredskapsladdningen i samma timme. Effekt: availability
84,6 % i stället för ~100 %, FCR-brutto 771 kr i stället för storleksordningen 900 kr. Fysiken, SOC och
energibalansen är korrekta; felet ligger i ordningen mellan mätning och åtgärd, och det underskattar
alltid intäkten. Kan påverka valet 1,5 kW i FCR-sweepen om det rättas.

**F2 — Ökad månadstopp kostar aldrig något (klass A, marginell).**
`max(0, …)` per månad ger kredit för sänkningar men ingen kostnad för höjningar. Storlek i dagens
fall: 13,20 kr/år, och bara i FCR-3 kW-fallet som ändå förlorar sweepen.

**F3 — FCR-beredskapsladdning saknar peak-tröskeltak (klass B).**
Till skillnad från peak-laddningen begränsas den bara av importgränsen och kan därför i princip lyfta
månadstoppen. Faktisk storlek: 0,06 kWh/år (standard), 2,21 kWh/år (tomt batteri).

**F4 — Nätladdning konsulterar inte solöverskottet när solladdning är avstängd (klass B).**
Med egenanvändning och curtailment recovery avstängda uppstår 3 042 timmar med samtidig import och
export (0,14 kWh/år). Inträffar aldrig i någon standardkonfiguration.

**F5 — Vilande förladdningsgren (klass C).**
`resNow ? hourFloor : hourFloor` gör att förladdning inför en kommande reserverad timme aldrig sker.
Ofarligt så länge planen är helår (dagens enda profil), men koden signalerar en avsikt den inte utför.

**F6 — Full-effekts FCR tystar alla energistrategier (klass B, avsiktligt).**
3 kW av 3 kW ⇒ `dischargeLimitKw = 0`, 0 cykler, negativ energinytta. Fysikaliskt korrekt, ekonomiskt
korrekt hanterat (sweepen väljer 1,5 kW), men lätt att misstolka utan förklaring — presentationsrisk.

## Slutrapport

| Område | Status | Klass | Förklaring |
|---|---|---|---|
| FCR ↔ egenanvändning | OK | D | FCR-D upp reserverar bara upp-riktning; laddning kan inte äta reserven |
| FCR ↔ peak shaving | OK | B | FCR-golvet och kW-taket har strikt företräde; peak shaving får resten (1,5 av 3 kW) |
| FCR ↔ nätladdning | Anmärkning | B | beredskapsladdning saknar peak-tröskeltak (F3), 0,06–2,21 kWh/år |
| Peak ↔ minskad import | OK | B | 24 h framåtblick, peak-reserven är stängd för minskad import — avsiktligt |
| Peak ↔ sol | OK | D | sol laddas alltid före nät; 0 timmar onödig nätladdning; ingen extra curtailment |
| Nät ↔ batteri | OK | D | 0 timmar över import-/exportgräns i 13 fall; baslinjen kapas mot samma gräns |
| Effektkonservering | OK | D | max (hållen FCR + urladdning) = 3,0000 kW av 3 kW, 0 avvikelser |
| Energikonservering | OK | D | 0 timmar där reserverad kWh användes av annan strategi; balans OK överallt |
| Ekonomisk dubbelräkning | OK | D | tre additiva poster, alternativkostnad endast diagnostik |
| Alla strategier samtidigt | OK med anmärkning | A/C | korrekt fysik och ekonomi; FCR-availability underskattas systematiskt (F1) |

**1. Blockerande konflikt före flytt?** Nej. Ingen strategi bryter en fysisk gräns, ingen använder en
annans reserverade kW eller kWh, och ingen krona räknas dubbelt. F1 och F2 gör resultatet något
konservativt, inte optimistiskt.

**2. Prioriteringsregel som bör göras explicit före export?** Ja, tre: (a) FCR-D upp har absolut
företräde före peak shaving och minskad import, både i kW och kWh; (b) peak-reserven med 24 timmars
framåtblick är stängd för minskad import men öppen för peak shaving; (c) FCR-beredskapsladdning får
använda full laddeffekt och lyder inte under peak-tröskeln. Idag framgår (a)–(c) bara av kodordningen.

**3. Säkert att frysa exakt denna motor som v1.0.0?** Ja — fysiken, konserveringen och ekonomin håller.
Innan externa intäktslöften görs bör F1 rättas, eftersom FCR-brutto systematiskt underskattas med
storleksordningen 15 %.

CONFLICT AUDIT: PASS

---

# Åtgärdsrapport — fynden F1–F6 rättade före frysning som v1.0.0

Alla ändringar ligger i motorns dispatch- och ekonomilager. Ingen profil, prisdata, sizing-regel,
default eller 200 kW-gräns har ändrats. UI-lagret är orört.

## F1 — FCR-beredskapens tidsordning

**Rotorsak.** Två fel samverkade. (a) Beredskapen bedömdes vid en enda tidpunkt före
beredskapsladdningen. (b) Det verkliga felet låg tidigare i kedjan: strategierna fick tömma
batteriet till exakt reservationsgolvet, varefter nästa timmes passiva självurladdning — som
appliceras allra först — sköt SOC strax under golvet. Reservationen tappade alltså sin beredskap
genom en förlust som modellen känner till i förväg.

**Åtgärd.**
1. Dispatchen försvarar nu `hourFloorDefended = hourFloor / (1 − självurladdningsgrad)`, dvs. golvet
   plus en timmes känd passiv förlust. Ingen framåtblick används; energin hålls verkligen undan från
   övriga strategier, så inget utrymme används två gånger.
2. Beredskapen bedöms över **hela** timmen: effektkravet måste rymmas i batteriets märkeffekt och den
   reserverade effekten hållas undan hela timmen, och SOC-banan inom timmen är monoton (laddning och
   urladdning kan inte ske samma timme), varför `min(SOC vid timstart, SOC vid timslut)` är timmens
   verkliga värsta fall. Framtida laddning kan alltså inte i efterhand bevisa tidigare beredskap.
3. Definition: *hållen FCR-effekt* = erbjuden upp-effekt som var både effekt- och energimässigt
   levererbar under hela timmen. *Availability* = andel reserverade timmar som uppfyller detta.

**Modellbegränsning.** Timupplösningen kan inte styrka kontinuitet inom timmen. Modellen använder
därför timmens värsta endpoint som konservativt antagande.

**Före → efter (GM05, FCR-D upp 1,5 kW):** availability 64,97 % → 100 %, hållen effekt 0,9745 kW →
1,5000 kW, FCR-brutto 610,34 → 901,72 kr/år. Energibalans OK i båda fallen.

## F2 — negativa effektbesparingar räknas

**Rotorsak.** `monthlyReductionKw = Math.max(0, bas − batteri)` nollade månader där batteriet höjde
den debiteringsgrundande toppen.

**Åtgärd.** Månadsvärdet är nu signerat (`bas − batteri`). Negativa månader prissätts med samma tariff
och ingår exakt en gång i årssumman; effektposten är fortsatt den enda plats där en kW-storhet
prissätts.

**Före → efter (GM01 standardvilla):** minskad effektkostnad 508,31 → 505,01 kr/år, total operativ
nytta 2 274,51 → 2 271,21 kr/år. GM10 visar nu en negativ effektpost, −13,20 kr/år, som tidigare var
osynlig.

## F3 — FCR-laddningens prioritet

FCR-beredskapen behåller sitt avsedda företräde före peak-målet och är inte begränsad av
månadströskeln, men lyder alltid hårda batteri- och nätgränser. Regeln är nu skriven i koden som en
uttrycklig prioritetsregel, inte som en följd av kodordningen. Konsekvenserna prissätts en gång var:
den importerade energin sänker energinyttan, och en höjd månadstopp kostar nu pengar via den
signerade effektposten (F2).

## F4 — samtidig import och export

**Rotorsak.** När egenanvändning och curtailment recovery var avstängda kunde peak-, beredskaps- och
arbitrageladdning importera medan samma timmes solöverskott exporterades.

**Åtgärd.** All laddning går genom `takeFromSurplus()`, som först konsumerar gratis solöverskott och
bokför export-/curtailment-andelen, innan någon nätimport sker. Rättningen sitter i flödesberäkningen,
inte i presentationen.

**Före → efter:** 3 042 timmar med samtidig import och export → 0 timmar. Timvis energibalans OK.

## F5 — utebliven förladdning

Grenen `resNow ? hourFloor : hourFloor` var verkningslös. Reservationsprofilen i denna version täcker
årets alla timmar, så en ”kommande” reserverad timme är alltid den aktuella. Grenen är borttagen och
dokumenterad som *ingen förladdning modelleras*. Ingen ny funktionalitet aktiverades och ingen
framåtblick infördes.

## F6 — reservationsbeteende

Full effektreservation lämnar fortsatt noll urladdningseffekt till energistrategierna (verifierat:
0 kWh urladdat, 0 cykler). Sweepens text beskriver nu 1,50 kW som *bäst av de prövade nivåerna under
dessa antaganden med 2025 års FCR-D upp-priser*, inte som en generell rekommendation.

## Verifiering

Ny riktad regressionssvit: `src/lib/lab/strategyConflict.test.ts` (8 tester) — SOC nära FCR-golvet med
självurladdning och beredskapsladdning, ej levererbar reservation, oreserverade timmar, signerade
månadstoppar, prissättning exakt en gång, beredskapsladdning inom hårda gränser, avstängd solladdning
med peak shaving (0 timmar samtidig import/export) och full effektreservation.

- **216 tester passerar** (tidigare 208 + 8 nya). Typecheck passerar.
- Alla 12 Golden Master-fall passerar mot uppdaterade referensvärden. Skillnaderna mot tidigare
  referens är enbart de avsedda effekterna av F1, F2 och F4; sizing, gridstatus, otäckt last,
  cykler och energibalans är oförändrade i samtliga fall.
- Energibalans OK och residual ≈ 0 i alla fall; inga överskridna SOC-, effekt- eller nätgränser;
  inga skyddade reserver använda av annan strategi; ingen samtidig laddning och urladdning.

**FCR-priser och antaganden:** historiska svenska FCR-D upp-priser 2025, EUR/SEK 11,30, importpris
1,50 kr/kWh, exportvärde 0,60 kr/kWh, effekttariff 55 kr/kW/månad (schablon). Aktivering simuleras
inte — endast reservationen.

**Årsekonomin** summerar energinytta + förändrad effektkostnad + FCR-brutto, varje post exakt en gång.
Alternativkostnaden är fortsatt endast diagnostik och dras inte av igen.

## Kvarstående modellbegränsningar

- Timupplösning: kontinuerlig beredskap inom en timme kan inte bevisas, endast bedömas konservativt.
- FCR-aktivering (energileverans vid frekvensavvikelse) simuleras inte.
- Ingen förladdning inför framtida reservation; nuvarande profil gör den överflödig.
- Effekttariffen är en schablon när användaren inte anger egen.

## Bedömning

Motorn är redo att frysas som v1.0.0: fysiken håller, konserveringslagarna håller, ekonomin summerar
varje post exakt en gång, och de tidigare systematiska snedvridningarna (underskattad FCR-beredskap,
dolda effekthöjningar, samtidig import/export) är åtgärdade vid källan. Ingen release skapad och inget
versionsnummer ändrat i detta steg.

CONFLICT AUDIT REMEDIATION: PASS
