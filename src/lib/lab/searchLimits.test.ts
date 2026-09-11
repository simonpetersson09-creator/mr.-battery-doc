/**
 * SEARCH-LIMIT CLASSIFICATION.
 *
 * These tests only assert how the engine CLASSIFIES a result that sits on the analysed
 * capacity/power boundary. No sizing rule, limit value or economic figure is asserted or
 * changed here beyond the recommendation staying exactly what the engine already returns.
 */
import { describe, expect, it } from "vitest";
import { runBatteryEngine } from "@/lib/battery-engine/run";
import type { BatteryEngineInput } from "@/lib/battery-engine/types";

const PV_SHAPE = [101, 302, 806, 1410, 1813, 2216, 2317, 2014, 1612, 906, 403, 100];
const LOAD_SHAPE = [2264, 1887, 1698, 1509, 1321, 1226, 1132, 1226, 1415, 1698, 2075, 2549];
const scale = (a: number[], target: number) => {
  const s = a.reduce((x, y) => x + y, 0);
  return a.map((v) => (v / s) * target);
};

function build(consumption: number, pv: number, fuse: number): BatteryEngineInput {
  return {
    site: { country: "SE", mainFuseA: fuse },
    consumption: {
      monthlyKWh: scale(LOAD_SHAPE, consumption),
      annualKWh: consumption,
      profile: "normal",
    },
    production: {
      enabled: true,
      monthlyKWh: scale(PV_SHAPE, pv),
      annualKWh: pv,
      kWp: pv / 950,
      inverterAcKw: pv / 1150,
    },
    strategies: {
      selfConsumption: true,
      reduceImport: true,
      peakShaving: true,
      fcrDUp: true,
      optimiseFcrReservation: true,
    },
    economy: {
      importEnergyPriceSekPerKWh: 1.5,
      exportEnergyValueSekPerKWh: 0.6,
      peakDemandChargeSekPerKwMonth: 30,
      peakTariffSource: "user-provided",
      eurSekRate: 11.3,
      customerAncillaryShare: 0.75,
    },
  };
}

describe("upper search-limit classification", () => {
  it("does not flag a normal villa", () => {
    const r = runBatteryEngine(build(10000, 8000, 20)).summary.recommendation;
    expect(r.upperLimitReached).toBe(false);
    expect(r.powerUpperLimitReached).toBe(false);
  });

  it("does not flag a large villa", () => {
    const r = runBatteryEngine(build(20000, 14000, 25)).summary.recommendation;
    expect(r.upperLimitReached).toBe(false);
    expect(r.powerUpperLimitReached).toBe(false);
  });

  it("does not flag a commercial case well inside the analysed range", () => {
    const r = runBatteryEngine(build(250000, 150000, 200)).summary.recommendation;
    expect(r.capacityKWh).toBeLessThan(500);
    expect(r.recommendedPowerKw).toBeLessThan(200);
    expect(r.upperLimitReached).toBe(false);
    expect(r.powerUpperLimitReached).toBe(false);
  });

  it("flags both limits for a case beyond the analysed range", () => {
    const r = runBatteryEngine(build(1500000, 1000000, 630)).summary.recommendation;
    expect(r.capacityKWh).toBe(500);
    expect(r.recommendedPowerKw).toBe(200);
    expect(r.upperLimitReached).toBe(true);
    expect(r.powerUpperLimitReached).toBe(true);
  });
});
