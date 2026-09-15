# Fixa Apples “Start Premium”-anmärkning

## Fynd
- App Store-produkten laddas korrekt när priset syns, men det separata köpflödet har en väntelåsning: pluginets `pending`-händelse sparas men avslutar inte knappens vänteläge. Då kan “Start Premium” se död ut i upp till två minuter.
- Två numeriska Apple-felkoder är felaktiga i adaptern och testerna. Textmatchningen räddar vissa fall, men hanteringen är inte robust på alla enheter/språk.
- Den publicerade verifieringsadressen för köp svarar just nu `404`. Ett genomfört Apple-köp kan därför inte verifieras och låsa upp Premium förrän den aktuella appversionen publiceras med endpointen.

## Ändringar
1. Låt väntande/deferred Apple-köp lämna laddningsläget direkt och visa befintligt besked om väntande godkännande.
2. Korrigera felkoderna mot den installerade pluginversionen och behåll skyddet mot returnerade felobjekt.
3. Visa tydlig “Behandlar köpet…”-text medan StoreKit arbetar, så varje tryck ger omedelbar återkoppling.
4. Lägg till regressionstester för Premium, pending/deferred, felkoder, loading-reset och att inget felaktigt köp ger åtkomst.

## Verifiering
- Kör riktade köp-/StoreKit-tester och hela testsuiten.
- Kontrollera native-build och iOS-sync.
- Kontrollera den publicerade verifieringsadressen igen efter publicering.
- Slutlig köpdialog och sandboxköp måste testas i en ny TestFlight-build på fysisk iPhone/iPad.

## Utanför kodändringen
- Appen behöver publiceras igen så verifieringsadressen finns på den publicerade domänen.
- Därefter krävs en ny TestFlight-build och ny App Review-inlämning.
