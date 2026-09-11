# Korrekt profilskalning för årsförbrukning

## Ändring
- När kunden anger total årsförbrukning ska den valda profilens egna månadsvikter användas.
- Profilens befintliga tim-, vardags-/helg- och säsongsmönster används sedan inom varje månad.
- Årssumman ska fortfarande bli exakt lika med kundens angivna kWh.
- När kunden importerar eller anger 12 månadsvärden ska dessa värden förbli exakt oförändrade; profilen styr då bara fördelningen inom månaderna.

## Verifiering
- Lägg till regressionstester som skiljer årsflödet från månadsflödet.
- Kontrollera exakta månads- och årssummor samt att profilbyte inte skriver över importerade månader.
- Kör hela testsuiten och typkontrollen.
- Visa före/efter för samma representativa årsförbrukning över relevanta profiler, inklusive rekommenderat batteri, effekt och kundnytta.

## Teknisk avgränsning
- Ändringen görs i kopplingen mellan formulärdata och den befintliga motorns månadsinmatning.
- Inga profilvikter, batteriregler, FCR-, ekonomi-, nät- eller dimensioneringsregler ändras.
