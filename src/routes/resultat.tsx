import { createFileRoute } from "@tanstack/react-router";
import { WizardShell } from "@/components/wizard/WizardShell";
import { SectionCard } from "@/components/wizard/fields";
import { dimensionBattery } from "@/lib/battery-engine";
import { getCountry } from "@/lib/country-config";
import { useWizard } from "@/state/wizard";

export const Route = createFileRoute("/resultat")({
  head: () => ({
    meta: [
      { title: "Ditt batteriförslag — Mr. Battery Doc" },
      {
        name: "description",
        content: "Rekommenderad batteristorlek, effekt, energinytta och beräknad årlig besparing.",
      },
      { property: "og:title", content: "Ditt batteriförslag — Mr. Battery Doc" },
      {
        property: "og:description",
        content: "Kapacitet i kWh, effekt i kW och vad batteriet gör för din fastighet.",
      },
    ],
  }),
  component: ResultStep,
});

function ResultStep() {
  const { engineInput, state } = useWizard();
  // Single integration point — swapped to the verified engine later.
  const result = dimensionBattery(engineInput);
  const unit = getCountry(state.grid.country).economy.currencyLabel;
  const money = (v: number) => `${Math.round(v).toLocaleString("sv-SE")} ${unit}`;

  return (
    <WizardShell stepIndex={5} title="Resultat" intro="Så här ser förslaget ut för din fastighet.">
      {result.isMock ? (
        <p className="rounded-xl bg-accent/20 px-3 py-2 text-xs font-medium text-accent-foreground">
          Exempelsiffror — den verifierade beräkningen kopplas in senare.
        </p>
      ) : null}

      <div className="card-surface bg-primary-soft border-primary/40 p-4 text-center">
        <p className="text-sm font-semibold text-muted-foreground">Rekommenderat batteri</p>
        <p className="mt-2 text-4xl font-bold tracking-tight">{result.battery.capacityKwh} kWh</p>
        <p className="mt-1 text-lg font-semibold">{result.battery.powerKw} kW effekt</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Rimligt intervall {result.battery.capacityRangeKwh[0]}–{result.battery.capacityRangeKwh[1]}{" "}
          kWh
        </p>
      </div>

      <SectionCard title="Energi">
        <div className="space-y-2.5">
          <BeforeAfter
            label="Egenanvändning"
            before={`${result.energy.selfConsumptionBefore} %`}
            after={`${result.energy.selfConsumptionAfter} %`}
          />
          <BeforeAfter
            label="Självförsörjning"
            before={`${result.energy.selfSufficiencyBefore} %`}
            after={`${result.energy.selfSufficiencyAfter} %`}
          />
          <BeforeAfter
            label="Nätimport"
            before={`${result.energy.gridImportBefore.toLocaleString("sv-SE")} kWh`}
            after={`${result.energy.gridImportAfter.toLocaleString("sv-SE")} kWh`}
          />
          <BeforeAfter
            label="Nätexport"
            before={`${result.energy.gridExportBefore.toLocaleString("sv-SE")} kWh`}
            after={`${result.energy.gridExportAfter.toLocaleString("sv-SE")} kWh`}
          />
          <Row
            label="Flyttad energi"
            value={`${result.energy.shiftedEnergyKwh.toLocaleString("sv-SE")} kWh/år`}
          />
        </div>
      </SectionCard>

      <SectionCard title="Effekt">
        <div className="space-y-2.5">
          <BeforeAfter
            label="Effekttopp"
            before={`${result.power.peakBeforeKw} kW`}
            after={`${result.power.peakAfterKw} kW`}
          />
          <Row
            label="Minskning"
            value={`${result.power.peakReductionKw} kW (${result.power.peakReductionPct} %)`}
          />
        </div>
      </SectionCard>

      <SectionCard title="Ekonomi" description="Varje nytta räknas bara en gång.">
        <div className="space-y-2.5">
          <Row label="Minskad nätimport" value={money(result.economics.savingReducedImport)} />
          <Row
            label="Mer egenanvänd solel"
            value={money(result.economics.valueIncreasedSelfConsumption)}
          />
          <Row label="Lägre effekttoppar" value={money(result.economics.valuePeakShaving)} />
          <div className="flex items-center justify-between border-t border-border pt-3 text-base font-bold">
            <span>Total nytta per år</span>
            <span>{money(result.economics.totalAnnualBenefit)}</span>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Varför den här storleken?">
        <ul className="space-y-2 text-sm text-muted-foreground">
          {result.explanation.map((line) => (
            <li key={line} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              {line}
            </li>
          ))}
        </ul>
      </SectionCard>
    </WizardShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function BeforeAfter({
  label,
  before,
  after,
}: {
  label: string;
  before: string;
  after: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">
        <span className="text-muted-foreground">{before}</span> → {after}
      </span>
    </div>
  );
}
