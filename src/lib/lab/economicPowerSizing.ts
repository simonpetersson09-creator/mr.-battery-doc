/**
 * Battery Engine — OPERATING-BENEFIT POWER SIZING (layer on top of the verified physics).
 *
 * Capacity is chosen exactly as before (sweet spot -> peak floor -> ancillary floor) and
 * is NEVER touched here. This module only answers one question:
 *
 *   Given the already chosen capacity, which SYSTEM POWER gives the highest CALCULATED
 *   ANNUAL OPERATING BENEFIT with the selected strategies?
 *
 *   totalOperatingBenefitSek = energyBenefitSek + peakBenefitSek + fcrRevenueSek
 *
 * There is no product cost, no CAPEX, no payback and no ROI in this objective. The
 * product cost layer (`productCost.ts`) is parked for a future version: it is reported
 * when a caller supplies figures, but it never selects the recommended system power.
 *
 * Each candidate runs through the SAME dispatch, the SAME peak shaving, the SAME FCR
 * physical gate and the SAME 10 % FCR reservation sweep. No extrapolation, no shortcut.
 *
 * Power concepts are kept strictly apart:
 *   physicalPowerNeedKw     — what the property physically needs
 *   productPowerKw          — the rating physical sizing lands on
 *   actualDispatchPowerKw   — the highest power the dispatch actually used
 *   operatingOptimalPowerKw — the power with the highest annual operating benefit
 */

import {
  evaluateOperatingEconomy,
  optimizeFcrReservation,
  SWEDISH_OPERATING_ECONOMY,
} from "./operatingEconomy";
import type { FcrOptimisationResult, OperatingEconomyConfig, OperatingEconomyResult } from "./operatingEconomy";
import { buildSeries } from "./simulate";
import type { LabConfig, SimResult, TimeSeries } from "./types";
import { productCost } from "./productCost";
import type { ProductCostBreakdown, ProductCostConfig } from "./productCost";
import { productCostConfig } from "./productCost";

/**
 * Candidate ceiling as a C-rate. This is a MAXIMUM CANDIDATE RANGE, never a minimum
 * required C-rate: physical sizing is still free to land far below it (e.g. 25 kWh at
 * 5 kW = 0.20 C).
 */
export const DEFAULT_MAX_PRODUCT_C_RATE = 0.5;

/** Two candidates within this many SEK/year are equivalent; the LOWER kW then wins. */
export const POWER_TIE_TOLERANCE_SEK = 25;

/* ------------------------------------------------------------------ *
 * FCR market realism (reported, never a blocker)
 * ------------------------------------------------------------------ */

/**
 * Parameters that would turn a HISTORICAL FCR-D up gross revenue into a customer
 * realistic net revenue. Every one defaults to null = unverified. In v1 a missing value
 * does NOT block the recommendation: the historical 2025 scenario is used and the result
 * is explicitly flagged as historical, never as a forecast or guaranteed income.
 */
export interface FcrMarketRealismConfig {
  aggregatorRevenueSharePct: number | null;
  marketParticipationPct: number | null;
  technicalAvailabilityPct: number | null;
  downtimePct: number | null;
  activationEnergySek: number | null;
}

export const EMPTY_FCR_MARKET_REALISM: FcrMarketRealismConfig = {
  aggregatorRevenueSharePct: null,
  marketParticipationPct: null,
  technicalAvailabilityPct: null,
  downtimePct: null,
  activationEnergySek: null,
};

export function fcrMarketRealismGaps(cfg: FcrMarketRealismConfig): string[] {
  const gaps: string[] = [];
  if (cfg.aggregatorRevenueSharePct === null) gaps.push("aggregatorRevenueSharePct");
  if (cfg.marketParticipationPct === null) gaps.push("marketParticipationPct");
  if (cfg.technicalAvailabilityPct === null) gaps.push("technicalAvailabilityPct");
  if (cfg.downtimePct === null) gaps.push("downtimePct");
  if (cfg.activationEnergySek === null) gaps.push("activationEnergySek");
  return gaps;
}

/** Historical gross -> realistic net. Null unless EVERY realism parameter is verified. */
export function realisticFcrNetSek(
  grossSek: number | null,
  cfg: FcrMarketRealismConfig,
): number | null {
  if (grossSek === null) return null;
  if (fcrMarketRealismGaps(cfg).length > 0) return null;
  const participation = cfg.marketParticipationPct! / 100;
  const availability = cfg.technicalAvailabilityPct! / 100;
  const uptime = 1 - cfg.downtimePct! / 100;
  const aggregator = 1 - cfg.aggregatorRevenueSharePct! / 100;
  return grossSek * participation * availability * uptime * aggregator + cfg.activationEnergySek!;
}

/* ------------------------------------------------------------------ *
 * Candidate generation
 * ------------------------------------------------------------------ */

/**
 * Product power alternatives for one capacity.
 *
 *  lower bound = the power the PHYSICAL sizing already recommends (never below it)
 *  upper bound = capacityKWh * maxProductCRate (default 0.5 C)
 *  members     = every configured product step inside the range,
 *                plus the exact C-rate ceiling when it is not already a step,
 *                plus the physical power itself (always a candidate).
 *
 * Example, 25 kWh with physical 5 kW and 0.5 C: 5, 7.5, 10, 12.5 kW.
 */
export function maxProductStepKw(productStepsKw: number[]): number {
  const steps = productStepsKw.filter((s) => s > 0);
  return steps.length > 0 ? Math.max(...steps) : 0;
}

export function buildPowerCandidates(
  capacityKWh: number,
  physicalProductPowerKw: number,
  productStepsKw: number[],
  maxProductCRate: number = DEFAULT_MAX_PRODUCT_C_RATE,
): number[] {
  if (!(capacityKWh > 0) || !(physicalProductPowerKw > 0)) return [];
  const round = (v: number) => Math.round(v * 1000) / 1000;
  /**
   * PRODUCT CEILING. Candidates are real product levels the customer can actually buy.
   * The C-rate ceiling is a candidate RANGE, never a product level of its own: when it
   * lands above the largest product step it is clamped to that step. The physical need
   * is a separate concept and is never clamped.
   */
  const productCapKw = maxProductStepKw(productStepsKw);
  const rawCeiling = maxProductCRate > 0 ? round(capacityKWh * maxProductCRate) : 0;
  const ceiling = productCapKw > 0 ? Math.min(rawCeiling, productCapKw) : rawCeiling;
  const lowest = productCapKw > 0 ? Math.min(physicalProductPowerKw, productCapKw) : physicalProductPowerKw;
  const out = new Set<number>([round(lowest)]);
  for (const step of productStepsKw)
    if (step > physicalProductPowerKw && step <= ceiling + 1e-9) out.add(round(step));
  if (ceiling > physicalProductPowerKw + 1e-9) out.add(ceiling);
  return [...out].sort((a, b) => a - b);
}

/* ------------------------------------------------------------------ *
 * Per-candidate simulation
 * ------------------------------------------------------------------ */

export interface PowerCandidateRun {
  result: SimResult;
  economy: OperatingEconomyResult;
  fcrOptimisation: FcrOptimisationResult | null;
  config: LabConfig;
}

/**
 * One fully simulated system power: FCR reservation sweep (10 % grid) followed by the
 * final simulation and the operating economy. Identical sequence to the main engine run,
 * so a candidate result is bit-for-bit what the engine would report for that power.
 */
export function simulateAtPower(
  cfg: LabConfig,
  series: TimeSeries,
  capacityKWh: number,
  powerKw: number,
  econ: OperatingEconomyConfig,
  optimiseFcrReservation: boolean,
): PowerCandidateRun {
  let fcrOptimisation: FcrOptimisationResult | null = null;
  let runCfg = cfg;
  if (cfg.strategies.ancillaryServices && optimiseFcrReservation) {
    fcrOptimisation = optimizeFcrReservation(cfg, capacityKWh, powerKw, econ, undefined, series);
    runCfg = {
      ...cfg,
      strategies: {
        ...cfg.strategies,
        ancillaryServices: fcrOptimisation.recommendedPowerKw > 0,
      },
      ancillary: {
        ...cfg.ancillary,
        enabled: fcrOptimisation.recommendedPowerKw > 0,
        offeredPowerKw: fcrOptimisation.recommendedPowerKw,
      },
    };
  }
  const { result, economy } = evaluateOperatingEconomy(runCfg, capacityKWh, powerKw, econ, series);
  return { result, economy, fcrOptimisation, config: runCfg };
}

/* ------------------------------------------------------------------ *
 * Result model
 * ------------------------------------------------------------------ */

export interface PowerOption {
  powerKw: number;
  cRate: number;
  /** Highest battery AC power the dispatch actually used, kW. */
  actualDispatchPowerKw: number;
  fcrOfferedPowerKw: number;
  fcrReservablePowerKw: number;
  fcrHeldPowerKw: number;
  fcrMonetizedPowerKw: number;
  energyBenefitSek: number;
  peakBenefitSek: number | null;
  /** Historical 2025 FCR-D up revenue used in the objective. */
  fcrRevenueSek: number;
  /** Same figure, kept explicit as the HISTORICAL gross. */
  fcrGrossSek: number | null;
  /** Gross adjusted for verified market realism. Null while realism data is missing. */
  fcrRealisticNetSek: number | null;
  /** energy + peak + FCR gross. Reported total, NOT the choice objective. */
  totalOperatingBenefitSek: number;
  /** Alias kept for existing consumers; identical to totalOperatingBenefitSek. */
  operatingBenefitSek: number;
  /**
   * energy + peak + ancillary CUSTOMER value. MODEL RULE: the power level is chosen on
   * this, so raw FCR gross alone can never drive a higher power level.
   */
  annualCustomerBenefitSek: number;

  /** Difference in total operating benefit against the NEXT LOWER candidate. */
  deltaVsPreviousKw: number | null;
  /** PARKED product-cost reporting. Never part of the objective. Null by default. */
  capexSek: number | null;
  annualisedProductCostSek: number | null;
  cost: ProductCostBreakdown;
  selected: boolean;
  /** True for the power today's physical sizing recommends. */
  physicalSizingChoice: boolean;
  run: PowerCandidateRun;
}

export type EconomicPowerSizingStatus = "complete" | "partial" | "incomplete";

export interface EconomicPowerSizingResult {
  capacityKWh: number;
  physicalPowerNeedKw: number;
  productPowerKw: number;
  maxProductCRate: number;
  /** Largest product power level that can actually be bought, kW. */
  maxProductPowerKw: number;
  /** True when the physical need is above the largest available product level. */
  productCapBound: boolean;
  candidatePowersKw: number[];
  options: PowerOption[];
  /** Highest annual operating benefit. THE v1 recommendation. */
  operatingOptimalPowerKw: number | null;
  /** The power the engine recommends = operatingOptimalPowerKw when available. */
  recommendedPowerKw: number;
  /** PARKED for a future full cost model. Always null in v1. */
  economicallyOptimalPowerKw: null;
  /** True when historical FCR-D up revenue influenced the chosen system power. */
  recommendationUsesHistoricalFcr: boolean;
  status: EconomicPowerSizingStatus;
  reason: string;
  objective: string;
  tieToleranceSek: number;
  productCostGaps: string[];
  fcrMarketGaps: string[];
  notes: string[];
}

export interface EconomicPowerSizingInput {
  cfg: LabConfig;
  series?: TimeSeries;
  capacityKWh: number;
  /** Physical need from `sizePower`, kW. */
  physicalPowerNeedKw: number;
  /** Product power today's physical sizing recommends, kW. The lowest candidate. */
  productPowerKw: number;
  econ?: OperatingEconomyConfig;
  /** PARKED. Reported only; never used to pick the recommended system power. */
  cost?: ProductCostConfig;
  fcrMarket?: FcrMarketRealismConfig;
  optimiseFcrReservation?: boolean;
  maxProductCRate?: number | undefined;
  /**
   * Optional cache of already simulated candidate powers. Physics is deterministic, so
   * re-scoring the SAME simulations is exact.
   */
  runCache?: Map<number, PowerCandidateRun>;
}

const OBJECTIVE_TEXT =
  "totalOperatingBenefit = energinytta + minskad effektkostnad + FCR-D upp-intäkt (historiskt 2025-scenario). " +
  "Ingen produktkostnad, CAPEX, payback eller ROI ingår. Kapaciteten är låst av den fysiska " +
  "dimensioneringen; endast systemeffekten optimeras.";

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Operating-benefit power sizing for one already chosen capacity.
 *
 * Picks the system power with the highest calculated annual operating benefit. Ties
 * within POWER_TIE_TOLERANCE_SEK go to the LOWER system power, so a trivial difference
 * never buys extra kW.
 */
export function runEconomicPowerSizing(
  input: EconomicPowerSizingInput,
): EconomicPowerSizingResult {
  const {
    cfg,
    capacityKWh,
    physicalPowerNeedKw,
    productPowerKw,
    cost = productCostConfig(),
    econ = SWEDISH_OPERATING_ECONOMY,
    fcrMarket = EMPTY_FCR_MARKET_REALISM,
    optimiseFcrReservation: optimiseFcr = true,
    maxProductCRate = DEFAULT_MAX_PRODUCT_C_RATE,
  } = input;
  const series = input.series ?? buildSeries(cfg);

  const candidatePowersKw = buildPowerCandidates(
    capacityKWh,
    productPowerKw,
    cfg.powerSizing.productStepsKw,
    maxProductCRate,
  );
  const fcrActive = cfg.strategies.ancillaryServices;
  const fcrMarketGaps = fcrActive ? fcrMarketRealismGaps(fcrMarket) : [];

  const maxProductPowerKw = maxProductStepKw(cfg.powerSizing.productStepsKw);
  const base = {
    capacityKWh,
    physicalPowerNeedKw,
    productPowerKw,
    maxProductCRate,
    maxProductPowerKw,
    productCapBound: maxProductPowerKw > 0 && physicalPowerNeedKw > maxProductPowerKw + 1e-9,
    candidatePowersKw,
    objective: OBJECTIVE_TEXT,
    tieToleranceSek: POWER_TIE_TOLERANCE_SEK,
    productCostGaps: [] as string[],
    fcrMarketGaps,
    economicallyOptimalPowerKw: null as null,
  };

  if (candidatePowersKw.length === 0)
    return {
      ...base,
      options: [],
      operatingOptimalPowerKw: null,
      recommendedPowerKw: productPowerKw,
      recommendationUsesHistoricalFcr: false,
      status: "incomplete",
      reason: "no-candidates",
      notes: ["Inga giltiga effektkandidater kunde byggas för den valda kapaciteten."],
    };

  /* --- Simulate every candidate fully. --- */
  const cache = input.runCache;
  const options: PowerOption[] = candidatePowersKw.map((powerKw) => {
    const cached = cache?.get(powerKw);
    const run = cached ?? simulateAtPower(cfg, series, capacityKWh, powerKw, econ, optimiseFcr);
    if (cache && !cached) cache.set(powerKw, run);
    const e = run.economy;
    const a = run.result.ancillary;
    const grossSek = e.fcr.grossSek;
    const fcrRevenueSek = grossSek ?? 0;
    const energyBenefitSek = e.energy.energyBenefitSek;
    const peakBenefitSek = e.peak.annualPeakBenefitSek;
    const totalOperatingBenefitSek = round2(
      energyBenefitSek + (peakBenefitSek ?? 0) + fcrRevenueSek,
    );
    const breakdown = productCost(capacityKWh, powerKw, cost);
    return {
      powerKw,
      cRate: powerKw / capacityKWh,
      actualDispatchPowerKw: Math.max(
        run.result.dispatchPower.maxChargeKw,
        run.result.dispatchPower.maxDischargeKw,
      ),
      fcrOfferedPowerKw: a.reservedPowerUpKw,
      fcrReservablePowerKw: a.reservablePowerAvgKw,
      fcrHeldPowerKw: a.avgReservedPowerUpKw,
      fcrMonetizedPowerKw: a.monetizedPowerAvgKw,
      energyBenefitSek,
      peakBenefitSek,
      fcrRevenueSek,
      fcrGrossSek: grossSek,
      fcrRealisticNetSek: realisticFcrNetSek(grossSek, fcrMarket),
      totalOperatingBenefitSek,
      operatingBenefitSek: totalOperatingBenefitSek,
      annualCustomerBenefitSek: annualCustomerBenefitSek(
        energyBenefitSek,
        peakBenefitSek,
        grossSek,
        econ,
      ),
      deltaVsPreviousKw: null,
      capexSek: breakdown.capexSek,
      annualisedProductCostSek: breakdown.annualisedTotalProductCostSek,
      cost: breakdown,
      selected: false,
      physicalSizingChoice: Math.abs(powerKw - productPowerKw) < 1e-9,
      run,
    };
  });

  /* --- Increments against the next lower candidate. --- */
  for (let i = 1; i < options.length; i++) {
    const cur = options[i]!;
    const prev = options[i - 1]!;
    cur.deltaVsPreviousKw = round2(
      cur.totalOperatingBenefitSek - prev.totalOperatingBenefitSek,
    );
  }

  /* --- Winner: highest benefit, ties within the tolerance go to the LOWER power. --- */
  const best = Math.max(...options.map((o) => o.totalOperatingBenefitSek));
  const winner =
    options.find((o) => o.totalOperatingBenefitSek >= best - POWER_TIE_TOLERANCE_SEK) ??
    options[0]!;
  winner.selected = true;

  const physical = options.find((o) => o.physicalSizingChoice);
  const fcrDecided =
    fcrActive &&
    winner.fcrRevenueSek > 0 &&
    physical !== undefined &&
    winner.powerKw > physical.powerKw &&
    // Without the FCR term the higher power would not have beaten the physical one.
    winner.totalOperatingBenefitSek - winner.fcrRevenueSek <
      physical.totalOperatingBenefitSek - physical.fcrRevenueSek + POWER_TIE_TOLERANCE_SEK;

  const notes: string[] = [
    `Kandidater byggs från vald kapacitet: från fysiskt vald produkteffekt ${productPowerKw} kW upp till ${maxProductCRate} C (${round2(capacityKWh * maxProductCRate)} kW). C-raten är ett kandidattak, aldrig ett minimikrav.`,
    "Varje kandidat körs genom samma dispatch, samma peak shaving, samma FCR-gate och samma 10 %-sweep — ingen extrapolering.",
    `Systemeffekten väljs på högst beräknad årlig nytta (energi + minskad effektkostnad + FCR). Produktkostnad ingår inte.`,
    `Vid skillnader under ${POWER_TIE_TOLERANCE_SEK} kr/år väljs den LÄGRE systemeffekten.`,
  ];
  if (fcrActive)
    notes.push(
      "FCR-D upp-intäkten bygger på ett HISTORISKT 2025-scenario — inte en prognos eller garanterad intäkt.",
    );
  if (fcrMarketGaps.length > 0)
    notes.push(
      `Marknadsrealism är ofullständig (${fcrMarketGaps.join(", ")}); det historiska scenariot används och redovisas som sådant.`,
    );

  return {
    ...base,
    options,
    operatingOptimalPowerKw: winner.powerKw,
    recommendedPowerKw: winner.powerKw,
    recommendationUsesHistoricalFcr: fcrDecided,
    status: fcrMarketGaps.length > 0 ? "partial" : "complete",
    reason: fcrMarketGaps.length > 0 ? "historical-fcr-scenario" : "ok",
    notes,
  };
}
