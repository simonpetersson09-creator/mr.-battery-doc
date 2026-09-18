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
import { runBatteryEngine } from "@/lib/battery-engine";
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

  /**
   * UPDATED after the approved solar-flow sizing change: FCR revenue may no longer raise
   * the recommended power, so the FCR-on case lands on the same technically motivated
   * power as the FCR-off counterfactual. The capacity is unchanged. UPDATED again with the
   * base-power correction: the 3 kW step is now scanned and already reaches 95 % of the
   * saturated physical benefit, so the technical level is 3 kW.
   */
  it("B: the FCR-on recommendation is the technical 25 kWh / 3 kW", () => {
    expect(rec.capacityKWh).toBe(25);
    expect(rec.recommendedPowerKw).toBe(3);
    expect(rec.physicalPowerNeedKw).toBeCloseTo(3.5, 6);
  });

  it("fully re-sizes capacity and power exactly like an independent FCR-off engine run", () => {
    const direct = runBatteryEngine({
      ...outcome.input,
      strategies: {
        ...outcome.input.strategies,
        fcrDUp: false,
        fcrOfferedPowerKw: 0,
        optimiseFcrReservation: false,
      },
    });
    expect(wo.capacityKWh).toBe(direct.summary.recommendation.capacityKWh);
    expect(wo.withoutFcrOptimalPowerKw).toBe(direct.summary.recommendation.recommendedPowerKw);
    for (const kw of [3, 3.5, 5, 7.5, 10]) expect(wo.candidatePowersKw).toContain(kw);
  });

  /**
   * UPDATED with the base-power correction: the counterfactual power is the TECHNICAL
   * choice (smallest step reaching 95 % of the saturated physical benefit), not the highest
   * SEK option, so a higher-benefit option may exist above it. The tie tolerance is still
   * reported unchanged.
   */
  it("A: returns the full engine's purchasable 3 kW recommendation", () => {
    expect(wo.tieToleranceSek).toBe(25);
    expect(wo.withoutFcrOptimalPowerKw).toBe(3);
    expect(wo.bestBenefitSek).toBeGreaterThanOrEqual(wo.withoutFcrBenefitSek);
  });

  it("E: no FCR revenue and no reservation touched the counterfactual dispatch", () => {
    for (const o of wo.options) {
      expect(o.fcrRevenueSek).toBe(0);
      expect(o.fcrReservedPowerKw).toBe(0);
    }
  });

  it("does not inherit a fixed or already recommended capacity", () => {
    const inputWithFixedSizing = {
      ...outcome.input,
      battery: { ...outcome.input.battery, fixedCapacityKWh: 200, fixedPowerKw: 100 },
    };
    const counterfactual = computeWithoutFcrOptimum(inputWithFixedSizing, outcome.result);
    expect(counterfactual?.capacityKWh).toBe(25);
    expect(counterfactual?.withoutFcrOptimalPowerKw).toBe(3);
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
    /**
     * And the discredited method rests on a different total. Its picked power may
     * coincide with the counterfactual one in a single case (it does for the Swedish
     * FCR-D upp + ned product), so the invariant tested here is the TOTAL, not the kW.
     */
    const best = Math.max(...engineOptions.map((o) => o.totalOperatingBenefitSek - o.fcrRevenueSek));
    const wrongPick = engineOptions.find(
      (o) => o.totalOperatingBenefitSek - o.fcrRevenueSek >= best - 25,
    )!;
    const same = wo.options.find(
      (o) => Math.abs(o.powerKw - wrongPick.powerKw) < 1e-9,
    );
    expect(
      Math.abs(
        wrongPick.totalOperatingBenefitSek -
          wrongPick.fcrRevenueSek -
          (same?.totalOperatingBenefitSek ?? 0),
      ),
    ).toBeGreaterThan(1);
  });

  it("G: selected power follows the full engine recommendation", () => {
    expect(wo.options.filter((option) => option.selected)).toHaveLength(1);
    expect(wo.options.find((option) => option.selected)?.powerKw).toBe(
      wo.withoutFcrOptimalPowerKw,
    );
  });

  it("C: physical need and purchasable without-FCR power remain distinct", () => {
    const p = buildResultPresentation(outcome.result, {
      peakShavingSelected: true,
      demandChargeTouched: false,
      withoutFcr: wo,
    });
    expect(p.withoutFcrPowerKw).toBe(3);
    expect(p.physicalPowerNeedKw).toBeCloseTo(3.5, 6);
  });

  it("D: FCR can no longer drive the power, so no FCR power card is shown", () => {
    const p = buildResultPresentation(outcome.result, {
      peakShavingSelected: true,
      demandChargeTouched: false,
      withoutFcr: wo,
    });
    expect(outcome.result.summary.recommendation.recommendationUsesHistoricalFcr).toBe(false);
    expect(p.fcrDrivesPower).toBe(false);
    expect(p.showFcrPowerCard).toBe(false);
    expect(p.showPhysicalNeedRow).toBe(false);
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

describe("compact power explanation card", () => {
  const outcome = run(refState(true));
  const wo = computeWithoutFcrOptimum(outcome.input, outcome.result)!;

  /**
   * UPDATED: the card only ever existed to explain a power level that ancillary revenue
   * had raised. That can no longer happen — the power is technical — so the card stays
   * hidden and the recommended level equals the without-FCR level.
   */
  it("control case: no FCR power card, because FCR never raises the power", () => {
    const p = buildResultPresentation(outcome.result, {
      peakShavingSelected: true,
      demandChargeTouched: false,
      withoutFcr: wo,
    });
    expect(p.showFcrPowerCard).toBe(false);
    expect(p.showPhysicalNeedRow).toBe(false);
    expect(p.fcrPowerLevels).toHaveLength(0);
    expect(p.fcrPowerExplanation).toBeNull();
    expect(outcome.result.summary.recommendation.recommendedPowerKw).toBe(
      wo.withoutFcrOptimalPowerKw,
    );
  });

  it("FCR off -> no card, no levels, no explanation", () => {
    const off = run(refState(false));
    const p = buildResultPresentation(off.result, {
      peakShavingSelected: true,
      demandChargeTouched: false,
      withoutFcr: null,
    });
    expect(p.showFcrPowerCard).toBe(false);
    expect(p.fcrPowerLevels).toHaveLength(0);
    expect(p.fcrPowerExplanation).toBeNull();
  });

});
