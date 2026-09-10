/**
 * SINGLE SOURCE OF TRUTH for the demand-charge (effektavgift) benefit.
 *
 * The customer-facing definition is normative and is the ONLY one that exists:
 *
 *   monthlyReductionKw[m] = baselineMonthlyPeakKw[m] - batteryMonthlyPeakKw[m]
 *   peakBenefitSek        = Σ_m monthlyReductionKw[m] × tariffSekPerKwMonth
 *
 * where the monthly peak is the HIGHEST measured import kW of that month.
 *
 * Sizing/sweep, economic power sizing, candidate comparison, the operating economy,
 * annualCustomerBenefit, the alternatives table, the result page and the PDF all read
 * their peak value from these functions. No second definition may be introduced.
 */

import { MONTH_DAYS } from "./defaults";

/** Highest value of each calendar month of an 8760 series. */
export function monthlyPeaksKw(series: number[]): number[] {
  const out: number[] = [];
  let cursor = 0;
  for (const days of MONTH_DAYS) {
    let m = 0;
    for (let h = cursor; h < cursor + days * 24; h++) m = Math.max(m, series[h] ?? 0);
    out.push(m);
    cursor += days * 24;
  }
  return out;
}

/**
 * SIGNED per month: positive = the battery lowered that month's billing peak, negative
 * = it raised it. Negative months are kept — a raised peak is a real extra cost.
 */
export function monthlyPeakReductionKw(
  baselineMonthlyKw: number[],
  batteryMonthlyKw: number[],
): number[] {
  return baselineMonthlyKw.map((b, i) => b - (batteryMonthlyKw[i] ?? 0));
}

/** True when a tariff can be priced at all. 0 and null both mean "no monetary value". */
export function peakTariffIsValued(tariffSekPerKwMonth: number | null | undefined): boolean {
  return (
    tariffSekPerKwMonth !== null &&
    tariffSekPerKwMonth !== undefined &&
    Number.isFinite(tariffSekPerKwMonth) &&
    tariffSekPerKwMonth > 0
  );
}

/** Per-month benefit, SEK. Null when there is no tariff to price the kW with. */
export function monthlyPeakBenefitSek(
  monthlyReductionKw: number[],
  tariffSekPerKwMonth: number | null | undefined,
): number[] | null {
  if (!peakTariffIsValued(tariffSekPerKwMonth)) return null;
  return monthlyReductionKw.map((kw) => kw * (tariffSekPerKwMonth as number));
}

/** Annual demand-charge benefit, SEK. Null when no tariff exists. */
export function annualPeakBenefitSek(
  monthlyReductionKw: number[],
  tariffSekPerKwMonth: number | null | undefined,
): number | null {
  const monthly = monthlyPeakBenefitSek(monthlyReductionKw, tariffSekPerKwMonth);
  return monthly ? monthly.reduce((a, b) => a + b, 0) : null;
}
