# Lastprofilfixar

## Mål
Ändra endast de fyra angivna produktionsprofilerna och bevara all motor-, dimensionerings-, ekonomi-, FCR- och nätlogik.

## Genomförande
- Pendlarvilla: byt endast månadsfördelningen till samma platta årsprofil som Normal villa och Hemma dagtid; lämna timvikterna orörda.
- Verkstad: höj vardagens natt-/tomgångsnivå till cirka 0,32 och skala ned arbetstidsvikterna så dygnets viktmassa bevaras; behåll vardagsdominans, 07–16-drift, lunchdipp och låg helglast.
- Pool/sommarhus: inför månadsspecifik, gradvis blandning av bas- och poolform genom övergångsmånaderna, utan att ändra månads- eller årsenergi.
- Elbil natt: använd samma 23–02-fönster på vardag och helg; behåll övrig profil och exakt energinormalisering.

## Regression och verifiering
- Lägg riktade tester för de fyra besluten samt 8760 timmar, exakta månads-/årssummor, ändliga icke-negativa värden, UI/motor-paritet och deterministisk variation.
- Lås att de åtta övriga kundprofilerna är numeriskt oförändrade.
- Ta fram före/efter för det angivna SE-fallet, inklusive dimensionering, ekonomi, energi, peak och FCR samt de fyra profilspecifika måtten.
- Stoppa utan motorjustering om dimensioneringseffekten blir oväntat stor.
- Kör hela testsuiten och relevanta typ-/byggkontroller innan slutrapport.

## Tekniska detaljer
Endast profilkatalogen och profilnära regressionstester ska ändras. Ett separat auditverktyg får användas för reproducerbar före/efter-rapportering; det är inte produktionskod.
