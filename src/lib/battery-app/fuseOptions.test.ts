import { describe, expect, it } from "vitest";
import {
  COUNTRIES,
  defaultFuseA,
  fuseOptions,
  isListedFuse,
  theoreticalGridPowerKw,
  type CountryCode,
} from "@/lib/country-config";
import { reserveMarketConfig } from "@/lib/reserve-market";
import { runBatteryEngine, type BatteryEngineInput } from "@/lib/battery-engine";

const FOUR: CountryCode[] = ["SE", "FI", "DK", "DE"];

describe("country specific main fuse options", () => {
  it("A. Sweden lists the Swedish sizes", () => {
    expect(fuseOptions("SE")).toEqual([16, 20, 25, 35, 50, 63, 80, 100, 125, 160, 200]);
  });

  it("B. Finland keeps its own primary list and still allows 16/20 A", () => {
    expect(COUNTRIES.FI.grid.commonMainFuses).toEqual([25, 35, 50, 63, 80, 100, 125, 160, 200]);
    expect(fuseOptions("FI")).toEqual([16, 20, 25, 35, 50, 63, 80, 100, 125, 160, 200]);
  });

  it("C. Denmark lists the Danish sizes", () => {
    expect(fuseOptions("DK")).toEqual([16, 20, 25, 32, 35, 40, 50, 63, 80, 100]);
  });

  it("D. Germany lists the German sizes", () => {
    expect(fuseOptions("DE")).toEqual([16, 20, 25, 32, 35, 40, 50, 63, 80, 100]);
  });

  it("E. DK1 and DK2 share one fuse list (price area never changes fuses)", () => {
    expect(reserveMarketConfig("DK", "DK1")!.priceArea).toBe("DK1");
    expect(reserveMarketConfig("DK", "DK2")!.priceArea).toBe("DK2");
    expect(fuseOptions("DK")).toEqual(fuseOptions("DK"));
  });

  it("F. every country keeps a manual option available (45 A is not listed anywhere)", () => {
    for (const c of FOUR) expect(isListedFuse(c, 45)).toBe(false);
  });

  it("G. a manual 45 A uses the exact same grid physics", () => {
    for (const c of FOUR) expect(theoreticalGridPowerKw(45, c)).toBeCloseTo(31.18, 2);
  });

  it("H. 16 A -> 11.09 kW in all four countries", () => {
    for (const c of FOUR) expect(theoreticalGridPowerKw(16, c)).toBeCloseTo(11.09, 2);
  });

  it("I. 25 A -> 17.32 kW in all four countries", () => {
    for (const c of FOUR) expect(theoreticalGridPowerKw(25, c)).toBeCloseTo(17.32, 2);
  });

  it("J. 32 A -> 22.17 kW in Denmark and Germany", () => {
    expect(theoreticalGridPowerKw(32, "DK")).toBeCloseTo(22.17, 2);
    expect(theoreticalGridPowerKw(32, "DE")).toBeCloseTo(22.17, 2);
  });

  it("K. defaults stay country specific", () => {
    expect(defaultFuseA("SE")).toBe(20);
    expect(defaultFuseA("FI")).toBe(25);
    expect(defaultFuseA("DK")).toBe(25);
    expect(defaultFuseA("DE")).toBe(35);
    for (const c of FOUR) expect(isListedFuse(c, defaultFuseA(c))).toBe(true);
  });

  it("L. reserve routing is unchanged by the fuse work", () => {
    expect(reserveMarketConfig("SE")!.product).toBe("FCR_D_UP");
    expect(reserveMarketConfig("FI")!.product).toBe("FCR_D_UP");
    expect(reserveMarketConfig("DE")!.product).toBe("FCR");
    expect(reserveMarketConfig("DK")).toBeNull();
  });

  it("M. identical ampere value gives an identical recommendation across countries", () => {
    const input = (country: "SE" | "DE"): BatteryEngineInput => ({
      site: { voltageV: 400, phases: 3, mainFuseA: 125, country },
      consumption: { annualKWh: 20000, profile: "normal" },
      production: { enabled: true, annualKWh: 14000, kWp: 14 },
      strategies: { selfConsumption: true, reduceImport: true, peakShaving: true },
      economy: {
        importEnergyPriceSekPerKWh: 1.5,
        exportEnergyValueSekPerKWh: 0.6,
        peakDemandChargeSekPerKwMonth: 30,
        peakTariffSource: "default-estimate",
        eurSekRate: 11.3,
      },
    });
    const se = runBatteryEngine(input("SE"));
    const de = runBatteryEngine(input("DE"));
    expect(de.summary.grid.physicalImportKw).toBeCloseTo(se.summary.grid.physicalImportKw, 6);
    expect(de.summary.recommendation.capacityKWh).toBeCloseTo(
      se.summary.recommendation.capacityKWh,
      6,
    );
    expect(de.summary.recommendation.recommendedPowerKw).toBeCloseTo(
      se.summary.recommendation.recommendedPowerKw,
      6,
    );
  });
});
