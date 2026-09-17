import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarRange, ListChecks, Sun, SunMedium, Zap } from "lucide-react";
import { WizardShell } from "@/components/wizard/WizardShell";
import { MonthlyImport } from "@/components/wizard/MonthlyImport";
import { MonthGrid } from "@/components/wizard/MonthGrid";

import { FieldError, NumberField, SectionCard } from "@/components/wizard/fields";
import { productionFieldErrors, validateProductionStep } from "@/lib/battery-app/stepValidation";
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
  const fieldError = productionFieldErrors(state);
  const [importOpen, setImportOpen] = useState(false);
  const [justImported, setJustImported] = useState(false);
  const hasImported =
    justImported || p.monthlyKwh.some((v) => typeof v === "number" && Number.isFinite(v));

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
    (vals: number[], selfPct?: number | null) => {
      setJustImported(true);
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
      }));
    },
    [update],
  );

  const selfPct = typeof p.selfConsumptionPct === "number" ? p.selfConsumptionPct : 0;

  const selfConsumptionSlider = (
    <>
      <p className="mt-2 text-sm font-medium">{t("production.self.label")}</p>
      <p className="text-[1.125rem] font-extrabold leading-none tracking-[-0.03em] tabular-nums">
        {selfPct} %
      </p>
      <Slider
        className="mt-2"
        value={[selfPct]}
        min={0}
        max={100}
        step={1}
        aria-label={t("production.self.label")}
        onValueChange={(v) =>
          update((s) => ({
            ...s,
            production: { ...s.production, selfConsumptionPct: v[0] ?? selfPct },
          }))
        }
      />
      <div className="ui-help mt-1 flex justify-between tabular-nums">
        <span>0 %</span>
        <span>100 %</span>
      </div>
      <p className="ui-help mt-1">{t("production.self.hint")}</p>
    </>
  );

  const annualCard = (
    <SectionCard compact icon={<SunMedium />} title={t("production.plant.annual")}>
      {choice === "annual" ? (
        <NumberField
          label={t("production.plant.annual")}
          unit={t("units.kwhPerYear")}
          value={p.annualKwh}
          placeholder={t("errors.egValue", { value: "14000" })}
          compact
          error={fieldError.annualKwh}
          onChange={(v) => update((s) => ({ ...s, production: { ...s.production, annualKwh: v } }))}
        />
      ) : null}
      {selfConsumptionSlider}
    </SectionCard>
  );

  const plantCard = (
    <SectionCard compact icon={<Zap />} title={t("production.plant.title")}>
      <NumberField
        label={t("production.plant.dcKwp")}
        unit="kWp"
        value={p.dcKwp}
        placeholder={t("errors.egValue", { value: "14" })}
        compact
        error={fieldError.dcKwp}
        onChange={(v) => update((s) => ({ ...s, production: { ...s.production, dcKwp: v } }))}
      />
      <NumberField
        label={t("production.plant.acKw")}
        unit="kW"
        value={p.acKw}
        placeholder={t("errors.egValue", { value: "12" })}
        compact
        error={fieldError.acKw}
        onChange={(v) => update((s) => ({ ...s, production: { ...s.production, acKw: v } }))}
      />
    </SectionCard>
  );

  const modeLabel =
    choice === "none"
      ? t("production.modeNone.title")
      : choice === "annual"
        ? t("production.modeAnnual.title")
        : t("production.modeMonthly.title");

  return (
    <WizardShell
      stepIndex={2}
      title={t("production.title")}
      intro={t("production.intro")}
      nextDisabled={!validity.ok}
      nextBlockedReason={validity.message}
      compact
    >
      <SectionCard compact icon={<ListChecks />} title={t("production.modeTitle")}>
        <Select
          value={choice}
          onValueChange={(v) => setChoice(v as "none" | "annual" | "monthly")}
        >
          <SelectTrigger className="ui-control ui-control-active">
            <SelectValue>{modeLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <span className="flex items-start gap-2">
                <Sun className="mt-0.5 size-4 shrink-0 text-accent" />
                <span className="block font-medium">{t("production.modeNone.title")}</span>
              </span>
            </SelectItem>
            <SelectItem value="annual">
              <span className="flex items-start gap-2">
                <Zap className="mt-0.5 size-4 shrink-0 text-accent" />
                <span>
                  <span className="block font-medium">{t("production.modeAnnual.title")}</span>
                  <span className="block text-muted-foreground">
                    {t("production.modeAnnual.description")}
                  </span>
                </span>
              </span>
            </SelectItem>
            <SelectItem value="monthly">
              <span className="flex items-start gap-2">
                <CalendarRange className="mt-0.5 size-4 shrink-0 text-accent" />
                <span>
                  <span className="block font-medium">{t("production.modeMonthly.title")}</span>
                  <span className="block text-muted-foreground">
                    {t("production.modeMonthly.description")}
                  </span>
                </span>
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </SectionCard>

      {choice === "annual" ? (
        <SectionCard compact icon={<Zap />} title={t("production.plant.title")}>
          <NumberField
            label={t("production.plant.dcKwp")}
            unit="kWp"
            value={p.dcKwp}
            placeholder={t("errors.egValue", { value: "14" })}
            compact
            error={fieldError.dcKwp}
            onChange={(v) => update((s) => ({ ...s, production: { ...s.production, dcKwp: v } }))}
          />
          <NumberField
            label={t("production.plant.acKw")}
            unit="kW"
            value={p.acKw}
            placeholder={t("errors.egValue", { value: "12" })}
            compact
            error={fieldError.acKw}
            onChange={(v) => update((s) => ({ ...s, production: { ...s.production, acKw: v } }))}
          />
          <NumberField
            label={t("production.plant.annual")}
            unit={t("units.kwhPerYear")}
            value={p.annualKwh}
            placeholder={t("errors.egValue", { value: "14000" })}
            compact
            error={fieldError.annualKwh}
            onChange={(v) =>
              update((s) => ({ ...s, production: { ...s.production, annualKwh: v } }))
            }
          />
        </SectionCard>
      ) : null}

      {choice === "monthly" ? (
        <>
          <SectionCard compact icon={<Zap />} title={t("production.plant.title")}>
            <NumberField
              label={t("production.plant.dcKwp")}
              unit="kWp"
              value={p.dcKwp}
              placeholder={t("errors.egValue", { value: "14" })}
              compact
              error={fieldError.dcKwp}
              onChange={(v) => update((s) => ({ ...s, production: { ...s.production, dcKwp: v } }))}
            />
            <NumberField
              label={t("production.plant.acKw")}
              unit="kW"
              value={p.acKw}
              placeholder={t("errors.egValue", { value: "12" })}
              compact
              error={fieldError.acKw}
              onChange={(v) => update((s) => ({ ...s, production: { ...s.production, acKw: v } }))}
            />
          </SectionCard>

          <SectionCard compact icon={<CalendarRange />} title={t("production.monthly.title")}>
            <MonthlyImport
              kind="production"
              description={t("production.monthly.importDescription")}
              onApply={applyImported}
              onOpenChange={setImportOpen}
            />
          </SectionCard>

          {!importOpen && hasImported ? (
            <SectionCard
              compact
              icon={<CalendarRange />}
              title={t("production.monthly.monthsTitle")}
            >
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
              <FieldError message={fieldError.monthlyKwh} />
            </SectionCard>
          ) : null}
        </>
      ) : null}

      {choice !== "none" ? selfConsumptionField : null}
    </WizardShell>
  );
}


