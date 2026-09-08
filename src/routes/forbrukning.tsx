import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { WizardShell } from "@/components/wizard/WizardShell";
import { MonthlyImport } from "@/components/wizard/MonthlyImport";
import { MonthGrid } from "@/components/wizard/MonthGrid";

import { NumberField, OptionCard, SectionCard } from "@/components/wizard/fields";
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
      title="Förbrukning"
      intro="Välj det sätt som passar dig bäst. Du kan ändra dig senare."
      nextDisabled={!validity.ok}
      nextBlockedReason={validity.message}
    >
      <div className="space-y-2">
        <OptionCard
          title="Årsförbrukning"
          description="Jag vet ungefär hur många kWh vi använder per år."
          selected={c.mode === "annual"}
          onSelect={() => setMode("annual")}
        />
        <OptionCard
          title="Månad för månad"
          description="Jag har faktiska värden för alla 12 månader."
          selected={c.mode === "monthly"}
          onSelect={() => setMode("monthly")}
        />
      </div>

      {c.mode === "annual" ? (
        <SectionCard title="Årsförbrukning">
          <NumberField
            label="Förbrukning"
            unit="kWh/år"
            value={c.annualKwh}
            placeholder="t.ex. 20000"
            onChange={(v) =>
              update((s) => ({ ...s, consumption: { ...s.consumption, annualKwh: v } }))
            }
          />
        </SectionCard>
      ) : null}

      {c.mode === "monthly" ? (
        <SectionCard title="Faktisk månadsförbrukning">
          <MonthlyImport
            kind="consumption"
            description="Importera en bild, PDF eller CSV — värdena fylls i månadsfälten nedan."
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
  const { state, update } = useWizard();
  const selected = state.consumption.profileId
    ? getProfile(state.consumption.profileId)
    : null;
  return (
    <SectionCard title="Förbrukningsprofil">
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
          <SelectValue placeholder="Välj profil">{selected ? selected.name : null}</SelectValue>
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
