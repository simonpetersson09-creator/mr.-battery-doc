/**
 * Store-specific wording.
 *
 * The locale files keep their App Store / iPhone wording unchanged (that is the
 * iOS and web copy). On native Android only, the keys below are overlaid with
 * Google Play / Android wording. On iOS and web this module does nothing.
 */
import type { i18n as I18n } from "i18next";
import { isAndroid } from "@/lib/platform/runtime";

type Overrides = {
  errors: { importFilesDenied: string; importCameraDenied: string; importPhotosDenied: string };
  paywall: {
    premium: { renewal: string };
    priceUnavailable: string;
    manageWeb: string;
    errors: { network: string; notSupported: string };
  };
  legal: { terms: { p2: string }; privacy: { p2: string } };
};

export const ANDROID_OVERRIDES: Record<"sv" | "en" | "da" | "fi" | "de", Overrides> = {
  sv: {
    errors: {
      importFilesDenied: "Filer är inte tillåtna. Tillåt åtkomst i telefonens inställningar för att välja underlag.",
      importCameraDenied: "Kameran är inte tillåten. Tillåt kameran i telefonens inställningar för att fotografera underlag.",
      importPhotosDenied: "Bilder är inte tillåtna. Tillåt åtkomst i telefonens inställningar för att välja underlag.",
    },
    paywall: {
      premium: { renewal: "{{price}}. Prenumerationen förnyas automatiskt om den inte avslutas enligt Google Plays villkor." },
      priceUnavailable: "Pris hämtas från Google Play.",
      manageWeb: "Hantera abonnemang öppnas via Google Play.",
      errors: {
        network: "Ingen kontakt med Google Play. Kontrollera nätverket och försök igen.",
        notSupported: "Köp är inte tillgängliga i Android-appen ännu.",
      },
    },
    legal: {
      terms: { p2: "Köp av en rapport ger tillgång till den specifika beräkningen. Premium ger obegränsade beräkningar under prenumerationsperioden. Köp hanteras av Google Play och eventuell återbetalning följer Google Plays villkor." },
      privacy: { p2: "Köp verifieras via Google Play. Vi tar inte emot och lagrar aldrig betalningsuppgifter." },
    },
  },
  en: {
    errors: {
      importFilesDenied: "File access is turned off. Allow access in your phone settings to choose a document.",
      importCameraDenied: "Camera access is turned off. Allow the camera in your phone settings to photograph a document.",
      importPhotosDenied: "Photo access is turned off. Allow access in your phone settings to choose a document.",
    },
    paywall: {
      premium: { renewal: "{{price}}. The subscription renews automatically unless cancelled under the Google Play terms." },
      priceUnavailable: "Price comes from Google Play.",
      manageWeb: "Subscriptions are managed through Google Play.",
      errors: {
        network: "No connection to Google Play. Check your network and try again.",
        notSupported: "Purchases are not available in the Android app yet.",
      },
    },
    legal: {
      terms: { p2: "Buying a report unlocks that specific calculation. Premium gives unlimited calculations during the subscription period. Purchases are handled by Google Play and any refund follows Google Play's terms." },
      privacy: { p2: "Purchases are verified via Google Play. We never receive or store payment details." },
    },
  },
  da: {
    errors: {
      importFilesDenied: "Adgang til filer er slået fra. Tillad adgang i telefonens indstillinger for at vælge et dokument.",
      importCameraDenied: "Kameraet er ikke tilladt. Tillad kameraet i telefonens indstillinger for at fotografere bilag.",
      importPhotosDenied: "Billeder er ikke tilladt. Tillad adgang i telefonens indstillinger for at vælge bilag.",
    },
    paywall: {
      premium: { renewal: "{{price}}. Abonnementet fornyes automatisk, medmindre det opsiges i henhold til Google Plays vilkår." },
      priceUnavailable: "Prisen hentes fra Google Play.",
      manageWeb: "Abonnementer administreres via Google Play.",
      errors: {
        network: "Ingen forbindelse til Google Play. Tjek netværket og prøv igen.",
        notSupported: "Køb er endnu ikke tilgængelige i Android-appen.",
      },
    },
    legal: {
      terms: { p2: "Køb af en rapport giver adgang til den specifikke beregning. Premium giver ubegrænsede beregninger i abonnementsperioden. Køb håndteres af Google Play, og eventuel refusion følger Google Plays vilkår." },
      privacy: { p2: "Køb verificeres via Google Play. Vi modtager og gemmer aldrig betalingsoplysninger." },
    },
  },
  fi: {
    errors: {
      importFilesDenied: "Tiedostojen käyttö on estetty. Salli käyttö puhelimen asetuksissa valitaksesi asiakirjan.",
      importCameraDenied: "Kameran käyttö ei ole sallittu. Salli kamera puhelimen asetuksissa, jotta voit kuvata asiakirjan.",
      importPhotosDenied: "Kuvien käyttö ei ole sallittu. Salli käyttö puhelimen asetuksissa, jotta voit valita asiakirjan.",
    },
    paywall: {
      premium: { renewal: "{{price}}. Tilaus uusiutuu automaattisesti, ellei sitä peruta Google Playn ehtojen mukaisesti." },
      priceUnavailable: "Hinta haetaan Google Playsta.",
      manageWeb: "Tilauksia hallitaan Google Playn kautta.",
      errors: {
        network: "Ei yhteyttä Google Playhin. Tarkista verkkoyhteys ja yritä uudelleen.",
        notSupported: "Ostot eivät ole vielä käytettävissä Android-sovelluksessa.",
      },
    },
    legal: {
      terms: { p2: "Raportin ostaminen avaa kyseisen laskelman. Premium antaa rajattomat laskelmat tilausjakson ajan. Ostot käsittelee Google Play, ja mahdolliset palautukset noudattavat Google Playn ehtoja." },
      privacy: { p2: "Ostot vahvistetaan Google Playn kautta. Emme koskaan vastaanota tai tallenna maksutietoja." },
    },
  },
  de: {
    errors: {
      importFilesDenied: "Der Dateizugriff ist deaktiviert. Erlauben Sie den Zugriff in den Telefoneinstellungen, um ein Dokument zu wählen.",
      importCameraDenied: "Kein Kamerazugriff. Erlauben Sie die Kamera in den Telefoneinstellungen, um Unterlagen zu fotografieren.",
      importPhotosDenied: "Kein Zugriff auf Fotos. Erlauben Sie den Zugriff in den Telefoneinstellungen, um Unterlagen auszuwählen.",
    },
    paywall: {
      premium: { renewal: "{{price}}. Das Abonnement verlängert sich automatisch, sofern es nicht gemäß den Google-Play-Bedingungen gekündigt wird." },
      priceUnavailable: "Der Preis wird von Google Play abgerufen.",
      manageWeb: "Abonnements werden über Google Play verwaltet.",
      errors: {
        network: "Keine Verbindung zu Google Play. Prüfen Sie das Netzwerk und versuchen Sie es erneut.",
        notSupported: "Käufe sind in der Android-App noch nicht verfügbar.",
      },
    },
    legal: {
      terms: { p2: "Der Kauf eines Berichts schaltet die jeweilige Berechnung frei. Premium bietet unbegrenzte Berechnungen während der Abolaufzeit. Käufe werden von Google Play abgewickelt; Erstattungen richten sich nach den Google-Play-Bedingungen." },
      privacy: { p2: "Käufe werden über Google Play verifiziert. Wir erhalten oder speichern niemals Zahlungsdaten." },
    },
  },
};

/** Overlays the Android wording. No-op on iOS and web. */
export function applyPlatformCopy(i18n: I18n): void {
  if (!isAndroid()) return;
  for (const [lang, bundle] of Object.entries(ANDROID_OVERRIDES)) {
    i18n.addResourceBundle(lang, "translation", bundle, true, true);
  }
}
