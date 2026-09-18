/**
 * ANCILLARY POWER POTENTIAL — INFORMATION ONLY, NEVER A SIZING RULE.
 *
 * The recommended system power is decided elsewhere (`economicPowerSizing`): the smallest
 * real product step that reaches 95 % of the saturated PHYSICAL benefit, with ancillary
 * services switched off. Ancillary revenue may never raise that power.
 *
 * This module answers a SEPARATE question, and only when ancillary services are selected:
 *
 *   If the customer installed a HIGHER real product step (up to the nominal main-fuse
 *   product guardrail and the largest purchasable step), how much additional calculated
 *   annual benefit would the SAME engine report?
 *
 * Every step is a complete 8760 run through the existing engine: same dispatch, same SOC
 * model, same FCR reservation sweep (the engine itself picks the offered reserve), same
 * economy. Nothing here selects a power, no CAPEX, no C-rate rule, no marginal threshold.
 */

import {
  annualCustomerBenefitSek,
  customerAncillaryShareOf,
  SWEDISH_OPERATING_ECONOMY,
} from "./operatingEconomy";
import type { OperatingEconomyConfig } from "./operatingEconomy";
import {
  fuseProductGuardrailKw,
  gridAllowedProductStepKw,
  maxProductStepKw,
  simulateAtPower,
} from "./economicPowerSizing";
import type { PowerCandidateRun } from "./economicPowerSizing";
import { buildSeries } from "./simulate";
import type { LabConfig, TimeSeries } from "./types";

export interface AncillaryPowerPotentialStep {
  installedPowerKw: number;
  systemCRate: number;
  offeredPowerKw: number;
  avgHeldUpKw: number;
  avgHeldDownKw: number | null;
  reservablePowerAvgKw: number;
  ancillaryCustomerBenefitPerYear: number;
  energyBenefitPerYear: number;
  peakBenefitPerYear: number | null;
  totalCustomerBenefitPerYear: number;
  /** Difference in total customer benefit against the base (95 %) power. */
  incrementalAnnualBenefitVsBase: number;
  /** Difference in the ancillary part only, against the base power. */
  incrementalAncillaryBenefitVsBase: number;
}

export interface AncillaryPowerPotential {
  capacityKWh: number;
  /** The 95 % base power for energy handling — the analysis starts here. */
  basePowerKw: number;
  /** Nominal main-fuse product guardrail, kW (no operational margin). */
  fuseGuardrailKw: number;
  /** Largest real product step at or below the guardrail, kW. */
  fuseGuardrailStepKw: number;
  /** Highest power actually analysed, kW = min(guardrail step, largest product step). */
  maxAnalysedPowerKw: number;
  steps: AncillaryPowerPotentialStep[];
}

export interface AncillaryPowerPotentialInput {
  cfg: LabConfig;
  series?: TimeSeries;
  capacityKWh: number;
  /** 95 % base power for energy handling, kW. */
  basePowerKw: number;
  econ?: OperatingEconomyConfig;
  optimiseFcrReservation?: boolean;
  runCache?: Map<number, PowerCandidateRun>;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Real product steps from the base power up to the fuse guardrail / product cap. */
export function ancillaryPotentialStepsKw(
  productStepsKw: number[],
  basePowerKw: number,
  ceilingKw: number,
): number[] {
  const steps = [...new Set(productStepsKw.filter((s) => s > 0))].sort((a, b) => a - b);
  if (steps.length === 0 || !(basePowerKw > 0)) return [];
  const cap = Math.min(
    Number.isFinite(ceilingKw) && ceilingKw > 0 ? ceilingKw : Infinity,
    steps[steps.length - 1]!,
  );
  if (basePowerKw > cap + 1e-9) return [round2(basePowerKw)];
  const out = new Set<number>([round2(basePowerKw)]);
  for (const step of steps) if (step > basePowerKw + 1e-9 && step <= cap + 1e-9) out.add(step);
  return [...out].sort((a, b) => a - b);
}

/**
 * Potential analysis. Returns null when ancillary services are not selected — there is
 * then no ancillary potential to report.
 */
export function computeAncillaryPowerPotential(
  input: AncillaryPowerPotentialInput,
): AncillaryPowerPotential | null {
  const {
    cfg,
    capacityKWh,
    basePowerKw,
    econ = SWEDISH_OPERATING_ECONOMY,
    optimiseFcrReservation = false,
  } = input;
  if (!cfg.strategies.ancillaryServices) return null;
  if (!(capacityKWh > 0) || !(basePowerKw > 0)) return null;

  const series = input.series ?? buildSeries(cfg);
  const guardrailKw = fuseProductGuardrailKw(cfg.grid);
  const guardrailStepKw = gridAllowedProductStepKw(cfg.powerSizing.productStepsKw, guardrailKw);
  const maxAnalysedPowerKw = Math.min(
    guardrailStepKw,
    maxProductStepKw(cfg.powerSizing.productStepsKw),
  );
  const powersKw = ancillaryPotentialStepsKw(
    cfg.powerSizing.productStepsKw,
    basePowerKw,
    maxAnalysedPowerKw,
  );
  if (powersKw.length === 0) return null;

  const share = customerAncillaryShareOf(econ);
  const cache = input.runCache;

  const raw = powersKw.map((powerKw) => {
    const cached = cache?.get(powerKw);
    const run =
      cached ?? simulateAtPower(cfg, series, capacityKWh, powerKw, econ, optimiseFcrReservation);
    if (cache && !cached) cache.set(powerKw, run);
    const e = run.economy;
    const a = run.result.ancillary;
    const energyBenefitPerYear = e.energy.energyBenefitSek;
    const peakBenefitPerYear = e.peak.annualPeakBenefitSek;
    const grossSek = e.fcr.grossSek;
    return {
      installedPowerKw: powerKw,
      systemCRate: powerKw / capacityKWh,
      offeredPowerKw: a.reservedPowerUpKw,
      avgHeldUpKw: a.avgReservedPowerUpKw,
      avgHeldDownKw: e.fcr.avgHeldDownPowerKw ?? null,
      reservablePowerAvgKw: a.reservablePowerAvgKw,
      ancillaryCustomerBenefitPerYear: round2((grossSek ?? 0) * share),
      energyBenefitPerYear: round2(energyBenefitPerYear),
      peakBenefitPerYear: peakBenefitPerYear === null ? null : round2(peakBenefitPerYear),
      totalCustomerBenefitPerYear: annualCustomerBenefitSek(
        energyBenefitPerYear,
        peakBenefitPerYear,
        grossSek,
        econ,
      ),
    };
  });

  const base = raw[0]!;
  const steps: AncillaryPowerPotentialStep[] = raw.map((s) => ({
    ...s,
    incrementalAnnualBenefitVsBase: round2(
      s.totalCustomerBenefitPerYear - base.totalCustomerBenefitPerYear,
    ),
    incrementalAncillaryBenefitVsBase: round2(
      s.ancillaryCustomerBenefitPerYear - base.ancillaryCustomerBenefitPerYear,
    ),
  }));

  return {
    capacityKWh,
    basePowerKw,
    fuseGuardrailKw: guardrailKw,
    fuseGuardrailStepKw: guardrailStepKw,
    maxAnalysedPowerKw,
    steps,
  };
}
