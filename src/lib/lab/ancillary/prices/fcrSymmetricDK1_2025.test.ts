import { describe, expect, it } from "vitest";
import {
  FCR_D_UP_DK2_2025,
  FCR_D_UP_FI_2025,
  FCR_D_UP_SE_2025,
  FCR_SYMMETRIC_DE_2025,
  FCR_SYMMETRIC_DK1_2025,
  fcrPriceSeriesForCountry,
  hasVerifiedFcrPrices,
} from "./index";
import {
  FCR_DK1_2025_ESTIMATED_HOURS,
  FCR_DK1_2025_OBSERVED_HOURS,
} from "./fcrSymmetricDK1_2025";

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return (s[s.length / 2 - 1]! + s[s.length / 2]!) / 2;
};

describe("DK1 symmetric FCR 2025 dataset", () => {
  const p = FCR_SYMMETRIC_DK1_2025.pricesEurPerMw;

  it("holds exactly 8 760 observed UTC hours and no estimated hours", () => {
    expect(p).toHaveLength(8760);
    expect(FCR_SYMMETRIC_DK1_2025.hours).toBe(8760);
    expect(FCR_DK1_2025_OBSERVED_HOURS + FCR_DK1_2025_ESTIMATED_HOURS).toBe(8760);
    expect(FCR_DK1_2025_ESTIMATED_HOURS).toBe(0);
    expect(FCR_DK1_2025_OBSERVED_HOURS).toBe(8760);
  });

  it("uses UTC as the chronological key across both DST transitions", () => {
    // 2024-12-31T23:00Z .. 2025-12-31T22:00Z = the Danish calendar year 2025.
    expect(FCR_SYMMETRIC_DK1_2025.timestampFrom).toBe("2024-12-31T23:00:00Z");
    expect(FCR_SYMMETRIC_DK1_2025.timestampTo).toBe("2025-12-31T22:00:00Z");
    // Spring: the fabricated local 03:00 row is gone, so 2025-03-30T02:00Z occurs once.
    expect(p[2114]).toBeCloseTo(7.61, 6);
    expect(p[2115]).toBeCloseTo(9.75, 6);
    // Autumn: the repeated local hour exists as its own UTC hour, 2025-10-26T01:00Z.
    expect(p[7153]).toBeCloseTo(13.56, 6);
    expect(p[7154]).toBeCloseTo(13.56, 6);
    expect(p[7155]).toBeCloseTo(13.56, 6);
  });

  it("is the continental symmetric product, priced in EUR/MW/h", () => {
    expect(FCR_SYMMETRIC_DK1_2025.service).toBe("FCR");
    expect(FCR_SYMMETRIC_DK1_2025.currency).toBe("EUR");
    expect(FCR_SYMMETRIC_DK1_2025.unit).toBe("EUR/MW/h");
    expect(FCR_SYMMETRIC_DK1_2025.referenceYear).toBe(2025);
  });

  it("matches the source control statistics", () => {
    const mean = p.reduce((a, b) => a + b, 0) / p.length;
    expect(mean).toBeCloseTo(15.188871, 5);
    expect(median(p)).toBeCloseTo(11.97, 3);
    expect(Math.min(...p)).toBeCloseTo(2.77, 6);
    expect(Math.max(...p)).toBeCloseTo(107.72, 6);
  });

  it("is wired only to DK1 and never falls back to German prices", () => {
    expect(fcrPriceSeriesForCountry("DK1")).toBe(FCR_SYMMETRIC_DK1_2025);
    expect(hasVerifiedFcrPrices("DK1")).toBe(true);
    expect(fcrPriceSeriesForCountry("DK")).toBeNull();
    expect(FCR_SYMMETRIC_DK1_2025).not.toBe(FCR_SYMMETRIC_DE_2025);
    expect(FCR_SYMMETRIC_DK1_2025).not.toBe(FCR_D_UP_DK2_2025);
    expect(FCR_SYMMETRIC_DK1_2025.pricesEurPerMw).not.toEqual(
      FCR_SYMMETRIC_DE_2025.pricesEurPerMw,
    );
  });

  it("leaves SE/FI/DE/DK2 series untouched", () => {
    expect(fcrPriceSeriesForCountry("SE")).toBe(FCR_D_UP_SE_2025);
    expect(fcrPriceSeriesForCountry("FI")).toBe(FCR_D_UP_FI_2025);
    expect(fcrPriceSeriesForCountry("DE")).toBe(FCR_SYMMETRIC_DE_2025);
    expect(fcrPriceSeriesForCountry("DK2")).toBe(FCR_D_UP_DK2_2025);
  });
});
