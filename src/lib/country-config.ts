/**
 * Central country configuration.
 *
 * All country specific assumptions live here — never inside UI components and
 * never inside the Battery Engine. The engine receives already-normalised
 * input; economics receives the tariff block below.
 *
 * Adding a new country = adding one entry to COUNTRIES. No UI changes needed.
 */

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
      currency: "SEK",
      currencyLabel: "kr",
      importPrice: 1.5,
      exportPrice: 0.6,
      demandCharge: 55,
      eurSekRate: 11.3,
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
      currency: "NOK",
      currencyLabel: "kr",
      importPrice: 1.4,
      exportPrice: 0.7,
      demandCharge: 0,
      eurSekRate: 11.3,
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
      commonMainFuses: [25, 35, 50, 63, 80, 100],
      defaultMainFuse: 25,
      standards: ["SFS 6000", "VDE-AR-N 4105"],
    },
    economy: {
      currency: "EUR",
      currencyLabel: "€",
      importPrice: 0.15,
      exportPrice: 0.05,
      demandCharge: 0,
      eurSekRate: 11.3,
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
      commonMainFuses: [25, 35, 50, 63, 80],
      defaultMainFuse: 25,
      standards: ["DS/EN 50549-1"],
    },
    economy: {
      currency: "DKK",
      currencyLabel: "kr",
      importPrice: 2.2,
      exportPrice: 0.5,
      demandCharge: 0,
      eurSekRate: 11.3,
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
      commonMainFuses: [32, 35, 50, 63, 80, 100],
      defaultMainFuse: 35,
      standards: ["VDE-AR-N 4105", "VDE-AR-N 4110"],
    },
    economy: {
      currency: "EUR",
      currencyLabel: "€",
      importPrice: 0.32,
      exportPrice: 0.08,
      demandCharge: 0,
      eurSekRate: 11.3,
      demandChargeVerified: false,
    },
  },
};

export const COUNTRY_LIST = Object.values(COUNTRIES);

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
