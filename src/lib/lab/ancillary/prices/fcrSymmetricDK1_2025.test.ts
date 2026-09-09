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

  it("holds exactly 8 760 hours (8 759 observed + 1 estimated)", () => {
    expect(p).toHaveLength(8760);
    expect(FCR_SYMMETRIC_DK1_2025.hours).toBe(8760);
    expect(FCR_DK1_2025_OBSERVED_HOURS + FCR_DK1_2025_ESTIMATED_HOURS).toBe(8760);
    expect(FCR_DK1_2025_ESTIMATED_HOURS).toBe(1);
  });

  it("is the continental symmetric product, priced in EUR/MW/h", () => {
    expect(FCR_SYMMETRIC_DK1_2025.service).toBe("FCR");
    expect(FCR_SYMMETRIC_DK1_2025.currency).toBe("EUR");
    expect(FCR_SYMMETRIC_DK1_2025.unit).toBe("EUR/MW/h");
    expect(FCR_SYMMETRIC_DK1_2025.referenceYear).toBe(2025);
  });

  it("matches the source control statistics", () => {
    const mean = p.reduce((a, b) => a + b, 0) / p.length;
    expect(mean).toBeCloseTo(15.188314, 5);
    expect(median(p)).toBeCloseTo(11.965, 3);
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
