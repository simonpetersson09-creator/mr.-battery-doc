/**
 * Battery Engine — operating economy layer (annual, no capex).
 *
 * STRICT SEPARATION: this module is pure post-processing on top of the verified
 * physics. It reads simulated energy/power flows and never influences dispatch,
 * SOC, efficiencies, grid limits, sizing or the FCR-D up reservation.
 *
 * Flow: inputs -> physical simulation -> energy/power flows -> economy (here).
 *
 * Every SEK figure below is traceable to one of:
 *   - a change in grid IMPORT between baseline and battery case
 *   - a change in grid EXPORT between baseline and battery case
 *   - a monthly import PEAK reduction (kW), valued per kW/month
 *   - FCR-D up power the battery ACTUALLY held (kW per hour)
 *
 * Battery losses, grid charging and increased self-consumption are all already
 * embedded in the import/export deltas, so they are never priced separately.
 * Doing so would be double counting.
 */

import { MONTH_NAMES } from "./defaults";
import {
  annualPeakBenefitSek as annualPeakBenefitFromReductionSek,
  monthlyPeakBenefitSek,
  monthlyPeakReductionKw,
  peakTariffIsValued,
} from "./peakBenefit";
import { buildSeries, simulate } from "./simulate";
import type { LabConfig, SimResult } from "./types";

export type PeakTariffSource = "default-estimate" | "user-provided";

export interface OperatingEconomyConfig {
  /** Total variable cost of one extra purchased kWh, SEK/kWh (simplified model). */
  importEnergyPriceSekPerKWh: number;
  /** Value of one kWh that would otherwise have been exported, SEK/kWh. */
  exportEnergyValueSekPerKWh: number;
  /**
   * Demand charge, SEK/kW/month. Defaults to a Swedish RULE-OF-THUMB (schablon), not a
   * verified national tariff. Fully editable. Null => no monetary value for the power
   * reduction, but the physical kW change is still reported.
   */
  peakDemandChargeSekPerKwMonth: number | null;
  /**
   * Where the tariff value came from. "default-estimate" = Swedish schablon supplied by
   * this engine; "user-provided" = the user entered their own grid tariff.
   */
  peakTariffSource: PeakTariffSource;
  /** Currency assumption, not part of Svenska kraftnät's FCR data. */
  eurSekRate: number;
  /**
   * MODEL RULE (choice objective only): the share 0–1 of the ancillary MARKET value the
   * customer actually receives. It is used ONLY when the engine compares competing
   * dispatch/power alternatives for the SAME battery, so a marginally better raw FCR
   * result can never be chosen over an alternative with higher TOTAL customer benefit.
   * Every reported figure still shows the full market value; nothing is rescaled.
   * Undefined = the default share below.
   */
  customerAncillaryShare?: number;
}

/**
 * Share of the ancillary market value that reaches the customer, used in the SELECTION
 * objective only. Mirrors the presentation-layer default (75 %).
 */
export const DEFAULT_ENGINE_CUSTOMER_ANCILLARY_SHARE = 0.75;

/** Clamped customer share of an economy config. */
export function customerAncillaryShareOf(econ: OperatingEconomyConfig): number {
  const v = econ.customerAncillaryShare;
  if (typeof v !== "number" || !Number.isFinite(v)) return DEFAULT_ENGINE_CUSTOMER_ANCILLARY_SHARE;
  return Math.min(1, Math.max(0, v));
}

/**
 * THE DECISION OBJECTIVE for competing alternatives of the same battery:
 *
 *   annualCustomerBenefit = energyBenefit + peakBenefit + ancillaryCustomerValue
 *
 * Reported totals keep using the full market value; only the CHOICE uses this.
 */
export function annualCustomerBenefitSek(
  energyBenefitSek: number,
  peakBenefitSek: number | null,
  ancillaryMarketValueSek: number | null,
  econ: OperatingEconomyConfig,
): number {
  const share = customerAncillaryShareOf(econ);
  return round2(
    energyBenefitSek + (peakBenefitSek ?? 0) + (ancillaryMarketValueSek ?? 0) * share,
  );
}

/**
 * Swedish schablon for the demand charge, SEK/kW/month. An ANNUALISED calculation
 * placeholder (30 x 12 = 360 SEK/kW/year) used when the customer has not supplied their
 * own tariff. It is NOT the actual or average Swedish demand charge, and a user value
 * always takes precedence. 0 is valid and means no demand charge is priced.
 */
export const SWEDISH_DEFAULT_PEAK_TARIFF_SEK_PER_KW_MONTH = 30;

/** Swedish defaults for this version. Simplified, explicit, replaceable. */
export const SWEDISH_OPERATING_ECONOMY: OperatingEconomyConfig = {
  importEnergyPriceSekPerKWh: 1.5,
  exportEnergyValueSekPerKWh: 0.6,
  peakDemandChargeSekPerKwMonth: SWEDISH_DEFAULT_PEAK_TARIFF_SEK_PER_KW_MONTH,
  peakTariffSource: "default-estimate",
  eurSekRate: 11.3,
  customerAncillaryShare: DEFAULT_ENGINE_CUSTOMER_ANCILLARY_SHARE,
};


export const PEAK_TARIFF_ESTIMATE_TEXT =
  "Schablonvärde för Sverige – justera efter ditt nätavtal.";

export const PEAK_TARIFF_USER_TEXT = "Effektavgift enligt ditt nätavtal.";

export const MISSING_PEAK_TARIFF_TEXT =
  "Minskad effektkostnad kan inte beräknas – effektavgift saknas";

/**
 * Numerical tolerance for interpreting a power-peak difference, kW. Differences below
 * this are reported as "no measurable change" instead of a signed number.
 */
export const PEAK_KW_TOLERANCE = 0.001;

export const FCR_HISTORICAL_DISCLAIMER =
  "Historiskt scenario baserat på FCR-D upp-priser 2025. Inte en prognos eller garanterad framtida intäkt.";


export interface EnergyEconomy {
  baselineImportKWh: number;
  batteryImportKWh: number;
  baselineExportKWh: number;
  batteryExportKWh: number;
  /** Positive = battery reduced import. */
  avoidedImportKWh: number;
  /** Positive = battery gave up export (opportunity cost side). */
  lostExportKWh: number;
  importCostBaselineSek: number;
  importCostBatterySek: number;
  exportRevenueBaselineSek: number;
  exportRevenueBatterySek: number;
  /** -import*price + export*value, baseline case. */
  energyValueBaselineSek: number;
  /** -import*price + export*value, battery case. */
  energyValueBatterySek: number;
  /** battery - baseline. The ONE additive energy item. */
  energyBenefitSek: number;
  // ---- diagnostics: already inside the delta above, never added again ----
  avoidedImportValueSek: number;
  lostExportValueSek: number;
  batteryLossesKWh: number;
  gridChargedKWh: number;
  gridChargedToLoadKWh: number;
  curtailmentRecoveredKWh: number;
  baselineCurtailedKWh: number;
  batteryCurtailedKWh: number;
}

export interface PeakEconomy {
  baselineMonthlyPeakKw: number[];
  batteryMonthlyPeakKw: number[];
  monthlyReductionKw: number[];
  /** Annual import peak, kW. */
  baselinePeakKw: number;
  batteryPeakKw: number;
  peakReductionKw: number;
  /**
   * Signed annual peak change, kW. Positive = peak went DOWN, negative = peak went UP.
   * Purely result semantics: the numbers come straight from the physics.
   */
  peakChangeKw: number;
  peakDirection: "reduced" | "increased" | "unchanged";
  /** Ready-to-show sentence for the annual peak change. */
  peakChangeText: string;
  tariffSekPerKwMonth: number | null;
  tariffSource: PeakTariffSource;
  /** Short note telling the user whether the tariff is a schablon or their own. */
  tariffNote: string | null;
  monthlyBenefitSek: number[] | null;
  annualPeakBenefitSek: number | null;
  status: "valued" | "missing-tariff";
  message: string | null;
}


export interface FcrEconomy {
  enabled: boolean;
  offeredPowerKw: number;
  avgHeldPowerKw: number;
  reservedEnergyKWh: number;
  reservedHours: number;
  availabilityPct: number;
  referenceYear: number | null;
  grossEur: number | null;
  grossSek: number | null;
  monthlyGrossSek: number[] | null;
  eurSekRate: number | null;
  /** Other battery benefit lost because FCR reserves power/energy. Diagnostic. */
  opportunityCostSek: number | null;
  /** gross - opportunity cost. Diagnostic, never added to the total. */
  incrementalNetSek: number | null;
  otherBenefitWithoutFcrSek: number | null;
  otherBenefitWithFcrSek: number | null;
  disclaimer: string;
  revenueMessage: string | null;
}

export interface OperatingEconomyResult {
  config: OperatingEconomyConfig;
  energy: EnergyEconomy;
  peak: PeakEconomy;
  fcr: FcrEconomy;
  /** Items that ARE summed. Each krona appears in exactly one of them. */
  additive: { key: string; label: string; sek: number }[];
  /** Items shown for understanding only. NEVER summed. */
  diagnostic: { key: string; label: string; sek: number | null }[];
  /** Null only if nothing can be summed safely. */
  totalSek: number | null;
  /** True when a real item exists but has no price basis, so the total is incomplete. */
  totalIsIncomplete: boolean;
  notes: string[];
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Energy + peak benefit of one simulated case. Used both directly and for the FCR delta. */
export function otherBenefitSek(r: SimResult, econ: OperatingEconomyConfig): number {
  const energy = energyEconomy(r, econ);
  const peak = peakEconomy(r, econ);
  return energy.energyBenefitSek + (peak.annualPeakBenefitSek ?? 0);
}

export function energyEconomy(r: SimResult, econ: OperatingEconomyConfig): EnergyEconomy {
  const p = econ.importEnergyPriceSekPerKWh;
  const s = econ.exportEnergyValueSekPerKWh;
  const importCostBaselineSek = r.baseImportKWh * p;
  const importCostBatterySek = r.importKWh * p;
  const exportRevenueBaselineSek = r.baseExportKWh * s;
  const exportRevenueBatterySek = r.exportKWh * s;
  const energyValueBaselineSek = -importCostBaselineSek + exportRevenueBaselineSek;
  const energyValueBatterySek = -importCostBatterySek + exportRevenueBatterySek;
  const avoidedImportKWh = r.baseImportKWh - r.importKWh;
  const lostExportKWh = r.baseExportKWh - r.exportKWh;
  return {
    baselineImportKWh: r.baseImportKWh,
    batteryImportKWh: r.importKWh,
    baselineExportKWh: r.baseExportKWh,
    batteryExportKWh: r.exportKWh,
    avoidedImportKWh,
    lostExportKWh,
    importCostBaselineSek,
    importCostBatterySek,
    exportRevenueBaselineSek,
    exportRevenueBatterySek,
    energyValueBaselineSek,
    energyValueBatterySek,
    energyBenefitSek: energyValueBatterySek - energyValueBaselineSek,
    avoidedImportValueSek: avoidedImportKWh * p,
    lostExportValueSek: lostExportKWh * s,
    batteryLossesKWh: r.lossesKWh,
    gridChargedKWh: r.chargedFromGridKWh,
    gridChargedToLoadKWh: r.gridChargedToLoadKWh,
    curtailmentRecoveredKWh: r.curtailmentRecoveredKWh,
    baselineCurtailedKWh: r.baseCurtailedKWh,
    batteryCurtailedKWh: r.baseCurtailedKWh - r.curtailmentRecoveredKWh,
  };
}

export function peakEconomy(r: SimResult, econ: OperatingEconomyConfig): PeakEconomy {
  const base = r.baseMonthlyPeakKw;
  const bat = r.monthlyPeakKw;
  /**
   * SIGNED per month: positive = the battery lowered that month's billing peak, negative
   * = it RAISED it. The negative months are kept, because a raised peak is a real extra
   * cost under the same tariff. Clamping them to 0 would hand out credit for reductions
   * while hiding the increases. Each month enters the annual sum exactly once, and the
   * demand charge is the only place a kW quantity is priced.
   */
  const monthlyReductionKw = monthlyPeakReductionKw(base, bat);
  const tariff = econ.peakDemandChargeSekPerKwMonth;
  const valued = peakTariffIsValued(tariff);
  const monthlyBenefitSek = monthlyPeakBenefitSek(monthlyReductionKw, tariff);
  // Result semantics only: the sign comes from the simulated peaks, nothing is clamped.
  const peakChangeKw = r.baseModelledPeakKw - r.modelledPeakKw;
  const peakDirection =
    Math.abs(peakChangeKw) < PEAK_KW_TOLERANCE
      ? "unchanged"
      : peakChangeKw > 0
        ? "reduced"
        : "increased";
  const peakChangeText =
    peakDirection === "unchanged"
      ? "Ingen mätbar förändring av effekttoppen"
      : peakDirection === "reduced"
        ? `Effekttoppen minskade med ${peakChangeKw.toFixed(2)} kW`
        : `Effekttoppen ökade med ${Math.abs(peakChangeKw).toFixed(2)} kW`;
  return {
    baselineMonthlyPeakKw: base,
    batteryMonthlyPeakKw: bat,
    monthlyReductionKw,
    baselinePeakKw: r.baseModelledPeakKw,
    batteryPeakKw: r.modelledPeakKw,
    peakReductionKw: r.peakReductionKw,
    peakChangeKw,
    peakDirection,
    peakChangeText,
    tariffSekPerKwMonth: tariff,
    tariffSource: econ.peakTariffSource,
    tariffNote: valued
      ? econ.peakTariffSource === "user-provided"
        ? PEAK_TARIFF_USER_TEXT
        : PEAK_TARIFF_ESTIMATE_TEXT
      : null,
    monthlyBenefitSek,
    annualPeakBenefitSek: annualPeakBenefitFromReductionSek(monthlyReductionKw, tariff),
    status: valued ? "valued" : "missing-tariff",
    message: valued ? null : MISSING_PEAK_TARIFF_TEXT,
  };
}


export interface FcrEconomyInput {
  /** Energy+peak benefit of the SAME battery with FCR-D up switched off. */
  otherBenefitWithoutFcrSek: number | null;
  otherBenefitWithFcrSek: number | null;
}

export function fcrEconomy(
  r: SimResult,
  input: FcrEconomyInput,
): FcrEconomy {
  const a = r.ancillary;
  const f = a.fcr;
  const enabled = a.enabled;
  const without = input.otherBenefitWithoutFcrSek;
  const withFcr = input.otherBenefitWithFcrSek;
  const opportunityCostSek =
    enabled && without !== null && withFcr !== null ? without - withFcr : null;
  const grossSek = enabled ? (f?.annualGrossSek ?? null) : null;
  return {
    enabled,
    offeredPowerKw: a.reservedPowerUpKw,
    avgHeldPowerKw: a.avgReservedPowerUpKw,
    reservedEnergyKWh: a.reservedEnergyUpKWh,
    reservedHours: a.reservedHours,
    availabilityPct: a.availabilityPct,
    referenceYear: enabled ? (f?.referenceYear ?? null) : null,
    grossEur: enabled ? (f?.annualGrossEur ?? null) : null,
    grossSek,
    monthlyGrossSek: enabled ? (f?.monthlyGrossSek ?? null) : null,
    eurSekRate: enabled ? (f?.eurSekRate ?? null) : null,
    opportunityCostSek,
    incrementalNetSek:
      grossSek !== null && opportunityCostSek !== null ? grossSek - opportunityCostSek : null,
    otherBenefitWithoutFcrSek: without,
    otherBenefitWithFcrSek: withFcr,
    disclaimer: FCR_HISTORICAL_DISCLAIMER,
    revenueMessage: enabled && grossSek === null ? a.revenueMessage : null,
  };
}

/**
 * Assembles the operating economy for one already-simulated case.
 *
 * `fcrInput` carries the Scenario A / Scenario B comparison. It must come from two
 * simulations with identical inputs where only `strategies.ancillaryServices` differs.
 */
export function composeOperatingEconomy(
  r: SimResult,
  econ: OperatingEconomyConfig,
  fcrInput: FcrEconomyInput = { otherBenefitWithoutFcrSek: null, otherBenefitWithFcrSek: null },
): OperatingEconomyResult {
  const energy = energyEconomy(r, econ);
  const peak = peakEconomy(r, econ);
  const fcr = fcrEconomy(r, fcrInput);
  const notes: string[] = [];

  /**
   * ---- ADDITIVE SET ----
   * 1. energyBenefitSek  : the whole import/export delta of THIS case. When FCR is on,
   *                        the delta already contains FCR's cost in lost self-consumption,
   *                        so the FCR opportunity cost must NOT be subtracted again.
   * 2. peak benefit      : priced in SEK/kW/month, a POWER quantity — disjoint from energy.
   * 3. FCR gross revenue : payment for reserved AVAILABILITY, not for energy flow.
   */
  const additive: { key: string; label: string; sek: number }[] = [
    { key: "energy", label: "Energinytta (minskat elköp − förlorad export)", sek: energy.energyBenefitSek },
  ];
  // "Minskad effektkostnad" is an ECONOMIC RESULT: the battery can lower the monthly
  // peak even with the peak-shaving dispatch strategy switched off, so the item is
  // never attributed to the strategy itself.
  if (peak.annualPeakBenefitSek !== null)
    additive.push({
      key: "peak",
      label: "Minskad effektkostnad (månadsvis effekttopp)",
      sek: peak.annualPeakBenefitSek,
    });

  if (fcr.enabled && fcr.grossSek !== null)
    additive.push({ key: "fcrGross", label: "FCR-D upp bruttointäkt (historiskt 2025)", sek: fcr.grossSek });

  const diagnostic: { key: string; label: string; sek: number | null }[] = [
    { key: "avoidedImport", label: "Värde av minskat elköp (ingår i energinyttan)", sek: energy.avoidedImportValueSek },
    { key: "lostExport", label: "Värde av förlorad export (ingår i energinyttan)", sek: -energy.lostExportValueSek },
    { key: "fcrOpportunity", label: "FCR-D upp alternativkostnad (ingår redan i energinyttan)", sek: fcr.opportunityCostSek === null ? null : -fcr.opportunityCostSek },
    { key: "fcrIncremental", label: "FCR-D upp inkrementell nettoeffekt", sek: fcr.incrementalNetSek },
  ];

  const totalIsIncomplete =
    (peak.status === "missing-tariff" && peak.peakReductionKw > 0.001) ||
    (fcr.enabled && fcr.grossSek === null);
  if (peak.status === "missing-tariff" && peak.peakReductionKw > 0.001)
    notes.push(`${peak.peakChangeText}, men saknar prissättning: ${MISSING_PEAK_TARIFF_TEXT}.`);

  if (fcr.enabled && fcr.grossSek === null && fcr.revenueMessage)
    notes.push(fcr.revenueMessage);
  if (fcr.enabled && fcr.opportunityCostSek === null)
    notes.push(
      "FCR-D upp alternativkostnad kräver en jämförelsekörning med stödtjänsten avstängd.",
    );
  notes.push(
    "Alternativkostnaden för FCR-D upp är diagnostik: den ligger redan i energinyttans baslinje-/resultatdifferens och får inte dras av igen.",
  );

  return {
    config: econ,
    energy,
    peak,
    fcr,
    additive,
    diagnostic,
    totalSek: round2(additive.reduce((a, b) => a + b.sek, 0)),
    totalIsIncomplete,
    notes,
  };
}

/**
 * Full evaluation: simulates the configured case and, when FCR-D up is active, the
 * identical case with FCR off, so the opportunity cost is a measured difference and
 * not an assumption. The physics is untouched in both runs.
 */
export function evaluateOperatingEconomy(
  cfg: LabConfig,
  capacityKWh: number,
  powerKw: number,
  econ: OperatingEconomyConfig = SWEDISH_OPERATING_ECONOMY,
  series = buildSeries(cfg),
): { result: SimResult; economy: OperatingEconomyResult; withoutFcr: SimResult | null } {
  const result = simulate(cfg, series, capacityKWh, powerKw);
  let withoutFcr: SimResult | null = null;
  let fcrInput: FcrEconomyInput = {
    otherBenefitWithoutFcrSek: null,
    otherBenefitWithFcrSek: null,
  };
  if (result.ancillary.enabled) {
    const cfgOff: LabConfig = {
      ...cfg,
      strategies: { ...cfg.strategies, ancillaryServices: false },
    };
    withoutFcr = simulate(cfgOff, series, capacityKWh, powerKw);
    fcrInput = {
      otherBenefitWithoutFcrSek: otherBenefitSek(withoutFcr, econ),
      otherBenefitWithFcrSek: otherBenefitSek(result, econ),
    };
  }
  return { result, economy: composeOperatingEconomy(result, econ, fcrInput), withoutFcr };
}

/* ==========================================================================
 * FCR-D UP RESERVATION OPTIMISATION (economic layer only)
 *
 * The user should never have to guess how many kW to offer. We run a small sweep of
 * candidate reservations through the SAME verified reservation/dispatch engine and pick
 * the level with the highest TOTAL operating benefit:
 *
 *   totalOperatingBenefit = energyBenefit + peakBenefit + fcrGrossRevenue
 *
 * The FCR opportunity cost is deliberately NOT subtracted: it is already visible as a
 * lower energy/peak benefit in each candidate. Subtracting it too would double count.
 * The opportunity cost stays as diagnostics per candidate.
 *
 * 0 % is ALWAYS a candidate, so an unprofitable service is never forced on the user.
 * Physics, SOC, endurance, headroom, grid limits, pooling and the 200 kW cap are all
 * untouched — every candidate goes through the normal simulation.
 * ========================================================================== */

/**
 * Default candidate reservation levels, as a share of the offerable power.
 * 10 % resolution: the coarser 25 % grid provably missed better candidates
 * (reference case: 70 % beat 75 % by ~57 SEK/year). Objective, physics,
 * reservation logic, tie-break and prices are unchanged — only the search grid.
 */
export const FCR_SWEEP_FRACTIONS = [
  0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1,
] as const;

/**
 * Tie-break tolerance in SEK/year. Two candidates whose total operating benefit differs
 * by less than this are treated as economically equivalent, and the LOWER reservation
 * wins — it leaves more battery flexibility for the other uses. 25 kr/year is well below
 * the resolution of the underlying price and tariff assumptions.
 */
export const FCR_TIE_TOLERANCE_SEK = 25;

export const FCR_OPTIMUM_LABEL =
  "Historiskt optimal FCR-D upp-reservation med 2025 års priser";

export const FCR_NO_RESERVATION_TEXT =
  "Ingen FCR-D upp-reservation rekommenderas med aktuella antaganden.";

export interface FcrSweepCandidate {
  /** Share of offerable power, 0..1. */
  fraction: number;
  /** Nominally offered power, kW. */
  offeredPowerKw: number;
  /** Mean power the reservation engine ACTUALLY held, kW. Revenue basis. */
  avgHeldPowerKw: number;
  reservedHours: number;
  availabilityPct: number;
  energyBenefitSek: number;
  /** Null when no demand charge is available. */
  peakBenefitSek: number | null;
  fcrGrossSek: number | null;
  opportunityCostSek: number | null;
  incrementalNetSek: number | null;
  /** energy + peak + fcr gross. Reported total, NOT the choice objective. */
  totalOperatingBenefitSek: number;
  /**
   * energy + peak + ancillary CUSTOMER value. MODEL RULE: this is the objective the
   * reservation level is chosen on, so a marginally better FCR level can never win when
   * it wipes out the self-consumption/peak benefit.
   */
  annualCustomerBenefitSek: number;
  economy: OperatingEconomyResult;

}

export interface FcrOptimisationResult {
  label: string;
  candidates: FcrSweepCandidate[];
  /** Winning candidate. Always present; may be the 0 kW one. */
  best: FcrSweepCandidate;
  /** Convenience: recommended reservation, kW (0 = do not participate). */
  recommendedPowerKw: number;
  batteryPowerKw: number;
  /** Highest power that could be offered, kW (battery power, capped at 200 kW). */
  offerablePowerKw: number;
  tieToleranceSek: number;
  recommendationText: string;
  disclaimer: string;
  notes: string[];
}

/** Absolute engine cap on offered ancillary power, kW. Unchanged in this step. */
const MAX_OFFERED_POWER_KW = 200;

/**
 * Sweeps FCR-D up reservation levels for one battery and returns the economically best
 * one. Pure post-processing: it only re-runs the existing simulation with a different
 * offered power and never modifies the physics.
 */
export function optimizeFcrReservation(
  cfg: LabConfig,
  capacityKWh: number,
  powerKw: number,
  econ: OperatingEconomyConfig = SWEDISH_OPERATING_ECONOMY,
  fractions: readonly number[] = FCR_SWEEP_FRACTIONS,
  series = buildSeries(cfg),
): FcrOptimisationResult {
  const offerablePowerKw = Math.min(Math.max(0, powerKw), MAX_OFFERED_POWER_KW);
  const levels = Array.from(new Set([0, ...fractions.map((f) => Math.min(1, Math.max(0, f)))]))
    .sort((a, b) => a - b);

  // Reference case: identical inputs, FCR off. Used for every opportunity cost.
  const cfgOff: LabConfig = {
    ...cfg,
    strategies: { ...cfg.strategies, ancillaryServices: false },
    ancillary: { ...cfg.ancillary, enabled: false },
  };
  const resultOff = simulate(cfgOff, series, capacityKWh, powerKw);
  const benefitOff = otherBenefitSek(resultOff, econ);

  const candidates: FcrSweepCandidate[] = levels.map((fraction) => {
    const offeredPowerKw = round2(offerablePowerKw * fraction);
    if (fraction === 0 || offeredPowerKw <= 0) {
      const economy = composeOperatingEconomy(resultOff, econ);
      return {
        fraction: 0,
        offeredPowerKw: 0,
        avgHeldPowerKw: 0,
        reservedHours: 0,
        availabilityPct: 0,
        energyBenefitSek: economy.energy.energyBenefitSek,
        peakBenefitSek: economy.peak.annualPeakBenefitSek,
        fcrGrossSek: null,
        opportunityCostSek: null,
        incrementalNetSek: null,
        totalOperatingBenefitSek: round2(
          economy.energy.energyBenefitSek + (economy.peak.annualPeakBenefitSek ?? 0),
        ),
        annualCustomerBenefitSek: annualCustomerBenefitSek(
          economy.energy.energyBenefitSek,
          economy.peak.annualPeakBenefitSek,
          null,
          econ,
        ),
        economy,
      };
    }
    const cfgOn: LabConfig = {
      ...cfg,
      strategies: { ...cfg.strategies, ancillaryServices: true },
      ancillary: { ...cfg.ancillary, enabled: true, offeredPowerKw },
    };
    const r = simulate(cfgOn, series, capacityKWh, powerKw);
    const economy = composeOperatingEconomy(r, econ, {
      otherBenefitWithoutFcrSek: benefitOff,
      otherBenefitWithFcrSek: otherBenefitSek(r, econ),
    });
    const gross = economy.fcr.grossSek;
    return {
      fraction,
      offeredPowerKw,
      avgHeldPowerKw: economy.fcr.avgHeldPowerKw,
      reservedHours: economy.fcr.reservedHours,
      availabilityPct: economy.fcr.availabilityPct,
      energyBenefitSek: economy.energy.energyBenefitSek,
      peakBenefitSek: economy.peak.annualPeakBenefitSek,
      fcrGrossSek: gross,
      opportunityCostSek: economy.fcr.opportunityCostSek,
      incrementalNetSek: economy.fcr.incrementalNetSek,
      totalOperatingBenefitSek: round2(
        economy.energy.energyBenefitSek +
          (economy.peak.annualPeakBenefitSek ?? 0) +
          (gross ?? 0),
      ),
      annualCustomerBenefitSek: annualCustomerBenefitSek(
        economy.energy.energyBenefitSek,
        economy.peak.annualPeakBenefitSek,
        gross,
        econ,
      ),
      economy,
    };
  });

  /**
   * MODEL RULE: the winner is the highest TOTAL CUSTOMER BENEFIT
   * (energy + peak + ancillary customer value), never the highest raw FCR gross.
   * On a practical tie, the LOWEST reservation wins.
   */
  const bestTotal = Math.max(...candidates.map((c) => c.annualCustomerBenefitSek));
  const best =
    candidates.find((c) => c.annualCustomerBenefitSek >= bestTotal - FCR_TIE_TOLERANCE_SEK) ??
    candidates[0]!;


  const notes: string[] = [
    `Optimeringsmål: total kundnytta = energinytta + minskad effektkostnad + kundens andel (${Math.round(customerAncillaryShareOf(econ) * 100)} %) av FCR-värdet. Alternativkostnaden dras inte av separat — den syns redan som lägre energi-/effektnytta.`,
    `Tie-break: skillnader under ${FCR_TIE_TOLERANCE_SEK} kr/år räknas som likvärdiga och då väljs den LÄGRE reservationen.`,
    "0 % ingår alltid som kandidat, så en olönsam stödtjänst rekommenderas aldrig.",
    "Intäkten baseras endast på effekt som reservationsmotorn faktiskt kunde hålla, aldrig på nominellt erbjuden effekt.",
  ];
  if (candidates.some((c) => c.fcrGrossSek === null && c.offeredPowerKw > 0))
    notes.push("En eller flera kandidater saknar prisunderlag och räknas då utan FCR-intäkt.");

  return {
    label: FCR_OPTIMUM_LABEL,
    candidates,
    best,
    recommendedPowerKw: best.offeredPowerKw,
    batteryPowerKw: powerKw,
    offerablePowerKw,
    tieToleranceSek: FCR_TIE_TOLERANCE_SEK,
    recommendationText:
      best.offeredPowerKw <= 0
        ? FCR_NO_RESERVATION_TEXT
        : `Bäst av de prövade nivåerna under dessa antaganden: ${best.offeredPowerKw.toFixed(2)} kW av batteriets ${powerKw.toFixed(2)} kW effekt (2025 års FCR-D upp-priser). Inte en generell rekommendation.`,
    disclaimer: FCR_HISTORICAL_DISCLAIMER,
    notes,
  };
}

/** Customer-facing summary for Mr. Battery Doc. No capex, ROI or payback here. */
export interface CustomerEconomySummary {
  energySavingSek: number;
  energyExplanation: string;
  peakReductionKw: number;
  peakChangeKw: number;
  peakDirection: "reduced" | "increased" | "unchanged";
  peakChangeText: string;
  peakSavingSek: number | null;
  peakLabel: string;
  peakTariffSekPerKwMonth: number | null;
  peakTariffNote: string | null;
  peakMessage: string | null;

  fcrEnabled: boolean;
  fcrGrossSek: number | null;
  fcrOpportunityCostSek: number | null;
  fcrNetSek: number | null;
  fcrLabel: string;
  totalSek: number | null;
  totalIsIncomplete: boolean;
  monthlyPeakRows: { month: string; baselineKw: number; batteryKw: number; reductionKw: number }[];
}

export function customerSummary(e: OperatingEconomyResult): CustomerEconomySummary {
  return {
    energySavingSek: round2(e.energy.energyBenefitSek),
    energyExplanation:
      "Värdet av minskat elköp minus värdet av solel som annars hade kunnat säljas.",
    peakReductionKw: e.peak.peakReductionKw,
    peakChangeKw: e.peak.peakChangeKw,
    peakDirection: e.peak.peakDirection,
    peakChangeText: e.peak.peakChangeText,
    peakSavingSek: e.peak.annualPeakBenefitSek,
    peakLabel: "Minskad effektkostnad",
    peakTariffSekPerKwMonth: e.peak.tariffSekPerKwMonth,
    peakTariffNote: e.peak.tariffNote,
    peakMessage: e.peak.message,

    fcrEnabled: e.fcr.enabled,
    fcrGrossSek: e.fcr.grossSek,
    fcrOpportunityCostSek: e.fcr.opportunityCostSek,
    fcrNetSek: e.fcr.incrementalNetSek,
    fcrLabel: FCR_HISTORICAL_DISCLAIMER,
    totalSek: e.totalSek,
    totalIsIncomplete: e.totalIsIncomplete,
    monthlyPeakRows: e.peak.baselineMonthlyPeakKw.map((b, i) => ({
      month: MONTH_NAMES[i] ?? String(i + 1),
      baselineKw: b,
      batteryKw: e.peak.batteryMonthlyPeakKw[i] ?? 0,
      reductionKw: e.peak.monthlyReductionKw[i] ?? 0,
    })),
  };
}
