/**
 * ANCILLARY POWER POTENTIAL — information-only analysis.
 *
 * These tests verify that the potential analysis exists when ancillary services are on,
 * that it respects the nominal main-fuse product guardrail, and above all that it NEVER
 * changes the recommendation (power, capacity or max investment).
 */

import { describe, expect, it } from "vitest";

import { ancillaryPotentialStepsKw } from "./ancillaryPowerPotential";
import { runBatteryEngine } from "@/lib/battery-engine";
import type { BatteryEngineInput } from "@/lib/battery-engine";

/** C032-like reference: large workshop load, 100 kWp PV, 100 A service. */
function c032(overrides: Partial<BatteryEngineInput> = {}): BatteryEngineInput {
  return {
    consumption: { annualKWh: 200_000, profile: "workshop" },
    production: { dcKWp: 100, acKw: 100 },
    grid: { mainFuseA: 100 },
    strategies: {
      fcrDUp: true,
      peakShaving: true,
      optimiseFcrReservation: true,
    },
    ...overrides,
  } as BatteryEngineInput;
}

const run = (input: BatteryEngineInput) => runBatteryEngine(input).summary;

describe("step ladder", () => {
  const steps = [3, 5, 7.5, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100];

  it("starts at the base power and stops at the ceiling", () => {
    expect(ancillaryPotentialStepsKw(steps, 15, 60)).toEqual([15, 20, 25, 30, 40, 50, 60]);
  });

  it("never returns a step above the ceiling", () => {
    expect(ancillaryPotentialStepsKw(steps, 3, 10).every((s) => s <= 10)).toBe(true);
  });

  it("returns just the base power when it already sits at the ceiling", () => {
    expect(ancillaryPotentialStepsKw(steps, 60, 60)).toEqual([60]);
  });
});

describe("engine wiring", () => {
  const withFcr = run(c032());

  it("ancillary services ON produces the potential analysis", () => {
    expect(withFcr.ancillaryPowerPotential).not.toBeNull();
    expect(withFcr.ancillaryPowerPotential!.steps.length).toBeGreaterThan(1);
  });

  it("the analysis starts at the 95 % base power for energy handling", () => {
    const p = withFcr.ancillaryPowerPotential!;
    expect(p.basePowerKw).toBe(withFcr.recommendation.basePowerForEnergyKw);
    expect(p.steps[0]!.installedPowerKw).toBeCloseTo(p.basePowerKw, 6);
    expect(p.steps[0]!.incrementalAnnualBenefitVsBase).toBe(0);
  });

  it("no step exceeds the nominal main-fuse product guardrail", () => {
    const p = withFcr.ancillaryPowerPotential!;
    expect(p.fuseGuardrailStepKw).toBeLessThanOrEqual(p.fuseGuardrailKw + 1e-9);
    for (const s of p.steps) expect(s.installedPowerKw).toBeLessThanOrEqual(p.maxAnalysedPowerKw);
  });

  it("every step reports its own simulated ancillary and total benefit", () => {
    for (const s of withFcr.ancillaryPowerPotential!.steps) {
      expect(s.systemCRate).toBeCloseTo(s.installedPowerKw / withFcr.recommendation.capacityKWh, 9);
      expect(Number.isFinite(s.totalCustomerBenefitPerYear)).toBe(true);
      expect(Number.isFinite(s.ancillaryCustomerBenefitPerYear)).toBe(true);
    }
  });

  it("ancillary services OFF produces no potential analysis", () => {
    const off = run(c032({ strategies: { fcrDUp: false, peakShaving: true } } as never));
    expect(off.ancillaryPowerPotential).toBeNull();
  });

  it("a 16 A service never shows potential above its own guardrail", () => {
    const small = run({
      consumption: { annualKWh: 15_000, profile: "normal" },
      production: { dcKWp: 10, acKw: 10 },
      grid: { mainFuseA: 16 },
      strategies: { fcrDUp: true, peakShaving: true, optimiseFcrReservation: true },
    } as BatteryEngineInput);
    const p = small.ancillaryPowerPotential;
    if (p) {
      expect(p.fuseGuardrailKw).toBeLessThan(12);
      for (const s of p.steps) expect(s.installedPowerKw).toBeLessThanOrEqual(p.fuseGuardrailKw);
    }
  });
});

describe("the analysis never changes the recommendation", () => {
  it("power, capacity and max investment are identical with and without the analysis", () => {
    const on = run(c032());
    const off = run(
      c032({
        strategies: {
          fcrDUp: true,
          peakShaving: true,
          optimiseFcrReservation: true,
          ancillaryPowerPotential: false,
        },
      } as BatteryEngineInput),
    );
    expect(off.ancillaryPowerPotential).toBeNull();
    expect(on.recommendation.powerKw).toBe(off.recommendation.powerKw);
    expect(on.recommendation.capacityKWh).toBe(off.recommendation.capacityKWh);
    expect(on.recommendation.basePowerForEnergyKw).toBe(off.recommendation.basePowerForEnergyKw);
    expect(on.economy.annualCustomerBenefitSek).toBe(off.economy.annualCustomerBenefitSek);
    expect(on.economy.totalOperatingBenefitSek).toBe(off.economy.totalOperatingBenefitSek);
  });

  it("the recommended power stays at the base power even when higher steps pay more", () => {
    const s = run(c032());
    const p = s.ancillaryPowerPotential!;
    const best = p.steps.reduce((a, b) =>
      b.totalCustomerBenefitPerYear > a.totalCustomerBenefitPerYear ? b : a,
    );
    expect(s.recommendation.powerKw).toBe(s.recommendation.basePowerForEnergyKw);
    expect(best.installedPowerKw).toBeGreaterThanOrEqual(s.recommendation.powerKw);
  });

  it("the legacy 99 % power need is not used as the customer's base power", () => {
    const s = run(c032());
    expect(s.recommendation.basePowerForEnergyKw).toBeLessThanOrEqual(
      s.recommendation.physicalPowerNeedKw + 1e-9,
    );
    expect(s.recommendation.powerKw).toBe(s.recommendation.basePowerForEnergyKw);
  });
});
