import { createFileRoute } from "@tanstack/react-router";
import { WizardShell } from "@/components/wizard/WizardShell";
import { NumberField, SectionCard } from "@/components/wizard/fields";
import { getCountry } from "@/lib/country-config";
import { demandChargeHint } from "@/lib/battery-app/economyCopy";
import { validateEconomyStep } from "@/lib/battery-app/stepValidation";
import { useWizard } from "@/state/wizard";

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
  const { state, update } = useWizard();
  const country = getCountry(state.grid.country);
  const unit = country.economy.currencyLabel;
  

  const setEconomy = (patch: Partial<typeof state.economy>) =>
    update((s) => ({ ...s, economy: { ...s.economy, ...patch, touched: true } }));
  const validity = validateEconomyStep(state);

  return (
    <WizardShell
      stepIndex={4}
      title="Ekonomi"
      intro={`Standardvärden för ${country.name}. Ändra om du vill.`}
      nextDisabled={!validity.ok}
      nextBlockedReason={validity.message}
    >
      <SectionCard
        title="Elpriser"
        description="Schablonvärden för att jämföra olika batterilösningar. Se din faktiska elräkning för köpt el, och utgå från vad du tror om framtida priser för såld solel."
      >
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            dense
            label="Köpt el"
            unit={`${unit}/kWh`}
            step="0.01"
            value={state.economy.importPrice}
            hint="Kolla din elräkning."
            onChange={(v) => setEconomy({ importPrice: v ?? 0 })}
          />
          <NumberField
            dense
            label="Såld solel"
            unit={`${unit}/kWh`}
            step="0.01"
            value={state.economy.exportPrice}
            hint="Utgå från vad du tror om framtiden."
            onChange={(v) => setEconomy({ exportPrice: v ?? 0 })}
          />
        </div>
        <NumberField
          dense
          label="Effektavgift"
          unit={`${unit}/kW/mån`}
          step="1"
          value={state.economy.demandCharge}
          hint={demandChargeHint(state.economy.demandCharge)}
          onChange={(v) => setEconomy({ demandCharge: v ?? 0, demandChargeTouched: true })}
        />
      </SectionCard>

    </WizardShell>
  );
}
