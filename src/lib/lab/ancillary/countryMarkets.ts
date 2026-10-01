/**
 * PER-COUNTRY ANCILLARY MARKET REGISTRY (data only).
 *
 * Countries whose balancing/reserve markets exist but whose verified product rules and
 * price data have NOT been entered yet. Each country gets its OWN entry and its OWN
 * product list — nothing here is ever copied from another country, and the engine never
 * falls back to the Swedish (or any other) rule set or prices for these markets.
 *
 * Adding verified data later = filling in `products` (and registering a price series
 * under the same `priceSeriesId` in ./prices). No engine change is needed: as long as a
 * country has no verified product with a verified price series, its reserve revenue is 0
 * and the UI states that price data is not yet configured.
 */

import type { MarketProfile } from "./types";

export type PendingAncillaryCountry = "AT" | "CH" | "BE" | "FR" | "CZ" | "SI";

export const PENDING_ANCILLARY_COUNTRIES: readonly PendingAncillaryCountry[] = [
  "AT",
  "CH",
  "BE",
  "FR",
  "CZ",
  "SI",
];

/** FCR Cooperation members among the pending countries: symmetric FCR, own price series. */
export const FCR_COOPERATION_PENDING: readonly PendingAncillaryCountry[] = ["BE", "FR", "CZ", "SI"];

export type AncillaryProductKind = "FCR" | "aFRR" | "mFRR" | "other";

/** Every value is nullable: null = not yet verified, never an assumption. */
export interface AncillaryProductParams {
  /** Stable id, e.g. "NL_FCR". */
  id: string;
  kind: AncillaryProductKind;
  /** Name as used by the TSO. */
  label: string;
  direction: "up" | "down" | "symmetric";
  /** Key of a verified historical capacity price series in ./prices, or null. */
  priceSeriesId: string | null;
  /** Activated-energy price, EUR/MWh, or null when not modelled/verified. */
  energyPriceEurPerMWh: number | null;
  minBidKw: number | null;
  requiresAggregator: boolean | null;
  /** Endurance requirement in minutes per direction. */
  enduranceMinutes: number | null;
  /** Prequalification / technical requirements, free text with source. */
  prequalification: string | null;
  /** Source of the parameters (document, version, date). */
  source: string | null;
  /** True only once every parameter above has been verified against the source. */
  verified: boolean;
}

export interface CountryAncillaryMarket {
  country: PendingAncillaryCountry;
  /** TSO name, informational. */
  tso: string;
  synchronousArea: "continental";
  products: AncillaryProductParams[];
}

/**
 * Country-specific endurance requirement (hours) for each country's own SYMMETRIC FCR
 * product. This is the value that becomes `requirements.enduranceHours` of the country's
 * FCR service when its market profile gets services. Never another country's value.
 */
export const FCR_ENDURANCE_HOURS: Readonly<Record<PendingAncillaryCountry, number>> = {
  AT: 0.5,
  CH: 0.25,
  BE: 25 / 60,
  FR: 0.5,
  CZ: 0.5,
  SI: 0.25,
};

export const PENDING_ANCILLARY_MARKETS: Record<PendingAncillaryCountry, CountryAncillaryMarket> = {
  AT: { country: "AT", tso: "APG", synchronousArea: "continental", products: [] },
  CH: { country: "CH", tso: "Swissgrid", synchronousArea: "continental", products: [] },
  BE: { country: "BE", tso: "Elia", synchronousArea: "continental", products: [fcrCooperationProduct("BE")] },
  FR: { country: "FR", tso: "RTE", synchronousArea: "continental", products: [fcrCooperationProduct("FR")] },
  CZ: { country: "CZ", tso: "ČEPS", synchronousArea: "continental", products: [fcrCooperationProduct("CZ")] },
  SI: { country: "SI", tso: "ELES", synchronousArea: "continental", products: [fcrCooperationProduct("SI")] },
};

/**
 * Symmetric FCR (FCR Cooperation) product slot. Only the product TYPE is stated; every
 * rule/price stays null and `verified` false until the country's own 2025 settlement
 * capacity price series is imported under `priceSeriesId`. Never another country's data.
 */
function fcrCooperationProduct(code: "BE" | "FR" | "CZ" | "SI"): AncillaryProductParams {
  return {
    id: `${code}_FCR`,
    kind: "FCR",
    label: "FCR (FCR Cooperation)",
    direction: "symmetric",
    priceSeriesId: fcrCooperationSeriesId(code, 2025),
    energyPriceEurPerMWh: null,
    minBidKw: null,
    requiresAggregator: null,
    enduranceMinutes: null,
    prequalification: null,
    source: null,
    verified: false,
  };
}

/** Explicit, per-country series key: BE -> "FCR_BE_2025", never a shared/fallback key. */
export function fcrCooperationSeriesId(code: "BE" | "FR" | "CZ" | "SI", year: number): string {
  return `FCR_${code}_${year}`;
}

/** One FCR Cooperation 4-hour product block (EUR/MW for each hour of the block). */
export interface FcrFourHourBlock {
  /** 0-based day of the engine model year (0..364). */
  day: number;
  /** Block index within the day, 0..5 (00-04, 04-08, ... 20-24). */
  block: number;
  /** Settlement capacity price, EUR/MW per hour. */
  priceEurPerMwH: number;
}

export const FCR_BLOCK_HOURS = 4;
export const MODEL_YEAR_HOURS = 8760;

/**
 * Expands 4-hour FCR blocks into the 8760-hour engine series. Every hour inside a block
 * gets exactly that block's price. Missing blocks stay NaN so incomplete imports are
 * detectable — they are never filled with another country's or a neighbouring price.
 */
export function expandFourHourBlocksToHourly(blocks: readonly FcrFourHourBlock[]): number[] {
  const out = new Array<number>(MODEL_YEAR_HOURS).fill(Number.NaN);
  for (const b of blocks) {
    if (!Number.isInteger(b.day) || !Number.isInteger(b.block)) continue;
    if (b.day < 0 || b.day > 364 || b.block < 0 || b.block > 5) continue;
    const start = b.day * 24 + b.block * FCR_BLOCK_HOURS;
    for (let h = 0; h < FCR_BLOCK_HOURS; h++) out[start + h] = b.priceEurPerMwH;
  }
  return out;
}

export function isPendingAncillaryCountry(code: string | undefined | null): code is PendingAncillaryCountry {
  return !!code && (PENDING_ANCILLARY_COUNTRIES as readonly string[]).includes(code);
}

/** True when at least one verified product with a verified price series exists. */
export function hasConfiguredAncillaryProducts(code: PendingAncillaryCountry): boolean {
  return PENDING_ANCILLARY_MARKETS[code].products.some((p) => p.verified && p.priceSeriesId !== null);
}

/**
 * Engine-facing market profile for a pending country: its own id and label, and NO
 * services. With no services the reservation planner returns null, so no reserve is
 * held, no Nordic/German rules are applied and no revenue is calculated.
 */
export function pendingMarketProfile(code: PendingAncillaryCountry): MarketProfile {
  const m = PENDING_ANCILLARY_MARKETS[code];
  return {
    id: code,
    label: `${code} (${m.tso}) — prisdata ej konfigurerad`,
    currency: "EUR",
    nativeCapacityUnit: "currency/MW/h",
    nativeEnergyUnit: "currency/MWh",
    services: [],
    columnAliases: {},
    notes: ["Stödtjänstprodukter och prisdata är ännu inte konfigurerade för detta land."],
  };
}
