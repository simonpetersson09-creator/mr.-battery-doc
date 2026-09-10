# Betalvägg mellan steg 5 och resultat

## Steg 1 — Audit (genomförd, ingen kod ändrad)

**Nuvarande flöde**
- Stegen definieras i `src/components/wizard/steps.ts`; `WizardShell.tsx` bygger Nästa/Tillbaka som `<Link>` till nästa path. Steg 5 (`/ekonomi`) länkar rakt till `/resultat`.
- **Beräkningen körs inte på steg 5.** Den körs i `src/routes/resultat.tsx` (`runBatteryApp(state)` i `useMemo`), tillsammans med alternativ och kundekonomi. Det finns alltså inget sparat resultatobjekt idag.
- All wizard-data ligger i `src/state/wizard.tsx` och speglas till localStorage. Eftersom resultatet är en ren funktion av detta state överlever det navigation, appväxling och avbrutna köp automatiskt.
- **Det finns inget stabilt calculation-ID.** Rapport-ID skapas först när PDF:en byggs (`createReportId` i `reportModel.ts`) och är tidsstämpelbaserat — alltså nytt varje gång. Det duger inte som upplåsningsnyckel.
- **Ingen Capacitor och ingen IAP-kod finns i projektet** (inga `@capacitor/*`-paket).
- **Inga Terms/Privacy-routes finns.** De måste skapas eller pekas mot riktiga publika URL:er innan App Store-granskning. Jag hittar inte på länkar.
- PDF-knappen på resultatsidan anropar `generatePdfReport` direkt, utan accesskontroll.

## Föreslagen lösning

**Calculation-ID:** en deterministisk hash av det beräkningspåverkande wizard-statet (land, förbrukning, produktion, batteri, ekonomi, preferenser). Samma indata → samma ID → samma upplåsning; ändrar användaren en siffra blir det en ny beräkning som inte är betald. Detta löser krav 9 utan parallell rapportberäkning; PDF:ens rapport-ID lämnas orört.

**Steg 5 → Nästa:** kör `runBatteryApp` en gång, lagra resultatet i wizard-state (i minnet, ej localStorage) tillsammans med calculation-ID. Vid Premium → `/resultat`. Annars → `/betalvagg`. Resultatsidan återanvänder det lagrade resultatet om ID:t matchar, annars räknar den som idag — så inget dubbelkörs efter köp.

**Entitlement (en central modul, `src/lib/access/`):**
- `premium: { active: boolean, expiresISO }` — verifieras via StoreKit vid appstart och vid "Återställ köp".
- `unlockedCalculations: string[]` — consumable-köp markerar aktuellt calculation-ID.
- Access-regel: `premiumActive || unlockedCalculations.includes(currentId)`. Både resultatsidan och PDF-knappen använder samma regel.
- Premium lagras persistent men behandlas alltid som cache: StoreKit är källan.

**IAP-lösning:** RevenueCat (`@revenuecat/purchases-capacitor`). Skälen: serversidig kvittovalidering, färdig entitlement-modell, robust restore och en tydlig plattformsabstraktion. Alternativet `cordova-plugin-purchase` är gratis men lägger all validering och feltolkning på oss. Säg till om du hellre vill köra utan RevenueCat.

**Plattformsabstraktion:** ett interface `PurchaseGateway` med tre implementationer — native (StoreKit via plugin), web (visar "köp endast i appen", inget fake-köp) och mock (endast test, gated på `import.meta.env.DEV` + explicit flagga, omöjlig att nå i produktionsbygge).

**Priser:** displaypris hämtas alltid från StoreKit-produkten. 49 kr / 199 kr används bara som fallback-text när produkter inte kunnat hämtas, aldrig som produktkortets pris när native IAP är aktivt.

## Produkter som behöver skapas i App Store Connect

| Typ | Avsikt | Product ID |
|---|---|---|
| Consumable | 49 SEK, låser upp en beräkning + PDF | **behöver bestämmas** |
| Auto-Renewable Subscription, 1 år | 199 SEK/år, obegränsat | **behöver bestämmas** |

Jag gissar inte ID:na. Jag lägger dem som konstanter i `src/lib/access/products.ts` med tydliga `TODO`-platshållare, och du fyller i dem.

## Filer som berörs

- Nya: `src/lib/access/` (entitlement, calculation-ID, produktkonfig, purchase gateway + web/native/mock), `src/routes/betalvagg.tsx`, tester.
- Ändras: `src/state/wizard.tsx` (lagra färdigt resultat + ID), `src/routes/ekonomi.tsx` och `WizardShell.tsx` (Nästa kör beräkning och routar), `src/routes/resultat.tsx` (access-gate + återanvänt resultat + PDF-gate), `src/components/wizard/steps.ts`, samtliga fem locale-filer.
- Orört: hela `battery-engine`, `battery-app`, dimensionering, stödtjänster, ekonomi, maxinvestering, `report/`-beräkningar och rapportdesign.

## Risker att känna till

- Utan Capacitor i projektet kan native-köpflödet inte testas här; native-lagret levereras som verifierad kod men provkörs först i iOS-bygget.
- RevenueCat kräver konto och API-nyckel (secret) innan native fungerar.
- Terms/Privacy-URL:er saknas — blockerande för App Store, inte för implementationen.
- Fel från IAP-plugins kommer både som exceptions och som result-objekt; feltolkningen testas explicit med mock-gatewayen.

## Tester

Alla tolv scenarier i din lista, plus befintliga 518 tester och produktionsbygge.

---

Godkänn så implementerar jag Steg 2. Två saker behöver du ge mig: Product IDs (eller besked att jag lägger platshållare) och besked om RevenueCat är okej.
