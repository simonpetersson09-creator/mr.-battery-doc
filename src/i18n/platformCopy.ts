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

export const ANDROID_OVERRIDES: Record<"sv" | "en" | "da" | "fi" | "de" | "fr" | "nl" | "cs" | "sl", Overrides> = {
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
  fr: {
    "errors": {
      "importFilesDenied": "L'accès aux fichiers est désactivé. Autorisez-le dans les paramètres pour choisir un document.",
      "importCameraDenied": "L'accès à l'appareil photo est désactivé. Autorisez-le dans les paramètres pour photographier un document.",
      "importPhotosDenied": "L'accès aux photos est désactivé. Autorisez-le dans les paramètres pour choisir un document."
    },
    "paywall": {
      "premium": {
        "renewal": "{{price}}. L'abonnement se renouvelle automatiquement sauf annulation selon les conditions de Google Play."
      },
      "priceUnavailable": "Le prix provient de Google Play.",
      "manageWeb": "Les abonnements sont gérés via Google Play.",
      "errors": {
        "network": "Aucune connexion à Google Play. Vérifiez votre réseau et réessayez.",
        "notSupported": "Les achats ne sont pas encore disponibles dans l'application Android."
      }
    },
    "legal": {
      "terms": {
        "p2": "L'achat d'un rapport déverrouille ce calcul spécifique. Premium offre des calculs illimités pendant la période d'abonnement. Les achats sont gérés par Google Play et tout remboursement est soumis aux conditions de Google Play."
      },
      "privacy": {
        "p2": "Les achats sont vérifiés via Google Play. Nous ne recevons ni ne stockons jamais les détails de paiement."
      }
    }
  },
  nl: {
    "errors": {
      "importFilesDenied": "Toegang tot bestanden is uitgeschakeld. Sta toegang toe in je telefooninstellingen om een document te kiezen.",
      "importCameraDenied": "Toegang tot de camera is uitgeschakeld. Sta cameratoegang toe in je telefooninstellingen om een document te fotograferen.",
      "importPhotosDenied": "Toegang tot foto's is uitgeschakeld. Sta toegang toe in je telefooninstellingen om een document te kiezen."
    },
    "paywall": {
      "premium": {
        "renewal": "{{price}}. Het abonnement wordt automatisch verlengd, tenzij je het opzegt volgens de voorwaarden van Google Play."
      },
      "priceUnavailable": "Prijs komt van Google Play.",
      "manageWeb": "Abonnementen worden beheerd via Google Play.",
      "errors": {
        "network": "Geen verbinding met Google Play. Controleer je netwerk en probeer het opnieuw.",
        "notSupported": "Aankopen zijn nog niet beschikbaar in de Android-app."
      }
    },
    "legal": {
      "terms": {
        "p2": "Een rapport kopen ontgrendelt die specifieke berekening. Premium geeft onbeperkte berekeningen tijdens de abonnementsperiode. Aankopen worden afgehandeld door Google Play en elke terugbetaling volgt de voorwaarden van Google Play."
      },
      "privacy": {
        "p2": "Aankopen worden geverifieerd via Google Play. We ontvangen of bewaren nooit betalingsgegevens."
      }
    }
  },
  cs: {
    "errors": {
      "importFilesDenied": "Přístup k souborům je vypnutý. Pro výběr dokumentu povolte přístup v nastavení telefonu.",
      "importCameraDenied": "Přístup k fotoaparátu je vypnutý. Pro vyfocení dokumentu povolte přístup v nastavení telefonu.",
      "importPhotosDenied": "Přístup k fotkám je vypnutý. Pro výběr dokumentu povolte přístup v nastavení telefonu."
    },
    "paywall": {
      "premium": {
        "renewal": "{{price}}. Předplatné se automaticky obnovuje, pokud jej nezrušíte v souladu s podmínkami Google Play."
      },
      "priceUnavailable": "Cena pochází z Google Play.",
      "manageWeb": "Předplatné se spravuje přes Google Play.",
      "errors": {
        "network": "Nelze se připojit k Google Play. Zkontrolujte síť a zkuste to znovu.",
        "notSupported": "Nákupy zatím nejsou v aplikaci pro Android dostupné."
      }
    },
    "legal": {
      "terms": {
        "p2": "Zakoupení reportu odemkne daný výpočet. Premium umožňuje neomezený počet výpočtů po dobu trvání předplatného. Nákupy zpracovává Google Play a případné vrácení peněz se řídí podmínkami Google Play."
      },
      "privacy": {
        "p2": "Nákupy jsou ověřovány přes Google Play. Nikdy nepřijímáme ani neukládáme platební údaje."
      }
    }
  },
  sl: {
    "errors": {
      "importFilesDenied": "Dostop do datotek je izklopljen. Dovolite dostop v nastavitvah telefona, da izberete dokument.",
      "importCameraDenied": "Dostop do kamere je izklopljen. V nastavitvah telefona omogočite kamero, da fotografirate dokument.",
      "importPhotosDenied": "Dostop do fotografij je izklopljen. Dovolite dostop v nastavitvah telefona, da izberete dokument."
    },
    "paywall": {
      "premium": {
        "renewal": "{{price}}. Naročnina se samodejno obnavlja, razen če jo prekličete v skladu s pogoji storitve Google Play."
      },
      "priceUnavailable": "Cena je pridobljena iz storitve Google Play.",
      "manageWeb": "Naročnine se upravljajo prek storitve Google Play.",
      "errors": {
        "network": "Ni povezave s storitvijo Google Play. Preverite omrežje in poskusite znova.",
        "notSupported": "Nakupi v aplikaciji za Android še niso na voljo."
      }
    },
    "legal": {
      "terms": {
        "p2": "Z nakupom poročila odklenete dotičen izračun. Premium omogoča neomejeno število izračunov v času trajanja naročnine. Nakupe obdeluje Google Play in morebitna vračila so v skladu s pogoji storitve Google Play."
      },
      "privacy": {
        "p2": "Nakupi se preverjajo prek storitve Google Play. Nikoli ne prejmemo ali shranjujemo podatkov o plačilu."
      }
    }
  },
};

/** Overlays the Android wording. No-op on iOS and web. */
export function applyPlatformCopy(i18n: I18n): void {
  if (!isAndroid()) return;
  for (const [lang, bundle] of Object.entries(ANDROID_OVERRIDES)) {
    i18n.addResourceBundle(lang, "translation", bundle, true, true);
  }
}
