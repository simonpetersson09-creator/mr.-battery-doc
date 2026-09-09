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
import { FCR_SYMMETRIC_DE_2025 } from "./fcrSymmetricDE2025";
import { FCR_SYMMETRIC_DK1_2025 } from "./fcrSymmetricDK1_2025";
import { FCR_D_UP_DK2_2025 } from "./fcrDUpDK2_2025";
import { FCR_D_UP_SE_2025 } from "./fcrDUpSE2025";
import type { FcrPriceSeries } from "./fcrDUpSE2025";

export {
  FCR_D_UP_FI_2025,
  FCR_D_UP_SE_2025,
  FCR_SYMMETRIC_DE_2025,
  FCR_SYMMETRIC_DK1_2025,
  FCR_D_UP_DK2_2025,
};
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
  // Germany runs the SYMMETRIC product; this series is priced for symmetric capacity and
  // is never used for the Nordic upward product.
  DE: FCR_SYMMETRIC_DE_2025,
  // DK1 runs the CONTINENTAL SYMMETRIC product and has its own verified Energinet series.
  DK1: FCR_SYMMETRIC_DK1_2025,
  // DK2 runs the Nordic UPWARD product (FCR-D up) and has its own verified series.
  DK2: FCR_D_UP_DK2_2025,
  // DK utan valt område: inget dataset — vi gissar aldrig elområde.
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
