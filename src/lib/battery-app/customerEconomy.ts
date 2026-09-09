/**
 * CUSTOMER ECONOMY — presentation/customer-share layer.
 *
 * The Battery Engine computes the HISTORICAL MARKET VALUE of the reserve product
 * (`summary.fcr.grossSek`) and includes it in `summary.economy.totalOperatingBenefitSek`.
 * That market value is NOT the customer's own compensation: an aggregator, BRP, fees and
 * contract terms take a cut.
 *
 * This module is the ONLY place where that customer share is applied. It never
 * recalculates anything: it reads the already-simulated engine summary and subtracts the
 * non-customer part of the ancillary revenue from the engine total. Every other benefit
 * (energy, peak/demand, everything else already inside the engine total) is untouched.
 *
 * IMPORTANT — SIZING IS DELIBERATELY UNAFFECTED.
 * The engine's economic power sizing maximises `totalOperatingBenefitSek`, which uses the
 * FULL market value. Feeding the customer share into the engine would change dimensioning,
 * held power and dispatch. It is therefore applied strictly downstream of the engine, so
 * physics, sizing, held power and market value are bit-identical before and after.
 */

import type { BatteryEngineResult } from "@/lib/battery-engine";

export const DEFAULT_CUSTOMER_ANCILLARY_SHARE = 0.75;
export const DEFAULT_TARGET_PAYBACK_YEARS = 10;
export const MIN_TARGET_PAYBACK_YEARS = 5;
export const MAX_TARGET_PAYBACK_YEARS = 20;

/** Keeps a persisted or typed share inside 0–1. Invalid input falls back to the default. */
export function clampCustomerAncillaryShare(value: unknown): number {
  const n = typeof value === "number" ? value : Number.NaN;
  if (!Number.isFinite(n)) return DEFAULT_CUSTOMER_ANCILLARY_SHARE;
  return Math.min(1, Math.max(0, n));
}

/** Keeps a persisted or dragged payback target inside the supported slider range. */
export function clampTargetPaybackYears(value: unknown): number {
  const n = typeof value === "number" ? value : Number.NaN;
  if (!Number.isFinite(n)) return DEFAULT_TARGET_PAYBACK_YEARS;
  return Math.min(MAX_TARGET_PAYBACK_YEARS, Math.max(MIN_TARGET_PAYBACK_YEARS, Math.round(n)));
}

export interface CustomerEconomy {
  /** Engine total, ancillary counted at 100 % of market value. Informational only. */
  engineTotalBenefitSek: number | null;
  energyBenefitSek: number;
  peakBenefitSek: number;
  /** Historical market value of the reserve product, exactly as the engine computed it. */
  ancillaryMarketValueSek: number;
  /** 0–1. */
  customerAncillaryShare: number;
  /** ancillaryMarketValueSek * customerAncillaryShare. */
  ancillaryCustomerValueSek: number;
  /** THE customer-facing annual benefit: engine total minus the non-customer ancillary part. */
  totalCustomerBenefitSek: number | null;
  ancillaryEnabled: boolean;
}

/**
 * Applies the customer share to an already computed engine result.
 * The share reduces the ancillary term and nothing else.
 */
export function customerEconomyFromResult(
  result: BatteryEngineResult,
  share: number,
): CustomerEconomy {
  const s = result.summary;
  const clamped = clampCustomerAncillaryShare(share);
  const ancillaryEnabled = s.fcr.enabled;
  const marketRaw = ancillaryEnabled ? (s.fcr.grossSek ?? 0) : 0;
  const market = Number.isFinite(marketRaw) ? marketRaw : 0;
  const customerAncillary = market * clamped;
  const engineTotal = s.economy.totalOperatingBenefitSek;

  return {
    engineTotalBenefitSek: engineTotal,
    energyBenefitSek: s.economy.energyBenefitSek,
    peakBenefitSek: s.economy.demandCostSavingSek ?? 0,
    ancillaryMarketValueSek: market,
    customerAncillaryShare: clamped,
    ancillaryCustomerValueSek: customerAncillary,
    totalCustomerBenefitSek:
      engineTotal === null ? null : engineTotal - (market - customerAncillary),
    ancillaryEnabled,
  };
}

/** Same reduction, for a candidate where only the total and the market value are known. */
export function customerBenefitFromTotals(
  engineTotalSek: number | null,
  ancillaryMarketValueSek: number,
  share: number,
): number | null {
  if (engineTotalSek === null) return null;
  const clamped = clampCustomerAncillaryShare(share);
  const market = Number.isFinite(ancillaryMarketValueSek) ? ancillaryMarketValueSek : 0;
  return engineTotalSek - market * (1 - clamped);
}

/**
 * SIMPLE PAYBACK ceiling: annual customer benefit x desired payback years.
 * Returns null when the annual benefit is missing or not positive — a non-positive
 * benefit can never be presented as an investment budget.
 */
export function maxInvestmentSek(
  totalCustomerBenefitSek: number | null,
  targetPaybackYears: number,
): number | null {
  if (totalCustomerBenefitSek === null || !Number.isFinite(totalCustomerBenefitSek)) return null;
  if (totalCustomerBenefitSek <= 0) return null;
  const years = clampTargetPaybackYears(targetPaybackYears);
  return totalCustomerBenefitSek * years;
}
