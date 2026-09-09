/**
 * CAPACITY ALTERNATIVES — presentation/comparison layer only.
 *
 * Shows the customer the engine's own recommendation plus the nearest simulated
 * capacity step below and above it. The middle alternative is ALWAYS the existing
 * recommendation, copied verbatim from the main result — no re-run, no re-sizing.
 *
 * The neighbours are produced by running the SAME engine with the capacity locked
 * to that ladder step. Because only `fixedCapacityKWh` is set (never `fixedPowerKw`),
 * each candidate gets its own power sizing, FCR gate, grid gate and economy exactly
 * as the engine would do it for that capacity. Nothing is hardcoded or extrapolated.
 */

import { runBatteryEngine } from "@/lib/battery-engine";
import type { BatteryEngineInput, BatteryEngineResult } from "@/lib/battery-engine";
import {
  customerBenefitFromTotals,
  DEFAULT_CUSTOMER_ANCILLARY_SHARE,
} from "./customerEconomy";

export type AlternativeLevel = "lower" | "recommended" | "higher";

export interface BatteryAlternative {
  level: AlternativeLevel;
  capacityKWh: number;
  powerKw: number;
  /** Engine total for that candidate (ancillary at 100 % market value). */
  annualBenefitSek: number | null;
  /** Historical ancillary market value for that candidate, 0 when not enabled. */
  ancillaryMarketValueSek: number;
  /**
   * The customer-facing annual benefit for that candidate: the same engine total with
   * only the customer's share of the ancillary market value counted. Each candidate is
   * still simulated independently — the share is applied afterwards, per candidate.
   */
  customerBenefitSek: number | null;
}

function ancillaryMarketValue(res: BatteryEngineResult): number {
  const f = res.summary.fcr;
  if (!f.enabled) return 0;
  const v = f.grossSek ?? 0;
  return Number.isFinite(v) ? v : 0;
}

/** Unique simulated capacity steps (> 0) from the engine's own sweep, ascending. */
export function capacityLadder(result: BatteryEngineResult): number[] {
  const caps = new Set<number>();
  for (const r of result.diagnostics.sweep.results) if (r.capacityKWh > 0) caps.add(r.capacityKWh);
  return [...caps].sort((a, b) => a - b);
}

function runAtCapacity(
  input: BatteryEngineInput,
  capacityKWh: number,
  level: AlternativeLevel,
  share: number,
): BatteryAlternative | null {
  try {
    const { fixedPowerKw: _ignored, ...battery } = input.battery ?? {};
    const res = runBatteryEngine({
      ...input,
      battery: { ...battery, fixedCapacityKWh: capacityKWh },
    });
    const r = res.summary.recommendation;
    const total = res.summary.economy.totalOperatingBenefitSek;
    const market = ancillaryMarketValue(res);
    return {
      level,
      capacityKWh: r.capacityKWh,
      powerKw: r.recommendedPowerKw ?? r.productPowerKw,
      annualBenefitSek: total,
      ancillaryMarketValueSek: market,
      customerBenefitSek: customerBenefitFromTotals(total, market, share),
    };
  } catch {
    return null;
  }
}

/**
 * Lower / recommended / higher. Missing neighbours are simply omitted
 * (lowest or highest step on the ladder) — never invented.
 */
export function computeBatteryAlternatives(
  input: BatteryEngineInput,
  result: BatteryEngineResult,
  customerAncillaryShare: number = DEFAULT_CUSTOMER_ANCILLARY_SHARE,
): BatteryAlternative[] {
  const rec = result.summary.recommendation;
  const middleTotal = result.summary.economy.totalOperatingBenefitSek;
  const middleMarket = ancillaryMarketValue(result);
  const middle: BatteryAlternative = {
    level: "recommended",
    capacityKWh: rec.capacityKWh,
    powerKw: rec.recommendedPowerKw ?? rec.productPowerKw,
    annualBenefitSek: middleTotal,
    ancillaryMarketValueSek: middleMarket,
    customerBenefitSek: customerBenefitFromTotals(
      middleTotal,
      middleMarket,
      customerAncillaryShare,
    ),
  };
  if (!(rec.capacityKWh > 0) || rec.sizingWasFixed) return [middle];

  const ladder = capacityLadder(result);
  const idx = ladder.findIndex((c) => c === rec.capacityKWh);
  const lowerKWh = idx > 0 ? ladder[idx - 1] : undefined;
  const higherKWh = idx >= 0 && idx < ladder.length - 1 ? ladder[idx + 1] : undefined;

  const out: BatteryAlternative[] = [];
  if (lowerKWh !== undefined) {
    const lower = runAtCapacity(input, lowerKWh, "lower", customerAncillaryShare);
    if (lower) out.push(lower);
  }
  out.push(middle);
  if (higherKWh !== undefined) {
    const higher = runAtCapacity(input, higherKWh, "higher", customerAncillaryShare);
    if (higher) out.push(higher);
  }
  return out;
}
