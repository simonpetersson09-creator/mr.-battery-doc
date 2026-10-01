/**
 * FCR candidate search is in absolute kW against the physical offer cap, so a larger
 * battery can always evaluate the levels a smaller one could. Reference: CH, 20 kWh,
 * 250 A, 10 000 kWh/yr solar — the old 10 %-of-battery-power grid chose 40 kW at 50 kW
 * and 30/25 kW at 60–150 kW while ~28 kW was ~80–320 CHF/yr better.
 */
import { describe, expect, it } from "vitest";
import { toEconomyConfig, toLabConfig, toTimeSeries } from "@/lib/battery-engine/input";
import { normalizeWizardToEngineInput } from "@/lib/battery-app/normalizeWizardToEngineInput";
import { createInitialState, type WizardState } from "@/state/wizard";
import { fcrTieToleranceLocal, optimizeFcrReservation } from "./operatingEconomy";

function setup(powerKw: number) {
  const s: WizardState = structuredClone(createInitialState("CH"));
  s.grid.gridValuesConfirmed = true;
  (s.grid as { mainFuseA: number }).mainFuseA = 250;
  s.consumption.annualKwh = 20000;
  s.consumption.profileId = "normal";
  s.production.mode = "manual";
  s.production.annualKwh = 10000;
  s.strategies.fcrDUp = true;
  s.preferences.customerAncillaryShare = 0.75;
  const base = normalizeWizardToEngineInput(s);
  const input = { ...base, battery: { fixedCapacityKWh: 20, fixedPowerKw: powerKw } };
  const cfg = toLabConfig(input);
  return { cfg, econ: toEconomyConfig(input), series: toTimeSeries(cfg, input) };
}

describe("FCR candidate resolution does not scale with battery power", () => {
  it("50/60/100/150 kW reach the same optimum within the 25 SEK tie tolerance", () => {
    const results = [50, 60, 100, 150].map((p) => {
      const { cfg, econ, series } = setup(p);
      return { o: optimizeFcrReservation(cfg, 20, p, econ, undefined, series), tol: fcrTieToleranceLocal(econ) };
    });
    const best = Math.max(...results.map((r) => r.o.best.annualCustomerBenefitSek));
    for (const { o, tol } of results) {
      expect(o.best.annualCustomerBenefitSek).toBeGreaterThanOrEqual(best - tol - 1e-6);
      expect(o.candidates[0]!.offeredPowerKw).toBe(0);
      // Resolution near the optimum is fine (≤ 0,5 kW between neighbours below the cap).
      const below = o.candidates.filter((c) => c.offeredPowerKw > 0 && c.offeredPowerKw <= 40);
      for (let i = 1; i < below.length; i++)
        expect(below[i]!.offeredPowerKw - below[i - 1]!.offeredPowerKw).toBeLessThanOrEqual(2.01);
    }
  }, 120000);
});
