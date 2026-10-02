/**
 * Regression tests for three targeted fixes:
 *  1. Reserve market is still evaluated when energy sizing returns 0 kWh / 0 kW.
 *  2. Denmark: DK1/DK2 use their own product + series; plain DK is a validation error
 *     and is never silently mapped to DK1/DK2.
 *  3. Installed power is not raised for an unpriceable reserve market.
 */
import { describe, expect, it } from "vitest";
import { runBatteryEngine } from "@/lib/battery-engine";
import { toLabConfig } from "@/lib/battery-engine/input";
import { normalizeWizardToEngineInput } from "@/lib/battery-app/normalizeWizardToEngineInput";
import { validateGridStep } from "@/lib/battery-app/stepValidation";
import { fcrPriceSeriesForCountry } from "@/lib/lab/ancillary/prices";
import { createInitialState } from "@/state/wizard";

const T = 600_000;

interface CaseOpts {
  cc: string;
  area?: string | undefined;
  fcr: boolean;
  share?: number;
  peak?: boolean;
  pv?: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function caseC({ cc, area, fcr, share = 0.75, peak = true, pv = 0 }: CaseOpts): any {
  const s: any = structuredClone(createInitialState(cc as any));
  s.grid.gridValuesConfirmed = true;
  s.grid.mainFuseA = 250;
  if (area) s.grid.marketArea = area;
  s.consumption.annualKwh = 120000;
  s.consumption.profileId = "normal";
  s.production.mode = pv > 0 ? "manual" : "none";
  s.production.annualKwh = pv;
  s.strategies.fcrDUp = fcr;
  s.preferences.customerAncillaryShare = share;
  s.strategies.peakShaving = peak;
  return s;
}

function caseB({ cc, area, fcr }: CaseOpts): any {
  const s: any = structuredClone(createInitialState(cc as any));
  s.grid.gridValuesConfirmed = true;
  s.grid.mainFuseA = 63;
  if (area) s.grid.marketArea = area;
  s.consumption.annualKwh = 20000;
  s.consumption.profileId = "normal";
  s.production.mode = "manual";
  s.production.annualKwh = 10000;
  s.strategies.fcrDUp = fcr;
  s.preferences.customerAncillaryShare = 0.75;
  return s;
}

const run = (s: any) => runBatteryEngine(normalizeWizardToEngineInput(s)) as any;
const rec = (r: any) => r.summary.recommendation;
const gross = (r: any) => r.summary.economy.fcrGrossSek ?? 0;

describe("Fix 1 — reserve market evaluated when energy sizing returns 0", () => {
  for (const [cc, area] of [
    ["DE"],
    ["CH"],
    ["DK", "DK1"],
    ["DK", "DK2"],
    ["FR"],
  ] as [string, string?][]) {
    it(`Case C + 50 kWh solar ${area ?? cc}: battery > 0 kW with reserve income > 0`, { timeout: T }, () => {
      const r = run(caseC({ cc, area, fcr: true, pv: 50 }));
      expect(rec(r).powerKw).toBeGreaterThan(0);
      expect(rec(r).capacityKWh).toBeGreaterThan(0);
      expect(gross(r)).toBeGreaterThan(0);
    });
  }

  it("Case C SE stays 150 kW / 200 kWh", { timeout: T }, () => {
    const r = run(caseC({ cc: "SE", fcr: true }));
    expect(rec(r).powerKw).toBe(150);
    expect(rec(r).capacityKWh).toBe(200);
  });

  it("No solar AND peak shaving off: engine stays 0 (standalone ancillary scenario owns it)", { timeout: T }, () => {
    const r = run(caseC({ cc: "DE", fcr: true, peak: false }));
    expect(rec(r).powerKw).toBe(0);
    expect(rec(r).capacityKWh).toBe(0);
  });

  it("Case C without solar but peak shaving ON: reserve market is evaluated (DE)", { timeout: T }, () => {
    const r = run(caseC({ cc: "DE", fcr: true }));
    expect(rec(r).powerKw).toBeGreaterThan(0);
    expect(gross(r)).toBeGreaterThan(0);
  });

  it("Case C with reserve market OFF stays 'no battery'", { timeout: T }, () => {
    const r = run(caseC({ cc: "DE", fcr: false, pv: 50 }));
    expect(rec(r).powerKw).toBe(0);
    expect(rec(r).capacityKWh).toBe(0);
  });

  it("Case C without reserve price data: income 0, no battery", { timeout: T }, () => {
    const r = run(caseC({ cc: "DK", fcr: true, pv: 50 }));
    expect(gross(r)).toBe(0);
    expect(rec(r).powerKw).toBe(0);
  });

  it("Case C priced but economically non-viable (0 % customer share): no battery", { timeout: T }, () => {
    const r = run(caseC({ cc: "DE", fcr: true, share: 0, pv: 50 }));
    expect(rec(r).powerKw).toBe(0);
    expect(rec(r).capacityKWh).toBe(0);
  });
});

describe("Fix 2 — Denmark market area", () => {
  it("DK1/DK2 map to their own reserve product and price series", () => {
    const dk1 = toLabConfig(normalizeWizardToEngineInput(caseB({ cc: "DK", area: "DK1", fcr: true })));
    const dk2 = toLabConfig(normalizeWizardToEngineInput(caseB({ cc: "DK", area: "DK2", fcr: true })));
    expect(dk1.ancillary.priceCountry).toBe("DK1");
    expect(dk2.ancillary.priceCountry).toBe("DK2");
    expect(JSON.stringify(fcrPriceSeriesForCountry("DK1"))).toContain("DK1");
    expect(JSON.stringify(fcrPriceSeriesForCountry("DK2"))).toContain("DK2");
  });

  it("DK without market area is a validation error and is never mapped to DK1/DK2", () => {
    const s = caseB({ cc: "DK", fcr: true });
    s.grid.marketArea = undefined;
    expect(validateGridStep(s).ok).toBe(false);
    const cfg = toLabConfig(normalizeWizardToEngineInput(s));
    expect(["DK1", "DK2"]).not.toContain(cfg.ancillary.priceCountry);
    expect(fcrPriceSeriesForCountry(cfg.ancillary.priceCountry)).toBeNull();
  });

  it("DK1 control case: ~31.9 kW held, ~31 664 DKK income, ~23 565 DKK benefit", { timeout: T }, () => {
    const r = run(caseB({ cc: "DK", area: "DK1", fcr: true }));
    expect(rec(r).powerKw).toBe(40);
    expect(+r.summary.fcr.avgHeldPowerKw).toBeCloseTo(31.9, 0);
    expect(gross(r)).toBeGreaterThan(31664 * 0.95);
    expect(gross(r)).toBeLessThan(31664 * 1.05);
    expect(r.summary.economy.annualCustomerBenefitSek).toBeGreaterThan(23565 * 0.95);
    expect(r.summary.economy.annualCustomerBenefitSek).toBeLessThan(23565 * 1.05);
  });

  it("DK2 control case: ~32.2 kW held, ~24 612 DKK income, ~21 047 DKK benefit", { timeout: T }, () => {
    const r = run(caseB({ cc: "DK", area: "DK2", fcr: true }));
    expect(rec(r).powerKw).toBe(40);
    expect(+r.summary.fcr.avgHeldPowerKw).toBeCloseTo(32.2, 0);
    expect(gross(r)).toBeGreaterThan(24612 * 0.95);
    expect(gross(r)).toBeLessThan(24612 * 1.05);
    expect(r.summary.economy.annualCustomerBenefitSek).toBeGreaterThan(21047 * 0.95);
    expect(r.summary.economy.annualCustomerBenefitSek).toBeLessThan(21047 * 1.05);
  });
});

describe("Fix 3 — no power raise for an unpriceable reserve market", () => {
  it("DK without area (unavailable pricing) stays at base power ~3 kW", { timeout: T }, () => {
    const r = run(caseB({ cc: "DK", fcr: true }));
    expect(rec(r).powerKw).toBe(3);
    expect(gross(r)).toBe(0);
  });

  for (const [cc, area] of [["DE"], ["AT"], ["DK", "DK1"], ["DK", "DK2"]] as [string, string?][]) {
    it(`${area ?? cc} keeps the 40 kW reserve power`, { timeout: T }, () => {
      expect(rec(run(caseB({ cc, area, fcr: true }))).powerKw).toBe(40);
    });
  }
});
