/**
 * FCR -> kWh endurance capacity: the HELD RESERVE PLATEAU rule.
 *
 * These tests assert the mechanism, never a hardcoded kWh table: every number below is
 * produced by the production engine's own 8760 dispatch, SOC, endurance, NEM and grid gates.
 */
import { describe, expect, it } from "vitest";

import { toLabConfig, toTimeSeries } from "../battery-engine/input";
import type { BatteryEngineInput } from "../battery-engine/types";
import { fcrEnduranceCapacity } from "./fcrEnduranceCapacity";

const LOAD = [2264, 1887, 1698, 1509, 1321, 1226, 1132, 1226, 1415, 1698, 2075, 2549];
const PV = [101, 302, 806, 1410, 1813, 2216, 2317, 2014, 1612, 906, 403, 100];
const CAPS = [0, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 300, 400, 500];

function setup(mainFuseA: number) {
  const input: BatteryEngineInput = {
    site: { country: "SE", mainFuseA, phases: 3, voltageV: 400 },
    consumption: { monthlyKWh: LOAD.map((m) => m * 3), annualKWh: 60000, profile: "normal" },
    production: {
      enabled: true,
      monthlyKWh: PV.map((v) => v * 2),
      annualKWh: 28000,
      kWp: 28,
      inverterAcKw: 24,
    },
    strategies: {
      selfConsumption: true,
      reduceImport: true,
      peakShaving: true,
      fcrDUp: true,
    },
    economy: {
      importEnergyPriceSekPerKWh: 1.5,
      exportEnergyValueSekPerKWh: 0.6,
      peakDemandChargeSekPerKwMonth: 30,
      peakTariffSource: "user-provided",
      eurSekRate: 11.3,
    },
  } as BatteryEngineInput;
  const cfg = toLabConfig(input);
  return { cfg, series: toTimeSeries(cfg, input) };
}

function run(powerKw: number, capacityKWh: number, mainFuseA = 160) {
  const { cfg, series } = setup(mainFuseA);
  return fcrEnduranceCapacity({ cfg, series, capacityKWh, powerKw, capacityStepsKWh: CAPS });
}

describe("fcrEnduranceCapacity — held reserve plateau", () => {
  it("runs the FULL capacity ladder before deciding, with no early stop", () => {
    const r = run(40, 5);
    expect(r.steps.at(-1)!.capacityKWh).toBe(500);
    // The held reserve is non-monotonic on the way up: a local decrease must not end the search.
    const held = r.steps.map((s) => s.heldPowerKw);
    expect(held.some((v, i) => i > 0 && v < held[i - 1]!)).toBe(true);
  });

  it("does not stop at the first capacity with energyLimitedHours === 0", () => {
    const r = run(10, 5);
    const firstZero = r.steps.find((s) => s.energyLimitedHours === 0)!;
    const chosen = r.steps.find((s) => s.capacityKWh === r.capacityKWh)!;
    expect(chosen.capacityKWh).toBeGreaterThanOrEqual(firstZero.capacityKWh);
    expect(chosen.heldPowerKw).toBeGreaterThan(firstZero.heldPowerKw - 1e-9);
  });

  it("40 kW does not stop at 25 kWh and reaches a strictly higher sustainable reserve", () => {
    const r = run(40, 25);
    expect(r.capacityKWh).toBeGreaterThan(25);
    const at25 = r.steps.find((s) => s.capacityKWh === 25)!;
    const chosen = r.steps.find((s) => s.capacityKWh === r.capacityKWh)!;
    expect(chosen.heldPowerKw).toBeGreaterThan(at25.heldPowerKw);
    expect(chosen.energyLimitedHours).toBe(0);
  });

  it("selects the SMALLEST capacity step that already reaches the plateau", () => {
    for (const powerKw of [5, 10, 20, 40]) {
      const r = run(powerKw, 5);
      const steps = r.steps;
      const chosenIndex = steps.findIndex((s) => s.capacityKWh === r.capacityKWh);
      const top = steps.at(-1)!;
      expect(steps[chosenIndex]!.heldPowerKw).toBeGreaterThan(top.heldPowerKw - 1e-9);
      for (const s of steps.slice(0, chosenIndex)) {
        expect(s.heldPowerKw < top.heldPowerKw - 1e-9 || s.heldDownPowerKw < top.heldDownPowerKw - 1e-9).toBe(true);
      }
    }
  });

  it("never lowers the capacity and never changes the power", () => {
    const r = run(10, 150);
    expect(r.capacityKWh).toBeGreaterThanOrEqual(150);
    expect(r.baseCapacityKWh).toBe(150);
  });

  it("keeps the capacity unchanged when the grid caps the reserve (flat plateau)", () => {
    const r = run(40, 20, 25); // 25 A main fuse: grid headroom binds long before energy does
    expect(r.raised).toBe(false);
    expect(r.capacityKWh).toBe(20);
  });

  it("is inactive when ancillary services are off", () => {
    const { cfg, series } = setup(160);
    const off = { ...cfg, strategies: { ...cfg.strategies, ancillaryServices: false } };
    const r = fcrEnduranceCapacity({
      cfg: off,
      series,
      capacityKWh: 20,
      powerKw: 10,
      capacityStepsKWh: CAPS,
    });
    expect(r.reason).toBe("not-applicable");
    expect(r.capacityKWh).toBe(20);
  });
});
