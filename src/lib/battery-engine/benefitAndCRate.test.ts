import { describe, expect, it } from "vitest";
import { runBatteryEngine } from "@/lib/battery-engine";
import { normalizeWizardToEngineInput } from "@/lib/battery-app/normalizeWizardToEngineInput";
import { createInitialState } from "@/state/wizard";
import { selfSufficiency } from "@/lib/lab/simulate";
import { cRateCapacitySteps, exceedsAutoCRate, minCapacityForAutoCRate } from "@/lib/lab/cRateLimit";
import { defaultConfig } from "@/lib/lab/defaults";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function input(cc: any, fuse: number, pv: number, fcr: boolean, opts = {}, zeroPrices = false) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s: any = structuredClone(createInitialState(cc));
  s.grid.gridValuesConfirmed = true;
  s.grid.mainFuseA = fuse;
  s.consumption.annualKwh = 20000;
  s.consumption.profileId = "normal";
  s.production.mode = pv > 0 ? "manual" : "none";
  s.production.annualKwh = pv;
  s.production.acKw = 10; // explicit inverter size; engine no longer assumes a default
  s.strategies.fcrDUp = fcr;
  s.preferences.customerAncillaryShare = 0.75;
  if (zeroPrices) {
    // Explicit 0/0 energy prices: tests the zero-benefit path independent of country defaults.
    s.economy.importPrice = 0;
    s.economy.exportPrice = 0;
  }
  return normalizeWizardToEngineInput(s, opts);
}

describe("K1: no automatic recommendation with total customer benefit <= 0", () => {
  it("BE villa without reserve (benefit 0) -> no battery, withheld size reported", () => {
    const r = runBatteryEngine(input("BE", 25, 10000, false, {}, true));
    const rec = r.summary.recommendation;
    expect([rec.capacityKWh, rec.powerKw]).toEqual([0, 0]);
    expect(rec.sizingWasFixed).toBe(false);
    expect(rec.withheld?.reason).toBe("non-positive-benefit");
    expect(rec.withheld!.capacityKWh).toBeGreaterThan(0);
    expect(rec.withheld!.annualCustomerBenefitSek!).toBeLessThanOrEqual(0);
  }, 600_000);
  it("manually fixed size is still simulated and may show <= 0", () => {
    const r = runBatteryEngine(input("BE", 25, 10000, false, { fixedCapacityKWh: 20, fixedPowerKw: 3 }, true));
    expect(r.summary.recommendation.capacityKWh).toBe(20);
    expect(r.summary.recommendation.withheld).toBeUndefined();
    expect(r.summary.economy.annualCustomerBenefitSek!).toBeLessThanOrEqual(0);
  }, 600_000);
  it("reserve case with negative energy benefit but positive total is kept (DE 40/40)", () => {
    const r = runBatteryEngine(input("DE", 63, 10000, true));
    expect([r.summary.recommendation.powerKw, r.summary.recommendation.capacityKWh]).toEqual([40, 40]);
    expect(r.summary.economy.annualCustomerBenefitSek!).toBeGreaterThan(0);
    expect(r.summary.recommendation.withheld).toBeUndefined();
  }, 600_000);
});

describe("V2: self-sufficiency never negative", () => {
  it("0 kWh PV -> exactly 0 % even when import exceeds load", () => {
    expect(selfSufficiency(10000, 0, 10500, 0)).toBe(0);
    expect(selfSufficiency(10000, 0, 9000, 0)).toBe(0);
  });
  it("clamped to [0, 100] against rounding", () => {
    expect(selfSufficiency(10000, 5000, 10000 + 1e-9, 0)).toBe(0);
    expect(selfSufficiency(10000, 5000, -1e-9, 0)).toBe(100);
    expect(selfSufficiency(10000, 5000, 6000, 0)).toBeCloseTo(40, 9);
    expect(selfSufficiency(0, 5000, 0, 0)).toBe(0);
  });
  it("engine: no-PV run reports exactly 0 % before and after", () => {
    const r = runBatteryEngine(input("SE", 25, 0, false, { fixedCapacityKWh: 20, fixedPowerKw: 10 }));
    expect(r.summary.energy.selfSufficiencyBeforePct).toBe(0);
    expect(r.summary.energy.selfSufficiencyAfterPct).toBe(0);
  }, 600_000);
});

describe("V3: shared 1.0 C rule", () => {
  const steps = defaultConfig().sweep.capacitiesKWh;
  it.each([
    [60, 75],
    [100, 100],
    [125, 150],
    [200, 200],
    [40, 40],
  ])("%d kW -> %d kWh", (kw, kwh) => {
    expect(minCapacityForAutoCRate(kw, steps)).toBe(kwh);
    expect(exceedsAutoCRate(kw, kwh)).toBe(false);
  });
  it("never lowers power, no step -> null (no recommendation)", () => {
    expect(minCapacityForAutoCRate(600, steps)).toBeNull();
    expect(cRateCapacitySteps(30, [10, 50, 20, 30])).toEqual([30, 50]);
    expect(exceedsAutoCRate(40, 25)).toBe(true);
    expect(exceedsAutoCRate(0, 0)).toBe(false);
  });
});
