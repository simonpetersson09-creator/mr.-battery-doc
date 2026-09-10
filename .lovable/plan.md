# Batterirapport (PDF) — Steg 1: audit och plan

## A. Så är referens-PDF:en (Mr. Solar Doc) uppbyggd

8 sidor, tydlig ordning: sammanfattning först, transparens sist.

1. Sida 1: rubrik "Solcellsrapport" + "Mr. Solar Doc" + skapad-datum + adress. Fyra sammanfattningskort i en rad. Därefter årsbalans-tabell, maxinvestering vid tre återbetalningstider, kort brödtext med antaganden.
2. Sida 2: dimensionering som tvåkolumnstabell med en tredje kolumn "datatyp" (Ditt värde / Beräknat / Standardantagande / Extern datakälla).
3. Sida 3: produktion, elanvändning, egenanvändning + månadstabell.
4. Sida 4: 30-årstabell i två kolumnblock, med nyckeltal överst.
5. Sida 5: ekonomiskt värde + viktigaste kalkylantaganden, grupperade med underrubriker.
6. Sida 6: "Vad kan påverka utfallet?" som löpande text.
7. Sida 7: checklista till installatören, kryssrutor.
8. Sida 8: FAQ med fråga som underrubrik och kort svar. Sist en rad: Rapport-ID · Skapad · Beräkningsversion.

Genomgående: sidfot "Mr. Solar Doc  ·  MSD-ÅÅÅÅMMDD-XXXXX  ·  sida X / Y", mörk text, mycket luft, inga dekorativa grafiker.

## B. Vilken PDF-teknik som finns idag

Ingen. Det finns bara en typad entry point `src/lib/report/pdfReport.ts` med `PDF_REPORT_AVAILABLE = false`, som redan tar emot exakt det resultatobjekt resultatsidan renderar (outcome, customerEconomy, valt återbetalningsår, språk). Inget PDF-bibliotek är installerat.

Förslag: `pdfmake` (klientgenererad, deklarativa tabeller, egen header/footer per sida, inga native-beroenden). Alternativ vore jsPDF+autotable; pdfmake ger jämnare typografi och enklare sidbrytning för den här sortens rapport.

## C. Vilka batteridata som redan finns (allt från befintlig simulering)

Direkt tillgängligt:

- Rekommendation: kapacitet kWh, produkt-effekt, rekommenderad systemeffekt, C-rate, fysiskt effektbehov, motivering.
- Energi: årsförbrukning, solproduktion, import/export före och efter, egenanvändning och självförsörjning före/efter, flyttad solel, laddad nätenergi, batteriförluster, ekvivalenta cykler, utnyttjandegrad.
- Nät: fysisk/operativ import- och exportgräns, toppimport före/efter, månadstoppar, curtailment, status och konsekvenser.
- Effekt/peak: reduktion kW, tariff, tariffkälla, minskad effektkostnad.
- Stödtjänster: erbjuden, reserverbar, hållen och betald effekt, tillgänglighet, begränsande faktor och antal timmar per orsak, reserverad energi, marknadsvärde (kan vara null), referensår, produktetikett, disclaimer.
- Ekonomi: energinytta, effektbesparing, engine-total, kundandel, kundnytta, maxinvestering.
- Alternativ: mindre / ditt batteri / större, var och en fullt simulerad med kWh, kW och nytta.

Saknas i motorn: adress/fastighet (samlas inte in), och en flerårsmodell (degradering, prisutveckling, kalkylperiod). Motorn är ett år-1-verktyg.

## D. Föreslagen sidstruktur för batterirapporten

1. **Sida 1 – Sammanfattning.** Batterirapport / Mr. Battery Doc / skapad-datum. Fyra kort: Batterikapacitet, Batterieffekt, Beräknad nytta, Maxinvestering vid vald återbetalningstid. Därunder "Så förbättras fastigheten" med före→efter för egenanvändning, självförsörjning, nätimport och effekttopp, plus sammanfattningsraden.
2. **Sida 2 – Beräknad nytta.** Total kundnytta, uppdelad i energinytta, peak shaving och stödtjänster med kort förklaring per rad. Summan härledbar mot totalen.
3. **Sida 3 – Stödtjänster (endast om aktiverade).** Produkt, erbjuden/reserverbar/hållen effekt, tillgänglighet, begränsande faktor, marknadsvärde, kundandel, kundersättning, prisunderlag och referensår, förbehåll. Saknas prisunderlag skrivs "kan inte beräknas" — aldrig 0 kr.
4. **Sida 4 – Varför detta batteri.** Valt batteri (kWh, kW, C-rate) och de tre simulerade alternativen med nytta, plus motorns egen motivering. Formuleras som bäst balans, inte som objektivt bäst.
5. **Sida 5 – Energibalans utan och med batteri.** Tabell över de energiflöden som faktiskt finns, inklusive cykler och förluster.
6. **Sida 6 – Effekt och nät.** Huvudsäkring, anslutning, gränser, toppar före/efter, curtailment, timmar där nät- respektive batterigräns binder, samt kort kW/kWh-förklaring.
7. **Sida 7 – Maxinvestering.** Vald återbetalningstid, maxinvestering, tre scenarier (vald ±2 år), tydlig text om att det inte är ett marknadspris eller en offert.
8. **Sida 8 – Kalkylantaganden** grupperade i Fastigheten / Batteriet / Ekonomi / Stödtjänster, varje rad med datatyp (Ditt värde, Beräknat, Standardantagande, Extern datakälla).
9. **Sida 9 – Vad kan påverka utfallet** + **Att gå igenom med installatören** (batteri-specifik checklista).
10. **Sida 10 – Vanliga frågor**, avslutas med Rapport-ID · Skapad · Beräkningsversion.

Header på sida 1, sidfot på alla sidor: `Mr. Battery Doc · MBD-ÅÅÅÅMMDD-XXXXX · X / Y`. Rapport-ID genereras en gång per rapport av datum + slumpad bas32-svans.

## E. Vad som kan byggas direkt

Punkt 1–9 och 11–15 i din spec kan byggas fullt ut på befintliga data.

## F. Vad som saknar underlag

- **Långsiktig ekonomi (din punkt 10).** Motorn har ingen flerårsmodell: ingen degraderingskurva, ingen elprisutveckling, ingen kalkylperiod. Att bygga en 30-årstabell skulle innebära en andra beräkningsmotor i PDF:en, vilket din punkt 18 förbjuder. Förslag: hoppa över sektionen och skriv en rad om att kalkylen avser år 1. Vill du ha den på riktigt är det ett separat motorbeslut.
- **Adress/fastighet.** Samlas inte in i wizarden; utelämnas tills fältet finns.

## G. Divergensrisker och hur de hanteras

- PDF:en får inget eget beräkningslager: den tar emot samma `outcome`, `customerEconomy`, alternativ och valt återbetalningsår som resultatsidan redan renderar, och gör bara formattering.
- Samma centrala valuta- och talformattering som resultatsidan, landstyrd.
- Alternativen skickas in färdigsimulerade från resultatsidan, körs inte om i rapporten.
- Regressionstest som jämför rapportens datamodell mot resultatobjektet fält för fält, samt tester för stödtjänster med pris / utan pris / avstängda, med och utan solel, rapport-ID, sidfot, svenska talformat och att ingen text innehåller undefined/null/NaN.

## Teknisk sammanfattning

- Nytt: `pdfmake` som beroende, `src/lib/report/` delas i `reportModel.ts` (rent dataobjekt ur outcome + customerEconomy), `sections/*.ts` (en modul per sida), `layout.ts` (färger, typografi, header/footer, korthelpers, tabellhelpers) och `pdfReport.ts` som orkestrerar och sätter `PDF_REPORT_AVAILABLE = true`.
- Rapportspråk via befintlig i18n (sv/en/de/da/fi), belopp via befintlig landstyrd valutaformatterare.
- Battery Engine, adapter, dimensionering, ekonomi och Golden Masters rörs inte.
