/**
 * Shared layout for the in-app legal pages (Terms of use / Privacy policy).
 * Presentation only — the copy lives in the locale files.
 */
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useT } from "@/i18n";

export function LegalPage({ titleKey, bodyKeys }: { titleKey: string; bodyKeys: string[] }) {
  const t = useT();
  return (
    <div className="app-shell surface-sun max-w-md">
      <main className="pt-safe pb-safe flex-1 px-4 pb-4">
        <div className="flex items-center gap-3 pt-1">
          <Link
            to="/installningar"
            aria-label={t("common.back")}
            className="flex size-10 items-center justify-center rounded-full bg-foreground text-background"
          >
            <ArrowLeft className="size-4" strokeWidth={2.5} />
          </Link>
          <h1 className="ui-page-title">{t(titleKey)}</h1>
        </div>
        <section className="mt-3 space-y-2 rounded-[1rem] bg-card px-3 py-3">
          {bodyKeys.map((key) => (
            <p key={key} className="text-[12px] leading-relaxed text-muted-foreground">
              {t(key)}
            </p>
          ))}
        </section>
      </main>
    </div>
  );
}
