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

describe("central customer ancillary value (refactor, factor 1.00)", () => {
  it("revenue factor is still 1.00 — no safety margin introduced", () => {
    expect(ANCILLARY_REVENUE_FACTOR).toBe(1);
  });

  for (const [share, expected] of [
    [0.6, 6000],
    [0.75, 7500],
    [1, 10000],
  ] as const) {
    it(`traces ${GROSS} kr gross at ${share * 100} % identically through A–E`, () => {
      const econ = { ...SWEDISH_OPERATING_ECONOMY, customerAncillaryShare: share };
      // A: engine objective / K1 total (energy 0, peak 0 isolates the ancillary term)
      expect(annualCustomerBenefitSek(0, 0, GROSS, econ)).toBe(expected);
      // B: M1 ancillary component (same helper, rounded to öre like before)
      expect(Math.round(customerAncillaryValueSek(GROSS, share) * 100) / 100).toBe(expected);
      // C: result page / PDF
      const ce = customerEconomyFromResult(fakeResult(0, 0), share);
      expect(ce.ancillaryCustomerValueSek).toBe(expected);
      expect(ce.totalCustomerBenefitSek).toBe(expected);
      // D: ancillary-only uses the helper directly
      expect(customerAncillaryValueSek(GROSS, share)).toBe(expected);
      // E: capacity alternatives
      expect(customerBenefitFromTotals(GROSS, GROSS, share)).toBe(expected);
      // Old inline formula, bit for bit
      expect(customerAncillaryValueSek(GROSS, share)).toBe(GROSS * share);
    });
  }

  it("totals keep their own definitions and the share is applied exactly once", () => {
    const econ = { ...SWEDISH_OPERATING_ECONOMY, customerAncillaryShare: 0.75 };
    expect(annualCustomerBenefitSek(3000, 500, GROSS, econ)).toBe(11000);
    expect(customerEconomyFromResult(fakeResult(3000, 500), 0.75).totalCustomerBenefitSek).toBe(11000);
    expect(customerBenefitFromTotals(3500 + GROSS, GROSS, 0.75)).toBe(11000);
    expect(customerAncillaryValueSek(GROSS, 0.75)).not.toBe(GROSS * 0.75 * 0.75);
  });

  it("clamps and falls back exactly like the old local clamps", () => {
    expect(effectiveAncillaryShare(Number.NaN)).toBe(0.75);
    expect(effectiveAncillaryShare(undefined)).toBe(0.75);
    expect(effectiveAncillaryShare(1.4)).toBe(1);
    expect(effectiveAncillaryShare(-0.2)).toBe(0);
    expect(customerAncillaryValueSek(null, 0.75)).toBe(0);
  });
});
