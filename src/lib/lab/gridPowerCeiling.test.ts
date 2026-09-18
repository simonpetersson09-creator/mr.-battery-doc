/**
 * GRID CEILING FOR RECOMMENDED PRODUCT POWER (solar flow).
 *
 * The recommended installed battery power may never exceed the customer's existing
 * OPERATIONAL grid limit (the engine's own 95 % design margin on the fuse). Physics,
 * dispatch, capacity sizing, the 0.5 C candidate rule and the pure-FCR flow are untouched;
 * only which product steps may be RECOMMENDED is limited.
 */

import { describe, expect, it } from "vitest";
import { toLabConfig } from "../battery-engine/input";
import { runBatteryEngine } from "../battery-engine/run";
import type { BatteryEngineInput } from "../battery-engine/types";
import { computeGridLimits } from "./dispatch";
import {
  buildPowerCandidates,
  gridAllowedProductStepKw,
  gridPowerCeilingKw,
} from "./economicPowerSizing";
import { defaultConfig } from "./defaults";

const LOAD = [2264, 1887, 1698, 1509, 1321, 1226, 1132, 1226, 1415, 1698, 2075, 2549];
const PV = [101, 302, 806, 1410, 1813, 2216, 2317, 2014, 1612, 906, 403, 100];
const STEPS = defaultConfig().powerSizing.productStepsKw;

const ECON = {
  importEnergyPriceSekPerKWh: 1.5,
  exportEnergyValueSekPerKWh: 0.6,
  peakDemandChargeSekPerKwMonth: 30,
  peakTariffSource: "user-provided" as const,
  eurSekRate: 11.3,
};

function solarInput(mainFuseA: number, annualKWh = 60000): BatteryEngineInput {
  const scale = annualKWh / 20000;
  return {
    site: { country: "SE", mainFuseA, phases: 3, voltageV: 400 },
    consumption: {
      monthlyKWh: LOAD.map((m) => m * scale),
      annualKWh,
      profile: "normal",
    },
    production: { enabled: true, monthlyKWh: PV, annualKWh: 14000, kWp: 14, inverterAcKw: 12 },
    strategies: {
      selfConsumption: true,
      reduceImport: true,
      peakShaving: true,
      fcrDUp: true,
      optimiseFcrReservation: true,
    },
    economy: ECON,
  };
}

function operationalLimitKw(input: BatteryEngineInput): number {
  const limits = computeGridLimits(toLabConfig(input).grid);
  return Math.min(limits.maxImportKw, limits.maxExportKw);
}

/* ---------------- 6. fuse ladder, unit level ---------------- */

describe("operational grid limit caps recommendable product power", () => {
  const FUSES = [16, 20, 25, 35, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400];

  it("never allows a product step above the operational grid limit", () => {
    for (const fuse of FUSES) {
      const limit = operationalLimitKw(solarInput(fuse));
      const allowed = gridAllowedProductStepKw(STEPS, limit);
      expect(allowed).toBeLessThanOrEqual(limit + 1e-9);
      expect(allowed).toBeLessThanOrEqual(200);
      // Candidates at a very large capacity are clipped to the same ceiling.
      const candidates = buildPowerCandidates(500, 5, STEPS, 0.5, limit);
      expect(Math.max(...candidates)).toBeLessThanOrEqual(limit + 1e-9);
      expect(Math.max(...candidates)).toBeLessThanOrEqual(200);
    }
  });

  it("keeps 200 kW reachable on a large connection", () => {
    const limit = operationalLimitKw(solarInput(400));
    expect(limit).toBeGreaterThan(200);
    expect(gridAllowedProductStepKw(STEPS, limit)).toBe(200);
    expect(Math.max(...buildPowerCandidates(500, 5, STEPS, 0.5, limit))).toBe(200);
    expect(defaultConfig().sweetSpot.maxNormalCapacityKWh).toBe(500);
  });

  /* ---------------- 4. physical need above the grid limit ---------------- */
  it("does not reintroduce a candidate above the grid limit via the physical-need floor", () => {
    const limit = operationalLimitKw(solarInput(16)); // ~10.5 kW
    const candidates = buildPowerCandidates(40, 20, STEPS, 0.5, limit);
    expect(candidates.length).toBeGreaterThan(0);
    expect(Math.max(...candidates)).toBeLessThanOrEqual(limit + 1e-9);
    expect(Math.max(...candidates)).toBe(10);
  });

  /* ---------------- 8. no effect when 0.5 C binds first ---------------- */
  it("is identical to the unconstrained candidates when 0.5 C binds first", () => {
    for (const fuse of [63, 100]) {
      const limit = operationalLimitKw(solarInput(fuse));
      expect(buildPowerCandidates(40, 5, STEPS, 0.5, limit)).toEqual(
        buildPowerCandidates(40, 5, STEPS, 0.5),
      );
    }
  });
});

/* ---------------- 7. full engine reference cases ---------------- */

describe("solar flow recommendation respects the connection", () => {
  it.each([16, 25, 63])("fuse %i A", (fuse) => {
    const input = solarInput(fuse);
    const limit = operationalLimitKw(input);
    const rec = runBatteryEngine(input).summary.recommendation;
    expect(rec.powerKw).toBeLessThanOrEqual(limit + 1e-9);
    expect(rec.powerKw).toBeLessThanOrEqual(200);
    expect(rec.capacityKWh).toBeLessThanOrEqual(500);
  });

  it("16 A can no longer recommend 20 kW", () => {
    const rec = runBatteryEngine(solarInput(16)).summary.recommendation;
    expect(rec.powerKw).toBeLessThan(20);
  });

  it("25 A can no longer recommend 20 kW", () => {
    const rec = runBatteryEngine(solarInput(25)).summary.recommendation;
    expect(rec.powerKw).toBeLessThan(20);
  });
});
