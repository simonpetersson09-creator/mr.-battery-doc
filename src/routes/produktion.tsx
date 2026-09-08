import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { WizardShell } from "@/components/wizard/WizardShell";
import { MonthlyImport } from "@/components/wizard/MonthlyImport";
import { MonthGrid } from "@/components/wizard/MonthGrid";

import { NumberField, OptionCard, SectionCard } from "@/components/wizard/fields";
import { validateProductionStep } from "@/lib/battery-app/stepValidation";
import { useWizard } from "@/state/wizard";

export const Route = createFileRoute("/produktion")({
  head: () => ({
    meta: [
      { title: "Solproduktion — Mr. Battery Doc" },
      {
        name: "description",
        content: "Har du solceller? Ange paneleffekt, växelriktare och årsproduktion.",
      },
      { property: "og:title", content: "Solproduktion — Mr. Battery Doc" },
      {
        property: "og:description",
        content: "Appen fungerar lika bra med som utan solcellsanläggning.",
      },
    ],
  }),
  component: ProductionStep,
});

function ProductionStep() {
  const { state, update } = useWizard();
  const p = state.production;
  const validity = validateProductionStep(state);
  const [importOpen, setImportOpen] = useState(false);

  /** The three customer-facing choices map onto the existing data model. */
  const choice: "none" | "annual" | "monthly" =
    p.mode === "none" ? "none" : p.useMonthly ? "monthly" : "annual";

  const setChoice = (next: "none" | "annual" | "monthly") =>
    update((s) => ({
      ...s,
      production: {
        ...s.production,
        mode: next === "none" ? "none" : "manual",
        useMonthly: next === "monthly",
      },
    }));

  const applyImported = useCallback(
    (vals: number[], selfPct?: number | null) =>
      update((s) => ({
        ...s,
        production: {
          ...s.production,
          monthlyKwh: [...vals],
          selfConsumptionPct:
            typeof selfPct === "number" && selfPct > 0 && selfPct <= 100
              ? selfPct
              : s.production.selfConsumptionPct,
        },
      })),
    [update],
  );

  const selfConsumptionField = (
    <SectionCard title="Egenanvändning av solel (valfritt)">
      <NumberField
        label="Egenanvändning"
        unit="%"
        value={p.selfConsumptionPct}
        placeholder="t.ex. 45"
        onChange={(v) =>
          update((s) => ({ ...s, production: { ...s.production, selfConsumptionPct: v } }))
        }
      />
      <p className="ui-help">
        Andelen av din producerade solel som används direkt i fastigheten. Om du inte vet
        värdet beräknar vi det utifrån din förbrukning och produktion.
      </p>
    </SectionCard>
  );

  return (
    <WizardShell
      stepIndex={2}
      title="Produktion"
      intro="Har fastigheten solceller idag?"
      nextDisabled={!validity.ok}
      nextBlockedReason={validity.message}
    >
      <div className="space-y-2">
        <OptionCard
          title="Ingen solcellsanläggning"
          selected={choice === "none"}
          onSelect={() => setChoice("none")}
        />
        <OptionCard
          title="Årsproduktion"
          description="Jag vet anläggningens storlek och ungefärlig årsproduktion."
          selected={choice === "annual"}
          onSelect={() => setChoice("annual")}
        />
        <OptionCard
          title="Månad för månad"
          description="Jag har faktiska produktionsvärden för alla 12 månader."
          selected={choice === "monthly"}
          onSelect={() => setChoice("monthly")}
        />
      </div>

      {choice === "annual" ? (
        <SectionCard title="Anläggning">
          <NumberField
            label="Installerad paneleffekt"
            unit="kWp"
            value={p.dcKwp}
            placeholder="t.ex. 14"
            onChange={(v) => update((s) => ({ ...s, production: { ...s.production, dcKwp: v } }))}
          />
          <NumberField
            label="Växelriktare"
            unit="kW"
            value={p.acKw}
            placeholder="t.ex. 12"
            onChange={(v) => update((s) => ({ ...s, production: { ...s.production, acKw: v } }))}
          />
          <NumberField
            label="Årsproduktion"
            unit="kWh/år"
            value={p.annualKwh}
            placeholder="t.ex. 14000"
            onChange={(v) =>
              update((s) => ({ ...s, production: { ...s.production, annualKwh: v } }))
            }
          />
        </SectionCard>
      ) : null}

      {choice === "monthly" ? (

        <>
          <SectionCard title="Faktisk månadsproduktion">
            <MonthlyImport
              kind="production"
              description="Importera en bild, PDF eller CSV — värdena fylls i månadsfälten nedan."
              onApply={applyImported}
              onOpenChange={setImportOpen}
            />
            {!importOpen ? (
              <MonthGrid
                values={p.monthlyKwh}
                onChange={(i, v) =>
                  update((s) => {
                    const next = [...s.production.monthlyKwh];
                    next[i] = v;
                    return { ...s, production: { ...s.production, monthlyKwh: next } };
                  })
                }
              />
            ) : null}
          </SectionCard>

          <SectionCard title="Anläggning">
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="Paneleffekt"
                unit="kWp"
                value={p.dcKwp}
                placeholder="14"
                onChange={(v) =>
                  update((s) => ({ ...s, production: { ...s.production, dcKwp: v } }))
                }
              />
              <NumberField
                label="Växelriktare"
                unit="kW"
                value={p.acKw}
                placeholder="12"
                onChange={(v) =>
                  update((s) => ({ ...s, production: { ...s.production, acKw: v } }))
                }
              />
            </div>
          </SectionCard>
        </>
      ) : null}

      {choice !== "none" ? selfConsumptionField : null}
    </WizardShell>
  );
}

