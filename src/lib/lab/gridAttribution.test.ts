import { describe, expect, it } from "vitest";

import { runBatteryEngine } from "../battery-engine";
import type { BatteryEngineInput } from "../battery-engine/types";
import { FCR_SWEEP_FRACTIONS, optimizeFcrReservation } from "./operatingEconomy";
import { toLabConfig } from "../battery-engine/input";

/**
 * ENGINE CORRECTION AUDIT — regression locks.
 *
 * A. Peak-shaving headroom is never booked as a grid limitation.
 * B. A real fuse limitation is still detected.
 * C. A much bigger connection removes the real limitation.
 * D/E. Customer-facing grid diagnostics come from the FINAL simulation, not the sweep.
 * F. The 10 % FCR grid can find candidates the 25 % grid missed.
 * G. Ties still pick the lower reservation.
 * H. FCR-off cases are untouched by the sweep resolution.
 * J. The energy balance stays exact.
 */

const REFERENCE: BatteryEngineInput = {
  consumption: { annualKWh: 20000, profile: "normal" },
  production: { annualKWh: 14000, kWp: 14, inverterAcKw: 12 },
  strategies: { peakShaving: true, fcrDUp: true, optimiseFcrReservation: true },
};

const withFuse = (input: BatteryEngineInput, mainFuseA: number): BatteryEngineInput => ({
  ...input,
  site: { ...(input.site ?? {}), mainFuseA },
});

describe("grid limitation attribution", () => {
  it("A: peak-shaving headroom is not booked as a grid limitation", () => {
    const r = runBatteryEngine(REFERENCE);
    const sim = r.diagnostics.simulation;
    // Peak shaving does cap grid charging in this case...
    expect(sim.grid.peakThresholdLimitedKWh).toBeGreaterThan(0);
    // ...but the connection is not the binding cause, so it is not called limited.
    expect(sim.grid.importLimitedKWh).toBeLessThan(1);
    expect(r.summary.grid.status).not.toBe("battery-limited");
    expect(r.summary.grid.status).not.toBe("combined");
  });

  it("B: a genuinely small fuse is still reported as limiting", () => {
    const r = runBatteryEngine({
      consumption: { annualKWh: 25000, profile: "normal" },
      production: { enabled: false },
      site: { mainFuseA: 16, maxImportKw: 4 },
    });
    expect(r.summary.grid.unservedLoadKWh).toBeGreaterThan(100);
    expect(["battery-limited", "combined"]).toContain(r.summary.grid.status);
  });

  it("C: a much bigger connection removes the real limitation", () => {
    const small = runBatteryEngine({
      consumption: { annualKWh: 25000, profile: "normal" },
      production: { enabled: false },
      site: { mainFuseA: 16, maxImportKw: 4 },
    });
    const big = runBatteryEngine({
      consumption: { annualKWh: 25000, profile: "normal" },
      production: { enabled: false },
      site: { mainFuseA: 200 },
    });
    expect(small.summary.grid.unservedLoadKWh).toBeGreaterThan(
      big.summary.grid.unservedLoadKWh,
    );
    expect(big.summary.grid.status).toBe("none");
  });

  it("C2: if a bigger fuse changes nothing, the connection is not called limiting", () => {
    const base = runBatteryEngine(REFERENCE);
    const big = runBatteryEngine(withFuse(REFERENCE, 200));
    expect(big.summary.recommendation.capacityKWh).toBe(
      base.summary.recommendation.capacityKWh,
    );
    expect(big.summary.recommendation.powerKw).toBe(base.summary.recommendation.powerKw);
    expect(big.summary.economy.totalOperatingBenefitSek ?? 0).toBeCloseTo(
      base.summary.economy.totalOperatingBenefitSek ?? 0,
      2,
    );
    expect(base.summary.grid.status).not.toBe("battery-limited");
    expect(base.summary.grid.status).not.toBe("combined");
  });

  it("D/E: customer grid diagnostics come from the final simulation, not the sizing sweep", () => {
    const r = runBatteryEngine(REFERENCE);
    const final = r.diagnostics.simulation;
    const ga = r.diagnostics.gridAssessment;
    expect(ga.importBoundHours).toBe(final.grid.importBoundHours);
    expect(ga.exportBoundHours).toBe(final.grid.exportBoundHours);
    expect(ga.exportCurtailedKWh).toBeCloseTo(final.grid.exportCurtailedKWh, 6);
    expect(ga.unservedKWh).toBeCloseTo(final.gridUnservedKWh, 6);
    expect(ga.recommendedCapacityKWh).toBe(r.summary.recommendation.capacityKWh);
    expect(ga.recommendedPowerKw).toBe(r.summary.recommendation.powerKw);
    // The sizing sweep keeps its own assessment run; it must not be the customer source.
    expect(r.diagnostics.sweep.gridAssessment).not.toBe(ga);
  });

  it("J: the energy balance is exact after the corrections", () => {
    for (const input of [REFERENCE, withFuse(REFERENCE, 63), withFuse(REFERENCE, 200)]) {
      const r = runBatteryEngine(input);
      expect(r.summary.energyBalance.ok).toBe(true);
      expect(Math.abs(r.summary.energyBalance.residualKWh)).toBeLessThan(1e-6);
    }
  });
});

describe("FCR reservation search resolution", () => {
  it("F: the 10 % grid never scores worse than the old 25 % grid", () => {
    const cfg = toLabConfig(REFERENCE);
    const coarse = optimizeFcrReservation(cfg, 25, 5, undefined, [0, 0.25, 0.5, 0.75, 1]);
    const fine = optimizeFcrReservation(cfg, 25, 5);
    expect(FCR_SWEEP_FRACTIONS).toHaveLength(11);
    expect(fine.best.totalOperatingBenefitSek).toBeGreaterThanOrEqual(
      coarse.best.totalOperatingBenefitSek - 1e-6,
    );
  });

  it("G: on a practical tie the LOWER reservation still wins", () => {
    const cfg = toLabConfig(REFERENCE);
    const o = optimizeFcrReservation(cfg, 25, 5);
    const bestTotal = Math.max(...o.candidates.map((c) => c.totalOperatingBenefitSek));
    const firstWithinTolerance = o.candidates.find(
      (c) => c.totalOperatingBenefitSek >= bestTotal - o.tieToleranceSek,
    );
    expect(o.best.offeredPowerKw).toBe(firstWithinTolerance!.offeredPowerKw);
  });

  it("H: an FCR-off case is unaffected by the sweep resolution", () => {
    const off = runBatteryEngine({
      consumption: { annualKWh: 20000, profile: "normal" },
      production: { annualKWh: 14000, kWp: 14, inverterAcKw: 12 },
      strategies: { peakShaving: true },
    });
    expect(off.summary.fcr.enabled).toBe(false);
    expect(off.summary.fcr.optimisedPowerKw).toBeNull();
    expect(off.summary.energyBalance.ok).toBe(true);
  });
});
