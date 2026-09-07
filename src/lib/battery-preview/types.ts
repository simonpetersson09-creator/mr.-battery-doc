/**
 * Public contract between the app and the (future) verified Battery Engine
 * from Energy Architect.
 *
 * Data flow:
 *   USER INPUT -> NORMALISED INPUT -> BATTERY ENGINE -> TECHNICAL RESULT
 *   -> ECONOMICS -> UI
 *
 * Nothing in this folder may contain UI code, and no UI component may contain
 * battery physics.
 */

import type { CountryCode } from "@/lib/country-config";
import type { ProfileId } from "@/lib/consumption-profiles";

export interface NormalisedGridInput {
  country: CountryCode;
  voltage: number;
  phases: number;
  frequency: number;
  mainFuseA: number;
}

export interface NormalisedConsumptionInput {
  /** Total annual consumption, kWh/year */
  annualKwh: number;
  /** Chosen Energy Architect profile id (used for time distribution) */
  profileId: ProfileId | null;
  /**
   * Actual monthly consumption, kWh. When present these values take
   * precedence over the profile's synthetic monthly distribution.
   */
  monthlyKwh: number[] | null;
  source: "annual" | "monthly" | "document";
}

export interface NormalisedProductionInput {
  hasPv: boolean;
  dcKwp: number | null;
  acKw: number | null;
  annualKwh: number | null;
  monthlyKwh: number[] | null;
}

export interface BatteryStrategies {
  solarSelfConsumption: boolean;
  reducedGridImport: boolean;
  peakShaving: boolean;
}

export interface EconomicAssumptions {
  currency: string;
  /** currency/kWh */
  importPrice: number;
  /** currency/kWh */
  exportPrice: number;
  /** currency/kWh, derived: importPrice - exportPrice */
  selfConsumptionValue: number;
  /** currency/kW/month, valued separately from energy prices */
  demandCharge: number;
}

export interface BatteryEngineInput {
  grid: NormalisedGridInput;
  consumption: NormalisedConsumptionInput;
  production: NormalisedProductionInput;
  strategies: BatteryStrategies;
  economics: EconomicAssumptions;
}

export interface BatteryRecommendation {
  battery: {
    capacityKwh: number;
    powerKw: number;
    capacityRangeKwh: [number, number];
  };
  energy: {
    selfConsumptionBefore: number;
    selfConsumptionAfter: number;
    selfSufficiencyBefore: number;
    selfSufficiencyAfter: number;
    gridImportBefore: number;
    gridImportAfter: number;
    gridExportBefore: number;
    gridExportAfter: number;
    shiftedEnergyKwh: number;
  };
  power: {
    peakBeforeKw: number;
    peakAfterKw: number;
    peakReductionKw: number;
    peakReductionPct: number;
  };
  economics: {
    savingReducedImport: number;
    valueIncreasedSelfConsumption: number;
    valuePeakShaving: number;
    totalAnnualBenefit: number;
  };
  explanation: string[];
  /** true while the UI is showing placeholder numbers */
  isMock: boolean;
}
