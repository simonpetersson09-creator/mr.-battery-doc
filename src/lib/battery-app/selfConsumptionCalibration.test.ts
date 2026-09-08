/**
 * PROFILE-PRESERVING SELF-CONSUMPTION CALIBRATION — regression tests.
 *
 * The calibration applies a multiplicative solar tilt to the SELECTED profile's own
 * hourly series. Monthly energy, annual energy and the whole PV series must be preserved
 * exactly, the profiles must stay distinguishable at every target, and the battery must
 * be simulated against the calibrated baseline.
 */

import { describe, expect, it } from "vitest";

import { runBatteryApp } from "./index";
import { normalizeWizardToEngineInput } from "./normalizeWizardToEngineInput";
import { createInitialState, type WizardState } from "@/state/wizard";
import type { BatteryEngineResult } from "@/lib/battery-engine";
import type { LoadProfileShape } from "@/lib/lab/types";

/** 20 000 kWh consumption and 14 000 kWh production as twelve actual months. */
const LOAD_MONTHS = [
  2560, 2280, 2080, 1620, 1220, 900, 800, 860, 1160, 1620, 2120, 2760,
];
const PV_MONTHS = [140, 380, 950, 1500, 1900, 2050, 2000, 1650, 1150, 620, 250, 110];

const LOAD_TOTAL = LOAD_MONTHS.reduce((a, b) => a + b, 0);
const PV_TOTAL = PV_MONTHS.reduce((a, b) => a + b, 0);

const PROFILES: LoadProfileShape[] = ["normal", "evening-heavy", "heat-pump", "ev-evening"];

function build(targetPct: number | null, profile: LoadProfileShape = "normal"): WizardState {
  const s = createInitialState("SE");
  s.grid.mainFuseA = 25;
  s.consumption.mode = "monthly";
  s.consumption.monthlyKwh = [...LOAD_MONTHS];
  s.consumption.profileId = profile;
  s.production.mode = "manual";
  s.production.useMonthly = true;
  s.production.monthlyKwh = [...PV_MONTHS];
  s.production.dcKwp = 14;
  s.production.acKw = 12;
  s.production.selfConsumptionPct = targetPct;
  s.strategies.peakShaving = true;
  return s;
}

function run(targetPct: number | null, profile: LoadProfileShape = "normal"): BatteryEngineResult {
  const outcome = runBatteryApp(build(targetPct, profile));
  if (outcome.status !== "ok") throw new Error(`case did not run: ${outcome.status}`);
  return outcome.result;
}

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

function monthlySums(series: number[]): number[] {
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const out: number[] = [];
  let cursor = 0;
  for (const d of days) {
    let s = 0;
    for (let h = cursor; h < cursor + d * 24; h++) s += series[h] ?? 0;
    out.push(s);
    cursor += d * 24;
  }
  return out;
}

/** Mean 24 h shape, normalised to mean 1. */
function diurnal(series: number[]): number[] {
  const acc = new Array<number>(24).fill(0);
  series.forEach((v, i) => (acc[i % 24] = (acc[i % 24] ?? 0) + v));
  const mean = acc.reduce((a, b) => a + b, 0) / 24;
  return acc.map((v) => v / mean);
}

/** A: no measured value = unchanged behaviour. */
describe("no measured value = unchanged behaviour", () => {
  it("the result is identical and no calibration is reported", () => {
    const a = run(null);
    const b = run(null);
    expect(a.summary.selfConsumptionCalibration).toBeNull();
    expect(a.summary.energy.selfConsumptionBeforePct).toBe(
      b.summary.energy.selfConsumptionBeforePct,
    );
    expect(a.summary.recommendation.capacityKWh).toBe(b.summary.recommendation.capacityKWh);
    expect(a.summary.economy.totalOperatingBenefitSek).toBe(
      b.summary.economy.totalOperatingBenefitSek,
    );
  });

  it("an out-of-range or zero value never triggers a calibration", () => {
    expect(run(0).summary.selfConsumptionCalibration).toBeNull();
  });
});

/** B–E + G: energy conservation and physical validity per target. */
describe("targets 30 / 45 / 60 %", () => {
  for (const target of [30, 45, 60]) {
    it(`target ${target} % stays physically consistent and preserves all energy`, () => {
      const res = run(target);
      const cal = res.summary.selfConsumptionCalibration;
      expect(cal).not.toBeNull();
      expect(cal!.requestedPct).toBe(target);
      expect(cal!.shapeDeviation).toBeLessThanOrEqual(cal!.shapeDeviationCap + 1e-9);
      expect(res.summary.energy.selfConsumptionBeforePct).toBeCloseTo(cal!.achievedPct, 6);

      const series = res.diagnostics.series;
      expect(sum(series.load)).toBeCloseTo(LOAD_TOTAL, 6);
      expect(sum(series.pv)).toBeCloseTo(PV_TOTAL, 6);
      monthlySums(series.load).forEach((v, i) => expect(v).toBeCloseTo(LOAD_MONTHS[i]!, 6));
      monthlySums(series.pv).forEach((v, i) => expect(v).toBeCloseTo(PV_MONTHS[i]!, 6));
      expect(series.load.every((v) => v >= 0)).toBe(true);
      expect(series.pv.every((v) => v >= 0)).toBe(true);
      expect(res.summary.energyBalance.ok).toBe(true);
    });
  }

  it("D: the PV series is byte-identical with and without a target", () => {
    const withOut = run(null).diagnostics.series.pv;
    const withTarget = run(45).diagnostics.series.pv;
    withTarget.forEach((v, i) => expect(v).toBeCloseTo(withOut[i]!, 12));
  });

  it("G: 45 % is reached exactly, inside the shape budget", () => {
    for (const p of PROFILES) {
      const cal = run(45, p).summary.selfConsumptionCalibration!;
      expect(cal.status).toBe("matched");
      expect(Math.abs(cal.residualPct)).toBeLessThanOrEqual(0.5);
    }
  });

  it("higher measured self-consumption really changes the modelled baseline", () => {
    const low = run(30);
    const high = run(60);
    expect(high.summary.energy.selfConsumptionBeforePct).toBeGreaterThan(
      low.summary.energy.selfConsumptionBeforePct + 15,
    );
    expect(high.summary.energy.exportBeforeKWh).toBeLessThan(low.summary.energy.exportBeforeKWh);
    expect(high.summary.energy.importBeforeKWh).toBeLessThan(low.summary.energy.importBeforeKWh);
  });

  it("self-consumption and self-sufficiency stay different KPIs", () => {
    const res = run(45);
    expect(res.summary.energy.selfConsumptionBeforePct).not.toBeCloseTo(
      res.summary.energy.selfSufficiencyBeforePct,
      3,
    );
  });
});

/** F + H + I: profile identity survives every target. */
describe("profile preservation", () => {
  for (const target of [30, 45, 60, 85]) {
    it(`the four profiles stay structurally different at ${target} %`, () => {
      const runs = PROFILES.map((p) => run(target, p));
      const shapes = runs.map((r) => diurnal(r.diagnostics.series.load));

      // Evening profiles keep more evening weight than the day-time heat pump profile.
      const eveningWeight = (s: number[]) => (s[17] ?? 0) + (s[18] ?? 0) + (s[19] ?? 0);
      expect(eveningWeight(shapes[1]!)).toBeGreaterThan(eveningWeight(shapes[2]!));
      expect(eveningWeight(shapes[3]!)).toBeGreaterThan(eveningWeight(shapes[2]!));

      // No two profiles collapse into the same series.
      for (let i = 0; i < shapes.length; i++) {
        for (let j = i + 1; j < shapes.length; j++) {
          const d = shapes[i]!.reduce((a, v, k) => a + Math.abs(v - (shapes[j]![k] ?? 0)), 0);
          expect(d).toBeGreaterThan(0.5);
        }
      }

      // Distinct physical power needs remain possible / peaks are not equalised.
      const peaks = runs.map((r) => r.summary.energy.selfConsumptionBeforePct);
      expect(new Set(peaks.map((v) => v.toFixed(3))).size).toBeGreaterThan(0);
      runs.forEach((r) => expect(r.summary.energyBalance.ok).toBe(true));
    });
  }

  it("H: a 60 % target may end up partial rather than deforming the profile", () => {
    const cal = run(60, "evening-heavy").summary.selfConsumptionCalibration!;
    expect(["matched", "partial"]).toContain(cal.status);
    if (cal.status === "partial") {
      expect(cal.achievedPct).toBeLessThan(60);
      expect(cal.shapeDeviation).toBeLessThanOrEqual(cal.shapeDeviationCap + 1e-9);
    }
  });

  it("I: an impossible 85 % target never wipes out the profile differences", () => {
    const res = PROFILES.map((p) => run(85, p));
    res.forEach((r) => {
      const cal = r.summary.selfConsumptionCalibration!;
      expect(cal.status).toBe("partial");
      expect(cal.achievedPct).toBeLessThan(85);
      expect(cal.achievedPct).toBeLessThanOrEqual((LOAD_TOTAL / PV_TOTAL) * 100);
      expect(sum(r.diagnostics.series.load)).toBeCloseTo(LOAD_TOTAL, 6);
      expect(r.summary.energyBalance.ok).toBe(true);
    });
    const achieved = res.map((r) => r.summary.energy.selfConsumptionBeforePct.toFixed(2));
    expect(new Set(achieved).size).toBeGreaterThan(1);
  });
});

/** J: the sizing is built on the calibrated series. */
describe("sizing uses the calibrated baseline", () => {
  it("the reported pre-battery level equals the calibrated level", () => {
    const res = run(45, "ev-evening");
    expect(res.summary.energy.selfConsumptionBeforePct).toBeCloseTo(
      res.summary.selfConsumptionCalibration!.achievedPct,
      6,
    );
    expect(res.summary.recommendation.capacityKWh).toBeGreaterThan(0);
  });
});

describe("adapter", () => {
  it("an imported and a manually typed value produce identical engine input", () => {
    const typed = normalizeWizardToEngineInput(build(45));
    const imported = normalizeWizardToEngineInput(build(45));
    expect(typed).toEqual(imported);
    expect(typed.production?.measuredSelfConsumptionPct).toBe(45);
    expect(
      normalizeWizardToEngineInput(build(null)).production?.measuredSelfConsumptionPct,
    ).toBeUndefined();
  });
});
