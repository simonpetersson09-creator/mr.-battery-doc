# Förbättra PDF-rapporten för ”Ingen solanläggning”

## Mål
Göra PDF-rapporten scenarioanpassad för ett fristående batteri med stödtjänster, utan ändringar i motor, dimensionering, FCR/SOC, priser, ekonomiska formler, numeriska resultat eller Golden Masters.

## Genomförande

1. **Inför särskild rapportcopy för fristående batteri**
   - Lägg till svenska och engelska texter för sammanfattning, teknisk dimensionering, stödtjänstnytta, storleksjämförelse, maxinvestering, antaganden, risker, installatörschecklista och FAQ.
   - Använd denna copy endast när rapporten bygger på det befintliga ancillary-only/no-solar-resultatet.
   - Behåll nuvarande språkfallback för övriga rapportspråk.

2. **Bygg om sida 1 för tydlig prioritering**
   - Visa tre primära värden: tekniskt dimensioneringsförslag i kWh/kW, total beräknad nytta och maxinvestering.
   - Lägg till den korta förklaringen om att dimensioneringen styrs av nätanslutning och tekniska stödtjänstkrav, medan kundens 8760-förbrukning används efteråt för reserv, ersättning och nytta.
   - Behåll år-1-informationen och upplysningen om att framtida priser och degradering inte prognostiseras.
   - Förbättra endast rapportens visuella hierarki med befintliga färger och varumärke.

3. **Gör batteristorleksjämförelsen tekniskt korrekt**
   - Behåll befintliga dynamiska kandidater och exakt samma siffror.
   - Presentera mindre / tekniskt förslag / större och förklara att fler kWh inte automatiskt höjer ersättningen när uthållighetskravet redan är uppfyllt.
   - Ta bort formuleringar om ekonomiskt optimum, högst nytta och ”bäst balans”.

4. **Prioritera stödtjänstsidan**
   - Lyft kundersättning, ersättningsgrundande effekt, tillgänglighet och prisunderlag som stora huvudvärden.
   - Visa tekniska mått underordnat: nominell effekt, erbjuden effekt, fysiskt reserverbar effekt, hållen effekt, reserverad energi/timmar, marknadsvärde, kundandel och kundersättning.
   - Lägg till en kort förklaring till varför nominell, erbjuden och ersättningsgrundande effekt kan skilja sig.

5. **Anpassa ”Varför detta batteri?”**
   - Visa dynamisk kapacitet, effekt och C-rate som tekniskt dimensioneringsförslag.
   - Dölj ”Fysiskt effektbehov 0,0 kW” i pure-FCR-fallet.
   - Förklara kW/kWh och stödtjänstens uthållighetskrav utan att påstå att förbrukning eller ekonomi väljer storleken.

6. **Förtydliga maxinvestering och antaganden**
   - Behåll samma formel och samma tre dynamiska återbetalningstider.
   - Förklara att beloppet motsvarar vald återbetalningstid om år-1-nyttan består och inte är marknadspris, offert eller garanti.
   - Visa endast relevanta no-solar-antaganden: förbrukning/profil, huvudsäkring/anslutning, batteri, verkningsgrad, faktiskt använda SOC-fönster, stödtjänst, prisunderlag, kundandel och återbetalningstid.
   - Ta bort irrelevanta elpriser, effektavgifter, solvärden, cykelgräns med ”Uppgift saknas” och andra oanvända fält.

7. **Scenarioanpassa risker, checklista och FAQ**
   - Risker fokuserar på lastprofil, verkningsgrad, degradering, tillgänglighet, stödtjänstpriser, aggregatorvillkor/avgifter, marknadstillträde, förkvalificering, regelverk och nätbegränsningar.
   - Checklistan fokuserar på kapacitet/effekt, säkring/nät, laddning/urladdning, installation/brandskydd, garantier, aggregator, förkvalificering, avgifter/intäktsdelning och offert mot maxinvestering.
   - FAQ:n ersätts i no-solar-läget med de elva efterfrågade stödtjänstfrågorna och tekniskt korrekt dimensioneringsförklaring.

8. **Rensa förbjudet och irrelevant innehåll**
   - Säkerställ att ancillary-only-PDF:n inte innehåller solproduktion, solcellsstorlek, egenanvändning, självförsörjning, överskottsel, exporterad/lagrad solel, PV-antaganden eller solcellsfrågor.
   - Säkerställ att den inte innehåller peak shaving, effekttoppskapning, peak reduction, peak-intäkt eller peak-relaterad FAQ/checklista/förklaring.
   - Ta bort kundsynlig text som antyder att pure-FCR-storleken bestäms av förbrukningsprofil, högst ersättning, bäst lönsamhet eller ekonomiskt optimum.
   - Vanliga rapporter med sol lämnas oförändrade förutom eventuell neutral copy som uttryckligen behöver separeras.

9. **Regressionstester och visuell PDF-kontroll**
   - Utöka rapporttesterna med no-solar-assertions för obligatoriska texter, förbjudna begrepp, dolda irrelevanta fält, oförändrade råvärden och avsaknad av `undefined`/`NaN`.
   - Generera före/efter-PDF för testfallet: ingen sol, 20 000 kWh/år, Normal villa, 20 A, FCR-D upp och ned, 15 kWh / 10 kW, 7 412 kr/år och 88 940 kr.
   - Jämför rapportmodellens numeriska värden före/efter och verifiera att inga beräknade siffror ändrats.
   - Rendera varje PDF-sida till bild och kontrollera överlapp, klippning, tomma sidor, ordning och läsbarhet.
   - Kör full testsuite, TypeScript-kontroll och production build via projektets ordinarie verifieringsflöde.
   - Redovisa slutlig git-status samt exakt ändrade/borttagna/införda PDF-sektioner och texter.

## Tekniska avgränsningar
- Endast `src/lib/report/*` och rapporttester ändras.
- Ingen motor-, input-, dispatch-, sizing-, FCR-, SOC-, nät-, ekonomi-, prisserie- eller Golden Master-fil ändras.
- Alla dynamiska tal hämtas fortsatt från samma redan simulerade resultat och samma valda ancillary-kandidat som resultatsidan.
