/**
 * DEGENERATE SOC REGRESSION (pure ancillary operation, PV = 0, no peak shaving).
 *
 * Guards the fix for the algorithmic non-monotonicity found in the audit: when the
 * battery does no ordinary energy work the cyclic SOC fixed point is not unique, so the
 * iteration used to leave different capacities at different arbitrary absolute SOC
 * levels. The start SOC is now solved from the reserve physics instead.
 */

import { describe, expect, it } from "vitest";
import { runBatteryApp } from "@/lib/battery-app";
import { toLabConfig, toTimeSeries } from "@/lib/battery-engine/input";
import { ancillaryPlan } from "./ancillary";
import { solveAncillarySoc } from "./ancillarySoc";
import { resolveWindow } from "./dispatch";
import { simulate } from "./simulate";
import { createInitialState, type WizardState } from "@/state/wizard";
import type { LabConfig, SimResult, TimeSeries } from "./types";

function wizardState(fuseA = 16, annualKwh = 10000): WizardState {
  const s = createInitialState("SE");
  s.grid.mainFuseA = fuseA;
  s.grid.mainFuseManual = true;
  s.grid.gridValuesConfirmed = true;
  s.consumption.mode = "annual";
  s.consumption.annualKwh = annualKwh;
  s.consumption.profileId = "normal";
  s.production.mode = "none";
  s.strategies.peakShaving = false;
  s.strategies.fcrDUp = true;
  return s;
}

function harness(fuseA = 16, annualKwh = 10000) {
  const out = runBatteryApp(wizardState(fuseA, annualKwh)) as unknown as {
    input: Parameters<typeof toLabConfig>[0];
  };
  const base = toLabConfig(out.input) as LabConfig;
  const series = toTimeSeries(base, out.input) as TimeSeries;
  const cfgFor = (powerKw: number): LabConfig =>
    ({
      ...base,
      strategies: { ...base.strategies, ancillaryServices: true },
      ancillary: { ...base.ancillary, enabled: true, offeredPowerKw: powerKw },
    }) as LabConfig;
  return { base, series, cfgFor };
}

const upKwh = (r: SimResult) => r.ancillary.monetizedPowerAvgKw * r.ancillary.reservedHours;
const downKwh = (r: SimResult) => r.ancillary.downHeldPowerAvgKw * r.ancillary.reservedHours;
const worst = (r: SimResult) => Math.min(upKwh(r), downKwh(r));

const CAPS = [5, 10, 15, 20, 30, 40];
const KW = 10;

describe("degenerate ancillary SOC", () => {
  it("solves a SOC inside the active service window, analytically and without iteration", () => {
    const { base, cfgFor } = harness();
    const cfg = cfgFor(KW);
    const plan = ancillaryPlan(cfg.ancillary);
    for (const cap of CAPS) {
      const win = resolveWindow(base.battery, cfg.strategies, cfg.flex, cap, KW);
      const sol = solveAncillarySoc(win, plan);
      expect(sol).not.toBeNull();
      expect(sol!.socKWh).toBeGreaterThanOrEqual(sol!.windowFloorKWh - 1e-9);
      expect(sol!.socKWh).toBeLessThanOrEqual(sol!.windowCeilKWh + 1e-9);
      // deterministic: solving twice gives exactly the same number
      expect(solveAncillarySoc(win, plan)!.socPct).toBe(sol!.socPct);
    }
  });

  it("gives every capacity the SAME relative SOC instead of arbitrary absolute levels", () => {
    const { series, cfgFor } = harness();
    const cfg = cfgFor(KW);
    const pcts = CAPS.map((cap) => {
      const r = simulate(cfg, series, cap, KW);
      expect(r.ancillarySocPct).not.toBeNull();
      expect(r.equivalentFullCycles).toBeLessThan(1e-6);
      return r.ancillarySocPct!;
    });
    for (const p of pcts) {
      expect(p).toBeGreaterThan(45);
      expect(p).toBeLessThan(55);
    }
  });

  it("restores monotonicity of the technically feasible reserve in capacity", () => {
    const { series, cfgFor } = harness();
    const cfg = cfgFor(KW);
    const results = CAPS.map((cap) => simulate(cfg, series, cap, KW));
    for (let i = 1; i < results.length; i++) {
      // worst active direction = the engine's own feasibility measure for a two-sided bid
      expect(worst(results[i]!)).toBeGreaterThanOrEqual(worst(results[i - 1]!) - 1);
    }
    // from 15 kWh upwards both directions are fully backed and stay flat
    for (let i = CAPS.indexOf(15) + 1; i < results.length; i++) {
      expect(upKwh(results[i]!)).toBeGreaterThanOrEqual(upKwh(results[i - 1]!) - 1);
      expect(downKwh(results[i]!)).toBeGreaterThanOrEqual(downKwh(results[i - 1]!) - 1);
    }
  });

  it("replay: a larger battery can reproduce a smaller one's feasible strategy", () => {
    const { series, cfgFor } = harness();
    const cfg = cfgFor(KW);
    for (const small of [10, 15, 20]) {
      const ref = simulate(cfg, series, small, KW);
      for (const large of CAPS.filter((c) => c > small)) {
        const rep = simulate(cfg, series, large, KW);
        expect(worst(rep)).toBeGreaterThanOrEqual(worst(ref) - 1);
      }
    }
  });

  it("does NOT touch the SOC when the battery does ordinary energy work", () => {
    const { series, cfgFor } = harness(25, 20000);
    const cfg = {
      ...cfgFor(KW),
      strategies: { ...cfgFor(KW).strategies, peakShaving: true, selfConsumption: true },
    } as LabConfig;
    const r = simulate(cfg, series, 20, KW);
    if (r.equivalentFullCycles > 1e-6) expect(r.ancillarySocPct).toBeNull();
  });

  it("keeps the audit override available: a forced SOC is respected", () => {
    const { series, cfgFor } = harness();
    const cfg = cfgFor(KW);
    const forced = simulate({ ...cfg, battery: { ...cfg.battery, initialSocPct: 40 } }, series, 20, KW, {
      cyclicSoc: false,
      solveDegenerateAncillarySoc: false,
    });
    expect(forced.ancillarySocPct).toBeNull();
    expect(forced.socStartKWh).toBeCloseTo(8, 6);
  });
});
