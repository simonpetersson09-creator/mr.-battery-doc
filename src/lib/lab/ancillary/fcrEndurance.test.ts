import { describe, expect, it } from "vitest";
import { toLabConfig, toTimeSeries } from "../../battery-engine/input";
import type { BatteryEngineInput } from "../../battery-engine/types";
import { computeGridLimits, dispatch, resolveWindow } from "../dispatch";
import { ancillaryPlan } from "./index";

/**
 * FCR-D ENDURANCE INVARIANT.
 *
 * Paid up-power may never require more deliverable energy than exists between the
 * worst-case SOC of the hour and the ACTIVE SERVICE FLOOR of the product combination.
 * The mirrored invariant holds for the down direction against the active service ceiling.
 * Both are checked hour by hour, for every active market.
 */

type Site = NonNullable<BatteryEngineInput["site"]>;

const MARKETS: { label: string; site: Site }[] = [
  { label: "SE", site: { country: "SE", mainFuseA: 25 } },
  { label: "DK2", site: { country: "DK", marketArea: "DK2", mainFuseA: 25 } },
  { label: "FI", site: { country: "FI", mainFuseA: 25 } },
];

/** Low / high / mid starting SOC, plus small-capacity-high-power and the reverse. */
const CASES: { name: string; capacityKWh: number; powerKw: number; initialSocPct: number }[] = [
  { name: "low SOC", capacityKWh: 10, powerKw: 10, initialSocPct: 10 },
  { name: "high SOC", capacityKWh: 10, powerKw: 10, initialSocPct: 90 },
  { name: "mid SOC", capacityKWh: 10, powerKw: 10, initialSocPct: 50 },
  { name: "small capacity / high power", capacityKWh: 5, powerKw: 10, initialSocPct: 50 },
  { name: "high capacity / low power", capacityKWh: 60, powerKw: 5, initialSocPct: 50 },
];

function check(site: Site, capacityKWh: number, powerKw: number, initialSocPct: number) {
  const input: BatteryEngineInput = {
    site,
    consumption: { annualKWh: 20000 },
    production: { enabled: true, kWp: 14 },
    battery: { fixedCapacityKWh: capacityKWh, fixedPowerKw: powerKw, initialSocPct },
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
  const limits = computeGridLimits(cfg.grid);
  const serviceFloor = Math.max(win.socFloorKWh, (plan.serviceMinSocPct / 100) * capacityKWh);
  const serviceCeil = Math.min(win.socCeilKWh, (plan.serviceMaxSocPct / 100) * capacityKWh);
  const upEndurance = plan.upPowerKw > 0 ? plan.upEnergyKWh / plan.upPowerKw : 0;
  const downEndurance = plan.downPowerKw > 0 ? plan.downEnergyKWh / plan.downPowerKw : 0;

  let worstUp = 0;
  let worstDown = 0;
  let paidUpHours = 0;
  let overPower = 0;
  let overGrid = 0;
  for (let h = 0; h < 8760; h++) {
    const up = out.ancillaryReservedPowerKwByHour[h] ?? 0;
    const down = out.ancillaryReservedDownPowerKwByHour[h] ?? 0;
    if (up > 1e-9) paidUpHours++;
    const s0 = h === 0 ? out.tallies.socStart : (out.socSeries[h - 1] ?? 0);
    const s1 = out.socSeries[h] ?? 0;
    const deliverable = Math.max(0, Math.min(s0, s1) - serviceFloor) * win.dischargeEff;
    const absorbable = Math.max(0, serviceCeil - Math.max(s0, s1)) / Math.max(win.chargeEff, 1e-9);
    worstUp = Math.max(worstUp, up * upEndurance - deliverable);
    worstDown = Math.max(worstDown, down * downEndurance - absorbable);
    overPower = Math.max(overPower, up - win.dischargeKw, down - win.chargeKw);
    const gridUp = (out.importSeries[h] ?? 0) + Math.max(0, limits.maxExportKw - (out.exportSeries[h] ?? 0));
    overGrid = Math.max(overGrid, up - gridUp);
  }
  return { worstUp, worstDown, paidUpHours, overPower, overGrid };
}

describe("FCR-D endurance invariant (up and down)", () => {
  for (const { label, site } of MARKETS) {
    for (const c of CASES) {
      it(`${label} – ${c.name}: paid power never exceeds the deliverable/absorbable energy`, () => {
        const r = check(site, c.capacityKWh, c.powerKw, c.initialSocPct);
        expect(r.worstUp).toBeLessThan(1e-6);
        expect(r.worstDown).toBeLessThan(1e-3);
        expect(r.overPower).toBeLessThan(1e-9);
        expect(r.overGrid).toBeLessThan(1e-9);
      });
    }
  }

  it("SE 10 kWh/10 kW hour 100 is clipped by the energy capability, not the grid", () => {
    const input: BatteryEngineInput = {
      site: { country: "SE", mainFuseA: 25 },
      consumption: { annualKWh: 20000 },
      production: { enabled: true, kWp: 14 },
      battery: { fixedCapacityKWh: 10, fixedPowerKw: 10 },
      strategies: { fcrDUp: true },
    };
    const cfg = toLabConfig(input);
    const series = toTimeSeries(cfg, input);
    const plan = ancillaryPlan({ ...cfg.ancillary, enabled: true, offeredPowerKw: 10 })!;
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
    // Active service floor is 20 % (FCR-D up) combined with FCR-D down's 80 % ceiling.
    expect(plan.serviceMinSocPct).toBe(20);
    expect(plan.serviceMaxSocPct).toBe(80);
    const paid = out.ancillaryReservedPowerKwByHour[100] ?? 0;
    expect(paid).toBeGreaterThan(8.0);
    expect(paid).toBeLessThan(8.2);
  });
});

/**
 * DIRECTION-SPECIFIC ENDURANCE. The up and down energy capabilities must be limited by
 * their OWN product endurance. With today's markets both directions declare 0.35 h, so
 * this is verified with a synthetic plan whose down endurance is much longer.
 */
describe("directional endurance limits each direction separately", () => {
  function run(upEnduranceH: number, downEnduranceH: number) {
    const capacityKWh = 10;
    const powerKw = 10;
    const input: BatteryEngineInput = {
      site: { country: "SE", mainFuseA: 25 },
      consumption: { annualKWh: 20000 },
      production: { enabled: true, kWp: 14 },
      battery: { fixedCapacityKWh: capacityKWh, fixedPowerKw: powerKw },
      strategies: { fcrDUp: true },
    };
    const cfg = toLabConfig(input);
    const series = toTimeSeries(cfg, input);
    const base = ancillaryPlan({ ...cfg.ancillary, enabled: true, offeredPowerKw: powerKw })!;
    const plan = {
      ...base,
      upEnergyKWh: base.upPowerKw * upEnduranceH,
      downEnergyKWh: base.downPowerKw * downEnduranceH,
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
      capacityKWh,
      powerKw,
    });
    const win = resolveWindow(cfg.battery, cfg.strategies, cfg.flex, capacityKWh, powerKw);
    const serviceFloor = Math.max(win.socFloorKWh, (plan.serviceMinSocPct / 100) * capacityKWh);
    const serviceCeil = Math.min(win.socCeilKWh, (plan.serviceMaxSocPct / 100) * capacityKWh);
    let worstUp = 0;
    let worstDown = 0;
    let sumUp = 0;
    let sumDown = 0;
    for (let h = 0; h < 8760; h++) {
      const up = out.ancillaryReservedPowerKwByHour[h] ?? 0;
      const down = out.ancillaryReservedDownPowerKwByHour[h] ?? 0;
      sumUp += up;
      sumDown += down;
      const s0 = h === 0 ? out.tallies.socStart : (out.socSeries[h - 1] ?? 0);
      const s1 = out.socSeries[h] ?? 0;
      const deliverable = Math.max(0, Math.min(s0, s1) - serviceFloor) * win.dischargeEff;
      const absorbable = Math.max(0, serviceCeil - Math.max(s0, s1)) / Math.max(win.chargeEff, 1e-9);
      worstUp = Math.max(worstUp, up * upEnduranceH - deliverable);
      worstDown = Math.max(worstDown, down * downEnduranceH - absorbable);
    }
    return { worstUp, worstDown, sumUp, sumDown };
  }

  it("a longer DOWN endurance constrains only the down direction", () => {
    const equal = run(0.35, 0.35);
    const longDown = run(0.35, 2);
    expect(equal.worstUp).toBeLessThan(1e-6);
    expect(equal.worstDown).toBeLessThan(1e-3);
    expect(longDown.worstUp).toBeLessThan(1e-6);
    expect(longDown.worstDown).toBeLessThan(1e-3);
    // The up side is untouched, the down side must shrink.
    expect(longDown.sumUp).toBeCloseTo(equal.sumUp, 6);
    expect(longDown.sumDown).toBeLessThan(equal.sumDown);
  });

  it("a longer UP endurance constrains only the up direction", () => {
    const equal = run(0.35, 0.35);
    const longUp = run(2, 0.35);
    expect(longUp.worstUp).toBeLessThan(1e-6);
    expect(longUp.sumUp).toBeLessThan(equal.sumUp);
  });
});
