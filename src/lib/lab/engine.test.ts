import { describe, expect, it } from "vitest";
import { DEFAULT_LOAD_MONTH_SHARE, DEFAULT_PV_MONTH_SHARE, defaultConfig, HOURS_PER_YEAR, spreadAnnual } from "./defaults";
import { buildLoadSeries, buildPvSeries, monthlySums } from "./profiles";
import { computeGridLimits, dispatch, resolveWindow } from "./dispatch";
import { buildSeries, simulate } from "./simulate";
import { adaptivePowerSteps, findSweetSpot, runSweep } from "./sweep";
import { sizePower, usefulEnergyKWh } from "./powerSizing";
import type { LabConfig, LoadProfileShape } from "./types";
import {
  applyLoadProfile,
  CUSTOMER_LOAD_PROFILES,
  hourWeightsOf,
  INTERNAL_LOAD_PROFILES,
  isWeekendDay,
  LOAD_PROFILES,
} from "./loadProfiles";

/** Turns off the parasitic standby/self-discharge model for pure physics cases. */
function noParasitics(c: LabConfig): void {
  c.battery.standbyW = 0;
  c.battery.selfDischargePctPerMonth = 0;
}

function cfg(patch: (c: LabConfig) => void = () => {}): LabConfig {
  const c = defaultConfig();
  patch(c);
  return c;
}

describe("defaults", () => {
  it("peak shaving target reduction defaults to 20 %", () => {
    expect(defaultConfig().peakShaving.targetReductionPct).toBe(20);
  });
});

describe("synthetic profiles", () => {
  it("load series sums exactly to each monthly input", () => {
    const c = cfg();
    const load = buildLoadSeries(c.consumption);
    expect(load).toHaveLength(HOURS_PER_YEAR);
    monthlySums(load).forEach((s, i) => {
      expect(s).toBeCloseTo(c.consumption.monthlyKWh[i] ?? 0, 6);
    });
  });

  it("all load shapes keep monthly totals", () => {
    for (const shape of ["normal", "day-heavy", "evening-heavy"] as const) {
      const c = cfg((x) => (x.consumption.shape = shape));
      monthlySums(buildLoadSeries(c.consumption)).forEach((s, i) =>
        expect(s).toBeCloseTo(c.consumption.monthlyKWh[i] ?? 0, 6),
      );
    }
  });

  it("pv series sums exactly to each monthly input after AC clipping", () => {
    const c = cfg();
    const { pv } = buildPvSeries(c.solar);
    monthlySums(pv).forEach((s, i) => expect(s).toBeCloseTo(c.solar.monthlyKWh[i] ?? 0, 6));
    expect(Math.max(...pv)).toBeLessThanOrEqual(c.solar.inverterAcKw + 1e-6);
  });

  it("annual spread reproduces the annual total", () => {
    const m = spreadAnnual(20000, defaultConfig().consumption.monthlyKWh.map(() => 1));
    expect(m.reduce((a, b) => a + b, 0)).toBeCloseTo(20000, 6);
  });
});

describe("battery physics", () => {
  it("keeps SOC inside the window and respects power limits", () => {
    const c = cfg((x) => {
      x.strategies.arbitrage = false;
      x.battery.minSocPct = 10;
      x.battery.maxSocPct = 90;
      noParasitics(x);
    });
    const series = buildSeries(c);
    const d = dispatch({
      series,
      battery: c.battery,
      grid: c.grid,
      strategies: c.strategies,
      peak: c.peakShaving,
      spot: c.spot,
      flex: c.flex,
      capacityKWh: 10,
      powerKw: 5,
    });
    const floor = d.window.socFloorKWh;
    const ceil = d.window.socCeilKWh;
    for (const soc of d.socSeries) {
      expect(soc).toBeGreaterThanOrEqual(floor - 1e-9);
      expect(soc).toBeLessThanOrEqual(ceil + 1e-9);
    }
    // no hour may both charge and discharge, and power is bounded
    let prev = d.tallies.socStart;
    for (const soc of d.socSeries) {
      expect(Math.abs(soc - prev)).toBeLessThanOrEqual(5 + 1e-6);
      prev = soc;
    }
  });

  it("round-trip efficiency shows up as losses", () => {
    const c = cfg((x) => {
      x.battery.roundTripEfficiency = 0.8;
      x.battery.initialSocPct = x.battery.minSocPct;
    });
    const r = simulate(c, buildSeries(c), 10, 5);
    expect(r.lossesKWh).toBeGreaterThan(0);
    // discharged/charged ratio must not exceed the round-trip efficiency
    expect(r.dischargedKWh / r.chargedKWh).toBeLessThanOrEqual(0.8 + 1e-6);
  });

  it("energy balance holds for every sweep combination", () => {
    const c = cfg((x) => {
      x.sweep.capacitiesKWh = [0, 5, 10, 20];
      x.sweep.powersKw = [3, 5];
      x.strategies.peakShaving = true;
    });
    for (const r of runSweep(c).results) {
      expect(r.energyBalance.ok, `${r.capacityKWh}/${r.powerKw}: ${r.energyBalance.residualKWh}`).toBe(
        true,
      );
    }
  });

  it("respects import and export limits", () => {
    const c = cfg((x) => {
      x.grid.maxImportKw = 4;
      x.grid.maxExportKw = 2;
    });
    const series = buildSeries(c);
    const d = dispatch({
      series,
      battery: c.battery,
      grid: c.grid,
      strategies: c.strategies,
      peak: c.peakShaving,
      spot: c.spot,
      flex: c.flex,
      capacityKWh: 10,
      powerKw: 5,
    });
    expect(Math.max(...d.importSeries)).toBeLessThanOrEqual(4 + 1e-9);
    expect(Math.max(...d.exportSeries)).toBeLessThanOrEqual(2 + 1e-9);
  });

  it("derives physical grid limits from fuse and phases", () => {
    const l = computeGridLimits({
      mainFuseA: 25,
      phases: 3,
      voltageV: 400,
      maxImportKw: 0,
      maxExportKw: 0,
      importMarginPct: 100,
      exportMarginPct: 100,
    });
    expect(l.fuseKw).toBeCloseTo(17.32, 2);
    expect(l.physicalImportKw).toBeCloseTo(17.32, 2);
    expect(l.maxImportKw).toBeCloseTo(17.32, 2);
  });

  it("computes single-phase capacity as U x I", () => {
    const l = computeGridLimits({
      mainFuseA: 16,
      phases: 1,
      voltageV: 230,
      maxImportKw: 0,
      maxExportKw: 0,
      importMarginPct: 100,
      exportMarginPct: 100,
    });
    expect(l.fuseKw).toBeCloseTo(3.68, 6);
  });

  it("separates the physical limit from the operational design margin", () => {
    const l = computeGridLimits({
      mainFuseA: 16,
      phases: 3,
      voltageV: 400,
      maxImportKw: 0,
      maxExportKw: 0,
      importMarginPct: 90,
      exportMarginPct: 95,
    });
    expect(l.physicalImportKw).toBeCloseTo(11.09, 2);
    expect(l.maxImportKw).toBeCloseTo(9.98, 2);
    expect(l.maxExportKw).toBeCloseTo(10.53, 2);
    expect(l.maxImportKw).toBeLessThanOrEqual(l.physicalImportKw);
    expect(l.maxExportKw).toBeLessThanOrEqual(l.physicalExportKw);
  });

  it("standby and self-discharge never push SOC below the allowed floor", () => {
    const c = cfg((x) => {
      x.battery.standbyW = 50;
      x.battery.selfDischargePctPerMonth = 5;
      x.consumption.annualKWh = 20000;
      x.consumption.monthlyKWh = spreadAnnual(20000, defaultConfig().consumption.monthlyKWh);
      x.solar.monthlyKWh = spreadAnnual(15000, defaultConfig().solar.monthlyKWh);
    });
    const series = buildSeries(c);
    const win = resolveWindow(c.battery, c.strategies, c.flex, 15, 3);
    const d = dispatch({
      series,
      battery: c.battery,
      grid: c.grid,
      strategies: c.strategies,
      peak: c.peakShaving,
      spot: c.spot,
      flex: c.flex,
      capacityKWh: 15,
      powerKw: 3,
    });
    expect(Math.min(...d.socSeries)).toBeGreaterThanOrEqual(win.socFloorKWh - 1e-9);
    expect(d.tallies.socEnd).toBeGreaterThanOrEqual(win.socFloorKWh - 1e-9);
  });

  it("keeps all grid flows inside the operational limit and reports margin effects", () => {
    const c = cfg((x) => {
      x.grid.mainFuseA = 16;
      x.grid.importMarginPct = 90;
      x.grid.exportMarginPct = 95;
      x.consumption.annualKWh = 20000;
      x.consumption.monthlyKWh = spreadAnnual(20000, defaultConfig().consumption.monthlyKWh);
      x.solar.monthlyKWh = spreadAnnual(24000, defaultConfig().solar.monthlyKWh);
    });
    const series = buildSeries(c);
    const s = simulate(c, series, 15, 5);
    expect(s.grid.maxActualImportKw).toBeLessThanOrEqual(s.grid.operationalImportKw + 1e-9);
    expect(s.grid.maxActualExportKw).toBeLessThanOrEqual(s.grid.operationalExportKw + 1e-9);
    expect(s.grid.exportCurtailedByMarginKWh).toBeLessThanOrEqual(
      s.grid.exportCurtailedKWh + 1e-9,
    );
    expect(s.energyBalance.ok).toBe(true);
  });
});


describe("baseline and monotonicity", () => {
  it("0 kWh battery reproduces the no-battery baseline", () => {
    const c = cfg();
    const r = simulate(c, buildSeries(c), 0, 0);
    expect(r.importKWh).toBeCloseTo(r.baseImportKWh, 9);
    expect(r.exportKWh).toBeCloseTo(r.baseExportKWh, 9);
    expect(r.chargedKWh).toBe(0);
    expect(r.dischargedKWh).toBe(0);
    expect(r.capexKr).toBe(0);
  });

  it("a bigger battery never has less usable storage", () => {
    const c = cfg();
    let prev = -1;
    for (const cap of [2.5, 5, 10, 20, 30]) {
      const r = simulate(c, buildSeries(c), cap, 5);
      expect(r.usableKWh).toBeGreaterThanOrEqual(prev);
      prev = r.usableKWh;
    }
  });

  it("a bigger battery never shifts less energy", () => {
    const c = cfg();
    const series = buildSeries(c);
    let prev = -1;
    for (const cap of [0, 2.5, 5, 10, 15, 20]) {
      const r = simulate(c, series, cap, 5);
      expect(r.shiftedKWh).toBeGreaterThanOrEqual(prev - 1e-6);
      prev = r.shiftedKWh;
    }
  });
});

describe("no double counting between strategies", () => {
  it("flex reservation shrinks the window available to energy strategies", () => {
    const base = cfg();
    const withFlex = cfg((x) => {
      x.strategies.flexibility = true;
      x.flex.enabled = true;
      x.flex.reservedPowerKw = 2;
      x.flex.enduranceHours = 2;
    });
    const a = simulate(base, buildSeries(base), 10, 5);
    const b = simulate(withFlex, buildSeries(withFlex), 10, 5);
    expect(b.usableKWh).toBeLessThan(a.usableKWh);
    expect(b.shiftedKWh).toBeLessThanOrEqual(a.shiftedKWh + 1e-9);
    expect(b.flexReservedKWh).toBeGreaterThan(0);
  });

  it("backup reserve is never discharged", () => {
    const c = cfg((x) => {
      x.strategies.backupReserve = true;
      x.battery.reserveSocPct = 40;
      noParasitics(x);
    });
    const w = resolveWindow(c.battery, c.strategies, c.flex, 10, 5);
    expect(w.socFloorKWh).toBeCloseTo(4, 9);
    const series = buildSeries(c);
    const d = dispatch({
      series,
      battery: c.battery,
      grid: c.grid,
      strategies: c.strategies,
      peak: c.peakShaving,
      spot: c.spot,
      flex: c.flex,
      capacityKWh: 10,
      powerKw: 5,
    });
    expect(Math.min(...d.socSeries)).toBeGreaterThanOrEqual(4 - 1e-9);
  });

  it("charging and discharging cannot happen in the same hour", () => {
    const c = cfg((x) => {
      x.strategies.arbitrage = true;
      x.spot.enabled = true;
      x.spot.series = Array.from({ length: 24 }, (_, h) => (h >= 17 && h <= 20 ? 2.5 : 0.3));
      x.spot.minSpread = 0.1;
    });
    const series = buildSeries(c);
    const d = dispatch({
      series,
      battery: c.battery,
      grid: c.grid,
      strategies: c.strategies,
      peak: c.peakShaving,
      spot: c.spot,
      flex: c.flex,
      capacityKWh: 10,
      powerKw: 5,
    });
    // Import and export in the same hour would signal simultaneous flows.
    for (let h = 0; h < HOURS_PER_YEAR; h++) {
      const imp = d.importSeries[h] ?? 0;
      const exp = d.exportSeries[h] ?? 0;
      expect(Math.min(imp, exp)).toBeLessThan(1e-9);
    }
  });
});

describe("golden cases", () => {
  it("flat load, no PV, no strategy: battery stays idle", () => {
    const c = cfg((x) => {
      x.consumption.monthlyKWh = x.consumption.monthlyKWh.map(() => 1000);
      x.solar.enabled = false;
      noParasitics(x);
      x.solar.monthlyKWh = x.solar.monthlyKWh.map(() => 0);
      x.strategies = {
        selfConsumption: false,
        reduceImport: false,
        peakShaving: false,
        arbitrage: false,
        curtailmentRecovery: false,
        backupReserve: false,
        flexibility: false,
      ancillaryServices: false,
      };
    });
    const r = simulate(c, buildSeries(c), 10, 5);
    expect(r.annualLoadKWh).toBeCloseTo(12000, 6);
    expect(r.chargedKWh).toBeCloseTo(0, 9);
    expect(r.importKWh).toBeCloseTo(12000, 6);
    expect(r.energyBalance.ok).toBe(true);
  });

  it("known 4 kWh surplus / 4 kWh deficit day: 90% RTE gives 10% loss", () => {
    // 1 kWh/h load all hours, PV producing 8 kWh over the day -> 4 kWh surplus.
    const c = cfg((x) => {
      x.consumption.monthlyKWh = [744, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0].map((v) => v * 1);
      x.solar.monthlyKWh = [31 * 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      x.battery.roundTripEfficiency = 0.9;
      x.battery.initialSocPct = 5;
      x.grid.maxExportKw = 100;
      x.grid.maxImportKw = 100;
      noParasitics(x);
    });
    const r = simulate(c, buildSeries(c), 10, 5);
    // charged energy is AC in, discharged is AC out; loss must be the RTE gap
    expect(r.lossesKWh / r.chargedKWh).toBeGreaterThan(0.05);
    expect(r.lossesKWh / r.chargedKWh).toBeLessThan(0.15);
    expect(r.energyBalance.ok).toBe(true);
  });

  it("full-year PV self-consumption improves versus baseline", () => {
    const c = cfg();
    const r = simulate(c, buildSeries(c), 10, 5);
    expect(r.selfConsumptionPct).toBeGreaterThan(r.baseSelfConsumptionPct);
    expect(r.selfSufficiencyPct).toBeGreaterThan(r.baseSelfSufficiencyPct);
    expect(r.importKWh).toBeLessThan(r.baseImportKWh);
  });
});

describe("peak shaving and sweet spot", () => {
  it("peak shaving lowers the modelled peak and is flagged as modelled", () => {
    const c = cfg((x) => {
      x.strategies.peakShaving = true;
      x.peakShaving.targetReductionPct = 30;
      noParasitics(x);
    });
    const r = simulate(c, buildSeries(c), 20, 10);
    expect(r.peakIsModelled).toBe(true);
    // Summer months have PV energy in the battery, so their modelled peak drops.
    const june = 5;
    expect(r.monthlyPeakKw[june] ?? 0).toBeLessThan(r.baseMonthlyPeakKw[june] ?? 0);
    expect(r.modelledPeakKw).toBeLessThanOrEqual(r.baseModelledPeakKw + 1e-9);
  });

  it("sweet spot follows the configurable marginal rule", () => {
    const c = cfg();
    const sweep = runSweep(c);
    expect(sweep.sweetSpot.recommendedCapacityKWh).toBeGreaterThan(0);
    expect(sweep.sweetSpot.steps.length).toBeGreaterThan(3);
    // A stricter threshold can never recommend a larger battery.
    const strict = findSweetSpot(sweep.results, { ...c.sweetSpot, minRelativeGainPct: 40 });
    expect(strict.recommendedCapacityKWh).toBeLessThanOrEqual(
      sweep.sweetSpot.recommendedCapacityKWh,
    );
  });

  it("demand charge economics never change the physics", () => {
    const a = cfg();
    const b = cfg((x) => {
      x.demandCharge.enabled = true;
      x.demandCharge.krPerKw = 200;
    });
    const ra = simulate(a, buildSeries(a), 10, 5);
    const rb = simulate(b, buildSeries(b), 10, 5);
    expect(rb.importKWh).toBeCloseTo(ra.importKWh, 9);
    expect(rb.dischargedKWh).toBeCloseTo(ra.dischargedKWh, 9);
    expect(rb.annualSavingsKr).not.toBeCloseTo(ra.annualSavingsKr, 3);
  });
});

describe("day-to-day variability", () => {
  it("keeps monthly totals exact and creates uneven days", () => {
    const c = defaultConfig();
    const load = buildLoadSeries(c.consumption, c.variability);
    monthlySums(load).forEach((s, i) =>
      expect(s).toBeCloseTo(c.consumption.monthlyKWh[i]!, 6),
    );
    const { pv } = buildPvSeries(c.solar, c.variability);
    monthlySums(pv).forEach((s, i) => expect(s).toBeCloseTo(c.solar.monthlyKWh[i]!, 6));

    const daySum = (a: number[], d: number) =>
      a.slice(d * 24, d * 24 + 24).reduce((x, y) => x + y, 0);
    expect(Math.abs(daySum(pv, 180) - daySum(pv, 181))).toBeGreaterThan(0.5);
  });

  it("is deterministic for a given seed", () => {
    const c = defaultConfig();
    const a = buildPvSeries(c.solar, c.variability).pv;
    const b = buildPvSeries(c.solar, c.variability).pv;
    expect(a).toEqual(b);
  });
});

describe("hardening regressions", () => {
  it("flex availability measures real endurance and is not ~100% by definition", () => {
    const c = cfg((x) => {
      x.strategies.flexibility = true;
      x.flex.enabled = true;
      x.flex.reservedPowerKw = 2;
      x.flex.enduranceHours = 1;
    });
    const r = simulate(c, buildSeries(c), 15, 5);
    expect(r.flexAvailabilityPct).toBeGreaterThan(0);
    expect(r.flexAvailabilityPct).toBeLessThan(99);

    // Physically impossible reservation -> 0 % availability.
    const c2 = cfg((x) => {
      x.strategies.flexibility = true;
      x.flex.enabled = true;
      x.flex.reservedPowerKw = 20;
      x.flex.enduranceHours = 4;
    });
    const r2 = simulate(c2, buildSeries(c2), 5, 3);
    expect(r2.flexAvailabilityPct).toBe(0);
  });

  it("charging still happens when a planned discharge delivered 0 kWh", () => {
    const c = cfg((x) => {
      x.solar.enabled = false;
      x.solar.monthlyKWh = x.solar.monthlyKWh.map(() => 0);
      x.consumption.monthlyKWh = x.consumption.monthlyKWh.map(() => 700);
      x.variability.enabled = false;
      x.strategies.reduceImport = true; // wants to discharge every hour
      x.strategies.arbitrage = true;
      x.spot.enabled = true;
      x.spot.series = Array.from({ length: 24 }, (_, h) => (h >= 17 && h <= 20 ? 2.5 : 0.3));
      x.spot.minSpread = 0.1;
      x.spot.expensiveQuantile = 0.95;
      x.battery.initialSocPct = 5; // starts empty: discharge is planned but delivers 0
    });
    const series = buildSeries(c);
    const d = dispatch({
      series,
      battery: c.battery,
      grid: c.grid,
      strategies: c.strategies,
      peak: c.peakShaving,
      spot: c.spot,
      flex: c.flex,
      capacityKWh: 10,
      powerKw: 5,
    });
    expect(d.tallies.chargedFromGridKWh).toBeGreaterThan(0);
  });

  it("uses the real month index for peak-shaving thresholds", () => {
    const c = cfg((x) => {
      x.strategies.peakShaving = true;
      x.peakShaving.activeMonths = [1];
    });
    const series = buildSeries(c);
    const d = dispatch({
      series,
      battery: c.battery,
      grid: c.grid,
      strategies: c.strategies,
      peak: c.peakShaving,
      spot: c.spot,
      flex: c.flex,
      capacityKWh: 10,
      powerKw: 5,
    });
    expect(Number.isFinite(d.monthlyPeakThresholdKw[0] ?? Infinity)).toBe(true);
    for (let m = 1; m < 12; m++) expect(d.monthlyPeakThresholdKw[m]).toBe(Infinity);
  });

  it("inverter clipping loses energy instead of moving it to other hours", () => {
    const c = cfg((x) => {
      x.solar.inverterAcKw = 3; // deliberately small versus 12 kWp
      x.variability.enabled = true;
      x.variability.pvVariationPct = 60;
    });
    const { pv, clipped } = buildPvSeries(c.solar, c.variability);
    const cap = c.solar.inverterAcKw;
    for (const v of pv) expect(v).toBeLessThanOrEqual(cap + 1e-9);
    const clippedSum = clipped.reduce((a, b) => a + b, 0);
    expect(clippedSum).toBeGreaterThan(0);
    monthlySums(pv).forEach((s, i) => {
      expect(s).toBeLessThanOrEqual((c.solar.monthlyKWh[i] ?? 0) + 1e-6);
    });
  });

  it("battery losses are not counted as self-consumed solar", () => {
    const c = cfg();
    const r = simulate(c, buildSeries(c), 15, 5);
    const selfKWh = (r.selfConsumptionPct / 100) * r.annualPvKWh;
    const pvExport = Math.max(0, r.exportKWh - 0);
    const oldFormula = r.annualPvKWh - pvExport;
    expect(r.lossesKWh).toBeGreaterThan(0);
    expect(selfKWh).toBeLessThan(oldFormula);
    // self-consumed solar can never exceed the load actually served
    expect(selfKWh).toBeLessThanOrEqual(r.annualLoadKWh + 1e-6);
  });

  it("models standby draw and self-discharge transparently", () => {
    const c = cfg();
    const r = simulate(c, buildSeries(c), 15, 5);
    expect(r.standbyKWh).toBeCloseTo((c.battery.standbyW / 1000) * HOURS_PER_YEAR, 6);
    expect(r.selfDischargeKWh).toBeGreaterThan(0);
    expect(r.lossesKWh).toBeGreaterThanOrEqual(r.standbyKWh + r.selfDischargeKWh);
    expect(r.energyBalance.ok).toBe(true);

    // no battery -> no parasitic losses at all
    const base = simulate(c, buildSeries(c), 0, 0);
    expect(base.standbyKWh).toBe(0);
    expect(base.selfDischargeKWh).toBe(0);

    // switching the model off removes the losses again
    const c2 = cfg((x) => noParasitics(x));
    const r2 = simulate(c2, buildSeries(c2), 15, 5);
    expect(r2.standbyKWh).toBe(0);
    expect(r2.selfDischargeKWh).toBe(0);
    expect(r2.energyBalance.ok).toBe(true);
  });

  it("cycle cap is pro-rata over the year instead of spent in January", () => {
    const c = cfg((x) => {
      x.battery.maxCyclesPerYear = 50;
    });
    const series = buildSeries(c);
    const d = dispatch({
      series,
      battery: c.battery,
      grid: c.grid,
      strategies: c.strategies,
      peak: c.peakShaving,
      spot: c.spot,
      flex: c.flex,
      capacityKWh: 15,
      powerKw: 5,
    });
    const cycles = d.tallies.dischargedKWh / d.window.usableKWh;
    expect(cycles).toBeLessThanOrEqual(50 * (1 + 1 / 12) + 1e-6);
    // still active late in the year (the pro-rata budget saturates in December,
    // so the check covers the last quarter, not the final month).
    const lastQuarterStart = HOURS_PER_YEAR - 92 * 24;
    let dischargedLastQuarter = 0;
    for (let h = lastQuarterStart + 1; h < HOURS_PER_YEAR; h++) {
      const drop = (d.socSeries[h - 1] ?? 0) - (d.socSeries[h] ?? 0);
      if (drop > 0) dischargedLastQuarter += drop;
    }
    expect(dischargedLastQuarter).toBeGreaterThan(0);
    // and not everything in January
    let january = 0;
    for (let h = 1; h < 31 * 24; h++) {
      const drop = (d.socSeries[h - 1] ?? 0) - (d.socSeries[h] ?? 0);
      if (drop > 0) january += drop;
    }
    expect(january).toBeLessThan(d.tallies.dischargedKWh * 0.5);
  });
});

describe("load profile catalogue", () => {
  const ids = LOAD_PROFILES.map((p) => p.id);

  it("every profile keeps exactly the same annual energy", () => {
    for (const id of ids) {
      const c = cfg((x) => (x.consumption = applyLoadProfile(x.consumption, id)));
      const load = buildLoadSeries(c.consumption, c.variability);
      const annual = load.reduce((a, b) => a + b, 0);
      expect(annual).toBeCloseTo(10000, 4);
      expect(c.consumption.monthlyKWh.reduce((a, b) => a + b, 0)).toBe(10000);
    }
  });

  it("monthly distribution differs as intended between profiles", () => {
    const winterShare = (id: (typeof ids)[number]) => {
      const m = applyLoadProfile(defaultConfig().consumption, id).monthlyKWh;
      return ((m[0] ?? 0) + (m[1] ?? 0) + (m[11] ?? 0)) / 10000;
    };
    expect(winterShare("direct-electric")).toBeGreaterThan(winterShare("heat-pump"));
    expect(winterShare("heat-pump")).toBeGreaterThan(winterShare("normal"));
    expect(winterShare("pool-summer")).toBeLessThan(winterShare("normal"));
    const summer = (id: (typeof ids)[number]) => {
      const m = applyLoadProfile(defaultConfig().consumption, id).monthlyKWh;
      return ((m[5] ?? 0) + (m[6] ?? 0) + (m[7] ?? 0)) / 10000;
    };
    expect(summer("pool-summer")).toBeGreaterThan(summer("direct-electric"));
  });

  it("diurnal pattern differs as intended between profiles", () => {
    const share = (id: (typeof ids)[number], hours: number[]) => {
      const w = hourWeightsOf(id);
      const total = w.reduce((a, b) => a + b, 0);
      return hours.reduce((a, h) => a + (w[h] ?? 0), 0) / total;
    };
    const night = [22, 23, 0, 1, 2, 3, 4, 5];
    const evening = [16, 17, 18, 19, 20, 21, 22];
    const midday = [10, 11, 12, 13, 14, 15];
    expect(share("ev-night", night)).toBeGreaterThan(share("normal", night));
    expect(share("ev-evening", evening)).toBeGreaterThan(share("normal", evening));
    expect(share("day-heavy", midday)).toBeGreaterThan(share("normal", midday));
    expect(share("evening-heavy", midday)).toBeLessThan(share("normal", midday));
    expect(share("evening-heavy", evening)).toBeGreaterThan(share("normal", evening));
    const flat = hourWeightsOf("flat");
    expect(Math.max(...flat) - Math.min(...flat)).toBeLessThan(0.15);
    const peaky = hourWeightsOf("low-base-peaks");
    expect(Math.max(...peaky) / Math.min(...peaky)).toBeGreaterThan(4);
  });

  it("never produces negative load and is deterministic", () => {
    for (const id of ids) {
      const c = cfg((x) => (x.consumption = applyLoadProfile(x.consumption, id)));
      const a = buildLoadSeries(c.consumption, c.variability);
      const b = buildLoadSeries(c.consumption, c.variability);
      expect(Math.min(...a)).toBeGreaterThanOrEqual(0);
      expect(a).toEqual(b);
    }
  });

  it("energy balance stays exact for every profile", () => {
    for (const id of ids) {
      const c = cfg((x) => (x.consumption = applyLoadProfile(x.consumption, id)));
      const series = buildSeries(c);
      const r = simulate(c, series, 15, 5);
      expect(r.energyBalance.ok).toBe(true);
      expect(Math.abs(r.energyBalance.residualKWh)).toBeLessThan(1e-6);
    }
  });

  it("weekday/weekend split keeps every month exactly on target", () => {
    for (const id of ids) {
      const c = cfg((x) => (x.consumption = applyLoadProfile(x.consumption, id)));
      const load = buildLoadSeries(c.consumption, undefined);
      const sums = monthlySums(load);
      sums.forEach((v, mi) => expect(v).toBeCloseTo(c.consumption.monthlyKWh[mi] ?? 0, 6));
      expect(load.reduce((a, b) => a + b, 0)).toBeCloseTo(10000, 6);
      expect(load.every((v) => Number.isFinite(v) && v >= 0)).toBe(true);
    }
  });

  it("commercial profiles use clearly less energy on weekends", () => {
    const weekendRatio = (id: LoadProfileShape) => {
      const c = cfg((x) => (x.consumption = applyLoadProfile(x.consumption, id)));
      const load = buildLoadSeries(c.consumption, undefined);
      let we = 0;
      let wd = 0;
      let weDays = 0;
      let wdDays = 0;
      for (let d = 0; d < 365; d++) {
        let sum = 0;
        for (let k = 0; k < 24; k++) sum += load[d * 24 + k] ?? 0;
        if (isWeekendDay(d)) {
          we += sum;
          weDays++;
        } else {
          wd += sum;
          wdDays++;
        }
      }
      return we / weDays / (wd / wdDays);
    };
    expect(weekendRatio("office")).toBeLessThan(0.35);
    expect(weekendRatio("workshop")).toBeLessThan(0.25);
    // A shop is open on weekends — nearly the same daily energy.
    expect(weekendRatio("retail-restaurant")).toBeGreaterThan(0.85);
    // Households only shift the shape, not the daily amount.
    expect(weekendRatio("normal")).toBeGreaterThan(0.9);
  });

  it("electric heating is peakier than a normal villa in winter", () => {
    const peakMean = (id: LoadProfileShape, season: "winter" | "summer") => {
      const w = hourWeightsOf(id, { season });
      return Math.max(...w) / (w.reduce((a, b) => a + b, 0) / w.length);
    };
    const normal = peakMean("normal", "winter");
    expect(peakMean("heat-pump", "winter")).toBeGreaterThan(normal);
    expect(peakMean("direct-electric", "winter")).toBeGreaterThan(
      peakMean("heat-pump", "winter"),
    );
    // ... but not artificially extreme.
    expect(peakMean("direct-electric", "winter")).toBeLessThan(4);
    // Season changes the SHAPE, not just the level.
    expect(peakMean("heat-pump", "winter")).toBeGreaterThan(peakMean("heat-pump", "summer"));
  });

  it("no two customer profiles share the same diurnal shape", () => {
    const shapes = CUSTOMER_LOAD_PROFILES.map((p) => ({
      id: p.id,
      winter: hourWeightsOf(p.id, { season: "winter" }),
      summer: hourWeightsOf(p.id, { season: "summer" }),
      weekend: hourWeightsOf(p.id, { dayType: "weekend" }),
    }));
    const dist = (a: number[], b: number[]) =>
      a.reduce((acc, v, i) => acc + Math.abs(v - (b[i] ?? 0)), 0) / 24;
    for (let i = 0; i < shapes.length; i++) {
      for (let j = i + 1; j < shapes.length; j++) {
        const a = shapes[i]!;
        const b = shapes[j]!;
        const d = Math.max(
          dist(a.winter, b.winter),
          dist(a.summer, b.summer),
          dist(a.weekend, b.weekend),
        );
        expect(d, `${a.id} vs ${b.id}`).toBeGreaterThan(0.05);
      }
    }
  });

  it("internal stress profiles are not part of the customer catalogue", () => {
    const customerIds = CUSTOMER_LOAD_PROFILES.map((p) => p.id);
    expect(customerIds).not.toContain("flat");
    expect(customerIds).not.toContain("low-base-peaks");
    expect(customerIds.length).toBeGreaterThanOrEqual(12);
    expect(INTERNAL_LOAD_PROFILES.map((p) => p.id)).toEqual(["flat", "low-base-peaks"]);
  });
});

describe("power sizing (kW)", () => {
  it("physical need is the smallest power that reaches the utility threshold", () => {
    const c = cfg();
    const series = buildSeries(c);
    for (const cap of [5, 10, 15, 20, 25, 30]) {
      const s = sizePower(c, series, cap);
      const point = s.curve.find((p) => p.powerKw === s.physicalNeedKw)!;
      expect(point.pctOfReference).toBeGreaterThanOrEqual(c.powerSizing.utilityThresholdPct - 1e-6);
      const smaller = s.curve.filter((p) => p.powerKw < s.physicalNeedKw);
      for (const p of smaller)
        expect(p.pctOfReference).toBeLessThan(c.powerSizing.utilityThresholdPct);
      // Physical need scales with capacity but stays far below 1 C.
      expect(s.physicalCRate).toBeLessThan(0.5);
    }
  });

  it("physical need grows monotonically with capacity", () => {
    const c = cfg();
    const series = buildSeries(c);
    const needs = [5, 10, 15, 20, 25, 30].map((cap) => sizePower(c, series, cap).physicalNeedKw);
    for (let i = 1; i < needs.length; i++) expect(needs[i]!).toBeGreaterThanOrEqual(needs[i - 1]!);
  });

  it("upgrades any capacity only on verified gain, with no capacity gate", () => {
    const c = cfg();
    const series = buildSeries(c);
    for (const cap of [5, 10, 15, 20, 25, 30]) {
      const s = sizePower(c, series, cap);
      expect(s.productKw).toBeGreaterThanOrEqual(c.powerSizing.basePowerKw);
      if (s.upgradeApplied) {
        // An upgrade must be backed by real extra useful energy, not binding hours.
        expect(s.upgradeGainPct).toBeGreaterThanOrEqual(c.powerSizing.upgradeMinGainPct);
        expect(s.upgradeGainKWh).toBeGreaterThan(0);
      } else {
        expect(s.productKw).toBeCloseTo(c.powerSizing.basePowerKw, 9);
      }
    }
  });

  it("a small power-intensive battery may be recommended above the base power", () => {
    // Short, concentrated evening load + a small battery: the physical need is what
    // decides, not the capacity. Whatever the outcome, it must be simulation-backed.
    const c = cfg((x) => {
      x.consumption.shape = "ev-evening";
      x.powerSizing.basePowerKw = 2;
    });
    const series = buildSeries(c);
    const s = sizePower(c, series, 10);
    expect(s.productKw).toBeGreaterThanOrEqual(2);
    if (s.productKw > 2) expect(s.upgradeApplied).toBe(true);
    // The search is never cut off by capacity: candidates run up to the physical need.
    expect(s.productKw).toBeLessThanOrEqual(Math.max(2, s.physicalNeedKw * 2));
  });

  it("a plateau between two product steps does not stop the search", () => {
    // 3 -> 3.1 kW is a deliberate plateau (far below the 1 % requirement) while
    // 3 -> 5 kW still delivers real extra energy at a large capacity.
    const c = cfg((x) => {
      x.powerSizing.productStepsKw = [3, 3.1, 5, 7.5, 10];
      x.powerSizing.basePowerKw = 3;
    });
    const series = buildSeries(c);
    const cap = 30;
    const usefulAt = (p: number) =>
      sizePower(
        { ...c, powerSizing: { ...c.powerSizing, productStepsKw: [p], basePowerKw: p } },
        series,
        cap,
      ).baseUsefulKWh;
    const u3 = usefulAt(3);
    const u31 = usefulAt(3.1);
    const u5 = usefulAt(5);
    // Precondition: the plateau exists and the later step is genuinely better.
    expect(((u31 - u3) / u3) * 100).toBeLessThan(c.powerSizing.upgradeMinGainPct);
    expect(((u5 - u3) / u3) * 100).toBeGreaterThan(c.powerSizing.upgradeMinGainPct);
    const s = sizePower(c, series, cap);
    expect(s.productKw).toBeGreaterThanOrEqual(5);
    expect(s.upgradeApplied).toBe(true);
  });



  it("binding hours alone never raise the recommended power", () => {
    const c = cfg();
    const series = buildSeries(c);
    const s = sizePower(c, series, 20);
    if (!s.upgradeApplied) {
      // Binding hours may well be non-zero at the base power; power stays put anyway.
      expect(s.productKw).toBeCloseTo(c.powerSizing.basePowerKw, 9);
      expect(s.upgradeGainPct).toBeLessThan(c.powerSizing.upgradeMinGainPct);
    }
  });


  it("C-rate is a product requirement only and never changes the physical need", () => {
    const base = cfg();
    const strict = cfg((x) => (x.powerSizing.productMinCRate = 0.5));
    const a = sizePower(base, buildSeries(base), 15);
    const b = sizePower(strict, buildSeries(strict), 15);
    expect(b.physicalNeedKw).toBeCloseTo(a.physicalNeedKw, 9);
    expect(b.productKw).toBeGreaterThanOrEqual(7.5);
    expect(b.productFloorAppliedKw).toBeCloseTo(7.5, 9);
  });

  it("useful energy is measured after losses, not as gross charged energy", () => {
    const c = cfg();
    const r = simulate(c, buildSeries(c), 15, 5);
    expect(usefulEnergyKWh(r)).toBeCloseTo(r.shiftedKWh, 9);
    expect(usefulEnergyKWh(r)).toBeLessThan(r.chargedKWh);
  });

  it("power sizing does not move the capacity recommendation", () => {
    const c = cfg();
    const sweep = runSweep(c);
    const capacityOnly = findSweetSpot(sweep.results, c.sweetSpot);
    expect(sweep.sweetSpot.recommendedCapacityKWh).toBe(capacityOnly.recommendedCapacityKWh);
    expect(sweep.sweetSpot.recommendedPowerKw).toBe(sweep.powerSizing.productKw);
  });

  it("a small fuse binds the grid and is reported instead of silently cutting power", () => {
    const tight = cfg((x) => {
      x.grid.maxExportKw = 2;
      x.grid.maxImportKw = 2;
    });
    const s = sizePower(tight, buildSeries(tight), 15);
    expect(s.gridExportBoundHours + s.gridImportBoundHours).toBeGreaterThan(0);
    expect(s.gridWarning).not.toBeNull();
    // The recommendation is not automatically reduced to the connection limit.
    expect(s.productKw).toBeGreaterThan(0);
  });

  it("battery power binding is counted and shrinks as power grows", () => {
    const c = cfg();
    const series = buildSeries(c);
    const low = simulate(c, series, 20, 1);
    const high = simulate(c, series, 20, 10);
    expect(low.powerBoundHours).toBeGreaterThan(high.powerBoundHours);
    expect(low.powerMissedKWh).toBeGreaterThan(high.powerMissedKWh);
    expect(low.energyBalance.ok).toBe(true);
    expect(high.energyBalance.ok).toBe(true);
  });

  it("is deterministic", () => {
    const c = cfg();
    const series = buildSeries(c);
    const a = sizePower(c, series, 15);
    const b = sizePower(c, series, 15);
    expect(b).toEqual(a);
  });
});

// ---------------------------------------------------------------------------
// Grid assessment: separate from the battery recommendation
// ---------------------------------------------------------------------------
describe("grid assessment", () => {
  const build = (annual: number, fuse: number) => {
    const cfg = defaultConfig();
    cfg.consumption.annualKWh = annual;
    cfg.consumption.monthlyKWh = spreadAnnual(annual, DEFAULT_LOAD_MONTH_SHARE);
    cfg.solar.monthlyKWh = spreadAnnual(annual * 1.2, DEFAULT_PV_MONTH_SHARE);
    cfg.solar.kWp = (annual * 1.2) / 1000;
    cfg.solar.inverterAcKw = cfg.solar.kWp * 0.83;
    cfg.grid.mainFuseA = fuse;
    return cfg;
  };

  it("keeps the same battery recommendation while the verdict changes with the fuse", () => {
    const small = runSweep(build(20000, 16));
    const large = runSweep(build(20000, 35));
    expect(small.sweetSpot.recommendedCapacityKWh).toBe(large.sweetSpot.recommendedCapacityKWh);
    expect(small.sweetSpot.recommendedPowerKw).toBe(large.sweetSpot.recommendedPowerKw);
    expect(small.gridAssessment.exportCurtailedKWh).toBeGreaterThan(
      large.gridAssessment.exportCurtailedKWh,
    );
    expect(large.gridAssessment.status).toBe("none");
  });

  it("does not double count curtailment saved by the battery", () => {
    const s = runSweep(build(20000, 16));
    const a = s.gridAssessment;
    expect(a.curtailmentSavedByBatteryKWh).toBeCloseTo(
      Math.max(0, a.potentialCurtailmentWithoutBatteryKWh - a.actualCurtailmentWithBatteryKWh),
      6,
    );
    expect(a.actualCurtailmentWithBatteryKWh).toBe(s.recommended.gridBlockedKWh);
    expect(s.recommended.energyBalance.ok).toBe(true);
    expect(s.baseline.energyBalance.ok).toBe(true);
  });

  it("reports percentages of annual production, not only hours", () => {
    const s = runSweep(build(20000, 16));
    const a = s.gridAssessment;
    expect(a.exportCurtailedPctOfPv).toBeCloseTo(
      (a.exportCurtailedKWh / s.recommended.annualPvKWh) * 100,
      6,
    );
  });
});

// ---------------------------------------------------------------------------
// System classification on top of the physical/operational grid limits
// ---------------------------------------------------------------------------
describe("system classification", () => {
  const build = (annual: number, fuse: number) => {
    const cfg = defaultConfig();
    cfg.consumption.annualKWh = annual;
    cfg.consumption.monthlyKWh = spreadAnnual(annual, DEFAULT_LOAD_MONTH_SHARE);
    cfg.solar.monthlyKWh = spreadAnnual(annual * 1.2, DEFAULT_PV_MONTH_SHARE);
    cfg.solar.kWp = (annual * 1.2) / 1000;
    cfg.solar.inverterAcKw = cfg.solar.kWp * 0.83;
    cfg.grid.mainFuseA = fuse;
    return cfg;
  };

  const cases = [
    [10000, 16],
    [20000, 16],
    [20000, 20],
    [20000, 25],
    [20000, 35],
  ] as const;

  it("classifies every verification case on energy, and keeps the recommendation stable", () => {
    const valid = new Set([
      "none",
      "export-limited-minor",
      "export-limited",
      "battery-limited",
      "combined",
    ]);
    const per20k: number[] = [];
    for (const [annual, fuse] of cases) {
      const s = runSweep(build(annual, fuse));
      const a = s.gridAssessment;
      expect(valid.has(a.status)).toBe(true);
      expect(a.headline.length).toBeGreaterThan(10);
      expect(a.recommendedCapacityKWh).toBe(s.sweetSpot.recommendedCapacityKWh);
      expect(a.recommendedPowerKw).toBe(s.sweetSpot.recommendedPowerKw);
      expect(s.recommended.energyBalance.ok).toBe(true);
      expect(s.baseline.energyBalance.ok).toBe(true);
      // physical limit is never exceeded, operational limit is what binds
      expect(a.maxActualExportKw).toBeLessThanOrEqual(a.physicalExportKw + 1e-9);
      expect(a.maxActualImportKw).toBeLessThanOrEqual(a.physicalImportKw + 1e-9);
      if (annual === 20000) per20k.push(a.exportCurtailedKWh);
    }
    // higher fuse => logically less grid limitation
    for (let i = 1; i < per20k.length; i++) {
      expect(per20k[i]!).toBeLessThanOrEqual(per20k[i - 1]! + 1e-9);
    }
  }, 30000);

  it("splits solar energy into non-overlapping categories", () => {
    for (const [annual, fuse] of cases) {
      const { gridAssessment: a } = runSweep(build(annual, fuse));
      const s = a.solarSplit;
      for (const v of [
        s.directToLoadKWh,
        s.storedInBatteryKWh,
        s.exportedKWh,
        s.limitedByGridKWh,
      ]) {
        expect(v).toBeGreaterThanOrEqual(0);
      }
      const sum = s.directToLoadKWh + s.storedInBatteryKWh + s.exportedKWh + s.limitedByGridKWh;
      expect(sum).toBeLessThanOrEqual(s.possibleKWh + 1e-6);
      expect(Math.abs(s.residualKWh)).toBeLessThan(s.possibleKWh * 0.01 + 1e-6);
      expect(s.batteryLossesKWh).toBeLessThanOrEqual(s.storedInBatteryKWh + 1e-6);
    }
  }, 20000);

  it("keeps battery-vs-no-battery comparison consistent and hours secondary", () => {
    const s = runSweep(build(20000, 16));
    const a = s.gridAssessment;
    expect(a.actualCurtailmentWithBatteryKWh).toBeLessThanOrEqual(
      a.potentialCurtailmentWithoutBatteryKWh + 1e-9,
    );
    expect(a.curtailmentSavedPctOfPotential).toBeGreaterThanOrEqual(0);
    expect(a.consequences[0]).toContain("kWh/år");
    expect(a.consequences.some((c) => c.startsWith("Sekundärt"))).toBe(true);
  });
});

describe("baseline realism (grid cap and unserved load)", () => {
  const tight = (): LabConfig =>
    cfg((x) => {
      x.consumption.annualKWh = 60_000;
      x.consumption.monthlyKWh = spreadAnnual(60_000, DEFAULT_LOAD_MONTH_SHARE);
      x.solar.monthlyKWh = spreadAnnual(12_000, DEFAULT_PV_MONTH_SHARE);
      x.grid.mainFuseA = 16;
    });

  it("caps the no-battery baseline with the same grid limit as the battery case", () => {
    const c = tight();
    const limits = computeGridLimits(c.grid);
    const r = simulate(c, buildSeries(c), 25, 5);
    // Reference peak can never exceed the connection it is measured behind.
    expect(r.baseModelledPeakKw).toBeLessThanOrEqual(limits.maxImportKw + 1e-6);
    expect(r.modelledPeakKw).toBeLessThanOrEqual(limits.maxImportKw + 1e-6);
    expect(r.peakReductionKw).toBeLessThanOrEqual(limits.maxImportKw + 1e-6);
    // Demand the fuse cannot deliver is booked as unserved, not as import.
    expect(r.baseUnservedKWh).toBeGreaterThan(0);
    expect(r.energyBalance.ok).toBe(true);
  });

  it("never counts unserved load as self-sufficiency", () => {
    const c = tight();
    const r = simulate(c, buildSeries(c), 25, 5);
    const served = r.annualLoadKWh - r.baseUnservedKWh;
    // Own share is measured on delivered energy only.
    expect(r.baseSelfSufficiencyPct).toBeCloseTo(
      ((served - r.baseImportKWh) / r.annualLoadKWh) * 100,
      6,
    );
    expect(r.selfSufficiencyPct).toBeCloseTo(
      ((r.annualLoadKWh - r.importKWh - r.gridUnservedKWh) / r.annualLoadKWh) * 100,
      6,
    );
    // A too small fuse must not look like a self-sufficient site.
    expect(r.selfSufficiencyPct).toBeLessThan(60);

    // Widening the fuse serves more load; self-sufficiency must not fall apart.
    const wide = tight();
    wide.grid.mainFuseA = 63;
    const rw = simulate(wide, buildSeries(wide), 25, 5);
    expect(rw.baseUnservedKWh).toBeLessThan(r.baseUnservedKWh);
  });
});

describe("capacity recommendation (marginal decay)", () => {
  const cap = (x: LabConfig) => {
    x.sweep.capacitiesKWh = [0, 5, 10, 15, 20, 25, 30];
    x.sweep.powersKw = [3];
  };

  it("stops where the marginal gain clearly decays and reports the reason", () => {
    const c = cfg(cap);
    const s = runSweep(c).sweetSpot;
    const chosenIdx = s.steps.findIndex((st) => st.toKWh === s.recommendedCapacityKWh);
    expect(chosenIdx).toBeGreaterThanOrEqual(0);
    // Every step up to the recommendation is accepted, the first one after is not.
    for (const st of s.steps.slice(0, chosenIdx))
      expect(st.decision).toBe("accepted");
    expect(["accepted", "accepted-absolute-override"]).toContain(s.steps[chosenIdx]!.decision);
    const next = s.steps[chosenIdx + 1];
    if (next) {
      expect(["stopped-decay", "stopped-absolute", "stopped-density"]).toContain(next.decision);
      if (next.decision === "stopped-decay") {
        expect(next.marginalRatioPct).toBeLessThan(c.sweetSpot.marginalContinueRatioPct);
      } else if (next.decision === "stopped-density") {
        expect(next.deltaPerExtraKWh).toBeLessThan(c.sweetSpot.minGainPerAddedKWh);
      } else {
        expect(next.deltaAbs).toBeLessThan(next.absoluteRequirementKWh);
      }
    } else {
      expect(s.recommendedCapacityKWh).toBeLessThanOrEqual(c.sweetSpot.maxNormalCapacityKWh);
    }
  });

  it("does not run away when there is no usable solar production (density floor)", () => {
    const noSun = cfg((x) => {
      cap(x);
      x.solar.enabled = false;
      x.solar.kWp = 0;
      x.solar.inverterAcKw = 0;
      x.solar.monthlyKWh = spreadAnnual(0, DEFAULT_PV_MONTH_SHARE);
    });
    const s = runSweep(noSun).sweetSpot;
    // Without solar (and without flexible load worth shifting) no size clears the floor.
    expect(s.recommendedCapacityKWh).toBe(0);
    expect(s.steps[0]!.decision).toBe("stopped-density");
    // A tiny PV system is likewise not enough to carry a battery.
    const tinyPv = cfg((x) => {
      cap(x);
      x.solar.kWp = 1;
      x.solar.inverterAcKw = 1;
      x.solar.monthlyKWh = spreadAnnual(1000, DEFAULT_PV_MONTH_SHARE);
    });
    expect(runSweep(tinyPv).sweetSpot.recommendedCapacityKWh).toBe(0);
  });

  it("is invariant to how the capacity ladder is subdivided", () => {
    const ladders = [
      [0, 25, 50, 75, 100, 150, 200, 300],
      [0, 50, 100, 150, 200, 300],
      [0, 20, 40, 60, 80, 100, 120, 140, 160, 200, 300],
    ];
    const picks = ladders.map((caps) => {
      const c = cfg((x) => {
        x.consumption.annualKWh = 1_500_000;
        x.consumption.monthlyKWh = spreadAnnual(1_500_000, DEFAULT_LOAD_MONTH_SHARE);
        x.solar.kWp = 1000;
        x.solar.inverterAcKw = 800;
        x.solar.monthlyKWh = spreadAnnual(1_000_000, DEFAULT_PV_MONTH_SHARE);
        x.grid.mainFuseA = 630;
        // Pinned comparison power: the adaptive two-pass power derivation depends on the
        // ladder itself, which is a separate coupling. This test isolates the step length.
        x.sweetSpot.comparisonPowerKw = 30;
        x.sweep.capacitiesKWh = caps;
      });
      return runSweep(c).sweetSpot.recommendedCapacityKWh;
    });
    // Same physics, three resolutions: the answer stays within one ladder node.
    expect(Math.min(...picks)).toBeGreaterThan(0);
    expect(Math.max(...picks) / Math.min(...picks)).toBeLessThanOrEqual(1.5);
  });

  it("uses cycles and utilisation as diagnostics only, never as a hard stop", () => {
    const base = cfg(cap);
    const strict = cfg((x) => {
      cap(x);
      x.sweetSpot.minCyclesPerYear = 5000;
      x.sweetSpot.minUtilisationPct = 99;
    });
    const a = runSweep(base).sweetSpot;
    const b = runSweep(strict).sweetSpot;
    expect(b.recommendedCapacityKWh).toBe(a.recommendedCapacityKWh);
    expect(b.utilisationWarning).not.toBeNull();
  });

  it("never recommends above the upper normal capacity and flags the ceiling", () => {
    const c = cfg((x) => {
      cap(x);
      // Very large surplus: the curve should still not extrapolate above 30 kWh.
      x.consumption.annualKWh = 40000;
      x.consumption.monthlyKWh = spreadAnnual(40000, DEFAULT_LOAD_MONTH_SHARE);
      x.solar.monthlyKWh = spreadAnnual(40000, DEFAULT_PV_MONTH_SHARE);
    });
    const s = runSweep(c).sweetSpot;
    expect(s.recommendedCapacityKWh).toBeLessThanOrEqual(c.sweetSpot.maxNormalCapacityKWh);
    if (s.recommendedCapacityKWh === c.sweetSpot.maxNormalCapacityKWh) {
      expect(typeof s.upperLimitReached).toBe("boolean");
    }
  });

  it("the absolute gain requirement scales with annual PV production", () => {
    const c = cfg(cap);
    const sweep = runSweep(c);
    const s = sweep.sweetSpot;
    const expected =
      (sweep.baseline.annualPvKWh * c.sweetSpot.absoluteGainPctOfAnnualPv) / 100;
    for (const st of s.steps) expect(st.absoluteRequirementKWh).toBeCloseTo(expected, 3);
  });

  it("kW is sized separately and does not change the recommended kWh", () => {
    const c = cfg(cap);
    const sweep = runSweep(c);
    expect(sweep.sweetSpot.recommendedPowerKw).toBe(sweep.powerSizing.productKw);
    expect(sweep.powerSizing.capacityKWh).toBe(sweep.sweetSpot.recommendedCapacityKWh);
    const wider = cfg((x) => {
      cap(x);
      x.sweep.powersKw = [2, 3, 5, 7.5, 10];
    });
    expect(runSweep(wider).sweetSpot.recommendedCapacityKWh).toBe(
      sweep.sweetSpot.recommendedCapacityKWh,
    );
  });

  it("a strong absolute gain may override the decay stop, but only once", () => {
    for (const annual of [10000, 15000, 25000]) {
      const c = cfg((x) => {
        cap(x);
        x.consumption.annualKWh = annual;
        x.consumption.monthlyKWh = spreadAnnual(annual, DEFAULT_LOAD_MONTH_SHARE);
        x.solar.monthlyKWh = spreadAnnual(annual * 0.75, DEFAULT_PV_MONTH_SHARE);
      });
      const s = runSweep(c).sweetSpot;
      const overrides = s.steps.filter((st) => st.decision === "accepted-absolute-override");
      expect(overrides.length).toBeLessThanOrEqual(1);
      const ov = overrides[0];
      if (ov) {
        // The override is only allowed on a real decay step with a strong absolute gain,
        // and it must be the last accepted step (never a chain of extra steps).
        expect(ov.marginalRatioPct).toBeLessThan(c.sweetSpot.marginalStopRatioPct);
        expect(ov.deltaAbs).toBeGreaterThanOrEqual(
          c.sweetSpot.absoluteOverrideFactor * ov.absoluteRequirementKWh,
        );
        expect(ov.toKWh).toBe(s.recommendedCapacityKWh);
      }
    }
  });

  it("disabling the override never increases the recommendation", () => {
    for (const annual of [10000, 15000, 25000]) {
      const mk = (factor: number) =>
        cfg((x) => {
          cap(x);
          x.consumption.annualKWh = annual;
          x.consumption.monthlyKWh = spreadAnnual(annual, DEFAULT_LOAD_MONTH_SHARE);
          x.solar.monthlyKWh = spreadAnnual(annual * 0.75, DEFAULT_PV_MONTH_SHARE);
          x.sweetSpot.absoluteOverrideFactor = factor;
        });
      const off = runSweep(mk(0)).sweetSpot.recommendedCapacityKWh;
      const on = runSweep(mk(1.5)).sweetSpot.recommendedCapacityKWh;
      expect(on).toBeGreaterThanOrEqual(off);
      // At most one product step of difference.
      const steps = [5, 10, 15, 20, 25, 30];
      expect(steps.indexOf(on) - steps.indexOf(off)).toBeLessThanOrEqual(1);
    }
  });
});

describe("traceability of the shown result", () => {
  it("sweep.recommended always matches the recommended capacity and power", () => {
    for (const annual of [10000, 15000, 25000]) {
      const c = cfg((x) => {
        x.consumption.annualKWh = annual;
        x.consumption.monthlyKWh = spreadAnnual(annual, DEFAULT_LOAD_MONTH_SHARE);
        x.solar.monthlyKWh = spreadAnnual(annual * 0.75, DEFAULT_PV_MONTH_SHARE);
      });
      const sw = runSweep(c);
      expect(sw.recommended).toBeTruthy();
      expect(sw.recommended.capacityKWh).toBe(sw.sweetSpot.recommendedCapacityKWh);
      expect(sw.recommended.powerKw).toBe(sw.sweetSpot.recommendedPowerKw);
      // the grid verdict is derived from that very same run
      expect(sw.gridAssessment.maxActualImportKw).toBeCloseTo(
        sw.recommended.grid.maxActualImportKw,
        9,
      );
      expect(sw.gridAssessment.maxActualExportKw).toBeCloseTo(
        sw.recommended.grid.maxActualExportKw,
        9,
      );
    }
  });

  it("every sweep cell equals a direct simulation with the same config", () => {
    const c = cfg();
    const sw = runSweep(c);
    const series = buildSeries(c);
    for (const [cap, kw] of [
      [5, 3],
      [15, 3],
      [20, 5],
      [30, 10],
    ] as const) {
      const fromSweep = sw.results.find((r) => r.capacityKWh === cap && r.powerKw === kw);
      const direct = simulate(c, series, cap, kw);
      expect(fromSweep).toBeTruthy();
      expect(fromSweep!.shiftedKWh).toBeCloseTo(direct.shiftedKWh, 9);
      expect(fromSweep!.importKWh).toBeCloseTo(direct.importKWh, 9);
      expect(fromSweep!.grid.operationalImportKw).toBeCloseTo(direct.grid.operationalImportKw, 9);
      expect(fromSweep!.grid.operationalExportKw).toBeCloseTo(direct.grid.operationalExportKw, 9);
    }
  });

  it("explicit max import/export override the fuse but zero means derive from it", () => {
    const fromFuse = computeGridLimits({
      mainFuseA: 16,
      phases: 3,
      voltageV: 400,
      maxImportKw: 0,
      maxExportKw: 0,
      importMarginPct: 90,
      exportMarginPct: 95,
    });
    expect(fromFuse.physicalImportKw).toBeCloseTo(11.0851, 3);
    expect(fromFuse.physicalExportKw).toBeCloseTo(11.0851, 3);
    const explicit = computeGridLimits({
      mainFuseA: 16,
      phases: 3,
      voltageV: 400,
      maxImportKw: 5,
      maxExportKw: 4,
      importMarginPct: 90,
      exportMarginPct: 95,
    });
    expect(explicit.physicalImportKw).toBe(5);
    expect(explicit.physicalExportKw).toBe(4);
    expect(explicit.maxImportKw).toBeCloseTo(4.5, 9);
    expect(explicit.maxExportKw).toBeCloseTo(3.8, 9);
  });

  it("simulated max flows are observed flows, never the configured limits", () => {
    const c = cfg((x) => {
      x.grid.mainFuseA = 35;
    });
    const r = simulate(c, buildSeries(c), 15, 3);
    expect(r.grid.maxActualImportKw).toBeLessThan(r.grid.operationalImportKw);
    expect(r.grid.maxActualExportKw).toBeLessThan(r.grid.operationalExportKw);
    // a smaller connection must reduce the observed export, not the other way around
    const tight = cfg((x) => {
      x.grid.phases = 1;
      x.grid.voltageV = 230;
    });
    const t = simulate(tight, buildSeries(tight), 15, 3);
    expect(t.grid.maxActualExportKw).toBeLessThanOrEqual(t.grid.operationalExportKw + 1e-9);
    expect(t.grid.maxActualExportKw).toBeLessThan(r.grid.maxActualExportKw);
  });
});

describe("commercial power scaling (up to 200 kW)", () => {
  it("ladders reach 200 kW and keep fine resolution for small systems", () => {
    const p = defaultConfig().powerSizing;
    expect(Math.max(...p.fineStepsKw)).toBe(200);
    expect(Math.max(...p.productStepsKw)).toBe(200);
    for (const s of [0.5, 1, 1.5, 2, 2.5, 3]) expect(p.fineStepsKw).toContain(s);
    expect(p.fineStepsKw).toEqual([...p.fineStepsKw].sort((a, b) => a - b));
    expect(p.productStepsKw).toEqual([...p.productStepsKw].sort((a, b) => a - b));
  });

  it("keeps the small residential recommendation unchanged", () => {
    const c = cfg();
    const s = runSweep(c);
    expect(s.sweetSpot.recommendedCapacityKWh).toBe(15);
    expect(s.sweetSpot.recommendedPowerKw).toBe(3);
    expect(s.powerSizing.physicalNeedKw).toBeLessThanOrEqual(3);
    expect(s.recommended.energyBalance.ok).toBe(true);
  });

  /** Large commercial site: the physical need must be able to pass 15, 50 and 100 kW. */
  it("can size power above 15, 50 and 100 kW when the simulation motivates it", () => {
    const c = cfg((x) => {
      x.consumption.annualKWh = 3_000_000;
      x.consumption.monthlyKWh = spreadAnnual(3_000_000, DEFAULT_LOAD_MONTH_SHARE);
      x.solar.kWp = 3000;
      x.solar.inverterAcKw = 2500;
      x.solar.monthlyKWh = DEFAULT_PV_MONTH_SHARE.map((s) => s * 3000 * 950);
      x.grid.mainFuseA = 2000;
    });
    const series = buildSeries(c);
    const mid = sizePower(c, series, 200);
    const big = sizePower(c, series, 1000);
    expect(mid.productKw).toBeGreaterThan(15);
    expect(big.productKw).toBeGreaterThan(100);
    expect(big.productKw).toBeLessThanOrEqual(200);
    expect(c.powerSizing.productStepsKw).toContain(big.productKw);
    expect(simulate(c, series, 1000, big.productKw).energyBalance.ok).toBe(true);
  });
});

describe("adaptive sweep power steps", () => {
  it("adds nothing for a villa case (table stays compact)", () => {
    const s = runSweep(cfg());
    const powers = [...new Set(s.results.map((r) => r.powerKw))].sort((a, b) => a - b);
    expect(powers).toEqual([0, 2, 3, 5, 7.5, 10, 15]);
    expect(s.sweetSpot.recommendedPowerKw).toBe(3);
    // Recommended power is present as a table row.
    expect(
      s.results.some(
        (r) =>
          r.capacityKWh === s.sweetSpot.recommendedCapacityKWh &&
          r.powerKw === s.sweetSpot.recommendedPowerKw,
      ),
    ).toBe(true);
  });

  it("extends the ladder for a large commercial system, capped at 200 kW", () => {
    const c = cfg((x) => {
      x.consumption.annualKWh = 1_500_000;
      x.consumption.monthlyKWh = spreadAnnual(1_500_000, DEFAULT_LOAD_MONTH_SHARE);
      x.solar.kWp = 1500;
      x.solar.inverterAcKw = 1300;
      x.solar.monthlyKWh = spreadAnnual(1_500_000, DEFAULT_PV_MONTH_SHARE);
      x.grid.mainFuseA = 2000;
      // Ladder must offer sizes the site can actually use; a 200 kWh first step is
      // already past the density floor for this load, which would recommend nothing.
      x.sweep.capacitiesKWh = [0, 25, 50, 100, 200, 300, 400];
    });
    const s = runSweep(c);
    const powers = [...new Set(s.results.map((r) => r.powerKw))].sort((a, b) => a - b);
    expect(Math.max(...powers)).toBeGreaterThan(15);
    expect(Math.max(...powers)).toBeLessThanOrEqual(200);
    expect(powers).toContain(s.sweetSpot.recommendedPowerKw);
  });

  it("dedupes near-identical steps and always includes the recommended power", () => {
    const steps = adaptivePowerSteps([2, 3, 5, 7.5, 10, 15], 40, [20, 25, 30, 40, 50], [15.2, 40]);
    expect(steps).toEqual([20, 25, 30, 40]);
    expect(adaptivePowerSteps([2, 3, 5, 10, 15], 3, [20, 30], [3])).toEqual([]);
    expect(adaptivePowerSteps([2, 3], 1000, [50, 100, 200, 400], [])).toEqual([50, 100, 200]);
  });
});

describe("adaptive comparison power for the capacity ladder", () => {
  it("keeps the villa case at 15 kWh / 3 kW with the adaptive comparison power", () => {
    const c = cfg(() => {});
    expect(c.sweetSpot.comparisonPowerKw).toBe(0);
    const s = runSweep(c);
    expect(s.sweetSpot.recommendedCapacityKWh).toBe(15);
    expect(s.sweetSpot.recommendedPowerKw).toBe(3);
    expect(s.sweetSpot.comparisonPower).toBe(3);
  });

  it("derives the comparison power in exactly two deterministic passes and is stable", () => {
    const c = cfg((x) => {
      x.consumption.annualKWh = 1_500_000;
      x.consumption.monthlyKWh = spreadAnnual(1_500_000, DEFAULT_LOAD_MONTH_SHARE);
      x.solar.kWp = 1500;
      x.solar.inverterAcKw = 1300;
      x.solar.monthlyKWh = spreadAnnual(1_500_000, DEFAULT_PV_MONTH_SHARE);
      x.grid.mainFuseA = 2000;
    });
    const a = runSweep(c);
    const b = runSweep(c);
    expect(b.sweetSpot.comparisonPower).toBe(a.sweetSpot.comparisonPower);
    expect(b.sweetSpot.recommendedCapacityKWh).toBe(a.sweetSpot.recommendedCapacityKWh);
    // no longer pinned to the 3 kW villa power, and inside product/physics bounds
    expect(a.sweetSpot.comparisonPower!).toBeGreaterThan(3);
    expect(a.sweetSpot.comparisonPower!).toBeLessThanOrEqual(
      Math.max(...c.powerSizing.productStepsKw),
    );
    expect(a.sweetSpot.comparisonPower!).toBeLessThanOrEqual(a.sweetSpot.probeCapacityKWh! * 2);
    expect(a.sweetSpot.recommendedCapacityKWh).toBeGreaterThan(40);
  });

  it("honours a manual comparison power when it is set", () => {
    const c = cfg((x) => {
      x.sweetSpot.comparisonPowerKw = 5;
    });
    expect(runSweep(c).sweetSpot.comparisonPower).toBe(5);
  });

  it("keeps a low-energy / high-power site small in capacity", () => {
    const c = cfg((x) => {
      x.consumption.annualKWh = 60_000;
      x.consumption.monthlyKWh = spreadAnnual(60_000, DEFAULT_LOAD_MONTH_SHARE);
      x.solar.kWp = 5;
      x.solar.inverterAcKw = 200;
      x.solar.monthlyKWh = spreadAnnual(4_500, DEFAULT_PV_MONTH_SHARE);
      x.grid.mainFuseA = 400;
    });
    const s = runSweep(c);
    expect(s.sweetSpot.recommendedCapacityKWh).toBeLessThanOrEqual(20);
  });
});

describe("grid limits credit useful energy without capping the battery", () => {
  /** 10 MWh load, oversized PV, tight export margin -> guaranteed curtailment. */
  function exportLimited(marginPct: number): LabConfig {
    return cfg((x) => {
      x.solar.kWp = 20;
      x.solar.inverterAcKw = 18;
      x.solar.monthlyKWh = spreadAnnual(20_000, DEFAULT_PV_MONTH_SHARE);
      x.grid.mainFuseA = 16;
      x.grid.exportMarginPct = marginPct;
    });
  }

  it("splits useful energy into shifted, recovered and grid-charged parts with no double counting", () => {
    const c = exportLimited(50);
    const r = simulate(c, buildSeries(c), 25, 5);
    expect(r.recoveredCurtailmentKWh).toBeGreaterThan(0);
    expect(
      r.shiftedSolarKWh + r.recoveredCurtailmentToLoadKWh + r.gridChargedToLoadKWh,
    ).toBeCloseTo(r.shiftedKWh, 6);
    expect(r.totalUsefulKWh).toBeCloseTo(r.shiftedKWh + r.recoveredCurtailmentToGridKWh, 9);
    expect(r.recoveredCurtailmentKWh).toBeCloseTo(
      r.recoveredCurtailmentToLoadKWh + r.recoveredCurtailmentToGridKWh,
      9,
    );
    // Recovered energy can never exceed what the export limit actually spilled without a battery.
    expect(r.recoveredCurtailmentKWh).toBeLessThanOrEqual(r.baseCurtailedKWh + 1e-6);
    expect(r.energyBalance.ok).toBe(true);
  });

  it("charge-side split adds up to the PV charged energy", () => {
    const c = exportLimited(50);
    const s = buildSeries(c);
    const d = dispatch({
      series: s,
      battery: c.battery,
      grid: c.grid,
      strategies: c.strategies,
      peak: c.peakShaving,
      spot: c.spot,
      flex: c.flex,
      capacityKWh: 25,
      powerKw: 5,
    });
    const t = d.tallies;
    expect(t.chargedFromPvWouldExportKWh + t.chargedFromPvWouldCurtailKWh).toBeCloseTo(
      t.chargedFromPvKWh,
      6,
    );
    expect(t.chargedFromPvWouldCurtailKWh).toBeCloseTo(t.curtailmentRecoveredKWh, 9);
  });

  it("a tighter export limit never lowers total useful energy for the same battery", () => {
    const loose = exportLimited(100);
    const tight = exportLimited(40);
    const a = simulate(loose, buildSeries(loose), 25, 5);
    const b = simulate(tight, buildSeries(tight), 25, 5);
    expect(b.recoveredCurtailmentKWh).toBeGreaterThanOrEqual(a.recoveredCurtailmentKWh);
    expect(b.totalUsefulKWh).toBeGreaterThan(0);
  });

  it("no curtailment means the total useful KPI equals the shifted energy exactly", () => {
    const c = cfg((x) => {
      x.grid.mainFuseA = 200;
    });
    const r = simulate(c, buildSeries(c), 15, 3);
    expect(r.gridBlockedKWh).toBeCloseTo(0, 6);
    expect(r.recoveredCurtailmentKWh).toBeCloseTo(0, 6);
    expect(r.totalUsefulKWh).toBeCloseTo(r.shiftedKWh, 9);
    expect(usefulEnergyKWh(r)).toBeCloseTo(r.shiftedKWh, 9);
  });

  it("the villa default recommendation is unchanged by the new KPI", () => {
    const s = runSweep(cfg());
    expect(s.sweetSpot.recommendedCapacityKWh).toBe(15);
    expect(s.recommended.powerKw).toBe(3);
  });

  it("import-limited load is reported separately and never credited to the battery", () => {
    const c = cfg((x) => {
      x.consumption.annualKWh = 60_000;
      x.consumption.monthlyKWh = spreadAnnual(60_000, DEFAULT_LOAD_MONTH_SHARE);
      x.grid.mainFuseA = 16;
    });
    const r = simulate(c, buildSeries(c), 25, 5);
    expect(r.baseUnservedKWh).toBeGreaterThan(1000);
    expect(r.gridUnservedKWh).toBeGreaterThan(1000);
    expect(r.unservedDeltaKWh).toBeCloseTo(r.baseUnservedKWh - r.gridUnservedKWh, 9);
    // The battery can shave a little of it, but the dominant cause is the connection.
    expect(r.unservedDeltaKWh).toBeLessThan(r.baseUnservedKWh * 0.05);
    expect(r.notes.some((n) => n.includes("Även utan batteri"))).toBe(true);
    // Unserved load must not inflate self-sufficiency.
    expect(r.selfSufficiencyPct).toBeLessThan(100 - (r.gridUnservedKWh / 60_000) * 100 + 1e-6);
    expect(r.energyBalance.ok).toBe(true);
  });

  it("the grid limit never caps the recommended kW or kWh directly", () => {
    const tiny = cfg((x) => {
      x.consumption.annualKWh = 30_000;
      x.consumption.monthlyKWh = spreadAnnual(30_000, DEFAULT_LOAD_MONTH_SHARE);
      x.grid.mainFuseA = 16;
    });
    const s = runSweep(tiny);
    const limits = computeGridLimits(tiny.grid);
    // The battery is allowed to be bigger in kW than the connection, since the power is
    // used behind the meter.
    expect(s.recommended.powerKw).toBeGreaterThan(0);
    expect(s.sweetSpot.recommendedCapacityKWh).toBeGreaterThan(limits.maxImportKw);
  });
});

describe("peak shaving has a physical grid charging path", () => {
  /** PV = 0 with a deterministic 12 kW evening spike on the given hours. */
  function spikeCase(peakOn: boolean, hours: number[], fuseA = 63) {
    const c = cfg((x) => {
      x.solar.kWp = 0;
      x.solar.monthlyKWh = x.solar.monthlyKWh.map(() => 0);
      x.grid.mainFuseA = fuseA;
      x.strategies.peakShaving = peakOn;
      x.peakShaving.activeHours = hours;
    });
    const series = buildSeries(c);
    for (let h = 0; h < HOURS_PER_YEAR; h++) {
      if (hours.includes(h % 24)) series.load[h] = (series.load[h] ?? 0) + 12;
    }
    return { c, series };
  }

  function run(c: LabConfig, series: ReturnType<typeof buildSeries>, cap: number, kw: number) {
    return dispatch({
      series,
      battery: c.battery,
      grid: c.grid,
      strategies: c.strategies,
      peak: c.peakShaving,
      spot: c.spot,
      flex: c.flex,
      capacityKWh: cap,
      powerKw: kw,
    });
  }

  const SHORT = [17, 18];
  const LONG = [15, 16, 17, 18, 19, 20];

  it("does not grid charge for peak shaving when the strategy is off", () => {
    const { c, series } = spikeCase(false, SHORT);
    const d = run(c, series, 15, 5);
    expect(d.tallies.chargedFromGridKWh).toBe(0);
    // Only the initial stored energy leaves the battery; it is never refilled.
    expect(d.tallies.dischargedKWh).toBeLessThan(d.window.usableKWh + 1);
    expect(d.tallies.equivalentFullCycles).toBeLessThan(1);
  });

  it("charges from the grid before a short peak and actually shaves the import", () => {
    const { c, series } = spikeCase(true, SHORT);
    const d = run(c, series, 15, 5);
    const basePeak = Math.max(...d.baseImportSeries);
    const peak = Math.max(...d.importSeries);
    expect(d.tallies.chargedFromGridKWh).toBeGreaterThan(0);
    expect(d.tallies.chargedFromPvKWh).toBe(0);
    expect(basePeak - peak).toBeGreaterThan(1);
    expect(d.tallies.equivalentFullCycles).toBeGreaterThan(10);
  });

  it("a longer peak period needs more energy than a short one", () => {
    const short = spikeCase(true, SHORT);
    const long = spikeCase(true, LONG);
    const ds = run(short.c, short.series, 15, 5);
    const dl = run(long.c, long.series, 15, 5);
    expect(dl.tallies.dischargedToLoadKWh).toBeGreaterThan(ds.tallies.dischargedToLoadKWh * 1.5);
  });

  it("combines PV charging with peak shaving without pointless grid charging", () => {
    const c = cfg((x) => {
      x.strategies.peakShaving = true;
      x.peakShaving.activeHours = SHORT;
    });
    const series = buildSeries(c);
    for (let h = 0; h < HOURS_PER_YEAR; h++) {
      if (SHORT.includes(h % 24)) series.load[h] = (series.load[h] ?? 0) + 12;
    }
    const d = run(c, series, 15, 5);
    expect(d.tallies.chargedFromPvKWh).toBeGreaterThan(0);
    // Solar covers most of the need, so grid charging stays the smaller share.
    expect(d.tallies.chargedFromGridKWh).toBeLessThan(d.tallies.chargedFromPvKWh);
    const s = simulate(c, series, 15, 5);
    expect(s.energyBalance.ok).toBe(true);
  });

  it("never charges past the operational or physical import limit", () => {
    const { c, series } = spikeCase(true, SHORT, 16);
    const limits = computeGridLimits(c.grid);
    const d = run(c, series, 30, 15);
    expect(Math.max(...d.importSeries)).toBeLessThanOrEqual(limits.maxImportKw + 1e-9);
    expect(limits.maxImportKw).toBeLessThanOrEqual(limits.physicalImportKw + 1e-9);
    expect(Math.max(...d.importSeries)).toBeLessThanOrEqual(limits.physicalImportKw + 1e-9);
  });

  it("keeps the energy balance exact with peak-shaving grid charging", () => {
    const { c, series } = spikeCase(true, LONG);
    const s = simulate(c, series, 15, 5);
    expect(s.energyBalance.ok).toBe(true);
    expect(Math.abs(s.energyBalance.residualKWh)).toBeLessThan(1e-6);
  });
});

describe("soft peak-shaving capacity floor", () => {
  /** PV = 0, deterministic evening peak of `kw` on `dur` hours on the days `days` allows. */
  function peakCase(kw: number, dur: number, days: (d: number) => boolean, fuseA = 63) {
    const c = cfg((x) => {
      x.solar.enabled = false;
      x.solar.kWp = 0;
      x.solar.monthlyKWh = x.solar.monthlyKWh.map(() => 0);
      x.grid.mainFuseA = fuseA;
      x.strategies.peakShaving = true;
    });
    const series = buildSeries(c);
    for (let d = 0; d < 365; d++) {
      if (!days(d)) continue;
      for (let k = 0; k < dur; k++) {
        const h = d * 24 + 17 + k;
        if (h < HOURS_PER_YEAR) series.load[h] = (series.load[h] ?? 0) + kw;
      }
    }
    return { c, series };
  }
  const daily = () => true;

  it("raises a short recurring daily peak from the energy sweet spot to the peak need", () => {
    const { c, series } = peakCase(12, 2, daily);
    const sw = runSweep(c, series);
    const pf = sw.sweetSpot.peakFloor!;
    expect(pf.energySweetSpotKWh).toBe(5);
    expect(pf.need.active).toBe(true);
    expect(pf.extraSteps).toBe(1);
    expect(sw.sweetSpot.recommendedCapacityKWh).toBe(10);
    // The extra step is what actually delivers the peak reduction.
    const before = simulate(c, series, pf.energySweetSpotKWh, sw.sweetSpot.recommendedPowerKw);
    expect(sw.recommended.peakReductionKw).toBeGreaterThan(before.peakReductionKw * 1.5);
  });

  it("raises a long lower recurring daily peak one step as well", () => {
    const { c, series } = peakCase(6, 8, daily);
    const sw = runSweep(c, series);
    expect(sw.sweetSpot.peakFloor!.energySweetSpotKWh).toBe(5);
    expect(sw.sweetSpot.peakFloor!.need.needKWh).toBeGreaterThan(5);
    expect(sw.sweetSpot.recommendedCapacityKWh).toBe(10);
    expect(sw.sweetSpot.peakFloor!.extraSteps).toBe(1);
  });

  it("blocks monthly peaks that do not recur often enough", () => {
    const { c, series } = peakCase(12, 4, (d) => d % 30 === 0);
    const sw = runSweep(c, series);
    const pf = sw.sweetSpot.peakFloor!;
    expect(pf.need.active).toBe(false);
    expect(pf.need.recurringDays).toBeLessThan(60);
    expect(pf.extraSteps).toBe(0);
    expect(sw.sweetSpot.recommendedCapacityKWh).toBe(0);
  });

  it("blocks a handful of extreme days via the density gate", () => {
    const { c, series } = peakCase(30, 4, (d) => [20, 80, 150, 220, 300].includes(d), 100);
    const sw = runSweep(c, series);
    expect(sw.sweetSpot.peakFloor!.extraSteps).toBe(0);
    expect(sw.sweetSpot.recommendedCapacityKWh).toBeLessThan(15);
  });

  it("never raises capacity when the peak need is below the energy sweet spot", () => {
    const { c, series } = peakCase(4, 10, daily);
    const sw = runSweep(c, series);
    const pf = sw.sweetSpot.peakFloor!;
    expect(pf.need.needKWh).toBeLessThanOrEqual(pf.energySweetSpotKWh);
    expect(sw.sweetSpot.recommendedCapacityKWh).toBe(pf.energySweetSpotKWh);
  });

  it("leaves a normal villa without peak shaving untouched", () => {
    const c = cfg();
    const sw = runSweep(c);
    expect(c.strategies.peakShaving).toBe(false);
    expect(sw.sweetSpot.peakFloor!.need.active).toBe(false);
    expect(sw.sweetSpot.peakFloor!.extraSteps).toBe(0);
    expect(sw.sweetSpot.recommendedCapacityKWh).toBe(15);
    expect(sw.sweetSpot.recommendedPowerKw).toBe(3);
  });

  it("adds at most two ladder steps and keeps the energy balance exact", () => {
    const { c, series } = peakCase(12, 6, daily);
    const sw = runSweep(c, series);
    expect(sw.sweetSpot.peakFloor!.extraSteps).toBeLessThanOrEqual(2);
    expect(sw.recommended.energyBalance.ok).toBe(true);
  });
});

describe("ancillary floor", () => {
  it("sizes a battery that can hold the reservation and never claims revenue", () => {
    const cfg = defaultConfig();
    cfg.strategies.ancillaryServices = true;
    cfg.ancillary.enabled = true;

    cfg.ancillary.offeredPowerKw = 3;
    const sweep = runSweep(cfg);
    expect(sweep.sweetSpot.recommendedCapacityKWh).toBeGreaterThan(0);
    expect(sweep.sweetSpot.recommendedPowerKw).toBeGreaterThanOrEqual(3);
    expect(sweep.recommended.ancillary.enabled).toBe(true);
    expect(sweep.recommended.ancillary.reservedHours).toBe(8760);
    expect(sweep.recommended.ancillary.availabilityPct).toBe(100);
    expect(sweep.recommended.ancillary.grossKr).toBeNull();
    expect(sweep.recommended.ancillary.revenueStatus).toBe("missing-price-data");
    expect(sweep.recommended.ancillary.activationSimulated).toBe(false);
  });

  it("stays out of the way when ancillary services are off", () => {
    const base = runSweep(defaultConfig());
    expect(base.recommended.ancillary.enabled).toBe(false);
    expect(base.recommended.ancillary.reservedHours).toBe(0);
  });
});
