/**
 * NEM POWER RESERVATION + 20 MIN ENDURANCE — physical invariants.
 *
 * FORMULA UNDER TEST (see nem.ts):
 *   U + s*D <= Pdischarge     and     D + s*U <= Pcharge
 * where U/D are the paid FCR-D up/down capacities and s the NEM share (0.20 Nordic).
 * NEM is a PHYSICAL POWER requirement in the OPPOSITE direction — never an energy
 * requirement, never a revenue deduction, never a cap on the reservation percentage.
 */

import { describe, expect, it } from "vitest";
import { toLabConfig, toTimeSeries } from "../../battery-engine/input";
import type { BatteryEngineInput } from "../../battery-engine/types";
import { computeGridLimits, dispatch, resolveWindow } from "../dispatch";
import { ancillaryPlan, marketProfileForPriceArea } from "./index";
import { applyNemPowerReservation } from "./nem";
import { FI_MARKET } from "./markets/fi";
import { SE_MARKET } from "./markets/se";

const NEM = 0.2;

describe("A. Nordic FCR-D endurance is exactly 20 minutes", () => {
  for (const [label, market] of [
    ["SE", SE_MARKET],
    ["FI", FI_MARKET],
    // DK2 is part of the Nordic market and resolves to the Swedish rule set.
    ["DK2", marketProfileForPriceArea("DK2")],
  ] as const) {
    it(`${label}: FCR-D up and down both declare 20/60 h`, () => {
      for (const key of ["FCR-D-up", "FCR-D-down"]) {
        const svc = market.services.find((s) => s.key === key)!;
        expect(svc.requirements.enduranceHours).toBe(20 / 60);
        expect(svc.requirements.enduranceHours * 60).toBeCloseTo(20, 12);
        expect(svc.requirements.nemPowerSharePct).toBe(20);
      }
    });
  }

  it("does not touch the parked FCR-N / FFR / mFRR definitions", () => {
    // Parked services are not part of the active product model and must stay untouched.
    const parked = SE_MARKET.services.filter((s) => !s.key.startsWith("FCR-D"));
    expect(parked).toHaveLength(0);
  });

  /**
   * DE and DK1 now have their own VERIFIED continental profiles (see markets/dk1De.test.ts):
   * DK1 = 24 min + 25 %, DE = 25 min + 25 % (Pmax >= 1.25 * P_VL). Neither may use the
   * Nordic 20 min / 20 % values.
   */
  it("DE and DK1 use their own verified continental profiles, not the Nordic one", () => {
    const expected = { DK1: 24 / 60, DE: 0.25 + 0.125 + 1 / 24 } as const;
    for (const area of ["DE", "DK1"] as const) {
      const m = marketProfileForPriceArea(area);
      const up = m.services.find((s) => s.key === "FCR-D-up")!;
      expect(up.requirements.enduranceHours).toBe(expected[area]);
      expect(up.requirements.enduranceHours).not.toBe(20 / 60);
      expect(up.requirements.nemPowerSharePct).toBe(25);
    }
  });
});

describe("B–F. NEM solver invariants", () => {
  const base = { upKw: 10, downKw: 10, dischargeKw: 10, chargeKw: 10 };

  it("B. a higher NEM requirement can never increase the reservable FCR power", () => {
    let prevUp = Infinity;
    let prevDown = Infinity;
    for (const s of [0, 0.05, 0.1, 0.2, 0.3, 0.5, 1]) {
      const r = applyNemPowerReservation({ ...base, nemShare: s });
      expect(r.upKw).toBeLessThanOrEqual(prevUp + 1e-12);
      expect(r.downKw).toBeLessThanOrEqual(prevDown + 1e-12);
      prevUp = r.upKw;
      prevDown = r.downKw;
    }
  });

  it("C. a smaller inverter can never increase the FCR capacity", () => {
    let prev = -Infinity;
    for (const p of [1, 3, 5, 8, 10, 20]) {
      const r = applyNemPowerReservation({
        ...base,
        dischargeKw: p,
        chargeKw: p,
        nemShare: NEM,
      });
      expect(r.upKw).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = r.upKw;
    }
  });

  it("D. NEM headroom never exceeds the physical charge/discharge power", () => {
    for (const s of [0.1, 0.2, 0.5]) {
      for (const p of [0.5, 2, 7, 10]) {
        const r = applyNemPowerReservation({
          upKw: 50,
          downKw: 50,
          dischargeKw: p,
          chargeKw: p,
          nemShare: s,
        });
        expect(r.nemChargeKw).toBeLessThanOrEqual(p + 1e-9);
        expect(r.nemDischargeKw).toBeLessThanOrEqual(p + 1e-9);
      }
    }
  });

  it("E. FCR + NEM never needs more directional power than the battery can give", () => {
    for (const up of [0, 1, 4, 9, 25]) {
      for (const down of [0, 1, 4, 9, 25]) {
        for (const pDis of [0, 2, 6, 10]) {
          for (const pCh of [0, 2, 6, 10]) {
            const r = applyNemPowerReservation({
              upKw: up,
              downKw: down,
              dischargeKw: pDis,
              chargeKw: pCh,
              nemShare: NEM,
            });
            expect(r.upKw + NEM * r.downKw).toBeLessThanOrEqual(pDis + 1e-9);
            expect(r.downKw + NEM * r.upKw).toBeLessThanOrEqual(pCh + 1e-9);
            expect(r.upKw).toBeLessThanOrEqual(up + 1e-12);
            expect(r.downKw).toBeLessThanOrEqual(down + 1e-12);
          }
        }
      }
    }
  });

  it("F. NEM is never double counted when both directions are offered", () => {
    // A direction never pays a NEM surcharge on ITS OWN capacity: with 10 kW discharge
    // and only the up product offered, the full 10 kW stays available.
    const upOnly = applyNemPowerReservation({
      upKw: 10,
      downKw: 0,
      dischargeKw: 10,
      chargeKw: 10,
      nemShare: NEM,
    });
    expect(upOnly.upKw).toBeCloseTo(10, 12);
    /**
     * With both directions offered the requirement is U + 0.2*D on the discharge side,
     * NOT 1.2*U + 1.2*D. With a small down bid the up side therefore keeps almost all of
     * the inverter: 9.6 kW here, versus 8.33 kW under the naive double-counted rule.
     */
    const both = applyNemPowerReservation({
      upKw: 10,
      downKw: 2,
      dischargeKw: 10,
      chargeKw: 10,
      nemShare: NEM,
    });
    expect(both.upKw + NEM * both.downKw).toBeLessThanOrEqual(10 + 1e-9);
    expect(both.upKw).toBeGreaterThan(9.5);
    expect(both.upKw).toBeGreaterThan(10 / 1.2);
  });

  it("G. zero physical power gives zero FCR", () => {
    const r = applyNemPowerReservation({
      upKw: 10,
      downKw: 10,
      dischargeKw: 0,
      chargeKw: 0,
      nemShare: NEM,
    });
    expect(r.upKw).toBe(0);
    expect(r.downKw).toBe(0);
  });
});

/** Engine-level checks: energy limits (H, I, J) run through the real dispatch. */
function runCase(capacityKWh: number, powerKw: number, initialSocPct?: number) {
  const input: BatteryEngineInput = {
    site: { country: "SE", mainFuseA: 25 },
    consumption: { annualKWh: 20000 },
    production: { enabled: true, kWp: 14 },
    battery: {
      fixedCapacityKWh: capacityKWh,
      fixedPowerKw: powerKw,
      ...(initialSocPct === undefined ? {} : { initialSocPct }),
    },
    strategies: { fcrDUp: true },
  };
  const cfg = toLabConfig(input);
  const series = toTimeSeries(cfg, input);
  const plan = ancillaryPlan({ ...cfg.ancillary, enabled: true, offeredPowerKw: powerKw })!;
  const out = dispatch({
    series,
    battery: cfg.battery,
    strategies: cfg.strategies,
    peak: cfg.peakShaving,
    spot: cfg.spot,
    flex: cfg.flex,
    grid: cfg.grid,
    ancillary: plan,
    capacityKWh,
    powerKw,
  });
  const win = resolveWindow(cfg.battery, cfg.strategies, cfg.flex, capacityKWh, powerKw);
  return { plan, out, win, limits: computeGridLimits(cfg.grid) };
}

describe("engine-level physical invariants", () => {
  it("G. a 0 kW battery reserves 0 kW of FCR", () => {
    const { out } = runCase(10, 0);
    const maxUp = Math.max(...out.ancillaryReservedPowerKwByHour);
    const maxDown = Math.max(...out.ancillaryReservedDownPowerKwByHour);
    expect(maxUp).toBe(0);
    expect(maxDown).toBe(0);
  });

  it("H. a 0 kWh battery has no energy-feasible FCR capacity", () => {
    const { out } = runCase(0, 10);
    expect(Math.max(...out.ancillaryReservedPowerKwByHour)).toBe(0);
    expect(Math.max(...out.ancillaryReservedDownPowerKwByHour)).toBe(0);
  });

  it("I/J. paid power respects the active service floor and ceiling every hour", () => {
    const { plan, out, win } = runCase(10, 10, 50);
    const floor = Math.max(win.socFloorKWh, (plan.serviceMinSocPct / 100) * 10);
    const ceil = Math.min(win.socCeilKWh, (plan.serviceMaxSocPct / 100) * 10);
    const upEnd = plan.upEnergyKWh / plan.upPowerKw;
    const downEnd = plan.downEnergyKWh / plan.downPowerKw;
    let worstUp = 0;
    let worstDown = 0;
    let worstNemDis = 0;
    let worstNemCh = 0;
    for (let h = 0; h < 8760; h++) {
      const up = out.ancillaryReservedPowerKwByHour[h] ?? 0;
      const down = out.ancillaryReservedDownPowerKwByHour[h] ?? 0;
      const s0 = h === 0 ? out.tallies.socStart : (out.socSeries[h - 1] ?? 0);
      const s1 = out.socSeries[h] ?? 0;
      const deliverable = Math.max(0, Math.min(s0, s1) - floor) * win.dischargeEff;
      const absorbable = Math.max(0, ceil - Math.max(s0, s1)) / Math.max(win.chargeEff, 1e-9);
      // I: SOC at the service floor gives zero up capability; J: at the ceiling, zero down.
      if (deliverable <= 1e-9) expect(up).toBeLessThan(1e-6);
      if (absorbable <= 1e-9) expect(down).toBeLessThan(1e-6);
      worstUp = Math.max(worstUp, up * upEnd - deliverable);
      worstDown = Math.max(worstDown, down * downEnd - absorbable);
      // E at engine level: FCR + NEM inside the physical directional power.
      worstNemDis = Math.max(worstNemDis, up + NEM * down - win.dischargeKw);
      worstNemCh = Math.max(worstNemCh, down + NEM * up - win.chargeKw);
    }
    expect(worstUp).toBeLessThan(1e-6);
    expect(worstDown).toBeLessThan(1e-3);
    expect(worstNemDis).toBeLessThan(1e-9);
    expect(worstNemCh).toBeLessThan(1e-9);
  });

  it("offeredPowerKw is not automatically paid power", () => {
    const { out } = runCase(10, 10);
    const n = out.ancillaryReservedPowerKwByHour.filter((v) => v > 1e-9).length;
    const avg = out.ancillaryReservedPowerKwByHour.reduce((a, b) => a + b, 0) / Math.max(n, 1);
    expect(avg).toBeGreaterThan(0);
    expect(avg).toBeLessThan(10);
  });
});
