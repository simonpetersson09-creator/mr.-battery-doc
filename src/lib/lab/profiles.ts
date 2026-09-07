import { HOURS_PER_YEAR, MONTH_DAYS } from "./defaults";
import { isWeekendDay, profileHourWeight } from "./loadProfiles";
import type {
  ConsumptionInput,
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

export function buildTimeSeries(
  consumption: ConsumptionInput,
  solar: SolarInput,
  variability?: VariabilityConfig,
): TimeSeries {
  const { pv, clipped } = buildPvSeries(solar, variability);
  return {
    load: buildLoadSeries(consumption, variability),
    pv,
    pvClipped: clipped,
    monthOfHour: monthOfHourArray(),
    hourOfDay: hourOfDayArray(),
    loadProvenance: "modelled",
    pvProvenance: "modelled",
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
