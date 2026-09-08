import { describe, expect, it } from "vitest";
import { runBatteryEngine, type BatteryEngineInput } from "@/lib/battery-engine";
import { COUNTRIES, type CountryCode } from "@/lib/country-config";
import { ancillaryDataAvailable } from "@/lib/battery-app/ancillaryAvailability";

function caseFor(country: CountryCode): BatteryEngineInput {
  const c = COUNTRIES[country];
  return {
    site: {
      voltageV: c.grid.voltage,
      phases: c.grid.phases,
      mainFuseA: 25,
      country: country as "SE" | "FI" | "DK" | "DE",
    },
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
    battery: { fixedCapacityKWh: 20, fixedPowerKw: 10 },
  };
}

describe("country selection drives market data, not physics", () => {
  const se = runBatteryEngine(caseFor("SE"));
  const fi = runBatteryEngine(caseFor("FI"));
  const dk = runBatteryEngine(caseFor("DK"));
  const de = runBatteryEngine(caseFor("DE"));

  it("uses the same grid limits for all four at 25 A", () => {
    const fuse = [se, fi, dk, de].map((r) => r.summary.grid.physicalImportKw);
    for (const kw of fuse) expect(kw).toBeCloseTo(17.32, 2);
  });

  it("gives different FCR revenue for Sweden and Finland", () => {
    expect(se.summary.fcr.grossSek).not.toBeNull();
    expect(fi.summary.fcr.grossSek).not.toBeNull();
    expect(fi.summary.fcr.grossSek).not.toBeCloseTo(se.summary.fcr.grossSek as number, 0);
  });

  it("reports ancillary revenue as unavailable (null, not 0) without a verified dataset", () => {
    for (const r of [dk, de]) {
      expect(r.summary.fcr.grossSek).toBeNull();
      expect(r.summary.economy.fcrGrossSek).toBeNull();
      expect(ancillaryDataAvailable(r === dk ? "DK" : "DE")).toBe(false);
    }
  });

  it("keeps the physics country agnostic when ancillary services are off", () => {
    const plain = (c: CountryCode) => {
      const input = caseFor(c);
      input.strategies = { selfConsumption: true, reduceImport: true, peakShaving: true };
      return runBatteryEngine(input).summary.energy;
    };
    const ref = plain("SE");
    for (const c of ["FI", "DK", "DE"] as CountryCode[]) {
      expect(plain(c).importAfterKWh).toBeCloseTo(ref.importAfterKWh, 6);
      expect(plain(c).exportAfterKWh).toBeCloseTo(ref.exportAfterKWh, 6);
    }
  });
});
