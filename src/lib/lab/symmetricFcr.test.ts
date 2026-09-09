/**
 * SYMMETRIC FCR (Germany, DK1) — physics tests.
 *
 * Sign convention under test:
 *   UP   = more discharge / less charge  -> less import or more export
 *   DOWN = more charge / less discharge  -> more import or less export
 *
 * The symmetric product may never hold more than min(up, down) in any hour, and never
 * more than the upward product under otherwise identical conditions.
 */

import { describe, expect, it } from "vitest";
import { dispatch, computeGridLimits, type DispatchArgs } from "./dispatch";
import { defaultConfig, HOURS_PER_YEAR } from "./defaults";
import { buildSeries } from "./simulate";
import {
  ancillaryPlan,
  defaultAncillaryConfig,
  priceAreaForMarket,
  reserveModeForMarket,
} from "./ancillary";
import type { ReserveMode } from "./ancillary/types";

function args(opts: {
  mode: ReserveMode;
  offeredKw: number;
  capacityKWh?: number;
  powerKw?: number;
  fuseA?: number;
  minSocPct?: number;
  maxSocPct?: number;
  initialSocPct?: number;
  /** Freeze the battery: no other strategy moves the SOC, so it stays where it started. */
  idle?: boolean;
}): DispatchArgs {
  const cfg = defaultConfig();
  const series = buildSeries(cfg);
  const plan = ancillaryPlan({
    ...defaultAncillaryConfig(),
    enabled: true,
    offeredPowerKw: opts.offeredKw,
    reserveMode: opts.mode,
  })!;
  return {
    series,
    battery: {
      ...cfg.battery,
      minSocPct: opts.minSocPct ?? cfg.battery.minSocPct,
      maxSocPct: opts.maxSocPct ?? cfg.battery.maxSocPct,
      initialSocPct: opts.initialSocPct ?? cfg.battery.initialSocPct,
      ...(opts.idle ? { selfDischargePctPerMonth: 0, standbyW: 0 } : {}),
    },
    grid: { ...cfg.grid, mainFuseA: opts.fuseA ?? 25 },
    strategies: opts.idle
      ? {
          ...cfg.strategies,
          selfConsumption: false,
          reduceImport: false,
          peakShaving: false,
          arbitrage: false,
          backupReserve: false,
          ancillaryServices: true,
        }
      : { ...cfg.strategies, ancillaryServices: true },
    peak: cfg.peakShaving,
    spot: cfg.spot,
    flex: cfg.flex,
    ancillary: plan,
    capacityKWh: opts.capacityKWh ?? 20,
    powerKw: opts.powerKw ?? 10,
  };
}

const held = (o: ReturnType<typeof dispatch>) =>
  o.ancillaryReservedPowerKwByHour.reduce((a, b) => a + b, 0) / HOURS_PER_YEAR;

describe("reserve mode routing", () => {
  it("keeps Sweden, Finland and DK2 on the upward product", () => {
    expect(reserveModeForMarket("SE")).toBe("upward");
    expect(reserveModeForMarket("FI")).toBe("upward");
    expect(reserveModeForMarket("DK", "DK2")).toBe("upward");
  });

  it("puts Germany and DK1 on the symmetric product", () => {
    expect(reserveModeForMarket("DE")).toBe("symmetric");
    expect(reserveModeForMarket("DK", "DK1")).toBe("symmetric");
  });

  it("routes the price area without guessing a Danish zone", () => {
    expect(priceAreaForMarket("DK", "DK1")).toBe("DK1");
    expect(priceAreaForMarket("DK", "DK2")).toBe("DK2");
    expect(priceAreaForMarket("DK")).toBe("DK");
    expect(priceAreaForMarket("SE")).toBe("SE");
  });

  it("mirrors up and down power only in symmetric mode", () => {
    const base = { ...defaultAncillaryConfig(), enabled: true, offeredPowerKw: 8 };
    const up = ancillaryPlan({ ...base, reserveMode: "upward" })!;
    const sym = ancillaryPlan({ ...base, reserveMode: "symmetric" })!;
    expect(up.downPowerKw).toBe(0);
    expect(up.downEnergyKWh).toBe(0);
    expect(sym.downPowerKw).toBe(8);
    expect(sym.downEnergyKWh).toBeCloseTo(sym.upEnergyKWh, 9);
    expect(ancillaryPlan(base)!.reserveMode).toBe("upward");
  });
});

describe("symmetric FCR is bounded by the weaker direction", () => {
  it("never holds more than the upward product with the same offer", () => {
    for (const fuse of [16, 25, 63]) {
      const up = dispatch(args({ mode: "upward", offeredKw: 6, fuseA: fuse }));
      const sym = dispatch(args({ mode: "symmetric", offeredKw: 6, fuseA: fuse }));
      expect(held(sym)).toBeLessThanOrEqual(held(up) + 1e-9);
      expect(sym.ancillaryAvailabilityPct).toBeLessThanOrEqual(
        up.ancillaryAvailabilityPct + 1e-9,
      );
    }
  });

  it("reports the symmetric mode and both directions in the diagnostics", () => {
    const g = dispatch(args({ mode: "symmetric", offeredKw: 6 })).fcrGate;
    expect(g.reserveMode).toBe("symmetric");
    expect(g.reservableUpAvgKw).toBeGreaterThan(0);
    expect(g.reservableDownAvgKw).toBeGreaterThan(0);
    expect(["up", "down", "both"]).toContain(g.limitingDirection);
  });

  it("keeps the upward diagnostics directionless (down side unused)", () => {
    const g = dispatch(args({ mode: "upward", offeredKw: 6 })).fcrGate;
    expect(g.reserveMode).toBe("upward");
    expect(g.limitingDirection).toBe("up");
    expect(g.symmetricHeldPowerAvgKw).toBe(0);
  });

  it("holds nothing when one direction is physically impossible", () => {
    // A battery locked into a 1 %-wide SOC window has neither up nor down energy.
    const out = dispatch(
      args({ mode: "symmetric", offeredKw: 6, minSocPct: 49, maxSocPct: 50 }),
    );
    expect(held(out)).toBeCloseTo(0, 6);
  });

  it("A: a full battery is limited by DOWN (no free room to absorb)", () => {
    const g = dispatch(
      args({
        mode: "symmetric",
        offeredKw: 8,
        minSocPct: 5,
        maxSocPct: 100,
        initialSocPct: 100,
        idle: true,
      }),
    ).fcrGate;
    expect(g.reservableDownAvgKw).toBeLessThan(g.reservableUpAvgKw);
    expect(g.reservableDownAvgKw).toBeCloseTo(0, 6);
    expect(g.limitingDirection).toBe("down");
  });

  it("B: an empty battery is limited by UP (no stored energy to deliver)", () => {
    const g = dispatch(
      args({
        mode: "symmetric",
        offeredKw: 8,
        minSocPct: 5,
        maxSocPct: 100,
        initialSocPct: 5,
        idle: true,
      }),
    ).fcrGate;
    // Readiness charging may lift the SOC somewhat, but the up side stays the binding one.
    expect(g.reservableUpAvgKw).toBeLessThan(g.reservableDownAvgKw);
    expect(g.limitingDirection).toBe("up");
  });

  it("C: a mid-SOC battery has headroom in both directions", () => {
    const g = dispatch(
      args({
        mode: "symmetric",
        offeredKw: 8,
        minSocPct: 5,
        maxSocPct: 100,
        initialSocPct: 50,
        idle: true,
      }),
    ).fcrGate;
    expect(g.reservableUpAvgKw).toBeGreaterThan(0);
    expect(g.reservableDownAvgKw).toBeGreaterThan(0);
  });
});

describe("8760-hour falsification of a symmetric case", () => {
  const a = args({ mode: "symmetric", offeredKw: 8, capacityKWh: 30, powerKw: 15, fuseA: 25 });
  const out = dispatch(a);
  const limits = computeGridLimits(a.grid);

  it("never violates power, grid or SOC limits in any hour", () => {
    let violations = 0;
    for (let h = 0; h < HOURS_PER_YEAR; h++) {
      const kw = out.ancillaryReservedPowerKwByHour[h] ?? 0;
      const imp = out.importSeries[h] ?? 0;
      const exp = out.exportSeries[h] ?? 0;
      const soc = out.socSeries[h] ?? 0;
      const gridUp = imp + Math.max(0, limits.maxExportKw - exp);
      const gridDown = exp + Math.max(0, limits.maxImportKw - imp);
      if (kw > out.window.dischargeKw + 1e-6) violations++;
      if (kw > out.window.chargeKw + 1e-6) violations++;
      if (kw > gridUp + 1e-6) violations++;
      if (kw > gridDown + 1e-6) violations++;
      if (imp > limits.maxImportKw + 1e-6) violations++;
      if (exp > limits.maxExportKw + 1e-6) violations++;
      if (soc < out.window.socFloorKWh - 1e-6) violations++;
      if (soc > out.window.socCeilKWh + 1e-6) violations++;
    }
    expect(violations).toBe(0);
  });

  it("keeps a huge inverter behind a small fuse inside the connection", () => {
    const b = args({ mode: "symmetric", offeredKw: 60, capacityKWh: 100, powerKw: 60, fuseA: 16 });
    const o = dispatch(b);
    const l = computeGridLimits(b.grid);
    for (let h = 0; h < HOURS_PER_YEAR; h++) {
      expect(o.importSeries[h] ?? 0).toBeLessThanOrEqual(l.maxImportKw + 1e-6);
      expect(o.exportSeries[h] ?? 0).toBeLessThanOrEqual(l.maxExportKw + 1e-6);
      const kw = o.ancillaryReservedPowerKwByHour[h] ?? 0;
      const gridDown =
        (o.exportSeries[h] ?? 0) + Math.max(0, l.maxImportKw - (o.importSeries[h] ?? 0));
      expect(kw).toBeLessThanOrEqual(gridDown + 1e-6);
    }
  });
});
