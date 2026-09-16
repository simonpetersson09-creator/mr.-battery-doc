/**
 * FCR-D NED (FINLAND) — dataset, marknadsregler, fysik och ekonomi.
 *
 * Reglerna som testas:
 *  - Finland kör FCR-D upp OCH FCR-D ned som två separata produkter på samma batteri.
 *  - Finland använder sin EGEN prisserie (Fingrid) och sina egna marknadsregler.
 *  - Ingen svensk prisdata eller svensk marknadsdefinition används för Finland.
 *  - FCR-N är helt exkluderad.
 *  - Ingen dubbelräkning av kW/kWh mellan upp och ned.
 *  - Sverige, DK1, DK2 och Tyskland påverkas inte av den finska serien.
 */

import { describe, expect, it } from "vitest";
import { runBatteryEngine, type BatteryEngineInput } from "@/lib/battery-engine";
import {
  FCR_D_DOWN_FI_2025,
  FCR_D_DOWN_FI_2025_ESTIMATED_HOUR_INDEX,
  FCR_D_DOWN_FI_2025_ESTIMATED_HOUR_PRICE_EUR_PER_MW,
} from "./prices/fcrDDownFI2025";
import { FCR_D_UP_FI_2025 } from "./prices/fcrDUpFI2025";
import { FCR_D_DOWN_SE_2025 } from "./prices/fcrDDownSE2025";
import { fcrDownPriceSeriesForCountry, fcrPriceSeriesForCountry } from "./prices";
import { FI_MARKET, FI_PARKED_SERVICES } from "./markets/fi";
import { SE_MARKET } from "./markets/se";
import { activeServices, marketProfileForPriceArea, reserveModeForMarket } from "./index";

function caseFor(
  country: "SE" | "FI" | "DK" | "DE",
  marketArea: "DK1" | "DK2" | null = null,
  battery: { fixedCapacityKWh: number; fixedPowerKw: number } = {
    fixedCapacityKWh: 10,
    fixedPowerKw: 10,
  },
) {
  const input: BatteryEngineInput = {
    site: { voltageV: 400, phases: 3, mainFuseA: 25, country, marketArea },
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
    battery,
  };
  const r = runBatteryEngine(input);
  return { result: r, sim: r.diagnostics.simulation };
}

describe("FCR-D ned Finland: dataset", () => {
  const p = FCR_D_DOWN_FI_2025.pricesEurPerMw;

  it("har exakt 8 760 giltiga timpriser i EUR/MW/h för 2025", () => {
    expect(p).toHaveLength(8760);
    expect(p.every((v) => Number.isFinite(v) && v > 0)).toBe(true);
    expect(FCR_D_DOWN_FI_2025.unit).toBe("EUR/MW/h");
    expect(FCR_D_DOWN_FI_2025.service).toBe("FCR-D down");
    expect(FCR_D_DOWN_FI_2025.referenceYear).toBe(2025);
  });

  it("dokumenterar att endast sista timmen är estimerad", () => {
    expect(FCR_D_DOWN_FI_2025.sourceHours).toBe(8759);
    expect(FCR_D_DOWN_FI_2025_ESTIMATED_HOUR_INDEX).toBe(8759);
    expect(p[FCR_D_DOWN_FI_2025_ESTIMATED_HOUR_INDEX]).toBe(
      FCR_D_DOWN_FI_2025_ESTIMATED_HOUR_PRICE_EUR_PER_MW,
    );
  });

  it("ligger i takt med den finska upp-serien (samma marknadstimme på index 0)", () => {
    expect(FCR_D_DOWN_FI_2025.timestampFrom).toBe(FCR_D_UP_FI_2025.timestampFrom);
    expect(FCR_D_DOWN_FI_2025.hours).toBe(FCR_D_UP_FI_2025.hours);
  });

  it("är varken en kopia av den finska upp-serien eller av svensk data", () => {
    expect(p).not.toEqual(FCR_D_UP_FI_2025.pricesEurPerMw);
    expect(p).not.toEqual(FCR_D_DOWN_SE_2025.pricesEurPerMw);
  });

  it("används bara för Finland", () => {
    expect(fcrDownPriceSeriesForCountry("FI")).toBe(FCR_D_DOWN_FI_2025);
    expect(fcrDownPriceSeriesForCountry("SE")).toBe(FCR_D_DOWN_SE_2025);
    for (const a of ["DE", "DK1", "DK2", undefined] as const)
      expect(fcrDownPriceSeriesForCountry(a)).toBeNull();
    expect(fcrPriceSeriesForCountry("FI")).toBe(FCR_D_UP_FI_2025);
  });
});

describe("finska marknadsregler", () => {
  it("Finland har en egen profil med upp och ned, utan FCR-N", () => {
    expect(marketProfileForPriceArea("FI")).toBe(FI_MARKET);
    expect(FI_MARKET.services.map((s) => s.key)).toEqual(["FCR-D-up", "FCR-D-down"]);
    expect(FI_PARKED_SERVICES).toHaveLength(0);
    expect(FI_MARKET.services.some((s) => s.key === "FCR-N")).toBe(false);
    expect(activeServices(FI_MARKET, "up-and-down").map((s) => s.key)).toEqual([
      "FCR-D-up",
      "FCR-D-down",
    ]);
  });

  it("nedprodukten använder finska SOC-/uthållighetskrav", () => {
    const down = FI_MARKET.services.find((s) => s.key === "FCR-D-down")!;
    expect(down.direction).toBe("down");
    expect(down.requirements.enduranceHours).toBe(0.35);
    expect(down.requirements.serviceMinSocPct).toBe(5);
    expect(down.requirements.serviceMaxSocPct).toBe(80);
    expect(down.requirements.socHeadroomPct).toBe(5);
  });

  it("Finland routas till upp + ned, övriga marknader oförändrade", () => {
    expect(reserveModeForMarket("FI")).toBe("up-and-down");
    expect(reserveModeForMarket("SE")).toBe("up-and-down");
    expect(reserveModeForMarket("DK", "DK2")).toBe("upward");
    expect(reserveModeForMarket("DK", "DK1")).toBe("symmetric");
    expect(reserveModeForMarket("DE")).toBe("symmetric");
  });

  it("svensk profil används inte för Finland", () => {
    expect(marketProfileForPriceArea("FI")).not.toBe(SE_MARKET);
  });
});

describe("finsk fysik och ekonomi", () => {
  const fi = caseFor("FI");
  const a = fi.sim.ancillary;

  it("håller reservation i båda riktningarna", () => {
    expect(a.reserveMode).toBe("up-and-down");
    expect(a.heldPowerAvgKw).toBeGreaterThan(0);
    expect(a.downHeldPowerAvgKw).toBeGreaterThan(0);
  });

  it("ingen riktning överstiger erbjuden/fysisk effekt (ingen dubbelräkning)", () => {
    expect(a.heldPowerAvgKw).toBeLessThanOrEqual(a.reservedPowerUpKw + 1e-6);
    expect(a.downHeldPowerAvgKw).toBeLessThanOrEqual(a.reservedPowerUpKw + 1e-6);
    expect(a.reservedPowerUpKw).toBeLessThanOrEqual(10 + 1e-6);
  });

  it("upp och ned redovisas separat och summerar till bruttot", () => {
    const e = fi.result.summary.fcr;
    expect(e.grossUpSek).not.toBeNull();
    expect(e.grossDownSek).not.toBeNull();
    expect(e.grossDownSek!).toBeGreaterThan(0);
    expect(e.grossSek).toBeCloseTo((e.grossUpSek ?? 0) + (e.grossDownSek ?? 0), 6);
    expect(e.monthlyGrossSek!).toHaveLength(12);
  });

  it("energibalansen håller", () => {
    expect(Math.abs(fi.sim.energyBalance.residualKWh)).toBeLessThan(1);
  });

  it("FCR-N syns inte i resultatet", () => {
    expect(JSON.stringify(fi.sim.ancillary)).not.toMatch(/FCR-N/);
  });
});

describe("Finland påverkar inte andra marknader", () => {
  it("DK2, DK1 och DE har fortfarande ingen nedintäkt", () => {
    for (const [c, area] of [
      ["DK", "DK2"],
      ["DK", "DK1"],
      ["DE", null],
    ] as const) {
      const sim = caseFor(c, area).sim;
      expect(sim.ancillary.fcrDown).toBeNull();
      expect(sim.ancillary.downHeldPowerAvgKw).toBe(0);
    }
  });

  it("Sverige använder fortfarande svensk data", () => {
    const se = caseFor("SE");
    expect(se.sim.ancillary.fcrDown).not.toBeNull();
    expect(fcrDownPriceSeriesForCountry("SE")).toBe(FCR_D_DOWN_SE_2025);
  });
});
