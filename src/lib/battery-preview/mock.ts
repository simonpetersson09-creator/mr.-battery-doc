/**
 * TEMPORARY placeholder data for the result view.
 * Contains no dimensioning rules and no battery physics — it only returns
 * fixed illustrative numbers so the UI skeleton can be reviewed.
 * Delete this file when the real engine is connected.
 */

import type { BatteryEngineInput, BatteryRecommendation } from "./types";

export function mockRecommendation(input: BatteryEngineInput): BatteryRecommendation {
  return {
    battery: { capacityKwh: 15, powerKw: 7.4, capacityRangeKwh: [10, 20] },
    energy: {
      selfConsumptionBefore: 34,
      selfConsumptionAfter: 68,
      selfSufficiencyBefore: 21,
      selfSufficiencyAfter: 43,
      gridImportBefore: 12000,
      gridImportAfter: 9200,
      gridExportBefore: 4200,
      gridExportAfter: 1900,
      shiftedEnergyKwh: 2300,
    },
    power: {
      peakBeforeKw: 12.4,
      peakAfterKw: 8.1,
      peakReductionKw: 4.3,
      peakReductionPct: 35,
    },
    economics: {
      savingReducedImport: 2600,
      valueIncreasedSelfConsumption: 2070,
      valuePeakShaving: input.economics.demandCharge > 0 ? 1900 : 0,
      totalAnnualBenefit: input.economics.demandCharge > 0 ? 6570 : 4670,
    },
    explanation: [
      "Storleken är vald så att batteriet räcker för kvällens förbrukning utan att stå oanvänt stora delar av året.",
      "Effekten är vald så att batteriet klarar fastighetens vanliga toppar.",
      "Ett större batteri skulle ge lite mer nytta, men nyttan per extra kWh minskar snabbt.",
    ],
    isMock: true,
  };
}
