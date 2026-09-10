import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCalculation } from "@/lib/access/calculationCache";
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
import { validateEconomyStep, validatePaybackStep } from "@/lib/battery-app/stepValidation";
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
  const country = getCountry(state.grid.country);
  /* CURRENCY STAYS COUNTRY-DRIVEN — the UI language never changes it. */
  const unit = country.economy.currencyLabel;
  const years = state.preferences.targetPaybackYears;
  /* Slider range is 60–100 %; clamp older stored values into the range for display. */
  const sharePct = Math.min(100, Math.max(60, Math.round(state.preferences.customerAncillaryShare * 100)));

  const setEconomy = (patch: Partial<typeof state.economy>) =>
    update((s) => ({ ...s, economy: { ...s.economy, ...patch, touched: true } }));
  const economyValidity = validateEconomyStep(state);
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
          disabled={!validity.ok}
          aria-disabled={!validity.ok}
          onClick={() => {
            if (!validity.ok) return;
            const calc = getCalculation(state);
            void navigate({
              to: destinationAfterStep5({
                calculationStatus: calc.outcome.status,
                entitlements: access.entitlements,
                calculationId: calc.id,
              }),
            });
          }}
        >
          {t("common.next")}
          <ArrowRight className="size-4" />
        </Button>
      }
    >
      <SectionCard
        compact
        icon={<Coins className="size-4" />}
        title={t("economics.prices.title")}
        description={t("economics.prices.description")}
      >
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            dense
            compact
            label={t("economics.importPrice.label")}
            unit={t("units.perKwh", { currency: unit })}
            step="0.01"
            value={state.economy.importPrice}
            hint={t("economics.importPrice.hint")}
            onChange={(v) => setEconomy({ importPrice: v ?? 0 })}
          />
          <NumberField
            dense
            compact
            label={t("economics.exportPrice.label")}
            unit={t("units.perKwh", { currency: unit })}
            step="0.01"
            value={state.economy.exportPrice}
            hint={t("economics.exportPrice.hint")}
            onChange={(v) => setEconomy({ exportPrice: v ?? 0 })}
          />
        </div>
        <NumberField
          dense
          compact
          label={t("economics.demandCharge.label")}
          unit={t("units.perKwMonth", { currency: unit })}
          step="1"
          value={state.economy.demandCharge}
          hint={demandChargeHint(state.economy.demandCharge)}
          onChange={(v) => setEconomy({ demandCharge: v ?? 0, demandChargeTouched: true })}
        />
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
      </SectionCard>
    </WizardShell>
  );
}
