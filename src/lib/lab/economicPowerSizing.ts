/**
 * Battery Engine — ECONOMIC POWER SIZING (layer on top of the verified physics).
 *
 * Capacity is chosen exactly as before (sweet spot -> peak floor -> ancillary floor) and
 * is NEVER touched here. This module only answers one question:
 *
 *   Given the already chosen capacity, which SYSTEM POWER is economically best?
 *
 * It does so by running each candidate power through the SAME dispatch, the SAME peak
 * shaving, the SAME FCR physical gate and the SAME 10 % FCR reservation sweep. There is
 * no extrapolation and no shortcut: every kW alternative is fully simulated.
 *
 * Three power concepts are kept strictly apart:
 *   physicalPowerNeedKw   — what the property physically needs
 *   productPowerKw        — the rating of a real product alternative
 *   actualDispatchPowerKw — the highest power the dispatch actually used
 * plus two economic ones:
 *   operatingOptimalPowerKw     — highest operating benefit BEFORE product cost
 *   economicallyOptimalPowerKw  — highest annualised net AFTER product cost
 */

import {
  composeOperatingEconomy,
  evaluateOperatingEconomy,
  optimizeFcrReservation,
  SWEDISH_OPERATING_ECONOMY,
} from "./operatingEconomy";
import type { FcrOptimisationResult, OperatingEconomyConfig, OperatingEconomyResult } from "./operatingEconomy";
import { buildSeries } from "./simulate";
import type { LabConfig, SimResult, TimeSeries } from "./types";
import { missingProductCostFields, productCost, productOptionKey } from "./productCost";
import type { ProductCostBreakdown, ProductCostConfig } from "./productCost";

/**
 * Candidate ceiling as a C-rate. This is a MAXIMUM CANDIDATE RANGE, never a minimum
 * required C-rate: physical sizing is still free to land far below it (e.g. 25 kWh at
 * 5 kW = 0.20 C).
 */
export const DEFAULT_MAX_PRODUCT_C_RATE = 0.5;

/** Two candidates within this many SEK/year are equivalent; the LOWER kW then wins. */
export const POWER_TIE_TOLERANCE_SEK = 25;

/* ------------------------------------------------------------------ *
 * FCR market realism
 * ------------------------------------------------------------------ */

/**
 * Parameters that turn a HISTORICAL FCR-D up gross revenue into a customer-realistic net
 * revenue. Every one defaults to null = unverified. The engine refuses to size system
 * power economically on an FCR revenue that is explicitly incomplete.
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
export function buildPowerCandidates(
  capacityKWh: number,
  physicalProductPowerKw: number,
  productStepsKw: number[],
  maxProductCRate: number = DEFAULT_MAX_PRODUCT_C_RATE,
): number[] {
  if (!(capacityKWh > 0) || !(physicalProductPowerKw > 0)) return [];
  const round = (v: number) => Math.round(v * 1000) / 1000;
  const ceiling = maxProductCRate > 0 ? round(capacityKWh * maxProductCRate) : 0;
  const out = new Set<number>([round(physicalProductPowerKw)]);
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
  /** Historical 2025 gross. */
  fcrGrossSek: number | null;
  /** Gross adjusted for verified market realism. Null while realism data is missing. */
  fcrRealisticNetSek: number | null;
  /** The FCR figure actually used by the optimisation objective (0 when excluded). */
  fcrRevenueUsedSek: number;
  /** energy + peak + FCR gross. Reported value, independent of the objective. */
  operatingBenefitSek: number;
  /** energy + peak + fcrRevenueUsed. What the optimiser maximises before cost. */
  objectiveOperatingBenefitSek: number;
  capexSek: number | null;
  annualisedProductCostSek: number | null;
  annualNetBenefitSek: number | null;
  /** Deltas against the NEXT LOWER candidate. Null for the lowest one. */
  incrementalOperatingBenefitSek: number | null;
  incrementalAnnualisedPowerCostSek: number | null;
  incrementalAnnualNetBenefitSek: number | null;
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
  candidatePowersKw: number[];
  options: PowerOption[];
  /** Highest operating benefit BEFORE product cost. Null when nothing was simulated. */
  operatingOptimalPowerKw: number | null;
  /** Highest annualised net AFTER product cost. Null when it cannot be computed. */
  economicallyOptimalPowerKw: number | null;
  status: EconomicPowerSizingStatus;
  reason: string;
  objective: string;
  /** True when FCR revenue was deliberately left out of the objective. */
  fcrExcludedFromObjective: boolean;
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
  cost: ProductCostConfig;
  fcrMarket?: FcrMarketRealismConfig;
  optimiseFcrReservation?: boolean;
  maxProductCRate?: number | undefined;
  /**
   * Optional cache of already simulated candidate powers. Physics is deterministic, so
   * re-scoring the SAME simulations under a different product cost is exact and lets a
   * caller compare cost scenarios without re-running the dispatch.
   */
  runCache?: Map<number, PowerCandidateRun>;
}

const OBJECTIVE_TEXT =
  "annualNetBenefit = (energinytta + minskad effektkostnad + använd FCR-intäkt) − annualiserad produktkostnad. " +
  "Kapaciteten är låst, så kapacitetskostnaden är identisk för alla kandidater och rangordningen är därmed " +
  "matematiskt identisk med incrementalAnnualNetBenefit = Δoperativ nytta − Δannualiserad effektkostnad.";

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Economic power sizing for one already chosen capacity.
 *
 * Refuses to guess: when the product cost is unknown NOTHING is simulated and the
 * economic optimum is null. When the FCR market realism is unverified the FCR revenue is
 * removed from the objective, so a larger system power can never be justified by a
 * revenue the model itself calls incomplete.
 */
export function runEconomicPowerSizing(
  input: EconomicPowerSizingInput,
): EconomicPowerSizingResult {
  const {
    cfg,
    capacityKWh,
    physicalPowerNeedKw,
    productPowerKw,
    cost,
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

  const usesPriceList = candidatePowersKw.some(
    (kw) => cost.explicitOptionCostSek?.[productOptionKey(capacityKWh, kw)] !== undefined,
  );
  const productCostGaps = usesPriceList
    ? [cost.lifetimeYears === null ? "lifetimeYears" : "", cost.discountRatePct === null ? "discountRatePct" : ""].filter(Boolean)
    : missingProductCostFields(cost);

  const base = {
    capacityKWh,
    physicalPowerNeedKw,
    productPowerKw,
    maxProductCRate,
    candidatePowersKw,
    objective: OBJECTIVE_TEXT,
    productCostGaps,
    fcrMarketGaps,
  };

  /* --- 1. No verified product cost => no economic recommendation, and no simulation. --- */
  if (productCostGaps.length > 0)
    return {
      ...base,
      options: [],
      operatingOptimalPowerKw: null,
      economicallyOptimalPowerKw: null,
      status: "incomplete",
      reason: "product-cost-data-missing",
      fcrExcludedFromObjective: fcrMarketGaps.length > 0,
      notes: [
        `Produktkostnad saknas (${productCostGaps.join(", ")}). Ekonomiskt optimal systemeffekt beräknas inte och gissas aldrig.`,
        "Den fysiska effektdimensioneringen är oförändrad och används som rekommendation.",
      ],
    };

  /* --- 2. Simulate every candidate fully. --- */
  const fcrExcluded = fcrActive && fcrMarketGaps.length > 0;
  const cache = input.runCache;
  const options: PowerOption[] = candidatePowersKw.map((powerKw) => {
    const cached = cache?.get(powerKw);
    const run = cached ?? simulateAtPower(cfg, series, capacityKWh, powerKw, econ, optimiseFcr);
    if (cache && !cached) cache.set(powerKw, run);
    const e = run.economy;
    const a = run.result.ancillary;
    const grossSek = e.fcr.grossSek;
    const realistic = realisticFcrNetSek(grossSek, fcrMarket);
    const fcrRevenueUsedSek = fcrExcluded ? 0 : (realistic ?? 0);
    const energyBenefitSek = e.energy.energyBenefitSek;
    const peakBenefitSek = e.peak.annualPeakBenefitSek;
    const breakdown = productCost(capacityKWh, powerKw, cost);
    const operatingBenefitSek = round2(energyBenefitSek + (peakBenefitSek ?? 0) + (grossSek ?? 0));
    const objectiveOperatingBenefitSek = round2(
      energyBenefitSek + (peakBenefitSek ?? 0) + fcrRevenueUsedSek,
    );
    const annualisedProductCostSek = breakdown.annualisedTotalProductCostSek;
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
      fcrGrossSek: grossSek,
      fcrRealisticNetSek: realistic,
      fcrRevenueUsedSek,
      operatingBenefitSek,
      objectiveOperatingBenefitSek,
      capexSek: breakdown.capexSek,
      annualisedProductCostSek,
      annualNetBenefitSek:
        annualisedProductCostSek === null
          ? null
          : round2(objectiveOperatingBenefitSek - annualisedProductCostSek),
      incrementalOperatingBenefitSek: null,
      incrementalAnnualisedPowerCostSek: null,
      incrementalAnnualNetBenefitSek: null,
      cost: breakdown,
      selected: false,
      physicalSizingChoice: Math.abs(powerKw - productPowerKw) < 1e-9,
      run,
    };
  });

  /* --- 3. Incremental view against the next lower candidate. --- */
  for (let i = 1; i < options.length; i++) {
    const cur = options[i]!;
    const prev = options[i - 1]!;
    cur.incrementalOperatingBenefitSek = round2(
      cur.objectiveOperatingBenefitSek - prev.objectiveOperatingBenefitSek,
    );
    cur.incrementalAnnualisedPowerCostSek =
      cur.annualisedProductCostSek === null || prev.annualisedProductCostSek === null
        ? null
        : round2(cur.annualisedProductCostSek - prev.annualisedProductCostSek);
    cur.incrementalAnnualNetBenefitSek =
      cur.incrementalAnnualisedPowerCostSek === null
        ? null
        : round2(cur.incrementalOperatingBenefitSek - cur.incrementalAnnualisedPowerCostSek);
  }

  /* --- 4. Winners. Ties within the tolerance go to the LOWER system power. --- */
  const operatingBest = Math.max(...options.map((o) => o.operatingBenefitSek));
  const operatingOptimalPowerKw =
    options.find((o) => o.operatingBenefitSek >= operatingBest - POWER_TIE_TOLERANCE_SEK)
      ?.powerKw ?? null;

  const priced = options.filter((o) => o.annualNetBenefitSek !== null);
  const netBest = Math.max(...priced.map((o) => o.annualNetBenefitSek!));
  const winner =
    priced.find((o) => o.annualNetBenefitSek! >= netBest - POWER_TIE_TOLERANCE_SEK) ?? null;
  if (winner) winner.selected = true;

  const notes: string[] = [
    `Kandidater byggs från vald kapacitet: från fysiskt vald produkteffekt ${productPowerKw} kW upp till ${maxProductCRate} C (${round2(capacityKWh * maxProductCRate)} kW). C-raten är ett kandidattak, aldrig ett minimikrav.`,
    "Varje kandidat körs genom samma dispatch, samma peak shaving, samma FCR-gate och samma 10 %-sweep — ingen extrapolering.",
    `Vid skillnader under ${POWER_TIE_TOLERANCE_SEK} kr/år väljs den LÄGRE systemeffekten.`,
  ];
  if (fcrExcluded)
    notes.push(
      `FCR-intäkten är UTESLUTEN ur optimeringsmålet: marknadsrealism saknas (${fcrMarketGaps.join(", ")}). Systemeffekten dimensioneras aldrig på en uttryckligen ofullständig marknadsintäkt.`,
    );

  return {
    ...base,
    options,
    operatingOptimalPowerKw,
    economicallyOptimalPowerKw: winner ? winner.powerKw : null,
    status: fcrExcluded ? "partial" : "complete",
    reason: fcrExcluded ? "fcr-market-data-incomplete" : "ok",
    fcrExcludedFromObjective: fcrExcluded,
    notes,
  };
}
