import { createFileRoute } from "@tanstack/react-router";
import { WizardShell } from "@/components/wizard/WizardShell";
import { NumberField, OptionCard, SectionCard, ToggleRow } from "@/components/wizard/fields";
import { MONTH_SHORT_SV } from "@/lib/consumption-profiles";
import { validateProductionStep } from "@/lib/battery-app/stepValidation";
import { useWizard, type ProductionMode } from "@/state/wizard";

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
  const setMode = (mode: ProductionMode) =>
    update((s) => ({ ...s, production: { ...s.production, mode } }));
  const validity = validateProductionStep(state);

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
          title="Jag har ingen solcellsanläggning"
          selected={p.mode === "none"}
          onSelect={() => setMode("none")}
        />
        <OptionCard
          title="Jag fyller i uppgifterna själv"
          description="Paneleffekt, växelriktare och årsproduktion."
          selected={p.mode === "manual"}
          onSelect={() => setMode("manual")}
        />
      </div>

      {p.mode === "manual" ? (
        <>
          <SectionCard title="Anläggningen">
            <NumberField
              label="Installerad paneleffekt"
              unit="kWp"
              value={p.dcKwp}
              placeholder="t.ex. 12"
              onChange={(v) => update((s) => ({ ...s, production: { ...s.production, dcKwp: v } }))}
            />
            <NumberField
              label="Växelriktarens AC-effekt"
              unit="kW"
              value={p.acKw}
              placeholder="t.ex. 10"
              onChange={(v) => update((s) => ({ ...s, production: { ...s.production, acKw: v } }))}
            />
            <NumberField
              label="Årsproduktion"
              unit="kWh/år"
              value={p.annualKwh}
              placeholder="t.ex. 11000"
              onChange={(v) =>
                update((s) => ({ ...s, production: { ...s.production, annualKwh: v } }))
              }
            />
          </SectionCard>

          <ToggleRow
            title="Jag har faktiska månadsvärden"
            description="Fyll i produktionen månad för månad."
            checked={p.useMonthly}
            onChange={(v) =>
              update((s) => ({ ...s, production: { ...s.production, useMonthly: v } }))
            }
          />

          {p.useMonthly ? (
            <SectionCard title="Månadsproduktion">
              <div className="grid grid-cols-2 gap-2">
                {MONTH_SHORT_SV.map((m, i) => (
                  <label key={m} className="flex items-center gap-2">
                    <span className="field-label w-9 shrink-0">{m}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="kWh"
                      value={p.monthlyKwh[i] ?? ""}
                      onChange={(e) =>
                        update((s) => {
                          const next = [...s.production.monthlyKwh];
                          next[i] = e.target.value === "" ? null : Number(e.target.value);
                          return { ...s, production: { ...s.production, monthlyKwh: next } };
                        })
                      }
                      className="ui-control h-11 min-w-0 flex-1 tabular-nums"
                    />
                  </label>
                ))}
              </div>

            </SectionCard>
          ) : null}
        </>
      ) : null}

    </WizardShell>
  );
}
