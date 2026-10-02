import { describe, expect, it } from "vitest";
import {
  ANCILLARY_REVENUE_FACTOR,
  customerAncillaryValueSek,
  effectiveAncillaryShare,
} from "./customerAncillaryValue";
import { annualCustomerBenefitSek, SWEDISH_OPERATING_ECONOMY } from "./operatingEconomy";
import {
  customerBenefitFromTotals,
  customerEconomyFromResult,
} from "@/lib/battery-app/customerEconomy";
import type { BatteryEngineResult } from "@/lib/battery-engine";

const GROSS = 10_000;

function fakeResult(energy: number, peak: number): BatteryEngineResult {
  return {
    summary: {
      fcr: { enabled: true, grossSek: GROSS },
      economy: {
        totalOperatingBenefitSek: energy + peak + GROSS,
        energyBenefitSek: energy,
        demandCostSavingSek: peak,
      },
    },
  } as unknown as BatteryEngineResult;
}

describe("central customer ancillary value (factor 0.80 = 20 % safety margin)", () => {
  it("revenue factor is 0.80 (20 % safety margin)", () => {
    expect(ANCILLARY_REVENUE_FACTOR).toBe(0.8);
  });

  for (const [share, expected] of [
    [0.6, 4800],
    [0.75, 6000],
    [1, 8000],
  ] as const) {
    it(`traces ${GROSS} kr gross at ${share * 100} % identically through A–E`, () => {
      const econ = { ...SWEDISH_OPERATING_ECONOMY, customerAncillaryShare: share };
      // A: engine objective / K1 total (energy 0, peak 0 isolates the ancillary term)
      expect(annualCustomerBenefitSek(0, 0, GROSS, econ)).toBeCloseTo(expected, 9);
      // B: M1 ancillary component (same helper, rounded to öre like before)
      expect(Math.round(customerAncillaryValueSek(GROSS, share) * 100) / 100).toBeCloseTo(expected, 9);
      // C: result page / PDF
      const ce = customerEconomyFromResult(fakeResult(0, 0), share);
      expect(ce.ancillaryCustomerValueSek).toBeCloseTo(expected, 9);
      expect(ce.totalCustomerBenefitSek).toBeCloseTo(expected, 9);
      // D: ancillary-only uses the helper directly
      expect(customerAncillaryValueSek(GROSS, share)).toBeCloseTo(expected, 9);
      // E: capacity alternatives
      expect(customerBenefitFromTotals(GROSS, GROSS, share)).toBeCloseTo(expected, 9);
      // gross x share x 0.80, applied once
      expect(customerAncillaryValueSek(GROSS, share)).toBeCloseTo(GROSS * share * 0.8, 9);
    });
  }

  it("totals keep their own definitions and the share is applied exactly once", () => {
    const econ = { ...SWEDISH_OPERATING_ECONOMY, customerAncillaryShare: 0.75 };
    expect(annualCustomerBenefitSek(3000, 500, GROSS, econ)).toBe(9500);
    expect(customerEconomyFromResult(fakeResult(3000, 500), 0.75).totalCustomerBenefitSek).toBe(9500);
    expect(customerBenefitFromTotals(3500 + GROSS, GROSS, 0.75)).toBe(9500);
    expect(customerAncillaryValueSek(GROSS, 0.75)).not.toBeCloseTo(GROSS * 0.75 * 0.8 * 0.8, 0);
  });

  it("clamps and falls back exactly like the old local clamps", () => {
    expect(effectiveAncillaryShare(Number.NaN)).toBeCloseTo(0.6, 12);
    expect(effectiveAncillaryShare(undefined)).toBeCloseTo(0.6, 12);
    expect(effectiveAncillaryShare(1.4)).toBeCloseTo(0.8, 12);
    expect(effectiveAncillaryShare(-0.2)).toBe(0);
    expect(customerAncillaryValueSek(null, 0.75)).toBe(0);
  });
});
