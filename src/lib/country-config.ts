/**
 * Central country configuration.
 *
 * All country specific assumptions live here — never inside UI components and
 * never inside the Battery Engine. The engine receives already-normalised
 * input; economics receives the tariff block below.
 *
 * Adding a new country = adding one entry to COUNTRIES. No UI changes needed.
 */

import {
  CURRENCY_SUFFIX,
  currencyForCountry,
  formatCurrency,
  localUnitsPerEur,
  type Currency,
} from "@/lib/currency";
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
  /**
   * Less common but fully valid ratings for the country. Shown in the same list as the
   * common ones (sorted), so the user never has to type a standard size manually.
   */
  additionalMainFuses?: number[];
  defaultMainFuse: number;
  /** Grid standards relevant for battery/inverter connection */
  standards: string[];
}

export interface EconomyDefaults {
  /** The customer's local currency. Decided by the country, never chosen in the UI. */
  currency: Currency;
  /** Short suffix shown next to fields, e.g. "kr" or "€". */
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
  /**
   * LOCAL CURRENCY UNITS PER EUR. Handed to the engine so the EUR-denominated reserve
   * revenue is converted to the customer's currency BEFORE it is added to energy and
   * peak benefit. Comes from the central currency layer, never hardcoded per country.
   */
  eurSekRate: number;
  /** Set true once verified DSO-specific tariffs exist for the country */
  demandChargeVerified: boolean;
}

export interface CountryConfig {
  code: CountryCode;
  name: string;
  flag: string;
  locale: string;
  grid: GridDefaults;
  economy: EconomyDefaults;
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
      // Svenska schablonvärden i SEK.
      currency: currencyForCountry("SE"),
      currencyLabel: CURRENCY_SUFFIX[currencyForCountry("SE")],
      importPrice: 1.5,
      exportPrice: 0.6,
      demandCharge: 30,
      eurSekRate: localUnitsPerEur("SE"),
      demandChargeVerified: false,
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
      // Norska schablonvärden i NOK.
      currency: currencyForCountry("NO"),
      currencyLabel: CURRENCY_SUFFIX[currencyForCountry("NO")],
      importPrice: 1.4,
      exportPrice: 0.7,
      demandCharge: 0,
      eurSekRate: localUnitsPerEur("NO"),
      demandChargeVerified: false,
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
      commonMainFuses: [25, 35, 50, 63, 80, 100, 125, 160, 200],
      additionalMainFuses: [16, 20],
      defaultMainFuse: 25,
      standards: ["SFS 6000", "VDE-AR-N 4105"],
    },
    economy: {
      // Finska schablonvärden i EUR.
      currency: currencyForCountry("FI"),
      currencyLabel: CURRENCY_SUFFIX[currencyForCountry("FI")],
      importPrice: 0.15,
      exportPrice: 0.05,
      demandCharge: 0,
      eurSekRate: localUnitsPerEur("FI"),
      demandChargeVerified: false,
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
      commonMainFuses: [16, 20, 25, 32, 35, 40, 50, 63, 80, 100],
      defaultMainFuse: 25,
      standards: ["DS/EN 50549-1"],
    },
    economy: {
      // Danska schablonvärden i DKK.
      currency: currencyForCountry("DK"),
      currencyLabel: CURRENCY_SUFFIX[currencyForCountry("DK")],
      importPrice: 2.2,
      exportPrice: 0.5,
      demandCharge: 0,
      eurSekRate: localUnitsPerEur("DK"),
      demandChargeVerified: false,
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
      commonMainFuses: [16, 20, 25, 32, 35, 40, 50, 63, 80, 100],
      defaultMainFuse: 35,
      standards: ["VDE-AR-N 4105", "VDE-AR-N 4110"],
    },
    economy: {
      // Tyska schablonvärden i EUR.
      currency: currencyForCountry("DE"),
      currencyLabel: CURRENCY_SUFFIX[currencyForCountry("DE")],
      importPrice: 0.32,
      exportPrice: 0.08,
      demandCharge: 0,
      eurSekRate: localUnitsPerEur("DE"),
      demandChargeVerified: false,
    },
  },
};

export const COUNTRY_LIST = Object.values(COUNTRIES);

/**
 * Countries released in v1. Economy defaults are stored in each country's OWN currency;
 * the engine is currency agnostic and only needs the local-units-per-EUR rate.
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

/** The customer's currency for a country. Single source of truth for every UI. */
export function countryCurrency(code: CountryCode): Currency {
  return getCountry(code).economy.currency;
}

/** Short unit suffix, e.g. "kr" or "€". Use for field units like "kr/kWh". */
export function countryCurrencySuffix(code: CountryCode): string {
  return getCountry(code).economy.currencyLabel;
}

export function formatMoney(value: number, code: CountryCode, digits = 2): string {
  const c = getCountry(code);
  return formatCurrency(value, c.economy.currency, { locale: c.locale, digits });
}

/** "1 234 kr/år" in the country's own currency and locale. */
export function formatMoneyPerYear(value: number, code: CountryCode, digits = 0): string {
  return `${formatMoney(value, code, digits)}/år`;
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

