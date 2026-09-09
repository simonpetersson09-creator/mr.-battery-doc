import { describe, expect, it } from "vitest";
import {
  COUNTRIES,
  SUPPORTED_COUNTRY_CODES,
  gridStandardLabel,
  theoreticalGridPowerKw,
  type CountryCode,
} from "@/lib/country-config";
import {
  FCR_D_UP_FI_2025,
  FCR_D_UP_SE_2025,
  fcrPriceSeriesForCountry,
  hasVerifiedFcrPrices,
} from "@/lib/lab/ancillary/prices";
import { reserveMarketConfig } from "@/lib/reserve-market";

const FOUR: CountryCode[] = ["SE", "FI", "DK", "DE"];

describe("country grid config", () => {
  it("ships exactly the four v1 countries", () => {
    expect(SUPPORTED_COUNTRY_CODES).toEqual(FOUR);
  });

  it("uses 3-phase 400 V / 50 Hz for all four", () => {
    for (const c of FOUR) {
      const g = COUNTRIES[c].grid;
      expect([g.voltage, g.phases, g.frequency]).toEqual([400, 3, 50]);
      expect(gridStandardLabel(c)).toBe("3-fas 400 V");
    }
  });

  it("gives 17.32 kW at 25 A in every country (one shared grid engine)", () => {
    for (const c of FOUR) {
      expect(theoreticalGridPowerKw(25, c)).toBeCloseTo(17.32, 2);
    }
  });

  it.each([
    [16, 11.09],
    [20, 13.86],
    [25, 17.32],
    [35, 24.25],
    [50, 34.64],
    [63, 43.65],
    [80, 55.43],
    [100, 69.28],
  ])("%i A -> %f kW", (a, kw) => {
    expect(theoreticalGridPowerKw(a, "SE")).toBeCloseTo(kw, 2);
  });

  it("keeps fuse option lists country specific, not hardcoded shared", () => {
    expect(COUNTRIES.SE.grid.commonMainFuses).not.toEqual(COUNTRIES.FI.grid.commonMainFuses);
  });
});

describe("country ancillary market config", () => {
  it("routes each country through the central reserve market config only", () => {
    expect(reserveMarketConfig("SE")!.priceArea).toBe("SE");
    expect(reserveMarketConfig("FI")!.priceArea).toBe("FI");
    expect(reserveMarketConfig("DE")!.priceArea).toBe("DE");
    // Denmark has no generic country-level market: DK1/DK2 must be picked first.
    expect(reserveMarketConfig("DK")).toBeNull();
    expect(reserveMarketConfig("DK", "DK1")!.priceArea).toBe("DK1");
    expect(reserveMarketConfig("DK", "DK2")!.priceArea).toBe("DK2");
  });

  it("uses the verified national dataset, never the neighbour's", () => {
    expect(fcrPriceSeriesForCountry("SE")).toBe(FCR_D_UP_SE_2025);
    expect(fcrPriceSeriesForCountry("FI")).toBe(FCR_D_UP_FI_2025);
    expect(fcrPriceSeriesForCountry("SE")).not.toBe(FCR_D_UP_FI_2025);
    expect(fcrPriceSeriesForCountry("FI")).not.toBe(FCR_D_UP_SE_2025);
  });

  it("has no invented prices for countries without a verified dataset", () => {
    expect(fcrPriceSeriesForCountry("DK")).toBeNull();
    expect(hasVerifiedFcrPrices("DK")).toBe(false);
    // Germany has its own verified symmetric FCR dataset; it is never a Nordic fallback.
    expect(hasVerifiedFcrPrices("DE")).toBe(true);
    expect(fcrPriceSeriesForCountry("DE")).not.toBe(FCR_D_UP_SE_2025);
    expect(fcrPriceSeriesForCountry("DE")).not.toBe(FCR_D_UP_FI_2025);
  });

  it("keeps legacy saved cases (no country tag) on the Swedish series", () => {
    expect(fcrPriceSeriesForCountry(undefined)).toBe(FCR_D_UP_SE_2025);
  });

  it("handles Denmark only through DK1/DK2, never a generic DK market", () => {
    expect(reserveMarketConfig("DK")).toBeNull();
    expect(reserveMarketConfig("DK", "DK1")!.productLabel).toBe("FCR");
    expect(reserveMarketConfig("DK", "DK2")!.productLabel).toBe("FCR-D upp");
  });
});
