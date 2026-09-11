/**
 * Language state — deliberately SEPARATE from the wizard state.
 *
 * Nothing here touches country, market area, currency, fuse, economy, strategies or
 * any engine input. Old persisted wizard states (which never had a language field)
 * keep working untouched: the language lives under its own storage key.
 *
 * INITIALIZATION: the stored choice / system language is resolved before any
 * localized UI is rendered. Server and the first client render both output the same
 * neutral, text-free shell, so hydration matches exactly and no wrong-language text
 * can ever flash. The localized tree mounts once the language is known.
 */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  i18n,
  resolveInitialLanguage,
  type Language,
} from "./index";

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

/** Keeps <html lang> in sync — presentation only. */
function applyDocumentLanguage(lang: Language) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lang;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // `null` = not resolved yet. Identical on the server and in the first client
  // render, which is what keeps hydration free of mismatches.
  const [language, setLanguageState] = useState<Language | null>(null);

  useEffect(() => {
    let cancelled = false;
    const initial = resolveInitialLanguage();
    const apply = () => {
      if (cancelled) return;
      applyDocumentLanguage(initial);
      setLanguageState(initial);
    };
    if (i18n.resolvedLanguage === initial) apply();
    else void i18n.changeLanguage(initial).then(apply, apply);
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language: language ?? DEFAULT_LANGUAGE,
      setLanguage: (lang) => {
        setLanguageState(lang);
        applyDocumentLanguage(lang);
        void i18n.changeLanguage(lang);
        try {
          window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
        } catch {
          /* storage unavailable */
        }
      },
    }),
    [language],
  );

  // Neutral, text-free shell for the one frame before the language is known.
  if (language === null) {
    return <div className="app-shell surface-sun" aria-busy="true" aria-hidden="true" />;
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/**
 * Language access. The provider always wraps the app, but a component rendered
 * outside it (an error boundary, a hot-reload edge case) must never crash the whole
 * native app — it falls back to the current i18n language instead.
 */
export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (ctx) return ctx;
  return {
    language: (i18n.language as Language) || DEFAULT_LANGUAGE,
    setLanguage: (lang) => {
      void i18n.changeLanguage(lang);
    },
  };
}
