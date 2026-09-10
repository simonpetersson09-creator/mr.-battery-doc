/**
 * MODEL CONSISTENCY REGRESSION SUITE.
 *
 * Locks in the two structural fixes:
 *
 *  1. CYCLIC YEAR — the annual result may not benefit from SOC_start != SOC_end. The
 *     start SOC is solved as a fixed point of the unchanged dispatch, so the year cannot
 *     deliver energy it never charged, and the configured initial SOC can no longer move
 *     the annual numbers.
 *  2. ONE DEMAND-CHARGE DEFINITION — sizing/sweep economics and the customer economy read
 *     the same peak benefit: Σ_m (baseline monthly peak kW − battery monthly peak kW) ×
 *     tariff, where the monthly peak is the highest measured import kW of the month.
 *
 * These tests must never be relaxed to make a future change "look right".
 */

import { describe, expect, it } from "vitest";

import { toEconomyConfig, toLabConfig, toTimeSeries } from "../battery-engine/input";
import { runBatteryEngine } from "../battery-engine/run";
import type { BatteryEngineInput } from "../battery-engine/types";
import { demandCharge } from "./economics";
import { peakEconomy } from "./operatingEconomy";
import {
  annualPeakBenefitSek,
  monthlyPeakReductionKw,
  monthlyPeaksKw,
} from "./peakBenefit";
import { simulate } from "./simulate";

const T = 120_000;

const monthsAll = () => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function prepare(input: BatteryEngineInput = {}) {
  const cfg = toLabConfig(input);
  return { cfg, econ: toEconomyConfig(input), series: toTimeSeries(cfg, input) };
}

describe("1 — cyclic year (SOC neutrality)", () => {
  it(
    "ends the year at the SOC it started at",
    () => {
      const { cfg, series } = prepare();
      const sim = simulate(cfg, series, 30, 15);
      expect(sim.socCycleConverged).toBe(true);
      expect(Math.abs(sim.socDeltaKWh)).toBeLessThanOrEqual(30 * 1e-4);
      expect(sim.energyBalance.ok).toBe(true);
    },
    T,
  );

  it(
    "gives the same annual result for every configured initial SOC",
    () => {
      const results = [5, 25, 50, 75, 95].map((initialSocPct) => {
        const { cfg, series, econ } = prepare({ battery: { initialSocPct } });
        const sim = simulate(cfg, series, 30, 15);
        return {
          discharged: sim.dischargedKWh,
          imported: sim.importKWh,
          peak: peakEconomy(sim, econ).annualPeakBenefitSek,
        };
      });
      for (const r of results) {
        expect(r.discharged).toBeCloseTo(results[0]!.discharged, 6);
        expect(r.imported).toBeCloseTo(results[0]!.imported, 6);
        expect(r.peak).toBeCloseTo(results[0]!.peak!, 6);
      }
    },
    T,
  );

  it(
    "no longer discharges free start energy: the non-cyclic year was more favourable",
    () => {
      const { cfg, series } = prepare();
      const before = simulate(cfg, series, 30, 15, { cyclicSoc: false });
      const after = simulate(cfg, series, 30, 15);
      expect(before.socDeltaKWh).toBeLessThan(0); // ended lower than it started
      expect(after.dischargedKWh).toBeLessThan(before.dischargedKWh);
      expect(after.importKWh).toBeGreaterThan(before.importKWh);
      expect(after.energyBalance.ok).toBe(true);
    },
    T,
  );
});

describe("2 — a single demand-charge definition", () => {
  it(
    "sizing economics and customer economy price the same kW",
    () => {
      const input: BatteryEngineInput = { strategies: { peakShaving: true } };
      const { cfg, econ, series } = prepare(input);
      const sim = simulate(cfg, series, 15, 3);
      const peak = peakEconomy(sim, econ);
      const reduction = monthlyPeakReductionKw(sim.baseMonthlyPeakKw, sim.monthlyPeakKw);
      expect(peak.annualPeakBenefitSek).toBeCloseTo(
        annualPeakBenefitSek(reduction, peak.tariffSekPerKwMonth)!,
        6,
      );

    },
    T,
  );

  it("demandCharge() bills the same kW the customer economy credits", () => {
    const cfg = toLabConfig({});
    const synthetic = new Array(8760).fill(2);
    synthetic[5] = 9; // January peak
    synthetic[8000] = 6; // December peak
    const billed = demandCharge(synthetic, {
      ...cfg.demandCharge,
      enabled: true,
      activeMonths: monthsAll(),
    }).monthlyBillingKw;
    expect(billed).toEqual(monthlyPeaksKw(synthetic));
  });

  it("bills the highest measured import kW of each month", () => {
    const series = new Array(8760).fill(1);
    series[10] = 7; // January
    const peaks = monthlyPeaksKw(series);
    expect(peaks[0]).toBe(7);
    expect(peaks[1]).toBe(1);
  });

  it(
    "prices no peak benefit when the tariff is zero",
    () => {
      const res = runBatteryEngine({
        strategies: { peakShaving: true },
        economy: { peakDemandChargeSekPerKwMonth: 0 },
      });
      expect(res.summary.peak.demandCostSavingSek).toBeNull();
      expect(res.summary.energy.gridChargedKWh).toBe(0);
    },
    T,
  );

  it(
    "still prices a peak benefit when the tariff is positive",
    () => {
      const res = runBatteryEngine({ strategies: { peakShaving: true } });
      expect(res.summary.peak.demandCostSavingSek).not.toBeNull();
      expect(res.summary.peak.tariffSekPerKwMonth).toBeGreaterThan(0);
    },
    T,
  );
});
