/**
 * MAIN-FUSE PRODUCT GUARDRAIL FOR RECOMMENDED PRODUCT POWER (solar flow).
 *
 * The recommended installed battery power may never exceed the NOMINAL main-fuse capacity
 * (`computeFuseKw`), rounded down to a real product step. This is a product guardrail, not
 * a physics limit: a larger battery is not impossible behind the meter, it is simply not
 * recommended.
 *
 * Deliberately NOT part of the guardrail:
 *   - the 95 % operational margin (dispatch-only design margin)
 *   - the separate operational `maxImportKw` / `maxExportKw` limits (dispatch-only)
 *
 * Physics, dispatch, capacity sizing, the 0.5 C candidate rule and the pure-FCR flow are
 * untouched; only which product steps may be RECOMMENDED is limited.
 */

import { describe, expect, it } from "vitest";
import { toLabConfig } from "../battery-engine/input";
import { runBatteryEngine, runBatterySimulation } from "../battery-engine/run";
import type { BatteryEngineInput } from "../battery-engine/types";
import { computeGridLimits } from "./dispatch";
import {
  buildPowerCandidates,
  fuseProductGuardrailKw,
  gridAllowedProductStepKw,
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

function solarInput(
  mainFuseA: number,
  annualKWh = 60000,
  site: Partial<NonNullable<BatteryEngineInput["site"]>> = {},
): BatteryEngineInput {
  const scale = annualKWh / 20000;
  return {
    site: { country: "SE", mainFuseA, phases: 3, voltageV: 400, ...site },
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

function nominalFuseKw(input: BatteryEngineInput): number {
  return fuseProductGuardrailKw(toLabConfig(input).grid);
}

/* ---------------- 1 + 8. fuse ladder, unit level ---------------- */

describe("nominal main fuse caps recommendable product power", () => {
  const FUSES = [16, 20, 25, 35, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400];

  it("never allows a product step above the nominal fuse power", () => {
    for (const fuse of FUSES) {
      const limit = nominalFuseKw(solarInput(fuse));
      const allowed = gridAllowedProductStepKw(STEPS, limit);
      expect(allowed).toBeLessThanOrEqual(limit + 1e-9);
      expect(allowed).toBeLessThanOrEqual(200);
      const candidates = buildPowerCandidates(500, 5, STEPS, 0.5, limit);
      expect(Math.max(...candidates)).toBeLessThanOrEqual(limit + 1e-9);
      expect(Math.max(...candidates)).toBeLessThanOrEqual(200);
    }
  });

  it.each([
    [16, 10],
    [25, 15],
    [35, 20],
    [50, 30],
    [63, 40],
  ])("fuse %i A allows at most %i kW", (fuse, step) => {
    expect(gridAllowedProductStepKw(STEPS, nominalFuseKw(solarInput(fuse)))).toBe(step);
  });

  it("uses the nominal fuse power, not the 95 % operational limit", () => {
    const input = solarInput(25);
    const limits = computeGridLimits(toLabConfig(input).grid);
    expect(nominalFuseKw(input)).toBeCloseTo(limits.fuseKw, 6);
    expect(nominalFuseKw(input)).toBeGreaterThan(limits.maxImportKw);
  });

  it("keeps 200 kW reachable on a large connection", () => {
    const limit = nominalFuseKw(solarInput(400));
    expect(limit).toBeGreaterThan(200);
    expect(gridAllowedProductStepKw(STEPS, limit)).toBe(200);
    expect(Math.max(...buildPowerCandidates(500, 5, STEPS, 0.5, limit))).toBe(200);
    expect(defaultConfig().sweetSpot.maxNormalCapacityKWh).toBe(500);
  });

  /* ---------------- 4. physical need above the guardrail ---------------- */
  it("does not reintroduce a candidate above the guardrail via the physical-need floor", () => {
    const limit = nominalFuseKw(solarInput(16)); // ~11.09 kW
    const candidates = buildPowerCandidates(40, 20, STEPS, 0.5, limit);
    expect(candidates.length).toBeGreaterThan(0);
    expect(Math.max(...candidates)).toBe(10);
  });

  /* ---------------- 5. no effect when 0.5 C binds first ---------------- */
  it("is identical to the unconstrained candidates when 0.5 C binds first", () => {
    for (const fuse of [63, 100]) {
      const limit = nominalFuseKw(solarInput(fuse));
      expect(buildPowerCandidates(40, 5, STEPS, 0.5, limit)).toEqual(
        buildPowerCandidates(40, 5, STEPS, 0.5),
      );
    }
  });
});

/* ---------------- 3. separate operational limits must NOT shrink the guardrail ---------------- */

describe("separate operational import/export limits do not cap recommended power", () => {
  it("a 3 kW export limit keeps the 25 A guardrail at 15 kW", () => {
    const withExportLimit = solarInput(25, 60000, { maxExportKw: 3 });
    expect(nominalFuseKw(withExportLimit)).toBeCloseTo(nominalFuseKw(solarInput(25)), 9);
    expect(gridAllowedProductStepKw(STEPS, nominalFuseKw(withExportLimit))).toBe(15);
  });

  it("a low import limit keeps the guardrail unchanged", () => {
    const withImportLimit = solarInput(63, 60000, { maxImportKw: 4 });
    expect(nominalFuseKw(withImportLimit)).toBeCloseTo(nominalFuseKw(solarInput(63)), 9);
    expect(gridAllowedProductStepKw(STEPS, nominalFuseKw(withImportLimit))).toBe(40);
  });

  it("dispatch still respects the low export and import limits", () => {
    const input = solarInput(63, 60000, { maxExportKw: 3, maxImportKw: 20 });
    const limits = computeGridLimits(toLabConfig(input).grid);
    const sim = runBatterySimulation(input, 40, 10);
    expect(sim.grid.maxActualExportKw).toBeLessThanOrEqual(limits.maxExportKw + 1e-9);
    expect(sim.grid.maxActualImportKw).toBeLessThanOrEqual(limits.maxImportKw + 1e-9);
  });
});

/* ---------------- 7 + 10. full engine reference cases ---------------- */

describe("solar flow recommendation respects the fuse guardrail", () => {
  it.each([16, 25, 63])("fuse %i A", (fuse) => {
    const input = solarInput(fuse);
    const limit = nominalFuseKw(input);
    const rec = runBatteryEngine(input).summary.recommendation;
    expect(rec.powerKw).toBeLessThanOrEqual(limit + 1e-9);
    // The guardrail itself always lands on a real product step.
    expect(STEPS).toContain(gridAllowedProductStepKw(STEPS, limit));
    expect(rec.powerKw).toBeLessThanOrEqual(200);
    expect(rec.capacityKWh).toBeLessThanOrEqual(500);
  });

  it("16 A can no longer recommend 20 kW", () => {
    const rec = runBatteryEngine(solarInput(16)).summary.recommendation;
    expect(rec.powerKw).toBeLessThanOrEqual(10);
  });

  it("a separate 3 kW export limit no longer forces 2 kW", () => {
    const rec = runBatteryEngine(
      solarInput(63, 60000, { maxExportKw: 3 }),
    ).summary.recommendation;
    expect(rec.powerKw).toBeGreaterThan(2);
  });
});
