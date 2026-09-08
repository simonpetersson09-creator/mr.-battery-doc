import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { WizardShell } from "@/components/wizard/WizardShell";
import { SectionCard } from "@/components/wizard/fields";
import { Button } from "@/components/ui/button";
import { runBatteryApp } from "@/lib/battery-app";
import { buildResultPresentation } from "@/lib/battery-app/resultPresentation";
import { computeWithoutFcrOptimum } from "@/lib/battery-app/withoutFcrOptimum";

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
  const { state, reset } = useWizard();
  const navigate = useNavigate();
  // Single integration point: wizard -> adapter -> frozen Battery Engine.
  const outcome = useMemo(() => runBatteryApp(state), [state]);

  const restart = (
    <Button
      variant="cta"
      className="h-12 flex-[2] rounded-[0.875rem] font-bold shadow-cta"

      onClick={() => {
        reset();
        void navigate({ to: "/" });
      }}
    >
      Börja om
    </Button>
  );

  if (outcome.status === "incomplete") {
    return (
      <WizardShell
        stepIndex={5}
        title="Resultat"
        intro="Vi behöver lite mer information."
        footerAction={restart}
      >
        <SectionCard
          title="Fyll i det som saknas"
          description="Beräkningen startar först när alla uppgifter finns — vi gissar aldrig åt dig."
        >
          <ul className="ui-help space-y-1.5">
            {outcome.issues.map((i) => (
              <li key={i.field} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
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
      <WizardShell
        stepIndex={5}
        title="Resultat"
        intro="Något gick fel."
        footerAction={restart}
      >
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
  const cal = s.selfConsumptionCalibration;

  const g = s.grid;

  /* All customer-facing relevance and wording comes from one pure presentation layer. */
  const p = buildResultPresentation(outcome.result, {
    peakShavingSelected: state.strategies.peakShaving,
    demandChargeTouched: state.economy.demandChargeTouched,
  });
  const noBattery = p.noBattery;

  const peakPct =
    g.importPeakBeforeKw > 0 ? (s.peak.peakReductionKw / g.importPeakBeforeKw) * 100 : 0;



  return (
    <WizardShell
      stepIndex={5}
      title="Resultat"
      intro="Så här ser förslaget ut för din fastighet."
      footerAction={restart}
    >
      {noBattery ? (
        <div className="hero-metric rounded-[1.25rem] px-4 py-4 text-center">
          <p className="ui-caption">Slutsats</p>
          <p className="ui-section-title mt-1.5">Inget batteri rekommenderas</p>
          <p className="ui-help mt-1 text-foreground/70">
            Med dina nuvarande uppgifter ger ett batteri inte tillräcklig nytta för att
            rekommenderas.
          </p>
        </div>
      ) : (
        <div className="hero-metric rounded-[1.25rem] px-4 py-4 text-center">
          <p className="ui-caption">Rekommenderat batteri</p>
          <p className="ui-hero mt-1.5 tabular-nums">
            {nf(p.capacityKWh)} <span className="text-2xl font-bold">kWh</span>
          </p>
          <p className="ui-section-title mt-0.5 tabular-nums">
            {nf(p.recommendedPowerKw, 1)} kW effekt
          </p>
        </div>
      )}






      {p.limitedBenefit ? (
        <SectionCard title={p.limitedBenefitTitle ?? ""} description={p.limitedBenefitText ?? ""} />
      ) : null}


      {p.showEnergySection ? (

        <SectionCard title="Energi">
          <div className="space-y-2">
            {p.showSelfConsumption ? (
              <BeforeAfter
                label="Egenanvändning"
                before={pct(e.selfConsumptionBeforePct)}
                after={pct(e.selfConsumptionAfterPct)}
              />
            ) : null}
            {p.showSelfSufficiency ? (
              <BeforeAfter
                label="Självförsörjning"
                before={pct(e.selfSufficiencyBeforePct)}
                after={pct(e.selfSufficiencyAfterPct)}
              />
            ) : null}
            {p.showImport ? (
              <BeforeAfter
                label="Nätimport"
                before={kwh(e.importBeforeKWh)}
                after={kwh(e.importAfterKWh)}
              />
            ) : null}
            {p.showShiftedSolar ? (
              <Row label="Flyttad solel" value={`${kwh(e.shiftedSolarKWh)}/år`} />
            ) : null}
            {e.recoveredCurtailmentKWh > 0 ? (
              <Row label="Återvunnen kapad solel" value={`${kwh(e.recoveredCurtailmentKWh)}/år`} />
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      {p.showPeakSection ? (
        <SectionCard title="Effekt">
          <div className="space-y-2">
            <BeforeAfter
              label="Effekttopp"
              before={kw(g.importPeakBeforeKw)}
              after={kw(g.importPeakAfterKw)}
            />
            {p.peakChanged ? (
              <>
                <Row
                  label="Minskning"
                  value={`${nf(s.peak.peakReductionKw, 2)} kW (${nf(peakPct, 1)} %)`}
                />
              </>
            ) : (
              <p className="ui-help">Ingen minskning av effekttoppen med de valda inställningarna.</p>
            )}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Beräknad nytta">
        {p.noEconomy ? (
          <>
            <p className="ui-section-title tabular-nums">0 kr/år</p>
            <p className="ui-help mt-1">
              Med de valda inställningarna ger batteriet ingen beräknad ekonomisk nytta.
            </p>
          </>
        ) : (
          <>
            <p className="ui-hero text-[2rem] tabular-nums">
              {money(s.economy.totalOperatingBenefitSek)}
              <span className="ui-help font-normal"> /år</span>
            </p>
            <div className="mt-2 space-y-2.5">
              {s.economy.energyBenefitSek !== 0 ? (
                <BenefitRow
                  label={p.hasSolar ? "Flyttad solel och minskat elköp" : "Minskat elköp"}
                  hint={
                    p.hasSolar
                      ? "Lagrad solel används när den behövs."
                      : "Batteriet laddas när elen är billigare och används senare."
                  }
                  value={`${money(s.economy.energyBenefitSek)}/år`}
                />
              ) : null}
              {p.showDemandSavingRow ? (
                <BenefitRow
                  label="Peak shaving"
                  hint="Kapar effekttoppar och minskar effektavgiften."
                  value={`${money(s.economy.demandCostSavingSek)}/år`}
                />
              ) : null}
              {s.fcr.enabled ? (
                <BenefitRow
                  label="Stödtjänster – FCR-D upp"
                  hint="Ersättning för reserverad batterieffekt. Historiska priser 2025."
                  value={`${money(s.fcr.grossSek)}/år`}
                />
              ) : null}
            </div>

          </>
        )}
      </SectionCard>





      <details className="ui-card">
        <summary className="ui-label cursor-pointer list-none">
          {noBattery
            ? "Visa varför ingen rekommendation"
            : `Visa varför ${nf(p.capacityKWh)} kWh och ${nf(p.recommendedPowerKw, 1)} kW`}
        </summary>
        <div className="mt-3 space-y-1.5">
          <p className="ui-help">{p.capacityWhy}</p>
          {p.powerWhy ? <p className="ui-help">{p.powerWhy}</p> : null}
        </div>
      </details>

      <details className="ui-card">
        <summary className="ui-label cursor-pointer list-none">Visa tekniska detaljer</summary>

        <div className="mt-3 space-y-4">
          {/* All key figures below come from the FINAL simulation of the recommended system. */}
          {cal ? (
            <TechGroup title="Egenanvändning före batteri">
              <Row label="Angivet historiskt värde" value={pct(cal.requestedPct)} />
              <Row label="Modellens uppnådda nivå" value={pct(cal.achievedPct)} />
              {cal.status === "clamped" ? (
                <Row
                  label="Avvikelse"
                  value={`${nf(cal.residualPct, 1)} procentenheter`}
                />
              ) : null}
            </TechGroup>
          ) : null}

          <TechGroup title="Batterianvändning">

            <Row label="Nyttjandegrad" value={pct(e.utilisationPct)} />
            <Row label="Cykler per år" value={nf(e.equivalentFullCycles, 1)} />
            <Row
              label="Rimligt kapacitetsintervall"
              value={`${nf(r.reasonableRangeKWh[0])}–${nf(r.reasonableRangeKWh[1])} kWh`}
            />
          </TechGroup>

          <TechGroup title="Effektdimensionering">
            <Row label="Rekommenderad systemeffekt" value={kw(p.recommendedPowerKw, 1)} />
            <Row label="Fysiskt effektbehov" value={kw(p.physicalPowerNeedKw, 1)} />
            <Row label="Max faktiskt använd effekt" value={kw(p.actualDispatchPowerKw, 2)} />
            {p.fcrHeldPowerKw !== null ? (
              <Row label="Stödtjänster hållen effekt" value={kw(p.fcrHeldPowerKw, 2)} />
            ) : null}
            <Row label="Systemets C-rate" value={`${nf(p.systemCRate, 2)} C`} />
          </TechGroup>

        </div>
      </details>

    </WizardShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="ui-body flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function BenefitRow({ label, hint, value }: { label: string; hint: string; value: string }) {
  return (
    <div>
      <div className="ui-body flex items-baseline justify-between gap-4">
        <span className="min-w-0 text-muted-foreground">{label}</span>
        <span className="shrink-0 font-semibold tabular-nums">{value}</span>
      </div>
      <p className="ui-help mt-0.5">{hint}</p>
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
    <div className="ui-body flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">
        <span className="text-muted-foreground">{before}</span> → {after}
      </span>
    </div>
  );
}


function TechGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <p className="ui-caption uppercase tracking-wide">{title}</p>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
