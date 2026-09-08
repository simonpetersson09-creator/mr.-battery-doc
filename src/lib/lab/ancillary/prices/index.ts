/**
 * HISTORICAL FCR-D UP PRICE SERIES — registry.
 *
 * One VERIFIED series per country/market area. The engine physics, dispatch and sizing
 * are country agnostic; only which historical price series is applied on top of the held
 * reservation differs.
 *
 * IMPORTANT: a country without a verified imported dataset gets NO series. Swedish prices
 * are never used as a stand-in for another market, and a missing dataset is never turned
 * into 0 kr revenue — the ancillary economics is reported as unavailable instead.
 */

import { FCR_D_UP_FI_2025 } from "./fcrDUpFI2025";
import { FCR_D_UP_SE_2025 } from "./fcrDUpSE2025";
import type { FcrPriceSeries } from "./fcrDUpSE2025";

export { FCR_D_UP_FI_2025, FCR_D_UP_SE_2025 };
export type { FcrPriceSeries };

export type FcrPriceCountry = "SE" | "FI" | "DK" | "DE";

/**
 * Market area key. Today one area per country, but Denmark (and later others) may need
 * several bidding/price zones — the lookup already accepts an area suffix such as "DK1".
 */
export type FcrMarketArea = FcrPriceCountry | "DK1" | "DK2";

const SERIES_BY_AREA: Partial<Record<FcrMarketArea, FcrPriceSeries>> = {
  SE: FCR_D_UP_SE_2025,
  FI: FCR_D_UP_FI_2025,
  // DK / DK1 / DK2 / DE: no verified dataset imported yet — deliberately absent.
};

/**
 * The verified historical FCR-D up price series for a country/market area, or null when
 * no verified dataset exists. `undefined` keeps the legacy Swedish default (saved cases
 * created before country was tracked are Swedish).
 */
export function fcrPriceSeriesForCountry(
  country: FcrMarketArea | undefined,
): FcrPriceSeries | null {
  if (country === undefined) return FCR_D_UP_SE_2025;
  return SERIES_BY_AREA[country] ?? null;
}

/** True when the country/market area has a verified imported price dataset. */
export function hasVerifiedFcrPrices(country: FcrMarketArea | undefined): boolean {
  return fcrPriceSeriesForCountry(country) !== null;
}

/** Market areas that currently have verified data, for reporting/UI. */
export const VERIFIED_FCR_MARKET_AREAS = Object.keys(SERIES_BY_AREA) as FcrMarketArea[];
