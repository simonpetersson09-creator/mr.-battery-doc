import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { ChevronDown, FileText, Pencil } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { buildSnapshot, snapshotOutcome } from "@/lib/history/snapshot";
import { loadSnapshot, saveSnapshot } from "@/lib/history/store";
import { WizardShell } from "@/components/wizard/WizardShell";
import { SectionCard } from "@/components/wizard/fields";
import { Button } from "@/components/ui/button";
import { CountUpValue } from "@/components/CountUp";
import {
  clearCalculationCache,
  getCalculation,
  getDerivedAnalyses,
} from "@/lib/access/calculationCache";
import { adjustmentCreditsRemaining } from "@/lib/access/entitlements";
import { useAccess } from "@/state/access";
import { buildResultPresentation } from "@/lib/battery-app/resultPresentation";
import {
  ancillaryAlternatives,
  bestAncillaryCandidate,
  computeAncillaryScenario,
} from "@/lib/battery-app/ancillaryScenario";
import {
  benefitBreakdown,
  customerEconomyFromResult,
  maxInvestmentSek,
} from "@/lib/battery-app/customerEconomy";
import type {
  BenefitBreakdown,
  BenefitComponentKey,
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
import { scheduleAppReview } from "@/lib/rating/inAppReview";
import { track } from "@/lib/analytics/track";
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
  /** `?calc=<id>` opens a stored, already purchased calculation from the history. */
  validateSearch: (search: Record<string, unknown>): { calc?: string } => {
    const calc = search["calc"];
    return typeof calc === "string" && calc.length > 0 ? { calc } : {};
  },
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
  const { state: liveState, update: updateWizard } = useWizard();
  const navigate = useNavigate();
  const access = useAccess();
  /**
   * HISTORY MODE. `?calc=<id>` renders a stored snapshot of an already purchased
   * calculation. Nothing is simulated again: inputs, summary, alternatives and
   * customer economy all come from the immutable snapshot.
   */
  const historyId = Route.useSearch().calc;
  /** True while a PDF report is being built — blocks a second, duplicate build. */
  const [pdfBusy, setPdfBusy] = useState(false);
  const snapshot = useMemo(() => (historyId ? loadSnapshot(historyId) : null), [historyId]);
  const missingSnapshot = Boolean(historyId) && snapshot === null;
  /** In history mode the wizard state of that calculation replaces the current one. */
  const state = snapshot ? snapshot.wizard : liveState;
  /**
   * Currency comes from the chosen country through the central currency layer — the
   * result page never assumes SEK, and it never follows the UI language. Every amount
   * here is already in local currency (reserve revenue is converted from EUR inside
   * the economics layer).
   */
  const countryCode = state.grid.country;
  useEffect(() => {
    track("result_view", { country: countryCode, detail: historyId ? "history" : "new" });
  }, [countryCode, historyId]);
  const money = (v: number | null) => (v === null ? "—" : formatMoney(v, countryCode, 0));
  const moneyPerYear = (v: number | null) =>
    v === null ? "—" : `${formatMoney(v, countryCode, 0)}${t("units.perYear")}`;
  /*
    Single integration point: wizard -> adapter -> frozen Battery Engine.
    The calculation ran when the user left step 5; this reads the cached outcome
    for the same inputs, so a purchase never triggers a re-run.
    In history mode the engine is not touched at all.
  */
  const calculation = useMemo(
    () =>
      snapshot
        ? { id: snapshot.calculationId, outcome: snapshotOutcome(snapshot) }
        : getCalculation(liveState),
    [snapshot, liveState],
  );
  const outcome = calculation.outcome;
  /**
   * Genuine FCR-off counterfactual (full capacity + power sizing with FCR switched off).
   * Only needed while the reserve product is actually part of the recommendation.
   */
  /* Both comparison layers come from the one-slot cache, so re-entering the result
     page (purchase, back navigation) never re-runs them. Identical inputs/arguments. */
  const derived = useMemo(
    () => (snapshot ? null : getDerivedAnalyses(liveState)),
    [snapshot, liveState],
  );
  const withoutFcr = snapshot ? snapshot.withoutFcr : (derived?.withoutFcr ?? null);
  /** Comparison layer: nearest simulated capacity step below/above the recommendation. */
  const alternatives = snapshot ? snapshot.alternatives : (derived?.alternatives ?? []);

  /**
   * Ancillary-only case: the physical sizing finds no battery need (no solar, no peak
   * shaving), but the reserve market still pays for standing by. The best-paying size
   * is then shown in the ordinary cards — same layout, no extra section.
   */
  const ancillaryScenario = useMemo(
    () =>
      outcome.status === "ok"
        ? computeAncillaryScenario(
            outcome.input,
            outcome.result,
            state.preferences.customerAncillaryShare,
            state.preferences.targetPaybackYears,
          )
        : null,
    [
      outcome,
      state.preferences.customerAncillaryShare,
      state.preferences.targetPaybackYears,
    ],
  );
  const ancillaryBest = useMemo(() => bestAncillaryCandidate(ancillaryScenario), [ancillaryScenario]);
  /** The three cards at the top: ordinary alternatives, or the ancillary-only ones. */
  const shownAlternatives = ancillaryBest ? ancillaryAlternatives(ancillaryScenario) : alternatives;


  /**
   * Every purchased calculation is snapshotted once, so it can be reopened from
   * Settings -> History without a new simulation. Storing it can never change
   * what is rendered.
   */
  const purchasedNow = access.hydrated && access.canOpenResult(calculation.id);
  /**
   * In-app rating: ask only after an unlocked, successfully rendered result —
   * never mid-wizard. Eligibility (once per version, native only) is enforced
   * inside scheduleAppReview; Apple applies its own 3-per-year cap on top.
   */
  useEffect(() => {
    if (purchasedNow && outcome.status === "ok") scheduleAppReview();
    // One shot per result view is enough; identity of the inputs is irrelevant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchasedNow, outcome.status]);
  useEffect(() => {
    if (snapshot || !purchasedNow || outcome.status !== "ok") return;
    const ce = customerEconomyFromResult(outcome.result, state.preferences.customerAncillaryShare);
    saveSnapshot(
      buildSnapshot({
        calculationId: calculation.id,
        wizard: state,
        outcome,
        alternatives,
        withoutFcr,
        customerEconomy: ce,
        maxInvestment: maxInvestmentSek(
          ce.totalCustomerBenefitSek,
          state.preferences.targetPaybackYears,
        ),
        // Presentation only: in the ancillary-only flow the cards, the benefit and
        // the max investment on this page come from the ancillary scenario, so the
        // history list must show those exact numbers too.
        ...(ancillaryBest
          ? {
              headlineOverride: {
                capacityKWh: ancillaryBest.capacityKWh,
                powerKw: ancillaryBest.powerKw,
                annualCustomerBenefit: ancillaryBest.customerBenefitSek,
                maxInvestment: ancillaryBest.maxInvestmentSek,
              },
            }
          : {}),
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, purchasedNow, calculation.id, outcome, ancillaryBest]);



  /* A history link whose local snapshot is gone or unreadable must never crash
     the result page — it explains itself and leads back. */
  if (missingSnapshot) {
    return (
      <WizardShell
        stepIndex={5}
        title={t("history.title")}
        intro={t("history.missing.intro")}
      >
        <SectionCard title={t("history.missing.title")} description={t("history.missing.text")} />
      </WizardShell>
    );
  }

  if (outcome.status === "incomplete") {
    return (
      <WizardShell
        stepIndex={5}
        title={t("results.title")}
        intro={t("results.incomplete.intro")}
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
      >
        <SectionCard
          title={t("results.error.title")}
          description={t("results.error.description")}
        />
      </WizardShell>
    );
  }

  /*
    ACCESS GATE. Central entitlement rule: active Premium, or this exact
    calculation unlocked by a one-off purchase. No control here opens the
    result without one.
  */
  if (!access.canOpenResult(calculation.id)) {
    /* A history entry never triggers a new payment: if the purchase right can no
       longer be verified we say so instead of opening the paywall for an old
       calculation. */
    if (historyId) {
      return (
        <WizardShell
          stepIndex={5}
          title={t("history.title")}
          intro={t("history.locked.intro")}
        >
          <SectionCard title={t("history.locked.title")} description={t("history.locked.text")} />
        </WizardShell>
      );
    }
    // No intermediate "unlock" button — the paywall comes up automatically.
    return <Navigate to="/betalvagg" replace />;
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

  /* An ancillary-only recommendation replaces the "no battery" answer. */
  const noBattery = p.noBattery && !ancillaryBest;

  /* Countries without a verified historical price dataset get an explicit
     "not available" note instead of a fabricated 0 ancillary revenue. */
  const ancillaryNote = state.strategies.fcrDUp
    ? ancillaryUnavailableText(state.grid.country, state.grid.marketArea)
    : null;

  /**
   * Customer economics: the engine total with only the customer's share of the ancillary
   * MARKET value counted. Physics, sizing and the market value itself are untouched.
   */
  /* History mode reuses the stored economics as they were at purchase time. */
  const ce = snapshot
    ? snapshot.customerEconomy
    : customerEconomyFromResult(outcome.result, state.preferences.customerAncillaryShare);
  const targetYears = state.preferences.targetPaybackYears;
  const maxInvestment = ancillaryBest
    ? ancillaryBest.maxInvestmentSek
    : snapshot
      ? snapshot.headline.maxInvestment
      : maxInvestmentSek(ce.totalCustomerBenefitSek, targetYears);

  const peakPct =
    g.importPeakBeforeKw > 0 ? (s.peak.peakReductionKw / g.importPeakBeforeKw) * 100 : 0;




  /*
    Report entry point. The report must always be built from `outcome` — the current
    simulation rendered above — never from a cached or recalculated result.
  */
  /* PDF follows the SAME entitlement as the result page. */
  const pdfAllowed = PDF_REPORT_AVAILABLE && access.canOpenResult(calculation.id);
  /*
    Building the report is asynchronous, so the button must stay disabled while it runs.
    Without this a fast double-tap would start two PDF builds and hand the user two
    downloads/share sheets for the same calculation.
  */
  const pdfEnabled = pdfAllowed && !pdfBusy;
  /*
    A purchased result is final: plain "Back" into the wizard is misleading, so it is
    replaced by an explicit "Edit inputs" action with the remaining adjustment count.
    Re-running unchanged inputs still costs nothing — only a changed calculation does.
  */
  const adjustmentCredits = adjustmentCreditsRemaining(access.entitlements);
  const editInputs = (
    <Button
      type="button"
      variant="outline"
      className="h-10 flex-1 rounded-[0.75rem] text-[15px] font-semibold"
      onClick={() => {
        clearCalculationCache();
        if (snapshot) updateWizard(() => snapshot.wizard);
        void navigate({ to: "/nat" });
      }}
    >
      <Pencil className="size-3.5 shrink-0" />
      {t("history.edit")}
    </Button>
  );
  const editNote = (
    <p className="text-center text-[12px] font-medium leading-relaxed text-muted-foreground">
      {access.premiumActive
        ? t("history.adjustmentsUnlimited")
        : t("history.adjustmentsLeft", { count: adjustmentCredits })}
    </p>
  );

  const pdfReport = (
    <Button
      type="button"
      variant="outline"
      className="h-10 w-full rounded-[0.75rem] text-[15px] font-semibold bg-primary text-primary-foreground"
      disabled={!pdfEnabled}
      aria-disabled={!pdfEnabled}
      onClick={() => {
        if (!pdfEnabled) return;
        track("pdf_download", { country: countryCode });
        setPdfBusy(true);
        void generatePdfReport({
          outcome,
          language: currentLanguage(),
          customerEconomy: ce,
          targetPaybackYears: targetYears,
          alternatives: shownAlternatives,
          ancillaryScenario,
        })
          .then(() => {
            // A saved report is the strongest positive moment in the app, so we
            // ask for the App Store rating here too. Eligibility (native only,
            // once per version, 30-day gap) is enforced in scheduleAppReview.
            scheduleAppReview();
          })
          .finally(() => setPdfBusy(false));
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
      footerExtra={pdfReport}
      backSlot={editInputs}
      navNote={editNote}
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
            style={{ gridTemplateColumns: `repeat(${shownAlternatives.length}, minmax(0, 1fr))` }}
          >
            {shownAlternatives.map((alt) => {
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
                      ? "z-10 scale-[1.04] bg-background shadow-lg shadow-amber-900/10 ring-1 ring-foreground/10 recommend-glow-once"
                      : "surface-secondary")
                  }
                >
                  {main ? (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap text-accent-foreground shadow-sm">
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
                    {main && p.capacityAtSearchLimit ? (
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground/70">
                        {t("results.searchLimit.atLeast", { value: "" }).trim()}
                      </p>
                    ) : null}
                    <span
                      className={
                        "tabular-nums " +
                        (main ? "text-[30px] font-extrabold tracking-tight" : "text-[18px] font-bold text-foreground/95")
                      }
                    >
                      {main ? (
                        <CountUpValue value={alt.capacityKWh} format={(v) => nf(v)} />
                      ) : (
                        <CountUpValue value={alt.capacityKWh} format={(v) => nf(v)} duration={900} />
                      )}
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
                      {main && p.powerAtSearchLimit
                        ? p.powerDisplay
                        : `${nf(alt.powerKw, 1)} kW`}
                    </p>
                  </div>
                  <div className="mt-2 w-full border-t border-foreground/10 pt-1.5 text-center">
                    <p
                      className={
                        "font-bold tabular-nums " +
                        (main ? "text-[14px]" : "text-[12px] text-foreground/85")
                      }
                    >
                      {main && alt.customerBenefitSek !== null ? (
                        <CountUpValue
                          value={alt.customerBenefitSek}
                          format={(v) => moneyPerYear(v)}
                        />
                      ) : alt.customerBenefitSek === null ? (
                        moneyPerYear(null)
                      ) : (
                        <CountUpValue
                          value={alt.customerBenefitSek}
                          format={(v) => moneyPerYear(v)}
                          duration={900}
                        />
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          {p.capacityAtSearchLimit || p.powerAtSearchLimit ? (
            <div className="surface-secondary mt-3 space-y-1 rounded-[0.75rem] px-3 py-2.5 text-left">
              {p.capacityLimitNote ? (
                <p className="text-[10px] leading-snug text-foreground/75">{p.capacityLimitNote}</p>
              ) : null}
              {p.powerLimitNote ? (
                <p className="text-[10px] leading-snug text-foreground/75">{p.powerLimitNote}</p>
              ) : null}
              {p.bothLimitsNote ? (
                <p className="text-[10px] font-semibold leading-snug">{p.bothLimitsNote}</p>
              ) : null}
            </div>
          ) : null}
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

      {/* Pure ancillary flow (no PV): nothing in the property changes, so the
          before/after card would only repeat unchanged values — hide it. */}
      {(p.showEnergySection || p.showPeakSection) && !(ancillaryBest && !p.peakChanged) ? (
        <SectionCard compact centerTitle className="surface-primary" title={t("results.improvements.title")} titleClassName={RESULT_CARD_TITLE_CLASS}>
          <div className="surface-secondary rounded-[1rem] p-3">
            <div className="space-y-1.5">
              {p.showSelfConsumption ? (
                <BeforeAfter
                  label={t("results.energy.selfConsumption")}
                  before={<CountUpValue value={e.selfConsumptionBeforePct} format={(v) => pct(v)} />}
                  after={<CountUpValue value={e.selfConsumptionAfterPct} format={(v) => pct(v)} />}
                />
              ) : null}
              {p.showSelfSufficiency ? (
                <BeforeAfter
                  label={t("results.energy.selfSufficiency")}
                  before={<CountUpValue value={e.selfSufficiencyBeforePct} format={(v) => pct(v)} />}
                  after={<CountUpValue value={e.selfSufficiencyAfterPct} format={(v) => pct(v)} />}
                />
              ) : null}
              {p.showImport ? (
                <BeforeAfter
                  label={t("results.energy.gridImport")}
                  before={<CountUpValue value={e.importBeforeKWh} format={(v) => kwh(v)} />}
                  after={<CountUpValue value={e.importAfterKWh} format={(v) => kwh(v)} />}
                />
              ) : null}
              {p.showPeakSection ? (
                <BeforeAfter
                  label={t("results.power.peak")}
                  before={<CountUpValue value={g.importPeakBeforeKw} format={(v) => kw(v)} />}
                  after={<CountUpValue value={g.importPeakAfterKw} format={(v) => kw(v)} />}
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
        {ancillaryBest ? (
          <>
            {/* Ancillary-only: the benefit is the reserve compensation for the best size. */}
            <p className="text-center text-[26px] font-extrabold tracking-tight tabular-nums">
              <CountUpValue value={ancillaryBest.customerBenefitSek ?? 0} format={(v) => money(v)} />
              <span className="ml-1 text-[11px] font-semibold">{t("units.perYear")}</span>
            </p>
            <p className="mt-1 text-center text-[11px] leading-relaxed text-foreground/70">
              {t("results.benefit.priceBasis")}
            </p>
            <div className="surface-secondary mt-1.5 space-y-1.5 rounded-[1rem] p-2.5">
              <BenefitRow
                label={t("results.benefit.ancillaryTitle")}
                hint={t("results.benefit.ancillaryCustomerHint")}
                value={<CountUpValue value={ancillaryBest.ancillaryCustomerValueSek ?? 0} format={(v) => moneyPerYear(v)} />}
              />
              <AncillaryDetails
                rows={[
                  {
                    label: t("results.benefit.ancillaryMarket"),
                    value: moneyPerYear(ancillaryBest.ancillaryMarketValueSek),
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
            </div>
            {/* PV=0 flow: the size is a TECHNICAL proposal, never "the most profitable".
                The background text stays collapsed by default. */}
            <details className="ui-expandable mt-2 rounded-[1rem] border border-foreground/10 p-2">
              <summary className="text-[11px] font-semibold leading-relaxed">
                {t("results.ancillaryScenario.technicalTitle")}
              </summary>
              <p className="mt-1 text-[11px] leading-relaxed text-foreground/70">
                {t("results.ancillaryScenario.technicalHint")}
              </p>
              {ancillaryScenario?.ancillaryDriven ? (
                <p className="mt-2 text-[11px] leading-relaxed text-foreground/70">
                  {t("results.ancillaryScenario.driven")}
                </p>
              ) : null}
              <p className="mt-2 text-[11px] leading-relaxed text-foreground/70">
                {t("results.ancillaryScenario.note")}
              </p>
            </details>
          </>
        ) : p.noEconomy ? (
          <>
            <p className="text-center text-[26px] font-extrabold tracking-tight tabular-nums">{moneyPerYear(0)}</p>
            <p className="mt-1 text-center text-[11px] leading-relaxed">{t("results.benefit.none")}</p>
          </>
        ) : (
          <>
            <p className="text-center text-[26px] font-extrabold tracking-tight tabular-nums">
              {ce.totalCustomerBenefitSek === null
                ? money(null)
                : <CountUpValue value={ce.totalCustomerBenefitSek} format={(v) => money(v)} />}
              <span className="ml-1 text-[11px] font-semibold">{t("units.perYear")}</span>
            </p>
            {/* MODEL RULE: never present a non-positive benefit as an economic advantage. */}
            {ce.totalCustomerBenefitSek !== null && ce.totalCustomerBenefitSek <= 0 ? (
              <p className="mt-1 text-center text-[11px] leading-relaxed">
                {t("results.benefit.nonPositive")}
              </p>
            ) : null}
            {ancillaryNote ? (
              <p className="mt-1.5 text-center text-[11px] leading-relaxed">{ancillaryNote}</p>
            ) : null}
            {/* Share of the ANNUAL BENEFIT per engine component. Presentation only. */}
            <BenefitDistribution
              breakdown={benefitBreakdown(ce)}
              label={(key) =>
                key === "energy"
                  ? p.hasSolar
                    ? t("results.benefit.energyWithSolar")
                    : t("results.benefit.energyNoSolar")
                  : key === "peak"
                    ? t("results.benefit.peak")
                    : t("results.benefit.ancillaryTitle")
              }
              title={t("results.breakdown.title")}
              totalLabel={t("results.breakdown.total")}
              money={money}
              moneyPerYear={moneyPerYear}
              nf={nf}
            />
            {s.fcr.enabled && !ancillaryNote ? (
              <div className="mt-2">
                <AncillaryDetails
                  rows={[
                    ...(p.fcrMonetizedPowerKw !== null
                      ? [
                          {
                            label: t("results.benefit.ancillaryPower"),
                            value: kw(p.fcrMonetizedPowerKw, 1),
                          },
                        ]
                      : []),
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
              </div>
            ) : null}
          </>
        )}
      </SectionCard>

      {maxInvestment === null ? (
        <SectionCard compact className="surface-primary" title={t("results.investment.title")} titleClassName={RESULT_CARD_TITLE_CLASS}>
          <p className="text-[11px] leading-relaxed">{t("payback.investment.none")}</p>
        </SectionCard>
      ) : (
        <section className="ui-card ui-card-compact surface-primary text-center">
          <p className="font-display text-[13px] font-semibold leading-snug">
            {t("results.investment.title")}
          </p>
          <p className="mt-0.5 text-[24px] font-extrabold tracking-tight tabular-nums">
            {t("results.investment.approx")}{" "}
            <CountUpValue value={maxInvestment} format={(v) => money(v)} />
          </p>
          <div className="surface-secondary mt-1.5 rounded-[1rem] p-2.5 text-left">
            <p className="text-center text-[12px] font-semibold">{t("results.investment.otherTitle")}</p>
            <div className="mt-1.5 space-y-1">
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
                        <CountUpValue value={(maxInvestment / targetYears) * y} format={(v) => money(v)} />
                      </span>
                    </div>
                  );
                })}
            </div>
            <p className="mt-1.5 text-center text-[11px] leading-relaxed">
              {t("results.investment.explain")}
            </p>
          </div>
        </section>
      )}


      <SectionLabel>{t("results.section.details")}</SectionLabel>

      <details className="ui-card ui-card-compact ui-expandable surface-primary [&>summary]:relative [&>summary]:justify-center [&>summary::after]:absolute [&>summary::after]:right-3 [&>summary::after]:text-[16px]">
        <summary className="text-center text-[14px] font-medium">{t("technical.title")}</summary>

        <div className="mt-2 space-y-2">
          {/* All key figures below come from the FINAL simulation of the recommended system. */}
          {/* Pure ancillary flow: the battery stands by, so a cycle count says nothing. */}
          {ancillaryBest ? null : (
            <TechGroup title={t("technical.usageGroup")}>
              <Row label={t("technical.cycles")} value={nf(e.equivalentFullCycles, 1)} />
            </TechGroup>
          )}

          <TechGroup title={t("technical.powerGroup")}>
            {/* PV=0 flow: the technical pair comes from the ancillary scenario, whose
                simulated run carries the real capacity/power — never the 0 kWh base run. */}
            <Row
              label={t("technical.recommendedPower")}
              value={kw(ancillaryBest ? ancillaryBest.powerKw : p.recommendedPowerKw, 1)}
            />
            {ancillaryBest ? null : (
              <>
                {/* The 95 % base power for energy handling — NOT the legacy 99 % need. */}
                <Row
                  label={t("technical.basePowerForEnergy")}
                  value={kw(p.basePowerForEnergyKw, 1)}
                />
                {p.ancillaryRaisedPowerKw !== null ? (
                  <p className="ui-help">{t("technical.ancillaryRaisedNote")}</p>
                ) : null}
                {p.powerCapNote ? <p className="ui-help">{p.powerCapNote}</p> : null}
                {p.fcrHeldPowerKw !== null ? (
                  <Row label={t("technical.heldPower")} value={kw(p.fcrHeldPowerKw, 2)} />
                ) : null}
              </>
            )}
            <Row
              label={t("technical.cRate")}
              value={`${nf(ancillaryBest ? ancillaryBest.cRate : p.systemCRate, 2)} C`}
            />
            {(() => {
              const batteryCfg = ancillaryBest
                ? ancillaryScenario?.selectedResult?.diagnostics.config.battery
                : outcome.result.diagnostics.config.battery;
              return batteryCfg ? (
                <>
                  <Row
                    label={t("technical.socWindow")}
                    value={`${nf(batteryCfg.minSocPct, 0)}–${nf(batteryCfg.maxSocPct, 0)} %`}
                  />
                  <Row
                    label={t("technical.roundTrip")}
                    value={`${nf(batteryCfg.roundTripEfficiency * 100, 0)} %`}
                  />
                </>
              ) : null;
            })()}
            {/* Reserved power and active services — ancillary flow or enabled services. */}
            {ancillaryBest || s.fcr.enabled ? (
              <>
                <Row
                  label={t("technical.reservedPower")}
                  value={kw(
                    ancillaryBest
                      ? (ancillaryBest.paidUpKw + ancillaryBest.paidDownKw) / 2
                      : s.fcr.offeredPowerKw,
                    2,
                  )}
                />
                {!ancillaryBest && p.fcrReservableAvgPowerKw !== null ? (
                  <>
                    <Row
                      label={t("technical.reservablePower")}
                      value={kw(p.fcrReservableAvgPowerKw, 2)}
                    />
                    <p className="ui-help">{t("technical.reservableNote")}</p>
                  </>
                ) : null}
                {!ancillaryBest ? (
                  <p className="ui-help">{t("technical.reservationNote")}</p>
                ) : null}
                <Row label={t("technical.selectedServices")} value={productLabel} />
              </>
            ) : null}
          </TechGroup>

          {/* INFORMATION ONLY: simulated higher product steps. Never a recommendation. */}
          {p.ancillaryPotential ? (
            <TechGroup title={t("technical.potentialTitle")}>
              <p className="ui-help">
                {t("technical.potentialNote", {
                  max: nf(p.ancillaryPotential.maxAnalysedPowerKw, 0),
                })}
              </p>
              <Row
                label={t("technical.potentialColumn")}
                value={`${t("technical.basePowerForEnergy")}: ${kw(
                  p.ancillaryPotential.basePowerKw,
                  1,
                )}`}
              />
              {p.ancillaryPotential.steps.map((st) => (
                <Row
                  key={st.powerKw}
                  label={kw(st.powerKw, 1)}
                  value={`+${money(st.extraAnnualBenefitSek)}`}
                />
              ))}
            </TechGroup>
          ) : null}
        </div>
      </details>

      <details className="ui-card ui-card-compact ui-expandable surface-primary [&>summary]:relative [&>summary]:justify-center [&>summary::after]:absolute [&>summary::after]:right-3 [&>summary::after]:text-[16px]">
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
        className="flex w-full items-center justify-between gap-2 py-1 text-left text-[12px] font-medium text-foreground/70 transition-colors hover:text-foreground"
      >
        <span>{toggleLabel}</span>
        <ChevronDown
          className={`size-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <div className="space-y-1 border-t border-foreground/10 pt-1.5">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-4 text-[12px] font-medium"
            >
              <span className="min-w-0 text-muted-foreground">{row.label}</span>
              <span className="shrink-0 font-semibold tabular-nums">{row.value}</span>
            </div>
          ))}
          {hints.map((hint) => (
            <p key={hint} className="text-[10px] leading-relaxed">
              {hint}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function BenefitRow({ label, hint, value }: { label: string; hint: string; value: React.ReactNode }) {
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
  before: React.ReactNode;
  after: React.ReactNode;
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

function BenefitDistribution({
  breakdown,
  label,
  title,
  totalLabel,
  money,
  moneyPerYear,
  nf,
}: {
  breakdown: BenefitBreakdown;
  label: (key: BenefitComponentKey) => string;
  title: string;
  totalLabel: string;
  money: (v: number | null) => string;
  moneyPerYear: (v: number | null) => string;
  nf: (v: number, d?: number) => string;
}) {
  const rows = breakdown.components.filter((c) => c.sek !== 0);
  if (rows.length === 0 || breakdown.positiveBenefitTotalSek <= 0) return null;
  const tone: Record<BenefitComponentKey, string> = {
    ancillary: "bg-primary",
    energy: "bg-primary/60",
    peak: "bg-primary/30",
  };
  const positives = rows.filter((c) => c.sharePct !== null);
  return (
    <div className="surface-secondary mt-1.5 rounded-[1rem] p-2.5">
      <p className="text-center text-[12px] font-semibold">{title}</p>
      <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-foreground/10">
        {positives.map((c) => (
          <div key={c.key} className={tone[c.key]} style={{ width: `${c.sharePct}%` }} />
        ))}
      </div>
      <div className="mt-2 space-y-1">
        {rows
          .slice()
          .sort((a, b) => b.sek - a.sek)
          .map((c) => (
            <div key={c.key} className="flex items-baseline justify-between gap-3 text-[12px]">
              <span className="flex items-center gap-1.5">
                <span className={`inline-block h-2 w-2 rounded-full ${tone[c.key]}`} />
                {label(c.key)}
              </span>
              <span className="font-semibold tabular-nums">
                <CountUpValue value={c.sek} format={(v) => moneyPerYear(v)} />
                {c.sharePct === null ? "" : ` \u00b7 ${nf(c.sharePct, 0)} %`}
              </span>
            </div>
          ))}
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-foreground/10 pt-1.5 text-[12px] font-semibold">
        <span>{totalLabel}</span>
        <span className="tabular-nums">{breakdown.totalCustomerBenefitSek === null ? money(null) : <CountUpValue value={breakdown.totalCustomerBenefitSek} format={(v) => money(v)} />}</span>
      </div>
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
