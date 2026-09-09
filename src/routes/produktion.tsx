import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarRange, ListChecks, Sun, SunMedium, Zap } from "lucide-react";
import { WizardShell } from "@/components/wizard/WizardShell";
import { MonthlyImport } from "@/components/wizard/MonthlyImport";
import { MonthGrid } from "@/components/wizard/MonthGrid";

import { NumberField, SectionCard } from "@/components/wizard/fields";
import { validateProductionStep } from "@/lib/battery-app/stepValidation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWizard } from "@/state/wizard";
import { useT } from "@/i18n";

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
  const t = useT();
  const { state, update } = useWizard();
  const p = state.production;
  const validity = validateProductionStep(state);
  const [importOpen, setImportOpen] = useState(false);
  const [hasImported, setHasImported] = useState(false);

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
    <SectionCard title={t("production.self.title")}>
      <NumberField
        label={t("production.self.label")}
        unit="%"
        value={p.selfConsumptionPct}
        placeholder={t("production.self.placeholder")}
        onChange={(v) =>
          update((s) => ({ ...s, production: { ...s.production, selfConsumptionPct: v } }))
        }
      />
      <p className="ui-help">{t("production.self.hint")}</p>
    </SectionCard>
  );

  return (
    <WizardShell
      stepIndex={2}
      title={t("production.title")}
      intro={t("production.intro")}
      nextDisabled={!validity.ok}
      nextBlockedReason={validity.message}
    >
      <div className="space-y-2">
        <OptionCard
          title={t("production.modeNone.title")}
          selected={choice === "none"}
          onSelect={() => setChoice("none")}
        />
        <OptionCard
          title={t("production.modeAnnual.title")}
          description={t("production.modeAnnual.description")}
          selected={choice === "annual"}
          onSelect={() => setChoice("annual")}
        />
        <OptionCard
          title={t("production.modeMonthly.title")}
          description={t("production.modeMonthly.description")}
          selected={choice === "monthly"}
          onSelect={() => setChoice("monthly")}
        />
      </div>

      {choice === "annual" ? (
        <SectionCard title={t("production.plant.title")}>
          <NumberField
            label={t("production.plant.dcKwp")}
            unit="kWp"
            value={p.dcKwp}
            placeholder="t.ex. 14"
            onChange={(v) => update((s) => ({ ...s, production: { ...s.production, dcKwp: v } }))}
          />
          <NumberField
            label={t("production.plant.acKw")}
            unit="kW"
            value={p.acKw}
            placeholder="t.ex. 12"
            onChange={(v) => update((s) => ({ ...s, production: { ...s.production, acKw: v } }))}
          />
          <NumberField
            label={t("production.plant.annual")}
            unit={t("units.kwhPerYear")}
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
          <SectionCard title={t("production.monthly.title")}>
            <MonthlyImport
              kind="production"
              description={t("production.monthly.importDescription")}
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

          <SectionCard title={t("production.plant.title")}>
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label={t("production.plant.dcKwpShort")}
                unit="kWp"
                value={p.dcKwp}
                placeholder="14"
                onChange={(v) =>
                  update((s) => ({ ...s, production: { ...s.production, dcKwp: v } }))
                }
              />
              <NumberField
                label={t("production.plant.acKw")}
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

