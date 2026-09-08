/**
 * Central country configuration.
 *
 * All country specific assumptions live here — never inside UI components and
 * never inside the Battery Engine. The engine receives already-normalised
 * input; economics receives the tariff block below.
 *
 * Adding a new country = adding one entry to COUNTRIES. No UI changes needed.
 */

import type { FcrMarketArea } from "@/lib/lab/ancillary/prices";
import { computeFuseKw } from "@/lib/battery-engine";

export type CountryCode = "SE" | "NO" | "FI" | "DK" | "DE";

export interface GridDefaults {
  /** Nominal phase-to-phase voltage (V) */
  voltage: number;
  /** Number of phases in a normal residential connection */
  phases: number;
  frequency: number;
  /** Common main fuse ratings (A) shown as quick choices */
  commonMainFuses: number[];
  defaultMainFuse: number;
  /** Grid standards relevant for battery/inverter connection */
  standards: string[];
}

export interface EconomyDefaults {
  currency: string;
  currencyLabel: string;
  /** Cost of buying electricity from the grid, currency/kWh */
  importPrice: number;
  /** Compensation for exported solar, currency/kWh */
  exportPrice: number;
  /**
   * Capacity / demand charge, currency/kW/month.
   * Valued separately from energy prices (peak shaving).
   * 0 = unknown or not applicable until a DSO specific tariff is added.
   */
  demandCharge: number;
  /** SEK per EUR (currency assumption used by the engine's FCR economics). */
  eurSekRate: number;
  /** Set true once verified DSO-specific tariffs exist for the country */
  demandChargeVerified: boolean;
}

/**
 * Ancillary (FCR-D up) market configuration. Deliberately SEPARATE from the grid
 * physics: sharing 400 V three-phase says nothing about sharing a frequency market.
 */
export interface AncillaryMarketConfig {
  /** The TSO market the country belongs to. */
  marketLabel: string;
  /**
   * Price/market area used to look up the verified historical dataset. Countries that
   * later need several zones (Denmark: DK1/DK2) get one entry per area here.
   */
  priceArea: FcrMarketArea;
  /** Additional selectable areas, prepared for zone splits. Empty = single area. */
  additionalPriceAreas: FcrMarketArea[];
}

export interface CountryConfig {
  code: CountryCode;
  name: string;
  flag: string;
  locale: string;
  grid: GridDefaults;
  economy: EconomyDefaults;
  ancillary: AncillaryMarketConfig;
}


export const COUNTRIES: Record<CountryCode, CountryConfig> = {
  SE: {
    code: "SE",
    name: "Sverige",
    flag: "🇸🇪",
    locale: "sv-SE",
    grid: {
      voltage: 400,
      phases: 3,
      frequency: 50,
      commonMainFuses: [16, 20, 25, 35, 50, 63, 80, 100, 125, 160, 200],
      defaultMainFuse: 20,
      standards: ["SS-EN 50549-1", "EIFS 2018:2", "Elsäkerhetsverket"],
    },
    economy: {
      currency: "SEK",
      currencyLabel: "kr",
      importPrice: 1.5,
      exportPrice: 0.6,
      demandCharge: 30,
      eurSekRate: 11.3,
      demandChargeVerified: false,
    },
    ancillary: {
      marketLabel: "Svenska kraftnät (FCR-D upp)",
      priceArea: "SE",
      additionalPriceAreas: [],
    },
  },
  NO: {
    code: "NO",
    name: "Norge",
    flag: "🇳🇴",
    locale: "nb-NO",
    grid: {
      voltage: 400,
      phases: 3,
      frequency: 50,
      commonMainFuses: [25, 32, 40, 63, 80, 100, 125],
      defaultMainFuse: 63,
      standards: ["NEK 399", "FIKS"],
    },
    economy: {
      currency: "NOK",
      currencyLabel: "kr",
      importPrice: 1.4,
      exportPrice: 0.7,
      demandCharge: 0,
      eurSekRate: 11.3,
      demandChargeVerified: false,
    },
    ancillary: {
      marketLabel: "Statnett (FCR-D upp)",
      priceArea: "SE",
      additionalPriceAreas: [],
    },
  },
  FI: {
    code: "FI",
    name: "Finland",
    flag: "🇫🇮",
    locale: "fi-FI",
    grid: {
      voltage: 400,
      phases: 3,
      frequency: 50,
      commonMainFuses: [25, 35, 50, 63, 80, 100],
      defaultMainFuse: 25,
      standards: ["SFS 6000", "VDE-AR-N 4105"],
    },
    economy: {
      // SEK-equivalent defaults (≈ 0,15 / 0,05 EUR × 11,30). The engine is SEK-denominated.
      currency: "SEK",
      currencyLabel: "kr",
      importPrice: 1.7,
      exportPrice: 0.57,
      demandCharge: 0,
      eurSekRate: 11.3,
      demandChargeVerified: false,
    },
    ancillary: {
      marketLabel: "Fingrid (FCR-D upp)",
      priceArea: "FI",
      additionalPriceAreas: [],
    },
  },
  DK: {
    code: "DK",
    name: "Danmark",
    flag: "🇩🇰",
    locale: "da-DK",
    grid: {
      voltage: 400,
      phases: 3,
      frequency: 50,
      commonMainFuses: [25, 35, 50, 63, 80],
      defaultMainFuse: 25,
      standards: ["DS/EN 50549-1"],
    },
    economy: {
      // SEK-equivalent defaults (≈ 2,2 / 0,5 DKK × 1,45). The engine is SEK-denominated.
      currency: "SEK",
      currencyLabel: "kr",
      importPrice: 3.2,
      exportPrice: 0.73,
      demandCharge: 0,
      eurSekRate: 11.3,
      demandChargeVerified: false,
    },
    ancillary: {
      marketLabel: "Energinet (FCR-D upp)",
      priceArea: "DK",
      additionalPriceAreas: ["DK1", "DK2"],
    },
  },
  DE: {
    code: "DE",
    name: "Tyskland",
    flag: "🇩🇪",
    locale: "de-DE",
    grid: {
      voltage: 400,
      phases: 3,
      frequency: 50,
      commonMainFuses: [32, 35, 50, 63, 80, 100],
      defaultMainFuse: 35,
      standards: ["VDE-AR-N 4105", "VDE-AR-N 4110"],
    },
    economy: {
      // SEK-equivalent defaults (≈ 0,32 / 0,08 EUR × 11,30). The engine is SEK-denominated.
      currency: "SEK",
      currencyLabel: "kr",
      importPrice: 3.6,
      exportPrice: 0.9,
      demandCharge: 0,
      eurSekRate: 11.3,
      demandChargeVerified: false,
    },
    ancillary: {
      marketLabel: "Regelleistung / ÜNB (FCR)",
      priceArea: "DE",
      additionalPriceAreas: [],
    },
  },
};

export const COUNTRY_LIST = Object.values(COUNTRIES);

/**
 * Countries released in v1. The engine's economy input is SEK-denominated, so every
 * supported country's economy defaults are stored in SEK (see each entry above).
 */
export const SUPPORTED_COUNTRY_CODES: CountryCode[] = ["SE", "FI", "DK", "DE"];

export const SUPPORTED_COUNTRY_LIST = SUPPORTED_COUNTRY_CODES.map((c) => COUNTRIES[c]);

export function isSupportedCountry(code: CountryCode): boolean {
  return SUPPORTED_COUNTRY_CODES.includes(code);
}

export const DEFAULT_COUNTRY: CountryCode = "SE";

export function getCountry(code: CountryCode): CountryConfig {
  return COUNTRIES[code] ?? COUNTRIES[DEFAULT_COUNTRY];
}

/** Value of self-consumed solar = import price − export price. */
export function selfConsumptionValue(importPrice: number, exportPrice: number): number {
  return Math.max(0, Number((importPrice - exportPrice).toFixed(4)));
}

export function formatMoney(value: number, code: CountryCode, digits = 2): string {
  const c = getCountry(code);
  return `${value.toFixed(digits).replace(".", ",")} ${c.economy.currencyLabel}`;
}

/**
 * ONE shared grid engine for every country: theoretical connection power from the main
 * fuse, using the country's own voltage/phases. No 400 V assumption is duplicated
 * anywhere — a future country with a different standard only needs a COUNTRIES entry.
 *
 *   3-phase: P = sqrt(3) x U x A / 1000
 */
export function theoreticalGridPowerKw(mainFuseA: number, code: CountryCode): number {
  const c = getCountry(code);
  return computeFuseKw(mainFuseA, c.grid.voltage, c.grid.phases);
}

/** Short technical label, e.g. "3-fas 400 V". */
export function gridStandardLabel(code: CountryCode): string {
  const c = getCountry(code);
  return `${c.grid.phases}-fas ${c.grid.voltage} V`;
}

/** Market area used for the historical ancillary price lookup. */
export function fcrMarketArea(code: CountryCode): FcrMarketArea {
  return getCountry(code).ancillary.priceArea;
}
