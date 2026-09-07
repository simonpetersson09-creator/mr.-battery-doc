import { createFileRoute } from "@tanstack/react-router";
import { WizardShell } from "@/components/wizard/WizardShell";
import { NumberField, SectionCard } from "@/components/wizard/fields";
import { getCountry, selfConsumptionValue } from "@/lib/country-config";
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
  const net = selfConsumptionValue(state.economy.importPrice, state.economy.exportPrice);

  const setEconomy = (patch: Partial<typeof state.economy>) =>
    update((s) => ({ ...s, economy: { ...s.economy, ...patch, touched: true } }));

  return (
    <WizardShell
      stepIndex={4}
      title="Ekonomi"
      intro={`Standardvärden för ${country.name}. Du kan ändra allt själv.`}
    >
      <SectionCard title="Elpriser">
        <NumberField
          label="Köpt el"
          unit={`${unit}/kWh`}
          step="0.01"
          value={state.economy.importPrice}
          hint="Din kostnad för att köpa el från nätet."
          onChange={(v) => setEconomy({ importPrice: v ?? 0 })}
        />
        <NumberField
          label="Såld solel"
          unit={`${unit}/kWh`}
          step="0.01"
          value={state.economy.exportPrice}
          hint="Vad du får betalt för solel som matas ut på nätet."
          onChange={(v) => setEconomy({ exportPrice: v ?? 0 })}
        />
      </SectionCard>

      <div className="card-surface border-primary/40 bg-primary-soft p-3">
        <p className="text-sm font-semibold">Värde av att använda solelen själv</p>
        <p className="mt-0.5 text-2xl font-bold tracking-tight">
          {net.toFixed(2).replace(".", ",")} {unit}/kWh
        </p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Skillnaden mellan vad det kostar att köpa el och vad du får för att sälja solel.
        </p>
      </div>

      <SectionCard
        title="Effektavgift"
        description="Värdet av att minska debiteringsgrundande effekttoppar. Räknas separat från elpriserna."
      >
        <NumberField
          label="Effektavgift"
          unit={`${unit}/kW/mån`}
          step="1"
          value={state.economy.demandCharge}
          hint={
            country.economy.demandChargeVerified
              ? "Standardvärde för ditt land."
              : "Vi har inget säkert standardvärde för ditt nätbolag ännu — 0 betyder att peak shaving inte värderas."
          }
          onChange={(v) => setEconomy({ demandCharge: v ?? 0 })}
        />
      </SectionCard>

      <SectionCard description="Varje nytta räknas bara en gång: minskad nätimport värderas till priset på köpt el, flyttad solel till skillnaden mellan köpt och såld el, och lägre effekttoppar till effektavgiften." />
    </WizardShell>
  );
}
