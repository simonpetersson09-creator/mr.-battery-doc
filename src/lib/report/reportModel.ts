/**
 * REPORT MODEL — the PDF report's only data layer.
 *
 * It contains NO physics, NO economics and NO sizing. Every number is read straight from
 * the already simulated result the result page renders (`outcome`), from the customer
 * economics layer (`customerEconomy`) and from the pre-simulated capacity alternatives.
 * Nothing is recomputed here, so the report can never diverge from the app.
 *
 * The output is a plain, serialisable content tree (sections -> blocks -> rows) with all
 * values already formatted. The renderer only turns that tree into pdfmake nodes, which
 * keeps the report fully testable without generating a PDF.
 */

import { numberLocale, type Language } from "@/i18n";
import { getProfile } from "@/lib/consumption-profiles";
import { reserveProductName } from "@/i18n/labels";
import type { BatteryAppResult } from "@/lib/battery-app";
import type { BatteryAlternative } from "@/lib/battery-app/capacityAlternatives";
import type { AncillaryScenario } from "@/lib/battery-app/ancillaryScenario";
import { benefitBreakdown } from "@/lib/battery-app/customerEconomy";
import {
  customerEconomyFromResult,
  clampTargetPaybackYears,
  maxInvestmentSek,
  MAX_TARGET_PAYBACK_YEARS,
  MIN_TARGET_PAYBACK_YEARS,
  type CustomerEconomy,
} from "@/lib/battery-app/customerEconomy";
import { BATTERY_ENGINE_VERSION } from "@/lib/battery-engine";
import {
  formatMoney,
  gridStandardLabel,
  theoreticalGridPowerKw,
  type CountryCode,
} from "@/lib/country-config";
import { getReportCopy, type ReportCopy } from "./copy";
import { ancillaryPlan } from "@/lib/lab/ancillary";

export type SourceTag = "user" | "calculated" | "default" | "external";

export interface ReportRow {
  label: string;
  value: string;
  source?: SourceTag;
  hint?: string;
}

/** Line icon drawn in the small round yellow container of a card. */
export type ReportIcon =
  | "battery"
  | "bolt"
  | "coin"
  | "chart"
  | "house"
  | "leaf"
  | "grid"
  | "flow";

export interface ReportBeforeAfterRow {
  label: string;
  before: string;
  after: string;
  /** Short consumer explanation under the label. */
  hint?: string;
  /** Change between before and after, already formatted (e.g. "+23 procentenheter"). */
  delta?: string;
  /** True when the change is an improvement; rendered in green. */
  improved?: boolean;
  icon?: ReportIcon;
  /** 0-100 values for the progress indicator, when the row is a share. */
  beforePct?: number;
  afterPct?: number;
}

export interface ReportAlternativeItem {
  label: string;
  capacity: string;
  power: string;
  benefit: string;
  highlight: boolean;
}

export type ReportBlock =
  | {
      kind: "cards";
      items: { label: string; value: string; sub?: string; icon?: ReportIcon }[];
    }
  | { kind: "rows"; rows: ReportRow[] }
  | { kind: "beforeAfter"; rows: ReportBeforeAfterRow[] }
  | { kind: "alternatives"; items: ReportAlternativeItem[] }
  /** Value split: one bar per component, already formatted (value + share). */
  | {
      kind: "distribution";
      items: { label: string; value: string; share: string; sharePct: number | null; hint?: string }[];
    }
  | {
      kind: "hero";
      label: string;
      value: string;
      hint?: string;
      icon?: ReportIcon;
      tone?: "yellow" | "green";
    }
  | { kind: "subheading"; text: string; hint?: string }
  | { kind: "text"; text: string }
  | { kind: "note"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "checklist"; items: string[] }
  | { kind: "faq"; items: { q: string; a: string }[] };

export interface ReportSection {
  id: string;
  title: string | null;
  /** Short grey line under the section title. */
  subtitle?: string;
  /** Start the section on a new page. */
  pageBreak: boolean;
  blocks: ReportBlock[];
}

export interface ReportModel {
  copy: ReportCopy;
  title: string;
  brand: string;
  createdISO: string;
  reportId: string;
  engineVersion: string;
  footerText: string;
  sections: ReportSection[];
  /** Key values, for regression tests and for consumers that need the raw numbers. */
  raw: {
    capacityKWh: number;
    powerKw: number;
    totalCustomerBenefitSek: number | null;
    energyBenefitSek: number;
    peakBenefitSek: number;
    ancillaryMarketValueSek: number;
    ancillaryCustomerValueSek: number;
    customerAncillaryShare: number;
    targetPaybackYears: number;
    maxInvestmentSek: number | null;
    ancillaryEnabled: boolean;
    ancillaryPriced: boolean;
    hasSolar: boolean;
  };
}

export interface ReportModelRequest {
  outcome: Extract<BatteryAppResult, { status: "ok" }>;
  language: Language | string;
  customerEconomy: CustomerEconomy;
  targetPaybackYears: number;
  /** Pre-simulated alternatives from the result page. Never re-run inside the report. */
  alternatives: BatteryAlternative[];
  /**
   * MODEL C comparison scenario, exactly as rendered on the result page. It is NOT a
   * recommendation and no candidate may be presented as one.
   */
  ancillaryScenario?: AncillaryScenario | null;
  /** Fixed clock/id for deterministic tests. */
  now?: Date;
  reportId?: string;
}

const BASE32 = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomSuffix(length = 5): string {
  const bytes = new Uint8Array(length);
  const cryptoObj = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (cryptoObj?.getRandomValues) cryptoObj.getRandomValues(bytes);
  else for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  let out = "";
  for (const b of bytes) out += BASE32[b % BASE32.length];
  return out;
}

export function formatDateISO(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** "MBD-20260910-K7QW2" — date plus a random base32 tail, so reports never collide. */
export function createReportId(date: Date): string {
  return `MBD-${formatDateISO(date).replace(/-/g, "")}-${randomSuffix()}`;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export function buildReportModel(req: ReportModelRequest): ReportModel {
  const copy = getReportCopy(String(req.language));
  const now = req.now ?? new Date();
  const reportId = req.reportId ?? createReportId(now);
  const createdISO = formatDateISO(now);

  const input = req.outcome.input;
  /**
   * ANCILLARY-ONLY CASE (no solar, no physical battery need). The ordinary result is a
   * 0 kWh "no battery" run, so every technical row would be empty. The result page shows
   * the technically dimensioned ancillary pair instead — the report must show exactly the
   * same simulated result. Presentation only: nothing is recomputed here.
   */
  const ancScenario = req.ancillaryScenario ?? null;
  const ancSelected = ancScenario?.selected ?? null;
  const ancResult =
    req.outcome.result.summary.recommendation.capacityKWh <= 0 && ancSelected
      ? (ancScenario?.selectedResult ?? null)
      : null;
  const result = ancResult ?? req.outcome.result;
  const s = result.summary;
  const r = s.recommendation;
  const e = s.energy;
  const g = s.grid;
  const fcr = s.fcr;
  /* Same source as the result page: in the ancillary-only case the economics belong to
     the selected pair, not to the 0 kWh run. */
  const ce = ancResult
    ? customerEconomyFromResult(
        ancResult,
        ancScenario?.customerAncillaryShare ?? req.customerEconomy.customerAncillaryShare,
      )
    : req.customerEconomy;
  const cfg = result.diagnostics.config;
  /* A snapshot reopened from the history may predate the stored ancillary config. */
  const servicePlan = cfg.ancillary ? ancillaryPlan(cfg.ancillary) : null;

  const country = (input.site?.country ?? "SE") as CountryCode;
  const locale = numberLocale((req.language === "sv" ? "sv" : "en") as Language);

  /* ---------- formatting (locale for numbers, country for money) ---------- */
  const nf = (v: number, digits = 0) =>
    new Intl.NumberFormat(locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
      .format(v)
      .replace(/\u00a0/g, " ");
  const num = (v: unknown, digits = 0) => (isFiniteNumber(v) ? nf(v, digits) : copy.notAvailable);
  const kwh = (v: unknown) => (isFiniteNumber(v) ? `${nf(v)} kWh` : copy.notAvailable);
  const kw = (v: unknown, d = 2) => (isFiniteNumber(v) ? `${nf(v, d)} kW` : copy.notAvailable);
  const pct = (v: unknown, d = 0) => (isFiniteNumber(v) ? `${nf(v, d)} %` : copy.notAvailable);
  const money = (v: number | null | undefined, digits = 0) =>
    isFiniteNumber(v) ? formatMoney(v, country, digits) : copy.notAvailable;
  const perYear = (v: number | null | undefined) =>
    isFiniteNumber(v) ? `${formatMoney(v, country, 0)}${copy.perYear}` : copy.notAvailable;

  const capacityKWh = r.capacityKWh;
  const powerKw = r.recommendedPowerKw;
  /**
   * SEARCH-BOUNDARY CLASSIFICATION (presentation only). The engine values above are
   * unchanged; only the way they are labelled differs when the analysed range bound the
   * result.
   */
  const capacityAtSearchLimit = capacityKWh > 0 && r.upperLimitReached;
  const powerAtSearchLimit = capacityKWh > 0 && r.powerUpperLimitReached;
  const atLeast = (template: string, value: string) => template.replace("{value}", value);
  const hasSolar = e.annualPvKWh > 0;
  const ancillaryEnabled = fcr.enabled;
  const ancillaryPriced = ancillaryEnabled && fcr.grossSek !== null;
  const targetYears = clampTargetPaybackYears(req.targetPaybackYears);
  const maxInvestment = ancSelected
    ? ancSelected.maxInvestmentSek
    : maxInvestmentSek(ce.totalCustomerBenefitSek, targetYears);
  /* Same total as the result page: in the ancillary-only case it is the selected pair's
     customer benefit, so the headline, the cards and max investment all agree. */
  const totalBenefitSek =
    ancResult && ancSelected ? ancSelected.customerBenefitSek : ce.totalCustomerBenefitSek;
  const productLabel = reserveProductName(country, input.site?.marketArea ?? null);
  const yearsLabel = String(req.language) === "sv" ? "år" : "years";

  const sections: ReportSection[] = [];

  /* Pure ancillary case (no PV, no peak shaving): the property is unchanged, so the
     before/after rows and the energy/peak benefit lines would only show standby noise.
     Presentation only — the totals still come straight from the simulated result. */
  const ancillaryOnly = ancResult !== null;

  /* Same distribution as the result page: shares are computed on the POSITIVE components
     only, so a negative component keeps its SEK value without distorting the percentages. */
  const breakdown = benefitBreakdown(ce);
  const shareOf = (key: "energy" | "peak" | "ancillary"): number | null =>
    breakdown.components.find((c) => c.key === key)?.sharePct ?? null;
  const shareText = (key: "energy" | "peak" | "ancillary"): string => {
    const share = shareOf(key);
    return share === null ? "" : `${num(share)} % ${copy.benefit.shareOfTotal}`;
  };

  /** The value components that actually exist in this calculation, in reading order. */
  const valueComponents: {
    key: "energy" | "peak" | "ancillary";
    label: string;
    sek: number | null;
    hint: string;
  }[] = [];
  if (!ancillaryOnly && ce.energyBenefitSek !== 0) {
    valueComponents.push({
      key: "energy",
      label: copy.benefit.energy,
      sek: ce.energyBenefitSek,
      hint: hasSolar ? copy.benefit.energyHint : copy.benefit.energyNoSolarHint,
    });
  }
  if (!ancillaryOnly && ce.peakBenefitSek !== 0) {
    valueComponents.push({
      key: "peak",
      label: copy.benefit.peak,
      sek: ce.peakBenefitSek,
      hint: copy.benefit.peakHint,
    });
  }
  if (ancillaryEnabled) {
    valueComponents.push({
      key: "ancillary",
      label: copy.benefit.ancillary,
      sek: ancillaryPriced ? ce.ancillaryCustomerValueSek : null,
      hint: copy.benefit.ancillaryHint,
    });
  }

  /* ============ PAGE 1. YOUR BATTERY RECOMMENDATION ============ */
  const capacityText = capacityAtSearchLimit
    ? atLeast(copy.searchLimit.atLeastCapacity, kwh(capacityKWh))
    : kwh(capacityKWh);
  const powerText = powerAtSearchLimit
    ? atLeast(copy.searchLimit.atLeastPower, kw(powerKw, 1))
    : kw(powerKw, 1);

  /** Change between two shares, formatted with a sign, e.g. "+23 procentenheter". */
  const pointsDelta = (before: number, after: number): string => {
    const diff = after - before;
    const sign = diff >= 0 ? "+" : "-";
    return `${sign}${num(Math.abs(diff))} ${copy.summary.percentagePoints}`;
  };
  const kwhDelta = (before: number, after: number): string => {
    const diff = after - before;
    const sign = diff >= 0 ? "+" : "-";
    return `${sign}${kwh(Math.abs(diff))} ${copy.summary.perYearLong}`;
  };

  const improvementRows: ReportBeforeAfterRow[] = [];
  if (hasSolar) {
    improvementRows.push({
      label: copy.summary.selfConsumption,
      hint: copy.summary.selfConsumptionHint,
      icon: "house",
      before: pct(e.selfConsumptionBeforePct),
      after: pct(e.selfConsumptionAfterPct),
      beforePct: e.selfConsumptionBeforePct,
      afterPct: e.selfConsumptionAfterPct,
      delta: pointsDelta(e.selfConsumptionBeforePct, e.selfConsumptionAfterPct),
      improved: e.selfConsumptionAfterPct >= e.selfConsumptionBeforePct,
    });
    improvementRows.push({
      label: copy.summary.selfSufficiency,
      hint: copy.summary.selfSufficiencyHint,
      icon: "leaf",
      before: pct(e.selfSufficiencyBeforePct),
      after: pct(e.selfSufficiencyAfterPct),
      beforePct: e.selfSufficiencyBeforePct,
      afterPct: e.selfSufficiencyAfterPct,
      delta: pointsDelta(e.selfSufficiencyBeforePct, e.selfSufficiencyAfterPct),
      improved: e.selfSufficiencyAfterPct >= e.selfSufficiencyBeforePct,
    });
  }
  if (!ancillaryOnly) {
    const importShare =
      e.importBeforeKWh > 0 ? (e.importAfterKWh / e.importBeforeKWh) * 100 : 0;
    improvementRows.push({
      label: copy.summary.gridImport,
      hint: copy.summary.gridImportHint,
      icon: "grid",
      before: kwh(e.importBeforeKWh),
      after: kwh(e.importAfterKWh),
      afterPct: importShare,
      delta: kwhDelta(e.importBeforeKWh, e.importAfterKWh),
      improved: e.importAfterKWh <= e.importBeforeKWh,
    });
  }

  /* Compact value split on page 1: the same components as page 2, values only. */
  const summaryValueRows: ReportRow[] = valueComponents.map((c) => ({
    label: c.label,
    value: c.sek === null ? copy.cannotBeCalculated : perYear(c.sek),
  }));

  const summaryBlocks: ReportBlock[] = [
    {
      kind: "cards",
      items: [
        { label: copy.summary.capacity, value: capacityText, icon: "battery" },
        { label: copy.summary.power, value: powerText, icon: "bolt" },
        {
          label: copy.summary.benefit,
          value: totalBenefitSek === null ? copy.cannotBeCalculated : perYear(totalBenefitSek),
          icon: "coin",
        },
        {
          label: copy.summary.maxInvestment,
          value: maxInvestment === null ? copy.cannotBeCalculated : money(maxInvestment),
          sub: `${num(targetYears)} ${yearsLabel}`,
          icon: "chart",
        },
      ],
    },
  ];

  if (improvementRows.length) {
    summaryBlocks.push({
      kind: "subheading",
      text: copy.summary.improvements,
      hint: copy.summary.improvementsSubtitle,
    });
    summaryBlocks.push({ kind: "beforeAfter", rows: improvementRows });
  }
  if (hasSolar && e.shiftedSolarKWh > 0) {
    summaryBlocks.push({
      kind: "hero",
      tone: "green",
      icon: "flow",
      label: copy.summary.shiftedSolar,
      value: `${kwh(e.shiftedSolarKWh)}${copy.perYear} ${copy.summary.shifted}`,
      hint: copy.summary.shiftedSolarHint,
    });
  }
  /* The value split has its own section on the next page; page 1 stays a clean
   * one-page overview with the recommendation, the improvements and the shifted solar.
   * Ancillary-only calculations have no value-split page, so they keep both blocks here. */
  if (ancillaryOnly) {
    summaryBlocks.push({ kind: "text", text: copy.ancillaryOnly.summaryExplanation });
    if (summaryValueRows.length > 1) {
      summaryBlocks.push({ kind: "subheading", text: copy.summary.valueSplit });
      summaryBlocks.push({ kind: "rows", rows: summaryValueRows });
    }
    if (ancillaryEnabled && ancillaryPriced) {
      summaryBlocks.push({
        kind: "note",
        text: copy.summary.ancillaryShareNote.replace(
          "{value}",
          perYear(ce.ancillaryCustomerValueSek),
        ),
      });
    }
  }

  sections.push({
    id: "summary",
    title: copy.summary.title,
    subtitle: copy.summary.subtitle,
    pageBreak: false,
    blocks: summaryBlocks,
  });

  /* ============ PAGE 2. WHERE DOES THE VALUE COME FROM? ============
   * Ancillary-only: every component except the reserve compensation is zero, so the
   * page would only repeat the front page figures — it is omitted. */
  if (!ancillaryOnly) {
    sections.push({
      id: "benefit",
      title: copy.benefit.title,
      pageBreak: true,
      blocks: [
        {
          kind: "hero",
          label: copy.benefit.total,
          value: totalBenefitSek === null ? copy.cannotBeCalculated : perYear(totalBenefitSek),
        },
        ...(valueComponents.length
          ? [
              {
                kind: "distribution" as const,
                items: valueComponents.map((c) => ({
                  label: c.label,
                  value: c.sek === null ? copy.cannotBeCalculated : perYear(c.sek),
                  share: shareText(c.key),
                  sharePct: shareOf(c.key),
                  hint: c.hint,
                })),
              },
            ]
          : [{ kind: "text" as const, text: copy.benefit.none }]),
        ...(ancillaryEnabled
          ? [{ kind: "note" as const, text: copy.benefit.historicalBox }]
          : []),
        { kind: "note", text: copy.benefit.note },
      ],
    });
  }

  /* ============ PAGE 3. WHY THIS BATTERY? ============ */
  const alternativeItems: ReportAlternativeItem[] = req.alternatives.map((a) => ({
    label:
      a.level === "lower"
        ? copy.sizing.lower
        : a.level === "higher"
          ? copy.sizing.higher
          : copy.sizing.recommendedLabel,
    capacity: kwh(a.capacityKWh),
    power: kw(a.powerKw, 1),
    benefit: a.customerBenefitSek === null ? copy.cannotBeCalculated : perYear(a.customerBenefitSek),
    highlight: a.level === "recommended",
  }));

  /* Ancillary-only: the same three simulated candidates the result page shows. */
  const candidateItems: ReportAlternativeItem[] =
    ancSelected && ancScenario && ancScenario.candidates.length > 1
      ? ancScenario.candidates.map((c, index) => {
          const selectedIndex = ancScenario.candidates.indexOf(ancSelected);
          return {
            label:
              index < selectedIndex
                ? copy.sizing.lower
                : index > selectedIndex
                  ? copy.sizing.higher
                  : copy.ancillaryScenario.technicalTitle,
            capacity: kwh(c.capacityKWh),
            power: kw(c.powerKw, 1),
            benefit: perYear(c.customerBenefitSek),
            highlight: index === selectedIndex,
          };
        })
      : [];

  const sizingBlocks: ReportBlock[] = [];
  if (ancillaryOnly) {
    sizingBlocks.push({ kind: "subheading", text: copy.ancillaryOnly.sizingProposal });
    sizingBlocks.push({
      kind: "rows",
      rows: [
        { label: copy.sizing.capacity, value: capacityText, source: "calculated" },
        { label: copy.sizing.power, value: powerText, source: "calculated" },
        {
          label: copy.assumptions.socWindow,
          value: `${num(cfg.battery.minSocPct)}–${num(cfg.battery.maxSocPct)} %`,
          source: "default",
        },
        {
          label: copy.assumptions.efficiency,
          value: pct(cfg.battery.roundTripEfficiency * 100, 0),
          source: "default",
        },
      ],
    });
    if (candidateItems.length) {
      sizingBlocks.push({ kind: "text", text: copy.ancillaryOnly.comparisonIntro });
      sizingBlocks.push({ kind: "alternatives", items: candidateItems });
      sizingBlocks.push({ kind: "note", text: copy.ancillaryOnly.comparisonExplanation });
    }
    sizingBlocks.push({ kind: "note", text: copy.ancillaryOnly.sizingExplanation });
  } else {
    if (alternativeItems.length) {
      sizingBlocks.push({ kind: "subheading", text: copy.sizing.alternatives });
      sizingBlocks.push({ kind: "alternatives", items: alternativeItems });
    }
    sizingBlocks.push({ kind: "text", text: copy.sizing.consumerExplanation });
    sizingBlocks.push({
      kind: "subheading",
      text: copy.sizing.powerTitle.replace("{value}", powerText),
    });
    /* The recommended power only exceeds the energy-handling power when the reserve
       product is part of the calculation — never stated otherwise. */
    const basePower = r.basePowerForEnergyKw;
    if (ancillaryEnabled && isFiniteNumber(basePower) && basePower > 0 && basePower < powerKw) {
      sizingBlocks.push({
        kind: "text",
        text: copy.sizing.powerAncillaryExplanation.replace("{value}", kw(basePower, 1)),
      });
    }
    sizingBlocks.push({ kind: "note", text: copy.terms.kwKwh });
  }
  if (capacityAtSearchLimit) sizingBlocks.push({ kind: "note", text: copy.searchLimit.capacityNote });
  if (powerAtSearchLimit) sizingBlocks.push({ kind: "note", text: copy.searchLimit.powerNote });
  if (capacityAtSearchLimit && powerAtSearchLimit)
    sizingBlocks.push({ kind: "note", text: copy.searchLimit.bothNote });

  sections.push({
    id: "sizing",
    title: copy.sizing.title,
    pageBreak: true,
    blocks: sizingBlocks,
  });

  /* ============ PAGE 4. ENERGY BEFORE AND AFTER ============
   * Ancillary-only: the page would only list the yearly load plus standby losses,
   * which the assumptions page already covers — omitted. */
  if (!ancillaryOnly) {
    const energyBeforeAfter: ReportBeforeAfterRow[] = [
      {
        label: copy.summary.gridImport,
        before: kwh(e.importBeforeKWh),
        after: kwh(e.importAfterKWh),
      },
    ];
    if (hasSolar) {
      energyBeforeAfter.push(
        {
          label: copy.energy.exportLabel,
          before: kwh(e.exportBeforeKWh),
          after: kwh(e.exportAfterKWh),
        },
        {
          label: copy.summary.selfConsumption,
          before: pct(e.selfConsumptionBeforePct),
          after: pct(e.selfConsumptionAfterPct),
        },
        {
          label: copy.summary.selfSufficiency,
          before: pct(e.selfSufficiencyBeforePct),
          after: pct(e.selfSufficiencyAfterPct),
        },
      );
    }

    const energyRows: ReportRow[] = [
      { label: copy.energy.load, value: kwh(e.annualLoadKWh), source: "user" },
      ...(hasSolar
        ? [{ label: copy.energy.pv, value: kwh(e.annualPvKWh), source: "user" as const }]
        : []),
      ...(hasSolar
        ? [{ label: copy.energy.shifted, value: kwh(e.shiftedSolarKWh), source: "calculated" as const }]
        : []),
      { label: copy.energy.gridCharged, value: kwh(e.gridChargedKWh), source: "calculated" },
      { label: copy.energy.losses, value: kwh(e.batteryLossesKWh), source: "calculated" },
      {
        label: copy.energy.cycles,
        value: num(e.equivalentFullCycles, 1),
        source: "calculated",
      },
      ...(s.peak.peakReductionKw > 0
        ? [
            {
              label: copy.grid.reduction,
              value: kw(s.peak.peakReductionKw, 1),
              source: "calculated" as const,
            },
          ]
        : []),
      ...(g.exportCurtailedKWh > 0
        ? [
            {
              label: copy.grid.curtailed,
              value: kwh(g.exportCurtailedKWh),
              source: "calculated" as const,
            },
          ]
        : []),
    ];

    sections.push({
      id: "energy",
      title: copy.energy.title,
      pageBreak: true,
      blocks: [
        { kind: "beforeAfter", rows: energyBeforeAfter },
        { kind: "rows", rows: energyRows },
        ...(hasSolar
          ? [
              { kind: "note" as const, text: copy.terms.selfConsumption },
              { kind: "note" as const, text: copy.terms.selfSufficiency },
            ]
          : []),
        ...(s.peak.peakReductionKw > 0
          ? [{ kind: "note" as const, text: copy.terms.peakShaving }]
          : []),
      ],
    });
  }

  /* ============ PAGE 5. ANCILLARY SERVICES ============ */
  if (ancillaryEnabled) {
    const priceBasisText = fcr.historicalReferenceYear
      ? `${copy.ancillary.priceBasisValue} ${fcr.historicalReferenceYear}`
      : copy.ancillary.priceBasisValue;

    // What a homeowner needs first: service, compensation, price basis, share, power.
    const mainRows: ReportRow[] = [
      { label: copy.ancillary.product, value: productLabel, source: "user" },
      {
        label: copy.ancillary.customerValue,
        value: ancillaryPriced ? perYear(ce.ancillaryCustomerValueSek) : copy.cannotBeCalculated,
        source: "calculated",
      },
      {
        label: copy.ancillary.priceBasis,
        value: ancillaryPriced ? priceBasisText : copy.cannotBeCalculated,
        source: "external",
      },
      {
        label: copy.assumptions.share,
        value: pct(ce.customerAncillaryShare * 100),
        source: "default",
      },
      { label: copy.ancillary.nominalPower, value: powerText, source: "calculated" },
    ];

    // Transparency only: the separate technical power and energy measures.
    const technicalRows: ReportRow[] = [
      { label: copy.ancillary.offered, value: kw(fcr.offeredPowerKw, 1), source: "calculated" },
      {
        label: copy.ancillary.reservable,
        value: kw(fcr.reservablePowerAvgKw, 1),
        source: "calculated",
      },
      { label: copy.ancillary.held, value: kw(fcr.avgHeldPowerKw, 1), source: "calculated" },
      {
        label: copy.ancillary.reservedEnergy,
        value: kwh(fcr.reservedEnergyKWh),
        source: "calculated",
      },
      {
        label: copy.ancillary.reservedHours,
        value: `${num(fcr.reservedHours)} h`,
        source: "calculated",
      },
      { label: copy.ancillary.availability, value: pct(fcr.availabilityPct), source: "calculated" },
      ...(ancillaryPriced
        ? [
            {
              label: copy.ancillary.marketValue,
              value: perYear(fcr.grossSek),
              source: "external" as const,
            },
          ]
        : []),
    ];

    sections.push({
      id: "ancillary",
      title: copy.ancillary.title,
      pageBreak: true,
      blocks: [
        { kind: "rows", rows: mainRows },
        ...(ancillaryPriced ? [] : [{ kind: "text" as const, text: copy.ancillary.noPriceData }]),
        { kind: "subheading", text: copy.ancillary.technicalTitle },
        { kind: "rows", rows: technicalRows },
        {
          kind: "note",
          text: ancillaryOnly
            ? copy.ancillaryOnly.servicePowerExplanation
            : copy.ancillary.technicalNote,
        },
        { kind: "note", text: copy.ancillary.note },
        { kind: "note", text: copy.ancillary.historicalWarning },
      ],
    });
  }

  /* ============ PAGE 6. MAXIMUM INVESTMENT AND PAYBACK TIME ============ */
  const scenarioYears = [targetYears - 2, targetYears, targetYears + 2]
    .map((y) => Math.min(MAX_TARGET_PAYBACK_YEARS, Math.max(MIN_TARGET_PAYBACK_YEARS, y)))
    .filter((y, i, arr) => arr.indexOf(y) === i);

  const investmentBlocks: ReportBlock[] = [];
  if (maxInvestment === null) {
    investmentBlocks.push({ kind: "text", text: copy.investment.unavailable });
  } else {
    investmentBlocks.push({
      kind: "hero",
      label: copy.investment.headline,
      value: money(maxInvestment),
    });
    investmentBlocks.push({
      kind: "text",
      text: copy.investment.paybackText
        .replace("{years}", `${num(targetYears)} ${yearsLabel}`)
        .replace("{amount}", money(maxInvestment)),
    });
    investmentBlocks.push({ kind: "subheading", text: copy.investment.scenarios });
    investmentBlocks.push({
      kind: "cards",
      items: scenarioYears.map((y) => ({
        label: `${num(y)} ${yearsLabel}${y === targetYears ? ` · ${copy.investment.yourChoice}` : ""}`,
        value: money(maxInvestmentSek(totalBenefitSek, y)),
      })),
    });
    investmentBlocks.push({
      kind: "note",
      text: ancillaryOnly ? copy.ancillaryOnly.investmentExplanation : copy.investment.explanation,
    });
  }

  /* How much of the calculation depends on the reserve compensation. Both numbers are
     existing components — nothing is recomputed and no new economic model is used. */
  if (ancillaryEnabled && ancillaryPriced && totalBenefitSek !== null) {
    const withoutAncillarySek = totalBenefitSek - ce.ancillaryCustomerValueSek;
    investmentBlocks.push({ kind: "subheading", text: copy.investment.ancillaryDependencyTitle });
    investmentBlocks.push({
      kind: "rows",
      rows: [
        {
          label: copy.investment.withAncillary,
          value: perYear(totalBenefitSek),
          source: "calculated",
        },
        {
          label: copy.investment.withoutAncillary,
          value: perYear(withoutAncillarySek),
          source: "calculated",
        },
      ],
    });
    investmentBlocks.push({ kind: "note", text: copy.investment.dependencyNote });
  }

  investmentBlocks.push({
    kind: "note",
    text: ancillaryOnly ? copy.ancillaryOnly.investmentNotAQuote : copy.investment.notAQuote,
  });

  sections.push({
    id: "investment",
    title: copy.investment.title,
    pageBreak: true,
    blocks: investmentBlocks,
  });

  /* ============================ PAGE 7. ASSUMPTIONS ============================ */
  const battery = cfg.battery;
  const economyIn = input.economy ?? {};
  const profileId = input.consumption?.profile ?? cfg.consumption.shape;
  const profile = getProfile(profileId)?.name ?? profileId;

  const assumptionBlocks: ReportBlock[] = [
    { kind: "subheading", text: copy.assumptions.property },
    {
      kind: "rows",
      rows: [
        { label: copy.assumptions.annualConsumption, value: kwh(e.annualLoadKWh), source: "user" },
        ...(hasSolar
          ? [
              {
                label: copy.assumptions.solarProduction,
                value: kwh(e.annualPvKWh),
                source: "user" as const,
              },
            ]
          : []),
        {
          label: copy.assumptions.consumptionProfile,
          value: typeof profile === "string" ? profile : copy.notAvailable,
          source: "user",
        },
        {
          label: copy.assumptions.fuse,
          value: isFiniteNumber(input.site?.mainFuseA)
            ? `${num(input.site?.mainFuseA as number)} A`
            : copy.notAvailable,
          source: "user",
        },
        { label: copy.assumptions.connection, value: gridStandardLabel(country), source: "default" },
      ],
    },
    { kind: "subheading", text: copy.assumptions.battery },
    {
      kind: "rows",
      rows: [
        { label: copy.assumptions.capacity, value: kwh(capacityKWh), source: "calculated" },
        { label: copy.assumptions.power, value: kw(powerKw, 1), source: "calculated" },
        {
          label: copy.assumptions.efficiency,
          value: pct(battery.roundTripEfficiency * 100, 0),
          source: "default",
        },
        {
          label: copy.assumptions.socWindow,
          value: `${num(battery.minSocPct)} – ${num(battery.maxSocPct)} %`,
          source: "default",
        },
        ...(ancillaryOnly && servicePlan
          ? [
              {
                label: copy.assumptions.serviceSocUp,
                value: `${num(servicePlan.serviceMinSocPct)} – ${num(battery.maxSocPct)} %`,
                source: "default" as const,
              },
              {
                label: copy.assumptions.serviceSocDown,
                value: `${num(battery.minSocPct)} – ${num(servicePlan.serviceMaxSocPct)} %`,
                source: "default" as const,
              },
            ]
          : [
              {
                label: copy.assumptions.reserveSoc,
                value: pct(battery.reserveSocPct),
                source: "default" as const,
              },
            ]),
        ...(!ancillaryOnly && battery.maxCyclesPerYear > 0
          ? [
              {
                label: copy.assumptions.maxCycles,
                value: num(battery.maxCyclesPerYear),
                source: "default" as const,
              },
            ]
          : []),
      ],
    },
    { kind: "subheading", text: copy.assumptions.economy },
    {
      kind: "rows",
      rows: [
        ...(!ancillaryOnly
          ? [
              {
                label: copy.assumptions.importPrice,
                value: isFiniteNumber(economyIn.importEnergyPriceSekPerKWh)
                  ? `${money(economyIn.importEnergyPriceSekPerKWh, 2)}/kWh`
                  : copy.notAvailable,
                source: "user" as const,
              },
            ]
          : []),
        ...(hasSolar
          ? [
              {
                label: copy.assumptions.exportPrice,
                value: isFiniteNumber(economyIn.exportEnergyValueSekPerKWh)
                  ? `${money(economyIn.exportEnergyValueSekPerKWh, 2)}/kWh`
                  : copy.notAvailable,
                source: "user" as const,
              },
            ]
          : []),
        ...(ancillaryOnly
          ? []
          : [
              {
                label: copy.assumptions.demandCharge,
                value: isFiniteNumber(s.peak.tariffSekPerKwMonth)
                  ? `${money(s.peak.tariffSekPerKwMonth, 2)}/kW`
                  : copy.cannotBeCalculated,
                source: (s.peak.tariffSource === "user-provided" ? "user" : "default") as
                  | "user"
                  | "default",
              },
            ]),
        {
          label: copy.assumptions.payback,
          value: `${num(targetYears)} ${yearsLabel}`,
          source: "user",
        },
      ],
    },
  ];

  if (ancillaryEnabled) {
    assumptionBlocks.push({ kind: "subheading", text: copy.assumptions.ancillary });
    assumptionBlocks.push({
      kind: "rows",
      rows: [
        { label: copy.assumptions.market, value: productLabel, source: "user" },
        {
          label: copy.ancillary.priceBasis,
          value: ancillaryPriced
            ? fcr.historicalReferenceYear
              ? `${copy.ancillary.priceBasisValue} ${fcr.historicalReferenceYear}`
              : copy.ancillary.priceBasisValue
            : copy.cannotBeCalculated,
          source: "external",
        },
        {
          label: copy.assumptions.share,
          value: pct(ce.customerAncillaryShare * 100),
          source: "default",
        },
      ],
    });
  }

  assumptionBlocks.push({ kind: "note", text: copy.assumptions.horizonNote });

  sections.push({
    id: "assumptions",
    title: copy.assumptions.title,
    pageBreak: true,
    blocks: assumptionBlocks,
  });

  /* ============ PAGE 8. IMPORTANT TO KNOW (risks + installer + about) ============
   * The old standalone FAQ page is gone: the term explanations now sit on the page
   * where the term is actually used. */
  sections.push({
    id: "about",
    title: copy.about.pageTitle,
    pageBreak: true,
    blocks: [
      { kind: "subheading", text: copy.risks.title },
      { kind: "text", text: copy.risks.text },
      { kind: "list", items: ancillaryOnly ? copy.ancillaryOnly.risks : copy.risks.items },
      { kind: "subheading", text: copy.installer.title },
      {
        kind: "checklist",
        items: ancillaryOnly ? copy.ancillaryOnly.installer : copy.installer.items,
      },
      { kind: "subheading", text: copy.about.title },
      { kind: "list", items: copy.about.items },
      {
        kind: "note",
        text: `${copy.reportIdLabel}: ${reportId} · ${copy.created}: ${createdISO} · ${copy.engineVersionLabel}: ${BATTERY_ENGINE_VERSION}`,
      },
    ],
  });

  return {
    copy,
    title: copy.title,
    brand: copy.brand,
    createdISO,
    reportId,
    engineVersion: BATTERY_ENGINE_VERSION,
    footerText: `${copy.brand}   ·   ${reportId}`,
    sections,
    raw: {
      capacityKWh,
      powerKw,
      /* Same number the customer sees: in the ancillary-only case the selected pair's
         customer benefit, otherwise the engine total with the share applied. */
      totalCustomerBenefitSek: totalBenefitSek,
      energyBenefitSek: ce.energyBenefitSek,
      peakBenefitSek: ce.peakBenefitSek,
      ancillaryMarketValueSek: ce.ancillaryMarketValueSek,
      ancillaryCustomerValueSek: ce.ancillaryCustomerValueSek,
      customerAncillaryShare: ce.customerAncillaryShare,
      targetPaybackYears: targetYears,
      maxInvestmentSek: maxInvestment,
      ancillaryEnabled,
      ancillaryPriced,
      hasSolar,
    },
  };
}

/** Every visible string in the model — used by tests to scan for broken output. */
export function collectReportText(model: ReportModel): string[] {
  const out: string[] = [model.title, model.brand, model.reportId, model.footerText];
  for (const section of model.sections) {
    if (section.title) out.push(section.title);
    for (const block of section.blocks) {
      switch (block.kind) {
        case "cards":
          for (const c of block.items) out.push(c.label, c.value, ...(c.sub ? [c.sub] : []));
          break;
        case "rows":
          for (const row of block.rows) {
            out.push(row.label, row.value);
            if (row.hint) out.push(row.hint);
          }
          break;
        case "beforeAfter":
          for (const row of block.rows) out.push(row.label, row.before, row.after);
          break;
        case "alternatives":
          for (const a of block.items) out.push(a.label, a.capacity, a.power, a.benefit);
          break;
        case "distribution":
          for (const d of block.items) {
            out.push(d.label, d.value, d.share);
            if (d.hint) out.push(d.hint);
          }
          break;
        case "hero":
          out.push(block.label, block.value);
          break;
        case "subheading":
        case "text":
        case "note":
          out.push(block.text);
          break;
        case "list":
        case "checklist":
          out.push(...block.items);
          break;
        case "faq":
          for (const item of block.items) out.push(item.q, item.a);
          break;
      }
    }
  }
  return out;
}
