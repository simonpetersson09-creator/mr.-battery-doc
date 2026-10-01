import { describe, expect, it } from "vitest";

import { computeFcrRevenue, flatReservation } from "../fcrEconomics";
import {
  blockPriceToHourly,
  fcrCooperationSeries,
  fcrCooperationSeriesById,
  FCR_COOPERATION_SOURCE_FILES,
  type FcrCooperationCountry,
} from "./fcrCooperation";
import { fcrPriceSeriesForCountry, FCR_SYMMETRIC_DE_2025, FCR_D_UP_SE_2025 } from "./index";

// Independent expectations from the Excel files (sum of 2 190 block prices, EUR/MW).
const EXPECTED: Record<string, { first: number; last: number; min: number; max: number; sum: number }> = {
  AT: { first: 63.1, last: 15, min: 11.08, max: 430.86, sum: 134243.53 },
  CH: { first: 63.1, last: 20, min: 11.36, max: 586.5, sum: 166766.96 },
  BE: { first: 95.96, last: 15, min: 11.44, max: 430.86, sum: 155200.16 },
  FR: { first: 11, last: 15, min: 2.68, max: 384, sum: 91998.12 },
  CZ: { first: 63.1, last: 15, min: 11.08, max: 430.86, sum: 133825.11 },
  SI: { first: 63.1, last: 15, min: 11.08, max: 430.86, sum: 133825.11 },
};
const IMPORTED = Object.keys(EXPECTED) as FcrCooperationCountry[];

describe("FCR Cooperation 2025 import", () => {
  it.each(IMPORTED)("%s maps to its own file and own source values", (cc) => {
    const s = fcrCooperationSeries(cc)!;
    const e = EXPECTED[cc]!;
    const src = s.sourcePricesEurPerMw!;
    expect(s.source).toContain(FCR_COOPERATION_SOURCE_FILES[cc]);
    expect(s.source).toContain(`FCR_${cc}_2025`);
    expect(src).toHaveLength(2190);
    expect(src[0]).toBe(e.first);
    expect(src[2189]).toBe(e.last);
    expect(Math.min(...src)).toBe(e.min);
    expect(Math.max(...src)).toBe(e.max);
    expect(src.reduce((a, b) => a + b, 0)).toBeCloseTo(e.sum, 4);
    expect(fcrCooperationSeriesById(`FCR_${cc}_2025`)).toBe(s);
  });

  it.each(IMPORTED)("%s has exactly 8 760 finite hourly positions", (cc) => {
    const p = fcrCooperationSeries(cc)!.pricesEurPerMw;
    expect(p).toHaveLength(8760);
    expect(p.every((v) => Number.isFinite(v) && v >= 0)).toBe(true);
  });

  it("every country gets only its own series (no cross-country use)", () => {
    for (const a of IMPORTED) {
      for (const b of IMPORTED) {
        if (a === b) continue;
        expect(fcrCooperationSeries(a)).not.toBe(fcrCooperationSeries(b));
        expect(fcrCooperationSeries(a)!.source).not.toContain(FCR_COOPERATION_SOURCE_FILES[b]);
      }
    }
    // AT and CH share day-1 first block but differ over the year.
    expect(fcrCooperationSeries("AT")!.sourcePricesEurPerMw).not.toEqual(
      fcrCooperationSeries("CH")!.sourcePricesEurPerMw,
    );
  });

  it("NL (ambiguous second auction) and unknown ids give null, never a fallback", () => {
    expect(fcrCooperationSeries("NL")).toBeNull();
    expect(fcrCooperationSeriesById("FCR_NL_2025")).toBeNull();
    expect(fcrCooperationSeriesById("FCR_DE_2025")).toBeNull();
    expect(fcrCooperationSeriesById("FCR_AT_2024")).toBeNull();
  });

  it("is ONE symmetric FCR product, not FCR-D up/down", () => {
    for (const cc of IMPORTED) expect(fcrCooperationSeries(cc)!.service).toBe("FCR");
  });

  it("4-hour block expansion: every hour of a block carries block price / 4, no interpolation", () => {
    for (const cc of IMPORTED) {
      const s = fcrCooperationSeries(cc)!;
      const src = s.sourcePricesEurPerMw!;
      for (const i of [0, 1, 5, 527, 1793, 2189]) {
        for (let h = 0; h < 4; h++) expect(s.pricesEurPerMw[i * 4 + h]).toBe(src[i]! / 4);
      }
    }
    expect(blockPriceToHourly(20)).toBe(5);
  });

  it("EUR/MW conversion: 1 kW held all year = sum(block EUR/MW) / 1000", () => {
    for (const cc of IMPORTED) {
      const r = computeFcrRevenue({ reservedPowerKwByHour: flatReservation(1), series: fcrCooperationSeries(cc)! });
      expect(r.annualGrossEur).toBeCloseTo(EXPECTED[cc]!.sum / 1000, 6);
    }
  });

  it("Swiss prices stay EUR (no CHF reinterpretation)", () => {
    const ch = fcrCooperationSeries("CH")!;
    expect(ch.currency).toBe("EUR");
    expect(ch.sourcePricesEurPerMw![0]).toBe(63.1);
  });

  it("existing SE/DE series are untouched", () => {
    expect(fcrPriceSeriesForCountry("SE")).toBe(FCR_D_UP_SE_2025);
    expect(fcrPriceSeriesForCountry("DE")).toBe(FCR_SYMMETRIC_DE_2025);
  });
});
