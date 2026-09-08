import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { WizardShell } from "@/components/wizard/WizardShell";
import { SectionCard } from "@/components/wizard/fields";
import { Button } from "@/components/ui/button";
import { runBatteryApp } from "@/lib/battery-app";
import { buildResultPresentation } from "@/lib/battery-app/resultPresentation";
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
  const d = outcome.result.diagnostics;
  const ps = d.powerSizing;
  const ga = d.gridAssessment;
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

  const gridLimitsBattery = g.status === "battery-limited" || g.status === "combined";
  const gridLimitsExport =
    g.status === "export-limited" ||
    g.status === "export-limited-minor" ||
    g.status === "combined";



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

      {p.showFcrPowerCard ? (
        <details className="ui-card">
          <summary className="ui-label cursor-pointer list-none">
            {p.fcrPowerCardTitle ?? `Varför ${nf(p.recommendedPowerKw, 1)} kW?`}
          </summary>
          <div className="mt-3 space-y-1.5">
            {p.showPhysicalNeedRow ? (
              <Row label="Fysiskt effektbehov" value={kw(p.physicalPowerNeedKw, 1)} />
            ) : null}
            <Row
              label={p.showPhysicalNeedRow ? "Utan FCR-D upp" : "Fysiskt behov / utan FCR-D upp"}
              value={kw(p.withoutFcrPowerKw ?? p.physicalPowerNeedKw, 1)}
            />
            <Row label="Med historiskt FCR-scenario" value={kw(p.recommendedPowerKw, 1)} />
            {p.withoutFcrBenefitSek !== null && p.withFcrBenefitSek !== null ? (
              <>
                <Row
                  label="Nytta utan FCR-D upp"
                  value={`${nf(p.withoutFcrBenefitSek)} kr/år`}
                />
                <Row
                  label="Nytta med FCR-scenario"
                  value={`${nf(p.withFcrBenefitSek)} kr/år`}
                />
                {p.benefitDeltaSek !== null ? (
                  <Row
                    label="Skillnad"
                    value={`${p.benefitDeltaSek > 0 ? "+" : ""}${nf(p.benefitDeltaSek)} kr/år`}
                  />
                ) : null}
              </>
            ) : null}
            <p className="ui-help pt-1">{p.fcrPowerCardText}</p>
            <p className="ui-help text-foreground/70">{p.fcrHistoricalNote}</p>
          </div>
        </details>
      ) : null}



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
            {p.showExport ? (
              <BeforeAfter
                label="Nätexport"
                before={kwh(e.exportBeforeKWh)}
                after={kwh(e.exportAfterKWh)}
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
                {p.showDemandSavingRow ? (
                  <Row
                    label="Minskad effektkostnad"
                    value={`${money(s.peak.demandCostSavingSek)}/år`}
                  />
                ) : null}
                {p.demandNote ? <p className="ui-help">{p.demandNote}</p> : null}

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
            <div className="mt-2 space-y-2">
              {s.economy.energyBenefitSek !== 0 ? (
                <Row label="Energinytta" value={`${money(s.economy.energyBenefitSek)}/år`} />
              ) : null}
              {p.showDemandSavingRow ? (
                <Row
                  label="Minskad effektkostnad"
                  value={`${money(s.economy.demandCostSavingSek)}/år`}
                />
              ) : null}
              {s.fcr.enabled ? (
                <Row
                  label="Stödtjänster – historiskt 2025"
                  value={`${money(s.fcr.grossSek)}/år`}
                />
              ) : null}
            </div>
          </>
        )}
      </SectionCard>

      {s.fcr.enabled ? (
        <details className="ui-card">
          <summary className="ui-label cursor-pointer list-none">Visa Stödtjänster</summary>
          <div className="mt-3 space-y-2">
            <Row label="Reserverad effekt" value={kw(s.fcr.offeredPowerKw, 1)} />
            <Row label="Tillgänglighet" value={pct(s.fcr.availabilityPct)} />
            <p className="ui-help">
              {p.showFcrPowerCard
                ? "Intäkten finns redan i ”Beräknad nytta”."
                : "Historiskt scenario baserat på FCR-D upp-priser från 2025. Framtida intäkt kan avvika. Intäkten finns redan i ”Beräknad nytta”."}
            </p>

          </div>
        </details>
      ) : null}


      <details className="ui-card">
        <summary className="ui-label cursor-pointer list-none">Visa Elanslutning</summary>
        <div className="mt-3">
          {gridLimitsBattery ? (
            <>
              <p className="ui-label">Elanslutningen begränsar batteriet något</p>
              <p className="ui-help mt-1">
                Batteriet kan fortfarande använda den rekommenderade storleken
                {noBattery ? "" : ` ${nf(p.capacityKWh)} kWh / ${nf(p.recommendedPowerKw, 1)} kW`}. Din
                elanslutning begränsar laddning eller urladdning under vissa perioder.
              </p>
            </>
          ) : gridLimitsExport ? (
            <>
              <p className="ui-label">Elanslutningen räcker för batteriet</p>
              <p className="ui-help mt-1">
                Under soliga stunder kan en del av solelen inte skickas ut på nätet. Det beror på
                solanläggningens storlek i förhållande till elanslutningen, inte på batteriet.
              </p>
            </>
          ) : (
            <p className="ui-label">Din nuvarande elanslutning bedöms vara tillräcklig.</p>
          )}
        </div>
      </details>

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
            <Row label="Fastighetens fysiska effektbehov" value={kw(p.physicalPowerNeedKw, 1)} />
            <Row label="Max faktiskt använd effekt" value={kw(p.actualDispatchPowerKw, 2)} />
            {p.fcrHeldPowerKw !== null ? (
              <Row label="Stödtjänster hållen effekt" value={kw(p.fcrHeldPowerKw, 2)} />
            ) : null}
            <Row label="C-rate" value={`${nf(ps.productCRate, 2)} C`} />
            <Row
              label="Nytta jämfört med obegränsad effekt"
              value={pct(ps.utilityPctOfReference)}
            />
          </TechGroup>

          <TechGroup title="Elanslutning">
            <Row label="Nätstatus" value={g.headline} />
            <Row label="Begränsad laddning" value={`${kwh(ga.batteryChargeBlockedKWh)}/år`} />
            <Row
              label="Andel av laddad energi"
              value={`${nf(ga.batteryBlockedPctOfCharge, 1)} %`}
            />
            <Row label="Importgränsen nådd" value={`${nf(ga.importBoundHours)} timmar/år`} />
            <Row label="Exportgränsen nådd" value={`${nf(ga.exportBoundHours)} timmar/år`} />
            <Row label="Otäckt last" value={`${kwh(g.unservedLoadKWh)}/år`} />
            {g.detail ? <p className="ui-help">{g.detail}</p> : null}
          </TechGroup>

          {s.fcr.enabled ? (
            <TechGroup title="Stödtjänster">
              <Row label="Erbjuden/reserverad effekt" value={kw(s.fcr.offeredPowerKw, 1)} />
              <Row label="Genomsnittligt hållen effekt" value={kw(s.fcr.avgHeldPowerKw, 2)} />
              <Row label="Tillgänglighet" value={pct(s.fcr.availabilityPct)} />
              <Row label="Reserverade timmar" value={`${nf(s.fcr.reservedHours)} timmar/år`} />
              <p className="ui-help">
                Modellnotering: Stödtjänster (FCR-D upp) är i modellen en beredskaps- och
                effektintäkt. Den ger ingen egen energimängd och räknas därför inte som cykler.
              </p>
              {s.fcr.blockers.map((b) => (
                <p key={b} className="ui-help">
                  {b}
                </p>
              ))}
            </TechGroup>
          ) : null}

          <details className="rounded-[0.875rem] border border-border/60 p-3">
            <summary className="ui-label cursor-pointer list-none">Dimensioneringsmetod</summary>
            <div className="mt-2 space-y-2">
              <p className="ui-caption">
                Beskriver hur dimensioneringen togs fram. Nyckeltal i den här texten kommer från
                dimensioneringsberäkningen (utan FCR-reservation) och kan därför skilja sig från
                det slutliga scenariots värden ovan.
              </p>
              {[r.explanation, r.powerExplanation, ...g.consequences]
                .filter((x): x is string => Boolean(x))
                .map((line) => (
                  <p key={line} className="ui-help">
                    {line}
                  </p>
                ))}
              {s.peak.tariffNote ? <p className="ui-help">{s.peak.tariffNote}</p> : null}
            </div>
          </details>
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
