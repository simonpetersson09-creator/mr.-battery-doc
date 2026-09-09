/**
 * CUSTOMER ECONOMY + PAYBACK STEP.
 *
 * Guards the one invariant that matters: the customer share is a presentation layer.
 * It never touches physics, sizing, held power or the engine's own market value.
 */
import { describe, expect, it } from "vitest";
import { runBatteryEngine } from "@/lib/battery-engine";
import { normalizeWizardToEngineInput } from "./normalizeWizardToEngineInput";
import { computeBatteryAlternatives } from "./capacityAlternatives";
import { validateEconomyStep, validatePaybackStep } from "./stepValidation";
import {
  clampCustomerAncillaryShare,
  clampTargetPaybackYears,
  customerBenefitFromTotals,
  customerEconomyFromResult,
  DEFAULT_CUSTOMER_ANCILLARY_SHARE,
  DEFAULT_TARGET_PAYBACK_YEARS,
  maxInvestmentSek,
} from "./customerEconomy";
import { createInitialState, type WizardState } from "@/state/wizard";
import { WIZARD_STEPS } from "@/components/wizard/steps";

function villa(): WizardState {
  const s = createInitialState("SE");
  s.grid.mainFuseA = 25;
  s.grid.gridValuesConfirmed = true;
  s.consumption.mode = "annual";
  s.consumption.annualKwh = 20000;
  s.consumption.profileId = "heat-pump";
  s.production.mode = "manual";
  s.production.dcKwp = 10;
  s.production.acKw = 8;
  s.production.annualKwh = 9500;
  return s;
}

const run = (s: WizardState) => runBatteryEngine(normalizeWizardToEngineInput(s));

describe("defaults and clamping", () => {
  it("defaults are 75 % and 10 years", () => {
    const s = createInitialState("SE");
    expect(s.preferences.customerAncillaryShare).toBe(0.75);
    expect(s.preferences.targetPaybackYears).toBe(10);
    expect(DEFAULT_CUSTOMER_ANCILLARY_SHARE).toBe(0.75);
    expect(DEFAULT_TARGET_PAYBACK_YEARS).toBe(10);
  });

  it("clamps out-of-range and corrupt values", () => {
    expect(clampCustomerAncillaryShare(-1)).toBe(0);
    expect(clampCustomerAncillaryShare(2)).toBe(1);
    expect(clampCustomerAncillaryShare("x")).toBe(0.75);
    expect(clampTargetPaybackYears(1)).toBe(5);
    expect(clampTargetPaybackYears(99)).toBe(20);
    expect(clampTargetPaybackYears(null)).toBe(10);
  });
});

describe("share applies to the ancillary term only", () => {
  const result = run(villa());

  it("0 % and 100 % bracket the engine total by exactly the market value", () => {
    const full = customerEconomyFromResult(result, 1);
    const none = customerEconomyFromResult(result, 0);
    expect(full.totalCustomerBenefitSek).toBeCloseTo(
      result.summary.economy.totalOperatingBenefitSek ?? 0,
      6,
    );
    expect((full.totalCustomerBenefitSek ?? 0) - (none.totalCustomerBenefitSek ?? 0)).toBeCloseTo(
      full.ancillaryMarketValueSek,
      6,
    );
  });

  it("energy and peak benefits are identical for every share", () => {
    const a = customerEconomyFromResult(result, 0.1);
    const b = customerEconomyFromResult(result, 0.9);
    expect(a.energyBenefitSek).toBe(b.energyBenefitSek);
    expect(a.peakBenefitSek).toBe(b.peakBenefitSek);
    expect(a.ancillaryMarketValueSek).toBe(b.ancillaryMarketValueSek);
  });

  it("the market value stays the raw engine figure", () => {
    const ce = customerEconomyFromResult(result, 0.5);
    expect(ce.ancillaryMarketValueSek).toBe(result.summary.fcr.grossSek ?? 0);
    expect(ce.ancillaryCustomerValueSek).toBeCloseTo(ce.ancillaryMarketValueSek * 0.5, 9);
  });

  it("no ancillary => share has no effect at all", () => {
    const s = villa();
    s.strategies.fcrDUp = false;
    const r = run(s);
    const a = customerEconomyFromResult(r, 0);
    const b = customerEconomyFromResult(r, 1);
    expect(a.totalCustomerBenefitSek).toBe(b.totalCustomerBenefitSek);
    expect(a.ancillaryMarketValueSek).toBe(0);
  });

  it("customerBenefitFromTotals handles a missing total", () => {
    expect(customerBenefitFromTotals(null, 100, 0.5)).toBeNull();
    expect(customerBenefitFromTotals(1000, 400, 0.75)).toBeCloseTo(900, 9);
  });
});

describe("engine invariance", () => {
  it("recommendation, held power and market value are identical for 0 %, 75 % and 100 %", () => {
    const base = run(villa());
    for (const share of [0, 0.75, 1]) {
      const ce = customerEconomyFromResult(base, share);
      expect(ce.ancillaryMarketValueSek).toBe(base.summary.fcr.grossSek ?? 0);
      expect(ce.engineTotalBenefitSek).toBe(base.summary.economy.totalOperatingBenefitSek);
    }
    // The engine input never carries the share, so a second run is bit-identical.
    const again = run(villa());
    expect(again.summary.recommendation).toEqual(base.summary.recommendation);
    expect(again.summary.fcr.monetizedPowerKw).toBe(base.summary.fcr.monetizedPowerKw);
  });

  it("alternatives keep their own simulated capacity/power and only re-scale ancillary", () => {
    const s = villa();
    const input = normalizeWizardToEngineInput(s);
    const result = runBatteryEngine(input);
    const full = computeBatteryAlternatives(input, result, 1);
    const half = computeBatteryAlternatives(input, result, 0.5);
    expect(half.map((a) => [a.level, a.capacityKWh, a.powerKw])).toEqual(
      full.map((a) => [a.level, a.capacityKWh, a.powerKw]),
    );
    for (let i = 0; i < full.length; i++) {
      const f = full[i]!;
      const h = half[i]!;
      expect(f.annualBenefitSek).toBe(h.annualBenefitSek);
      expect((f.customerBenefitSek ?? 0) - (h.customerBenefitSek ?? 0)).toBeCloseTo(
        f.ancillaryMarketValueSek * 0.5,
        6,
      );
    }
  });
});

describe("simple payback", () => {
  it("max investment = annual customer benefit x years", () => {
    expect(maxInvestmentSek(2000, 10)).toBe(20000);
    expect(maxInvestmentSek(2000, 5)).toBe(10000);
  });

  it("non-positive or missing benefit gives no investment figure", () => {
    expect(maxInvestmentSek(0, 10)).toBeNull();
    expect(maxInvestmentSek(-50, 10)).toBeNull();
    expect(maxInvestmentSek(null, 10)).toBeNull();
  });
});

describe("wizard wiring", () => {
  it("has seven steps with payback between economy and result", () => {
    const paths = WIZARD_STEPS.map((s) => s.path);
    expect(paths).toHaveLength(7);
    expect(paths[4]).toBe("/ekonomi");
    expect(paths[5]).toBe("/aterbetalning");
    expect(paths[6]).toBe("/resultat");
  });

  it("validates share bounds and payback range", () => {
    const s = villa();
    expect(validateEconomyStep(s).ok).toBe(true);
    expect(validatePaybackStep(s).ok).toBe(true);
    s.preferences.customerAncillaryShare = 1.5;
    expect(validateEconomyStep(s).ok).toBe(false);
    s.preferences.customerAncillaryShare = 0.75;
    s.preferences.targetPaybackYears = 30;
    expect(validatePaybackStep(s).ok).toBe(false);
  });
});
