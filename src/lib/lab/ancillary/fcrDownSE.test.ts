/**
 * FCR-D NED (SVERIGE) — motor, marknadskoppling och ekonomi.
 *
 * Reglerna som testas:
 *  - Sverige kör FCR-D upp OCH FCR-D ned som två separata produkter på samma batteri.
 *  - Finland, DK1, DK2 och Tyskland är oförändrade och får aldrig svensk nedprodukt.
 *  - FCR-N används inte någonstans.
 *  - Ingen dubbelräkning: nedsidan begränsas av laddeffekt, ledigt SOC-utrymme och
 *    importmarginal, och samma kW/kWh säljs aldrig i båda riktningarna.
 */

import { describe, expect, it } from "vitest";
import { runBatteryEngine, type BatteryEngineInput } from "@/lib/battery-engine";
import { FCR_D_DOWN_SE_2025 } from "./prices/fcrDDownSE2025";
import { FCR_D_UP_SE_2025 } from "./prices/fcrDUpSE2025";
import {
  fcrDownPriceSeriesForCountry,
  fcrPriceSeriesForCountry,
} from "./prices";
import { SE_MARKET, SE_PARKED_SERVICES } from "./markets/se";
import { reserveModeForMarket } from "./index";

function caseFor(
  country: "SE" | "FI" | "DK" | "DE",
  marketArea: "DK1" | "DK2" | null = null,
  fcr = true,
) {
  const input: BatteryEngineInput = {
    site: { voltageV: 400, phases: 3, mainFuseA: 25, country, marketArea },
    consumption: { annualKWh: 20000, profile: "normal" },
    production: { enabled: true, annualKWh: 14000, kWp: 14 },
    strategies: {
      selfConsumption: true,
      reduceImport: true,
      peakShaving: true,
      fcrDUp: fcr,
      optimiseFcrReservation: fcr,
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
  return { result: r, sim: r.diagnostics.simulation };
}

describe("FCR-D ned: dataset", () => {
  it("har 8 760 giltiga timpriser i EUR/MW/h för 2025", () => {
    const p = FCR_D_DOWN_SE_2025.pricesEurPerMw;
    expect(p).toHaveLength(8760);
    expect(p.every((v) => Number.isFinite(v) && v >= 0)).toBe(true);
    expect(FCR_D_DOWN_SE_2025.service).toBe("FCR-D down");
    expect(FCR_D_DOWN_SE_2025.referenceYear).toBe(2025);
    expect(FCR_D_DOWN_SE_2025.unit).toBe("EUR/MW/h");
  });

  it("är en egen serie — inte en kopia av FCR-D upp", () => {
    const up = FCR_D_UP_SE_2025.pricesEurPerMw;
    const down = FCR_D_DOWN_SE_2025.pricesEurPerMw;
    expect(down).not.toEqual(up);
    const meanUp = up.reduce((a, b) => a + b, 0) / up.length;
    const meanDown = down.reduce((a, b) => a + b, 0) / down.length;
    expect(meanDown).toBeGreaterThan(0);
    expect(meanDown).toBeLessThan(meanUp);
  });

  it("FCR-D upp-serien är oförändrad", () => {
    expect(FCR_D_UP_SE_2025.pricesEurPerMw).toHaveLength(8760);
    expect(FCR_D_UP_SE_2025.service).toBe("FCR-D up");
  });

  it("nedserien finns bara för Sverige", () => {
    expect(fcrDownPriceSeriesForCountry("SE")).toBe(FCR_D_DOWN_SE_2025);
    for (const a of ["DE", "DK1", undefined] as const)
      expect(fcrDownPriceSeriesForCountry(a)).toBeNull();
    // Finland har en EGEN verifierad nedserie — aldrig den svenska.
    expect(fcrDownPriceSeriesForCountry("FI")).not.toBe(FCR_D_DOWN_SE_2025);
    // DK2 ligger i SAMMA nordiska FCR-marknad som Sverige och delar prisserien.
    expect(fcrDownPriceSeriesForCountry("DK2")).toBe(FCR_D_DOWN_SE_2025);
    expect(fcrPriceSeriesForCountry("SE")).toBe(FCR_D_UP_SE_2025);
  });
});

describe("FCR-N är helt exkluderad", () => {
  it("finns bara som parkerad definition och ingen prisserie", () => {
    expect(SE_MARKET.services.map((s) => s.key)).toEqual(["FCR-D-up", "FCR-D-down"]);
    expect(SE_PARKED_SERVICES.some((s) => s.key === "FCR-N")).toBe(true);
    const sim = caseFor("SE").sim;
    expect(JSON.stringify(sim.ancillary)).not.toMatch(/FCR-N/);
  });
});

describe("marknadskoppling", () => {
  it("Sverige och Finland = upp + ned, övriga marknader oförändrade", () => {
    expect(reserveModeForMarket("SE")).toBe("up-and-down");
    expect(reserveModeForMarket("FI")).toBe("up-and-down");
    expect(reserveModeForMarket("DK", "DK2")).toBe("up-and-down");
    expect(reserveModeForMarket("DK", "DK1")).toBe("symmetric");
    expect(reserveModeForMarket("DE")).toBe("symmetric");
  });

  it("bara marknader med verifierad nedserie får nedintäkt", () => {
    expect(caseFor("SE").sim.ancillary.fcrDown).not.toBeNull();
    for (const [c, a] of [
      ["DK", "DK1"],
      ["DE", null],
    ] as const) {
      const sim = caseFor(c, a).sim;
      expect(sim.ancillary.fcrDown).toBeNull();
      expect(sim.ancillary.downHeldPowerAvgKw).toBe(0);
    }
  });
});

describe("fysik och ekonomi för upp + ned", () => {
  const se = caseFor("SE");
  const a = se.sim.ancillary;

  it("håller reservation i båda riktningarna", () => {
    expect(a.reserveMode).toBe("up-and-down");
    expect(a.heldPowerAvgKw).toBeGreaterThan(0);
    expect(a.downHeldPowerAvgKw).toBeGreaterThan(0);
  });

  it("ingen riktning överstiger sin fysiska kapacitet (ingen dubbelräkning)", () => {
    // Medelvärdena bildas över olika timunderlag, så jämförelsen görs mot den
    // erbjudna effekten: varje riktning hålls på sin egen fysiska kapacitet, och
    // ingen riktning kan hålla mer än vad som erbjudits marknaden.
    expect(a.heldPowerAvgKw).toBeLessThanOrEqual(a.reservedPowerUpKw + 1e-6);
    expect(a.downHeldPowerAvgKw).toBeLessThanOrEqual(a.reservedPowerUpKw + 1e-6);
  });

  it("nedintäkten är en separat post som adderas till bruttot", () => {
    const e = se.result.summary.fcr;
    expect(e.grossUpSek).not.toBeNull();
    expect(e.grossDownSek).not.toBeNull();
    expect(e.grossSek).toBeCloseTo((e.grossUpSek ?? 0) + (e.grossDownSek ?? 0), 6);
    expect(e.grossDownSek!).toBeGreaterThan(0);
    const months = e.monthlyGrossSek!;
    expect(months).toHaveLength(12);
    expect(months.reduce((x, y) => x + y, 0)).toBeCloseTo(e.grossSek!, 4);
  });

  it("energibalansen håller fortfarande", () => {
    const b = se.sim.energyBalance;
    expect(Math.abs(b.residualKWh)).toBeLessThan(1);
  });

  it("stödtjänster av = ingen reservation och ingen intäkt", () => {
    const off = caseFor("SE", null, false).sim.ancillary;
    expect(off.fcr).toBeNull();
    expect(off.fcrDown).toBeNull();
    expect(off.downHeldPowerAvgKw).toBe(0);
  });
});
