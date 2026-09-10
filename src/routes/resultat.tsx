import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronDown, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { WizardShell } from "@/components/wizard/WizardShell";
import { SectionCard } from "@/components/wizard/fields";
import { Button } from "@/components/ui/button";
import { runBatteryApp } from "@/lib/battery-app";
import { buildResultPresentation } from "@/lib/battery-app/resultPresentation";
import { computeWithoutFcrOptimum } from "@/lib/battery-app/withoutFcrOptimum";
import { computeBatteryAlternatives } from "@/lib/battery-app/capacityAlternatives";
import {
  customerEconomyFromResult,
  maxInvestmentSek,
} from "@/lib/battery-app/customerEconomy";
import {
  importantInfoFooter,
  importantInfoPoints,
  importantInfoTitle,
} from "@/lib/battery-app/importantInfo";

import { ancillaryUnavailableText } from "@/lib/battery-app/ancillaryAvailability";
import { formatMoney } from "@/lib/country-config";
import { currentLanguage, formatNumber, useT } from "@/i18n";
import { reserveProductName } from "@/i18n/labels";
import { PDF_REPORT_AVAILABLE, generatePdfReport } from "@/lib/report/pdfReport";
import { useWizard } from "@/state/wizard";

const RESULT_CARD_TITLE_CLASS = "font-display text-[14px] font-semibold";
const RESULT_CARD_DESCRIPTION_CLASS = "mt-0.5 text-[11px] leading-relaxed";

/** Discrete chapter marker between result sections — sits on the page background. */
function SectionLabel({ children }: { children: string }) {
  return (
    <p className="pt-3 pb-0.5 text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  );
}

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
      outcome.status === "ok"
        ? computeBatteryAlternatives(
            outcome.input,
            outcome.result,
            state.preferences.customerAncillaryShare,
          )
        : [],
    [outcome, state.preferences.customerAncillaryShare],
  );

  const restart = (
    <Button
      variant="cta"
      className="h-10 flex-[2] rounded-[0.75rem] text-[15px] font-bold shadow-cta"
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

  /**
   * Customer economics: the engine total with only the customer's share of the ancillary
   * MARKET value counted. Physics, sizing and the market value itself are untouched.
   */
  const ce = customerEconomyFromResult(outcome.result, state.preferences.customerAncillaryShare);
  const targetYears = state.preferences.targetPaybackYears;
  const maxInvestment = maxInvestmentSek(ce.totalCustomerBenefitSek, targetYears);

  const peakPct =
    g.importPeakBeforeKw > 0 ? (s.peak.peakReductionKw / g.importPeakBeforeKw) * 100 : 0;

  /*
    Report entry point. The report must always be built from `outcome` — the current
    simulation rendered above — never from a cached or recalculated result.
  */
  const pdfReport = (
    <Button
      type="button"
      variant="outline"
      className="h-10 w-full rounded-[0.75rem] text-[15px] font-semibold bg-primary text-primary-foreground"
      disabled={!PDF_REPORT_AVAILABLE}
      aria-disabled={!PDF_REPORT_AVAILABLE}
      onClick={() => {
        if (!PDF_REPORT_AVAILABLE) return;
        void generatePdfReport({
          outcome,
          language: currentLanguage(),
          customerEconomy: ce,
          targetPaybackYears: targetYears,
          alternatives,
        });
      }}
    >
      <FileText className="size-4" />
      {t("results.pdfReport")}
    </Button>
  );

  return (
    <WizardShell
      stepIndex={5}
      title={t("results.title")}
      intro={t("results.intro")}
      titleClassName="font-display text-[24px] font-extrabold tracking-tight"
      eyebrowClassName="text-[11px] font-bold uppercase tracking-widest"
      introClassName="mt-1 text-[11px] leading-relaxed"
      navButtonClassName="text-[15px]"
      footerAction={restart}
      footerExtra={pdfReport}
      compact
    >
      
      {noBattery ? (
        <div className="hero-metric rounded-[1.0625rem] px-3 py-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide">{t("results.noBattery.badge")}</p>
          <p className="mt-1.5 text-[14px] font-semibold">{t("results.noBattery.title")}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-foreground/70">{t("results.noBattery.text")}</p>
        </div>
      ) : (
        <div className="hero-metric rounded-[1.0625rem] px-3 py-3">
          <div
            className="grid items-stretch gap-2"
            style={{ gridTemplateColumns: `repeat(${alternatives.length}, minmax(0, 1fr))` }}
          >
            {alternatives.map((alt) => {
              const main = alt.level === "recommended";
              const label =
                alt.level === "lower"
                  ? t("results.level.lower")
                  : alt.level === "higher"
                    ? t("results.level.higher")
                    : t("results.yourBattery");
              return (
                <div
                  key={alt.level}
                  className={
                    "relative flex flex-col items-center justify-between rounded-[0.75rem] px-2 py-2.5 text-center " +
                    (main
                      ? "z-10 scale-[1.04] bg-background shadow-lg shadow-amber-900/10 ring-1 ring-foreground/10"
                      : "surface-secondary")
                  }
                >
                  {main ? (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap text-background">
                      {t("results.bestChoice")}
                    </span>
                  ) : null}
                  <span
                    className={
                      "text-[11px] font-semibold uppercase tracking-wide " +
                      (main ? "text-foreground" : "text-foreground/75")
                    }
                  >
                    {label}
                  </span>
                  <div className="mt-1.5 text-center">
                    <span
                      className={
                        "tabular-nums " +
                        (main ? "text-[30px] font-extrabold tracking-tight" : "text-[18px] font-bold text-foreground/95")
                      }
                    >
                      {nf(alt.capacityKWh)}
                    </span>
                    <span
                      className={
                        "ml-0.5 font-semibold " +
                        (main ? "text-[16px] text-foreground/70" : "text-[11px] text-foreground/75")
                      }
                    >
                      kWh
                    </span>
                    <p className="text-[11px] font-medium tabular-nums text-foreground/70">
                      {nf(alt.powerKw, 1)} kW
                    </p>
                  </div>
                  <div className="mt-2 w-full border-t border-foreground/10 pt-1.5 text-center">
                    <p
                      className={
                        "font-bold tabular-nums " +
                        (main ? "text-[14px]" : "text-[12px] text-foreground/85")
                      }
                    >
                      {moneyPerYear(alt.customerBenefitSek)}
                    </p>
                  </div>
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
              higher.customerBenefitSek !== null &&
              recommended.customerBenefitSek !== null &&
              higher.customerBenefitSek > recommended.customerBenefitSek;
            const text = higherIsBetter
              ? s.fcr.enabled
                ? t("results.balance.higherAncillary")
                : t("results.balance.higher")
              : t("results.balance.base");
            return (
              <p className="mt-2 text-center text-[11px] leading-relaxed text-foreground/75">{text}</p>
            );
          })()}
        </div>
      )}

      {p.limitedBenefit ? (
        <SectionCard
          compact
          className="surface-primary"
          title={p.limitedBenefitTitle ?? ""}
          description={p.limitedBenefitText ?? ""}
          titleClassName={RESULT_CARD_TITLE_CLASS}
          descriptionClassName={RESULT_CARD_DESCRIPTION_CLASS}
        />
      ) : null}

      {p.showEnergySection || p.showPeakSection ? (
        <SectionCard compact centerTitle className="surface-primary" title={t("results.improvements.title")} titleClassName={RESULT_CARD_TITLE_CLASS}>
          <div className="surface-secondary rounded-[1rem] p-3">
            <div className="space-y-1.5">
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
              {p.showPeakSection ? (
                <BeforeAfter
                  label={t("results.power.peak")}
                  before={kw(g.importPeakBeforeKw)}
                  after={kw(g.importPeakAfterKw)}
                />
              ) : null}
              {e.recoveredCurtailmentKWh > 0 ? (
                <Row
                  label={t("results.energy.recoveredCurtailment")}
                  value={`${kwh(e.recoveredCurtailmentKWh)}${t("units.perYear")}`}
                  className="text-[12px]"
                />
              ) : null}
            </div>
            {(() => {
              const parts: string[] = [];
              if (p.showShiftedSolar) {
                parts.push(
                  t("results.improvements.summaryShifted", {
                    value: `${kwh(e.shiftedSolarKWh)}${t("units.perYear")}`,
                  }),
                );
              }
              if (p.showPeakSection && p.peakChanged) {
                parts.push(
                  t("results.improvements.summaryPeak", { value: `${nf(peakPct, 1)} %` }),
                );
              }
              if (parts.length === 0) {
                return p.showPeakSection && !p.peakChanged ? (
                  <p className="mt-2 border-t border-foreground/10 pt-2 text-[11px] leading-relaxed">
                    {t("results.power.noReduction")}
                  </p>
                ) : null;
              }
              return (
                <p className="mt-2 border-t border-foreground/10 pt-2 text-center text-[11px] leading-relaxed text-foreground/70">
                  {parts.join(" · ")}
                </p>
              );
            })()}
          </div>
        </SectionCard>
      ) : null}

      
      <SectionCard compact centerTitle className="surface-primary" title={t("results.benefit.title")} titleClassName={RESULT_CARD_TITLE_CLASS}>
        {p.noEconomy ? (
          <>
            <p className="text-center text-[30px] font-extrabold tracking-tight tabular-nums">{moneyPerYear(0)}</p>
            <p className="mt-1 text-center text-[11px] leading-relaxed">{t("results.benefit.none")}</p>
          </>
        ) : (
          <>
            <p className="text-center text-[30px] font-extrabold tracking-tight tabular-nums">
              {money(ce.totalCustomerBenefitSek)}
              <span className="ml-1 text-[11px] font-semibold">{t("units.perYear")}</span>
            </p>
            <div className="surface-secondary mt-2 space-y-2 rounded-[1rem] p-3">
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
                <p className="text-[11px] leading-relaxed">{ancillaryNote}</p>
              ) : s.fcr.enabled ? (
                <>
                  {/* The customer's own ancillary compensation is the row that adds to the total. */}
                  <BenefitRow
                    label={t("results.benefit.ancillaryTitle")}
                    hint={t("results.benefit.ancillaryCustomerHint")}
                    value={moneyPerYear(ce.ancillaryCustomerValueSek)}
                  />
                  {/* Background only: how that figure was derived. Collapsed by default. */}
                  <AncillaryDetails
                    rows={[
                      {
                        label: t("results.benefit.ancillaryMarket"),
                        value: moneyPerYear(ce.ancillaryMarketValueSek),
                      },
                      {
                        label: t("results.benefit.ancillaryShare"),
                        value: `${nf(ce.customerAncillaryShare * 100, 0)} %`,
                      },
                    ]}
                    hints={[
                      t("results.benefit.ancillaryShareHint"),
                      t("results.benefit.ancillaryNote"),
                    ]}
                    toggleLabel={t("results.benefit.showCalculation")}
                  />
                </>
              ) : null}
            </div>
          </>
        )}
      </SectionCard>

      
      {maxInvestment === null ? (
        <SectionCard compact className="surface-primary" title={t("results.investment.title")} titleClassName={RESULT_CARD_TITLE_CLASS}>
          <p className="text-[11px] leading-relaxed">{t("payback.investment.none")}</p>
        </SectionCard>
      ) : (
        <section className="ui-card ui-card-compact surface-primary text-center">
          <p className="font-display text-[14px] font-semibold leading-snug">
            {t("results.investment.title")}
          </p>
          <p className="mt-1 text-[30px] font-extrabold tracking-tight tabular-nums">
            {t("results.investment.approx")} {money(maxInvestment)}
          </p>
          <div className="surface-secondary mt-2 rounded-[1rem] p-3 text-left">
            <p className="text-center text-[12px] font-semibold">{t("results.investment.otherTitle")}</p>
            <div className="mt-2 space-y-1">
              {[targetYears - 2, targetYears, targetYears + 2]
                .map((y) => Math.min(20, Math.max(5, y)))
                .filter((y, i, arr) => arr.indexOf(y) === i)
                .map((y) => {
                  const chosen = y === targetYears;
                  return (
                    <div
                      key={y}
                      className={`flex items-baseline justify-between gap-4 rounded-full px-3 py-1.5 text-[12px] font-medium ${
                        chosen ? "bg-background font-semibold shadow-sm" : ""
                      }`}
                    >
                      <span className={chosen ? "" : "text-muted-foreground"}>
                        {t("payback.years", { years: nf(y, 0) })}
                        {chosen ? (
                          <span className="text-muted-foreground font-normal">
                            {" · "}
                            {t("results.investment.yourChoice")}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {money((maxInvestment / targetYears) * y)}
                      </span>
                    </div>
                  );
                })}
            </div>
            <p className="mt-2 text-center text-[11px] leading-relaxed">
              {t("results.investment.explain")}
            </p>
          </div>
        </section>
      )}


      <SectionLabel>{t("results.section.details")}</SectionLabel>

      <details className="ui-card ui-card-compact ui-expandable surface-primary [&>summary::after]:text-[16px]">
        <summary className="text-center text-[14px] font-medium">{t("technical.title")}</summary>

        <div className="mt-2 space-y-2">
          {/* All key figures below come from the FINAL simulation of the recommended system. */}
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
            {/* Reserved power and active services — only when ancillary services are enabled. */}
            {s.fcr.enabled ? (
              <>
                <Row label={t("technical.reservedPower")} value={kw(s.fcr.avgHeldPowerKw, 2)} />
                <Row label={t("technical.selectedServices")} value={productLabel} />
              </>
            ) : null}
          </TechGroup>
        </div>
      </details>

      <details className="ui-card ui-card-compact ui-expandable surface-primary [&>summary::after]:text-[16px]">
        <summary className="text-center text-[14px] font-medium">{importantInfoTitle()}</summary>
        <div className="surface-secondary mt-2 rounded-[1rem] p-3">
          <ul className="space-y-1.5 text-[11px] leading-relaxed">
            {importantInfoPoints().map((point: string) => (
              <li key={point} className="flex gap-2">
                <span aria-hidden="true" className="shrink-0">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] leading-relaxed text-foreground/75">{importantInfoFooter()}</p>
        </div>
      </details>
    </WizardShell>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex items-center justify-between gap-4 text-[14px] font-medium${className ? ` ${className}` : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function AncillaryDetails({
  rows,
  hints,
  toggleLabel,
}: {
  rows: { label: string; value: string }[];
  hints: string[];
  toggleLabel: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 py-1 text-left text-[14px] font-medium text-foreground/75 transition-colors hover:text-foreground"
      >
        <span>{toggleLabel}</span>
        <ChevronDown
          className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <div className="space-y-1 border-t border-foreground/10 pt-2">
          {rows.map((row) => (
            <Row key={row.label} label={row.label} value={row.value} />
          ))}
          {hints.map((hint) => (
            <p key={hint} className="text-[11px] leading-relaxed">
              {hint}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function BenefitRow({ label, hint, value }: { label: string; hint: string; value: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 text-[14px] font-medium">
        <span className="min-w-0 text-muted-foreground">{label}</span>
        <span className="shrink-0 font-semibold tabular-nums">{value}</span>
      </div>
      <p className="mt-0.5 text-[11px] leading-relaxed">{hint}</p>
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
    <div className="flex items-center justify-between gap-4 text-[12px] font-medium">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">
        <span className="text-muted-foreground">{before}</span> → {after}
      </span>
    </div>
  );
}

function TechGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="surface-secondary space-y-2 rounded-[1rem] p-3">
      <p className="text-[11px] font-bold uppercase tracking-widest">{title}</p>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
