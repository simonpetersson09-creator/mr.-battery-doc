/**
 * HISTORICAL FCR-D UP PRICE SERIES — registry.
 *
 * One series per country. The engine physics, dispatch and sizing are country agnostic;
 * only which historical price series is applied on top of the held reservation differs.
 * Countries without their own imported series fall back to the Swedish series, and the
 * fallback is visible through the returned series metadata (market/source).
 */

import { FCR_D_UP_FI_2025 } from "./fcrDUpFI2025";
import { FCR_D_UP_SE_2025 } from "./fcrDUpSE2025";
import type { FcrPriceSeries } from "./fcrDUpSE2025";

export { FCR_D_UP_FI_2025, FCR_D_UP_SE_2025 };
export type { FcrPriceSeries };

export type FcrPriceCountry = "SE" | "FI" | "DK" | "DE";

const SERIES_BY_COUNTRY: Partial<Record<FcrPriceCountry, FcrPriceSeries>> = {
  SE: FCR_D_UP_SE_2025,
  FI: FCR_D_UP_FI_2025,
};

/** The historical FCR-D up price series used for a given country. */
export function fcrPriceSeriesForCountry(country: FcrPriceCountry | undefined): FcrPriceSeries {
  return SERIES_BY_COUNTRY[country ?? "SE"] ?? FCR_D_UP_SE_2025;
}
