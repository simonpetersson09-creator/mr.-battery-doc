import { createFileRoute } from "@tanstack/react-router";
import { WizardShell } from "@/components/wizard/WizardShell";
import { SectionCard, ToggleRow } from "@/components/wizard/fields";
import { useWizard } from "@/state/wizard";

export const Route = createFileRoute("/batteri")({
  head: () => ({
    meta: [
      { title: "Vad ska batteriet användas till? — Mr. Battery Doc" },
      {
        name: "description",
        content: "Välj mellan solel, minskad nätimport och lägre effekttoppar.",
      },
      { property: "og:title", content: "Vad ska batteriet användas till? — Mr. Battery Doc" },
      { property: "og:description", content: "Tre användningssätt som kan kombineras fritt." },
    ],
  }),
  component: BatteryStep,
});

function BatteryStep() {
  const { state, update } = useWizard();
  const s = state.strategies;
  const set = (key: keyof typeof s) => (v: boolean) =>
    update((prev) => ({ ...prev, strategies: { ...prev.strategies, [key]: v } }));

  const noSolar = state.production.mode === "none";

  return (
    <WizardShell
      stepIndex={3}
      title="Batteri"
      intro="Allt är påslaget från start. Slå av det som inte är intressant för dig."
    >
      <div className="space-y-2">
        <ToggleRow
          title="Optimerad egenanvändning av solenergi"
          description="Lagra solöverskott och använd energin senare."
          checked={s.solarSelfConsumption}
          onChange={set("solarSelfConsumption")}
        />
        <ToggleRow
          title="Minskad nätimport"
          description="Minska mängden el som hämtas från elnätet."
          checked={s.reducedGridImport}
          onChange={set("reducedGridImport")}
        />
        <ToggleRow
          title="Peak shaving"
          description="Kapa fastighetens effekttoppar."
          checked={s.peakShaving}
          onChange={set("peakShaving")}
        />
      </div>

      <ToggleRow
        title="Stödtjänster – FCR-D upp"
        description="Reserverar effekt för att stödja elnätet. Appen optimerar reservationen automatiskt."
        checked={s.fcrDUp}
        onChange={set("fcrDUp")}
      />


      {noSolar && s.solarSelfConsumption ? (
        <SectionCard description="Du har angett att fastigheten inte har solceller. Då ger egenanvändning av solel ingen nytta idag — övriga användningssätt påverkas inte." />
      ) : null}
    </WizardShell>
  );
}
