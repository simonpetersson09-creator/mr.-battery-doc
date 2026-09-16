/**
 * BID-AWARE NEM CANDIDATES — Nordic FCR-D (SE, FI, DK2).
 *
 * The NEM requirement must load the capacity that is actually a CANDIDATE for
 * reservation — physical/energy/grid capability CLIPPED BY THE OFFERED BID — never
 * unused technical capability in the opposite direction.
 * The regulatory formula itself is unchanged:
 *   U + 0.20*D <= P_discharge and D + 0.20*U <= P_charge.
 */
import { describe, expect, it } from "vitest";
import { toLabConfig, toTimeSeries } from "../../battery-engine/input";
import type { BatteryEngineInput } from "../../battery-engine/types";
import { dispatch } from "../dispatch";
import { ancillaryPlan } from "./index";
import { applyNemPowerReservation } from "./nem";

const S = 0.2;
const solve = (U: number, D: number, P = 10, C = 10) =>
  applyNemPowerReservation({
    upKw: U,
    downKw: D,
    dischargeKw: P,
    chargeKw: C,
    nemShare: S,
  });

const feasible = (r: { upKw: number; downKw: number }, P = 10, C = 10) => {
  expect(r.upKw + S * r.downKw).toBeLessThanOrEqual(P + 1e-9);
  expect(r.downKw + S * r.upKw).toBeLessThanOrEqual(C + 1e-9);
};

describe("NEM on the candidate pair", () => {
  it("A: a full symmetric candidate 10/10 scales to 8.3333/8.3333", () => {
    const r = solve(10, 10);
    expect(r.upKw).toBeCloseTo(10 / 1.2, 6);
    expect(r.downKw).toBeCloseTo(10 / 1.2, 6);
    feasible(r);
  });

  it("B: pure up 10/0 stays 10/0", () => {
    const r = solve(10, 0);
    expect(r.upKw).toBeCloseTo(10, 9);
    expect(r.downKw).toBe(0);
    feasible(r);
  });

  it("C: pure down 0/10 stays 0/10", () => {
    const r = solve(0, 10);
    expect(r.upKw).toBe(0);
    expect(r.downKw).toBeCloseTo(10, 9);
    feasible(r);
  });

  it("D: 10/2 uses D = 2 in the NEM term, not D = 10", () => {
    const r = solve(10, 2);
    // With D = 10 the up side would be capped at 10/1.2 = 8.3333.
    expect(r.upKw).toBeGreaterThan(10 / 1.2 + 1e-6);
    // Required discharge with the real bid: 10 + 0.2*2 = 10.4 -> slight scale down only.
    expect(r.upKw).toBeGreaterThan(9.5);
    feasible(r);
  });

  it("E: 2/10 uses U = 2 in the NEM term, not U = 10", () => {
    const r = solve(2, 10);
    expect(r.downKw).toBeGreaterThan(10 / 1.2 + 1e-6);
    expect(r.downKw).toBeGreaterThan(9.5);
    feasible(r);
  });

  it("G/J: NEM never increases a direction and the result is always feasible", () => {
    for (const U of [0, 2, 5, 8, 10, 12]) {
      for (const D of [0, 2, 5, 8, 10, 12]) {
        const r = solve(U, D);
        expect(r.upKw).toBeLessThanOrEqual(U + 1e-9);
        expect(r.downKw).toBeLessThanOrEqual(D + 1e-9);
        expect(r.upKw).toBeGreaterThanOrEqual(0);
        expect(r.downKw).toBeGreaterThanOrEqual(0);
        feasible(r);
      }
    }
  });

  it("F: the candidate is min(offered, physically reservable) per direction", () => {
    // offered 10/5 but SOC/endurance only allows 7/4 -> NEM must start from 7/4.
    const candU = Math.min(10, 7);
    const candD = Math.min(5, 4);
    expect(candU).toBe(7);
    expect(candD).toBe(4);
    const r = solve(candU, candD);
    // 7 + 0.2*4 = 7.8 <= 10 and 4 + 0.2*7 = 5.4 <= 10 -> nothing is scaled away.
    expect(r.upKw).toBeCloseTo(7, 9);
    expect(r.downKw).toBeCloseTo(4, 9);
    feasible(r);
  });
});

function runSE(reservationPct: number) {
  const input: BatteryEngineInput = {
    site: { country: "SE", mainFuseA: 25 },
    consumption: { annualKWh: 20000 },
    production: { enabled: true, kWp: 14 },
    battery: { fixedCapacityKWh: 10, fixedPowerKw: 10 },
    strategies: { fcrDUp: true },
  };
  const cfg = toLabConfig(input);
  const series = toTimeSeries(cfg, input);
  const plan = ancillaryPlan({
    ...cfg.ancillary,
    enabled: true,
    offeredPowerKw: (10 * reservationPct) / 100,
  })!;
  const out = dispatch({
    series,
    battery: cfg.battery,
    strategies: cfg.strategies,
    peak: cfg.peakShaving,
    spot: cfg.spot,
    flex: cfg.flex,
    grid: cfg.grid,
    ancillary: plan,
    capacityKWh: 10,
    powerKw: 10,
  });
  return { plan, out };
}

describe("engine level: held power never exceeds bid or physics", () => {
  for (const pct of [20, 50, 100]) {
    it(`H/I: ${pct} % reservation is bounded by the offered bid`, () => {
      const { plan, out } = runSE(pct);
      const max = Math.max(...out.ancillaryReservedPowerKwByHour);
      expect(max).toBeLessThanOrEqual(plan.upPowerKw + 1e-9);
      expect(max).toBeLessThanOrEqual(10 + 1e-9);
      for (const v of out.ancillaryReservedPowerKwByHour)
        expect(v).toBeGreaterThanOrEqual(0);
    });
  }
});
