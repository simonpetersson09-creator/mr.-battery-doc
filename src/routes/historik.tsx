/**
 * HISTORY — previously purchased calculations.
 *
 * The list is the join of two independent sources:
 *  - the verified purchase right (entitlements / StoreKit),
 *  - the immutable local snapshot of the result.
 *
 * Opening an entry never runs the engine and never triggers a payment.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BatteryCharging, ChevronRight, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { useT, currentLanguage, formatNumber } from "@/i18n";
import { formatMoney } from "@/lib/country-config";
import { buildHistoryEntries } from "@/lib/history/verification";
import { listSnapshots } from "@/lib/history/store";
import { useAccess } from "@/state/access";
import { useWizard } from "@/state/wizard";
import { clearCalculationCache } from "@/lib/access/calculationCache";

export const Route = createFileRoute("/historik")({
  head: () => ({
    meta: [
      { title: "Historik — Mr. Battery Doc" },
      { name: "description", content: "Dina tidigare köpta batteriberäkningar." },
      { property: "og:title", content: "Historik — Mr. Battery Doc" },
      { property: "og:description", content: "Öppna en tidigare batteriberäkning igen." },
    ],
  }),
  component: HistoryPage,
});

const LOCALES: Record<string, string> = {
  sv: "sv-SE",
  en: "en-GB",
  de: "de-DE",
  da: "da-DK",
  fi: "fi-FI",
};

function formatDate(iso: string): string {
  const locale = LOCALES[currentLanguage()] ?? "en-GB";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(d);
}

function HistoryPage() {
  const t = useT();
  const access = useAccess();
  const navigate = useNavigate();
  const { update } = useWizard();
  /* Reading storage once per mount keeps the list stable while it is open. */
  const [snapshots] = useState(() => listSnapshots());
  const entries = useMemo(
    () => buildHistoryEntries(snapshots, access.entitlements),
    [snapshots, access.entitlements],
  );

  return (
    <div className="app-shell surface-sun max-w-md">
      <main className="pt-safe pb-safe flex-1 px-4">
        <div className="flex items-center gap-3 pt-1">
          <Link
            to="/installningar"
            aria-label={t("common.back")}
            className="flex size-10 items-center justify-center rounded-full bg-foreground text-background"
          >
            <ArrowLeft className="size-4" strokeWidth={2.5} />
          </Link>
          <h1 className="ui-page-title">{t("history.title")}</h1>
        </div>

        <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
          {t("history.subtitle")}
        </p>

        {entries.length === 0 ? (
          <section className="mt-4 rounded-[1.25rem] border border-border bg-card px-4 py-6 text-center">
            <BatteryCharging className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-2 text-[14px] font-semibold">{t("history.empty.title")}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              {t("history.empty.text")}
            </p>
          </section>
        ) : (
          <div className="mt-4 space-y-2">
            {entries.map((entry) => {
              const h = entry.snapshot.headline;
              const country = entry.snapshot.country;
              return (
                <section
                  key={entry.calculationId}
                  className="rounded-[1.25rem] border border-border bg-card px-3 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                      <BatteryCharging className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold">
                        {t("history.itemTitle")}
                      </p>
                      <p className="text-[12px] text-muted-foreground">
                        {formatDate(entry.createdISO)} · {formatNumber(h.capacityKWh, 0)} kWh ·{" "}
                        {formatNumber(h.powerKw, 1)} kW
                      </p>
                    </div>
                  </div>

                  <p className="mt-2 text-[12px] font-medium">
                    {t("history.benefit", {
                      value:
                        h.annualCustomerBenefit === null
                          ? "—"
                          : `${formatMoney(h.annualCustomerBenefit, country, 0)}${t("units.perYear")}`,
                    })}
                  </p>

                  <div className="mt-2.5 flex gap-2">
                    <button
                      type="button"
                      disabled={!entry.openable}
                      className="flex h-9 flex-[2] items-center justify-center gap-1 rounded-[0.75rem] bg-foreground px-3 text-[13px] font-semibold text-background disabled:opacity-50"
                      onClick={() =>
                        void navigate({ to: "/resultat", search: { calc: entry.calculationId } })
                      }
                    >
                      {t("history.open")}
                      <ChevronRight className="size-4" />
                    </button>
                    <button
                      type="button"
                      className="flex h-9 flex-1 items-center justify-center gap-1 rounded-[0.75rem] border border-border px-3 text-[13px] font-semibold"
                      onClick={() => {
                        /* Wizard inputs are restored from the snapshot; the old
                           result stays untouched in the history. */
                        clearCalculationCache();
                        update(() => entry.snapshot.wizard);
                        void navigate({ to: "/nat" });
                      }}
                    >
                      <Pencil className="size-3.5" />
                      {t("history.edit")}
                    </button>
                  </div>

                  {entry.openable ? null : (
                    <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                      {t("history.notVerified")}
                    </p>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
