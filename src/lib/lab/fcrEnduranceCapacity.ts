/**
 * STEP D — FCR ENDURANCE CAPACITY (solar flow only).
 *
 * The power is already technically decided (physical saturation + nominal fuse guardrail)
 * and is treated as FIXED here. This module answers a single question:
 *
 *   Which is the SMALLEST real capacity step at which that FIXED power already reaches its
 *   technically sustainable reserve plateau, according to the engine's own existing physics?
 *
 * Everything (endurance, SOC window, service window, headroom, NEM, grid gates) is read out
 * of the normal 8760 simulation — nothing is re-derived here and no simplified FCR formula
 * exists.
 *
 * HARD RULES (verified in the read-only audits):
 *   - FCR may raise the capacity, never the power. No `more kW -> more kWh -> more kW` loop.
 *   - `energyLimitedHours === 0` is NOT a sufficient sustainability criterion: a partially
 *     energy-limited reserve is reported as power-limited, so the held reserve can still grow
 *     with more kWh after that counter hits zero. The plateau of the HELD reserve decides.
 *   - The held reserve is NOT monotonic in capacity, so the FULL capacity ladder is simulated
 *     before the plateau is determined. No early stop on a local decrease.
 *   - Capacity is sized against technically sustainable reserve, never against SEK revenue.
 *   - A grid-bound reserve is never "solved" with more kWh: a grid-limited plateau is flat, so
 *     the smallest step already reaching it wins — which is the unchanged capacity.
 *   - Only real capacity steps from the engine's own ladder are used, never above 500 kWh.
 */

import { simulate } from "./simulate";
import type { LabConfig, SimResult, TimeSeries } from "./types";

export const MAX_RECOMMENDABLE_CAPACITY_KWH = 500;

/** Floating-point tolerance only. Not a target margin. */
const FLOAT_TOL = 1e-9;

/**
 * Plateau resolution in kW. Purely numerical: consecutive capacity steps can differ by a few
 * 1e-8 kW of held reserve from accumulated floating-point dispatch residue, which is many
 * orders of magnitude below the resolution of a real reserve bid. 1 W is treated as "the same
 * held reserve". This is NOT a percentage target of the plateau.
 */
const PLATEAU_RESOLUTION_KW = 1e-3;

export interface FcrEnduranceCapacityStep {
  capacityKWh: number;
  energyLimitedHours: number;
  gridLimitedHours: number;
  limitingFactor: SimResult["ancillary"]["limitingFactor"];
  /** Average held UP reserve, kW. */
  heldPowerKw: number;
  /** Average held DOWN reserve, kW. */
  heldDownPowerKw: number;
}

export interface FcrEnduranceCapacityResult {
  /** Capacity after the endurance check, kWh. Equals the input capacity when unchanged. */
  capacityKWh: number;
  /** Capacity the power sizing started from, kWh. */
  baseCapacityKWh: number;
  raised: boolean;
  /** "not-applicable" | "already-sustainable" | "raised" | "grid-bound" | "energy-constrained" */
  reason:
    | "not-applicable"
    | "already-sustainable"
    | "raised"
    | "grid-bound"
    | "energy-constrained";
  /** True when the reserve is still energy-limited at the selected plateau capacity. */
  energyConstrained: boolean;
  /** Every capacity step that was simulated, in ladder order. */
  steps: FcrEnduranceCapacityStep[];
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

  // ---- 1. Simulate the FULL allowed capacity ladder at the FIXED power. No early stop. ----
  const ladder = [
    capacityKWh,
    ...capacityStepsKWh.filter((c) => c > capacityKWh + FLOAT_TOL && c <= maxCapacityKWh + FLOAT_TOL),
  ].sort((a, b) => a - b);

  const steps: FcrEnduranceCapacityStep[] = ladder.map((cap) => {
    const a = evaluate(cfg, series, cap, powerKw);
    return {
      capacityKWh: cap,
      energyLimitedHours: a.energyLimitedHours,
      gridLimitedHours: a.gridLimitedHours,
      limitingFactor: a.limitingFactor,
      heldPowerKw: a.avgReservedPowerUpKw,
      // Mean held DOWN reserve, straight from the same physics layer. Never a revenue figure.
      heldDownPowerKw: a.downHeldPowerAvgKw ?? 0,
    };
  });

  /**
   * ---- 2. The technical plateau ----
   * The plateau is the held reserve the fixed power settles on at the TOP of the ladder,
   * where the battery's energy no longer binds at all. It is read from the largest simulated
   * capacity, not from the ladder maximum: below the plateau the held series is non-monotonic
   * and an energy-limited step can momentarily report a higher average than the sustainable
   * level. When the grid is the binding factor the tail is flat at the same value from the
   * start, so the unchanged capacity is selected automatically.
   */
  const top = steps[steps.length - 1]!;
  const plateauUp = top.heldPowerKw;
  const plateauDown = top.heldDownPowerKw;

  // Smallest step that already reaches the plateau in BOTH directions (float tolerance only).
  const chosen =
    steps.find(
      (s) =>
        s.heldPowerKw >= plateauUp - PLATEAU_RESOLUTION_KW &&
        s.heldDownPowerKw >= plateauDown - PLATEAU_RESOLUTION_KW,
    ) ?? top;

  const raised = chosen.capacityKWh > capacityKWh + FLOAT_TOL;
  const gridBound = chosen.limitingFactor === "grid";
  const energyConstrained = chosen.energyLimitedHours > 0;

  const reason: FcrEnduranceCapacityResult["reason"] = raised
    ? "raised"
    : gridBound
      ? "grid-bound"
      : energyConstrained
        ? "energy-constrained"
        : "already-sustainable";

  const note = raised
    ? `Kapaciteten höjs från ${capacityKWh} till ${chosen.capacityKWh} kWh — minsta verkliga kapacitetssteg där ${powerKw} kW når sin tekniskt hållbara reservplatå (hållen reserv upp ${chosen.heldPowerKw.toFixed(2)} kW, ner ${chosen.heldDownPowerKw.toFixed(2)} kW). Effekten ändras inte.`
    : gridBound
      ? "Reserven begränsas av nätet, inte av batteriets energi — kapaciteten höjs inte för att kompensera en nätbegränsning."
      : energyConstrained
        ? `${powerKw} kW når sin högsta hållbara reserv redan vid ${capacityKWh} kWh; ytterligare kapacitet inom ${maxCapacityKWh} kWh ökar den inte.`
        : null;

  return {
    capacityKWh: chosen.capacityKWh,
    baseCapacityKWh: capacityKWh,
    raised,
    reason,
    energyConstrained,
    steps,
    note,
  };
}
