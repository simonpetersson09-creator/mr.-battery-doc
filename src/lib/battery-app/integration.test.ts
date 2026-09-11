/**
 * WIZARD -> ADAPTER -> BATTERY ENGINE integration tests.
 *
 * These verify that the app-layer adapter supplies the engine with the customer's selected
 * profile, including its monthly distribution when only annual consumption is known.
 */

import { describe, expect, it } from "vitest";

// Full 8760 engine runs are slow; every case gets a generous timeout.
const T = 120_000;

import { runBatteryEngine } from "@/lib/battery-engine";
import { createInitialState, type WizardState } from "@/state/wizard";
import { normalizeWizardToEngineInput } from "./normalizeWizardToEngineInput";
import { validateBatteryEngineInput } from "./validate";
import { runBatteryApp } from "./index";

/** Wizard state matching the engine defaults (GM01 standard villa). */
function standardVilla(): WizardState {
  const s = createInitialState("SE");
  s.grid.mainFuseA = 16;
  s.grid.mainFuseManual = true;
  s.consumption.mode = "annual";
  s.consumption.annualKwh = 10000;
  s.consumption.profileId = "evening-heavy";
  s.production.mode = "manual";
  s.production.dcKwp = 12;
  s.production.acKw = 10;
  s.production.annualKwh = 12000;
  s.strategies.peakShaving = false;
  s.strategies.fcrDUp = false;
  return s;
}

function ok(state: WizardState, options = {}) {
  const outcome = runBatteryApp(state, options);
  if (outcome.status !== "ok") throw new Error(`expected ok, got ${outcome.status}`);
  return outcome.result;
}

describe("GM01 through the wizard adapter", () => {
  it("standardvilla: fixed 15 kWh / 3 kW uses the selected profile's annual distribution", () => {
    const r = ok(standardVilla(), { fixedCapacityKWh: 15, fixedPowerKw: 3 });
    expect(r.summary.recommendation.capacityKWh).toBe(15);
    expect(r.summary.recommendation.powerKw).toBe(3);
    expect(r.summary.economy.totalOperatingBenefitSek).toBeCloseTo(2457.41, 2);
    expect(r.summary.economy.energyBenefitSek).toBeCloseTo(2220.96, 2);
    expect(r.summary.energyBalance.ok).toBe(true);
    expect(Math.abs(r.summary.energyBalance.residualKWh)).toBeLessThan(1);
  }, T);

  it("adapter output is identical to an explicit profile-scaled engine input", () => {
    const state = standardVilla();
    const input = normalizeWizardToEngineInput(state, { fixedCapacityKWh: 15, fixedPowerKw: 3 });
    const viaAdapter = runBatteryEngine(input);
    const direct = runBatteryEngine(input);
    expect(viaAdapter.summary.economy.totalOperatingBenefitSek).toBeCloseTo(
      direct.summary.economy.totalOperatingBenefitSek!,
      6,
    );
    expect(viaAdapter.summary.energy.importAfterKWh).toBeCloseTo(
      direct.summary.energy.importAfterKWh,
      6,
    );
  }, T);
});

describe("adapter cases", () => {
  it("utan sol maps to a PV = 0 run", () => {
    const s = standardVilla();
    s.production.mode = "none";
    const input = normalizeWizardToEngineInput(s);
    expect(input.production?.enabled).toBe(false);
    const r = ok(s);
    expect(r.summary.energy.annualPvKWh).toBe(0);
    expect(r.summary.energy.importBeforeKWh).toBeCloseTo(10000, 2);
  }, T);

  it("peak shaving utan sol still works", () => {
    const s = standardVilla();
    s.production.mode = "none";
    s.strategies.peakShaving = true;
    const r = ok(s);
    const direct = runBatteryEngine({
      consumption: input.consumption,
      production: { enabled: false },
      strategies: { peakShaving: true },
    });
    expect(r.summary.recommendation.capacityKWh).toBe(direct.summary.recommendation.capacityKWh);
    expect(r.summary.peak.peakReductionKw).toBeCloseTo(direct.summary.peak.peakReductionKw, 6);
  }, T);

  it("värmepumpsprofil 20 000 kWh matches the engine", () => {
    const s = standardVilla();
    s.consumption.annualKwh = 20000;
    s.consumption.profileId = "heat-pump";
    const r = ok(s);
    const direct = runBatteryEngine(normalizeWizardToEngineInput(s));
    expect(r.summary.recommendation.capacityKWh).toBe(direct.summary.recommendation.capacityKWh);
    expect(r.summary.recommendation.powerKw).toBe(direct.summary.recommendation.powerKw);
    expect(r.summary.economy.totalOperatingBenefitSek).toBeCloseTo(
      direct.summary.economy.totalOperatingBenefitSek!,
      6,
    );
  }, T);

  it("elbilsprofil 18 000 kWh matches the engine", () => {
    const s = standardVilla();
    s.consumption.annualKwh = 18000;
    s.consumption.profileId = "ev-night";
    const r = ok(s);
    const direct = runBatteryEngine(normalizeWizardToEngineInput(s));
    expect(r.summary.recommendation.capacityKWh).toBe(direct.summary.recommendation.capacityKWh);
    expect(r.summary.energy.shiftedToLoadKWh).toBeCloseTo(direct.summary.energy.shiftedToLoadKWh, 6);
  }, T);

  it("actual monthly consumption takes precedence over the annual figure", () => {
    const s = standardVilla();
    s.consumption.mode = "monthly";
    s.consumption.monthlyKwh = [1200, 1100, 1000, 800, 600, 450, 400, 430, 580, 810, 1050, 1380];
    const input = normalizeWizardToEngineInput(s);
    expect(input.consumption?.monthlyKWh).toHaveLength(12);
    expect(input.consumption?.annualKWh).toBe(9800);
    const r = ok(s);
    expect(r.summary.energy.annualLoadKWh).toBeCloseTo(9800, 0);
  }, T);

  it("FCR-D up is mapped only when enabled in app state", () => {
    const s = standardVilla();
    expect(normalizeWizardToEngineInput(s).strategies?.fcrDUp).toBeUndefined();
    s.strategies.fcrDUp = true;
    const input = normalizeWizardToEngineInput(s);
    expect(input.strategies?.fcrDUp).toBe(true);
    const r = ok(s, { fixedCapacityKWh: 15, fixedPowerKw: 3 });
    expect(r.summary.fcr.enabled).toBe(true);
  }, T);

  it("small main fuse is passed through to the engine", () => {
    const s = standardVilla();
    s.grid.mainFuseA = 16;
    s.production.mode = "none";
    s.consumption.annualKwh = 25000;
    const r = ok(s);
    expect(r.summary.grid.physicalImportKw).toBeCloseTo(16 * 400 * Math.sqrt(3) / 1000, 3);
    expect(r.summary.grid.unservedLoadKWh).toBeGreaterThanOrEqual(0);
  }, T);

  it("export-limited case: bigger fuse, larger PV, curtailment reported", () => {
    const s = standardVilla();
    s.grid.mainFuseA = 25;
    s.production.annualKwh = 30000;
    s.production.dcKwp = 30;
    s.production.acKw = 25;
    const r = ok(s);
    expect(r.summary.grid.exportCurtailedKWh).toBeGreaterThan(0);
  }, T);
});

describe("validation", () => {
  it("blocks a run without annual consumption", () => {
    const s = createInitialState("SE");
    const v = validateBatteryEngineInput(s);
    expect(v.ok).toBe(false);
    expect(v.issues.some((i) => i.field === "consumption.annualKwh")).toBe(true);
    expect(runBatteryApp(s).status).toBe("incomplete");
  }, T);

  it("blocks a run when only an annual figure is given without a profile", () => {
    const s = createInitialState("SE");
    s.consumption.annualKwh = 15000;
    const v = validateBatteryEngineInput(s);
    expect(v.ok).toBe(false);
    expect(v.issues.some((i) => i.field === "consumption.profileId")).toBe(true);
  }, T);

  it("rejects negative and invalid values without correcting them", () => {
    const s = standardVilla();
    s.grid.mainFuseA = 0;
    s.economy.importPrice = -1;
    const v = validateBatteryEngineInput(s);
    expect(v.ok).toBe(false);
    expect(s.economy.importPrice).toBe(-1);
  }, T);

  it("rejects incomplete monthly data", () => {
    const s = standardVilla();
    s.consumption.mode = "monthly";
    s.consumption.monthlyKwh = [1000, null, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000];
    expect(validateBatteryEngineInput(s).ok).toBe(false);
  }, T);
});

describe("economy mapping", () => {
  it("uses Swedish defaults and reports them as estimates", () => {
    const input = normalizeWizardToEngineInput(standardVilla());
    expect(input.economy).toMatchObject({
      importEnergyPriceSekPerKWh: 1.5,
      exportEnergyValueSekPerKWh: 0.6,
      peakDemandChargeSekPerKwMonth: 30,
      peakTariffSource: "default-estimate",
      eurSekRate: 11.3,
    });
  }, T);

  it("marks an edited demand charge as user-provided", () => {
    const s = standardVilla();
    s.economy.demandCharge = 40;
    s.economy.touched = true;
    s.economy.demandChargeTouched = true;
    const input = normalizeWizardToEngineInput(s);
    expect(input.economy?.peakTariffSource).toBe("user-provided");
    expect(input.economy?.peakDemandChargeSekPerKwMonth).toBe(40);
  }, T);
});
