import { describe, expect, it } from "vitest";

import { computeFcrRevenue, flatReservation, priceStats } from "../fcrEconomics";
import { FCR_D_UP_FI_2025 } from "./fcrDUpFI2025";
import { FCR_D_UP_SE_2025 } from "./fcrDUpSE2025";
import { fcrPriceSeriesForCountry } from "./index";

describe("Finland FCR-D up 2025 import (Fingrid)", () => {
  const src = FCR_D_UP_FI_2025.sourcePricesEurPerMw!;

  it("reads exactly 8 736 source prices", () => {
    expect(FCR_D_UP_FI_2025.sourceHours).toBe(8736);
    expect(src).toHaveLength(8736);
  });

  it("keeps unit and metadata", () => {
    expect(FCR_D_UP_FI_2025.unit).toBe("EUR/MW/h");
    expect(FCR_D_UP_FI_2025.currency).toBe("EUR");
    expect(FCR_D_UP_FI_2025.timestampFrom).toBe("2024-12-31T23:00:00.000Z");
    expect(FCR_D_UP_FI_2025.timestampTo).toBe("2025-12-30T22:00:00.000Z");
  });

  it("first and last values match the source file", () => {
    expect(src[0]).toBe(1);
    expect(src[8735]).toBe(1.54);
    expect(src[8734]).toBe(1.81);
  });

  it("no value is lost or NaN, and the annual sum matches the file", () => {
    expect(src.every((v) => Number.isFinite(v) && v >= 0)).toBe(true);
    const sum = src.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(100991.84, 2);
    expect(sum / 8736).toBeCloseTo(11.5604212, 5);
  });

  it("maps to the engine's 8 760 hour model year by documented wrap", () => {
    expect(FCR_D_UP_FI_2025.pricesEurPerMw).toHaveLength(8760);
    for (let h = 0; h < 8760; h++) {
      expect(FCR_D_UP_FI_2025.pricesEurPerMw[h]).toBe(src[h % 8736]);
    }
  });

  it("registry maps FI to Fingrid and SE to the untouched Swedish series", () => {
    expect(fcrPriceSeriesForCountry("FI")).toBe(FCR_D_UP_FI_2025);
    expect(fcrPriceSeriesForCountry("SE")).toBe(FCR_D_UP_SE_2025);
    expect(fcrPriceSeriesForCountry(undefined)).toBe(FCR_D_UP_SE_2025);
    expect(FCR_D_UP_SE_2025.hours).toBe(8760);
    expect(priceStats(FCR_D_UP_SE_2025).hours).toBe(8760);
  });

  it("1 kW held every hour is priced as kW/1000 * EUR/MW/h", () => {
    const r = computeFcrRevenue({
      reservedPowerKwByHour: flatReservation(1),
      series: FCR_D_UP_FI_2025,
    });
    const expected = FCR_D_UP_FI_2025.pricesEurPerMw.reduce((a, b) => a + b, 0) / 1000;
    expect(r.annualGrossEur).toBeCloseTo(expected, 6);
    expect(r.warnings).toHaveLength(0);
  });

  it("Finland's historical level differs from Sweden's", () => {
    const fi = priceStats(FCR_D_UP_FI_2025).grossEurPerKwYear;
    const se = priceStats(FCR_D_UP_SE_2025).grossEurPerKwYear;
    expect(fi).toBeGreaterThan(se);
  });
});
