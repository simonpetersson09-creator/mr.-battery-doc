import { createFileRoute } from "@tanstack/react-router";
import { WizardShell } from "@/components/wizard/WizardShell";
import { NumberField, SectionCard } from "@/components/wizard/fields";
import { getCountry } from "@/lib/country-config";
import { demandChargeHint } from "@/lib/battery-app/economyCopy";
import { validateEconomyStep } from "@/lib/battery-app/stepValidation";
import { useWizard } from "@/state/wizard";
import { useT } from "@/i18n";
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
  const country = getCountry(state.grid.country);
  /* CURRENCY STAYS COUNTRY-DRIVEN — the UI language never changes it. */
  const unit = country.economy.currencyLabel;

  const setEconomy = (patch: Partial<typeof state.economy>) =>
    update((s) => ({ ...s, economy: { ...s.economy, ...patch, touched: true } }));
  const validity = validateEconomyStep(state);

  return (
    <WizardShell
      stepIndex={4}
      title={t("economics.title")}
      intro={t("economics.intro", { country: countryName(state.grid.country) })}
      nextDisabled={!validity.ok}
      nextBlockedReason={validity.message}
    >
      <SectionCard
        title={t("economics.prices.title")}
        description={t("economics.prices.description")}
      >
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            dense
            label={t("economics.importPrice.label")}
            unit={t("units.perKwh", { currency: unit })}
            step="0.01"
            value={state.economy.importPrice}
            hint={t("economics.importPrice.hint")}
            onChange={(v) => setEconomy({ importPrice: v ?? 0 })}
          />
          <NumberField
            dense
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
          title={t("economics.customerShare.title")}
          description={t("economics.customerShare.description")}
        >
          <NumberField
            dense
            label={t("economics.customerShare.label")}
            unit="%"
            step="1"
            value={Math.round(state.preferences.customerAncillaryShare * 100)}
            hint={t("economics.customerShare.hint")}
            onChange={(v) =>
              update((s) => ({
                ...s,
                preferences: {
                  ...s.preferences,
                  customerAncillaryShare: Math.min(1, Math.max(0, (v ?? 0) / 100)),
                },
              }))
            }
          />
        </SectionCard>
      ) : null}

    </WizardShell>
  );
}
