/**
 * FCR-D UP ECONOMICS — historical reference scenario.
 *
 * This module sits ON TOP of the verified battery physics. It never changes dispatch,
 * SOC logic, reservation physics or sizing. It only puts a historical market value on the
 * power the reservation engine ACTUALLY managed to hold reserved, hour by hour.
 *
 * Formula, per engine hour t (0..8759):
 *   revenueEur[t] = reservedPowerKwByHour[t] / 1000 * fcrPriceEurPerMw[t]
 *   annualGrossEur = sum(revenueEur[t])
 *
 * Rules:
 *  - Only actually held reservation is paid. Nominally offered kW x 8760 is never credited.
 *  - The price series stays in EUR. SEK is a separate, explicit assumption (eurSekRate).
 *  - No aggregator deduction is applied by default: gross is the primary result and the
 *    aggregator parameters are optional and default to unknown (null).
 */

import { MONTH_DAYS } from "../defaults";
import { FCR_D_UP_SE_2025 } from "./prices/fcrDUpSE2025";
import type { FcrPriceSeries } from "./prices/fcrDUpSE2025";

export { FCR_D_UP_SE_2025 };
export type { FcrPriceSeries };

/**
 * EUR/SEK is an ASSUMPTION, not part of Svenska kraftnät's FCR data. Swap it for an annual
 * average or external FX data by passing another value — nothing downstream hardcodes it.
 */
export const DEFAULT_EUR_SEK_RATE = 11.3;

export const FCR_HISTORICAL_LABEL = "Historiskt FCR-D upp-scenario – priser från 2025";

export interface FcrRevenueInput {
  /** Actually held reserved up-power per engine hour, kW. Length should be 8 760. */
  reservedPowerKwByHour: number[];
  /** Price series. Defaults to the Swedish 2025 historical series. */
  series?: FcrPriceSeries;
  /** EUR -> SEK assumption. */
  eurSekRate?: number;
  /** FUTURE: aggregator cut of gross revenue, %. Null = unknown, no deduction made. */
  aggregatorSharePct?: number | null;
  /** FUTURE: fixed aggregator fee, SEK/year. Null = unknown, no deduction made. */
  aggregatorFixedFeeSek?: number | null;
}

export interface FcrRevenueResult {
  market: string;
  service: string;
  referenceYear: number;
  sourceType: string;
  source: string;
  unit: string;
  label: string;
  /** Hours the price series and the reservation series were matched on. */
  hours: number;
  /** Hours with a non-zero held reservation. */
  reservedHours: number;
  /** Mean held reserved power over all 8 760 hours, kW. */
  avgReservedPowerKw: number;
  /** Highest held reserved power, kW. */
  maxReservedPowerKw: number;
  annualGrossEur: number;
  /** Per calendar month of the fixed model year, EUR. */
  monthlyGrossEur: number[];
  eurSekRate: number;
  eurSekRateIsAssumption: true;
  annualGrossSek: number;
  monthlyGrossSek: number[];
  /** Gross per held kW-year, EUR — comparable with the 53.20 EUR/kW/yr reference. */
  grossEurPerReservedKwYear: number | null;
  // ---- future aggregator layer: no default deduction, no invented revenue ----
  aggregatorSharePct: number | null;
  aggregatorFixedFeeSek: number | null;
  /** Deduction in SEK. Null while the aggregator terms are unknown. */
  aggregatorFeeSek: number | null;
  /** Net after aggregator. Null while the aggregator terms are unknown. */
  netSek: number | null;
  netEur: number | null;
  assumptions: string[];
  warnings: string[];
}

/** Hour index ranges for the engine's fixed model year. */
function monthRanges(): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  let cursor = 0;
  for (const days of MONTH_DAYS) {
    out.push({ start: cursor, end: cursor + days * 24 });
    cursor += days * 24;
  }
  return out;
}

/** Convenience: a flat reservation of `kw` held every hour of the model year. */
export function flatReservation(kw: number, hours = 8760): number[] {
  return Array.from({ length: hours }, () => kw);
}

/** Descriptive statistics for a price series — used for validation and display. */
export function priceStats(series: FcrPriceSeries = FCR_D_UP_SE_2025) {
  const p = series.pricesEurPerMw;
  const sorted = [...p].sort((a, b) => a - b);
  const n = sorted.length;
  const median =
    n === 0 ? 0 : n % 2 === 1 ? sorted[(n - 1) / 2]! : (sorted[n / 2 - 1]! + sorted[n / 2]!) / 2;
  const sum = p.reduce((a, b) => a + b, 0);
  return {
    hours: n,
    sum,
    mean: n > 0 ? sum / n : 0,
    median,
    min: n > 0 ? sorted[0]! : 0,
    max: n > 0 ? sorted[n - 1]! : 0,
    /** Gross for 1 kW held every hour of the year, EUR. */
    grossEurPerKwYear: sum / 1000,
  };
}

/**
 * Historical gross FCR-D up revenue for an hourly reservation profile.
 * Pure function: no side effects, no physics.
 */
export function computeFcrRevenue(input: FcrRevenueInput): FcrRevenueResult {
  const series = input.series ?? FCR_D_UP_SE_2025;
  const prices = series.pricesEurPerMw;
  const reserved = input.reservedPowerKwByHour ?? [];
  const eurSekRate = input.eurSekRate ?? DEFAULT_EUR_SEK_RATE;
  const warnings: string[] = [];

  if (prices.length !== series.hours)
    warnings.push(`Prisserien har ${prices.length} timmar, inte ${series.hours}.`);
  if (reserved.length !== prices.length)
    warnings.push(
      `Reservationsserien har ${reserved.length} timmar och prisserien ${prices.length} — endast överlappande timmar räknas.`,
    );

  const hours = Math.min(prices.length, reserved.length);
  const monthlyGrossEur = MONTH_DAYS.map(() => 0);
  const ranges = monthRanges();

  let annualGrossEur = 0;
  let reservedHours = 0;
  let reservedSumKw = 0;
  let maxReservedPowerKw = 0;

  for (let h = 0; h < hours; h++) {
    const kw = Math.max(0, reserved[h] ?? 0);
    const price = prices[h] ?? 0;
    const rev = (kw / 1000) * price;
    annualGrossEur += rev;
    reservedSumKw += kw;
    if (kw > 0) reservedHours++;
    if (kw > maxReservedPowerKw) maxReservedPowerKw = kw;
    const mi = ranges.findIndex((r) => h >= r.start && h < r.end);
    if (mi >= 0) monthlyGrossEur[mi] = monthlyGrossEur[mi]! + rev;
  }

  const denomHours = prices.length || 1;
  const avgReservedPowerKw = reservedSumKw / denomHours;
  const annualGrossSek = annualGrossEur * eurSekRate;

  const aggregatorSharePct = input.aggregatorSharePct ?? null;
  const aggregatorFixedFeeSek = input.aggregatorFixedFeeSek ?? null;
  let aggregatorFeeSek: number | null = null;
  let netSek: number | null = null;
  if (aggregatorSharePct !== null || aggregatorFixedFeeSek !== null) {
    aggregatorFeeSek =
      annualGrossSek * ((aggregatorSharePct ?? 0) / 100) + (aggregatorFixedFeeSek ?? 0);
    netSek = annualGrossSek - aggregatorFeeSek;
  }

  const assumptions = [
    `${FCR_HISTORICAL_LABEL} (${series.timestampFrom} – ${series.timestampTo}). Historiskt utfall, inte en prognos.`,
    "Priset är gemensamt för hela Sverige. Inga separata SE1–SE4-priser används; SE1–SE4 i källan är upphandlade volymer, inte priser.",
    "Prisserien kopplas mot motorns timindex 0–8759 (fast modellår, ingen sommartid). Källans tidsstämplar är endast metadata.",
    "Intäkten räknas timme för timme på den effekt reservationen faktiskt kunde hållas — aldrig på nominellt erbjuden effekt gånger 8 760.",
    `Valutakurs ${eurSekRate.toFixed(2)} SEK/EUR är ett ANTAGANDE, inte en del av Svenska kraftnäts FCR-data.`,
    "Aktivering av tjänsten simuleras inte — detta är ersättning för bokad beredskap (kapacitet).",
  ];
  if (aggregatorFeeSek === null)
    assumptions.push(
      "Inget aggregatoravdrag är gjort — bruttovärdet visas. Aggregatorns andel/avgift är okänd och sätts inte utan verifierat underlag.",
    );

  return {
    market: series.market,
    service: series.service,
    referenceYear: series.referenceYear,
    sourceType: series.sourceType,
    source: series.source,
    unit: series.unit,
    label: FCR_HISTORICAL_LABEL,
    hours,
    reservedHours,
    avgReservedPowerKw,
    maxReservedPowerKw,
    annualGrossEur,
    monthlyGrossEur,
    eurSekRate,
    eurSekRateIsAssumption: true,
    annualGrossSek,
    monthlyGrossSek: monthlyGrossEur.map((v) => v * eurSekRate),
    grossEurPerReservedKwYear:
      avgReservedPowerKw > 0 ? annualGrossEur / avgReservedPowerKw : null,
    aggregatorSharePct,
    aggregatorFixedFeeSek,
    aggregatorFeeSek,
    netSek,
    netEur: netSek === null ? null : netSek / eurSekRate,
    assumptions,
    warnings,
  };
}
