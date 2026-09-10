/**
 * TRUE WITHOUT-FCR COUNTERFACTUAL.
 *
 * "Vilken systemeffekt hade passat detta batteri om FCR-D upp inte ingick?"
 *
 * The only correct way to answer that is to switch FCR-D up OFF **before** the dispatch
 * runs and simulate again. Subtracting the FCR revenue from an FCR-influenced result is
 * mathematically wrong: the reservation also changes dispatch, SOC, energy benefit, peak
 * shaving and import/export.
 *
 * This module therefore:
 *   - keeps the ALREADY CHOSEN capacity fixed (no capacity re-sizing),
 *   - reuses the engine's own candidate/dispatch/economy path (`simulateAtPower`),
 *   - forces `strategies.ancillaryServices = false` and an empty reservation,
 *   - applies the SAME tie tolerance (POWER_TIE_TOLERANCE_SEK, 25 SEK/year, lower kW wins).
 *
 * It changes nothing in the frozen Battery Engine: it is an additional, explicitly
 * counterfactual run on top of an existing result.
 */

import type { BatteryEngineInput, BatteryEngineResult } from "@/lib/battery-engine";
import { toEconomyConfig, toLabConfig, toTimeSeries } from "@/lib/battery-engine";
import {
  DEFAULT_MAX_PRODUCT_C_RATE,
  POWER_TIE_TOLERANCE_SEK,
  simulateAtPower,
  maxProductStepKw,
} from "@/lib/lab/economicPowerSizing";

export interface WithoutFcrOption {
  powerKw: number;
  cRate: number;
  energyBenefitSek: number;
  peakBenefitSek: number;
  totalOperatingBenefitSek: number;
  /** Always 0 here — proof that no FCR revenue entered the objective. */
  fcrRevenueSek: number;
  /** Always 0 here — proof that no capacity was reserved before dispatch. */
  fcrReservedPowerKw: number;
  actualDispatchPowerKw: number;
  totalUsefulKWh: number;
  importKWh: number;
  exportKWh: number;
  peakAfterKw: number;
  selected: boolean;
}

export interface WithoutFcrOptimum {
  capacityKWh: number;
  /** Lowest system power within the tie tolerance of the best FCR-off candidate. */
  withoutFcrOptimalPowerKw: number;
  /** Annual benefit of that candidate (energy + peak shaving), SEK/year. */
  withoutFcrBenefitSek: number;
  /** Highest annual benefit found among the FCR-off candidates, SEK/year. */
  bestBenefitSek: number;
  tieToleranceSek: number;
  candidatePowersKw: number[];
  options: WithoutFcrOption[];
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

/**
 * Candidate powers for the counterfactual: every product step up to the 0.5 C ceiling,
 * the ceiling itself, the physical need and the physically sized product power. Lower
 * steps are deliberately included — without FCR the answer is often below the FCR-driven
 * recommendation.
 */
export function buildWithoutFcrCandidates(
  capacityKWh: number,
  physicalPowerNeedKw: number,
  productPowerKw: number,
  productStepsKw: number[],
  maxProductCRate: number = DEFAULT_MAX_PRODUCT_C_RATE,
): number[] {
  if (!(capacityKWh > 0)) return [];
  // Product levels only: the C-rate ceiling can never exceed the largest product step.
  const productCapKw = maxProductStepKw(productStepsKw);
  const rawCeiling = maxProductCRate > 0 ? round3(capacityKWh * maxProductCRate) : 0;
  const ceiling = productCapKw > 0 ? Math.min(rawCeiling, productCapKw) : rawCeiling;
  const out = new Set<number>();
  for (const step of productStepsKw)
    if (step > 0 && step <= ceiling + 1e-9) out.add(round3(step));
  if (ceiling > 0) out.add(ceiling);
  if (physicalPowerNeedKw > 0 && physicalPowerNeedKw <= ceiling + 1e-9)
    out.add(round3(physicalPowerNeedKw));
  if (productPowerKw > 0) out.add(round3(productPowerKw));
  return [...out].sort((a, b) => a - b);
}

/**
 * Runs the genuine FCR-off counterfactual for the capacity the engine already recommended.
 * Returns null when there is no battery or no candidate to compare.
 */
export function computeWithoutFcrOptimum(
  input: BatteryEngineInput,
  result: BatteryEngineResult,
): WithoutFcrOptimum | null {
  const rec = result.summary.recommendation;
  const capacityKWh = rec.capacityKWh;
  if (!(capacityKWh > 0)) return null;

  const baseCfg = toLabConfig(input);
  /* FCR-D up is switched OFF before any dispatch runs. */
  const cfg = {
    ...baseCfg,
    strategies: { ...baseCfg.strategies, ancillaryServices: false },
    ancillary: { ...baseCfg.ancillary, enabled: false, offeredPowerKw: 0 },
  };
  const econ = toEconomyConfig(input);
  const series = toTimeSeries(cfg, input);

  const candidatePowersKw = buildWithoutFcrCandidates(
    capacityKWh,
    rec.physicalPowerNeedKw,
    rec.productPowerKw,
    cfg.powerSizing.productStepsKw,
  );
  if (candidatePowersKw.length === 0) return null;

  const options: WithoutFcrOption[] = candidatePowersKw.map((powerKw) => {
    /* optimiseFcrReservation = false: no reservation sweep, no FCR anywhere. */
    const run = simulateAtPower(cfg, series, capacityKWh, powerKw, econ, false);
    const e = run.economy;
    const sim = run.result;
    const energyBenefitSek = e.energy.energyBenefitSek;
    const peakBenefitSek = e.peak.annualPeakBenefitSek ?? 0;
    return {
      powerKw,
      cRate: powerKw / capacityKWh,
      energyBenefitSek,
      peakBenefitSek,
      totalOperatingBenefitSek: energyBenefitSek + peakBenefitSek,
      fcrRevenueSek: e.fcr.grossSek ?? 0,
      fcrReservedPowerKw: sim.ancillary.reservedPowerUpKw,
      actualDispatchPowerKw: Math.max(
        sim.dispatchPower.maxChargeKw,
        sim.dispatchPower.maxDischargeKw,
      ),
      totalUsefulKWh: sim.totalUsefulKWh,
      importKWh: sim.importKWh,
      exportKWh: sim.exportKWh,
      peakAfterKw: sim.modelledPeakKw,

      selected: false,
    };
  });

  const bestBenefitSek = Math.max(...options.map((o) => o.totalOperatingBenefitSek));
  const winner =
    options.find((o) => o.totalOperatingBenefitSek >= bestBenefitSek - POWER_TIE_TOLERANCE_SEK) ??
    options[0]!;
  winner.selected = true;

  return {
    capacityKWh,
    withoutFcrOptimalPowerKw: winner.powerKw,
    withoutFcrBenefitSek: winner.totalOperatingBenefitSek,
    bestBenefitSek,
    tieToleranceSek: POWER_TIE_TOLERANCE_SEK,
    candidatePowersKw,
    options,
  };
}
