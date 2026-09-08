import { createFileRoute } from "@tanstack/react-router";
import { WizardShell } from "@/components/wizard/WizardShell";
import { NumberField, OptionCard, SectionCard } from "@/components/wizard/fields";
import { validateConsumptionStep } from "@/lib/battery-app/stepValidation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MONTH_SHORT_SV, PROFILE_CATALOG, getProfile } from "@/lib/consumption-profiles";
import { useWizard, type ConsumptionMode } from "@/state/wizard";

export const Route = createFileRoute("/forbrukning")({
  head: () => ({
    meta: [
      { title: "Din elförbrukning — Mr. Battery Doc" },
      {
        name: "description",
        content:
          "Ange årsförbrukning och profil, faktiska månadsvärden eller ladda upp din elräkning.",
      },
      { property: "og:title", content: "Din elförbrukning — Mr. Battery Doc" },
      {
        property: "og:description",
        content: "Tre sätt att beskriva hur mycket el fastigheten använder.",
      },
    ],
  }),
  component: ConsumptionStep,
});

function ConsumptionStep() {
  const { state, update } = useWizard();
  const c = state.consumption;
  const validity = validateConsumptionStep(state);

  const setMode = (mode: ConsumptionMode) =>
    update((s) => ({ ...s, consumption: { ...s.consumption, mode } }));

  return (
    <WizardShell
      stepIndex={1}
      title="Förbrukning"
      intro="Välj det sätt som passar dig bäst. Du kan ändra dig senare."
      nextDisabled={!validity.ok}
      nextBlockedReason={validity.message}
    >
      <div className="space-y-3">
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
        <>
          <SectionCard title="Total årsförbrukning">
            <NumberField
              label="Förbrukning"
              unit="kWh/år"
              value={c.annualKwh}
              placeholder="t.ex. 18000"
              onChange={(v) =>
                update((s) => ({ ...s, consumption: { ...s.consumption, annualKwh: v } }))
              }
            />
          </SectionCard>
          <ProfilePicker />
        </>
      ) : null}

      {c.mode === "monthly" ? (
        <>
          <SectionCard
            title="Faktisk månadsförbrukning"
            description="Faktiska värden går alltid före uppskattningar."
          >
            <div className="grid grid-cols-2 gap-3">
              {MONTH_SHORT_SV.map((m, i) => (
                <label key={m} className="block">
                  <span className="field-label">{m}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={c.monthlyKwh[i] ?? ""}
                    placeholder="kWh"
                    onChange={(e) =>
                      update((s) => {
                        const next = [...s.consumption.monthlyKwh];
                        next[i] = e.target.value === "" ? null : Number(e.target.value);
                        return { ...s, consumption: { ...s.consumption, monthlyKwh: next } };
                      })
                    }
                    className="mt-1.5 h-12 w-full rounded-2xl border border-foreground/15 bg-surface-cream px-3 text-base font-semibold outline-none focus:border-accent"
                  />
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Summa:{" "}
              {c.monthlyKwh.reduce<number>((a, b) => a + (b ?? 0), 0).toLocaleString("sv-SE")} kWh
            </p>
          </SectionCard>
          <ProfilePicker note="Profilen används för att fördela varje månads förbrukning över dygnets timmar. Dina månadsvärden styr månadsenergin." />
        </>
      ) : null}
    </WizardShell>
  );
}

function ProfilePicker({ note }: { note?: string }) {
  const { state, update } = useWizard();
  const selected = state.consumption.profileId
    ? getProfile(state.consumption.profileId)
    : null;
  return (
    <SectionCard
      title="Förbrukningsprofil"
      description={note ?? "Välj den beskrivning som liknar din fastighet mest."}
    >
      <Select
        value={state.consumption.profileId ?? ""}
        onValueChange={(v) =>
          update((s) => ({
            ...s,
            consumption: {
              ...s.consumption,
              profileId: v || null,
            },
          }))
        }
      >
        <SelectTrigger className="h-12 w-full rounded-2xl border-foreground/15 bg-surface-cream text-base font-semibold">
          <SelectValue placeholder="Välj profil">
            {selected ? selected.name : null}
          </SelectValue>
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
