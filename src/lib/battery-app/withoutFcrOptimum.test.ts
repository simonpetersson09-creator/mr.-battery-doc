/**
 * TRUE WITHOUT-FCR COUNTERFACTUAL regression tests.
 *
 * Locks that the "utan FCR-D upp" level comes from a real FCR-off simulation and never
 * from "FCR-influenced total minus FCR revenue".
 */

import { describe, expect, it } from "vitest";

import { runBatteryApp } from "./index";
import { buildResultPresentation } from "./resultPresentation";
import { computeWithoutFcrOptimum } from "./withoutFcrOptimum";
import { createInitialState, type WizardState } from "@/state/wizard";

/** The audited reference case: 20 000 kWh, 14 kWp / 14 000 kWh, 25 A, FCR on. */
function refState(fcr = true): WizardState {
  const s = createInitialState("SE");
  s.grid.mainFuseA = 25;
  s.consumption.mode = "monthly";
  s.consumption.profileId = "normal";
  s.consumption.monthlyKwh = [
    2264, 1887, 1698, 1509, 1321, 1226, 1132, 1226, 1415, 1698, 2075, 2549,
  ];
  s.production.mode = "manual";
  s.production.dcKwp = 14;
  s.production.acKw = 12;
  s.production.useMonthly = true;
  s.production.monthlyKwh = [101, 302, 806, 1410, 1813, 2216, 2317, 2014, 1612, 906, 403, 100];
  s.production.selfConsumptionPct = 45;
  s.strategies.fcrDUp = fcr;
  s.strategies.peakShaving = true;
  return s;
}

function run(state: WizardState) {
  const outcome = runBatteryApp(state);
  if (outcome.status !== "ok") throw new Error(`case did not run: ${outcome.status}`);
  return outcome;
}

describe("true without-FCR counterfactual", () => {
  const outcome = run(refState(true));
  const rec = outcome.result.summary.recommendation;
  const wo = computeWithoutFcrOptimum(outcome.input, outcome.result)!;

  it("B: the ordinary FCR-on recommendation is unchanged (25 kWh / 12,5 kW)", () => {
    expect(rec.capacityKWh).toBe(25);
    expect(rec.recommendedPowerKw).toBe(12.5);
    expect(rec.physicalPowerNeedKw).toBeCloseTo(3.5, 6);
  });

  it("keeps the already chosen capacity and compares the required power candidates", () => {
    expect(wo.capacityKWh).toBe(rec.capacityKWh);
    for (const kw of [3, 3.5, 5, 7.5, 10, 12.5]) expect(wo.candidatePowersKw).toContain(kw);
  });

  it("A: picks 3,5 kW — the lowest candidate within the 25 SEK/year tie tolerance", () => {
    expect(wo.tieToleranceSek).toBe(25);
    expect(wo.withoutFcrOptimalPowerKw).toBe(3.5);
    expect(wo.bestBenefitSek - wo.withoutFcrBenefitSek).toBeLessThanOrEqual(25);
  });

  it("E: no FCR revenue and no reservation touched the counterfactual dispatch", () => {
    for (const o of wo.options) {
      expect(o.fcrRevenueSek).toBe(0);
      expect(o.fcrReservedPowerKw).toBe(0);
    }
  });

  it("F: the old subtraction method is gone — FCR-off totals differ from total minus FCR", () => {
    const engineOptions = outcome.result.summary.powerOptions;
    for (const o of wo.options) {
      const engine = engineOptions.find((x) => Math.abs(x.powerKw - o.powerKw) < 1e-9);
      if (!engine) continue;
      const subtracted = engine.totalOperatingBenefitSek - engine.fcrRevenueSek;
      // The reservation changes dispatch, so the two can never be assumed equal.
      expect(Math.abs(subtracted - o.totalOperatingBenefitSek)).toBeGreaterThan(1);
    }
    // And the discredited method would have produced a different (higher) power.
    const best = Math.max(...engineOptions.map((o) => o.totalOperatingBenefitSek - o.fcrRevenueSek));
    const wrongPick = engineOptions.find(
      (o) => o.totalOperatingBenefitSek - o.fcrRevenueSek >= best - 25,
    )!;
    expect(wrongPick.powerKw).not.toBe(wo.withoutFcrOptimalPowerKw);
  });

  it("G: tie tolerance — differences under 25 kr/år choose the lower kW", () => {
    const sorted = [...wo.options].sort((a, b) => a.powerKw - b.powerKw);
    const winnerIdx = sorted.findIndex((o) => o.powerKw === wo.withoutFcrOptimalPowerKw);
    for (const lower of sorted.slice(0, winnerIdx))
      expect(wo.bestBenefitSek - lower.totalOperatingBenefitSek).toBeGreaterThan(25);
  });

  it("C: identical physical and without-FCR levels collapse to two customer rows", () => {
    const p = buildResultPresentation(outcome.result, {
      peakShavingSelected: true,
      demandChargeTouched: false,
      withoutFcr: wo,
    });
    expect(p.withoutFcrPowerKw).toBe(3.5);
    expect(p.physicalPowerNeedKw).toBeCloseTo(3.5, 6);
    expect(p.showPhysicalNeedRow).toBe(false);
    expect(p.fcrPowerCardText).toContain("3,5 kW");
    expect(p.fcrPowerCardText).toContain("12,5 kW");
  });

  it("D: three levels are shown when the without-FCR power differs from the physical need", () => {
    const p = buildResultPresentation(outcome.result, {
      peakShavingSelected: true,
      demandChargeTouched: false,
      withoutFcr: { ...wo, withoutFcrOptimalPowerKw: 5 },
    });
    expect(p.showPhysicalNeedRow).toBe(true);
    expect(p.fcrPowerCardText).toContain("Utan FCR-D upp ger 5,0 kW");
  });

  it("no counterfactual supplied -> no reconstructed level at all", () => {
    const p = buildResultPresentation(outcome.result, {
      peakShavingSelected: true,
      demandChargeTouched: false,
    });
    expect(p.withoutFcrPowerKw).toBeNull();
    expect(p.withoutFcrBenefitSek).toBeNull();
    expect(p.showFcrPowerCard).toBe(false);
  });
});
