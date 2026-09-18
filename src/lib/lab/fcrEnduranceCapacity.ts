/**
 * STEP D — FCR ENDURANCE CAPACITY (solar flow only).
 *
 * The power is already technically decided (physical saturation + nominal fuse guardrail)
 * and is treated as FIXED here. This module answers a single question:
 *
 *   Is the chosen capacity enough for that FIXED power to be FULLY sustainable as a
 *   reserve, according to the engine's own existing physics?
 *
 * "Fully sustainable" is read straight out of the normal simulation: `energyLimitedHours`
 * must be 0 while the battery offers its full rated power. Endurance, SOC window, service
 * window, headroom, NEM and the grid gates are all already inside that number — nothing is
 * re-derived here and no simplified FCR formula exists.
 *
 * HARD RULES (verified in the read-only audits):
 *   - FCR may raise the capacity, never the power. No `more kW -> more kWh -> more kW` loop.
 *   - Once the fixed power is fully sustainable, extra kWh gives exactly zero extra reserve
 *     revenue, so the search stops at the first sustainable capacity step.
 *   - A GRID- or POWER-bound reserve is never "solved" with more kWh: the search stops and
 *     the original capacity is kept.
 *   - Only real capacity steps from the engine's own ladder are used, never above 500 kWh.
 */

import { simulate } from "./simulate";
import type { LabConfig, SimResult, TimeSeries } from "./types";

export const MAX_RECOMMENDABLE_CAPACITY_KWH = 500;

export interface FcrEnduranceCapacityResult {
  /** Capacity after the endurance check, kWh. Equals the input capacity when unchanged. */
  capacityKWh: number;
  /** Capacity the power sizing started from, kWh. */
  baseCapacityKWh: number;
  raised: boolean;
  /** "not-applicable" | "already-sustainable" | "raised" | "grid-bound" | "power-bound" | "energy-constrained" */
  reason:
    | "not-applicable"
    | "already-sustainable"
    | "raised"
    | "grid-bound"
    | "power-bound"
    | "energy-constrained";
  /** True when no capacity step within 500 kWh made the fixed power fully sustainable. */
  energyConstrained: boolean;
  /** Capacity steps that were simulated, with their limiting factor. */
  steps: {
    capacityKWh: number;
    energyLimitedHours: number;
    gridLimitedHours: number;
    limitingFactor: SimResult["ancillary"]["limitingFactor"];
    heldPowerKw: number;
  }[];
  note: string | null;
}

function evaluate(
  cfg: LabConfig,
  series: TimeSeries,
  capacityKWh: number,
  powerKw: number,
): SimResult["ancillary"] {
  const reserveCfg: LabConfig = {
    ...cfg,
    strategies: { ...cfg.strategies, ancillaryServices: true },
    ancillary: { ...cfg.ancillary, enabled: true, offeredPowerKw: powerKw },
  };
  return simulate(reserveCfg, series, capacityKWh, powerKw).ancillary;
}

export function fcrEnduranceCapacity(args: {
  cfg: LabConfig;
  series: TimeSeries;
  capacityKWh: number;
  powerKw: number;
  capacityStepsKWh: number[];
  maxCapacityKWh?: number;
}): FcrEnduranceCapacityResult {
  const { cfg, series, capacityKWh, powerKw, capacityStepsKWh } = args;
  const maxCapacityKWh = args.maxCapacityKWh ?? MAX_RECOMMENDABLE_CAPACITY_KWH;
  const empty: FcrEnduranceCapacityResult = {
    capacityKWh,
    baseCapacityKWh: capacityKWh,
    raised: false,
    reason: "not-applicable",
    energyConstrained: false,
    steps: [],
    note: null,
  };
  if (!cfg.strategies.ancillaryServices || !(capacityKWh > 0) || !(powerKw > 0)) return empty;

  const steps: FcrEnduranceCapacityResult["steps"] = [];
  const push = (cap: number, a: SimResult["ancillary"]) =>
    steps.push({
      capacityKWh: cap,
      energyLimitedHours: a.energyLimitedHours,
      gridLimitedHours: a.gridLimitedHours,
      limitingFactor: a.limitingFactor,
      heldPowerKw: a.avgReservedPowerUpKw,
    });

  const start = evaluate(cfg, series, capacityKWh, powerKw);
  push(capacityKWh, start);
  if (start.energyLimitedHours === 0)
    return { ...empty, reason: "already-sustainable", steps };
  if (start.limitingFactor === "grid")
    return {
      ...empty,
      reason: "grid-bound",
      steps,
      note:
        "Reserven begränsas av nätet, inte av batteriets energi — kapaciteten höjs inte för att kompensera en nätbegränsning.",
    };

  const ladder = capacityStepsKWh
    .filter((c) => c > capacityKWh + 1e-9 && c <= maxCapacityKWh + 1e-9)
    .sort((a, b) => a - b);

  let previousHeldKw = start.avgReservedPowerUpKw;
  for (const cap of ladder) {
    const a = evaluate(cfg, series, cap, powerKw);
    push(cap, a);
    if (a.energyLimitedHours === 0)
      return {
        capacityKWh: cap,
        baseCapacityKWh: capacityKWh,
        raised: true,
        reason: "raised",
        energyConstrained: false,
        steps,
        note: `Kapaciteten höjs från ${capacityKWh} till ${cap} kWh så att ${powerKw} kW blir fullt uthållig som reserv (energibegränsade timmar går från ${start.energyLimitedHours} till 0). Effekten ändras inte.`,
      };
    if (a.limitingFactor === "grid")
      return {
        ...empty,
        reason: "grid-bound",
        steps,
        note:
          "Reserven begränsas av nätet innan energin räcker — ytterligare kapacitet läggs inte till.",
      };
    if (a.avgReservedPowerUpKw <= previousHeldKw + 1e-9)
      return {
        ...empty,
        reason: "power-bound",
        steps,
        note: "Ytterligare kapacitet ökar inte den hållna reserven — kapaciteten höjs inte.",
      };
    previousHeldKw = a.avgReservedPowerUpKw;
  }

  return {
    ...empty,
    reason: "energy-constrained",
    energyConstrained: true,
    steps,
    note: `${powerKw} kW blir inte fullt uthållig som reserv inom ${maxCapacityKWh} kWh. Rekommendationen behåller ${capacityKWh} kWh och reserven redovisas som energibegränsad.`,
  };
}
