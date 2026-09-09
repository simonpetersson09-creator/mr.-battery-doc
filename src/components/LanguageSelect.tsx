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
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES, type Language } from "@/i18n";
import { useLanguage } from "@/i18n/LanguageProvider";

export function LanguageSelect() {
  const { language, setLanguage } = useLanguage();
  return (
    <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
      <SelectTrigger
        aria-label={LANGUAGE_NAMES[language]}
        className="size-12 shrink-0 justify-center rounded-full border-input bg-secondary px-0 font-bold text-foreground shadow-sm [&_svg]:hidden"
      >
        <SelectValue>{language.toUpperCase()}</SelectValue>
      </SelectTrigger>
      <SelectContent side="top" align="center" className="min-w-[9rem]">
        {SUPPORTED_LANGUAGES.map((l) => (
          <SelectItem key={l} value={l}>
            {LANGUAGE_NAMES[l]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
