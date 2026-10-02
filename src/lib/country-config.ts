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
import { t } from "@/i18n";

export type CountryCode = "SE" | "NO" | "FI" | "DK" | "DE" | "AT" | "CH" | "BE" | "FR" | "CZ" | "SI";

/** Connection type. 3 = three-phase 400 V (every country), 1 = single-phase 230 V. */
export type PhaseCount = 1 | 3;

/** One selectable connection type with its own voltage and fuse list. */
export interface PhaseOption {
  /**
   * Stable id of the connection type, e.g. "3x400", "3x230", "1x230". Needed because a
   * country can offer two 3-phase systems (Belgium: 3x230 V and 3x400 V).
   */
  id: string;
  phases: PhaseCount;
  /**
   * 3-phase: line-to-line voltage (400 V, or 230 V for Belgian IT/TT 3x230 networks).
   * 1-phase: 230 V phase-to-neutral.
   */
  voltage: number;
  fuses: number[];
  defaultMainFuse: number;
}

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
  /**
   * Optional: countries where the customer may choose between connection types
   * (e.g. FR: 1-phase 230 V or 3-phase 400 V). Absent = only the 3-phase default above.
   */
  phaseOptions?: PhaseOption[];
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
  /**
   * false = import/export prices are neutral placeholders (0) because verified values
   * have not been supplied yet. Absent = existing defaults.
   */
  economyVerified?: boolean;
}

export interface CountryConfig {
  code: CountryCode;
  name: string;
  flag: string;
  locale: string;
  grid: GridDefaults;
  economy: EconomyDefaults;
}


/**
 * GENERIC AMPERE SELECTOR for countries without verified country-specific fuse steps
 * (BE/FR/CZ/SI). A deliberately broad list — not a claim about local standard sizes; any
 * other value can still be entered manually ("Annan").
 */
export const GENERIC_FUSE_STEPS: number[] = [10, 13, 16, 20, 25, 32, 35, 40, 50, 63, 80, 100, 125, 160, 200];

type ConnectionId = "1x230" | "3x230" | "3x400";
const CONNECTION_SPECS: Record<ConnectionId, { phases: PhaseCount; voltage: number; defaultMainFuse: number }> = {
  "1x230": { phases: 1, voltage: 230, defaultMainFuse: 32 },
  "3x230": { phases: 3, voltage: 230, defaultMainFuse: 25 },
  "3x400": { phases: 3, voltage: 400, defaultMainFuse: 25 },
};

/**
 * Country with an explicit electrical-system list, the generic ampere selector and
 * NEUTRAL economy (all prices 0 = "not yet supplied", always user-editable). Nothing is
 * copied from another country. First connection in `connections` = default.
 */
function newCountry(
  code: "BE" | "FR" | "CZ" | "SI",
  name: string,
  flag: string,
  locale: string,
  defaultConnection: ConnectionId,
  connections: ConnectionId[],
  /** Extra larger steps per connection type (only where applicable). */
  extraFuses: Partial<Record<ConnectionId, number[]>> = {},
): CountryConfig {
  const ordered = [defaultConnection, ...connections.filter((c) => c !== defaultConnection)];
  const options: PhaseOption[] = ordered.map((id) => ({
    id,
    ...CONNECTION_SPECS[id],
    fuses: [...GENERIC_FUSE_STEPS, ...(extraFuses[id] ?? [])],
  }));
  const def = options[0]!;
  return {
    code,
    name,
    flag,
    locale,
    grid: {
      voltage: def.voltage,
      phases: def.phases,
      frequency: 50,
      commonMainFuses: [...GENERIC_FUSE_STEPS],
      defaultMainFuse: def.defaultMainFuse,
      // Grid-code references not yet verified for these countries.
      standards: [],
      phaseOptions: options,
    },
    economy: {
      currency: currencyForCountry(code),
      currencyLabel: CURRENCY_SUFFIX[currencyForCountry(code)],
      // NEUTRAL placeholders: verified tariffs not supplied yet. Never copied from SE.
      importPrice: 0,
      exportPrice: 0,
      demandCharge: 0,
      eurSekRate: localUnitsPerEur(code),
      demandChargeVerified: false,
      economyVerified: false,
    },
  };
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
      commonMainFuses: [16, 20, 25, 35, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400],
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
      commonMainFuses: [25, 35, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400],
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
      commonMainFuses: [16, 20, 25, 32, 35, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400],
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
      commonMainFuses: [16, 20, 25, 32, 35, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400],
      defaultMainFuse: 35,
      standards: ["VDE-AR-N 4105", "VDE-AR-N 4110"],
    },
    economy: {
      // Tyska schablonvärden i EUR.
      currency: currencyForCountry("DE"),
      currencyLabel: CURRENCY_SUFFIX[currencyForCountry("DE")],
      importPrice: 0.4,
      exportPrice: 0.08,
      demandCharge: 0,
      eurSekRate: localUnitsPerEur("DE"),
      demandChargeVerified: false,
    },
  },
  AT: {
    code: "AT",
    name: "Österrike",
    flag: "🇦🇹",
    locale: "de-AT",
    grid: {
      voltage: 400,
      phases: 3,
      frequency: 50,
      commonMainFuses: [16, 20, 25, 32, 35, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400],
      defaultMainFuse: 25,
      standards: ["OVE E 8101:2025"],
    },
    economy: {
      // Österrikiska värden i EUR. Köpt el inkl. skatt/moms. Ingen garanterad
      // exportersättning — 0 som utgångsläge, alltid användarredigerbar.
      currency: currencyForCountry("AT"),
      currencyLabel: CURRENCY_SUFFIX[currencyForCountry("AT")],
      importPrice: 0.293,
      exportPrice: 0,
      demandCharge: 0,
      eurSekRate: localUnitsPerEur("AT"),
      demandChargeVerified: false,
    },
  },
  CH: {
    code: "CH",
    name: "Schweiz",
    flag: "🇨🇭",
    locale: "de-CH",
    grid: {
      voltage: 400,
      phases: 3,
      frequency: 50,
      commonMainFuses: [16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400],
      defaultMainFuse: 25,
      standards: ["NIN 2025 / SN 411000"],
    },
    economy: {
      // Schweiziska värden i CHF. Exportvärdet är ett redigerbart utgångsläge.
      currency: currencyForCountry("CH"),
      currencyLabel: CURRENCY_SUFFIX[currencyForCountry("CH")],
      importPrice: 0.277,
      exportPrice: 0.06,
      demandCharge: 0,
      eurSekRate: localUnitsPerEur("CH"),
      demandChargeVerified: false,
    },
  },
  BE: newCountry("BE", "Belgien", "🇧🇪", "nl-BE", "3x400", ["1x230", "3x230", "3x400"], {
    "3x230": [250],
    "3x400": [250],
  }),
  FR: newCountry("FR", "Frankrike", "🇫🇷", "fr-FR", "1x230", ["1x230", "3x400"]),
  CZ: newCountry("CZ", "Tjeckien", "🇨🇿", "cs-CZ", "3x400", ["3x400", "1x230"], {
    "3x400": [250, 315, 400],
  }),
  SI: newCountry("SI", "Slovenien", "🇸🇮", "sl-SI", "3x400", ["3x400", "1x230"], {
    "3x400": [250, 315, 400],
  }),
};

export const COUNTRY_LIST = Object.values(COUNTRIES);

/**
 * Countries released in v1. Economy defaults are stored in each country's OWN currency;
 * the engine is currency agnostic and only needs the local-units-per-EUR rate.
 */
export const SUPPORTED_COUNTRY_CODES: CountryCode[] = [
  "SE", "FI", "DK", "DE", "AT", "CH", "BE", "FR", "CZ", "SI",
];

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
  return `${formatMoney(value, code, digits)}${t("units.perYear")}`;
}

/** Selectable connection types for a country. Countries without a choice get 3-phase only. */
export function phaseOptions(code: CountryCode): PhaseOption[] {
  const g = getCountry(code).grid;
  if (g.phaseOptions?.length) return g.phaseOptions;
  return [
    {
      id: `${g.phases === 1 ? 1 : 3}x${g.voltage}`,
      phases: g.phases === 1 ? 1 : 3,
      voltage: g.voltage,
      fuses: fuseOptionsFor(g),
      defaultMainFuse: g.defaultMainFuse,
    },
  ];
}

/** True when the customer can choose between connection types in this country. */
export function hasPhaseChoice(code: CountryCode): boolean {
  return phaseOptions(code).length > 1;
}

/** The country's default connection type (first option = 3-phase everywhere today). */
export function defaultPhases(code: CountryCode): PhaseCount {
  return phaseOptions(code)[0]!.phases;
}

/** The connection type in effect: the chosen one if valid for the country, else the default. */
/** The default connection id for a country. */
export function defaultConnectionId(code: CountryCode): string {
  return phaseOptions(code)[0]!.id;
}

/**
 * A connection selector: a connection id ("3x230") or, for older saved states, just
 * the phase count. Ids win; a phase count picks the first option with that count.
 */
export type ConnectionSelector = PhaseCount | string | null | undefined;

/** The connection type in effect: the chosen one if valid for the country, else the default. */
export function resolvePhaseOption(code: CountryCode, sel?: ConnectionSelector): PhaseOption {
  const opts = phaseOptions(code);
  if (typeof sel === "string") {
    const byId = opts.find((o) => o.id === sel);
    if (byId) return byId;
  }
  return opts.find((o) => o.phases === sel) ?? opts[0]!;
}

/**
 * Connection selector from stored grid state. The id is used only while it agrees with
 * the stored phase count, so a state that only updates `phases` (older code/cases) is
 * never overridden by a stale id.
 */
export function gridConnectionSelector(grid: {
  country: CountryCode;
  phases?: PhaseCount | null;
  connectionId?: string | null;
}): ConnectionSelector {
  if (grid.connectionId) {
    const o = phaseOptions(grid.country).find((x) => x.id === grid.connectionId);
    if (o && (grid.phases == null || o.phases === grid.phases)) return o.id;
  }
  return grid.phases ?? null;
}

/**
 * ONE shared grid engine for every country: theoretical connection power from the main
 * fuse, using the connection's own voltage/phases.
 *
 *   3-phase: P = sqrt(3) x U x A / 1000   (U = 400 V, or 230 V for Belgian 3x230)
 *   1-phase: P = 230 V x A / 1000
 */
export function theoreticalGridPowerKw(
  mainFuseA: number,
  code: CountryCode,
  phases?: ConnectionSelector,
): number {
  const o = resolvePhaseOption(code, phases);
  return computeFuseKw(mainFuseA, o.voltage, o.phases);
}

/** Short technical label, e.g. "3-fas 400 V" (localized). */
export function gridStandardLabel(code: CountryCode, phases?: ConnectionSelector): string {
  const o = resolvePhaseOption(code, phases);
  return `${t("units.phases", { count: o.phases })} ${o.voltage} V`;
}

function fuseOptionsFor(g: GridDefaults): number[] {
  const all = [...g.commonMainFuses, ...(g.additionalMainFuses ?? [])];
  return Array.from(new Set(all)).sort((a, b) => a - b);
}

/**
 * The full list of selectable main fuse ratings for a country (and connection type),
 * ascending. The UI never hardcodes fuse arrays — this is the single source of truth.
 */
export function fuseOptions(code: CountryCode, phases?: ConnectionSelector): number[] {
  const g = getCountry(code).grid;
  if (g.phaseOptions?.length) {
    return [...resolvePhaseOption(code, phases).fuses].sort((a, b) => a - b);
  }
  return fuseOptionsFor(g);
}

/** The default main fuse rating (A) for the country and connection type. */
export function defaultFuseA(code: CountryCode, phases?: ConnectionSelector): number {
  const g = getCountry(code).grid;
  if (g.phaseOptions?.length) return resolvePhaseOption(code, phases).defaultMainFuse;
  return g.defaultMainFuse;
}

/** True when the value is one of the predefined options. */
export function isListedFuse(code: CountryCode, amps: number, phases?: ConnectionSelector): boolean {
  return fuseOptions(code, phases).includes(amps);
}
