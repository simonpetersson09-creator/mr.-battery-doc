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

export function LanguageSelect({ pill = false }: { pill?: boolean }) {
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
        className={
          /* line-clamp-none: the shared trigger clamps its value span, which turns the
             flag + name row into a truncated box with an ellipsis between them. */
          pill
            ? "lang-trigger h-9 w-auto shrink-0 gap-1.5 rounded-full border border-border bg-card px-3 text-[13px] font-semibold shadow-sm [&>span]:line-clamp-none [&>span]:overflow-visible"
            : "lang-trigger cta-primary h-12 w-12 shrink-0 justify-center rounded-[0.875rem] px-0 text-lg leading-none [&_svg]:hidden [&>span]:line-clamp-none [&>span]:overflow-visible"
        }
      >
        <SelectValue>
          <span className="flex items-center gap-1.5">
            <span aria-hidden>{LANGUAGE_FLAGS[language]}</span>
            {pill ? <span>{LANGUAGE_NAMES[language]}</span> : null}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent side={pill ? "bottom" : "top"} align="center" className="min-w-[10rem]">
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
