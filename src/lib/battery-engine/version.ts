/**
 * BATTERY ENGINE — versioned defaults and provenance table.
 *
 * This file is part of the EXPORT LAYER. It adds no physics and no economics: it only
 * freezes the values that must travel with the engine and documents WHAT KIND of number
 * each one is, so a consumer app can never present a rule-of-thumb as a measured fact.
 */

import { DEFAULT_EUR_SEK_RATE } from "../lab/ancillary/fcrEconomics";
import { FCR_D_UP_SE_2025 } from "../lab/ancillary/prices/fcrDUpSE2025";
import {
  SWEDISH_DEFAULT_PEAK_TARIFF_SEK_PER_KW_MONTH,
  SWEDISH_OPERATING_ECONOMY,
} from "../lab/operatingEconomy";
import type { OperatingEconomyConfig } from "../lab/operatingEconomy";

export const BATTERY_ENGINE_VERSION = "1.0.0";

/** Numerical tolerances that define migration parity (see BATTERY_ENGINE_EXPORT.md). */
export const BATTERY_ENGINE_TOLERANCES = {
  /** Discrete results (recommended kWh/kW, hour counts, step counts): must match exactly. */
  discrete: 0,
  /** Energy in kWh/year. */
  energyKWh: 1e-6,
  /** Power in kW. */
  powerKw: 1e-6,
  /** Money in SEK/year or EUR/year. */
  moneySek: 1e-6,
  /** Percentages. */
  pct: 1e-9,
} as const;

/**
 * What kind of number a default is. Nothing here is a forecast.
 *  - physical            : measurable property of the installation or of physics
 *  - model-assumption    : a modelling choice of this engine
 *  - economic-estimate   : a rule-of-thumb price (schablon) meant to be replaced
 *  - historical-reference: measured historical market data, NOT a future prediction
 */
export type DefaultKind =
  | "physical"
  | "model-assumption"
  | "economic-estimate"
  | "historical-reference";

export interface DefaultProvenance {
  key: string;
  value: string;
  kind: DefaultKind;
  note: string;
}

/** Swedish default package shipped with the engine. */
export const SWEDEN_DEFAULTS = {
  country: "SE" as const,
  gridVoltageV: 400,
  phases: 3,
  mainFuseA: 16,
  importMarginPct: 90,
  exportMarginPct: 95,
  economy: { ...SWEDISH_OPERATING_ECONOMY } as OperatingEconomyConfig,
  peakTariffSekPerKwMonth: SWEDISH_DEFAULT_PEAK_TARIFF_SEK_PER_KW_MONTH,
  eurSekRate: DEFAULT_EUR_SEK_RATE,
  fcrReferenceYear: FCR_D_UP_SE_2025.referenceYear,
  fcrDataKind: "historical reference data" as const,
} as const;

export const SWEDEN_DEFAULT_PROVENANCE: DefaultProvenance[] = [
  {
    key: "gridVoltageV / phases / mainFuseA",
    value: "400 V / 3 / 16 A",
    kind: "physical",
    note: "Fuse power is computed as sqrt(3) x U x I. Always replace with the real connection.",
  },
  {
    key: "importMarginPct / exportMarginPct",
    value: "90 % / 95 %",
    kind: "model-assumption",
    note: "Operational design margin on top of the physical limit. 100 = margin off.",
  },
  {
    key: "roundTripEfficiency",
    value: "0.90",
    kind: "physical",
    note: "Split as sqrt() over charge and discharge.",
  },
  {
    key: "standbyW / selfDischargePctPerMonth",
    value: "20 W / 1.0 %",
    kind: "model-assumption",
    note: "Parasitic losses; included in lossesKWh, never priced separately.",
  },
  {
    key: "minSocPct / maxSocPct",
    value: "5 % / 95 %",
    kind: "physical",
    note: "Usable SOC window when usableKWh is not given explicitly.",
  },
  {
    key: "importEnergyPriceSekPerKWh",
    value: "1.50 SEK/kWh",
    kind: "economic-estimate",
    note: "Total variable cost of one extra purchased kWh. Fully editable.",
  },
  {
    key: "exportEnergyValueSekPerKWh",
    value: "0.60 SEK/kWh",
    kind: "economic-estimate",
    note: "Value of one kWh that would otherwise have been exported. Fully editable.",
  },
  {
    key: "peakDemandChargeSekPerKwMonth",
    value: "55 SEK/kW/month",
    kind: "economic-estimate",
    note: "Swedish schablon, NOT a national tariff. Mark as user-provided when the customer supplies their own.",
  },
  {
    key: "eurSekRate",
    value: "11.30 SEK/EUR",
    kind: "economic-estimate",
    note: "Currency assumption, not part of Svenska kraftnat's FCR data.",
  },
  {
    key: "FCR-D up price series",
    value: `Sweden ${FCR_D_UP_SE_2025.referenceYear}, ${FCR_D_UP_SE_2025.hours} hours, EUR/MW/h`,
    kind: "historical-reference",
    note: "HISTORICAL REFERENCE DATA. Not a forecast and not a guaranteed future revenue.",
  },
  {
    key: "sweetSpot.minGainPerAddedKWh",
    value: "40 kWh/year per added kWh",
    kind: "model-assumption",
    note: "Scale-free density floor that stops capacity runaway.",
  },
  {
    key: "powerSizing.utilityThresholdPct",
    value: "99 %",
    kind: "model-assumption",
    note: "Smallest kW that still reaches 99 % of the unlimited-power useful energy.",
  },
  {
    key: "maxNormalCapacityKWh",
    value: "500 kWh",
    kind: "model-assumption",
    note: "Upper capacity considered. No extrapolation above it.",
  },
  {
    key: "MAX_OFFERED_FCR_POWER_KW",
    value: "200 kW",
    kind: "model-assumption",
    note: "Absolute cap on offered FCR-D up power and on the product power ladder.",
  },
  {
    key: "variability.seed",
    value: "20260904",
    kind: "model-assumption",
    note: "Deterministic seed. Same input always gives the same 8760 series.",
  },
];
