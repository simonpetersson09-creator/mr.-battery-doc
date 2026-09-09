import { describe, expect, it } from "vitest";

import { computeFcrRevenue, flatReservation, priceStats } from "../fcrEconomics";
import { FCR_D_UP_FI_2025 } from "./fcrDUpFI2025";
import { FCR_D_UP_SE_2025 } from "./fcrDUpSE2025";
import { FCR_SYMMETRIC_DE_2025 } from "./fcrSymmetricDE2025";
import { fcrPriceSeriesForCountry } from "./index";

describe("Germany symmetric FCR 2025 import", () => {
  const src = FCR_SYMMETRIC_DE_2025.sourcePricesEurPerMw!;

  it("reads exactly 8 760 hourly source prices, one per engine hour", () => {
    expect(FCR_SYMMETRIC_DE_2025.sourceHours).toBe(8760);
    expect(src).toHaveLength(8760);
    expect(FCR_SYMMETRIC_DE_2025.pricesEurPerMw).toHaveLength(8760);
    for (let h = 0; h < 8760; h++) expect(FCR_SYMMETRIC_DE_2025.pricesEurPerMw[h]).toBe(src[h]);
  });

  it("keeps the published unit, the symmetric product and the source window", () => {
    expect(FCR_SYMMETRIC_DE_2025.unit).toBe("EUR/MW/h");
    expect(FCR_SYMMETRIC_DE_2025.currency).toBe("EUR");
    expect(FCR_SYMMETRIC_DE_2025.service).toBe("FCR");
    expect(FCR_SYMMETRIC_DE_2025.sourceType).toBe("historical");
    expect(FCR_SYMMETRIC_DE_2025.timestampFrom).toBe("2025-01-01T00:00:00.000Z");
    expect(FCR_SYMMETRIC_DE_2025.timestampTo).toBe("2025-12-31T23:00:00.000Z");
  });

  it("matches the source file statistics exactly", () => {
    expect(src[0]).toBe(15.775);
    expect(src[8759]).toBe(3.75);
    expect(src.every((v) => Number.isFinite(v) && v >= 0)).toBe(true);
    expect(Math.min(...src)).toBeCloseTo(2.77, 6);
    expect(Math.max(...src)).toBeCloseTo(107.715, 6);
    expect(src.reduce((a, b) => a + b, 0)).toBeCloseTo(133040.93, 2);
    expect(src.reduce((a, b) => a + b, 0) / 8760).toBeCloseTo(15.1873207, 5);
  });

  it("the four-hour blocks are preserved: hours inside a block share one price", () => {
    for (let block = 0; block < 6; block++) {
      const base = src[block * 4]!;
      for (let i = 1; i < 4; i++) expect(src[block * 4 + i]).toBe(base);
    }
  });

  it("registers Germany and leaves Sweden, Finland and Denmark untouched", () => {
    expect(fcrPriceSeriesForCountry("DE")).toBe(FCR_SYMMETRIC_DE_2025);
    expect(fcrPriceSeriesForCountry("SE")).toBe(FCR_D_UP_SE_2025);
    expect(fcrPriceSeriesForCountry("FI")).toBe(FCR_D_UP_FI_2025);
    expect(fcrPriceSeriesForCountry("DK")).toBeNull();
    // DK1/DK2 har egna verifierade dataset och får aldrig falla tillbaka på det tyska.
    expect(fcrPriceSeriesForCountry("DK1")).not.toBe(FCR_SYMMETRIC_DE_2025);
  });

  it("1 kW held every hour is priced as kW/1000 * EUR/MW/h", () => {
    const r = computeFcrRevenue({
      reservedPowerKwByHour: flatReservation(1),
      series: FCR_SYMMETRIC_DE_2025,
    });
    expect(r.annualGrossEur).toBeCloseTo(133040.93 / 1000, 6);
    expect(r.warnings).toHaveLength(0);
  });

  it("the German level differs from the Nordic ones", () => {
    const de = priceStats(FCR_SYMMETRIC_DE_2025).grossEurPerKwYear;
    expect(de).toBeGreaterThan(priceStats(FCR_D_UP_SE_2025).grossEurPerKwYear);
    expect(de).toBeGreaterThan(priceStats(FCR_D_UP_FI_2025).grossEurPerKwYear);
  });
});
