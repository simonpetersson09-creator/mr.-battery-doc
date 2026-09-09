/**
 * CENTRAL RESERVE MARKET CONFIG.
 *
 *   country -> marketArea (nullable) -> reserveMarketConfig
 *              -> reserveProduct -> reservePhysics -> priceDataset
 *
 * The UI never decides which reserve product a country uses; it only asks for the
 * geography (and only when the country actually needs it). Everything else is looked
 * up here. No physics, no economics — configuration only.
 */

import type { CountryCode } from "@/lib/country-config";
import {
  hasVerifiedFcrPrices,
  type FcrMarketArea,
} from "@/lib/lab/ancillary/prices";

/** Geographic sub-area the customer may need to pick. Null = country is enough. */
export type MarketArea = "DK1" | "DK2";

export type ReserveProduct = "FCR" | "FCR_D_UP";
/** symmetric = up + down reserved together. upward = upward-only reserve. */
export type ReservePhysics = "symmetric" | "upward";

export type SynchronousArea = "nordic" | "continental";

export interface ReserveMarketConfig {
  country: CountryCode;
  marketArea: MarketArea | null;
  synchronousArea: SynchronousArea;
  product: ReserveProduct;
  physics: ReservePhysics;
  /** Identifier of the intended historical price dataset. */
  datasetId: string;
  /** Price area used to look up an imported dataset, if one exists. */
  priceArea: FcrMarketArea;
  /** Short customer-facing market name. */
  marketLabel: string;
}

export interface MarketAreaOption {
  value: MarketArea;
  label: string;
}

const DK1: ReserveMarketConfig = {
  country: "DK",
  marketArea: "DK1",
  synchronousArea: "continental",
  product: "FCR",
  physics: "symmetric",
  datasetId: "DK1_FCR_2025",
  priceArea: "DK1",
  marketLabel: "Energinet DK1 (FCR, symmetrisk)",
};

const DK2: ReserveMarketConfig = {
  country: "DK",
  marketArea: "DK2",
  synchronousArea: "nordic",
  product: "FCR_D_UP",
  physics: "upward",
  datasetId: "DK2_FCR_D_UP_2025",
  priceArea: "DK2",
  marketLabel: "Energinet DK2 (FCR-D upp)",
};

const SE: ReserveMarketConfig = {
  country: "SE",
  marketArea: null,
  synchronousArea: "nordic",
  product: "FCR_D_UP",
  physics: "upward",
  datasetId: "SE_FCR_D_UP_2025",
  priceArea: "SE",
  marketLabel: "Svenska kraftnät (FCR-D upp)",
};

const FI: ReserveMarketConfig = {
  country: "FI",
  marketArea: null,
  synchronousArea: "nordic",
  product: "FCR_D_UP",
  physics: "upward",
  datasetId: "FI_FCR_D_UP_2025",
  priceArea: "FI",
  marketLabel: "Fingrid (FCR-D upp)",
};

const DE: ReserveMarketConfig = {
  country: "DE",
  marketArea: null,
  synchronousArea: "continental",
  product: "FCR",
  physics: "symmetric",
  datasetId: "DE_FCR_2025",
  priceArea: "DE",
  marketLabel: "Regelleistung / ÜNB (FCR, symmetrisk)",
};

/** Countries where the customer must pick a geographic area on step 1. */
export function requiresMarketArea(code: CountryCode): boolean {
  return code === "DK";
}

export function marketAreaOptions(code: CountryCode): MarketAreaOption[] {
  if (code !== "DK") return [];
  return [
    { value: "DK1", label: "DK1 – Västdanmark" },
    { value: "DK2", label: "DK2 – Östdanmark" },
  ];
}

/** True when the stored area is valid for the stored country (blocks stale carry-over). */
export function isValidMarketArea(code: CountryCode, area: MarketArea | null): boolean {
  if (!requiresMarketArea(code)) return area === null;
  return area !== null && marketAreaOptions(code).some((o) => o.value === area);
}

/**
 * The reserve market for a country + area. Returns null when the country needs an area
 * and none (or a stale one) is set — we never guess DK1/DK2.
 */
export function reserveMarketConfig(
  code: CountryCode,
  area: MarketArea | null = null,
): ReserveMarketConfig | null {
  switch (code) {
    case "SE":
      return SE;
    case "FI":
      return FI;
    case "DE":
      return DE;
    case "DK":
      if (area === "DK1") return DK1;
      if (area === "DK2") return DK2;
      return null;
    default:
      return null;
  }
}

/**
 * Can we actually calculate revenue for this market?
 * Requires BOTH an implemented reserve model AND a verified imported price dataset.
 * Both the upward (SE/FI/DK2) and the symmetric (DE/DK1) model are implemented, so the
 * price dataset is the only gate. DK1/DK2 have no verified dataset yet and stay at
 * "market configured, calculation unavailable" — never a fabricated revenue.
 */
export function reserveCalculationAvailable(
  code: CountryCode,
  area: MarketArea | null = null,
): boolean {
  const cfg = reserveMarketConfig(code, area);
  if (!cfg) return false;
  return hasVerifiedFcrPrices(cfg.priceArea);
}
