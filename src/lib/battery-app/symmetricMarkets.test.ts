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
  it("keeps SE, FI and DK2 on the upward product", () => {
    for (const [c, a] of [
      ["SE", undefined],
      ["FI", undefined],
      ["DK", "DK2"],
    ] as const) {
      expect(caseFor(c, a).reserve.reserveMode).toBe("upward");
    }
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

  it("simulates the German physics but reports revenue as unavailable, never 0 kr", () => {
    const { result, reserve } = caseFor("DE");
    expect(reserve.priceModel).toBe("unavailable");
    expect(reserve.physicalHeldPowerAvgKw).toBeGreaterThan(0);
    expect(result.summary.fcr.grossSek).toBeNull();
    expect(result.summary.economy.fcrGrossSek).toBeNull();
  });

  it("never lets symmetric hold more than upward with the same battery and grid", () => {
    const sym = caseFor("DE").reserve;
    const up = caseFor("DK", "DK2").reserve;
    expect(sym.physicalHeldPowerAvgKw).toBeLessThanOrEqual(up.physicalHeldPowerAvgKw + 1e-9);
    expect(Math.min(sym.reservableUpAvgKw, sym.reservableDownAvgKw)).toBeLessThanOrEqual(
      sym.reservableUpAvgKw + 1e-9,
    );
  });

  it("keeps Sweden and Finland producing real revenue on their own datasets", () => {
    const se = caseFor("SE").result.summary.fcr.grossSek;
    const fi = caseFor("FI").result.summary.fcr.grossSek;
    expect(se).not.toBeNull();
    expect(fi).not.toBeNull();
    expect(fi).not.toBeCloseTo(se as number, 0);
  });
});
