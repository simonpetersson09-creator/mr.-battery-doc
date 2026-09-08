import { HOURS_PER_YEAR, MONTH_DAYS } from "./defaults";
import { isWeekendDay, profileHourWeight } from "./loadProfiles";
import type {
  ConsumptionInput,
  SelfConsumptionCalibration,
  SolarInput,
  TimeSeries,
  VariabilityConfig,
} from "./types";


/** Modelled daylight half-width in hours, per month (Jan..Dec, mid Sweden). */
const SOLAR_HALF_WIDTH = [3.2, 4.2, 5.4, 6.6, 7.6, 8.1, 7.9, 7.0, 5.9, 4.7, 3.5, 2.9];

export function monthOfHourArray(): number[] {
  const out: number[] = [];
  MONTH_DAYS.forEach((days, mi) => {
    for (let i = 0; i < days * 24; i++) out.push(mi + 1);
  });
  return out;
}

export function hourOfDayArray(): number[] {
  return Array.from({ length: HOURS_PER_YEAR }, (_, i) => i % 24);
}

function monthHourRanges(): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  let cursor = 0;
  for (const days of MONTH_DAYS) {
    out.push({ start: cursor, end: cursor + days * 24 });
    cursor += days * 24;
  }
  return out;
}

/**
 * Distributes `total` over the given hour range using `weightOf(hour)` so the
 * sum is EXACTLY `total` (residual is placed on the largest hour).
 */
function distributeExact(
  target: number[],
  start: number,
  end: number,
  total: number,
  weightOf: (globalHour: number) => number,
): void {
  let weightSum = 0;
  for (let h = start; h < end; h++) weightSum += weightOf(h);
  if (weightSum <= 0 || total <= 0) {
    for (let h = start; h < end; h++) target[h] = 0;
    return;
  }
  const factor = total / weightSum;
  let assigned = 0;
  let maxHour = start;
  let maxVal = -Infinity;
  for (let h = start; h < end; h++) {
    const v = weightOf(h) * factor;
    target[h] = v;
    assigned += v;
    if (v > maxVal) {
      maxVal = v;
      maxHour = h;
    }
  }
  target[maxHour] = (target[maxHour] ?? 0) + (total - assigned);
}


/** Deterministic 0..1 pseudo random from an integer key (mulberry32-style). */
function rand01(seed: number, key: number): number {
  let t = (seed * 2654435761 + key * 2246822519 + 3266489917) >>> 0;
  t = (t ^ (t >>> 15)) * (t | 1);
  t ^= t + (t ^ (t >>> 7)) * (t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Per-day multipliers with mean 1: a smooth spread plus a share of atypical
 * days (very cloudy / away). MODELLED, deterministic for a given seed.
 */
function dailyFactors(v: VariabilityConfig, kind: 0 | 1, spreadPct: number): number[] {
  const out = new Array<number>(365).fill(1);
  if (!v.enabled || spreadPct <= 0) return out;
  const spread = spreadPct / 100;
  const atypical = Math.max(0, Math.min(60, v.atypicalDayPct)) / 100;
  for (let d = 0; d < 365; d++) {
    const u = rand01(v.seed + kind * 7919, d + 1);
    // triangular-ish symmetric noise around 1
    const n = (u + rand01(v.seed + kind * 104729, d + 5001)) / 2 - 0.5;
    let f = 1 + 2 * n * spread;
    if (rand01(v.seed + kind * 15485863, d + 9001) < atypical) {
      f *= kind === 0 ? 0.35 : 0.6; // heavily overcast day / away day
    }
    out[d] = Math.max(0.05, f);
  }
  return out;
}

/** Scales each day by its factor and rescales the month back to `total`. */
function applyDailyVariation(
  target: number[],
  start: number,
  end: number,
  total: number,
  factors: number[],
): void {
  if (total <= 0) return;
  let sum = 0;
  for (let h = start; h < end; h++) {
    const day = Math.floor(h / 24);
    target[h] = (target[h] ?? 0) * (factors[day] ?? 1);
    sum += target[h] ?? 0;
  }
  if (sum <= 0) return;
  const k = total / sum;
  let assigned = 0;
  let maxHour = start;
  let maxVal = -Infinity;
  for (let h = start; h < end; h++) {
    const v = (target[h] ?? 0) * k;
    target[h] = v;
    assigned += v;
    if (v > maxVal) {
      maxVal = v;
      maxHour = h;
    }
  }
  target[maxHour] = (target[maxHour] ?? 0) + (total - assigned);
}

/**
 * Re-applies the inverter AC cap after day-to-day variation. Energy above the AC
 * limit is LOST (booked in `clipped`) — it is never moved to other hours, so the
 * monthly AC total may end up lower than the entered monthly kWh on very sunny days.
 */
function reclip(
  pv: number[],
  clipped: number[],
  start: number,
  end: number,
  cap: number,
): void {
  if (!Number.isFinite(cap)) return;
  for (let h = start; h < end; h++) {
    const v = pv[h] ?? 0;
    if (v > cap) {
      clipped[h] = (clipped[h] ?? 0) + (v - cap);
      pv[h] = cap;
    }
  }
}

export function buildLoadSeries(
  input: ConsumptionInput,
  variability?: VariabilityConfig,
): number[] {
  const load = new Array<number>(HOURS_PER_YEAR).fill(0);
  const factors = variability
    ? dailyFactors(variability, 1, variability.loadVariationPct)
    : null;
  monthHourRanges().forEach(({ start, end }, mi) => {
    const total = input.monthlyKWh[mi] ?? 0;
    /**
     * Weekday/weekend and season are resolved per hour. Each month is still
     * normalised exactly to `total`, so the day-type split changes WHEN energy is
     * used, never HOW MUCH.
     */
    distributeExact(load, start, end, total, (h) =>
      profileHourWeight(input.shape, mi + 1, isWeekendDay(Math.floor(h / 24)), h % 24),
    );
    if (factors) applyDailyVariation(load, start, end, total, factors);
  });
  return load;
}

/**
 * Builds the PV series. The measured monthly kWh is treated as AC energy
 * AFTER inverter clipping, so the underlying shape is scaled (bisection) until
 * the clipped sum equals the measured month exactly. Energy above the AC limit
 * is reported separately as `pvClipped` (a MODELLED potential, not measured).
 */
export function buildPvSeries(
  input: SolarInput,
  variability?: VariabilityConfig,
): { pv: number[]; clipped: number[] } {
  const pv = new Array<number>(HOURS_PER_YEAR).fill(0);
  const clipped = new Array<number>(HOURS_PER_YEAR).fill(0);
  if (!input.enabled) return { pv, clipped };
  const cap = input.inverterAcKw > 0 ? input.inverterAcKw : Infinity;
  const factors = variability ? dailyFactors(variability, 0, variability.pvVariationPct) : null;

  monthHourRanges().forEach(({ start, end }, mi) => {
    const total = input.monthlyKWh[mi] ?? 0;
    if (total <= 0) return;
    const hw = SOLAR_HALF_WIDTH[mi] ?? 6;
    const shapeOf = (h: number) => {
      const hod = h % 24;
      const x = hod + 0.5;
      const from = 12 - hw;
      const to = 12 + hw;
      if (x <= from || x >= to) return 0;
      return Math.sin((Math.PI * (x - from)) / (to - from)) ** 1.15;
    };
    let shapeSum = 0;
    for (let h = start; h < end; h++) shapeSum += shapeOf(h);
    if (shapeSum <= 0) return;

    // Find scale so that sum(min(shape*scale, cap)) === total
    const clippedSum = (scale: number) => {
      let s = 0;
      for (let h = start; h < end; h++) s += Math.min(shapeOf(h) * scale, cap);
      return s;
    };
    let lo = 0;
    let hi = (total / shapeSum) * 50;
    if (clippedSum(hi) < total) {
      /**
       * The entered monthly kWh cannot pass this AC limit. We fill the daylight hours
       * up to the cap and book the rest as clipped (LOST) energy — the AC total is
       * then lower than the entered month, which is the physically honest result.
       */
      distributeExact(pv, start, end, total, (h) => Math.min(shapeOf(h), 1));
      for (let h = start; h < end; h++) {
        const v = pv[h] ?? 0;
        if (v > cap) {
          clipped[h] = (clipped[h] ?? 0) + (v - cap);
          pv[h] = cap;
        }
      }
      return;
    }
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (clippedSum(mid) < total) lo = mid;
      else hi = mid;
    }
    const scale = (lo + hi) / 2;
    let assigned = 0;
    let maxHour = start;
    let maxVal = -Infinity;
    for (let h = start; h < end; h++) {
      const raw = shapeOf(h) * scale;
      const ac = Math.min(raw, cap);
      pv[h] = ac;
      clipped[h] = Math.max(0, raw - ac);
      assigned += ac;
      if (ac > maxVal && ac < cap) {
        maxVal = ac;
        maxHour = h;
      }
    }
    pv[maxHour] = (pv[maxHour] ?? 0) + (total - assigned); // exact monthly match
    if (factors) {
      applyDailyVariation(pv, start, end, total, factors);
      reclip(pv, clipped, start, end, cap);
    }
  });

  return { pv, clipped };
}

/* ------------------------------------------------------------------ */
/* Measured self-consumption calibration                               */
/* ------------------------------------------------------------------ */

/**
 * Maximum solar tilt strength that is searched. |lambda| = 8 is far beyond what the
 * shape-deviation cap ever allows, so the cap — not this bound — is the binding limit.
 */
const LAMBDA_LIMIT = 8;
/** Calibration tolerance, percentage points. */
export const SELF_CONSUMPTION_TOLERANCE_PCT = 0.1;
/**
 * Maximum allowed normalised L1 deviation between the calibrated series and the
 * profile's own series (0 = untouched, 1 = nothing left of the original shape). The
 * measure equals the share of the annual energy the calibration moves to other hours.
 *
 * Chosen from a 0.10/0.15/0.20/0.25/0.30 sweep on the reference case (20 000 kWh load,
 * 14 000 kWh PV): at 0.15 the evening-heavy and EV-evening profiles still keep their
 * evening peak hour and every profile keeps a clearly different peak level and physical
 * power need, while the realistic 30-50 % self-consumption span is still reachable. From
 * 0.20 and up the evening peak starts collapsing towards midday, which is the failure the
 * old blend produced, so 0.15 is the conservative default.
 */
export const SHAPE_DEVIATION_CAP = 0.15;

/** Direct PV -> load overlap of two hourly series, kWh. */
function directOverlapKWh(load: number[], pv: number[]): number {
  let s = 0;
  for (let h = 0; h < load.length; h++) s += Math.min(load[h] ?? 0, pv[h] ?? 0);
  return s;
}

/**
 * Normalised L1 (total-variation) distance between the calibrated and the original
 * load series: 0.5 * sum|adjusted - original| / sum(original). Because both series
 * carry identical energy, this is exactly the share of the annual energy that the
 * calibration has moved to other hours.
 */
export function shapeDeviationOf(original: number[], adjusted: number[]): number {
  let total = 0;
  let diff = 0;
  for (let h = 0; h < original.length; h++) {
    const a = original[h] ?? 0;
    total += a;
    diff += Math.abs((adjusted[h] ?? 0) - a);
  }
  return total > 0 ? diff / (2 * total) : 0;
}

/**
 * Multiplicative solar tilt. Every hour keeps the profile's own value and is only
 * scaled by exp(lambda * s_h), where s_h is the month's normalised PV signal (0..1):
 *
 *   lambda > 0 : the load leans towards the sun hours
 *   lambda < 0 : the load leans away from the sun hours
 *   lambda = 0 : the profile is untouched
 *
 * Since the factor is multiplicative, the profile's characteristic diurnal signature is
 * never replaced — an evening-heavy profile stays evening-heavy, it only shifts weight.
 * Each month is renormalised to its exact original energy, so monthly and annual kWh are
 * preserved and no hour can become negative.
 */
function tiltLoad(load: number[], pv: number[], lambda: number): number[] {
  if (lambda === 0) return load;
  const out = [...load];
  for (const { start, end } of monthHourRanges()) {
    let pvMax = 0;
    let monthTotal = 0;
    for (let h = start; h < end; h++) {
      const v = pv[h] ?? 0;
      if (v > pvMax) pvMax = v;
      monthTotal += load[h] ?? 0;
    }
    if (pvMax <= 0 || monthTotal <= 0) continue;

    let sum = 0;
    for (let h = start; h < end; h++) {
      const signal = (pv[h] ?? 0) / pvMax;
      const v = Math.max(0, (load[h] ?? 0) * Math.exp(lambda * signal));
      out[h] = v;
      sum += v;
    }
    if (!(sum > 0) || !Number.isFinite(sum)) {
      for (let h = start; h < end; h++) out[h] = load[h] ?? 0;
      continue;
    }
    const scale = monthTotal / sum;
    let assigned = 0;
    let maxHour = start;
    let maxVal = -Infinity;
    for (let h = start; h < end; h++) {
      const v = (out[h] ?? 0) * scale;
      out[h] = v;
      assigned += v;
      if (v > maxVal) {
        maxVal = v;
        maxHour = h;
      }
    }
    out[maxHour] = (out[maxHour] ?? 0) + (monthTotal - assigned);
  }
  return out;
}

/**
 * Calibrates the load shape so the PRE-BATTERY overlap between PV and load approaches the
 * measured self-consumption share (direct PV to load / PV production).
 *
 * Priority order: exact monthly energy > physical validity > preserving the selected
 * profile's diurnal structure > reaching the requested share. A target that would require
 * more deformation than `SHAPE_DEVIATION_CAP` is therefore only partially applied and
 * reported as `status: "partial"` with the level the model actually reached.
 */
export function calibrateLoadToSelfConsumption(
  load: number[],
  pv: number[],
  targetPct: number,
  shapeCap: number = SHAPE_DEVIATION_CAP,
): { load: number[]; calibration: SelfConsumptionCalibration | null } {
  let pvTotal = 0;
  let loadTotal = 0;
  for (let h = 0; h < pv.length; h++) pvTotal += pv[h] ?? 0;
  for (let h = 0; h < load.length; h++) loadTotal += load[h] ?? 0;
  if (pvTotal <= 0 || loadTotal <= 0 || !Number.isFinite(targetPct)) {
    return { load, calibration: null };
  }

  const pctOf = (series: number[]) => (directOverlapKWh(series, pv) / pvTotal) * 100;

  /** Largest |lambda| in the given direction that still respects the shape cap. */
  const lambdaAtCap = (sign: 1 | -1): number => {
    if (shapeDeviationOf(load, tiltLoad(load, pv, sign * LAMBDA_LIMIT)) <= shapeCap) {
      return sign * LAMBDA_LIMIT;
    }
    let lo = 0;
    let hi = LAMBDA_LIMIT;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (shapeDeviationOf(load, tiltLoad(load, pv, sign * mid)) <= shapeCap) lo = mid;
      else hi = mid;
    }
    return sign * lo;
  };

  const lambdaMax = lambdaAtCap(1);
  const lambdaMin = lambdaAtCap(-1);
  const maxPct = pctOf(tiltLoad(load, pv, lambdaMax));
  const minPct = pctOf(tiltLoad(load, pv, lambdaMin));
  const target = Math.min(Math.max(targetPct, 0), 100);

  const finish = (lambda: number) => {
    const calibrated = tiltLoad(load, pv, lambda);
    const achieved = pctOf(calibrated);
    const residual = achieved - targetPct;
    return {
      load: calibrated,
      calibration: {
        requestedPct: targetPct,
        achievedPct: achieved,
        residualPct: residual,
        exponent: lambda,
        shapeDeviation: shapeDeviationOf(load, calibrated),
        shapeDeviationCap: shapeCap,
        feasibleMinPct: minPct,
        feasibleMaxPct: maxPct,
        tolerancePct: SELF_CONSUMPTION_TOLERANCE_PCT,
        status:
          Math.abs(residual) <= SELF_CONSUMPTION_TOLERANCE_PCT
            ? ("matched" as const)
            : ("partial" as const),
      },
    };
  };

  if (target <= minPct) return finish(lambdaMin);
  if (target >= maxPct) return finish(lambdaMax);

  // The overlap grows monotonically with lambda, so a plain bisection is stable.
  let lo = lambdaMin;
  let hi = lambdaMax;
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    if (pctOf(tiltLoad(load, pv, mid)) < target) lo = mid;
    else hi = mid;
  }
  return finish((lo + hi) / 2);
}


export function buildTimeSeries(
  consumption: ConsumptionInput,
  solar: SolarInput,
  variability?: VariabilityConfig,
): TimeSeries {
  const { pv, clipped } = buildPvSeries(solar, variability);
  let load = buildLoadSeries(consumption, variability);
  let calibration: SelfConsumptionCalibration | null = null;

  const target = solar.measuredSelfConsumptionPct;
  if (solar.enabled && typeof target === "number" && target > 0 && target <= 100) {
    const out = calibrateLoadToSelfConsumption(load, pv, target);
    load = out.load;
    calibration = out.calibration;
  }

  return {
    load,
    pv,
    pvClipped: clipped,
    monthOfHour: monthOfHourArray(),
    hourOfDay: hourOfDayArray(),
    loadProvenance: "modelled",
    pvProvenance: "modelled",
    selfConsumptionCalibration: calibration,
  };
}


export function monthlySums(series: number[]): number[] {
  return monthHourRanges().map(({ start, end }) => {
    let s = 0;
    for (let h = start; h < end; h++) s += series[h] ?? 0;
    return s;
  });
}

/** Expands a 24-value or 8760-value price series to 8760 values. */
export function expandPriceSeries(series: number[]): number[] | null {
  if (!series.length) return null;
  if (series.length >= HOURS_PER_YEAR) return series.slice(0, HOURS_PER_YEAR);
  const out = new Array<number>(HOURS_PER_YEAR);
  for (let h = 0; h < HOURS_PER_YEAR; h++) out[h] = series[h % series.length] ?? 0;
  return out;
}

export function quantile(values: number[], q: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const a = sorted[lo] ?? 0;
  const b = sorted[hi] ?? a;
  if (lo === hi) return a;
  return a + (b - a) * (pos - lo);
}
