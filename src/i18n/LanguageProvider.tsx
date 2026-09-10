/**
 * Language state — deliberately SEPARATE from the wizard state.
 *
 * Nothing here touches country, market area, currency, fuse, economy, strategies or
 * any engine input. Old persisted wizard states (which never had a language field)
 * keep working untouched: the language lives under its own storage key.
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

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);

  // Stored choice / browser preference is applied after hydration, so server and
  // client render the same markup on the first pass.
  useEffect(() => {
    const initial = resolveInitialLanguage();
    setLanguageState(initial);
    void i18n.changeLanguage(initial);
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: (lang) => {
        setLanguageState(lang);
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
