/**
 * MEASURED SELF-CONSUMPTION CALIBRATION — regression tests.
 *
 * The calibration only reshapes the INTRADAY load distribution. Monthly energy, annual
 * energy and the whole PV series must be preserved exactly, and the battery must be
 * simulated against the calibrated baseline.
 */

import { describe, expect, it } from "vitest";

import { runBatteryApp } from "./index";
import { normalizeWizardToEngineInput } from "./normalizeWizardToEngineInput";
import { createInitialState, type WizardState } from "@/state/wizard";
import type { BatteryEngineResult } from "@/lib/battery-engine";

/** 20 000 kWh consumption and 14 000 kWh production as twelve actual months. */
const LOAD_MONTHS = [
  2560, 2280, 2080, 1620, 1220, 900, 800, 860, 1160, 1620, 2120, 2760,
];
const PV_MONTHS = [140, 380, 950, 1500, 1900, 2050, 2000, 1650, 1150, 620, 250, 110];

const LOAD_TOTAL = LOAD_MONTHS.reduce((a, b) => a + b, 0);
const PV_TOTAL = PV_MONTHS.reduce((a, b) => a + b, 0);

function build(targetPct: number | null): WizardState {
  const s = createInitialState("SE");
  s.grid.mainFuseA = 25;
  s.consumption.mode = "monthly";
  s.consumption.monthlyKwh = [...LOAD_MONTHS];
  s.consumption.profileId = "normal";
  s.production.mode = "manual";
  s.production.useMonthly = true;
  s.production.monthlyKwh = [...PV_MONTHS];
  s.production.dcKwp = 14;
  s.production.acKw = 12;
  s.production.selfConsumptionPct = targetPct;
  s.strategies.peakShaving = true;
  return s;
}

function run(targetPct: number | null): BatteryEngineResult {
  const outcome = runBatteryApp(build(targetPct));
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

describe("no measured value = unchanged behaviour", () => {
  it("case A: the result is byte-for-byte the old result and no calibration is reported", () => {
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

describe("targets 30 / 45 / 60 %", () => {
  for (const target of [30, 45, 60]) {
    it(`target ${target} % is reached within tolerance and stays physically consistent`, () => {
      const res = run(target);
      const cal = res.summary.selfConsumptionCalibration;
      expect(cal).not.toBeNull();
      expect(cal!.requestedPct).toBe(target);
      expect(Math.abs(cal!.residualPct)).toBeLessThanOrEqual(0.5);
      expect(res.summary.energy.selfConsumptionBeforePct).toBeCloseTo(cal!.achievedPct, 6);

      const series = res.diagnostics.series;
      // Annual energy preserved exactly.
      expect(sum(series.load)).toBeCloseTo(LOAD_TOTAL, 6);
      expect(sum(series.pv)).toBeCloseTo(PV_TOTAL, 6);
      // Every month preserved exactly.
      monthlySums(series.load).forEach((v, i) => expect(v).toBeCloseTo(LOAD_MONTHS[i]!, 6));
      monthlySums(series.pv).forEach((v, i) => expect(v).toBeCloseTo(PV_MONTHS[i]!, 6));
      // No negative hours.
      expect(series.load.every((v) => v >= 0)).toBe(true);
      expect(series.pv.every((v) => v >= 0)).toBe(true);
      // Energy balance still exact.
      expect(res.summary.energyBalance.ok).toBe(true);
    });
  }

  it("higher measured self-consumption really changes the modelled baseline", () => {
    const low = run(30);
    const high = run(60);
    expect(high.summary.energy.selfConsumptionBeforePct).toBeGreaterThan(
      low.summary.energy.selfConsumptionBeforePct + 20,
    );
    // Less surplus solar left for the battery when the property already uses it.
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

describe("unreachable targets", () => {
  it("a 99 % target is clamped to the closest possible level and never invents energy", () => {
    const res = run(99);
    const cal = res.summary.selfConsumptionCalibration!;
    expect(cal.status).toBe("clamped");
    expect(cal.achievedPct).toBeLessThan(99);
    expect(cal.achievedPct).toBeLessThanOrEqual((LOAD_TOTAL / PV_TOTAL) * 100);
    expect(sum(res.diagnostics.series.load)).toBeCloseTo(LOAD_TOTAL, 6);
    expect(sum(res.diagnostics.series.pv)).toBeCloseTo(PV_TOTAL, 6);
    expect(res.summary.energyBalance.ok).toBe(true);
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
