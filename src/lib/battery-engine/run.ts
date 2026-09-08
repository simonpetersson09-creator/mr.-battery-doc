/**
 * BATTERY ENGINE — orchestration.
 *
 * This file only ORCHESTRATES the already verified engine:
 *   input -> config -> 8760 series -> sizing sweep -> simulation -> economy
 *
 * It contains no physics, no sizing rules and no economic formulas. Every number comes
 * from the existing modules (dispatch, simulate, sweep, powerSizing, gridAssessment,
 * operatingEconomy, ancillary). The economy never feeds back into the physics.
 */

import {
  composeOperatingEconomy,
  evaluateOperatingEconomy,
  optimizeFcrReservation,
  otherBenefitSek,
} from "../lab/operatingEconomy";
import type { FcrOptimisationResult, OperatingEconomyResult } from "../lab/operatingEconomy";
import { assessGrid } from "../lab/gridAssessment";
import { simulate } from "../lab/simulate";
import { runSweep } from "../lab/sweep";
import type { SweepResult } from "../lab/sweep";
import type { LabConfig, SimResult } from "../lab/types";
import { toEconomyConfig, toLabConfig, toTimeSeries } from "./input";
import type {
  BatteryEngineInput,
  BatteryEngineResult,
  BatteryEngineSummary,
} from "./types";
import { BATTERY_ENGINE_VERSION } from "./version";

/** Runs the capacity/power sweep and returns the raw internal sweep result. */
export function runBatterySweep(input: BatteryEngineInput = {}): SweepResult {
  const cfg = toLabConfig(input);
  return runSweep(cfg, toTimeSeries(cfg, input));
}

/** Recommended capacity/power for an input, without the economy layer. */
export function recommendBattery(input: BatteryEngineInput = {}): {
  capacityKWh: number;
  powerKw: number;
  sweep: SweepResult;
} {
  const sweep = runBatterySweep(input);
  return {
    capacityKWh: sweep.recommended.capacityKWh,
    powerKw: sweep.recommended.powerKw,
    sweep,
  };
}

/** One 8760 simulation of an explicit capacity/power combination. */
export function runBatterySimulation(
  input: BatteryEngineInput,
  capacityKWh: number,
  powerKw: number,
): SimResult {
  const cfg = toLabConfig(input);
  return simulate(cfg, toTimeSeries(cfg, input), capacityKWh, powerKw);
}

/**
 * Full engine run: sizing + simulation + operating economy (+ optional FCR-D up
 * reservation optimisation). Returns a customer-facing `summary` and a complete
 * engineering `diagnostics` block.
 */
export function runBatteryEngine(input: BatteryEngineInput = {}): BatteryEngineResult {
  const cfg: LabConfig = toLabConfig(input);
  const econ = toEconomyConfig(input);
  const series = toTimeSeries(cfg, input);

  const fixedCapacity = input.battery?.fixedCapacityKWh;
  const fixedPower = input.battery?.fixedPowerKw;
  const sizingWasFixed = fixedCapacity !== undefined && fixedPower !== undefined;

  const sweep = runSweep(cfg, series);
  const capacityKWh = fixedCapacity ?? sweep.recommended.capacityKWh;
  const powerKw = fixedPower ?? sweep.recommended.powerKw;

  // Optional FCR reservation sweep. Every candidate runs through the normal simulation.
  let fcrOptimisation: FcrOptimisationResult | null = null;
  let runCfg = cfg;
  if (cfg.strategies.ancillaryServices && input.strategies?.optimiseFcrReservation) {
    fcrOptimisation = optimizeFcrReservation(cfg, capacityKWh, powerKw, econ, undefined, series);
    runCfg = {
      ...cfg,
      strategies: {
        ...cfg.strategies,
        ancillaryServices: fcrOptimisation.recommendedPowerKw > 0,
      },
      ancillary: {
        ...cfg.ancillary,
        enabled: fcrOptimisation.recommendedPowerKw > 0,
        offeredPowerKw: fcrOptimisation.recommendedPowerKw,
      },
    };
  }

  const { result, economy, withoutFcr } = evaluateOperatingEconomy(
    runCfg,
    capacityKWh,
    powerKw,
    econ,
    series,
  );

  let economyWithoutFcr: OperatingEconomyResult | null = null;
  if (withoutFcr)
    economyWithoutFcr = composeOperatingEconomy(withoutFcr, econ, {
      otherBenefitWithoutFcrSek: otherBenefitSek(withoutFcr, econ),
      otherBenefitWithFcrSek: otherBenefitSek(result, econ),
    });

  /**
   * SOURCE OF TRUTH: every customer-facing diagnostic describes the FINAL recommended
   * system (final capacity, power, strategies, FCR reservation and dispatch). The sizing
   * sweep's own assessment run may differ and is kept only under sizing diagnostics.
   */
  const gridAssessment = assessGrid(result, sweep.baseline, cfg.gridAssessment);

  const a = result.ancillary;
  const peak = economy.peak;
  const summary: BatteryEngineSummary = {
    recommendation: {
      capacityKWh,
      powerKw,
      physicalPowerNeedKw: sweep.powerSizing.physicalNeedKw,
      reasonableRangeKWh: sweep.sweetSpot.reasonableRangeKWh,
      diminishingFromKWh: sweep.sweetSpot.diminishingFromKWh,
      upperLimitReached: sweep.sweetSpot.upperLimitReached,
      explanation: sweep.sweetSpot.explanation,
      powerExplanation: sweep.powerSizing.explanation,
      utilisationWarning: sweep.sweetSpot.utilisationWarning,
      sizingWasFixed,
    },
    energy: {
      annualLoadKWh: result.annualLoadKWh,
      annualPvKWh: result.annualPvKWh,
      importBeforeKWh: result.baseImportKWh,
      importAfterKWh: result.importKWh,
      exportBeforeKWh: result.baseExportKWh,
      exportAfterKWh: result.exportKWh,
      selfConsumptionBeforePct: result.baseSelfConsumptionPct,
      selfConsumptionAfterPct: result.selfConsumptionPct,
      selfSufficiencyBeforePct: result.baseSelfSufficiencyPct,
      selfSufficiencyAfterPct: result.selfSufficiencyPct,
      shiftedSolarKWh: result.shiftedSolarKWh,
      shiftedToLoadKWh: result.shiftedKWh,
      recoveredCurtailmentKWh: result.recoveredCurtailmentKWh,
      gridChargedKWh: result.chargedFromGridKWh,
      batteryLossesKWh: result.lossesKWh,
      equivalentFullCycles: result.equivalentFullCycles,
      utilisationPct: result.utilisationPct,
      totalUsefulKWh: result.totalUsefulKWh,
    },
    grid: {
      physicalImportKw: result.grid.physicalImportKw,
      physicalExportKw: result.grid.physicalExportKw,
      operationalImportKw: result.grid.operationalImportKw,
      operationalExportKw: result.grid.operationalExportKw,
      importPeakBeforeKw: result.baseModelledPeakKw,
      importPeakAfterKw: result.modelledPeakKw,
      monthlyPeakBeforeKw: result.baseMonthlyPeakKw,
      monthlyPeakAfterKw: result.monthlyPeakKw,
      exportCurtailedKWh: result.grid.exportCurtailedKWh,
      unservedLoadKWh: result.gridUnservedKWh,
      unservedIsGridBound: result.unservedIsGridBound,
      status: gridAssessment.status,
      headline: gridAssessment.headline,
      detail: gridAssessment.detail,
      consequences: gridAssessment.consequences,
    },
    peak: {
      peakReductionKw: peak.peakReductionKw,
      peakChangeKw: peak.peakChangeKw,
      peakDirection: peak.peakDirection,
      peakChangeText: peak.peakChangeText,
      monthlyReductionKw: peak.monthlyReductionKw,
      tariffSekPerKwMonth: peak.tariffSekPerKwMonth,
      tariffSource: peak.tariffSource,
      tariffNote: peak.tariffNote,
      demandCostSavingSek: peak.annualPeakBenefitSek,
      message: peak.message,
    },
    fcr: {
      enabled: a.enabled,
      offeredPowerKw: a.reservedPowerUpKw,
      avgHeldPowerKw: a.avgReservedPowerUpKw,
      reservedEnergyKWh: a.reservedEnergyUpKWh,
      reservedHours: a.reservedHours,
      availabilityPct: a.availabilityPct,
      grossSek: economy.fcr.grossSek,
      opportunityCostSek: economy.fcr.opportunityCostSek,
      incrementalNetSek: economy.fcr.incrementalNetSek,
      historicalReferenceYear: a.fcr ? a.fcr.referenceYear : null,
      label: a.fcr ? a.fcr.label : null,
      disclaimer: economy.fcr.disclaimer,
      blockers: a.blockers,
      optimisedPowerKw: fcrOptimisation ? fcrOptimisation.recommendedPowerKw : null,
      optimisationText: fcrOptimisation ? fcrOptimisation.recommendationText : null,
    },
    economy: {
      energyBenefitSek: economy.energy.energyBenefitSek,
      demandCostSavingSek: peak.annualPeakBenefitSek,
      fcrGrossSek: economy.fcr.grossSek,
      totalOperatingBenefitSek: economy.totalSek,
      totalIsIncomplete: economy.totalIsIncomplete,
      assumptions: [
        `Importpris ${econ.importEnergyPriceSekPerKWh} kr/kWh och exportvärde ${econ.exportEnergyValueSekPerKWh} kr/kWh är ekonomiska antaganden.`,
        peak.tariffNote ??
          "Effektavgift saknas – ingen minskad effektkostnad prissätts, men kW-förändringen redovisas.",
        `Valutakurs ${econ.eurSekRate} SEK/EUR är ett antagande.`,
        economy.fcr.disclaimer,
      ],
      notes: economy.notes,
    },
    energyBalance: result.energyBalance,
  };

  return {
    engineVersion: BATTERY_ENGINE_VERSION,
    summary,
    diagnostics: {
      sweep,
      simulation: result,
      powerSizing: sweep.powerSizing,
      gridAssessment,
      operatingEconomy: economy,
      operatingEconomyWithoutFcr: economyWithoutFcr,
      fcrOptimisation,
      fcrRevenue: a.fcr,
      series,
      config: runCfg,
    },
  };
}
