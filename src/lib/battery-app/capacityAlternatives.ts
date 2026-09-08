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

export type AlternativeLevel = "lower" | "recommended" | "higher";

export interface BatteryAlternative {
  level: AlternativeLevel;
  capacityKWh: number;
  powerKw: number;
  annualBenefitSek: number;
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
): BatteryAlternative | null {
  try {
    const res = runBatteryEngine({
      ...input,
      battery: { ...(input.battery ?? {}), fixedCapacityKWh: capacityKWh, fixedPowerKw: undefined },
    });
    return {
      level,
      capacityKWh: res.summary.recommendation.capacityKWh,
      powerKw: res.summary.recommendation.recommendedPowerKw,
      annualBenefitSek: res.summary.economy.totalOperatingBenefitSek,
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
): BatteryAlternative[] {
  const rec = result.summary.recommendation;
  const middle: BatteryAlternative = {
    level: "recommended",
    capacityKWh: rec.capacityKWh,
    powerKw: rec.recommendedPowerKw,
    annualBenefitSek: result.summary.economy.totalOperatingBenefitSek,
  };
  if (!(rec.capacityKWh > 0) || rec.sizingWasFixed) return [middle];

  const ladder = capacityLadder(result);
  const idx = ladder.findIndex((c) => c === rec.capacityKWh);
  const lowerKWh = idx > 0 ? ladder[idx - 1] : undefined;
  const higherKWh = idx >= 0 && idx < ladder.length - 1 ? ladder[idx + 1] : undefined;

  const out: BatteryAlternative[] = [];
  if (lowerKWh !== undefined) {
    const lower = runAtCapacity(input, lowerKWh, "lower");
    if (lower) out.push(lower);
  }
  out.push(middle);
  if (higherKWh !== undefined) {
    const higher = runAtCapacity(input, higherKWh, "higher");
    if (higher) out.push(higher);
  }
  return out;
}
