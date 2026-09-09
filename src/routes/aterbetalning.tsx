import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { WizardShell } from "@/components/wizard/WizardShell";
import { SectionCard } from "@/components/wizard/fields";
import { Slider } from "@/components/ui/slider";
import { runBatteryApp } from "@/lib/battery-app";
import {
  clampTargetPaybackYears,
  customerEconomyFromResult,
  MAX_TARGET_PAYBACK_YEARS,
  MIN_TARGET_PAYBACK_YEARS,
  maxInvestmentSek,
} from "@/lib/battery-app/customerEconomy";
import { validatePaybackStep } from "@/lib/battery-app/stepValidation";
import { formatMoney } from "@/lib/country-config";
import { formatNumber, useT } from "@/i18n";
import { useWizard } from "@/state/wizard";

export const Route = createFileRoute("/aterbetalning")({
  head: () => ({
    meta: [
      { title: "Önskad återbetalningstid — Mr. Battery Doc" },
      {
        name: "description",
        content:
          "Välj hur snabbt batteriet ska betala sig och se en rimlig investeringskostnad.",
      },
      { property: "og:title", content: "Önskad återbetalningstid — Mr. Battery Doc" },
      {
        property: "og:description",
        content: "Beräknad årlig kundnytta omsatt till en rimlig investeringsnivå.",
      },
    ],
  }),
  component: PaybackStep,
});

function PaybackStep() {
  const t = useT();
  const { state, update } = useWizard();
  const years = state.preferences.targetPaybackYears;
  const validity = validatePaybackStep(state);

  /* Same single integration point as the result page — no separate economy model. */
  const outcome = useMemo(() => runBatteryApp(state), [state]);
  const economy =
    outcome.status === "ok"
      ? customerEconomyFromResult(outcome.result, state.preferences.customerAncillaryShare)
      : null;
  const benefit = economy?.totalCustomerBenefitSek ?? null;
  const budget = maxInvestmentSek(benefit, years);
  const money = (v: number) => formatMoney(v, state.grid.country, 0);

  return (
    <WizardShell
      stepIndex={5}
      title={t("payback.title")}
      intro={t("payback.intro")}
      nextDisabled={!validity.ok}
      nextBlockedReason={validity.message}
    >
      <SectionCard title={t("payback.card")}>
        <p className="ui-hero text-[2rem] tabular-nums">
          {t("payback.years", { years: formatNumber(years, 0) })}
        </p>
        <Slider
          className="mt-3"
          value={[years]}
          min={MIN_TARGET_PAYBACK_YEARS}
          max={MAX_TARGET_PAYBACK_YEARS}
          step={1}
          aria-label={t("payback.card")}
          onValueChange={(v) =>
            update((s) => ({
              ...s,
              preferences: {
                ...s.preferences,
                targetPaybackYears: clampTargetPaybackYears(v[0]),
              },
            }))
          }
        />
        <div className="ui-help mt-1 flex justify-between tabular-nums">
          <span>{t("payback.years", { years: formatNumber(MIN_TARGET_PAYBACK_YEARS, 0) })}</span>
          <span>{t("payback.years", { years: formatNumber(MAX_TARGET_PAYBACK_YEARS, 0) })}</span>
        </div>
      </SectionCard>

      <SectionCard title={t("payback.investment.title")}>
        {budget === null ? (
          <p className="ui-help">{t("payback.investment.none")}</p>
        ) : (
          <>
            <p className="ui-hero text-[2rem] tabular-nums">{money(budget)}</p>
            <div className="ui-body mt-2 flex items-baseline justify-between gap-4">
              <span className="text-muted-foreground">{t("payback.investment.benefit")}</span>
              <span className="font-semibold tabular-nums">
                {money(benefit ?? 0)}
                {t("units.perYear")}
              </span>
            </div>
            <p className="ui-help mt-2">{t("payback.investment.hint")}</p>
            {economy?.ancillaryEnabled ? (
              <p className="ui-help mt-1">
                {t("payback.investment.note", {
                  share: formatNumber(economy.customerAncillaryShare * 100, 0),
                })}
              </p>
            ) : null}
          </>
        )}
      </SectionCard>
    </WizardShell>
  );
}
