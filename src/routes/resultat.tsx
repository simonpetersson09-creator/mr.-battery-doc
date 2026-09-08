import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { WizardShell } from "@/components/wizard/WizardShell";
import { SectionCard } from "@/components/wizard/fields";
import { Button } from "@/components/ui/button";
import { runBatteryApp } from "@/lib/battery-app";
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

const nf = (v: number, digits = 0) =>
  v.toLocaleString("sv-SE", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const money = (v: number | null) => (v === null ? "—" : `${nf(v)} kr`);
const kwh = (v: number) => `${nf(v)} kWh`;
const kw = (v: number, d = 2) => `${nf(v, d)} kW`;
const pct = (v: number) => `${nf(v, 0)} %`;

function ResultStep() {
  const { state } = useWizard();
  // Single integration point: wizard -> adapter -> frozen Battery Engine.
  const outcome = useMemo(() => runBatteryApp(state), [state]);

  if (outcome.status === "incomplete") {
    return (
      <WizardShell stepIndex={5} title="Resultat" intro="Vi behöver lite mer information.">
        <SectionCard
          title="Fyll i det som saknas"
          description="Beräkningen startar först när alla uppgifter finns — vi gissar aldrig åt dig."
        >
          <ul className="space-y-2 text-sm text-muted-foreground">
            {outcome.issues.map((i) => (
              <li key={i.field} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                {i.message}
              </li>
            ))}
          </ul>
        </SectionCard>
      </WizardShell>
    );
  }

  if (outcome.status === "error") {
    return (
      <WizardShell stepIndex={5} title="Resultat" intro="Något gick fel.">
        <SectionCard
          title="Beräkningen kunde inte genomföras"
          description="Gå tillbaka och kontrollera dina uppgifter, och försök igen. Vi visar hellre inget än ett påhittat resultat."
        />
      </WizardShell>
    );
  }

  const s = outcome.result.summary;
  const r = s.recommendation;
  const e = s.energy;
  const g = s.grid;

  const peakPct =
    g.importPeakBeforeKw > 0 ? (s.peak.peakReductionKw / g.importPeakBeforeKw) * 100 : 0;

  return (
    <WizardShell stepIndex={5} title="Resultat" intro="Så här ser förslaget ut för din fastighet.">
      <div className="card-surface bg-primary-soft border-primary/40 p-4 text-center">
        <p className="text-sm font-semibold text-muted-foreground">Rekommenderat batteri</p>
        <p className="mt-2 text-4xl font-bold tracking-tight">{nf(r.capacityKWh)} kWh</p>
        <p className="mt-1 text-lg font-semibold">{nf(r.powerKw, 1)} kW effekt</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Rimligt intervall {nf(r.reasonableRangeKWh[0])}–{nf(r.reasonableRangeKWh[1])} kWh
        </p>
      </div>

      <SectionCard title="Energi">
        <div className="space-y-2.5">
          <BeforeAfter
            label="Egenanvändning"
            before={pct(e.selfConsumptionBeforePct)}
            after={pct(e.selfConsumptionAfterPct)}
          />
          <BeforeAfter
            label="Självförsörjning"
            before={pct(e.selfSufficiencyBeforePct)}
            after={pct(e.selfSufficiencyAfterPct)}
          />
          <BeforeAfter
            label="Nätimport"
            before={kwh(e.importBeforeKWh)}
            after={kwh(e.importAfterKWh)}
          />
          <BeforeAfter
            label="Nätexport"
            before={kwh(e.exportBeforeKWh)}
            after={kwh(e.exportAfterKWh)}
          />
          <Row label="Flyttad solel" value={`${kwh(e.shiftedSolarKWh)}/år`} />
          {e.recoveredCurtailmentKWh > 0 ? (
            <Row label="Återvunnen kapad solel" value={`${kwh(e.recoveredCurtailmentKWh)}/år`} />
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="Effekt">
        <div className="space-y-2.5">
          <BeforeAfter
            label="Effekttopp"
            before={kw(g.importPeakBeforeKw)}
            after={kw(g.importPeakAfterKw)}
          />
          <Row
            label="Förändring"
            value={`${nf(s.peak.peakReductionKw, 2)} kW (${nf(peakPct, 1)} %)`}
          />
          <Row label="Minskad effektkostnad" value={money(s.peak.demandCostSavingSek)} />
          {s.peak.tariffNote ? (
            <p className="text-xs text-muted-foreground">{s.peak.tariffNote}</p>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="Ekonomi" description="Varje nytta räknas bara en gång.">
        <div className="space-y-2.5">
          <Row label="Energinytta" value={money(s.economy.energyBenefitSek)} />
          <Row label="Minskad effektkostnad" value={money(s.economy.demandCostSavingSek)} />
          {s.fcr.enabled ? (
            <Row label="FCR-D upp (historiskt 2025)" value={money(s.fcr.grossSek)} />
          ) : null}
          <div className="flex items-center justify-between border-t border-border pt-3 text-base font-bold">
            <span>Total nytta per år</span>
            <span>{money(s.economy.totalOperatingBenefitSek)}</span>
          </div>
        </div>
      </SectionCard>

      {s.fcr.enabled ? (
        <SectionCard title="FCR-D upp">
          <div className="space-y-2.5">
            <Row label="Erbjuden effekt" value={kw(s.fcr.offeredPowerKw, 1)} />
            <Row label="Genomsnittligt hållen effekt" value={kw(s.fcr.avgHeldPowerKw, 2)} />
            <Row label="Tillgänglighet" value={pct(s.fcr.availabilityPct)} />
            <p className="text-xs text-muted-foreground">{s.fcr.disclaimer}</p>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Begränsningar">
        <div className="space-y-2.5">
          <Row label="Nätstatus" value={g.headline} />
          <Row label="Otäckt last" value={`${kwh(g.unservedLoadKWh)}/år`} />
          {g.detail ? <p className="text-xs text-muted-foreground">{g.detail}</p> : null}
          {r.utilisationWarning ? (
            <p className="text-xs text-muted-foreground">{r.utilisationWarning}</p>
          ) : null}
          {g.consequences.length ? (
            <ul className="space-y-2 text-sm text-muted-foreground">
              {g.consequences.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  {line}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="Varför den här storleken?">
        <ul className="space-y-2 text-sm text-muted-foreground">
          {[r.explanation, r.powerExplanation].filter(Boolean).map((line) => (
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
