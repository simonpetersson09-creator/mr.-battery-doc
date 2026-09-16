/**
 * DK1 and DE — own verified continental FCR/LER profiles.
 *
 * These tests exist so DK1 and DE can never again silently inherit the Nordic (Swedish)
 * rule set, each other's parameters, or a frozen placeholder profile:
 *   SE/FI/DK2 : 20 min endurance, 20 % energy-management power
 *   DK1       : 24 min endurance, 25 % energy-management power
 *   DE        : 25 min endurance (15 min alert + max{previous activation; management
 *               lag} + 5 min reserve operation), Pmax >= 1.25 * P_VL
 * The reservation is a PHYSICAL limit, never an 80 % bid cap.
 */
import { describe, expect, it } from "vitest";
import { toLabConfig, toTimeSeries } from "../../../battery-engine/input";
import type { BatteryEngineInput } from "../../../battery-engine/types";
import { dispatch } from "../../dispatch";
import { applyNemPowerReservation } from "../nem";
import {
  ancillaryPlan,
  marketProfileForPriceArea,
  reserveModeForMarket,
} from "../index";
import { DE_MARKET } from "./de";
import { DK1_MARKET } from "./dk1";
import { FI_MARKET } from "./fi";
import { SE_MARKET } from "./se";

const DK1_ENDURANCE = 24 / 60;
const DE_ENDURANCE = 0.25 + 0.125 + 1 / 24;

function svc(market: typeof SE_MARKET, key: string) {
  return market.services.find((s) => s.key === key)!;
}

describe("market profiles are never inherited", () => {
  it("DK1 and DE have their own profiles, not the Nordic one and not each other's", () => {
    expect(marketProfileForPriceArea("DK1")).toBe(DK1_MARKET);
    expect(marketProfileForPriceArea("DE")).toBe(DE_MARKET);
    expect(marketProfileForPriceArea("DK1")).not.toBe(SE_MARKET);
    expect(marketProfileForPriceArea("DE")).not.toBe(SE_MARKET);
    expect(marketProfileForPriceArea("DE")).not.toBe(DK1_MARKET);
    expect(marketProfileForPriceArea("DE")).not.toBe(FI_MARKET);
    // Nordic markets are untouched.
    expect(marketProfileForPriceArea("SE")).toBe(SE_MARKET);
    expect(marketProfileForPriceArea("DK2")).toBe(SE_MARKET);
    expect(marketProfileForPriceArea("FI")).toBe(FI_MARKET);
  });

  it("declares the verified endurance and energy-management share per market", () => {
    for (const key of ["FCR-D-up", "FCR-D-down"]) {
      for (const m of [SE_MARKET, FI_MARKET]) {
        expect(svc(m, key).requirements.enduranceHours).toBe(20 / 60);
        expect(svc(m, key).requirements.nemPowerSharePct).toBe(20);
      }
      expect(svc(DK1_MARKET, key).requirements.enduranceHours).toBe(DK1_ENDURANCE);
      expect(svc(DK1_MARKET, key).requirements.enduranceHours * 60).toBeCloseTo(24, 12);
      expect(svc(DK1_MARKET, key).requirements.nemPowerSharePct).toBe(25);
      expect(svc(DE_MARKET, key).requirements.enduranceHours).toBe(DE_ENDURANCE);
      expect(svc(DE_MARKET, key).requirements.enduranceHours * 60).toBeCloseTo(25, 12);
      expect(svc(DE_MARKET, key).requirements.nemPowerSharePct).toBe(25);
    }
  });

  it("DK1 and DE stay ONE symmetric product with one paid capacity", () => {
    expect(reserveModeForMarket("DK", "DK1")).toBe("symmetric");
    expect(reserveModeForMarket("DE")).toBe("symmetric");
    for (const area of ["DK1", "DE"] as const) {
      const plan = ancillaryPlan({
        ...base(area),
        offeredPowerKw: 10,
      })!;
      expect(plan.reserveMode).toBe("symmetric");
      // Same kW in both directions = one symmetric capacity, never up + down revenue.
      expect(plan.upPowerKw).toBe(plan.downPowerKw);
      expect(plan.upEnergyKWh).toBe(plan.downEnergyKWh);
      expect(plan.nemPowerSharePct).toBe(25);
    }
  });
});

function base(area: "DK1" | "DE") {
  return {
    enabled: true,
    marketId: "SE" as const,
    serviceKeys: ["FCR-D-up"],
    offeredPowerKw: 10,
    offeredHoursSharePct: 100,
    assumeMarketAccess: true,
    aggregatedParticipation: true,
    reservationHours: Array.from({ length: 24 }, (_, i) => i),
    reservationMonths: Array.from({ length: 12 }, (_, i) => i + 1),
    eurSekRate: 11.3,
    priceCountry: area,
    reserveMode: "symmetric" as const,
    aggregatorSharePct: null,
    aggregatorFixedKrPerYear: null,
    aggregatorAccessConfirmed: false,
    prequalificationConfirmed: false,
    dataset: null,
  };
}

describe("symmetric 1.25 x C power reservation", () => {
  const solve = (P: number, s = 0.25) =>
    applyNemPowerReservation({
      upKw: P,
      downKw: P,
      dischargeKw: P,
      chargeKw: P,
      nemShare: s,
    }).upKw;

  it("10 kW / 10 kW: C = 8 kW passes, C = 10 kW fails", () => {
    // C = 8 -> required discharge and charge = 1.25 * 8 = 10 kW -> fits exactly.
    expect(1.25 * 8).toBeLessThanOrEqual(10);
    // C = 10 -> required 12.5 kW in both directions -> does not fit.
    expect(1.25 * 10).toBeGreaterThan(10);
    expect(solve(10)).toBeCloseTo(8, 12);
  });

  it("the weakest direction limits the symmetric capacity", () => {
    const sym = (dis: number, ch: number) =>
      applyNemPowerReservation({
        upKw: Math.min(dis, ch),
        downKw: Math.min(dis, ch),
        dischargeKw: dis,
        chargeKw: ch,
        nemShare: 0.25,
      }).upKw;
    expect(sym(5, 5)).toBeCloseTo(4, 12);
    expect(sym(10, 5)).toBeCloseTo(4, 12);
    expect(sym(5, 10)).toBeCloseTo(4, 12);
    expect(sym(0, 10)).toBe(0);
  });

  it("a higher energy-management share can never increase the capacity", () => {
    let prev = Infinity;
    for (const s of [0, 0.1, 0.2, 0.25, 0.5, 1]) {
      const v = solve(10, s);
      expect(v).toBeLessThanOrEqual(prev + 1e-12);
      prev = v;
    }
  });
});

function runCase(
  area: "DK1" | "DE",
  capacityKWh: number,
  powerKw: number,
  offeredKw = powerKw,
) {
  const input: BatteryEngineInput = {
    site:
      area === "DK1"
        ? { country: "DK", marketArea: "DK1", mainFuseA: 25 }
        : { country: "DE", mainFuseA: 25 },
    consumption: { annualKWh: 20000 },
    production: { enabled: true, kWp: 14 },
    battery: { fixedCapacityKWh: capacityKWh, fixedPowerKw: powerKw },
    strategies: { fcrDUp: true },
  };
  const cfg = toLabConfig(input);
  const series = toTimeSeries(cfg, input);
  const plan = ancillaryPlan({
    ...cfg.ancillary,
    enabled: true,
    offeredPowerKw: offeredKw,
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
    capacityKWh,
    powerKw,
  });
  const held = out.ancillaryReservedPowerKwByHour;
  return { plan, out, max: Math.max(...held), avg: held.reduce((a, b) => a + b, 0) / 8760 };
}

describe("engine level: DK1 and DE physics", () => {
  for (const area of ["DK1", "DE"] as const) {
    it(`${area}: 100 % offered on 10 kW / 10 kWh is never paid above 8 kW`, () => {
      const r = runCase(area, 10, 10);
      expect(r.plan.upPowerKw).toBe(10); // 100 % offered stays allowed
      expect(r.max).toBeLessThanOrEqual(8 + 1e-6);
      expect(r.avg).toBeLessThan(8);
    });

    it(`${area}: 0 kW and 0 kWh give 0 FCR`, () => {
      expect(runCase(area, 10, 0).max).toBe(0);
      expect(runCase(area, 0, 10).max).toBe(0);
    });

    it(`${area}: a smaller battery can never be paid more`, () => {
      const small = runCase(area, 5, 3);
      const large = runCase(area, 30, 15);
      expect(small.max).toBeLessThanOrEqual(large.max + 1e-9);
      expect(small.max).toBeLessThanOrEqual(3 / 1.25 + 1e-6);
      expect(large.max).toBeLessThanOrEqual(15 / 1.25 + 1e-6);
    });

    it(`${area}: too little stored energy lowers the paid capacity`, () => {
      const tight = runCase(area, 2, 10);
      const roomy = runCase(area, 20, 10);
      expect(tight.avg).toBeLessThan(roomy.avg);
    });
  }

  /**
   * A much longer energy requirement must lower the paid capacity, tested WITHIN one
   * market (same country, prices and load). DE and DK1 are never compared against each
   * other — different countries, prices and tariffs, so their levels are not comparable.
   * Note: neighbouring endurance values are NOT strictly monotone at ANNUAL level,
   * because a smaller reservation changes the SOC trajectory and can raise capability in
   * later hours. The per-hour gate itself is monotone (see the solver tests above).
   */
  it("a much longer endurance requirement lowers the paid capacity", () => {
    expect(DE_ENDURANCE).toBeGreaterThan(DK1_ENDURANCE);
    const avgs: number[] = [];
    const input: BatteryEngineInput = {
      site: { country: "DE", mainFuseA: 25 },
      consumption: { annualKWh: 20000 },
      production: { enabled: true, kWp: 14 },
      battery: { fixedCapacityKWh: 10, fixedPowerKw: 10 },
      strategies: { fcrDUp: true },
    };
    const cfg = toLabConfig(input);
    const series = toTimeSeries(cfg, input);
    for (const endurance of [0.1, DK1_ENDURANCE, DE_ENDURANCE, 2]) {
      const p = ancillaryPlan({ ...cfg.ancillary, enabled: true, offeredPowerKw: 10 })!;
      const plan = {
        ...p,
        upEnergyKWh: 10 * endurance,
        downEnergyKWh: 10 * endurance,
      };
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
      avgs.push(
        out.ancillaryReservedPowerKwByHour.reduce((a, b) => a + b, 0) / 8760,
      );
    }
    // 2 h endurance is far stricter than 6 min and must pay clearly less.
    expect(avgs[avgs.length - 1]!).toBeLessThan(avgs[0]! * 0.9);
    // The DE requirement is stricter than DK1's and is never the highest-paid variant.
    expect(avgs[2]!).toBeLessThanOrEqual(avgs[0]! + 1e-9);
  });
});
