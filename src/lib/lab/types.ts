/**
 * Battery Sizing Lab — type definitions.
 *
 * Vocabulary used everywhere in the engine:
 *  - VERIFIED   : numbers the user typed in (monthly kWh, kWp, fuse size, ...)
 *  - MODELLED   : numbers produced by a synthetic profile / assumption
 *  - CALCULATED : outputs of the simulation
 *
 * All energy is kWh per hour-step, all power is kW. Time resolution is 1 h,
 * 365 days = 8760 steps (no leap year, no DST).
 */

import type { AncillaryConfig } from "./ancillary/types";
import type { FcrRevenueResult } from "./ancillary/fcrEconomics";

export type Provenance = "verified" | "modelled" | "calculated";

export interface Flagged<T> {
  value: T;
  provenance: Provenance;
  note?: string;
}

export type LoadProfileShape =
  | "normal"
  | "day-heavy"
  | "evening-heavy"
  | "heat-pump"
  | "direct-electric"
  | "ev-night"
  | "ev-evening"
  | "pool-summer"
  | "heat-pump-ev"
  | "office"
  | "retail-restaurant"
  | "workshop"
  | "flat"
  | "low-base-peaks";

export interface ConsumptionInput {
  /** 12 values, Jan..Dec, kWh. */
  monthlyKWh: number[];
  /** Only used by helpers that spread an annual figure over months. */
  annualKWh?: number;
  shape: LoadProfileShape;
  /** true when monthlyKWh came from an annual spread instead of real meter data */
  monthlyIsModelled: boolean;
}

export interface SolarInput {
  enabled: boolean;
  /** 12 values, Jan..Dec, kWh. Primary source when present. */
  monthlyKWh: number[];
  kWp: number;
  inverterAcKw: number;
  /** Reported today's self-consumption share, % — informational only. */
  currentSelfConsumptionPct: number;
  /**
   * MEASURED self-consumption share, % of PV used directly by the load. Optional.
   * When set, the intraday load shape is calibrated so the pre-battery baseline
   * reproduces it. Monthly and annual energy are never changed.
   */
  measuredSelfConsumptionPct?: number | null;

  monthlyIsModelled: boolean;
}

export interface BatteryParams {
  nominalKWh: number;
  /** Usable kWh. If 0/undefined it is derived from SOC window. */
  usableKWh: number;
  chargeKw: number;
  dischargeKw: number;
  minSocPct: number;
  maxSocPct: number;
  initialSocPct: number;
  /** Round-trip efficiency, fraction (0-1). Split sqrt() over charge/discharge. */
  roundTripEfficiency: number;
  /** Hard cap on equivalent full cycles per year (0 = unlimited). */
  maxCyclesPerYear: number;
  calendarDegradationPctPerYear: number;
  /** Capacity loss in % per equivalent full cycle. */
  cycleDegradationPctPerCycle: number;
  /** SOC kept aside for backup, % of nominal. Never discharged for energy use. */
  reserveSocPct: number;
  /** Constant parasitic AC draw of inverter/BMS while installed, W (0 = ignore). */
  standbyW: number;
  /** Self-discharge of stored energy, % of current SOC per month (0 = ignore). */
  selfDischargePctPerMonth: number;
}

export interface GridParams {
  mainFuseA: number;
  phases: number;
  voltageV: number;
  /** Optional manual overrides of the PHYSICAL limit, kW. 0 = derive from fuse. */
  maxImportKw: number;
  maxExportKw: number;
  /**
   * Operational design margin in % of the physical limit (design assumption, not
   * physics). 100 = no margin. Undefined = engine default (90 import / 95 export).
   */
  importMarginPct?: number;
  exportMarginPct?: number;
}

export interface StrategyFlags {
  selfConsumption: boolean;
  reduceImport: boolean;
  peakShaving: boolean;
  arbitrage: boolean;
  curtailmentRecovery: boolean;
  backupReserve: boolean;
  flexibility: boolean;
  /** Stödtjänster / frekvensmarknad. Off by default; requires an ingested price dataset. */
  ancillaryServices: boolean;
}

export interface PeakShavingConfig {
  /** Target reduction of the modelled monthly peak, %. */
  targetReductionPct: number;
  /** Only shave during these hours (0-23). */
  activeHours: number[];
  /** Only shave in these months (1-12). */
  activeMonths: number[];
}

/** Economic rules for the demand charge — analysis only, never touches physics. */
export interface DemandChargeConfig {
  enabled: boolean;
  krPerKw: number;
  /** How many monthly peaks are used. */
  peaksPerMonth: number;
  aggregation: "mean" | "max";
  activeHours: number[];
  activeMonths: number[];
}

export interface SpotPriceInput {
  enabled: boolean;
  /** kr/kWh, either 8760 values or 24 values (repeated daily). Empty = off. */
  series: number[];
  /** Extra cost added to spot for imported energy, kr/kWh. */
  importMarkup: number;
  /** Share of spot received for exported energy, fraction. */
  exportShare: number;
  /** Minimum intraday spread required before cycling, kr/kWh. */
  minSpread: number;
  /** Quantiles that define "cheap" and "expensive" hours within a day. */
  cheapQuantile: number;
  expensiveQuantile: number;
}

export interface FlexConfig {
  enabled: boolean;
  reservedPowerKw: number;
  /** Endurance requirement, hours at reserved power. */
  enduranceHours: number;
  /** Extra SOC headroom demanded on top of endurance, % of nominal. */
  socHeadroomPct: number;
  serviceMinSocPct: number;
  serviceMaxSocPct: number;
  /** Availability requirement, % of the year. */
  availabilityPct: number;
  /** kr per kW of reserved power and year. */
  paymentKrPerKwYear: number;
  /** Aggregator cut, % of gross revenue. */
  revenueSharePct: number;
}

export interface EconomicsConfig {
  batteryPriceKrPerKWh: number;
  batteryPriceKrPerKw: number;
  installationCostKr: number;
  fixedCostKr: number;
  buyPriceKrPerKWh: number;
  sellPriceKrPerKWh: number;
  years: number;
  discountRatePct: number;
  useSpotForEnergy: boolean;
}

export interface SweetSpotRule {
  /** KPI the marginal analysis is run on. */
  metric:
    | "totalUsefulKWh"
    | "shiftedKWh"
    | "selfConsumptionPct"
    | "selfSufficiencyPct"
    | "netPresentValueKr";
  /**
   * "knee" = geometric knee/chord analysis of the capacity curve (no fixed %).
   * "threshold" = legacy fixed relative-gain-per-step rule.
   */
  method: "marginal-decay" | "knee" | "threshold";
  /** Relative gain (%) a capacity step must give to still count as worthwhile (threshold method). */
  minRelativeGainPct: number;
  /**
   * Diagnostics only (marginal-decay method): low cycles/utilisation raise a warning but
   * never force the recommendation down to a smaller battery.
   */
  minCyclesPerYear: number;
  minUtilisationPct: number;
  /** Power is picked as the smallest power within this % of the best power result. */
  powerTolerancePct: number;
  /**
   * Battery power (kW) used when capacities are compared, so the capacity ladder is
   * not distorted by power changing between steps. 0 = auto (smallest power that is
   * within the power tolerance at the largest capacity).
   */
  comparisonPowerKw: number;
  /** marginal-decay: below this % of the previous step's marginal gain → stop (clear diminishing returns). */
  marginalStopRatioPct: number;
  /** marginal-decay: at/above this % of the previous step's marginal gain → continue. */
  marginalContinueRatioPct: number;
  /**
   * marginal-decay: absolute gain requirement in the grey zone, as % of annual PV
   * production. Configurable design choice, not a physical constant.
   */
  absoluteGainPctOfAnnualPv: number;
  /**
   * marginal-decay: lets a strong ABSOLUTE gain override the decay stop exactly once.
   * If the marginal ratio is below `marginalStopRatioPct` but the step still delivers
   * >= this factor x the absolute requirement, the step is accepted and the ladder ends
   * there (at most ONE extra step). 0 disables the override.
   */
  absoluteOverrideFactor: number;
  /**
   * marginal-decay: scale-free density floor — minimum energy (kWh/year) an accepted
   * step must deliver PER ADDED kWh of capacity. Roughly "equivalent cycles per year
   * for the increment". Keeps the ladder from running away when the relative and
   * PV-scaled rules degenerate (little or no solar production). 0 disables it.
   */
  minGainPerAddedKWh: number;
  /** Upper normal capacity considered for a house battery, kWh. No extrapolation above it. */

  maxNormalCapacityKWh: number;
}


/**
 * Power sizing is deliberately split in three independent layers:
 *  1. PHYSICAL need  — smallest kW that reaches `utilityThresholdPct` of the useful
 *     energy an unlimited-power battery of the same capacity delivers to the household.
 *  2. PRODUCT level  — smallest real product step >= the physical need (C-rate may be
 *     applied here as a product/technology requirement, never to derive the need).
 *  3. GRID limit     — the connection is verified on the real net flow, per hour.
 */
export interface PowerSizingConfig {
  /** Fine kW ladder used to find the physical need. Highest value = unlimited reference. */
  fineStepsKw: number[];
  /** Real product power levels the physical need is mapped onto. */
  productStepsKw: number[];
  /** Share of the reference useful energy the physical need must reach, %. */
  utilityThresholdPct: number;
  /** Product requirement only: minimum kW per kWh. 0 = no product floor. */
  productMinCRate: number;
  /** Product requirement only: maximum kW per kWh. 0 = no product ceiling. */
  productMaxCRate: number;
  /** Starting point for the product recommendation, kW. */
  basePowerKw: number;
  /** Minimum extra useful energy (%) a higher power step must actually deliver. */
  upgradeMinGainPct: number;
}


export interface PowerSizingPoint {
  powerKw: number;
  /** kWh the battery delivered to the household load (after losses). */
  usefulKWh: number;
  pctOfReference: number;
  powerBoundHours: number;
  powerMissedKWh: number;
}

export interface PowerSizing {
  capacityKWh: number;
  /** Reference power (highest tested) = practically unlimited power. */
  referencePowerKw: number;
  referenceUsefulKWh: number;
  /** Smallest kW that reaches the utility threshold. */
  physicalNeedKw: number;
  physicalCRate: number;
  /** Product level actually recommended. */
  productKw: number;
  productCRate: number;
  productFloorAppliedKw: number | null;
  /** Useful energy at the product level, % of reference. */
  utilityPctOfReference: number;
  missedKWhVsReference: number;
  /** Hours where the battery power limit was binding, at the product level. */
  powerBoundHours: number;
  powerMissedKWh: number;
  /** Hours where the connection limit was binding, at the product level. */
  gridImportBoundHours: number;
  gridExportBoundHours: number;
  gridBlockedKWh: number;
  gridUnservedKWh: number;
  gridWarning: string | null;
  curve: PowerSizingPoint[];
  /** Base power the product recommendation starts from, kW. */
  basePowerKw: number;
  /** Useful energy at the base power, kWh/year. */
  baseUsefulKWh: number;
  /** Higher product step that was verified by a control simulation, if any. */
  upgradeCandidateKw: number | null;
  /** Extra useful energy the upgrade candidate actually delivered, kWh/year and %. */
  upgradeGainKWh: number;
  upgradeGainPct: number;
  upgradeApplied: boolean;
  explanation: string;
}


export interface BalanceWeights {
  selfConsumption: number;
  selfSufficiency: number;
  peakReduction: number;
  economy: number;
  utilisation: number;
}

export interface SweepGrid {
  capacitiesKWh: number[];
  powersKw: number[];
}

/** Day-to-day variation added on top of the smooth synthetic profiles. */
export interface VariabilityConfig {
  enabled: boolean;
  /** Cloudiness spread on daily PV, % (0 = perfectly even days). */
  pvVariationPct: number;
  /** Day-to-day spread on daily load, %. */
  loadVariationPct: number;
  /** Share of days that are atypical (holiday/away/very cloudy), %. */
  atypicalDayPct: number;
  /** Deterministic seed so every run is reproducible. */
  seed: number;
}

export interface LabConfig {
  consumption: ConsumptionInput;
  solar: SolarInput;
  battery: BatteryParams;
  grid: GridParams;
  strategies: StrategyFlags;
  peakShaving: PeakShavingConfig;
  demandCharge: DemandChargeConfig;
  spot: SpotPriceInput;
  flex: FlexConfig;
  /** Ancillary-service (frequency market) settings. No prices until the user supplies them. */
  ancillary: AncillaryConfig;
  economics: EconomicsConfig;
  sweetSpot: SweetSpotRule;
  powerSizing: PowerSizingConfig;
  weights: BalanceWeights;
  variability: VariabilityConfig;
  /** Central, transparent thresholds for the grid classification. */
  gridAssessment: GridAssessmentThresholds;
  sweep: SweepGrid;
}

/**
 * Result of calibrating the intraday load shape against a MEASURED self-consumption
 * share. Only the within-month hourly distribution of the load is reshaped; annual and
 * monthly energy of load and PV are preserved exactly.
 */
export interface SelfConsumptionCalibration {
  /** What the user reported, % of PV production used directly. */
  requestedPct: number;
  /** What the calibrated 8760 baseline actually reaches, %. */
  achievedPct: number;
  /** achieved - requested, percentage points. */
  residualPct: number;
  /** Applied solar tilt strength (0 = untouched). Internal diagnostics only. */
  exponent: number;
  /** Normalised L1 shape deviation from the selected profile, 0..1. */
  shapeDeviation: number;
  /** Maximum allowed shape deviation. */
  shapeDeviationCap: number;
  /** Physically reachable window for this load/PV combination, %. */
  feasibleMinPct: number;
  feasibleMaxPct: number;
  tolerancePct: number;
  /** "matched" = target reached, "partial" = stopped at the shape-preservation cap. */
  status: "matched" | "partial";
}


export interface TimeSeries {
  /** 8760 hourly load values, kWh. */
  load: number[];
  /** 8760 hourly PV production values, kWh (AC, after inverter clipping model). */
  pv: number[];
  /** kWh clipped by the inverter AC limit before it reached the AC side. */
  pvClipped: number[];
  monthOfHour: number[];
  hourOfDay: number[];
  loadProvenance: Provenance;
  pvProvenance: Provenance;
  /** Set only when a measured self-consumption share was supplied. */
  selfConsumptionCalibration?: SelfConsumptionCalibration | null;
}


export interface GridAssessmentThresholds {
  /** Export loss below this share of annual PV (%) is treated as irrelevant. */
  exportLossPctMinor: number;
  /** Export loss at/above this share of annual PV (%) is a material limitation. */
  exportLossPctMaterial: number;
  /** Blocked battery charging above this share of charged energy (%) = battery limitation. */
  batteryBlockedPctOfCharge: number;
  /** Unserved load above this share of annual load (%) counts as a battery limitation. */
  unservedPctOfLoad: number;
}

export type GridAssessmentStatus =
  | "none"
  | "export-limited-minor"
  | "export-limited"
  | "battery-limited"
  | "combined";

/** Non-overlapping split of the year's possible solar energy, kWh. */
export interface SolarSplit {
  directToLoadKWh: number;
  storedInBatteryKWh: number;
  exportedKWh: number;
  limitedByGridKWh: number;
  /** Informational subset of storedInBatteryKWh — round-trip, standby, self-discharge. */
  batteryLossesKWh: number;
  possibleKWh: number;
  residualKWh: number;
}

/** System-level verdict on the connection. Never changes the battery recommendation. */
export interface GridAssessment {
  status: GridAssessmentStatus;
  headline: string;
  detail: string;
  consequences: string[];
  recommendedCapacityKWh: number;
  recommendedPowerKw: number;
  physicalImportKw: number;
  physicalExportKw: number;
  operationalImportKw: number;
  operationalExportKw: number;
  maxActualImportKw: number;
  maxActualExportKw: number;
  importBoundHours: number;
  exportBoundHours: number;
  exportCurtailedKWh: number;
  exportCurtailedPctOfPv: number;
  possiblePvKWh: number;
  unservedKWh: number;
  unservedPctOfLoad: number;
  batteryChargeBlockedKWh: number;
  batteryBlockedPctOfCharge: number;
  /** Curtailment the export limit would cause without any battery. */
  potentialCurtailmentWithoutBatteryKWh: number;
  /** Curtailment that remains with the recommended battery. */
  actualCurtailmentWithBatteryKWh: number;
  /** Difference of the two above — reported separately, never added to solar shifting. */
  curtailmentSavedByBatteryKWh: number;
  curtailmentSavedPctOfPotential: number;
  solarSplit: SolarSplit;
  thresholds: GridAssessmentThresholds;
}

export interface EnergyBalance {
  ok: boolean;
  residualKWh: number;
  detail: string;
}

export interface SimResult {
  capacityKWh: number;
  powerKw: number;
  usableKWh: number;

  annualLoadKWh: number;
  annualPvKWh: number;

  /** Baseline (no battery) */
  baseImportKWh: number;
  baseExportKWh: number;
  /** kWh the export limit curtailed in the no-battery baseline (potential curtailment). */
  baseCurtailedKWh: number;
  /** Load the connection could not deliver in the no-battery baseline, kWh/year. */
  baseUnservedKWh: number;


  baseSelfConsumptionPct: number;
  baseSelfSufficiencyPct: number;
  baseModelledPeakKw: number;
  baseMonthlyPeakKw: number[];

  /** With battery */
  importKWh: number;
  exportKWh: number;
  selfConsumptionPct: number;
  selfSufficiencyPct: number;
  modelledPeakKw: number;
  monthlyPeakKw: number[];

  peakReductionKw: number;
  peakReductionPct: number;

  chargedKWh: number;
  dischargedKWh: number;
  chargedFromPvKWh: number;
  chargedFromGridKWh: number;
  /** Battery energy delivered to the load, kWh/year (after losses). */
  shiftedKWh: number;
  /**
   * Disjoint split of the useful battery energy by what the stored solar would have done
   * WITHOUT the battery. shiftedSolarKWh + recoveredCurtailmentKWh + gridChargedToLoadKWh
   * = shiftedKWh, and totalUsefulKWh = shiftedKWh + recoveredCurtailmentToGridKWh.
   */
  /** Solar that WOULD have been exported, moved to the load instead, kWh/year. */
  shiftedSolarKWh: number;
  /** Solar that would have been SPILLED by the export limit and reached the load, kWh/year. */
  recoveredCurtailmentToLoadKWh: number;
  /** Same recovered solar, but discharged to the grid later when there was headroom, kWh/year. */
  recoveredCurtailmentToGridKWh: number;
  /** Total spilled solar the battery rescued (to load + to grid), kWh/year. */
  recoveredCurtailmentKWh: number;
  /** Battery energy that came from grid charging and served the load, kWh/year. */
  gridChargedToLoadKWh: number;
  /** KPI used for sizing: energy to the load + rescued solar that was exported later. */
  totalUsefulKWh: number;
  /** Unserved load without battery / with battery / improvement, kWh/year. */
  unservedDeltaKWh: number;
  /** True when the battery does not measurably reduce unserved load (grid is the problem). */
  unservedIsGridBound: boolean;
  /** Solar that served the load directly, kWh (no battery involved). */
  directPvToLoadKWh: number;
  /** Solar exported to the grid, kWh (battery-to-grid excluded). */
  pvExportKWh: number;
  /** Battery energy sent to the grid, kWh. */
  batteryToGridKWh: number;
  lossesKWh: number;
  /** Parasitic standby energy, kWh/year (included in lossesKWh). */
  standbyKWh: number;
  /** Self-discharged energy, kWh/year (included in lossesKWh). */
  selfDischargeKWh: number;
  curtailmentRecoveredKWh: number;
  equivalentFullCycles: number;
  utilisationPct: number;

  /** Hours where the battery kW limit bound charge or discharge. */
  powerBoundHours: number;
  /** kWh that could not be moved because of the battery kW limit. */
  powerMissedKWh: number;
  /** Hours where the connection import/export limit bound the real net flow. */
  gridImportBoundHours: number;
  gridExportBoundHours: number;
  /** kWh curtailed/blocked by the export limit. */
  gridBlockedKWh: number;
  /** kWh of load the import limit could not cover. */
  gridUnservedKWh: number;
  /** Grid limits, split into physical truth and operational design assumption. */
  grid: {
    physicalImportKw: number;
    physicalExportKw: number;
    operationalImportKw: number;
    operationalExportKw: number;
    importMarginPct: number;
    exportMarginPct: number;
    maxActualImportKw: number;
    maxActualExportKw: number;
    importBoundHours: number;
    importLimitedKWh: number;
    exportBoundHours: number;
    exportCurtailedKWh: number;
    /** kWh only the design margin caused (would have passed the physical limit). */
    importLimitedByMarginKWh: number;
    exportCurtailedByMarginKWh: number;
    /** Hours where the absolute physical limit would otherwise have been exceeded. */
    physicalImportWouldBindHours: number;
    physicalExportWouldBindHours: number;
    /** Grid charging capped by the PEAK-SHAVING threshold, not by the connection. */
    peakThresholdLimitedKWh: number;
    peakThresholdBoundHours: number;
  };
  flexAvailabilityPct: number;
  flexReservedKWh: number;
  /**
   * DIAGNOSTIC ONLY: the highest battery AC power the dispatch actually used. Separate
   * from the product rating (powerKw) and from the property's power need.
   */
  dispatchPower: { maxChargeKw: number; maxDischargeKw: number };

  /**
   * Ancillary services (frequency market). Reservation is simulated physically;
   * ACTIVATION is not. Revenue is null until a price dataset is supplied — a missing
   * price is never treated as 0 kr and never enters annualSavingsKr/NPV.
   */
  ancillary: {
    enabled: boolean;
    hypotheticalScenario: boolean;
    aggregatedParticipation: boolean;
    reservedPowerUpKw: number;
    reservedPowerDownKw: number;
    reservedEnergyUpKWh: number;
    reservedEnergyDownKWh: number;
    reservedHours: number;
    readyHours: number;
    availabilityPct: number;
    readinessChargeKWh: number;
    wholeYearSimplification: boolean;
    activationSimulated: boolean;
    grossKr: number | null;
    netKr: number | null;
    revenueStatus: "missing-price-data" | "computed";
    revenueMessage: string;
    blockers: string[];
    dataGaps: string[];
    assumptions: string[];
    disclaimer: string;
    /**
     * Historical FCR-D up economics for the 2025 Swedish reference series. Computed ON TOP
     * of the physics from the hourly reservation the battery actually held. Null when the
     * strategy is off. Gross is primary; the aggregator layer stays unset until verified.
     */
    fcr: FcrRevenueResult | null;
    /** Mean actually held reserved up-power over the whole year, kW. */
    avgReservedPowerUpKw: number;
    /**
     * POWER CONCEPTS, deliberately kept apart (see dispatch.ts, PHYSICAL FCR GATE):
     *  - offeredPowerKw       what the optimiser/user asked the market for
     *  - reservablePowerKw    what the system can physically reserve (min of battery
     *                         power headroom, SOC/endurance energy headroom and the grid
     *                         headroom in the paid direction), mean over the hours
     *  - heldPowerKw          what the dispatch actually managed to hold, hour by hour
     *  - monetizedPowerKw     what the economics is allowed to be paid on = held power
     */
    reservablePowerAvgKw: number;
    reservablePowerMaxKw: number;
    heldPowerAvgKw: number;
    monetizedPowerAvgKw: number;
    /** Mean grid-side up-regulation headroom, and the kW the grid gate removed. */
    gridHeadroomAvgKw: number;
    gridClippedAvgKw: number;
    powerLimitedHours: number;
    energyLimitedHours: number;
    gridLimitedHours: number;
    limitingFactor: "power" | "energy" | "grid" | "none";
  };


  energyBalance: EnergyBalance;

  /** Economy without market/flex revenue */
  annualSavingsKr: number;
  demandChargeSavingKr: number;
  arbitrageResultKr: number;
  capexKr: number;
  paybackYears: number | null;
  netPresentValueKr: number;

  /** Economy including flex/market revenue */
  flexRevenueKr: number;
  annualSavingsWithFlexKr: number;
  paybackWithFlexYears: number | null;
  netPresentValueWithFlexKr: number;

  peakIsModelled: boolean;
  notes: string[];
}
