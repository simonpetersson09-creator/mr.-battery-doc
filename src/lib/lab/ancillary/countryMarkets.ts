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

export type PendingAncillaryCountry = "NL" | "AT" | "CH";

export const PENDING_ANCILLARY_COUNTRIES: readonly PendingAncillaryCountry[] = [
  "NL",
  "AT",
  "CH",
];

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

export const PENDING_ANCILLARY_MARKETS: Record<PendingAncillaryCountry, CountryAncillaryMarket> = {
  NL: { country: "NL", tso: "TenneT", synchronousArea: "continental", products: [] },
  AT: { country: "AT", tso: "APG", synchronousArea: "continental", products: [] },
  CH: { country: "CH", tso: "Swissgrid", synchronousArea: "continental", products: [] },
};

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
