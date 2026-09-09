/**
 * Localized PRESENTATION labels for canonical configuration values.
 *
 * The canonical values themselves (country codes, market areas, reserve products,
 * datasets, currencies) live in `country-config` / `reserve-market` and are never
 * touched here. This module only decides how they are SPELLED for the customer.
 */

import { getCountry, type CountryCode } from "@/lib/country-config";
import { reserveMarketConfig, type MarketArea } from "@/lib/reserve-market";

import { t } from "./index";

/** Country name in the UI language, with the config name as fallback. */
export function countryName(code: CountryCode): string {
  const key = `countries.${code}`;
  const label = t(key);
  return label === key ? getCountry(code).name : label;
}

export function marketAreaName(area: MarketArea): string {
  const key = `marketAreas.${area}`;
  const label = t(key);
  return label === key ? area : label;
}

/**
 * Customer-facing reserve product name. The PRODUCT ("FCR" vs "FCR_D_UP") still comes
 * from the central market config — only the wording is translated.
 */
export function reserveProductName(code: CountryCode, area: MarketArea | null): string {
  const cfg = reserveMarketConfig(code, area);
  if (!cfg) return t("reserveProduct.generic");
  const key = `reserveProduct.${cfg.product}`;
  const label = t(key);
  return label === key ? cfg.productLabel : label;
}

/** Localized month abbreviations, index 0-11. */
export function monthShortLabels(): string[] {
  return Array.from({ length: 12 }, (_, i) => t(`months.short.${i}`));
}
