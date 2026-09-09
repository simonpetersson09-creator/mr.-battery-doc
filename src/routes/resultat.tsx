import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { WizardShell } from "@/components/wizard/WizardShell";
import { SectionCard } from "@/components/wizard/fields";
import { Button } from "@/components/ui/button";
import { runBatteryApp } from "@/lib/battery-app";
import { buildResultPresentation } from "@/lib/battery-app/resultPresentation";
import { computeWithoutFcrOptimum } from "@/lib/battery-app/withoutFcrOptimum";
import { computeBatteryAlternatives } from "@/lib/battery-app/capacityAlternatives";
import {
  importantInfoFooter,
  importantInfoPoints,
  importantInfoTitle,
} from "@/lib/battery-app/importantInfo";

import { ancillaryUnavailableText } from "@/lib/battery-app/ancillaryAvailability";
import { formatMoney } from "@/lib/country-config";
import { formatNumber, useT } from "@/i18n";
import { reserveProductName } from "@/i18n/labels";
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

/** Plain numbers follow the UI language; money follows the country. */
const nf = (v: number, digits = 0) => formatNumber(v, digits);
const kwh = (v: number) => `${nf(v)} kWh`;
const kw = (v: number, d = 2) => `${nf(v, d)} kW`;
const pct = (v: number) => `${nf(v, 0)} %`;

function ResultStep() {
  const t = useT();
  const { state, reset } = useWizard();
  /**
   * Currency comes from the chosen country through the central currency layer — the
   * result page never assumes SEK, and it never follows the UI language. Every amount
   * here is already in local currency (reserve revenue is converted from EUR inside
   * the economics layer).
   */
  const countryCode = state.grid.country;
  const money = (v: number | null) => (v === null ? "—" : formatMoney(v, countryCode, 0));
  const moneyPerYear = (v: number | null) =>
    v === null ? "—" : `${formatMoney(v, countryCode, 0)}${t("units.perYear")}`;
  const navigate = useNavigate();
  // Single integration point: wizard -> adapter -> frozen Battery Engine.
  const outcome = useMemo(() => runBatteryApp(state), [state]);
  /**
   * Genuine FCR-off counterfactual (same capacity, FCR switched off BEFORE dispatch).
   * Only needed while the reserve product is actually part of the recommendation.
   */
  const withoutFcr = useMemo(
    () =>
      outcome.status === "ok" && outcome.result.summary.fcr.enabled
        ? computeWithoutFcrOptimum(outcome.input, outcome.result)
        : null,
    [outcome],
  );
  /** Comparison layer: nearest simulated capacity step below/above the recommendation. */
  const alternatives = useMemo(
    () =>
      outcome.status === "ok" ? computeBatteryAlternatives(outcome.input, outcome.result) : [],
    [outcome],
  );

  const restart = (
    <Button
      variant="cta"
      className="h-12 flex-[2] rounded-[0.875rem] font-bold shadow-cta"
      onClick={() => {
        reset();
        void navigate({ to: "/" });
      }}
    >
      {t("common.restart")}
    </Button>
  );

  if (outcome.status === "incomplete") {
    return (
      <WizardShell
        stepIndex={5}
        title={t("results.title")}
        intro={t("results.incomplete.intro")}
        footerAction={restart}
      >
        <SectionCard
          title={t("results.incomplete.title")}
          description={t("results.incomplete.description")}
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
        title={t("results.title")}
        intro={t("results.error.intro")}
        footerAction={restart}
      >
        <SectionCard
          title={t("results.error.title")}
          description={t("results.error.description")}
        />
      </WizardShell>
    );
  }

  const s = outcome.result.summary;
  const e = s.energy;
  const cal = s.selfConsumptionCalibration;

  const g = s.grid;

  /* Product name always comes from the central reserve market config; only the
     wording is localized. */
  const productLabel = reserveProductName(state.grid.country, state.grid.marketArea);

  /* All customer-facing relevance and wording comes from one pure presentation layer. */
  const p = buildResultPresentation(outcome.result, {
    peakShavingSelected: state.strategies.peakShaving,
    demandChargeTouched: state.economy.demandChargeTouched,
    withoutFcr,
    reserveProductLabel: productLabel,
  });

  const noBattery = p.noBattery;

  /* Countries without a verified historical price dataset get an explicit
     "not available" note instead of a fabricated 0 ancillary revenue. */
  const ancillaryNote = state.strategies.fcrDUp
    ? ancillaryUnavailableText(state.grid.country, state.grid.marketArea)
    : null;

  const peakPct =
    g.importPeakBeforeKw > 0 ? (s.peak.peakReductionKw / g.importPeakBeforeKw) * 100 : 0;

  return (
    <WizardShell
      stepIndex={5}
      title={t("results.title")}
      intro={t("results.intro")}
      footerAction={restart}
    >
      {noBattery ? (
        <div className="hero-metric rounded-[1.25rem] px-4 py-4 text-center">
          <p className="ui-caption">{t("results.noBattery.badge")}</p>
          <p className="ui-section-title mt-1.5">{t("results.noBattery.title")}</p>
          <p className="ui-help mt-1 text-foreground/70">{t("results.noBattery.text")}</p>
        </div>
      ) : (
        <div className="hero-metric rounded-[1.25rem] px-3 py-4">
          <p className="ui-caption text-center">{t("results.hero.title")}</p>
          <div
            className="mt-3 grid items-end gap-2"
            style={{ gridTemplateColumns: `repeat(${alternatives.length}, minmax(0, 1fr))` }}
          >
            {alternatives.map((alt) => {
              const main = alt.level === "recommended";
              return (
                <div
                  key={alt.level}
                  className={
                    "rounded-[1rem] px-1.5 py-2 text-center " +
                    (main ? "bg-foreground/5" : "opacity-70")
                  }
                >
                  <p
                    className={
                      main
                        ? "ui-caption font-bold uppercase tracking-wide"
                        : "ui-caption uppercase tracking-wide"
                    }
                  >
                    {alt.level === "lower"
                      ? t("results.level.lower")
                      : alt.level === "higher"
                        ? t("results.level.higher")
                        : t("results.level.recommended")}
                  </p>
                  <p
                    className={
                      main
                        ? "mt-1 text-2xl font-extrabold tabular-nums leading-tight"
                        : "mt-1 text-base font-semibold tabular-nums leading-tight"
                    }
                  >
                    {nf(alt.capacityKWh)} <span className="text-xs font-bold">kWh</span>
                  </p>
                  <p
                    className={
                      main
                        ? "text-sm font-bold tabular-nums"
                        : "ui-help font-semibold tabular-nums"
                    }
                  >
                    {nf(alt.powerKw, 1)} kW
                  </p>
                  <p
                    className={
                      main
                        ? "mt-1 text-sm font-bold tabular-nums"
                        : "ui-help mt-1 tabular-nums"
                    }
                  >
                    {moneyPerYear(alt.annualBenefitSek)}
                  </p>
                </div>
              );
            })}
          </div>
          {(() => {
            const recommended = alternatives.find((a) => a.level === "recommended");
            const higher = alternatives.find((a) => a.level === "higher");
            if (!recommended) return null;
            const higherIsBetter =
              higher &&
              higher.annualBenefitSek !== null &&
              recommended.annualBenefitSek !== null &&
              higher.annualBenefitSek > recommended.annualBenefitSek;
            const text = higherIsBetter
              ? s.fcr.enabled
                ? t("results.balance.higherAncillary")
                : t("results.balance.higher")
              : t("results.balance.base");
            return (
              <p className="ui-help mt-2.5 text-center text-foreground/60">{text}</p>
            );
          })()}
        </div>
      )}

      {p.limitedBenefit ? (
        <SectionCard title={p.limitedBenefitTitle ?? ""} description={p.limitedBenefitText ?? ""} />
      ) : null}

      {p.showEnergySection ? (
        <SectionCard title={t("results.energy.title")}>
          <div className="space-y-2">
            {p.showSelfConsumption ? (
              <BeforeAfter
                label={t("results.energy.selfConsumption")}
                before={pct(e.selfConsumptionBeforePct)}
                after={pct(e.selfConsumptionAfterPct)}
              />
            ) : null}
            {p.showSelfSufficiency ? (
              <BeforeAfter
                label={t("results.energy.selfSufficiency")}
                before={pct(e.selfSufficiencyBeforePct)}
                after={pct(e.selfSufficiencyAfterPct)}
              />
            ) : null}
            {p.showImport ? (
              <BeforeAfter
                label={t("results.energy.gridImport")}
                before={kwh(e.importBeforeKWh)}
                after={kwh(e.importAfterKWh)}
              />
            ) : null}
            {p.showShiftedSolar ? (
              <Row
                label={t("results.energy.shiftedSolar")}
                value={`${kwh(e.shiftedSolarKWh)}${t("units.perYear")}`}
              />
            ) : null}
            {e.recoveredCurtailmentKWh > 0 ? (
              <Row
                label={t("results.energy.recoveredCurtailment")}
                value={`${kwh(e.recoveredCurtailmentKWh)}${t("units.perYear")}`}
              />
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      {p.showPeakSection ? (
        <SectionCard title={t("results.power.title")}>
          <div className="space-y-2">
            <BeforeAfter
              label={t("results.power.peak")}
              before={kw(g.importPeakBeforeKw)}
              after={kw(g.importPeakAfterKw)}
            />
            {p.peakChanged ? (
              <Row
                label={t("results.power.reduction")}
                value={`${nf(s.peak.peakReductionKw, 2)} kW (${nf(peakPct, 1)} %)`}
              />
            ) : (
              <p className="ui-help">{t("results.power.noReduction")}</p>
            )}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title={t("results.benefit.title")}>
        {p.noEconomy ? (
          <>
            <p className="ui-section-title tabular-nums">{moneyPerYear(0)}</p>
            <p className="ui-help mt-1">{t("results.benefit.none")}</p>
          </>
        ) : (
          <>
            <p className="ui-hero text-[2rem] tabular-nums">
              {money(s.economy.totalOperatingBenefitSek)}
              <span className="ui-help font-normal">{t("units.perYear")}</span>
            </p>
            <div className="mt-2 space-y-2.5">
              {s.economy.energyBenefitSek !== 0 ? (
                <BenefitRow
                  label={
                    p.hasSolar
                      ? t("results.benefit.energyWithSolar")
                      : t("results.benefit.energyNoSolar")
                  }
                  hint={
                    p.hasSolar
                      ? t("results.benefit.energyHintSolar")
                      : t("results.benefit.energyHintNoSolar")
                  }
                  value={moneyPerYear(s.economy.energyBenefitSek)}
                />
              ) : null}
              {p.showDemandSavingRow ? (
                <BenefitRow
                  label={t("results.benefit.peak")}
                  hint={t("results.benefit.peakHint")}
                  value={moneyPerYear(s.economy.demandCostSavingSek)}
                />
              ) : null}
              {ancillaryNote ? (
                <p className="ui-help">{ancillaryNote}</p>
              ) : s.fcr.enabled ? (
                <>
                  <BenefitRow
                    label={t("results.benefit.ancillary", { product: productLabel })}
                    hint={t("results.benefit.ancillaryHint")}
                    value={moneyPerYear(s.fcr.grossSek)}
                  />
                  <p className="ui-help">{t("results.benefit.ancillaryNote")}</p>
                </>
              ) : null}
            </div>
          </>
        )}
      </SectionCard>

      {p.showFcrPowerCard ? (
        <details className="ui-card ui-expandable">
          <summary className="ui-label">{p.fcrPowerCardTitle}</summary>
          <div className="mt-3 space-y-2">
            {p.fcrPowerLevels.map((lvl) => (
              <Row key={lvl.label} label={lvl.label} value={kw(lvl.kw, 1)} />
            ))}
            {p.fcrPowerExplanation ? <p className="ui-help">{p.fcrPowerExplanation}</p> : null}
          </div>
        </details>
      ) : null}

      <details className="ui-card ui-expandable">
        <summary className="ui-label">{t("technical.title")}</summary>

        <div className="mt-3 space-y-4">
          {/* All key figures below come from the FINAL simulation of the recommended system. */}
          {cal ? (
            <TechGroup title={t("technical.calibrationGroup")}>
              <Row label={t("technical.requested")} value={pct(cal.requestedPct)} />
              <Row label={t("technical.achieved")} value={pct(cal.achievedPct)} />
              {cal.status === "partial" ? (
                <p className="ui-help">{t("technical.partialNote")}</p>
              ) : null}
            </TechGroup>
          ) : null}

          <TechGroup title={t("technical.usageGroup")}>
            <Row label={t("technical.cycles")} value={nf(e.equivalentFullCycles, 1)} />
          </TechGroup>

          <TechGroup title={t("technical.powerGroup")}>
            <Row label={t("technical.recommendedPower")} value={kw(p.recommendedPowerKw, 1)} />
            <Row label={t("technical.physicalNeed")} value={kw(p.physicalPowerNeedKw, 1)} />
            {p.fcrHeldPowerKw !== null ? (
              <Row label={t("technical.heldPower")} value={kw(p.fcrHeldPowerKw, 2)} />
            ) : null}
            <Row label={t("technical.cRate")} value={`${nf(p.systemCRate, 2)} C`} />
          </TechGroup>
        </div>
      </details>

      <details className="ui-card ui-expandable">
        <summary className="ui-label">{importantInfoTitle()}</summary>
        <ul className="ui-help mt-3 space-y-2 leading-relaxed">
          {importantInfoPoints().map((point: string) => (
            <li key={point} className="flex gap-2">
              <span aria-hidden="true" className="shrink-0">•</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
        <p className="ui-help mt-3 text-muted-foreground/80">{importantInfoFooter()}</p>
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
