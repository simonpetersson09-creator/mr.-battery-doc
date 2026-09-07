import { MONTH_DAYS } from "./defaults";
import { expandPriceSeries } from "./profiles";
import type {
  BatteryParams,
  DemandChargeConfig,
  EconomicsConfig,
  FlexConfig,
  SpotPriceInput,
} from "./types";

/**
 * Demand-charge analysis. This is a pure ECONOMIC post-processing step: it reads
 * the simulated import series and never influences the physical dispatch.
 */
export function demandCharge(
  importSeries: number[],
  cfg: DemandChargeConfig,
): { annualKr: number; monthlyBillingKw: number[] } {
  const monthlyBillingKw: number[] = [];
  let cursor = 0;
  MONTH_DAYS.forEach((days, mi) => {
    const start = cursor;
    const end = cursor + days * 24;
    cursor = end;
    if (!cfg.activeMonths.includes(mi + 1)) {
      monthlyBillingKw.push(0);
      return;
    }
    const vals: number[] = [];
    for (let h = start; h < end; h++) {
      if (!cfg.activeHours.includes(h % 24)) continue;
      vals.push(importSeries[h] ?? 0);
    }
    vals.sort((a, b) => b - a);
    const n = Math.max(1, Math.floor(cfg.peaksPerMonth));
    const top = vals.slice(0, n);
    const billing =
      cfg.aggregation === "max"
        ? (top[0] ?? 0)
        : top.reduce((a, b) => a + b, 0) / Math.max(1, top.length);
    monthlyBillingKw.push(billing);
  });
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
