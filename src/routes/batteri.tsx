import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { WizardShell } from "@/components/wizard/WizardShell";
import { ToggleRow } from "@/components/wizard/fields";
import { useWizard } from "@/state/wizard";
import { useT } from "@/i18n";

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
  const t = useT();
  const { state, update } = useWizard();
  const s = state.strategies;
  const set = (key: keyof typeof s) => (v: boolean) =>
    update((prev) => ({ ...prev, strategies: { ...prev.strategies, [key]: v } }));

  /**
   * Without a PV system the energy-driven uses are switched off and locked, so the no-solar
   * flow is a pure ancillary-service case. Ancillary services stay available: the battery
   * can be compensated for standing by.
   */
  const noSolar = state.production.mode === "none";
  useEffect(() => {
    if (!noSolar) return;
    if (!s.solarSelfConsumption && !s.reducedGridImport && !s.peakShaving) return;
    update((prev) => ({
      ...prev,
      strategies: {
        ...prev.strategies,
        solarSelfConsumption: false,
        reducedGridImport: false,
        peakShaving: false,
      },
    }));
  }, [noSolar, s.solarSelfConsumption, s.reducedGridImport, s.peakShaving, update]);

  return (
    <WizardShell compact stepIndex={3} title={t("strategies.title")} intro={t("strategies.intro")} primaryTask={t("strategies.primary")}>
      <div className="space-y-2">
        <ToggleRow
          title={t("strategies.solar.title")}
          description={t("strategies.solar.description")}
          checked={noSolar ? false : s.solarSelfConsumption}
          disabled={noSolar}
          onChange={set("solarSelfConsumption")}
        />
        <ToggleRow
          title={t("strategies.gridImport.title")}
          description={t("strategies.gridImport.description")}
          checked={noSolar ? false : s.reducedGridImport}
          disabled={noSolar}
          onChange={set("reducedGridImport")}
        />
        <ToggleRow
          title={t("strategies.peak.title")}
          description={t("strategies.peak.description")}
          checked={noSolar ? false : s.peakShaving}
          disabled={noSolar}
          onChange={set("peakShaving")}
        />
      </div>

      <ToggleRow
        title={t("strategies.ancillary.title")}
        description={t("strategies.ancillary.description")}
        checked={s.fcrDUp}
        onChange={set("fcrDUp")}
      />

      
    </WizardShell>
  );
}
