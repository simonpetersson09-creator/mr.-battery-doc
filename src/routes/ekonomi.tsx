import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { getCalculation, getDerivedAnalyses } from "@/lib/access/calculationCache";
import { destinationAfterStep5 } from "@/lib/access/flow";
import { useAccess } from "@/state/access";
import { Coins, HandCoins, Timer } from "lucide-react";
import { WizardShell } from "@/components/wizard/WizardShell";
import { NumberField, SectionCard } from "@/components/wizard/fields";
import { Slider } from "@/components/ui/slider";
import { getCountry } from "@/lib/country-config";
import { demandChargeHint } from "@/lib/battery-app/economyCopy";
import {
  clampTargetPaybackYears,
  MAX_TARGET_PAYBACK_YEARS,
  MIN_TARGET_PAYBACK_YEARS,
} from "@/lib/battery-app/customerEconomy";
import {
  economyFieldErrors,
  validateEconomyStep,
  validatePaybackStep,
} from "@/lib/battery-app/stepValidation";
import { useWizard } from "@/state/wizard";
import { formatNumber, useT } from "@/i18n";
import { countryName } from "@/i18n/labels";

export const Route = createFileRoute("/ekonomi")({
  head: () => ({
    meta: [
      { title: "Elpriser och effektavgift — Mr. Battery Doc" },
      {
        name: "description",
        content:
          "Standardvärden hämtas från valt land. Justera köpt el, såld solel och effektavgift.",
      },
      { property: "og:title", content: "Elpriser och effektavgift — Mr. Battery Doc" },
      {
        property: "og:description",
        content: "Värdet av att använda solelen själv räknas ut automatiskt.",
      },
    ],
  }),
  component: EconomyStep,
});

function EconomyStep() {
  const t = useT();
  const { state, update } = useWizard();
  const navigate = useNavigate();
  const access = useAccess();
  /** Visible feedback while the (synchronous) simulation runs. Presentation only. */
  const [calculating, setCalculating] = useState(false);
  const country = getCountry(state.grid.country);
  /* CURRENCY STAYS COUNTRY-DRIVEN — the UI language never changes it. */
  const unit = country.economy.currencyLabel;
  const years = state.preferences.targetPaybackYears;
  /* Slider range is 60–100 %; clamp older stored values into the range for display. */
  const sharePct = Math.min(100, Math.max(60, Math.round(state.preferences.customerAncillaryShare * 100)));
  /* Without PV the energy/peak uses are off, so the price fields do not apply — shown but locked. */
  const noSolar = state.production.mode === "none";
  const lockedBadge = t("common.locked");

  const setEconomy = (patch: Partial<typeof state.economy>) =>
    update((s) => ({ ...s, economy: { ...s.economy, ...patch, touched: true } }));
  const economyValidity = validateEconomyStep(state);
  const fieldError = economyFieldErrors(state);
  const paybackValidity = validatePaybackStep(state);
  const validity = economyValidity.ok ? paybackValidity : economyValidity;

  return (
    <WizardShell
      compact
      stepIndex={4}
      title={t("economics.title")}
      intro={t("economics.intro", { country: countryName(state.grid.country) })}
      nextDisabled={!validity.ok}
      nextBlockedReason={validity.message}
      footerAction={
        /*
          STEP 5 -> CALCULATION -> PAYWALL/RESULT.
          The simulation runs here, once. Premium goes straight to the result;
          everyone else sees the paywall. The result itself is untouched.
        */
        <Button
          variant="cta"
          className="h-10 flex-[2] rounded-[0.75rem] text-[15px] font-bold shadow-cta"
          disabled={!validity.ok || calculating}
          aria-disabled={!validity.ok || calculating}
          aria-busy={calculating}
          onClick={() => {
            if (!validity.ok || calculating) return;
            // The simulation blocks the main thread for seconds on a phone. Painting
            // the "calculating" label BEFORE it starts is the whole point of the
            // deferral — the inputs, the engine and the flow rule are unchanged.
            setCalculating(true);
            const run = () => {
              try {
                const calc = getCalculation(state);
                // Same comparison layers the result page shows — computed here so the
                // result page renders immediately instead of freezing on arrival.
                getDerivedAnalyses(state);
                const dest = destinationAfterStep5({
                  calculationStatus: calc.outcome.status,
                  entitlements: access.entitlements,
                  calculationId: calc.id,
                });
                // Adjustment-credit path: an otherwise locked "ok" calculation that
                // the flow rule let through because credits remain. Spend exactly
                // one credit and unlock this calculation before navigating.
                if (
                  dest === "/resultat" &&
                  calc.outcome.status === "ok" &&
                  !access.canOpenResult(calc.id)
                ) {
                  access.consumeAdjustment(calc.id);
                }
                void navigate({ to: dest });
              } finally {
                setCalculating(false);
              }
            };
            requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(run, 0)));
          }}
        >
          {calculating ? (
            <span className="animate-pulse motion-reduce:animate-none">{t("common.calculating")}</span>
          ) : (
            t("common.showResult")
          )}
          <ArrowRight className="size-4" />
        </Button>
      }
    >
      <SectionCard
        compact
        icon={<Coins className="size-4" />}
        title={t("economics.prices.title")}
        action={
          noSolar ? (
            <span className="rounded-full bg-secondary px-2 py-0.5 ui-control-text-sm font-semibold text-muted-foreground">
              {lockedBadge}
            </span>
          ) : undefined
        }
        description={
          noSolar
            ? t("economics.prices.lockedNote")
            : t("economics.prices.description")
        }
      >
        {(() => {
          const priceFields = (
            <>
              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  dense
                  compact
                  disabled={noSolar}
                  label={t("economics.importPrice.label")}
                  unit={t("units.perKwh", { currency: unit })}
                  step="0.01"
                  value={state.economy.importPrice}
                  hint={t("economics.importPrice.hint")}
                  error={fieldError.importPrice}
                  onChange={(v) => setEconomy({ importPrice: v ?? 0 })}
                />
                <NumberField
                  dense
                  compact
                  disabled={noSolar}
                  label={t("economics.exportPrice.label")}
                  unit={t("units.perKwh", { currency: unit })}
                  step="0.01"
                  value={state.economy.exportPrice}
                  hint={t("economics.exportPrice.hint")}
                  error={fieldError.exportPrice}
                  onChange={(v) => setEconomy({ exportPrice: v ?? 0 })}
                />
              </div>
              <NumberField
                dense
                compact
                disabled={noSolar}
                label={t("economics.demandCharge.label")}
                unit={t("units.perKwMonth", { currency: unit })}
                step="1"
                value={state.economy.demandCharge}
                hint={demandChargeHint(state.economy.demandCharge)}
                error={fieldError.demandCharge}
                onChange={(v) => setEconomy({ demandCharge: v ?? 0, demandChargeTouched: true })}
              />
            </>
          );
          /* Locked (no solar): the card stays minimized — fields behind a closed toggle. */
          return noSolar ? (
            <details className="ui-expandable rounded-[0.75rem] border border-foreground/10 p-2">
              <summary className="text-[12px] font-semibold">
                {t("economics.prices.showFields")}
              </summary>
              <div className="mt-2 space-y-2">{priceFields}</div>
            </details>
          ) : (
            priceFields
          );
        })()}
      </SectionCard>

      {/*
        CUSTOMER SHARE OF THE ANCILLARY VALUE.
        Presentation-layer assumption only: the engine keeps computing the full historical
        market value and keeps sizing on it. The share is applied afterwards, when the
        customer-facing benefit is shown.
      */}
      {state.strategies.fcrDUp ? (
        <SectionCard
          compact
          icon={<HandCoins className="size-4" />}
          title={t("economics.customerShare.title")}
          description={t("economics.customerShare.description")}
        >
          <p className="text-[1.125rem] font-extrabold leading-none tracking-[-0.03em] tabular-nums">
            {formatNumber(sharePct, 0)} %
          </p>
          <Slider
            className="mt-2"
            value={[sharePct]}
            min={60}
            max={100}
            step={1}
            aria-label={t("economics.customerShare.label")}
            onValueChange={(v) =>
              update((s) => ({
                ...s,
                preferences: {
                  ...s.preferences,
                  customerAncillaryShare: (v[0] ?? sharePct) / 100,
                },
              }))
            }
          />
          <div className="ui-help mt-1 flex justify-between tabular-nums">
            <span>60 %</span>
            <span>100 %</span>
          </div>
          <p className="ui-help mt-1">{t("economics.customerShare.hint")}</p>
        </SectionCard>
      ) : null}

      {/* Desired payback horizon — presentation preference, no engine input. */}
      <SectionCard compact icon={<Timer className="size-4" />} title={t("payback.card")}>
        <p className="text-[1.125rem] font-extrabold leading-none tracking-[-0.03em] tabular-nums">
          {t("payback.years", { years: formatNumber(years, 0) })}
        </p>
        <Slider
          className="mt-2"
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
        <p className="ui-help mt-1.5 text-pretty">{t("payback.guide")}</p>
      </SectionCard>
    </WizardShell>
  );
}
