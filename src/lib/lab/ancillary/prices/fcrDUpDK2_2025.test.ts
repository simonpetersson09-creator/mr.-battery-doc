import { describe, expect, it } from "vitest";
import {
  FCR_D_UP_DK2_2025,
  FCR_D_UP_SE_2025,
  FCR_D_UP_FI_2025,
  FCR_SYMMETRIC_DE_2025,
  fcrPriceSeriesForCountry,
  hasVerifiedFcrPrices,
} from "./index";
import {
  FCR_D_UP_DK2_2025_ESTIMATED_HOURS,
  FCR_D_UP_DK2_2025_OBSERVED_HOURS,
} from "./fcrDUpDK2_2025";

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return (s[s.length / 2 - 1]! + s[s.length / 2]!) / 2;
};

describe("DK2 FCR-D up 2025 dataset", () => {
  const p = FCR_D_UP_DK2_2025.pricesEurPerMw;

  it("holds exactly 8 760 hours (8 736 observed + 24 estimated)", () => {
    expect(p).toHaveLength(8760);
    expect(FCR_D_UP_DK2_2025.hours).toBe(8760);
    expect(FCR_D_UP_DK2_2025_OBSERVED_HOURS + FCR_D_UP_DK2_2025_ESTIMATED_HOURS).toBe(8760);
  });

  it("is the upward Nordic product, priced in EUR/MW/h", () => {
    expect(FCR_D_UP_DK2_2025.service).toBe("FCR-D up");
    expect(FCR_D_UP_DK2_2025.currency).toBe("EUR");
    expect(FCR_D_UP_DK2_2025.unit).toBe("EUR/MW/h");
    expect(FCR_D_UP_DK2_2025.referenceYear).toBe(2025);
  });

  it("matches the source control statistics", () => {
    const mean = p.reduce((a, b) => a + b, 0) / p.length;
    expect(mean).toBeCloseTo(6.087414, 5);
    expect(median(p)).toBeCloseTo(4.684291, 5);
    expect(Math.min(...p)).toBeCloseTo(0.756451, 6);
    expect(Math.max(...p)).toBeCloseTo(126.136226, 6);
  });

  it("copies the last 24 hours from 2025-12-30 (estimated tail)", () => {
    expect(p.slice(8736)).toEqual(p.slice(8712, 8736));
  });

  it("is wired only to DK2", () => {
    expect(fcrPriceSeriesForCountry("DK2")).toBe(FCR_D_UP_DK2_2025);
    expect(fcrPriceSeriesForCountry("DK1")).toBeNull();
    expect(fcrPriceSeriesForCountry("DK")).toBeNull();
    expect(hasVerifiedFcrPrices("DK1")).toBe(false);
    expect(FCR_D_UP_DK2_2025).not.toBe(FCR_D_UP_SE_2025);
    expect(FCR_D_UP_DK2_2025).not.toBe(FCR_D_UP_FI_2025);
    expect(FCR_D_UP_DK2_2025).not.toBe(FCR_SYMMETRIC_DE_2025);
  });

  it("leaves SE/FI/DE series untouched", () => {
    expect(fcrPriceSeriesForCountry("SE")).toBe(FCR_D_UP_SE_2025);
    expect(fcrPriceSeriesForCountry("FI")).toBe(FCR_D_UP_FI_2025);
    expect(fcrPriceSeriesForCountry("DE")).toBe(FCR_SYMMETRIC_DE_2025);
  });
});
