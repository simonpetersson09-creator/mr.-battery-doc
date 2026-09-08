/**
 * BATTERY ENGINE — public input/result model.
 *
 * Boundary contract:
 *
 *   BatteryEngineInput -> Battery Engine -> BatteryEngineResult
 *
 * The engine knows nothing about any UI. A consumer app collects user data, converts it
 * to BatteryEngineInput, runs the engine and presents BatteryEngineResult.
 *
 * PHYSICAL inputs (`site`, `consumption`, `production`, `battery`, `strategies`) and
 * ECONOMIC inputs (`economy`) are deliberately separate: economics never influences
 * dispatch, SOC, sizing or grid physics.
 */

import type { FcrRevenueResult } from "../lab/ancillary/fcrEconomics";
import type {
  EconomicPowerSizingResult,
  EconomicPowerSizingStatus,
  FcrMarketRealismConfig,
} from "../lab/economicPowerSizing";
import type { ProductCostConfig } from "../lab/productCost";
import type {
  FcrOptimisationResult,
  OperatingEconomyConfig,
  OperatingEconomyResult,
  PeakTariffSource,
} from "../lab/operatingEconomy";
import type { SweepResult } from "../lab/sweep";
import type {
  EnergyBalance,
  GridAssessment,
  LabConfig,
  LoadProfileShape,
  PowerSizing,
  SimResult,
  TimeSeries,
} from "../lab/types";

export type CountryCode = "SE";

/* ============================ INPUT ============================ */

/** Connection / grid physics. */
export interface EngineSiteInput {
  country?: CountryCode;
  /** Nominal voltage, V (400 V for a Swedish three-phase connection). */
  voltageV?: number;
  phases?: number;
  mainFuseA?: number;
  /** Manual override of the PHYSICAL import limit, kW. 0/undefined = derive from fuse. */
  maxImportKw?: number;
  /** Manual override of the PHYSICAL export limit, kW. 0/undefined = derive from fuse. */
  maxExportKw?: number;
  /** Operational design margins, % of the physical limit (100 = off). */
  importMarginPct?: number;
  exportMarginPct?: number;
}

export interface EngineConsumptionInput {
  annualKWh?: number;
  /** 12 values Jan..Dec, kWh. Takes precedence over annualKWh when given. */
  monthlyKWh?: number[];
  profile?: LoadProfileShape;
  /** Ready-made 8760 hourly load series, kWh/h. Overrides profile generation. */
  hourlyKWh?: number[];
}

export interface EngineProductionInput {
  enabled?: boolean;
  annualKWh?: number;
  /** 12 values Jan..Dec, kWh. Takes precedence over annualKWh when given. */
  monthlyKWh?: number[];
  /** Installed panel power, kWp. */
  kWp?: number;
  /** Inverter AC limit, kW (clipping is modelled). */
  inverterAcKw?: number;
  /** Ready-made 8760 hourly AC production series, kWh/h. Overrides profile generation. */
  hourlyKWh?: number[];
}

export interface EngineBatteryInput {
  /** Capacity ladder the sweep tests, kWh. */
  capacityStepsKWh?: number[];
  /** Product power ladder, kW. */
  powerStepsKw?: number[];
  minSocPct?: number;
  maxSocPct?: number;
  initialSocPct?: number;
  /** Round-trip efficiency, fraction 0-1. */
  roundTripEfficiency?: number;
  standbyW?: number;
  selfDischargePctPerMonth?: number;
  reserveSocPct?: number;
  maxCyclesPerYear?: number;
  /** Fix the sizing instead of letting the engine recommend, kWh/kW. */
  fixedCapacityKWh?: number;
  fixedPowerKw?: number;
  /**
   * MAXIMUM candidate range for economic power sizing, as a C-rate (default 0.5).
   * It is a ceiling for the product alternatives that are tested — never a minimum
   * required C-rate, and it never changes the physical sizing.
   */
  maxProductCRateForCandidates?: number;
}

export interface EngineStrategyInput {
  /** Optimised self-consumption of solar. */
  selfConsumption?: boolean;
  /** Reduced grid import. */
  reduceImport?: boolean;
  peakShaving?: boolean;
  /** Target reduction of the modelled monthly peak, %. */
  peakTargetReductionPct?: number;
  peakActiveHours?: number[];
  peakActiveMonths?: number[];
  /** FCR-D up (ancillary services). */
  fcrDUp?: boolean;
  /** Offered FCR-D up power, kW. Omit to let the engine optimise the reservation. */
  fcrOfferedPowerKw?: number;
  /** Run the 0/25/50/75/100 % FCR reservation sweep and pick the historically best level. */
  optimiseFcrReservation?: boolean;
}

export interface EngineEconomyInput {
  importEnergyPriceSekPerKWh?: number;
  exportEnergyValueSekPerKWh?: number;
  /** SEK/kW/month. Null = no monetary value for the power reduction. */
  peakDemandChargeSekPerKwMonth?: number | null;
  peakTariffSource?: PeakTariffSource;
  eurSekRate?: number;
}

export interface BatteryEngineInput {
  /** Input model version, for forward compatibility. */
  version?: string;
  site?: EngineSiteInput;
  consumption?: EngineConsumptionInput;
  production?: EngineProductionInput;
  battery?: EngineBatteryInput;
  strategies?: EngineStrategyInput;
  /** ECONOMIC inputs only. Never affects the physics. */
  economy?: EngineEconomyInput;
  /**
   * Product cost model for ECONOMIC power sizing. Everything defaults to null =
   * unverified, and the engine then refuses to produce an economic power optimum.
   */
  productCost?: Partial<ProductCostConfig>;
  /**
   * FCR market realism. While any parameter is null the FCR revenue is left OUT of the
   * economic power-sizing objective.
   */
  fcrMarketRealism?: Partial<FcrMarketRealismConfig>;
  /**
   * Escape hatch for advanced/internal parameters (sweet spot, power sizing, variability,
   * grid-assessment thresholds). Applied on top of the engine defaults.
   */
  advanced?: Partial<LabConfig>;
}

/* ============================ RESULT ============================ */

export interface EngineRecommendation {
  capacityKWh: number;
  powerKw: number;
  /** Technical power need before it is mapped onto a product step, kW. */
  physicalPowerNeedKw: number;
  reasonableRangeKWh: [number, number];
  diminishingFromKWh: number | null;
  upperLimitReached: boolean;
  explanation: string;
  powerExplanation: string;
  utilisationWarning: string | null;
  /** True when the sizing was supplied by the caller instead of recommended. */
  sizingWasFixed: boolean;
  /**
   * DIAGNOSTIC ONLY: the highest battery AC power the dispatch actually used in the
   * recommended system. Never mixed up with the product rating (`powerKw`) or with the
   * property's calculated need (`physicalPowerNeedKw`).
   */
  actualDispatchPowerKw: number;
  /** Rating of the product alternative today's PHYSICAL sizing lands on, kW. */
  productPowerKw: number;
  /** Highest operating benefit BEFORE product cost, kW. Null when not evaluated. */
  operatingOptimalPowerKw: number | null;
  /** Highest annualised net AFTER product cost, kW. Null when it cannot be computed. */
  economicallyOptimalPowerKw: number | null;
  economicPowerSizingStatus: EconomicPowerSizingStatus;
  /** "ok" | "product-cost-data-missing" | "fcr-market-data-incomplete" | "sizing-fixed". */
  economicPowerSizingReason: string;
}

/** One simulated product alternative at the recommended capacity. */
export interface EnginePowerOption {
  powerKw: number;
  cRate: number;
  actualDispatchPowerKw: number;
  fcrOfferedPowerKw: number;
  fcrReservablePowerKw: number;
  fcrHeldPowerKw: number;
  fcrMonetizedPowerKw: number;
  energyBenefitSek: number;
  peakBenefitSek: number | null;
  fcrGrossSek: number | null;
  fcrRealisticNetSek: number | null;
  operatingBenefitSek: number;
  capexSek: number | null;
  annualisedCostSek: number | null;
  annualNetBenefitSek: number | null;
  incrementalOperatingBenefitSek: number | null;
  incrementalAnnualisedPowerCostSek: number | null;
  incrementalAnnualNetBenefitSek: number | null;
  selected: boolean;
  physicalSizingChoice: boolean;
}

export interface EngineEnergySummary {
  annualLoadKWh: number;
  annualPvKWh: number;
  importBeforeKWh: number;
  importAfterKWh: number;
  exportBeforeKWh: number;
  exportAfterKWh: number;
  selfConsumptionBeforePct: number;
  selfConsumptionAfterPct: number;
  selfSufficiencyBeforePct: number;
  selfSufficiencyAfterPct: number;
  shiftedSolarKWh: number;
  shiftedToLoadKWh: number;
  recoveredCurtailmentKWh: number;
  gridChargedKWh: number;
  batteryLossesKWh: number;
  equivalentFullCycles: number;
  utilisationPct: number;
  totalUsefulKWh: number;
}

export interface EngineGridSummary {
  physicalImportKw: number;
  physicalExportKw: number;
  operationalImportKw: number;
  operationalExportKw: number;
  importPeakBeforeKw: number;
  importPeakAfterKw: number;
  monthlyPeakBeforeKw: number[];
  monthlyPeakAfterKw: number[];
  exportCurtailedKWh: number;
  unservedLoadKWh: number;
  unservedIsGridBound: boolean;
  status: GridAssessment["status"];
  headline: string;
  detail: string;
  consequences: string[];
}

export interface EnginePeakSummary {
  peakReductionKw: number;
  /** Signed change: positive = peak went down. */
  peakChangeKw: number;
  peakDirection: "reduced" | "increased" | "unchanged";
  peakChangeText: string;
  monthlyReductionKw: number[];
  tariffSekPerKwMonth: number | null;
  tariffSource: PeakTariffSource;
  tariffNote: string | null;
  /** "Minskad effektkostnad", SEK/year. Null when there is no tariff. */
  demandCostSavingSek: number | null;
  message: string | null;
}

export interface EngineFcrSummary {
  enabled: boolean;
  /** What the optimiser/user offers to the market, kW. */
  offeredPowerKw: number;
  /**
   * What the system can PHYSICALLY reserve: min(battery power headroom, SOC/endurance
   * energy headroom, grid headroom in the paid direction). Mean/max over the scheduled
   * hours. Payment can never exceed this.
   */
  reservablePowerAvgKw: number;
  reservablePowerMaxKw: number;
  /** Mean grid-side up-regulation headroom and the kW the grid gate removed. */
  gridHeadroomAvgKw: number;
  gridClippedAvgKw: number;
  /** Which physical factor bound most scheduled hours. */
  limitingFactor: "power" | "energy" | "grid" | "none";
  powerLimitedHours: number;
  energyLimitedHours: number;
  gridLimitedHours: number;
  /** The power the economics is actually paid on = the held power. */
  monetizedPowerKw: number;
  avgHeldPowerKw: number;
  reservedEnergyKWh: number;
  reservedHours: number;
  availabilityPct: number;
  grossSek: number | null;
  opportunityCostSek: number | null;
  incrementalNetSek: number | null;
  historicalReferenceYear: number | null;
  label: string | null;
  disclaimer: string;
  blockers: string[];
  /** Set when the reservation sweep picked the level. */
  optimisedPowerKw: number | null;
  optimisationText: string | null;
}

export interface EngineEconomySummary {
  energyBenefitSek: number;
  demandCostSavingSek: number | null;
  fcrGrossSek: number | null;
  totalOperatingBenefitSek: number | null;
  totalIsIncomplete: boolean;
  /** Human-readable list of which values are estimates/assumptions. */
  assumptions: string[];
  notes: string[];
}

export interface BatteryEngineSummary {
  recommendation: EngineRecommendation;
  energy: EngineEnergySummary;
  grid: EngineGridSummary;
  peak: EnginePeakSummary;
  fcr: EngineFcrSummary;
  economy: EngineEconomySummary;
  energyBalance: EnergyBalance;
  /** Simulated product alternatives at the recommended capacity. Empty when not run. */
  powerOptions: EnginePowerOption[];
}

/** Everything an engineering/debug view needs. Never required by a consumer app. */
export interface BatteryEngineDiagnostics {
  /** Full sweep: every capacity/power combination that was simulated. */
  sweep: SweepResult;
  /** Simulated result of the recommended combination. */
  simulation: SimResult;
  powerSizing: PowerSizing;
  gridAssessment: GridAssessment;
  operatingEconomy: OperatingEconomyResult;
  /** Identical case with FCR-D up switched off; the basis of the opportunity cost. */
  operatingEconomyWithoutFcr: OperatingEconomyResult | null;
  fcrOptimisation: FcrOptimisationResult | null;
  fcrRevenue: FcrRevenueResult | null;
  /** 8760 hourly load/PV series the run used. */
  series: TimeSeries;
  /** Fully resolved internal configuration — the reproducible run definition. */
  config: LabConfig;
  /** Full economic power-sizing evaluation, including every simulated candidate. */
  economicPowerSizing: EconomicPowerSizingResult;
}

export interface BatteryEngineResult {
  engineVersion: string;
  summary: BatteryEngineSummary;
  diagnostics: BatteryEngineDiagnostics;
}

export type { OperatingEconomyConfig };
