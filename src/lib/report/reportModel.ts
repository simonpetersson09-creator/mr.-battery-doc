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
import {
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

export type SourceTag = "user" | "calculated" | "default" | "external";

export interface ReportRow {
  label: string;
  value: string;
  source?: SourceTag;
  hint?: string;
}

export interface ReportBeforeAfterRow {
  label: string;
  before: string;
  after: string;
}

export interface ReportAlternativeItem {
  label: string;
  capacity: string;
  power: string;
  benefit: string;
  highlight: boolean;
}

export type ReportBlock =
  | { kind: "cards"; items: { label: string; value: string }[] }
  | { kind: "rows"; rows: ReportRow[] }
  | { kind: "beforeAfter"; rows: ReportBeforeAfterRow[] }
  | { kind: "alternatives"; items: ReportAlternativeItem[] }
  | { kind: "hero"; label: string; value: string }
  | { kind: "subheading"; text: string }
  | { kind: "text"; text: string }
  | { kind: "note"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "checklist"; items: string[] }
  | { kind: "faq"; items: { q: string; a: string }[] };

export interface ReportSection {
  id: string;
  title: string | null;
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

  const { input, result } = req.outcome;
  const s = result.summary;
  const r = s.recommendation;
  const e = s.energy;
  const g = s.grid;
  const fcr = s.fcr;
  const ce = req.customerEconomy;
  const cfg = result.diagnostics.config;

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
  const maxInvestment = maxInvestmentSek(ce.totalCustomerBenefitSek, targetYears);
  const productLabel = reserveProductName(country, input.site?.marketArea ?? null);
  const yearsLabel = String(req.language) === "sv" ? "år" : "years";

  const sections: ReportSection[] = [];

  /* ============================ 1. SUMMARY ============================ */
  const summaryCards: { label: string; value: string }[] = [
    {
      label: copy.summary.capacity,
      value: capacityAtSearchLimit
        ? atLeast(copy.searchLimit.atLeastCapacity, kwh(capacityKWh))
        : kwh(capacityKWh),
    },
    {
      label: copy.summary.power,
      value: powerAtSearchLimit
        ? atLeast(copy.searchLimit.atLeastPower, kw(powerKw, 1))
        : kw(powerKw, 1),
    },
    { label: copy.summary.benefit, value: perYear(ce.totalCustomerBenefitSek) },
    {
      label: copy.summary.maxInvestment,
      value: maxInvestment === null ? copy.cannotBeCalculated : money(maxInvestment),
    },
  ];

  const improvementRows: ReportBeforeAfterRow[] = [];
  if (hasSolar) {
    improvementRows.push({
      label: copy.summary.selfConsumption,
      before: pct(e.selfConsumptionBeforePct),
      after: pct(e.selfConsumptionAfterPct),
    });
    improvementRows.push({
      label: copy.summary.selfSufficiency,
      before: pct(e.selfSufficiencyBeforePct),
      after: pct(e.selfSufficiencyAfterPct),
    });
  }
  improvementRows.push({
    label: copy.summary.gridImport,
    before: kwh(e.importBeforeKWh),
    after: kwh(e.importAfterKWh),
  });
  if (s.peak.peakReductionKw !== 0 || g.importPeakBeforeKw > 0) {
    improvementRows.push({
      label: copy.summary.peak,
      before: kw(g.importPeakBeforeKw),
      after: kw(g.importPeakAfterKw),
    });
  }

  const summaryParts: string[] = [];
  if (hasSolar && e.shiftedSolarKWh > 0) {
    summaryParts.push(`${kwh(e.shiftedSolarKWh)}${copy.perYear} ${copy.summary.shifted}`);
  }
  if (g.importPeakBeforeKw > 0 && s.peak.peakReductionKw !== 0) {
    const peakPct = (s.peak.peakReductionKw / g.importPeakBeforeKw) * 100;
    summaryParts.push(`${pct(peakPct, 1)} ${copy.summary.peakLower}`);
  }

  sections.push({
    id: "summary",
    title: copy.summary.title,
    pageBreak: false,
    blocks: [
      { kind: "cards", items: summaryCards },
      { kind: "subheading", text: copy.summary.improvements },
      { kind: "beforeAfter", rows: improvementRows },
      ...(summaryParts.length
        ? [{ kind: "note" as const, text: summaryParts.join(" · ") }]
        : []),
    ],
  });

  /* ============================ 2. BENEFIT ============================ */
  const benefitRows: ReportRow[] = [];
  if (ce.energyBenefitSek !== 0) {
    benefitRows.push({
      label: copy.benefit.energy,
      value: perYear(ce.energyBenefitSek),
      hint: hasSolar ? copy.benefit.energyHint : copy.benefit.energyNoSolarHint,
      source: "calculated",
    });
  }
  if (ce.peakBenefitSek !== 0) {
    benefitRows.push({
      label: copy.benefit.peak,
      value: perYear(ce.peakBenefitSek),
      hint: copy.benefit.peakHint,
      source: "calculated",
    });
  }
  if (ancillaryEnabled) {
    benefitRows.push({
      label: copy.benefit.ancillary,
      value: ancillaryPriced
        ? perYear(ce.ancillaryCustomerValueSek)
        : copy.cannotBeCalculated,
      hint: copy.benefit.ancillaryHint,
      source: "calculated",
    });
  }

  sections.push({
    id: "benefit",
    title: copy.benefit.title,
    pageBreak: true,
    blocks: [
      {
        kind: "hero",
        label: copy.benefit.total,
        value:
          ce.totalCustomerBenefitSek === null
            ? copy.cannotBeCalculated
            : perYear(ce.totalCustomerBenefitSek),
      },
      ...(benefitRows.length
        ? [{ kind: "rows" as const, rows: benefitRows }]
        : [{ kind: "text" as const, text: copy.benefit.none }]),
      { kind: "note", text: copy.benefit.note },
    ],
  });

  /* ============================ 3. ANCILLARY ============================ */
  if (ancillaryEnabled) {
    const limitingLabel =
      fcr.limitingFactor === "power"
        ? copy.ancillary.limitingPower
        : fcr.limitingFactor === "energy"
          ? copy.ancillary.limitingEnergy
          : fcr.limitingFactor === "grid"
            ? copy.ancillary.limitingGrid
            : copy.ancillary.limitingNone;

    // Primary customer view: one single power measure — the compensable power.
    const rows: ReportRow[] = [
      { label: copy.ancillary.product, value: productLabel, source: "user" },
      {
        label: copy.ancillary.monetized,
        value: kw(fcr.monetizedPowerKw, 1),
        source: "calculated",
      },
      { label: copy.ancillary.availability, value: pct(fcr.availabilityPct), source: "calculated" },
      { label: copy.ancillary.limiting, value: limitingLabel, source: "calculated" },
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
    ];

    // Transparency only: separate technical power measures.
    const technicalRows: ReportRow[] = [
      { label: copy.ancillary.offered, value: kw(fcr.offeredPowerKw, 1), source: "calculated" },
      {
        label: copy.ancillary.reservable,
        value: kw(fcr.reservablePowerAvgKw, 1),
        source: "calculated",
      },
      { label: copy.ancillary.held, value: kw(fcr.avgHeldPowerKw, 1), source: "calculated" },
    ];

    if (ancillaryPriced) {
      rows.push({
        label: copy.ancillary.marketValue,
        value: perYear(fcr.grossSek),
        source: "external",
      });
      rows.push({
        label: copy.ancillary.share,
        value: pct(ce.customerAncillaryShare * 100),
        source: "default",
      });
      rows.push({
        label: copy.ancillary.customerValue,
        value: perYear(ce.ancillaryCustomerValueSek),
        source: "calculated",
      });
      rows.push({
        label: copy.ancillary.priceBasis,
        value: fcr.historicalReferenceYear
          ? `${copy.ancillary.priceBasisValue} ${fcr.historicalReferenceYear}`
          : copy.ancillary.priceBasisValue,
        source: "external",
      });
    }

    sections.push({
      id: "ancillary",
      title: copy.ancillary.title,
      pageBreak: true,
      blocks: [
        { kind: "rows", rows },
        ...(ancillaryPriced
          ? []
          : [{ kind: "text" as const, text: copy.ancillary.noPriceData }]),
        { kind: "text" as const, text: copy.ancillary.technicalTitle },
        { kind: "rows" as const, rows: technicalRows },
        { kind: "note", text: copy.ancillary.technicalNote },
        { kind: "note", text: copy.ancillary.note },
      ],
    });
  }

  /* ============================ 4. SIZING ============================ */
  const alternativeItems: ReportAlternativeItem[] = req.alternatives.map((a) => ({
    label:
      a.level === "lower"
        ? copy.sizing.lower
        : a.level === "higher"
          ? copy.sizing.higher
          : copy.sizing.yours,
    capacity: kwh(a.capacityKWh),
    power: kw(a.powerKw, 1),
    benefit: a.customerBenefitSek === null ? copy.cannotBeCalculated : perYear(a.customerBenefitSek),
    highlight: a.level === "recommended",
  }));

  sections.push({
    id: "sizing",
    title: copy.sizing.title,
    pageBreak: true,
    blocks: [
      {
        kind: "rows",
        rows: [
          {
            label: copy.sizing.capacity,
            value: capacityAtSearchLimit
              ? atLeast(copy.searchLimit.atLeastCapacity, kwh(capacityKWh))
              : kwh(capacityKWh),
            source: "calculated",
          },
          {
            label: copy.sizing.power,
            value: powerAtSearchLimit
              ? atLeast(copy.searchLimit.atLeastPower, kw(powerKw, 1))
              : kw(powerKw, 1),
            source: "calculated",
          },
          {
            label: copy.sizing.cRate,
            value: capacityKWh > 0 ? num(powerKw / capacityKWh, 2) : copy.notAvailable,
            source: "calculated",
          },
          {
            label: copy.sizing.physicalNeed,
            value: kw(r.physicalPowerNeedKw, 1),
            source: "calculated",
          },
        ],
      },
      ...(alternativeItems.length
        ? [
            { kind: "subheading" as const, text: copy.sizing.alternatives },
            { kind: "alternatives" as const, items: alternativeItems },
          ]
        : []),
      { kind: "text", text: r.explanation },
      { kind: "note", text: copy.sizing.balance },
    ],
  });

  /* ============================ 5. ENERGY ============================ */
  const energyRows: ReportRow[] = [
    { label: copy.energy.load, value: kwh(e.annualLoadKWh), source: "user" },
  ];
  if (hasSolar) energyRows.push({ label: copy.energy.pv, value: kwh(e.annualPvKWh), source: "user" });
  energyRows.push(
    { label: copy.energy.importBefore, value: kwh(e.importBeforeKWh), source: "calculated" },
    { label: copy.energy.importAfter, value: kwh(e.importAfterKWh), source: "calculated" },
  );
  if (hasSolar) {
    energyRows.push(
      { label: copy.energy.exportBefore, value: kwh(e.exportBeforeKWh), source: "calculated" },
      { label: copy.energy.exportAfter, value: kwh(e.exportAfterKWh), source: "calculated" },
      {
        label: copy.energy.selfConsumptionBefore,
        value: pct(e.selfConsumptionBeforePct),
        source: "calculated",
      },
      {
        label: copy.energy.selfConsumptionAfter,
        value: pct(e.selfConsumptionAfterPct),
        source: "calculated",
      },
      {
        label: copy.energy.selfSufficiencyBefore,
        value: pct(e.selfSufficiencyBeforePct),
        source: "calculated",
      },
      {
        label: copy.energy.selfSufficiencyAfter,
        value: pct(e.selfSufficiencyAfterPct),
        source: "calculated",
      },
      { label: copy.energy.shifted, value: kwh(e.shiftedSolarKWh), source: "calculated" },
    );
  }
  energyRows.push(
    { label: copy.energy.gridCharged, value: kwh(e.gridChargedKWh), source: "calculated" },
    { label: copy.energy.losses, value: kwh(e.batteryLossesKWh), source: "calculated" },
    { label: copy.energy.cycles, value: num(e.equivalentFullCycles, 1), source: "calculated" },
  );

  sections.push({
    id: "energy",
    title: copy.energy.title,
    pageBreak: true,
    blocks: [{ kind: "rows", rows: energyRows }],
  });

  /* ============================ 6. GRID ============================ */
  const fuseA = input.site?.mainFuseA ?? cfg.grid.mainFuseA;
  const gridRows: ReportRow[] = [
    {
      label: copy.grid.fuse,
      value: isFiniteNumber(fuseA) ? `${num(fuseA)} A` : copy.notAvailable,
      source: "user",
    },
    { label: copy.grid.connection, value: gridStandardLabel(country), source: "default" },
    {
      label: copy.grid.theoretical,
      value: isFiniteNumber(fuseA) ? kw(theoreticalGridPowerKw(fuseA, country), 1) : copy.notAvailable,
      source: "calculated",
    },
    { label: copy.grid.peakBefore, value: kw(g.importPeakBeforeKw), source: "calculated" },
    { label: copy.grid.peakAfter, value: kw(g.importPeakAfterKw), source: "calculated" },
    { label: copy.grid.reduction, value: kw(s.peak.peakReductionKw), source: "calculated" },
  ];
  if (g.exportCurtailedKWh > 0) {
    gridRows.push({
      label: copy.grid.curtailed,
      value: kwh(g.exportCurtailedKWh),
      source: "calculated",
    });
  }
  gridRows.push({ label: copy.grid.status, value: g.headline, source: "calculated" });

  sections.push({
    id: "grid",
    title: copy.grid.title,
    pageBreak: true,
    blocks: [
      { kind: "rows", rows: gridRows },
      { kind: "note", text: copy.grid.kwKwh },
    ],
  });

  /* ============================ 7. INVESTMENT ============================ */
  const scenarioYears = [targetYears - 2, targetYears, targetYears + 2]
    .map((y) => Math.min(MAX_TARGET_PAYBACK_YEARS, Math.max(MIN_TARGET_PAYBACK_YEARS, y)))
    .filter((y, i, arr) => arr.indexOf(y) === i);

  const investmentBlocks: ReportBlock[] = [];
  if (maxInvestment === null) {
    investmentBlocks.push({ kind: "text", text: copy.investment.unavailable });
  } else {
    investmentBlocks.push({ kind: "hero", label: copy.investment.max, value: money(maxInvestment) });
    investmentBlocks.push({
      kind: "rows",
      rows: [
        {
          label: copy.investment.selected,
          value: `${num(targetYears)} ${yearsLabel}`,
          source: "user",
        },
      ],
    });
    investmentBlocks.push({ kind: "subheading", text: copy.investment.scenarios });
    investmentBlocks.push({
      kind: "cards",
      items: scenarioYears.map((y) => ({
        label: `${num(y)} ${yearsLabel}${
          y === targetYears ? ` · ${copy.investment.yourChoice}` : ""
        }`,
        value: money(maxInvestmentSek(ce.totalCustomerBenefitSek, y)),
      })),
    });
    investmentBlocks.push({ kind: "text", text: copy.investment.explanation });
  }
  investmentBlocks.push({ kind: "note", text: copy.investment.notAQuote });

  sections.push({
    id: "investment",
    title: copy.investment.title,
    pageBreak: true,
    blocks: investmentBlocks,
  });

  /* ============================ 8. ASSUMPTIONS ============================ */
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
          value: isFiniteNumber(fuseA) ? `${num(fuseA)} A` : copy.notAvailable,
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
        {
          label: copy.assumptions.reserveSoc,
          value: pct(battery.reserveSocPct),
          source: "default",
        },
        {
          label: copy.assumptions.maxCycles,
          value: battery.maxCyclesPerYear > 0 ? num(battery.maxCyclesPerYear) : copy.notAvailable,
          source: "default",
        },
      ],
    },
    { kind: "subheading", text: copy.assumptions.economy },
    {
      kind: "rows",
      rows: [
        {
          label: copy.assumptions.importPrice,
          value: isFiniteNumber(economyIn.importEnergyPriceSekPerKWh)
            ? `${money(economyIn.importEnergyPriceSekPerKWh, 2)}/kWh`
            : copy.notAvailable,
          source: "user",
        },
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
        {
          label: copy.assumptions.demandCharge,
          value: isFiniteNumber(s.peak.tariffSekPerKwMonth)
            ? `${money(s.peak.tariffSekPerKwMonth, 2)}/kW`
            : copy.cannotBeCalculated,
          source: s.peak.tariffSource === "user-provided" ? "user" : "default",
        },
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

  /* ============================ 9. RISKS + INSTALLER ============================ */
  sections.push({
    id: "risks",
    title: copy.risks.title,
    pageBreak: true,
    blocks: [
      { kind: "text", text: copy.risks.text },
      { kind: "list", items: copy.risks.items },
    ],
  });

  sections.push({
    id: "installer",
    title: copy.installer.title,
    pageBreak: false,
    blocks: [{ kind: "checklist", items: copy.installer.items }],
  });

  /* ============================ 10. FAQ ============================ */
  sections.push({
    id: "faq",
    title: copy.faq.title,
    pageBreak: true,
    blocks: [
      { kind: "faq", items: copy.faq.items },
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
      totalCustomerBenefitSek: ce.totalCustomerBenefitSek,
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
          for (const c of block.items) out.push(c.label, c.value);
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
