import { createFileRoute } from "@tanstack/react-router";
import { WizardShell } from "@/components/wizard/WizardShell";
import { AttachmentPicker, NumberField, OptionCard, SectionCard } from "@/components/wizard/fields";
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

  const setMode = (mode: ConsumptionMode) =>
    update((s) => ({ ...s, consumption: { ...s.consumption, mode } }));

  return (
    <WizardShell
      stepIndex={1}
      title="Förbrukning"
      intro="Välj det sätt som passar dig bäst. Du kan ändra dig senare."
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
        <OptionCard
          title="Foto eller fil"
          description="Jag laddar upp min elräkning eller förbrukningsrapport."
          selected={c.mode === "document"}
          onSelect={() => setMode("document")}
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
                    className="mt-1.5 h-12 w-full rounded-xl border border-input bg-background px-3 text-base outline-none focus:border-primary"
                  />
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Summa:{" "}
              {c.monthlyKwh.reduce<number>((a, b) => a + (b ?? 0), 0).toLocaleString("sv-SE")} kWh
            </p>
          </SectionCard>
        </>
      ) : null}

      {c.mode === "document" ? (
        <>
          <SectionCard title="Ladda upp underlag">
            <AttachmentPicker
              label="Elräkning eller förbrukningsrapport"
              hint="Automatisk avläsning är inte påslagen ännu — filen sparas för kommande tolkning."
              attachments={c.attachments}
              onChange={(attachments) =>
                update((s) => ({ ...s, consumption: { ...s.consumption, attachments } }))
              }
            />
          </SectionCard>
        </>
      ) : null}
    </WizardShell>
  );
}

function ProfilePicker({ optional, note }: { optional?: boolean; note?: string }) {
  const { state, update } = useWizard();
  const selected = state.consumption.profileId
    ? getProfile(state.consumption.profileId)
    : null;
  return (
    <SectionCard
      title={optional ? "Förbrukningsprofil (valfri)" : "Förbrukningsprofil"}
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
        <SelectTrigger className="h-12 w-full rounded-xl text-base">
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
