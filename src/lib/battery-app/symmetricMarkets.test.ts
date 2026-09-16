/**
 * Market routing at ENGINE level: Sweden/Finland/DK2 keep the upward FCR-D up product,
 * Germany and DK1 use the symmetric FCR product, and a market without verified prices
 * still gets its physics simulated (revenue stays unavailable, never 0 kr).
 */

import { describe, expect, it } from "vitest";
import { runBatteryEngine, type BatteryEngineInput } from "@/lib/battery-engine";

function caseFor(country: "SE" | "FI" | "DK" | "DE", marketArea?: "DK1" | "DK2") {
  const input: BatteryEngineInput = {
    site: { voltageV: 400, phases: 3, mainFuseA: 25, country, marketArea: marketArea ?? null },
    consumption: { annualKWh: 20000, profile: "normal" },
    production: { enabled: true, annualKWh: 14000, kWp: 14 },
    strategies: {
      selfConsumption: true,
      reduceImport: true,
      peakShaving: true,
      fcrDUp: true,
      optimiseFcrReservation: true,
    },
    economy: {
      importEnergyPriceSekPerKWh: 1.5,
      exportEnergyValueSekPerKWh: 0.6,
      peakDemandChargeSekPerKwMonth: 30,
      peakTariffSource: "default-estimate",
      eurSekRate: 11.3,
    },
    battery: { fixedCapacityKWh: 30, fixedPowerKw: 15 },
  };
  const r = runBatteryEngine(input);
  return {
    result: r,
    reserve: r.diagnostics.reservePhysicalPreview ?? r.diagnostics.simulation.ancillary,
  };
}

describe("reserve product per market", () => {
  it("puts SE, FI and DK2 on FCR-D upp + ned", () => {
    expect(caseFor("SE").reserve.reserveMode).toBe("up-and-down");
    expect(caseFor("FI").reserve.reserveMode).toBe("up-and-down");
    expect(caseFor("DK", "DK2").reserve.reserveMode).toBe("up-and-down");
  });

  it("puts Germany and DK1 on the symmetric product", () => {
    for (const [c, a] of [
      ["DE", undefined],
      ["DK", "DK1"],
    ] as const) {
      const { reserve } = caseFor(c, a);
      expect(reserve.reserveMode).toBe("symmetric");
      expect(reserve.physicalModel).toBe("ready");
    }
  });

  it("prices the German symmetric reserve on its own verified dataset", () => {
    const { result, reserve } = caseFor("DE");
    expect(reserve.priceModel).toBe("ready");
    expect(reserve.physicalHeldPowerAvgKw).toBeGreaterThan(0);
    expect(result.summary.fcr.grossSek).not.toBeNull();
    expect(result.summary.fcr.grossSek as number).toBeGreaterThan(0);
  });

  it("DK1 prices the symmetric reserve on its own verified Energinet dataset", () => {
    const { result, reserve } = caseFor("DK", "DK1");
    expect(reserve.priceModel).toBe("ready");
    expect(reserve.physicalHeldPowerAvgKw).toBeGreaterThan(0);
    expect(result.summary.fcr.grossSek).not.toBeNull();
    expect(result.summary.fcr.grossSek as number).toBeGreaterThan(0);
    // Aldrig samma intäkt som Tyskland (eget dataset, ingen fallback).
    expect(result.summary.fcr.grossSek).not.toBe(caseFor("DE").result.summary.fcr.grossSek);
  });

  /**
   * The symmetric product is checked AGAINST ITSELF. A cross-market comparison with the
   * Nordic product is no longer physically meaningful: Nordic FCR-D now carries a 20 %
   * NEM power reservation and a 20 min endurance, while the continental product keeps
   * its own (still unverified) legacy profile and no NEM rule.
   */
  it("never lets symmetric hold more than its own weakest direction", () => {
    const sym = caseFor("DE").reserve;
    const weakest = Math.min(sym.reservableUpAvgKw, sym.reservableDownAvgKw);
    expect(sym.physicalHeldPowerAvgKw).toBeLessThanOrEqual(weakest + 1e-9);
  });

  it("keeps Sweden and Finland producing real revenue on their own datasets", () => {
    const se = caseFor("SE").result.summary.fcr.grossSek;
    const fi = caseFor("FI").result.summary.fcr.grossSek;
    expect(se).not.toBeNull();
    expect(fi).not.toBeNull();
    expect(fi).not.toBeCloseTo(se as number, 0);
  });
});
