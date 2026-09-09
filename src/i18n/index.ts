/**
 * CENTRAL TRANSLATION LAYER.
 *
 * Language is a pure PRESENTATION state. It is stored separately from the wizard
 * state and can never change country, market area, currency, fuse, economy,
 * strategies, reserve routing, price data or any engine input/result.
 *
 * English is the fallback for every missing key.
 */

import i18next from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";

import { sv } from "./locales/sv";
import { en } from "./locales/en";
import { de } from "./locales/de";
import { da } from "./locales/da";
import { fi } from "./locales/fi";

export const SUPPORTED_LANGUAGES = ["sv", "en", "de", "da", "fi"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

/** Fallback used for any missing key, in any language. */
export const FALLBACK_LANGUAGE: Language = "en";
/** Language rendered before the browser preference is known (source language). */
export const DEFAULT_LANGUAGE: Language = "sv";

export const LANGUAGE_STORAGE_KEY = "mr-battery-doc:language";

export const LANGUAGE_NAMES: Record<Language, string> = {
  sv: "Svenska",
  en: "English",
  de: "Deutsch",
  da: "Dansk",
  fi: "Suomi",
};

/** Country flag emoji shown beside each language — presentation only. */
export const LANGUAGE_FLAGS: Record<Language, string> = {
  sv: "🇸🇪",
  en: "🇬🇧",
  de: "🇩🇪",
  da: "🇩🇰",
  fi: "🇫🇮",
};

/** Number locale — presentation only. Currency stays country-driven. */
const NUMBER_LOCALE: Record<Language, string> = {
  sv: "sv-SE",
  en: "en-GB",
  de: "de-DE",
  da: "da-DK",
  fi: "fi-FI",
};

export function isSupportedLanguage(v: unknown): v is Language {
  return typeof v === "string" && (SUPPORTED_LANGUAGES as readonly string[]).includes(v);
}

/** "de-AT" -> "de". Unknown languages fall back to English. */
export function normalizeLanguage(tag: string | null | undefined): Language | null {
  if (!tag) return null;
  const base = tag.toLowerCase().split(/[-_]/)[0] ?? "";
  return isSupportedLanguage(base) ? base : null;
}

/**
 * Stored choice > browser preference > English.
 * Never reads or writes anything but the language key.
 */
export function resolveInitialLanguage(): Language {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const normalizedStored = normalizeLanguage(stored);
    if (normalizedStored) return normalizedStored;
  } catch {
    /* storage unavailable */
  }
  const candidates = [
    ...(navigator.languages ?? []),
    navigator.language,
  ].filter(Boolean) as string[];
  for (const c of candidates) {
    const n = normalizeLanguage(c);
    if (n) return n;
  }
  return FALLBACK_LANGUAGE;
}

if (!i18next.isInitialized) {
  void i18next.use(initReactI18next).init({
    resources: {
      sv: { translation: sv },
      en: { translation: en },
      de: { translation: de },
      da: { translation: da },
      fi: { translation: fi },
    },
    lng: DEFAULT_LANGUAGE,
    fallbackLng: FALLBACK_LANGUAGE,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

export const i18n = i18next;

/** Current language, always one of the supported ones. */
export function currentLanguage(): Language {
  return isSupportedLanguage(i18next.resolvedLanguage)
    ? i18next.resolvedLanguage
    : FALLBACK_LANGUAGE;
}

export function numberLocale(lang: Language = currentLanguage()): string {
  return NUMBER_LOCALE[lang];
}

/** Plain-number formatting in the UI language. Money keeps the country locale. */
export function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString(numberLocale(), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/**
 * Translate outside React (pure copy modules). Components should use `useT()` so
 * they re-render on a language change.
 */
export function t(key: string, params?: Record<string, string | number>): string {
  return i18next.t(key, params ?? {}) as string;
}

/** React hook: subscribes the component to language changes. */
export function useT() {
  const { t: translate } = useTranslation();
  return translate as (key: string, params?: Record<string, string | number>) => string;
}
