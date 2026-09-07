import { ancillaryPlan } from "./ancillary";
import { baseline, computeGridLimits, resolveWindow } from "./dispatch";
import { assessGrid } from "./gridAssessment";
import { nearestProductStep, sizePower } from "./powerSizing";
import { buildSeries, simulate } from "./simulate";

import type {
  BalanceWeights,
  GridAssessment,
  LabConfig,
  PowerSizing,
  SimResult,
  SweetSpotRule,
  TimeSeries,
} from "./types";

export interface MarginalStep {
  fromKWh: number;
  toKWh: number;
  metric: number;
  previousMetric: number;
  deltaAbs: number;
  deltaRelPct: number;
  deltaPerExtraKWh: number;
  utilisationPct: number;
  cycles: number;
  worthwhile: boolean;
  /** Marginal gain of this step as % of the previous step's marginal gain. */
  marginalRatioPct: number;
  /** Absolute gain requirement applied in the grey zone, kWh. */
  absoluteRequirementKWh: number;
  /** Why the step was accepted or rejected (marginal-decay method). */
  decision:
    | "accepted"
    | "accepted-absolute-override"
    | "stopped-decay"
    | "stopped-absolute"
    | "stopped-density"
    | "not-evaluated";

}

export interface SweetSpot {
  recommendedCapacityKWh: number;
  recommendedPowerKw: number;
  reasonableRangeKWh: [number, number];
  diminishingFromKWh: number | null;
  steps: MarginalStep[];
  metric: SweetSpotRule["metric"];
  explanation: string;
  /** True when the curve had not clearly flattened at the upper normal capacity. */
  upperLimitReached: boolean;
  /** Diagnostics only: low utilisation/cycles never force a smaller battery. */
  utilisationWarning: string | null;
  /** Present when the sweep has sized the power (runSweep always sets it). */
  power?: PowerSizing;
  /** Power (kW) the capacity ladder was actually compared at. */
  comparisonPower?: number;
  /** Probe capacity (kWh) the adaptive comparison power was derived from. */
  probeCapacityKWh?: number;
  /** Soft peak-shaving floor: how it was computed and whether it raised the capacity. */
  peakFloor?: PeakFloorOutcome;
}

export interface PeakCapacityNeed {
  /** Peak shaving is on and the peaks recur often enough to be allowed to raise kWh. */
  active: boolean;
  /** Highest modelled monthly peak in the baseline import profile, kW. */
  peakKw: number;
  /** Lowest finite monthly peak-shaving threshold, kW. */
  thresholdKw: number;
  /** Days per year where the baseline exceeds the threshold in active hours. */
  recurringDays: number;
  /** Robust (p90) daily energy above the threshold, kWh. */
  p90DailyExcessKWh: number;
  /** Total energy above the threshold over the year, kWh. */
  annualExcessKWh: number;
  /** Capacity needed to cover the p90 day, incl. efficiency and usable SOC window, kWh. */
  needKWh: number;
  /** Why the need is not allowed to raise the capacity (null when it is). */
  blockedReason: string | null;
}

export interface PeakFloorOutcome {
  need: PeakCapacityNeed;
  /** Capacity chosen on energy alone. */
  energySweetSpotKWh: number;
  /** Final capacity after the soft floor. */
  appliedKWh: number;
  /** Ladder steps peak shaving added (0-2). */
  extraSteps: number;
  /** Reason the floor stopped where it did. */
  stopReason: string;
}



export interface Winners {
  bestSelfConsumption: SimResult | null;
  bestSelfSufficiency: SimResult | null;
  bestPeakShaving: SimResult | null;
  bestEconomy: SimResult | null;
  bestBalance: SimResult | null;
  balanceScores: { key: string; score: number; parts: Record<string, number> }[];
}

export interface SweepResult {
  results: SimResult[];
  byCapacity: Map<number, SimResult[]>;
  sweetSpot: SweetSpot;
  powerSizing: PowerSizing;
  winners: Winners;
  baseline: SimResult;
  /** Separate system verdict on the connection; does not affect the recommendation. */
  gridAssessment: GridAssessment;
  /** Simulation of the recommended battery (capacity + product power). */
  recommended: SimResult;
}

export const resultKey = (r: SimResult) => `${r.capacityKWh}kWh/${r.powerKw}kW`;

/** Energy metrics are the ones the density floor and absolute gain rules apply to. */
export function isEnergyMetric(metric: SweetSpotRule["metric"]): boolean {
  return metric === "totalUsefulKWh" || metric === "shiftedKWh";
}

function metricValue(r: SimResult, metric: SweetSpotRule["metric"]): number {
  switch (metric) {
    case "totalUsefulKWh":
      return r.totalUsefulKWh;
    case "shiftedKWh":
      return r.shiftedKWh;
    case "selfConsumptionPct":
      return r.selfConsumptionPct;
    case "selfSufficiencyPct":
      return r.selfSufficiencyPct;
    case "netPresentValueKr":
      return r.netPresentValueKr;
  }
}

/** Absolute ceiling for adaptive sweep power steps, kW. */
const MAX_SWEEP_POWER_KW = 200;
/** Two power steps closer than this (relative) are treated as duplicates in the table. */
const NEAR_DUPLICATE_REL = 0.05;
/** Adaptive rows are only simulated where the C-rate stays physically plausible. */
const MAX_SWEEP_C_RATE = 2;

/**
 * Extra power steps needed so the table covers the sized power range.
 * Returns [] for a normal villa case, where the base ladder already covers it.
 */
export function adaptivePowerSteps(
  basePowers: number[],
  targetMaxKw: number,
  productSteps: number[],
  mustIncludeKw: number[] = [],
): number[] {
  const base = [...basePowers].filter((p) => p > 0).sort((a, b) => a - b);
  const maxBase = base.length ? base[base.length - 1]! : 0;
  const cap = Math.min(MAX_SWEEP_POWER_KW, Math.max(targetMaxKw, ...mustIncludeKw, 0));
  const candidates = [
    ...productSteps.filter((p) => p > maxBase && p <= cap + 1e-9),
    ...mustIncludeKw.filter((p) => p > 0 && p <= MAX_SWEEP_POWER_KW),
  ].sort((a, b) => a - b);

  const kept: number[] = [];
  const isDuplicate = (p: number) =>
    [...base, ...kept].some((q) => Math.abs(p - q) <= q * NEAR_DUPLICATE_REL);
  for (const p of candidates) {
    if (isDuplicate(p)) continue;
    kept.push(p);
  }
  return kept;
}

/** Robust percentile used for the size signals of the start power (0-1). */
const START_POWER_QUANTILE = 0.9;
/** Fraction of that percentile used as start power: keeps a villa at ~3 kW. */
const START_POWER_FACTOR = 0.7;

function quantile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))));
  return sorted[idx]!;
}

/**
 * Start power for PASS 1 of the capacity ladder.
 *
 * A hard-coded base power (3 kW) only represents a villa: on a large property the probe
 * capacity then comes out far too small, which in turn gives a too small physical power
 * need, which locks the recommendation in a local optimum (see the coupling audit).
 *
 * The start power is therefore scaled from two robust physical signals that already exist
 * in the time series - the 90th percentile of hourly load and of hourly PV surplus - never
 * from the raw peak or the installed PV rating. It is floored at the configured base power,
 * rounded to a product step and capped at the top product step.
 */
export function initialComparisonPower(cfg: LabConfig, series: TimeSeries): number {
  const steps = [...new Set(cfg.powerSizing.productStepsKw)]
    .filter((p) => p > 0)
    .sort((a, b) => a - b);
  const maxStep = steps[steps.length - 1] ?? cfg.powerSizing.basePowerKw;
  const surplus = series.pv.map((pv, i) => Math.max(0, pv - (series.load[i] ?? 0)));
  const signal = Math.max(
    quantile(series.load, START_POWER_QUANTILE),
    quantile(surplus, START_POWER_QUANTILE),
  );
  const wanted = Math.max(cfg.powerSizing.basePowerKw, signal * START_POWER_FACTOR);
  // Nearest (not next-higher) step: a signal a hair above a step must not jump a whole step.
  const nearest = steps.reduce(
    (best, p) => (Math.abs(p - wanted) < Math.abs(best - wanted) ? p : best),
    steps[0] ?? cfg.powerSizing.basePowerKw,
  );
  return Math.min(maxStep, Math.max(cfg.powerSizing.basePowerKw, nearest));
}

/**

 * Adaptive comparison power for the CAPACITY ladder.
 *
 * The ladder must be compared at ONE power, otherwise the capacity curve is distorted
 * by power steps. A hard-coded 3 kW is only representative for a villa, so the power is
 * derived from the simulated physical power need at a probe capacity that comes from a
 * first pass at the base power. Strictly two passes: probe capacity -> comparison power
 * -> final capacity. No loop, so capacity and power cannot iterate against each other.
 */
export function adaptiveComparisonPower(
  cfg: LabConfig,
  series: TimeSeries,
  probeCapacityKWh: number,
): { comparisonPowerKw: number; probeCapacityKWh: number; probeNeedKw: number } {
  const steps = [...new Set(cfg.powerSizing.productStepsKw)]
    .filter((p) => p > 0)
    .sort((a, b) => a - b);
  const maxStep = steps[steps.length - 1] ?? cfg.powerSizing.basePowerKw;
  if (probeCapacityKWh <= 0) {
    return {
      comparisonPowerKw: Math.max(cfg.powerSizing.basePowerKw, initialComparisonPower(cfg, series)),
      probeCapacityKWh: 0,
      probeNeedKw: 0,
    };
  }
  const probeNeedKw = sizePower(cfg, series, probeCapacityKWh).physicalNeedKw;
  // The start power is a physical floor too: pass 2 must not fall below what pass 1 used.
  const floorKw = Math.max(cfg.powerSizing.basePowerKw, initialComparisonPower(cfg, series));
  const wanted = Math.max(floorKw, probeNeedKw);
  // Physics/product bounds: never above the top product step and never above 2 C of the probe.
  const comparisonPowerKw = Math.min(
    maxStep,
    Math.max(
      floorKw,
      Math.min(
        nearestProductStep(wanted, steps),
        nearestProductStep(probeCapacityKWh * MAX_SWEEP_C_RATE, steps),
      ),
    ),
  );
  return { comparisonPowerKw, probeCapacityKWh, probeNeedKw };
}

/** Peaks must recur at least this many days/year before they may raise the capacity. */
const PEAK_FLOOR_MIN_RECURRING_DAYS = 60;
/** Robust level of the daily peak energy used as the floor (0-1) — not the worst day. */
const PEAK_FLOOR_QUANTILE = 0.9;
/** Peak shaving may add at most this many ladder steps above the energy sweet spot. */
const PEAK_FLOOR_MAX_EXTRA_STEPS = 2;
/** A step added by the floor must still deliver this share of the normal density floor. */
const PEAK_FLOOR_DENSITY_RELAX = 0.6;

/**
 * Soft peak-shaving capacity need.
 *
 * The energy rules (density floor + marginal decay) measure kWh/year and therefore miss
 * the last capacity step, which typically delivers little energy but most of the peak
 * reduction. This function states the physical requirement instead: to hold the modelled
 * monthly threshold on a NORMAL peak day the battery must be able to deliver the p90 of
 * the daily excess energy, corrected for discharge efficiency and the usable SOC window.
 *
 * p90 — not the annual maximum — so a single extreme day cannot size the battery, and the
 * need is only "active" when the peaks actually recur (>= 60 days/year).
 */
export function peakCapacityNeed(cfg: LabConfig, series: TimeSeries): PeakCapacityNeed {
  const peak = cfg.peakShaving;
  const empty: PeakCapacityNeed = {
    active: false,
    peakKw: 0,
    thresholdKw: 0,
    recurringDays: 0,
    p90DailyExcessKWh: 0,
    annualExcessKWh: 0,
    needKWh: 0,
    blockedReason: "Peak shaving är inte aktiverat.",
  };
  if (!cfg.strategies.peakShaving) return empty;

  const hours = series.load.length;
  const base = baseline(series, computeGridLimits(cfg.grid));

  // Same modelled monthly thresholds as the dispatch: monthly peak in active hours,
  // reduced by the target, and Infinity for months where shaving is off.
  const monthPeak = new Array(12).fill(0) as number[];
  for (let h = 0; h < hours; h++) {
    if (!peak.activeHours.includes(h % 24)) continue;
    const mi = (series.monthOfHour[h] ?? 1) - 1;
    monthPeak[mi] = Math.max(monthPeak[mi] ?? 0, base.imp[h] ?? 0);
  }
  const thresholds = monthPeak.map((p, mi) =>
    peak.activeMonths.includes(mi + 1) ? p * (1 - peak.targetReductionPct / 100) : Infinity,
  );

  const dailyExcess: number[] = [];
  let annualExcessKWh = 0;
  const days = Math.floor(hours / 24);
  for (let d = 0; d < days; d++) {
    let e = 0;
    for (let k = 0; k < 24; k++) {
      const h = d * 24 + k;
      if (!peak.activeHours.includes(h % 24)) continue;
      const thr = thresholds[(series.monthOfHour[h] ?? 1) - 1] ?? Infinity;
      if (!Number.isFinite(thr)) continue;
      e += Math.max(0, (base.imp[h] ?? 0) - thr);
    }
    if (e > 1e-9) dailyExcess.push(e);
    annualExcessKWh += e;
  }

  const finiteThresholds = thresholds.filter((t) => Number.isFinite(t));
  const out: PeakCapacityNeed = {
    active: false,
    peakKw: Math.max(0, ...monthPeak),
    thresholdKw: finiteThresholds.length ? Math.min(...finiteThresholds) : 0,
    recurringDays: dailyExcess.length,
    p90DailyExcessKWh: quantile(dailyExcess, PEAK_FLOOR_QUANTILE),
    annualExcessKWh,
    needKWh: 0,
    blockedReason: null,
  };

  // Usable share of nominal capacity (SOC window, backup reserve) and discharge losses.
  const win = resolveWindow(cfg.battery, cfg.strategies, cfg.flex, 1, 1);
  const usableFrac = Math.max(0.05, win.socCeilKWh - win.socFloorKWh);
  const dischargeEff = Math.max(0.1, win.dischargeEff);

  out.needKWh = out.p90DailyExcessKWh / (usableFrac * dischargeEff);

  if (out.recurringDays < PEAK_FLOOR_MIN_RECURRING_DAYS) {
    out.blockedReason =
      `Topparna återkommer bara ${out.recurringDays} dygn/år (krav ${PEAK_FLOOR_MIN_RECURRING_DAYS}) ` +
      `— enstaka extremdygn får inte höja kapaciteten.`;
    return out;
  }
  out.active = true;
  return out;
}

/**
 * Applies the peak need as a SOFT floor on the capacity ladder:
 *   final = max(energy sweet spot, largest step still justified by the peak need)
 * bounded by (a) at most PEAK_FLOOR_MAX_EXTRA_STEPS steps, (b) the peak need itself, and
 * (c) a relaxed density gate, so a step with essentially no energy benefit is still refused.
 */
export function applyPeakFloor(
  spot: SweetSpot,
  capacities: number[],
  need: PeakCapacityNeed,
  rule: SweetSpotRule,
): PeakFloorOutcome {
  const energySweetSpotKWh = spot.recommendedCapacityKWh;
  const out: PeakFloorOutcome = {
    need,
    energySweetSpotKWh,
    appliedKWh: energySweetSpotKWh,
    extraSteps: 0,
    stopReason: need.blockedReason ?? "Peak-golvet ligger under energivalet.",
  };
  if (!need.active) return out;
  if (need.needKWh <= energySweetSpotKWh + 1e-9) return out;

  const ladder = (
    rule.maxNormalCapacityKWh > 0
      ? capacities.filter((c) => c <= rule.maxNormalCapacityKWh + 1e-9)
      : capacities
  )
    .filter((c) => c > energySweetSpotKWh)
    .sort((a, b) => a - b);

  const densityGate = isEnergyMetric(rule.metric)
    ? Math.max(0, rule.minGainPerAddedKWh) * PEAK_FLOOR_DENSITY_RELAX
    : 0;

  let current = energySweetSpotKWh;
  for (const cap of ladder) {
    if (out.extraSteps >= PEAK_FLOOR_MAX_EXTRA_STEPS) {
      out.stopReason = `Peak-golvet får som mest lägga till ${PEAK_FLOOR_MAX_EXTRA_STEPS} steg.`;
      break;
    }
    if (current >= need.needKWh - 1e-9) {
      out.stopReason = "Peak-behovet är täckt.";
      break;
    }
    const step = spot.steps.find((s) => s.toKWh === cap);
    const density = step?.deltaPerExtraKWh ?? 0;
    if (densityGate > 0 && density < densityGate) {
      out.stopReason =
        `Steget till ${cap} kWh ger bara ${density.toFixed(1)} kWh/år per tillagd kWh ` +
        `(spärr ${densityGate.toFixed(0)}) — peak-golvet får inte höja kapaciteten dit.`;
      break;
    }
    current = cap;
    out.extraSteps += 1;
    out.appliedKWh = cap;
    out.stopReason = "Peak-behovet är täckt.";
  }
  return out;
}


export function runSweep(cfg: LabConfig, seriesOverride?: TimeSeries): SweepResult {
  const series = seriesOverride ?? buildSeries(cfg);

  const results: SimResult[] = [];
  const capacities = [...cfg.sweep.capacitiesKWh].sort((a, b) => a - b);
  const powers = [...cfg.sweep.powersKw].sort((a, b) => a - b);

  for (const cap of capacities) {
    if (cap === 0) {
      results.push(simulate(cfg, series, 0, 0));
      continue;
    }
    for (const p of powers) results.push(simulate(cfg, series, cap, p));
  }

  // Pass 1: capacity ladder at the size-scaled start power -> probe capacity (never reported).
  const startPowerKw = initialComparisonPower(cfg, series);
  for (const cap of capacities) {
    if (cap <= 0) continue;
    if (startPowerKw > cap * MAX_SWEEP_C_RATE + 1e-9) continue;
    if (results.some((r) => r.capacityKWh === cap && r.powerKw === startPowerKw)) continue;
    results.push(simulate(cfg, series, cap, startPowerKw));
  }
  const probeSpot = findSweetSpot(results, {
    ...cfg.sweetSpot,
    comparisonPowerKw: startPowerKw,
  });
  // Pass 2 input: comparison power (manual when > 0, otherwise adaptive from the probe).
  const probe =
    cfg.sweetSpot.comparisonPowerKw > 0
      ? {
          comparisonPowerKw: cfg.sweetSpot.comparisonPowerKw,
          probeCapacityKWh: 0,
          probeNeedKw: 0,
        }
      : adaptiveComparisonPower(cfg, series, probeSpot.recommendedCapacityKWh);
  // The comparison power must exist as a row wherever it is physically reasonable.
  for (const cap of capacities) {
    if (cap <= 0) continue;
    if (probe.comparisonPowerKw > cap * MAX_SWEEP_C_RATE + 1e-9) continue;
    if (results.some((r) => r.capacityKWh === cap && r.powerKw === probe.comparisonPowerKw)) continue;
    results.push(simulate(cfg, series, cap, probe.comparisonPowerKw));
  }

  const baselineResult = results.find((r) => r.capacityKWh === 0) ?? simulate(cfg, series, 0, 0);
  // Step 2: capacity ladder at that fixed power. Step 3 below sizes kW for the winner.
  const capacitySpot = findSweetSpot(results, {
    ...cfg.sweetSpot,
    comparisonPowerKw: probe.comparisonPowerKw,
  });
  /**
   * Step 2b: soft peak-shaving floor. Only raises the capacity, never lowers it, and only
   * for recurring peaks that pass the relaxed density gate. Power sizing is untouched.
   */
  const peakFloor = applyPeakFloor(
    capacitySpot,
    capacities,
    peakCapacityNeed(cfg, series),
    cfg.sweetSpot,
  );
  /**
   * Step 2c: ancillary floor. When the owner has chosen to reserve power for the
   * frequency market, the battery must at least be able to HOLD that reservation.
   * This is a technical requirement, not a claimed benefit: no revenue is assumed,
   * and the floor is skipped entirely when ancillary services are off.
   */
  const ancFloor = ancillaryCapacityFloor(cfg, capacities);
  const finalCapacityKWh = Math.max(
    capacitySpot.recommendedCapacityKWh,
    peakFloor.appliedKWh,
    ancFloor.capacityKWh,
  );
  // kW is sized separately for the chosen capacity; kWh is untouched.
  const powerSizingRaw = sizePower(cfg, series, finalCapacityKWh);
  const powerSizing =
    ancFloor.powerKw > (powerSizingRaw.productKw || 0)
      ? { ...powerSizingRaw, productKw: ancFloor.powerKw }
      : powerSizingRaw;
  const sweetSpot: SweetSpot = {
    ...capacitySpot,
    recommendedCapacityKWh: finalCapacityKWh,
    recommendedPowerKw: powerSizing.productKw || capacitySpot.recommendedPowerKw,
    power: powerSizing,
    comparisonPower: probe.comparisonPowerKw,
    probeCapacityKWh: probe.probeCapacityKWh,
    peakFloor,
    explanation:
      capacitySpot.explanation +
      (peakFloor.extraSteps > 0
        ? ` Peak shaving höjde kapaciteten från ${peakFloor.energySweetSpotKWh} till ` +
          `${peakFloor.appliedKWh} kWh (${peakFloor.extraSteps} steg): topparna återkommer ` +
          `${peakFloor.need.recurringDays} dygn/år och p90-dygnet kräver ` +
          `${peakFloor.need.needKWh.toFixed(1)} kWh för att hålla tröskeln ` +
          `${peakFloor.need.thresholdKw.toFixed(1)} kW. Peak-målet är mjukt: golvet ger som mest ` +
          `${PEAK_FLOOR_MAX_EXTRA_STEPS} steg och kräver att stegen ändå passerar en sänkt ` +
          `täthetsspärr (60 % av golvet).`
        : peakFloor.need.needKWh > peakFloor.energySweetSpotKWh
          ? ` Peak-golvet höjde inte kapaciteten: ${peakFloor.stopReason}`
          : "") +
      (ancFloor.capacityKWh > 0 || ancFloor.powerKw > 0
        ? ` Stödtjänster kräver minst ${ancFloor.capacityKWh} kWh och ${ancFloor.powerKw} kW för att` +
          ` kunna hålla den bokade reservationen (ingen intäkt antas).`
        : ""),
  };


  /**
   * Adaptive table rows: only added when the sizing itself points above the base
   * ladder, so a villa run simulates exactly the same cells as before.
   */
  const extraPowers = adaptivePowerSteps(
    powers,
    Math.max(powerSizing.physicalNeedKw, powerSizing.productKw),
    [...new Set(cfg.powerSizing.productStepsKw)].sort((a, b) => a - b),
    [sweetSpot.recommendedPowerKw],
  );
  for (const p of extraPowers) {
    for (const cap of capacities) {
      if (cap <= 0) continue;
      const relevant =
        p <= cap * MAX_SWEEP_C_RATE + 1e-9 ||
        (cap === sweetSpot.recommendedCapacityKWh && p === sweetSpot.recommendedPowerKw);
      if (!relevant) continue;
      if (results.some((r) => r.capacityKWh === cap && r.powerKw === p)) continue;
      results.push(simulate(cfg, series, cap, p));
    }
  }
  results.sort((a, b) => a.capacityKWh - b.capacityKWh || a.powerKw - b.powerKw);

  const byCapacity = new Map<number, SimResult[]>();
  for (const r of results) {
    const list = byCapacity.get(r.capacityKWh) ?? [];
    list.push(r);
    byCapacity.set(r.capacityKWh, list);
  }

  const winners = findWinners(results, cfg.weights);

  const recommended =
    results.find(
      (r) =>
        r.capacityKWh === sweetSpot.recommendedCapacityKWh &&
        r.powerKw === sweetSpot.recommendedPowerKw,
    ) ??
    (sweetSpot.recommendedCapacityKWh > 0
      ? simulate(cfg, series, sweetSpot.recommendedCapacityKWh, sweetSpot.recommendedPowerKw)
      : baselineResult);
  const gridAssessment = assessGrid(recommended, baselineResult, cfg.gridAssessment);


  return {
    results,
    byCapacity,
    sweetSpot,
    powerSizing,
    winners,
    baseline: baselineResult,
    recommended,
    gridAssessment,
  };
}

/**
 * The recommendation comes ONLY from the sweep: for each capacity we take the
 * best result over all powers, walk the capacity ladder upwards and stop where
 * an extra step no longer delivers `minRelativeGainPct` on the chosen metric.
 */
/** Smallest power that is within the tolerance of the best metric at the largest capacity. */
function pickComparisonPower(results: SimResult[], rule: SweetSpotRule): number {
  if (rule.comparisonPowerKw > 0) return rule.comparisonPowerKw;
  const caps = results.map((r) => r.capacityKWh).filter((c) => c > 0);
  if (!caps.length) return 0;
  const maxCap = Math.max(...caps);
  const list = results.filter((r) => r.capacityKWh === maxCap);
  const best = Math.max(...list.map((r) => metricValue(r, rule.metric)));
  const threshold = best * (1 - rule.powerTolerancePct / 100);
  const good = list
    .filter((r) => metricValue(r, rule.metric) >= threshold)
    .sort((a, b) => a.powerKw - b.powerKw);
  return good[0]?.powerKw ?? list[0]?.powerKw ?? 0;
}

/**
 * Geometric knee: normalise the capacity curve to the unit square and take the point
 * with the largest perpendicular distance to the chord between first and last point.
 */
function kneeCapacity(points: { cap: number; value: number }[]): number | null {
  if (points.length < 3) return points[points.length - 1]?.cap ?? null;
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const dx = last.cap - first.cap;
  const dy = last.value - first.value;
  if (dx === 0 || dy === 0) return null;
  let bestCap: number | null = null;
  let bestDist = -Infinity;
  for (const p of points) {
    const x = (p.cap - first.cap) / dx;
    const y = (p.value - first.value) / dy;
    // distance from (x,y) to the line y = x, positive above the chord
    const dist = y - x;
    if (dist > bestDist) {
      bestDist = dist;
      bestCap = p.cap;
    }
  }
  return bestCap;
}

export function findSweetSpot(results: SimResult[], rule: SweetSpotRule): SweetSpot {
  const capacities = [...new Set(results.map((r) => r.capacityKWh))]
    .filter((c) => c > 0)
    .sort((a, b) => a - b);

  const comparisonPower = pickComparisonPower(results, rule);

  const bestPerCapacity = new Map<number, SimResult>();
  for (const cap of capacities) {
    const list = results.filter((r) => r.capacityKWh === cap);
    // Compare capacities at one fixed power so the ladder is not distorted by power steps.
    const atPower = list.filter((r) => r.powerKw === comparisonPower);
    const pool = atPower.length ? atPower : list;
    let best = pool[0];
    for (const r of pool) {
      if (!best || metricValue(r, rule.metric) > metricValue(best, rule.metric)) best = r;
    }
    if (best) bestPerCapacity.set(cap, best);
  }

  const ladder =
    rule.maxNormalCapacityKWh > 0
      ? capacities.filter((c) => c <= rule.maxNormalCapacityKWh + 1e-9)
      : capacities;
  const usedCapacities = ladder.length ? ladder : capacities;

  const annualPvKWh = bestPerCapacity.get(usedCapacities[0] ?? 0)?.annualPvKWh ?? 0;
  // Absolute requirement only makes sense for an energy metric.
  const absoluteRequirementKWh =
    isEnergyMetric(rule.metric) ? (annualPvKWh * rule.absoluteGainPctOfAnnualPv) / 100 : 0;
  /**
   * Scale-free density floor, kWh delivered per YEAR per added kWh of capacity.
   *
   * The relative rules (40/60 %) and the PV-scaled absolute rule both collapse when
   * solar production is ~0: the requirement becomes ~0 kWh and every step keeps the
   * same marginal ratio, so the ladder runs to the upper test limit. This floor is a
   * physical statement instead: an extra kWh of battery that delivers less than
   * `minGainPerAddedKWh` kWh/year (≈ that many equivalent cycles for the increment)
   * is not worth installing — no matter where the energy comes from. It therefore
   * never special-cases PV = 0 and still lets peak shaving or grid charging carry a
   * battery on their own merits.
   */
  const densityFloor = isEnergyMetric(rule.metric) ? Math.max(0, rule.minGainPerAddedKWh) : 0;



  const steps: MarginalStep[] = [];
  let chosen = 0;
  let diminishingFrom: number | null = null;
  let stopped = false;
  let upperLimitReached = false;
  let lastAcceptedRatio = Infinity;
  /** The absolute-gain override may fire at most once, and it ends the ladder. */
  let overrideUsedAt: number | null = null;

  for (let i = 0; i < usedCapacities.length; i++) {
    const cap = usedCapacities[i] ?? 0;
    const r = bestPerCapacity.get(cap);
    if (!r) continue;
    const prevCap = i === 0 ? 0 : (usedCapacities[i - 1] ?? 0);
    const prev = i === 0 ? null : bestPerCapacity.get(prevCap);
    const cur = metricValue(r, rule.metric);
    const prevVal = prev ? metricValue(prev, rule.metric) : 0;
    const deltaAbs = cur - prevVal;
    const stepKWh = cap - prevCap;
    const gainPerAddedKWh = stepKWh > 0 ? deltaAbs / stepKWh : 0;
    const deltaRelPct = prevVal !== 0 ? (deltaAbs / Math.abs(prevVal)) * 100 : Infinity;
    /**
     * The marginal ratio is computed on gain PER ADDED kWh, not on the raw step gain.
     * Raw gains scale with the step length, so an uneven ladder (5, 5, 10, 25, 50 kWh)
     * produced ratios of 200-250 % exactly where the ladder got coarser — a pure grid
     * artefact. Density is invariant to how the same interval is subdivided.
     */
    const prevDensity = steps.length ? (steps[steps.length - 1]?.deltaPerExtraKWh ?? 0) : 0;
    const marginalRatioPct =
      steps.length === 0 ? Infinity : prevDensity > 0 ? (gainPerAddedKWh / prevDensity) * 100 : 0;

    let decision: MarginalStep["decision"] = "not-evaluated";
    let worthwhile = false;

    if (rule.method === "marginal-decay") {
      if (stopped) {
        decision = "not-evaluated";
      } else if (densityFloor > 0 && gainPerAddedKWh < densityFloor) {
        // Physically too little delivered energy per added kWh, whatever the ratio says.
        decision = "stopped-density";
      } else if (i === 0) {
        worthwhile = deltaAbs > 0;
        decision = worthwhile ? "accepted" : "stopped-decay";


      } else if (marginalRatioPct >= rule.marginalContinueRatioPct) {
        // Clear remaining benefit → keep going.
        worthwhile = deltaAbs > 0;
        decision = worthwhile ? "accepted" : "stopped-decay";
      } else if (marginalRatioPct < rule.marginalStopRatioPct) {
        // Clear decay by ratio, but a step that still delivers well above the physical
        // density floor may justify ONE more step. The threshold is expressed per added
        // kWh (floor x override factor) instead of as a share of annual PV, so it means
        // the same thing on a 2.5 kWh ladder as on a 50 kWh one and it does not explode
        // on large PV systems.
        const overrideThresholdPerKWh = rule.absoluteOverrideFactor * densityFloor;
        if (
          rule.absoluteOverrideFactor > 0 &&
          overrideUsedAt === null &&
          overrideThresholdPerKWh > 0 &&
          gainPerAddedKWh >= overrideThresholdPerKWh
        ) {
          worthwhile = true;
          overrideUsedAt = cap;
          decision = "accepted-absolute-override";
        } else {
          decision = "stopped-decay";
        }
      } else {
        // Grey zone: the density floor above is already the physical acceptance test.
        worthwhile = deltaAbs > 0;
        decision = worthwhile ? "accepted" : "stopped-decay";
      }

      if (worthwhile) {
        chosen = cap;
        lastAcceptedRatio = marginalRatioPct;
        if (decision === "accepted-absolute-override") {
          // Hard guarantee: the override grants exactly one extra step, never a chain.
          stopped = true;
          diminishingFrom = usedCapacities[i + 1] ?? null;
        }
      } else if (!stopped) {
        stopped = true;
        diminishingFrom = cap;
        /**
         * Node snapping. When the density floor is what stopped the ladder, the true
         * crossing lies somewhere inside the rejected interval. Taking the last accepted
         * node makes the answer depend on where the ladder happens to have nodes, so the
         * crossing is interpolated between the two interval midpoints and the NEAREST
         * available node is chosen. Same physics -> same capacity, whatever the resolution.
         */
        if (decision === "stopped-density" && densityFloor > 0 && chosen > 0) {
          const prevStep = steps[steps.length - 1];
          const prevDens = prevStep?.deltaPerExtraKWh ?? 0;
          if (prevDens > densityFloor && gainPerAddedKWh < densityFloor) {
            const mPrev = ((prevStep?.fromKWh ?? 0) + (prevStep?.toKWh ?? 0)) / 2;
            const mCur = (prevCap + cap) / 2;
            const frac = (prevDens - densityFloor) / (prevDens - gainPerAddedKWh);
            const crossing = mPrev + frac * (mCur - mPrev);
            if (Math.abs(cap - crossing) < Math.abs(crossing - chosen)) {
              chosen = cap;
              diminishingFrom = usedCapacities[i + 1] ?? null;
            }
          }
        }
      }

    } else {
      const meetsUse =
        r.equivalentFullCycles >= rule.minCyclesPerYear &&
        r.utilisationPct >= rule.minUtilisationPct;
      worthwhile = deltaRelPct >= rule.minRelativeGainPct && meetsUse;
      decision = worthwhile ? "accepted" : "stopped-decay";
      if (worthwhile) chosen = cap;
      else if (diminishingFrom === null) diminishingFrom = cap;
    }

    steps.push({
      fromKWh: prevCap,
      toKWh: cap,
      metric: cur,
      previousMetric: prevVal,
      deltaAbs,
      deltaRelPct,
      deltaPerExtraKWh: cap - prevCap > 0 ? deltaAbs / (cap - prevCap) : 0,
      utilisationPct: r.utilisationPct,
      cycles: r.equivalentFullCycles,
      worthwhile,
      marginalRatioPct,
      absoluteRequirementKWh,
      decision,
    });
  }

  let kneeCap: number | null = null;
  if (rule.method === "knee") {
    const points = usedCapacities
      .map((cap) => ({ cap, value: metricValue(bestPerCapacity.get(cap)!, rule.metric) }))
      .filter((p) => Number.isFinite(p.value));
    kneeCap = kneeCapacity(points);
    if (kneeCap !== null) {
      const ok = (cap: number) => {
        const r = bestPerCapacity.get(cap);
        return (
          !!r &&
          r.equivalentFullCycles >= rule.minCyclesPerYear &&
          r.utilisationPct >= rule.minUtilisationPct
        );
      };
      let i = usedCapacities.indexOf(kneeCap);
      while (i > 0 && !ok(usedCapacities[i]!)) i--;
      chosen = usedCapacities[i] ?? kneeCap;
      const nextIdx = usedCapacities.indexOf(chosen) + 1;
      diminishingFrom = usedCapacities[nextIdx] ?? null;
    }
  }

  if (
    rule.method === "marginal-decay" &&
    !stopped &&
    chosen === usedCapacities[usedCapacities.length - 1] &&
    lastAcceptedRatio >= rule.marginalContinueRatioPct
  ) {
    upperLimitReached = true;
  }

  /**
   * Fallback power pick only. The real kW recommendation comes from sizePower()
   * (base power -> verified upgrade -> grid check) and is applied in runSweep.
   */
  const chosenResults = results.filter((r) => r.capacityKWh === chosen);
  let bestPower = chosenResults[0]?.powerKw ?? 0;
  if (chosenResults.length) {
    const bestVal = Math.max(...chosenResults.map((r) => metricValue(r, rule.metric)));
    const threshold = bestVal * (1 - rule.powerTolerancePct / 100);
    const good = chosenResults
      .filter((r) => metricValue(r, rule.metric) >= threshold)
      .sort((a, b) => a.powerKw - b.powerKw);
    bestPower = good[0]?.powerKw ?? bestPower;
  }

  const idx = usedCapacities.indexOf(chosen);
  const range: [number, number] = [
    usedCapacities[Math.max(0, idx - 1)] ?? chosen,
    usedCapacities[Math.min(usedCapacities.length - 1, idx + 1)] ?? chosen,
  ];

  const chosenStep = steps.find((s) => s.toKWh === chosen);
  const nextStep = steps.find((s) => s.fromKWh === chosen);
  const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 1 });

  const utilisationWarning =
    chosenStep &&
    (chosenStep.cycles < rule.minCyclesPerYear ||
      chosenStep.utilisationPct < rule.minUtilisationPct)
      ? `Låg användning: ${fmt(chosenStep.utilisationPct)} % nyttjande och ${fmt(
          chosenStep.cycles,
        )} cykler/år (indikativa riktvärden ${fmt(rule.minUtilisationPct)} % och ${fmt(
          rule.minCyclesPerYear,
        )} cykler/år). Detta är en kvalitetsindikator och påverkar inte rekommendationen.`
      : null;

  const decayExplanation =
    `${fmt(chosen)} kWh valdes med marginalfallsregeln: kapaciteterna jämförs vid fast ` +
    `batterieffekt ${fmt(comparisonPower)} kW på ${rule.metric}. Ett steg accepteras när ` +
    `marginalnyttan är ≥ ${fmt(rule.marginalContinueRatioPct)} % av föregående steg, stoppas ` +
    `under ${fmt(rule.marginalStopRatioPct)} %, och i gränszonen avgörs det av det absoluta ` +
    `nyttokravet ${fmt(rule.absoluteGainPctOfAnnualPv)} % av årlig solproduktion = ${fmt(
      absoluteRequirementKWh,
    )} kWh/år.` +
    (overrideUsedAt !== null
      ? ` Steget till ${fmt(overrideUsedAt)} kWh accepterades trots marginalfall eftersom den ` +
        `absoluta nyttan var ≥ ${fmt(rule.absoluteOverrideFactor)} × nyttokravet; överridet ` +
        `ger som mest ett extra steg.`
      : "") +
    (nextStep
      ? ` Nästa steg ${fmt(nextStep.fromKWh)} → ${fmt(nextStep.toKWh)} kWh ger ${fmt(
          nextStep.deltaAbs,
        )} kWh (${fmt(nextStep.marginalRatioPct)} % av föregående marginal) → ${
          nextStep.decision === "stopped-absolute"
            ? "stoppat på absolut nytta"
            : nextStep.decision === "stopped-decay"
              ? "stoppat på marginalfall"
              : nextStep.decision === "stopped-density"
                ? `stoppat på täthetskravet (${fmt(
                    nextStep.deltaPerExtraKWh,
                  )} kWh/år per extra kWh mot kravet ${fmt(rule.minGainPerAddedKWh)})`
                : nextStep.decision === "accepted-absolute-override"
                  ? "accepterat via absolut override"
                  : nextStep.decision === "not-evaluated"
                    ? "inte utvärderat (laddern stoppade tidigare)"
                    : "accepterat"
        }.`

      : upperLimitReached
        ? ` Nyttokurvan planar inte tydligt ut vid ${fmt(
            chosen,
          )} kWh — resultatet markeras "30 kWh+ / övre testgräns nådd" och extrapoleras inte.`
        : "") +
    (utilisationWarning ? ` ${utilisationWarning}` : "");

  const kneeExplanation = `${fmt(chosen)} kWh valdes med knäanalys vid fast batterieffekt ${fmt(
    comparisonPower,
  )} kW${kneeCap !== null && kneeCap !== chosen ? ` (geometriskt knä ${fmt(kneeCap)} kWh)` : ""}.`;
  const thresholdExplanation = nextStep
    ? `${fmt(chosen)} kWh valdes eftersom steget ${fmt(nextStep.fromKWh)} → ${fmt(
        nextStep.toKWh,
      )} kWh endast gav ${fmt(nextStep.deltaRelPct)} % mer på ${rule.metric} (${fmt(
        nextStep.deltaAbs,
      )} i absoluta tal). Tröskeln är ${fmt(rule.minRelativeGainPct)} % relativ förbättring.`
    : `${fmt(chosen)} kWh är största testade storleken som fortfarande klarade tröskeln ${fmt(
        rule.minRelativeGainPct,
      )} % relativ förbättring.`;
  const explanation =
    rule.method === "marginal-decay"
      ? decayExplanation
      : rule.method === "knee"
        ? kneeExplanation
        : thresholdExplanation;

  return {
    recommendedCapacityKWh: chosen,
    recommendedPowerKw: bestPower,
    reasonableRangeKWh: range,
    diminishingFromKWh: diminishingFrom,
    steps,
    metric: rule.metric,
    explanation,
    upperLimitReached,
    utilisationWarning,
  };
}


function normalise(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (!isFinite(min) || !isFinite(max) || max === min) return values.map(() => 0);
  return values.map((v) => (v - min) / (max - min));
}

export function findWinners(results: SimResult[], weights: BalanceWeights): Winners {
  const withBattery = results.filter((r) => r.capacityKWh > 0);
  const pick = (fn: (r: SimResult) => number): SimResult | null => {
    let best: SimResult | null = null;
    for (const r of withBattery) if (!best || fn(r) > fn(best)) best = r;
    return best;
  };

  const sc = normalise(withBattery.map((r) => r.selfConsumptionPct));
  const ss = normalise(withBattery.map((r) => r.selfSufficiencyPct));
  const pk = normalise(withBattery.map((r) => r.peakReductionPct));
  
  const ut = normalise(withBattery.map((r) => r.utilisationPct));

  const scores = withBattery.map((r, i) => {
    const parts = {
      selfConsumption: (sc[i] ?? 0) * weights.selfConsumption,
      selfSufficiency: (ss[i] ?? 0) * weights.selfSufficiency,
      peakReduction: (pk[i] ?? 0) * weights.peakReduction,
      // Ekonomi ingår inte i balansbedömningen (ingen dold ekonomisk vikt).
      economy: 0,
      utilisation: (ut[i] ?? 0) * weights.utilisation,
    };
    const total = Object.values(parts).reduce((a, b) => a + b, 0);
    return { key: resultKey(r), score: total, parts, result: r };
  });

  let bestBalance: SimResult | null = null;
  let bestScore = -Infinity;
  for (const s of scores) {
    if (s.score > bestScore) {
      bestScore = s.score;
      bestBalance = s.result;
    }
  }

  return {
    bestSelfConsumption: pick((r) => r.selfConsumptionPct),
    bestSelfSufficiency: pick((r) => r.selfSufficiencyPct),
    bestPeakShaving: pick((r) => r.peakReductionPct),
    bestEconomy: pick((r) => r.netPresentValueKr),
    bestBalance,
    balanceScores: scores
      .map(({ key, score, parts }) => ({ key, score, parts }))
      .sort((a, b) => b.score - a.score),
  };
}


/**
 * Minimum battery the chosen ancillary reservation requires. Purely technical:
 * enough power to offer the bid and enough energy to cover the endurance inside the
 * service SOC window. Returns zeros when ancillary services are off.
 */
export function ancillaryCapacityFloor(
  cfg: LabConfig,
  capacities: number[],
): { capacityKWh: number; powerKw: number } {
  if (!cfg.strategies.ancillaryServices) return { capacityKWh: 0, powerKw: 0 };
  const plan = ancillaryPlan(cfg.ancillary);
  if (!plan) return { capacityKWh: 0, powerKw: 0 };
  const powerNeedKw = Math.max(plan.upPowerKw, plan.downPowerKw);
  const eff = Math.sqrt(Math.max(cfg.battery.roundTripEfficiency, 1e-9));
  const windowShare = Math.max(
    0.05,
    (plan.serviceMaxSocPct - plan.serviceMinSocPct - plan.socHeadroomPct) / 100,
  );
  const energyNeedKWh = Math.max(plan.upEnergyKWh / eff, plan.downEnergyKWh * eff);
  const nominalNeedKWh = energyNeedKWh / windowShare;
  const capacityKWh =
    capacities.filter((c) => c > 0).find((c) => c >= nominalNeedKWh - 1e-9) ??
    Math.max(...capacities, 0);
  const steps = [...new Set(cfg.powerSizing.productStepsKw)].sort((a, b) => a - b);
  const powerKw = steps.find((p) => p >= powerNeedKw - 1e-9) ?? Math.max(...steps, powerNeedKw);
  return { capacityKWh, powerKw };
}
