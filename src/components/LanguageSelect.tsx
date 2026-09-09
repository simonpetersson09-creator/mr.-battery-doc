/**
 * Compact round language switcher — presentation only.
 * Opens upward so it stays usable at the bottom of a page.
 * Never touches country, market, currency or any engine state.
 */
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LANGUAGE_FLAGS,
  LANGUAGE_NAMES,
  SUPPORTED_LANGUAGES,
  type Language,
} from "@/i18n";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useWizard } from "@/state/wizard";
import type { CountryCode } from "@/lib/country-config";

/**
 * One-way suggestion: picking a language pre-selects the matching country on step 1,
 * but ONLY while the user hasn't chosen a country themselves. Changing the country
 * never changes the language.
 */
const LANGUAGE_COUNTRY: Partial<Record<Language, CountryCode>> = {
  sv: "SE",
  de: "DE",
  da: "DK",
  fi: "FI",
};

export function LanguageSelect() {
  const { language, setLanguage } = useLanguage();
  const { suggestCountry } = useWizard();
  const onChange = (v: string) => {
    const next = v as Language;
    setLanguage(next);
    const country = LANGUAGE_COUNTRY[next];
    if (country) suggestCountry(country);
  };
  return (
    <Select value={language} onValueChange={onChange}>
      <SelectTrigger
        aria-label={LANGUAGE_NAMES[language]}
        className="size-12 shrink-0 justify-center rounded-full border-input bg-accent px-0 text-lg leading-none text-accent-foreground shadow-sm [&_svg]:hidden"
      >
        <SelectValue>
          <span aria-hidden>{LANGUAGE_FLAGS[language]}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent side="top" align="center" className="min-w-[10rem]">
        {SUPPORTED_LANGUAGES.map((l) => (
          <SelectItem key={l} value={l}>
            <span className="mr-2 text-base leading-none" aria-hidden>
              {LANGUAGE_FLAGS[l]}
            </span>
            {LANGUAGE_NAMES[l]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
