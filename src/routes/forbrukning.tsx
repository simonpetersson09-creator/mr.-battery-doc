import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, CalendarRange, Gauge, ListChecks } from "lucide-react";
import { WizardShell } from "@/components/wizard/WizardShell";
import { MonthlyImport } from "@/components/wizard/MonthlyImport";
import { MonthGrid } from "@/components/wizard/MonthGrid";

import { NumberField, SectionCard } from "@/components/wizard/fields";
import { validateConsumptionStep } from "@/lib/battery-app/stepValidation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROFILE_CATALOG, getProfile, isKnownProfile } from "@/lib/consumption-profiles";
import { useWizard, type ConsumptionMode } from "@/state/wizard";
import { useT } from "@/i18n";

/**
 * Hour-shape fallback used when the customer supplies actual monthly values.
 * The profile picker is hidden in that mode — the months decide the monthly
 * energy, this only gives the engine a safe intra-day shape.
 */
const DEFAULT_HOUR_PROFILE = "normal";

export const Route = createFileRoute("/forbrukning")({
  head: () => ({
    meta: [
      { title: "Din elförbrukning — Mr. Battery Doc" },
      {
        name: "description",
        content:
          "Ange årsförbrukning och profil, eller faktiska värden för alla tolv månader.",
      },
      { property: "og:title", content: "Din elförbrukning — Mr. Battery Doc" },
      {
        property: "og:description",
        content: "Två sätt att beskriva hur mycket el fastigheten använder.",
      },
    ],
  }),
  component: ConsumptionStep,
});

function ConsumptionStep() {
  const t = useT();
  const { state, update } = useWizard();
  const c = state.consumption;
  const validity = validateConsumptionStep(state);
  const [importOpen, setImportOpen] = useState(false);

  // Monthly mode hides the profile picker, so make sure the safe hour-shape
  // default is present in state (also for older saved sessions).
  useEffect(() => {
    if (c.mode === "monthly" && !isKnownProfile(c.profileId)) {
      update((s) => ({
        ...s,
        consumption: { ...s.consumption, profileId: DEFAULT_HOUR_PROFILE },
      }));
    }
  }, [c.mode, c.profileId, update]);

  const setMode = (mode: ConsumptionMode) =>
    update((s) => ({ ...s, consumption: { ...s.consumption, mode } }));

  const applyImported = useCallback(
    (vals: number[]) =>
      update((s) => ({ ...s, consumption: { ...s.consumption, monthlyKwh: [...vals] } })),
    [update],
  );

  return (
    <WizardShell
      stepIndex={1}
      title={t("consumption.title")}
      intro={t("consumption.intro")}
      nextDisabled={!validity.ok}
      nextBlockedReason={validity.message}
      compact
    >
      <SectionCard compact icon={<ListChecks />} title={t("consumption.modeTitle")}>
        <Select
          value={c.mode}
          onValueChange={(v) => setMode(v as ConsumptionMode)}
        >
          <SelectTrigger className="ui-control">
            <SelectValue>
              {c.mode === "annual"
                ? t("consumption.modeAnnual.title")
                : t("consumption.modeMonthly.title")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="annual">
              <span className="flex items-start gap-2">
                <Gauge className="mt-0.5 size-4 shrink-0 text-accent" />
                <span>
                  <span className="block font-medium">{t("consumption.modeAnnual.title")}</span>
                  <span className="block text-muted-foreground">
                    {t("consumption.modeAnnual.description")}
                  </span>
                </span>
              </span>
            </SelectItem>
            <SelectItem value="monthly">
              <span className="flex items-start gap-2">
                <CalendarRange className="mt-0.5 size-4 shrink-0 text-accent" />
                <span>
                  <span className="block font-medium">{t("consumption.modeMonthly.title")}</span>
                  <span className="block text-muted-foreground">
                    {t("consumption.modeMonthly.description")}
                  </span>
                </span>
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </SectionCard>

      {c.mode === "annual" ? (
        <SectionCard compact icon={<Gauge />} title={t("consumption.annual.title")}>
          <NumberField
            label={t("consumption.annual.label")}
            unit={t("units.kwhPerYear")}
            value={c.annualKwh}
            placeholder={t("consumption.annual.placeholder")}
            compact
            onChange={(v) =>
              update((s) => ({ ...s, consumption: { ...s.consumption, annualKwh: v } }))
            }
          />
        </SectionCard>
      ) : null}

      {c.mode === "monthly" ? (
        <SectionCard compact icon={<CalendarRange />} title={t("consumption.monthly.title")}>
          <MonthlyImport
            kind="consumption"
            description={t("consumption.monthly.importDescription")}
            onApply={applyImported}
            onOpenChange={setImportOpen}
          />
          {!importOpen ? (
            <MonthGrid
              values={c.monthlyKwh}
              onChange={(i, v) =>
                update((s) => {
                  const next = [...s.consumption.monthlyKwh];
                  next[i] = v;
                  return { ...s, consumption: { ...s.consumption, monthlyKwh: next } };
                })
              }
            />
          ) : null}
        </SectionCard>
      ) : null}

      <ProfilePicker />

    </WizardShell>
  );
}

function ProfilePicker() {
  const t = useT();
  const { state, update } = useWizard();
  const selected = state.consumption.profileId
    ? getProfile(state.consumption.profileId)
    : null;
  return (
    <SectionCard compact icon={<Activity />} title={t("consumption.profile.title")}>
      <Select
        value={state.consumption.profileId ?? ""}
        onValueChange={(v) =>
          update((s) => ({
            ...s,
            consumption: { ...s.consumption, profileId: v || null },
          }))
        }
      >
        <SelectTrigger className="ui-control">
          <SelectValue placeholder={t("consumption.profile.placeholder")}>{selected ? selected.name : null}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {PROFILE_CATALOG.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              <span className="font-medium">{p.name}</span>
              <span className="text-muted-foreground"> — {p.description}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SectionCard>
  );
}
