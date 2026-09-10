# Mr. Battery Doc

Vi ska skapa en ny mobilapp som heter Mr. Battery Doc.

Appen ska vara en systerapp till Mr. Solar Doc och använda samma grundläggande design-DNA, struktur och mobilkänsla.

Mr. Solar Doc ska vara referens för:

app-shell

navigation

wizard-upplägg

typografi

spacing

kort

formulär

knappar

stegindikering

resultatlayout

mobil/native-känsla

persistent wizard state

responsivitet

Mr. Battery Doc ska kännas som samma produktfamilj, men hela användarflödet ska vara byggt specifikt för batteridimensionering.

VIKTIGT:
Lägg inte in Battery Engine eller avancerad beräkningslogik ännu.

Vi bygger först appens struktur, inmatningsflöde och UX. Den verifierade motorn från Energy Architect kopplas in senare.

Wizard

Bygg följande huvudsakliga flöde:

1. Välkommen

Skapa en enkel och tydlig välkomstsida i samma stil som Mr. Solar Doc.

Användaren ska snabbt förstå att Mr. Battery Doc hjälper till att ta reda på:

vilken batterikapacitet i kWh som passar fastigheten

vilken batterieffekt i kW som behövs

hur batteriet kan användas

vilken nytta batteriet kan skapa

Undvik teknisk detaljnivå på välkomstsidan.

2. Nät

Överst på sidan ska det finnas en tydlig rullista för val av land.

Land

Användaren väljer först vilket land fastigheten ligger i.

Valt land ska sparas centralt och senare kunna styra:

nätspänning

antal faser

relevanta nätstandarder

vanliga huvudsäkringar

valuta

ekonomiska standardvärden

andra landsspecifika antaganden

Strukturen ska vara skalbar så att fler länder enkelt kan läggas till senare utan att UI eller Battery Engine behöver byggas om.

Hårdkoda inte landsspecifik logik direkt i UI-komponenterna. Förbered istället en central country-config.

Efter landvalet visas nätinställningarna för det valda landet.

Huvudsäkring

Användaren ska kunna ange:

Huvudsäkring (A)

Visa lämpliga/vanliga alternativ utifrån valt land, men tillåt även manuell inmatning om det behövs.

Övriga tekniska nätvärden ska i första hand sättas automatiskt utifrån landet och inte belasta vanliga användare med onödiga tekniska val.

För Sverige ska strukturen vara förberedd för svenska nätförhållanden.

Nätinställningarna ska senare skickas till Battery Engine.

3. Förbrukning

Användaren ska kunna ange sin elförbrukning på flera sätt.

Alternativ A – årsförbrukning

Användaren anger:

Total årsförbrukning (kWh/år)

Om användaren endast anger total årsförbrukning ska användaren därefter välja en förbrukningsprofil.

Det finns 12 förbrukningsprofiler i Energy Architect som senare ska importeras till Mr. Battery Doc.

Profilen ska senare användas av Battery Engine för att fördela årsförbrukningen över månader och vidare till den tidsupplösning simuleringen behöver.

Implementera inte egna eller förenklade profiler nu.

Förbered UI och datastruktur så att Energy Architects 12 profiler senare kan kopplas in direkt.

Varje profil ska visas med:

namn

kort användarvänlig beskrivning

Visa inte interna modellparametrar.

Alternativ B – faktisk månadsförbrukning

Användaren ska även kunna ange faktisk förbrukning för årets 12 månader.

Faktiska månadsvärden ska ha företräde framför profilens syntetiska månadsfördelning.

En relevant förbrukningsprofil kan senare fortfarande användas för att fördela energin inom respektive månad.

Alternativ C – foto eller fil

Förbered UI för att användaren senare ska kunna:

fotografera sin elförbrukning/elräkning

bifoga bild eller fil

Om 12 månaders förbrukning kan utläsas ska dessa värden senare kunna användas direkt.

Om endast total årsförbrukning kan utläsas ska användaren fortfarande välja en av de 12 profilerna.

Implementera inte dokumenttolkningen ännu.

4. Produktion

Användaren ska kunna välja:

Jag har ingen solcellsanläggning

eller ange information om sin befintliga solcellsanläggning.

Manuell inmatning

Användaren ska kunna ange:

installerad paneleffekt, kWp

växelriktarens AC-effekt, kW

årsproduktion, kWh

Förbered även för faktisk månadsproduktion.

Foto eller fil

Förbered UI för att senare kunna:

fotografera produktionsinformation

bifoga bild eller fil

läsa data från exempelvis växelriktare, elbolag eller produktionsrapport

Implementera inte dokumenttolkningen ännu.

5. Batteri

Här väljer användaren vad batteriet ska användas till.

Visa tre strategier:

Optimerad egenanvändning av solenergi

Lagra överskott från solceller och använd energin senare.

Minskad nätimport

Använd batteriet för att minska mängden el som behöver hämtas från elnätet.

Peak shaving

Använd batteriet för att minska fastighetens effekttoppar.

Alla tre strategier ska vara ibockade som standard.

Användaren ska kunna slå av/på varje strategi individuellt.

Om användaren inte har någon solproduktion ska appen senare kunna hantera att optimerad egenanvändning av solenergi inte ger någon nytta, utan att övriga strategier påverkas.

Implementera ingen egen dimensioneringslogik nu.

6. Ekonomi

Efter Batteri ska det finnas ett separat steg Ekonomi.

Standardvärdena ska hämtas från landet som användaren valde under Nät.

Användaren ska alltid kunna ändra värdena manuellt.

Sverige – standardvärden

Köpt el
1,50 kr/kWh

Beskrivning:
"Din kostnad för att köpa el från nätet."

Såld solel
0,60 kr/kWh

Beskrivning:
"Vad du får betalt för solel som matas ut på nätet."

Värde av egenanvänd solel

Detta ska inte vara ett separat inmatningsfält.

Beräkna automatiskt:

Värde av egenanvänd solel = köpt el − såld solel

För Sverige med standardvärden:

1,50 − 0,60 = 0,90 kr/kWh

Visa det beräknade värdet för användaren:

Värde av att använda solelen själv
0,90 kr/kWh

Kort förklaring:
"Skillnaden mellan vad det kostar att köpa el och vad du får för att sälja solel."

Ändras något av priserna ska nettovärdet räknas om direkt.

Peak shaving / effektavgift

Peak shaving ska värderas separat från energipriserna.

Förbered ett justerbart fält:

Effektavgift (kr/kW/månad)

Effektavgiften ska inte beräknas från 1,50 eller 0,90 kr/kWh.

Den representerar värdet av att minska debiteringsgrundande effekttoppar.

Om vi ännu inte har en säker land-/nätbolagsspecifik tariff ska värdet kunna vara 0/av som standard och ändras av användaren.

Förbered strukturen så att nätbolagsspecifika effekttariffer senare kan läggas till.

Ekonomisk princip

Den framtida ekonomimodellen ska skilja mellan:

Minskad nätimport
Värderas utifrån priset på köpt el.

Flyttad solel
Värderas utifrån skillnaden mellan köpt och såld el.

Svensk standard:
1,50 − 0,60 = 0,90 kr/kWh

Peak shaving
Värderas separat utifrån minskad debiteringsgrundande effekt och effektavgift i kr/kW/månad.

Undvik dubbelräkning mellan nyttorna.

Lägg inte till någon schablonintäkt för flexibilitets- eller frekvensmarknader.

7. Resultat

Skapa resultatvyn som ett UI-skelett med mock-data.

Den ska senare kunna visa:

Rekommenderat batteri

kapacitet, kWh

effekt, kW

rimligt kapacitetsintervall

Energi

egenanvändning före → efter

självförsörjning före → efter

nätimport före → efter

nätexport före → efter

flyttad energi

Effekt

modellerad effekttopp före

modellerad effekttopp efter

peak reduction i kW och %

Ekonomi

Förbered för:

besparing genom minskad nätimport

värde av ökad egenanvändning av solel

värde av peak shaving

total beräknad årlig nytta

Ekonomin ska redovisas så att samma nytta inte räknas två gånger.

Förklaring

Ge en enkel användaranpassad förklaring till varför just denna kWh/kW-kombination rekommenderas.

Visa inte Energy Architects interna diagnostik, sweeps eller avancerade modellparametrar.

Arkitektur

Bygg appen så att den verifierade Battery Engine från Energy Architect senare kan kopplas in utan att UI:t behöver byggas om.

Ha tydlig separation mellan:

USER INPUT
↓
NORMALISERAD INPUT
↓
BATTERY ENGINE
↓
TEKNISKT RESULTAT
↓
ECONOMICS
↓
UI

Förbered en separat plats för motorn, exempelvis:

src/lib/battery-engine/

och ett framtida publikt interface i stil med:

dimensionBattery(input)

→ BatteryRecommendation

Implementera inte själva Battery Engine ännu.

Landsspecifika inställningar och ekonomiska antaganden ska ligga separat från Battery Engine.

Viktiga regler

Land ska vara första valet på sidan Nät och visas som rullista.

Valt land ska styra relevanta standardvärden i resten av wizard-flödet.

Landsspecifika defaults ska ligga i central konfiguration, inte utspridda i UI:t.

Kopiera inte Energy Architects Battery Engine ännu.

Importera inte de 12 förbrukningsprofilerna ännu.

Implementera inte egna ersättningsprofiler.

Implementera inte en förenklad batterimotor.

Lägg ingen batterifysik direkt i UI-komponenterna.

Hårdkoda inte dimensioneringsregler.

Använd mock-data i resultatvyn tills den riktiga motorn kopplas in.

Mr. Solar Doc är design- och UX-referens.

Energy Architect är senare fysik-, profil- och motorreferens.

Appen ska fungera även utan solcellsanläggning.

Förbered för internationell användning.

Alla wizard-val ska sparas så användaren kan gå bakåt utan att information försvinner.

Mobilupplevelsen är primär.

Börja med att bygga appens visuella grund, wizard och inmatningsflöde.

Efter implementationen, rapportera:

vilka sidor/steg som skapades

hur state mellan stegen sparas

hur landväljaren och country-config är strukturerade

vilka värden som ändras när användaren byter land

hur förbrukningsdata är strukturerad

hur integrationen av Energy Architects 12 profiler är förberedd

hur foto/fil-inmatning är förberedd

hur ekonomiska antaganden lagras och beräknas

var Battery Engine senare ska kopplas in

vilka delar som fortfarande använder mock-data

Ändra eller implementera ingen Battery Engine i detta steg.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b7f0f8d1-5a20-4b22-82fc-43644c40e1a4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
