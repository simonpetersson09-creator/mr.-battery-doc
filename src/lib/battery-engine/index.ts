/**
 * BATTERY ENGINE v1 — public entry point.
 *
 * This is the ONLY module a consumer application should import. Everything behind it is
 * internal implementation (dispatch, SOC, sweep, sizing, ancillary reservation, economy).
 *
 *   BatteryEngineInput -> runBatteryEngine() -> BatteryEngineResult
 *
 * Guarantees:
 *  - Pure TypeScript. No React, no DOM, no browser storage, no network, no database.
 *  - Deterministic: the same input always produces the same output.
 *  - Economics is a post-processing layer and never influences the physics.
 *  - FCR-D up uses HISTORICAL 2025 Swedish reference prices, never a forecast.
 */

/* ---------------- primary API ---------------- */
export {
  runBatteryEngine,
  recommendBattery,
  runBatterySweep,
  runBatterySimulation,
} from "./run";
export { toLabConfig, toEconomyConfig, toTimeSeries } from "./input";

/* ---------------- versioned configuration ---------------- */
export {
  BATTERY_ENGINE_VERSION,
  BATTERY_ENGINE_TOLERANCES,
  SWEDEN_DEFAULTS,
  SWEDEN_DEFAULT_PROVENANCE,
  type DefaultKind,
  type DefaultProvenance,
} from "./version";

/* ---------------- public types ---------------- */
export type {
  BatteryEngineInput,
  BatteryEngineResult,
  BatteryEngineSummary,
  BatteryEngineDiagnostics,
  CountryCode,
  EngineSiteInput,
  EngineConsumptionInput,
  EngineProductionInput,
  EngineBatteryInput,
  EngineStrategyInput,
  EngineEconomyInput,
  EngineRecommendation,
  EngineEnergySummary,
  EngineGridSummary,
  EnginePeakSummary,
  EngineFcrSummary,
  EngineEconomySummary,
} from "./types";

/* ---------------- catalogues and reference data a UI needs ---------------- */
export {
  LOAD_PROFILES,
  CUSTOMER_LOAD_PROFILES,
  INTERNAL_LOAD_PROFILES,
  getLoadProfile,
  type LoadProfileDef,
} from "../lab/loadProfiles";
export { FCR_D_UP_SE_2025, type FcrPriceSeries } from "../lab/ancillary/prices/fcrDUpSE2025";
export { FCR_HISTORICAL_LABEL, priceStats } from "../lab/ancillary/fcrEconomics";
export { ACTIVE_SERVICE_KEY, marketProfile } from "../lab/ancillary";
export { computeFuseKw, computeGridLimits, type GridLimits } from "../lab/dispatch";

/* ---------------- internal result types referenced by the public model ---------------- */
export type {
  LabConfig,
  LoadProfileShape,
  SimResult,
  TimeSeries,
  GridAssessment,
  PowerSizing,
  EnergyBalance,
  Provenance,
} from "../lab/types";
export type { SweepResult, SweetSpot, PeakFloorOutcome } from "../lab/sweep";
export type {
  OperatingEconomyConfig,
  OperatingEconomyResult,
  PeakTariffSource,
  FcrOptimisationResult,
  FcrSweepCandidate,
} from "../lab/operatingEconomy";
export {
  SWEDISH_OPERATING_ECONOMY,
  SWEDISH_DEFAULT_PEAK_TARIFF_SEK_PER_KW_MONTH,
  FCR_SWEEP_FRACTIONS,
  FCR_TIE_TOLERANCE_SEK,
  FCR_HISTORICAL_DISCLAIMER,
  customerSummary,
} from "../lab/operatingEconomy";
export type { FcrRevenueResult } from "../lab/ancillary/fcrEconomics";

/* ---------------- product cost + economic power sizing (new layer) ---------------- */
export {
  EMPTY_PRODUCT_COST,
  productCostConfig,
  productCost,
  productOptionKey,
  capitalRecoveryFactor,
  missingProductCostFields,
} from "../lab/productCost";
export type { ProductCostConfig, ProductCostBreakdown } from "../lab/productCost";
export {
  DEFAULT_MAX_PRODUCT_C_RATE,
  POWER_TIE_TOLERANCE_SEK,
  EMPTY_FCR_MARKET_REALISM,
  buildPowerCandidates,
  fcrMarketRealismGaps,
  realisticFcrNetSek,
  runEconomicPowerSizing,
  simulateAtPower,
} from "../lab/economicPowerSizing";
export type {
  EconomicPowerSizingInput,
  EconomicPowerSizingResult,
  EconomicPowerSizingStatus,
  FcrMarketRealismConfig,
  PowerOption,
} from "../lab/economicPowerSizing";
export type { EnginePowerOption } from "./types";
