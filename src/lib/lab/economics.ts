import { monthlyPeaksKw } from "./peakBenefit";
import { expandPriceSeries } from "./profiles";
import type {
  BatteryParams,
  DemandChargeConfig,
  EconomicsConfig,
  FlexConfig,
  SpotPriceInput,
} from "./types";

/**
 * Demand-charge analysis. Pure ECONOMIC post-processing: it reads the simulated import
 * series and never influences the physical dispatch.
 *
 * MODEL RULE (single source of truth): the billing peak is the HIGHEST measured import
 * kW of the month — the same definition the customer economy uses (`peakBenefit.ts`).
 * The legacy "mean of the N highest hours inside active hours" variant is gone; two
 * parallel definitions of the same economic concept are not allowed.
 */
export function demandCharge(
  importSeries: number[],
  cfg: DemandChargeConfig,
): { annualKr: number; monthlyBillingKw: number[] } {
  const monthlyBillingKw = monthlyPeaksKw(importSeries).map((kw, mi) =>
    cfg.activeMonths.includes(mi + 1) ? kw : 0,
  );
  const annualKr = cfg.enabled
    ? monthlyBillingKw.reduce((a, b) => a + b, 0) * cfg.krPerKw
    : 0;
  return { annualKr, monthlyBillingKw };
}

export function energyCostKr(
  importSeries: number[],
  exportSeries: number[],
  econ: EconomicsConfig,
  spot: SpotPriceInput,
): number {
  const prices = econ.useSpotForEnergy && spot.enabled ? expandPriceSeries(spot.series) : null;
  let cost = 0;
  for (let h = 0; h < importSeries.length; h++) {
    const imp = importSeries[h] ?? 0;
    const exp = exportSeries[h] ?? 0;
    if (prices) {
      const p = prices[h] ?? 0;
      cost += imp * (p + spot.importMarkup) - exp * p * spot.exportShare;
    } else {
      cost += imp * econ.buyPriceKrPerKWh - exp * econ.sellPriceKrPerKWh;
    }
  }
  return cost;
}

export function flexRevenueKr(
  flex: FlexConfig,
  feasible: boolean,
  availabilityPct: number,
): number {
  if (!flex.enabled || !feasible) return 0;
  const met = availabilityPct >= flex.availabilityPct ? 1 : availabilityPct / 100;
  const gross = flex.reservedPowerKw * flex.paymentKrPerKwYear * met;
  return gross * (1 - flex.revenueSharePct / 100);
}

export function capexKr(
  econ: EconomicsConfig,
  capacityKWh: number,
  powerKw: number,
): number {
  if (capacityKWh <= 0) return 0;
  return (
    capacityKWh * econ.batteryPriceKrPerKWh +
    powerKw * econ.batteryPriceKrPerKw +
    econ.installationCostKr +
    econ.fixedCostKr
  );
}

/** Capacity retention after `year` years, from calendar + cycle degradation. */
export function retention(
  battery: BatteryParams,
  cyclesPerYear: number,
  year: number,
): number {
  const cal = battery.calendarDegradationPctPerYear / 100;
  const cyc = (battery.cycleDegradationPctPerCycle / 100) * cyclesPerYear;
  return Math.max(0, 1 - (cal + cyc) * year);
}

/**
 * NPV of annual savings, scaled by remaining capacity each year (savings are
 * assumed proportional to usable capacity — an explicit approximation).
 */
export function npvKr(
  annualSavingsKr: number,
  econ: EconomicsConfig,
  battery: BatteryParams,
  cyclesPerYear: number,
  capex: number,
): number {
  const r = econ.discountRatePct / 100;
  let npv = -capex;
  for (let y = 1; y <= econ.years; y++) {
    const scale = retention(battery, cyclesPerYear, y - 1);
    npv += (annualSavingsKr * scale) / Math.pow(1 + r, y);
  }
  return npv;
}

export function paybackYears(annualSavingsKr: number, capex: number): number | null {
  if (capex <= 0) return 0;
  if (annualSavingsKr <= 0) return null;
  return capex / annualSavingsKr;
}
