/**
 * FCR COOPERATION 2025 — symmetric FCR capacity price series, one per country.
 *
 * Explicit per-country mapping (file -> country -> series id); there is no generic or
 * cross-country fallback. A country without its own imported series gets null.
 *
 * Unit convention (same as the German series): the source is the settlement capacity
 * price in EUR/MW for a whole 4-hour block. The ONLY conversion to the engine's
 * EUR/MW/h happens in `fcrCooperationSeries` (block price / 4). EUR/kW is never stored;
 * the revenue layer divides kW by 1000. No currency conversion here — prices stay EUR
 * (also for Switzerland).
 *
 * Time axis: blocks belong to the market's local delivery day (CET/CEST). Day d, block b
 * maps to engine hours d*24 + b*4 .. +3. Every local day therefore has exactly 24 engine
 * positions, also on the DST days 2025-03-30 (23 real hours) and 2025-10-26 (25 real
 * hours) — nothing is dropped or duplicated, and 365 × 24 = 8 760.
 */

import {
  expandFourHourBlocksToHourly,
  fcrCooperationSeriesId,
  FCR_BLOCK_HOURS,
  type FcrFourHourBlock,
} from "../countryMarkets";
import type { FcrPriceSeries } from "./fcrDUpSE2025";
import { FCR_AT_2025_BLOCKS_EUR_PER_MW } from "./fcrCoopAT2025";
import { FCR_BE_2025_BLOCKS_EUR_PER_MW } from "./fcrCoopBE2025";
import { FCR_CH_2025_BLOCKS_EUR_PER_MW } from "./fcrCoopCH2025";
import { FCR_CZ_2025_BLOCKS_EUR_PER_MW } from "./fcrCoopCZ2025";
import { FCR_FR_2025_BLOCKS_EUR_PER_MW } from "./fcrCoopFR2025";
import { FCR_SI_2025_BLOCKS_EUR_PER_MW } from "./fcrCoopSI2025";

export type FcrCooperationCountry = "AT" | "NL" | "CH" | "BE" | "FR" | "CZ" | "SI";

/** Source file per country — explicit, never derived. */
export const FCR_COOPERATION_SOURCE_FILES: Record<FcrCooperationCountry, string> = {
  AT: "FCR_2025_Austria.xlsx",
  NL: "FCR_2025_Netherlands.xlsx",
  CH: "FCR_2025_Switzerland.xlsx",
  BE: "FCR_2025_Belgium.xlsx",
  FR: "FCR_2025_France.xlsx",
  CZ: "FCR_2025_Czech_Republic.xlsx",
  SI: "FCR_2025_Slovenia.xlsx",
};

/**
 * Imported 4-hour block prices (EUR/MW per block). NL is deliberately absent: its file
 * contains a second auction (TENDER_NUMBER 2) with its own prices on 2025-10-28/29, so
 * the block price is ambiguous and nothing is imported until that is decided.
 */
const BLOCKS: Partial<Record<FcrCooperationCountry, readonly number[]>> = {
  AT: FCR_AT_2025_BLOCKS_EUR_PER_MW,
  CH: FCR_CH_2025_BLOCKS_EUR_PER_MW,
  BE: FCR_BE_2025_BLOCKS_EUR_PER_MW,
  FR: FCR_FR_2025_BLOCKS_EUR_PER_MW,
  CZ: FCR_CZ_2025_BLOCKS_EUR_PER_MW,
  SI: FCR_SI_2025_BLOCKS_EUR_PER_MW,
};

/** The single EUR/MW-per-block -> EUR/MW/h conversion. */
export function blockPriceToHourly(eurPerMwBlock: number): number {
  return eurPerMwBlock / FCR_BLOCK_HOURS;
}

const cache = new Map<FcrCooperationCountry, FcrPriceSeries>();

/** The country's own symmetric FCR 2025 series, or null — never another country's. */
export function fcrCooperationSeries(code: FcrCooperationCountry): FcrPriceSeries | null {
  const raw = BLOCKS[code];
  if (!raw) return null;
  const hit = cache.get(code);
  if (hit) return hit;
  if (raw.length !== 365 * 6) throw new Error(`FCR ${code}: expected 2190 blocks, got ${raw.length}`);
  const blocks: FcrFourHourBlock[] = raw.map((p, i) => ({
    day: Math.floor(i / 6),
    block: i % 6,
    priceEurPerMwH: blockPriceToHourly(p),
  }));
  const hourly = expandFourHourBlocksToHourly(blocks);
  if (hourly.some((v) => !Number.isFinite(v))) throw new Error(`FCR ${code}: incomplete 8760 series`);
  const series: FcrPriceSeries = {
    market: `FCR Cooperation ${code}`,
    service: "FCR",
    referenceYear: 2025,
    currency: "EUR",
    unit: "EUR/MW/h",
    sourceType: "historical",
    source: `${FCR_COOPERATION_SOURCE_FILES[code]} — ${fcrCooperationSeriesId(code as never, 2025)}, settlement capacity price (EUR/MW per 4 h block) / 4`,
    timestampFrom: "2025-01-01T00:00:00.000Z",
    timestampTo: "2025-12-31T23:00:00.000Z",
    hours: hourly.length,
    sourceHours: raw.length,
    sourcePricesEurPerMw: raw.slice(),
    pricesEurPerMw: hourly,
  };
  cache.set(code, series);
  return series;
}

/** Lookup by explicit series id ("FCR_BE_2025"); unknown/unimported ids return null. */
export function fcrCooperationSeriesById(id: string): FcrPriceSeries | null {
  const m = /^FCR_(AT|NL|CH|BE|FR|CZ|SI)_2025$/.exec(id);
  return m ? fcrCooperationSeries(m[1] as FcrCooperationCountry) : null;
}
