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
  const { state, reset } = useWizard();
  const navigate = useNavigate();
  // Single integration point: wizard -> adapter -> frozen Battery Engine.
  const outcome = useMemo(() => runBatteryApp(state), [state]);

  const restart = (
    <Button
      variant="cta"
      className="h-12 flex-[2] rounded-[0.875rem] text-[15px] font-bold shadow-cta"

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
  const g = s.grid;

  const peakPct =
    g.importPeakBeforeKw > 0 ? (s.peak.peakReductionKw / g.importPeakBeforeKw) * 100 : 0;

  /* ---- Presentation-only relevance rules. No numbers are recomputed here. ---- */
  const noBattery = r.capacityKWh <= 0;
  const hasSolar = e.annualPvKWh > 0;
  const peakStrategyOn = state.strategies.peakShaving;

  const showSelfConsumption = hasSolar;
  const showSelfSufficiency = hasSolar;
  const showExport = e.exportBeforeKWh > 0 || e.exportAfterKWh > 0;
  const showShiftedSolar = hasSolar && e.shiftedSolarKWh > 0;
  const importChanged = e.importBeforeKWh !== e.importAfterKWh;
  const showImport = importChanged || !hasSolar;
  const showEnergySection =
    showSelfConsumption || showSelfSufficiency || showExport || showShiftedSolar || showImport;

  const peakChanged = s.peak.peakReductionKw !== 0;
  const showPeakSection = peakStrategyOn || peakChanged;
  const demandSaving = s.economy.demandCostSavingSek ?? 0;
  const fcrGross = s.fcr.enabled ? (s.fcr.grossSek ?? 0) : 0;
  const noEconomy =
    s.economy.energyBenefitSek === 0 && demandSaving === 0 && fcrGross === 0;

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
            {nf(r.capacityKWh)} <span className="text-2xl font-bold">kWh</span>
          </p>
          <p className="ui-section-title mt-0.5 tabular-nums">{nf(r.powerKw, 1)} kW effekt</p>
          <p className="ui-help mt-1 text-foreground/70">
            Rimligt intervall {nf(r.reasonableRangeKWh[0])}–{nf(r.reasonableRangeKWh[1])} kWh
          </p>
        </div>
      )}


      {showEnergySection ? (
        <SectionCard title="Energi">
          <div className="space-y-2">
            {showSelfConsumption ? (
              <BeforeAfter
                label="Egenanvändning"
                before={pct(e.selfConsumptionBeforePct)}
                after={pct(e.selfConsumptionAfterPct)}
              />
            ) : null}
            {showSelfSufficiency ? (
              <BeforeAfter
                label="Självförsörjning"
                before={pct(e.selfSufficiencyBeforePct)}
                after={pct(e.selfSufficiencyAfterPct)}
              />
            ) : null}
            {showImport ? (
              <BeforeAfter
                label="Nätimport"
                before={kwh(e.importBeforeKWh)}
                after={kwh(e.importAfterKWh)}
              />
            ) : null}
            {showExport ? (
              <BeforeAfter
                label="Nätexport"
                before={kwh(e.exportBeforeKWh)}
                after={kwh(e.exportAfterKWh)}
              />
            ) : null}
            {showShiftedSolar ? (
              <Row label="Flyttad solel" value={`${kwh(e.shiftedSolarKWh)}/år`} />
            ) : null}
            {e.recoveredCurtailmentKWh > 0 ? (
              <Row label="Återvunnen kapad solel" value={`${kwh(e.recoveredCurtailmentKWh)}/år`} />
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      {showPeakSection ? (
        <SectionCard title="Effekt">
          <div className="space-y-2">
            <BeforeAfter
              label="Effekttopp"
              before={kw(g.importPeakBeforeKw)}
              after={kw(g.importPeakAfterKw)}
            />
            {peakChanged ? (
              <>
                <Row
                  label="Förändring"
                  value={`${nf(s.peak.peakReductionKw, 2)} kW (${nf(peakPct, 1)} %)`}
                />
                <Row label="Minskad effektkostnad" value={money(s.peak.demandCostSavingSek)} />
              </>
            ) : (
              <p className="ui-help">Ingen minskning av effekttoppen med de valda inställningarna.</p>
            )}
            {s.peak.tariffNote ? <p className="ui-help">{s.peak.tariffNote}</p> : null}
          </div>
        </SectionCard>
      ) : null}

      {noEconomy ? (
        <SectionCard title="Beräknad nytta">
          <p className="ui-section-title tabular-nums">0 kr/år</p>
          <p className="ui-help mt-1">
            Med de valda inställningarna ger batteriet ingen beräknad ekonomisk nytta.
          </p>
        </SectionCard>
      ) : (
        <SectionCard title="Ekonomi" description="Varje nytta räknas bara en gång.">
          <div className="space-y-2">
            {s.economy.energyBenefitSek !== 0 ? (
              <Row label="Energinytta" value={money(s.economy.energyBenefitSek)} />
            ) : null}
            {demandSaving !== 0 ? (
              <Row label="Minskad effektkostnad" value={money(s.economy.demandCostSavingSek)} />
            ) : null}
            {s.fcr.enabled ? (
              <Row label="FCR-D upp (historiskt 2025)" value={money(s.fcr.grossSek)} />
            ) : null}
            <div className="mt-1 flex items-center justify-between gap-3 rounded-[0.875rem] bg-accent px-3 py-2.5 text-[17px] font-extrabold text-accent-foreground">
              <span>Total nytta per år</span>
              <span className="tabular-nums">{money(s.economy.totalOperatingBenefitSek)}</span>
            </div>
          </div>
        </SectionCard>
      )}

      {s.fcr.enabled ? (
        <SectionCard title="FCR-D upp">
          <div className="space-y-2">
            <Row label="Erbjuden effekt" value={kw(s.fcr.offeredPowerKw, 1)} />
            <Row label="Genomsnittligt hållen effekt" value={kw(s.fcr.avgHeldPowerKw, 2)} />
            <Row label="Tillgänglighet" value={pct(s.fcr.availabilityPct)} />
            <p className="ui-help">{s.fcr.disclaimer}</p>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Begränsningar">
        <div className="space-y-2">
          <Row label="Nätstatus" value={g.headline} />
          {g.unservedLoadKWh > 0 ? (
            <Row label="Otäckt last" value={`${kwh(g.unservedLoadKWh)}/år`} />
          ) : null}
          {g.detail ? <p className="ui-help">{g.detail}</p> : null}
          {r.utilisationWarning ? (
            <p className="ui-help">{r.utilisationWarning}</p>
          ) : null}
          {g.consequences.length ? (
            <ul className="ui-help space-y-1.5">
              {g.consequences.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                  {line}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title={noBattery ? "Varför ingen rekommendation?" : "Varför den här storleken?"}>
        <ul className="ui-help space-y-1.5">
          {[r.explanation, noBattery ? null : r.powerExplanation]
            .filter((x): x is string => Boolean(x))
            .map((line) => (
              <li key={line} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
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
    <div className="ui-body flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
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

