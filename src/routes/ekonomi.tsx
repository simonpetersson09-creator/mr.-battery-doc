import { createFileRoute } from "@tanstack/react-router";
import { WizardShell } from "@/components/wizard/WizardShell";
import { NumberField, SectionCard } from "@/components/wizard/fields";
import { getCountry, selfConsumptionValue } from "@/lib/country-config";
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
  const net = selfConsumptionValue(state.economy.importPrice, state.economy.exportPrice);

  const setEconomy = (patch: Partial<typeof state.economy>) =>
    update((s) => ({ ...s, economy: { ...s.economy, ...patch, touched: true } }));
  const validity = validateEconomyStep(state);

  return (
    <WizardShell
      stepIndex={4}
      title="Ekonomi"
      intro={`Standardvärden för ${country.name}. Du kan ändra allt själv.`}
      nextDisabled={!validity.ok}
      nextBlockedReason={validity.message}
    >
      <SectionCard title="Elpriser">
        <NumberField
          label="Köpt el"
          unit={`${unit}/kWh`}
          step="0.01"
          value={state.economy.importPrice}
          hint="Din kostnad för att köpa el från nätet."
          badge={state.economy.importPrice === 1.5 ? "Standardvärde" : "Ditt värde"}
          onChange={(v) => setEconomy({ importPrice: v ?? 0 })}
        />
        <NumberField
          label="Ersättning för såld solel"
          unit={`${unit}/kWh`}
          step="0.01"
          value={state.economy.exportPrice}
          hint="Vad du får betalt för solel som matas ut på nätet."
          badge={state.economy.exportPrice === 0.6 ? "Standardvärde" : "Ditt värde"}
          onChange={(v) => setEconomy({ exportPrice: v ?? 0 })}
        />
      </SectionCard>

      <div className="card-yellow flex items-center justify-between gap-3 rounded-[1.25rem] px-3.5 py-3">
        <div className="min-w-0">
          <p className="ui-label">Värde av egenanvänd solel</p>
          <p className="ui-help mt-0.5 text-foreground/70">
            Skillnaden mellan vad det kostar att köpa el och ersättningen för att sälja solel.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="ui-section-title tabular-nums">
            {net.toFixed(2).replace(".", ",")} {unit}/kWh
          </p>
          <p className="ui-help text-foreground/70 tabular-nums">
            {state.economy.importPrice.toFixed(2).replace(".", ",")} −{" "}
            {state.economy.exportPrice.toFixed(2).replace(".", ",")} {unit}/kWh
          </p>
        </div>
      </div>

      <SectionCard title="Effektavgift">
        <NumberField
          label="Effektavgift"
          unit={`${unit}/kW/mån`}
          step="1"
          value={state.economy.demandCharge}
          hint={
            state.economy.demandChargeTouched
              ? "Finns vanligtvis på din nätfaktura."
              : "Schablonvärde för Sverige – finns på din nätfaktura. Lämna 55 om du inte vet."
          }
          badge={state.economy.demandChargeTouched ? "Ditt värde" : "Standardvärde"}
          onChange={(v) => setEconomy({ demandCharge: v ?? 0, demandChargeTouched: true })}
        />
      </SectionCard>

      {state.strategies.fcrDUp ? (
        <SectionCard title="Valutakurs">
          <NumberField
            label="EUR/SEK"
            unit="kr/EUR"
            step="0.01"
            value={state.economy.eurSekRate}
            hint="Antagande för omräkning av historiska FCR-D upp-priser."
            badge={state.economy.eurSekRate === 11.3 ? "Standardvärde" : "Ditt värde"}
            onChange={(v) => setEconomy({ eurSekRate: v ?? 0 })}
          />
        </SectionCard>
      ) : null}

      <p className="ui-help px-1">
        Varje nytta räknas bara en gång: minskad nätimport värderas till priset på köpt el, flyttad
        solel till skillnaden mellan köpt och såld el, och lägre effekttoppar till effektavgiften.
      </p>

    </WizardShell>
  );
}
