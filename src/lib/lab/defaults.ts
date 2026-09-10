import { defaultAncillaryConfig } from "./ancillary";
import { DEFAULT_EXPORT_MARGIN_PCT, DEFAULT_IMPORT_MARGIN_PCT } from "./dispatch";
import { DEFAULT_GRID_ASSESSMENT_THRESHOLDS } from "./gridAssessment";
import type { LabConfig } from "./types";

export const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const HOURS_PER_YEAR = 8760;
export const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Maj",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dec",
];

/** Typical Swedish villa/small property monthly share of annual consumption. */
export const DEFAULT_LOAD_MONTH_SHARE = [
  0.128, 0.115, 0.104, 0.081, 0.061, 0.045, 0.04, 0.043, 0.058, 0.081, 0.106, 0.138,
];

/** Typical Swedish PV monthly share of annual production (mid Sweden). */
export const DEFAULT_PV_MONTH_SHARE = [
  0.012, 0.032, 0.072, 0.111, 0.14, 0.145, 0.14, 0.115, 0.08, 0.04, 0.014, 0.005,
];

export function spreadAnnual(annualKWh: number, share: number[]): number[] {
  const sum = share.reduce((a, b) => a + b, 0);
  const raw = share.map((s) => (annualKWh * s) / sum);
  const rounded = raw.map((v) => Math.round(v));
  // Put the rounding residual on the largest month so the annual total is exact.
  const diff = Math.round(annualKWh) - rounded.reduce((a, b) => a + b, 0);
  if (diff !== 0 && rounded.length > 0) {
    let iMax = 0;
    for (let i = 1; i < rounded.length; i++) if (rounded[i]! > rounded[iMax]!) iMax = i;
    rounded[iMax] = rounded[iMax]! + diff;
  }
  return rounded;
}


export const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i);
export const ALL_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export function defaultConfig(): LabConfig {
  return {
    consumption: {
      monthlyKWh: spreadAnnual(10000, DEFAULT_LOAD_MONTH_SHARE),
      annualKWh: 10000,
      shape: "evening-heavy",
      monthlyIsModelled: true,
    },
    solar: {
      enabled: true,
      monthlyKWh: spreadAnnual(12000, DEFAULT_PV_MONTH_SHARE),
      kWp: 12,
      inverterAcKw: 10,
      currentSelfConsumptionPct: 35,
      monthlyIsModelled: true,
    },
    battery: {
      nominalKWh: 10,
      usableKWh: 0,
      chargeKw: 5,
      dischargeKw: 5,
      minSocPct: 5,
      maxSocPct: 95,
      initialSocPct: 50,
      roundTripEfficiency: 0.9,
      maxCyclesPerYear: 0,
      calendarDegradationPctPerYear: 1.5,
      cycleDegradationPctPerCycle: 0,
      reserveSocPct: 0,
      standbyW: 20,
      selfDischargePctPerMonth: 1.0,
    },
    grid: {
      mainFuseA: 16,
      phases: 3,
      voltageV: 400,
      maxImportKw: 0,
      maxExportKw: 0,
      // Design margin (not physics): 100 = margin off.
      importMarginPct: DEFAULT_IMPORT_MARGIN_PCT,
      exportMarginPct: DEFAULT_EXPORT_MARGIN_PCT,
    },
    strategies: {
      selfConsumption: true,
      reduceImport: true,
      peakShaving: false,
      arbitrage: false,
      curtailmentRecovery: false,
      backupReserve: false,
      flexibility: false,
      ancillaryServices: false,
    },
    peakShaving: {
      targetReductionPct: 20,
      activeHours: ALL_HOURS,
      activeMonths: ALL_MONTHS,
      gridChargingEnabled: true,
    },

    demandCharge: {
      enabled: false,
      krPerKw: 55,
      peaksPerMonth: 3,
      aggregation: "mean",
      activeHours: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
      activeMonths: ALL_MONTHS,
    },
    spot: {
      enabled: false,
      series: [],
      importMarkup: 0.55,
      exportShare: 1,
      minSpread: 0.4,
      cheapQuantile: 0.25,
      expensiveQuantile: 0.75,
    },
    flex: {
      enabled: false,
      reservedPowerKw: 2,
      enduranceHours: 1,
      socHeadroomPct: 5,
      serviceMinSocPct: 20,
      serviceMaxSocPct: 80,
      availabilityPct: 95,
      paymentKrPerKwYear: 400,
      revenueSharePct: 20,
    },
    ancillary: defaultAncillaryConfig(),
    economics: {
      batteryPriceKrPerKWh: 4000,
      batteryPriceKrPerKw: 1500,
      installationCostKr: 15000,
      fixedCostKr: 0,
      buyPriceKrPerKWh: 1.9,
      sellPriceKrPerKWh: 0.7,
      years: 15,
      discountRatePct: 5,
      useSpotForEnergy: false,
    },
    sweetSpot: {
      // Total useful battery energy: energy delivered to the load PLUS solar rescued from
      // export curtailment and released later. Numerically identical to shiftedKWh when
      // there is no curtailment, so unconstrained systems are unaffected.
      metric: "totalUsefulKWh",
      method: "marginal-decay",
      minRelativeGainPct: 6,
      // Diagnostics only under marginal-decay.
      minCyclesPerYear: 120,
      minUtilisationPct: 40,
      powerTolerancePct: 3,
      comparisonPowerKw: 0,
      marginalStopRatioPct: 40,
      marginalContinueRatioPct: 60,
      absoluteGainPctOfAnnualPv: 1.5,
      // Validated on a 252-run matrix: 1.5x generalises best; 2x fixes only part of the
      // small-system bias, 2.5x+ behaves like no override at all.
      absoluteOverrideFactor: 1.5,
      // Physical density floor: an extra kWh of capacity must deliver at least 40 kWh/year
      // (≈40 equivalent cycles for the increment). Scale free and invariant to how the
      // capacity ladder is subdivided, which is what keeps the recommendation stable when
      // the sweep resolution changes and stops the runaway when there is little/no solar.
      minGainPerAddedKWh: 40,

      // Upper test/recommendation limit. 30 kWh covers villas; raised to 500 kWh so
      // commercial systems can be sized. The marginal-decay rule still stops small
      // systems early, so villa recommendations are unaffected.
      maxNormalCapacityKWh: 500,
    },
    powerSizing: {
      // Fine ladder: only used to find the physical need, not a product list.
      // Fine resolution for small residential systems, coarser steps for commercial ones.
      // Highest value = the practically unlimited power reference.
      fineStepsKw: [
        0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7.5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100,
        125, 150, 175, 200,
      ],
      productStepsKw: [2, 3, 5, 7.5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 200],
      utilityThresholdPct: 99,
      // 0 = the recommendation follows the simulation, not a C-rate assumption.
      productMinCRate: 0,
      productMaxCRate: 0,
      basePowerKw: 3,
      // No capacity gate: every capacity may step up when a control simulation
      // shows at least upgradeMinGainPct extra useful energy.
      upgradeMinGainPct: 1,
    },

    weights: {
      selfConsumption: 1,
      selfSufficiency: 1,
      peakReduction: 0.5,
      economy: 0,
      utilisation: 0.5,
    },
    variability: {
      enabled: true,
      pvVariationPct: 35,
      loadVariationPct: 20,
      atypicalDayPct: 5,
      seed: 20260904,
    },
    gridAssessment: { ...DEFAULT_GRID_ASSESSMENT_THRESHOLDS },
    sweep: {
      // Fine steps for villas, coarser for commercial systems.
      capacitiesKWh: [0, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 300, 400, 500],
      powersKw: [2, 3, 5, 7.5, 10, 15],
    },
  };
}
