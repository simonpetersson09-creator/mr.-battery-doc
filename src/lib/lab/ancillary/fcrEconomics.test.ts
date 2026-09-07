import { describe, expect, it } from "vitest";

import {
  computeFcrRevenue,
  DEFAULT_EUR_SEK_RATE,
  FCR_D_UP_SE_2025,
  flatReservation,
  priceStats,
} from "./fcrEconomics";
import { defaultConfig } from "../defaults";
import { buildSeries, simulate } from "../simulate";
import { MONTH_DAYS } from "../defaults";

/** Verified reference figures from the validated source file (Sweden, FCR-D up, 2025). */
const REF = {
  hours: 8760,
  mean: 6.073,
  median: 4.665,
  min: 0.756,
  max: 126.136,
  sum: 53199.06,
  grossEurPerKwYear: 53.199,
  monthly: [4.48, 1.79, 4.37, 6.41, 4.08, 3.39, 3.9, 5.33, 4.55, 5.11, 6.09, 3.7],
};

describe("FCR-D up 2025 price series", () => {
  it("holds exactly 8760 hourly prices with no gaps", () => {
    expect(FCR_D_UP_SE_2025.pricesEurPerMw).toHaveLength(REF.hours);
    expect(FCR_D_UP_SE_2025.hours).toBe(REF.hours);
    expect(FCR_D_UP_SE_2025.pricesEurPerMw.every((v) => Number.isFinite(v) && v > 0)).toBe(true);
  });

  it("carries historical reference metadata, not a forecast", () => {
    expect(FCR_D_UP_SE_2025.market).toBe("Sweden");
    expect(FCR_D_UP_SE_2025.service).toBe("FCR-D up");
    expect(FCR_D_UP_SE_2025.referenceYear).toBe(2025);
    expect(FCR_D_UP_SE_2025.currency).toBe("EUR");
    expect(FCR_D_UP_SE_2025.unit).toBe("EUR/MW/h");
    expect(FCR_D_UP_SE_2025.sourceType).toBe("historical");
    expect(FCR_D_UP_SE_2025.timestampFrom).toBe("2025-01-01 00:00:00");
    expect(FCR_D_UP_SE_2025.timestampTo).toBe("2025-12-31 23:00:00");
  });

  it("reproduces the validated statistics", () => {
    const s = priceStats();
    expect(s.mean).toBeCloseTo(REF.mean, 2);
    expect(s.median).toBeCloseTo(REF.median, 2);
    expect(s.min).toBeCloseTo(REF.min, 2);
    expect(s.max).toBeCloseTo(REF.max, 2);
    expect(s.sum).toBeCloseTo(REF.sum, 1);
    expect(s.grossEurPerKwYear).toBeCloseTo(REF.grossEurPerKwYear, 2);
  });
});

describe("historical gross revenue", () => {
  it("A: 1 kW held every hour gives the validated 53.20 EUR/kW/year", () => {
    const r = computeFcrRevenue({ reservedPowerKwByHour: flatReservation(1) });
    expect(r.annualGrossEur).toBeCloseTo(REF.grossEurPerKwYear, 2);
    expect(r.reservedHours).toBe(8760);
    expect(r.avgReservedPowerKw).toBeCloseTo(1, 9);
    expect(r.eurSekRate).toBe(DEFAULT_EUR_SEK_RATE);
    expect(r.annualGrossSek).toBeCloseTo(REF.grossEurPerKwYear * 11.3, 1);
  });

  it("A: 3 kW held every hour ≈ 159.6 EUR and ≈ 1803 kr", () => {
    const r = computeFcrRevenue({ reservedPowerKwByHour: flatReservation(3) });
    expect(r.annualGrossEur).toBeCloseTo(REF.grossEurPerKwYear * 3, 2);
    expect(r.annualGrossEur).toBeGreaterThan(159);
    expect(r.annualGrossEur).toBeLessThan(160.2);
    expect(r.annualGrossSek).toBeGreaterThan(1795);
    expect(r.annualGrossSek).toBeLessThan(1812);
  });

  it("B/C: revenue scales linearly at full readiness (1.5, 5 and 10 kW)", () => {
    const base = computeFcrRevenue({ reservedPowerKwByHour: flatReservation(3) }).annualGrossEur;
    for (const kw of [1.5, 5, 10]) {
      const r = computeFcrRevenue({ reservedPowerKwByHour: flatReservation(kw) });
      expect(r.annualGrossEur).toBeCloseTo((base * kw) / 3, 6);
    }
  });

  it("reproduces the validated monthly gross for 1 kW", () => {
    const r = computeFcrRevenue({ reservedPowerKwByHour: flatReservation(1) });
    r.monthlyGrossEur.forEach((v, i) => expect(v).toBeCloseTo(REF.monthly[i]!, 1));
    expect(r.monthlyGrossEur.reduce((a, b) => a + b, 0)).toBeCloseTo(r.annualGrossEur, 6);
    expect(r.monthlyGrossSek.reduce((a, b) => a + b, 0)).toBeCloseTo(r.annualGrossSek, 6);
  });

  it("maps price hour t onto engine hour t of the fixed model year", () => {
    expect(MONTH_DAYS.reduce((a, b) => a + b, 0) * 24).toBe(8760);
    const only = new Array(8760).fill(0);
    only[100] = 1;
    const r = computeFcrRevenue({ reservedPowerKwByHour: only });
    expect(r.annualGrossEur).toBeCloseTo(FCR_D_UP_SE_2025.pricesEurPerMw[100]! / 1000, 12);
  });

  it("D: limited readiness is only paid for the hours actually held", () => {
    const half = flatReservation(3).map((v, h) => (h % 2 === 0 ? v : 0));
    const full = computeFcrRevenue({ reservedPowerKwByHour: flatReservation(3) });
    const part = computeFcrRevenue({ reservedPowerKwByHour: half });
    expect(part.reservedHours).toBe(4380);
    expect(part.annualGrossEur).toBeLessThan(full.annualGrossEur);
    const manual = FCR_D_UP_SE_2025.pricesEurPerMw.reduce(
      (s, p, h) => s + (h % 2 === 0 ? (3 / 1000) * p : 0),
      0,
    );
    expect(part.annualGrossEur).toBeCloseTo(manual, 9);
    // Never nominal power x 8760.
    expect(part.annualGrossEur).not.toBeCloseTo(full.annualGrossEur, 2);
  });

  it("derated power is paid on the derated level, not the offered level", () => {
    const derated = flatReservation(3).map((v, h) => (h < 4380 ? v : 1));
    const r = computeFcrRevenue({ reservedPowerKwByHour: derated });
    const manual = FCR_D_UP_SE_2025.pricesEurPerMw.reduce(
      (s, p, h) => s + ((h < 4380 ? 3 : 1) / 1000) * p,
      0,
    );
    expect(r.annualGrossEur).toBeCloseTo(manual, 9);
    expect(r.avgReservedPowerKw).toBeCloseTo(2, 9);
  });

  it("keeps the currency assumption separate and configurable", () => {
    const a = computeFcrRevenue({ reservedPowerKwByHour: flatReservation(3) });
    const b = computeFcrRevenue({ reservedPowerKwByHour: flatReservation(3), eurSekRate: 10 });
    expect(a.annualGrossEur).toBeCloseTo(b.annualGrossEur, 9);
    expect(b.annualGrossSek).toBeCloseTo(b.annualGrossEur * 10, 9);
    expect(a.eurSekRateIsAssumption).toBe(true);
  });

  it("makes no aggregator deduction until terms are supplied", () => {
    const gross = computeFcrRevenue({ reservedPowerKwByHour: flatReservation(3) });
    expect(gross.aggregatorSharePct).toBeNull();
    expect(gross.aggregatorFeeSek).toBeNull();
    expect(gross.netSek).toBeNull();
    const withCut = computeFcrRevenue({
      reservedPowerKwByHour: flatReservation(3),
      aggregatorSharePct: 20,
      aggregatorFixedFeeSek: 0,
    });
    expect(withCut.netSek).toBeCloseTo(withCut.annualGrossSek * 0.8, 9);
  });
});

describe("engine integration", () => {
  const cfg = defaultConfig();

  it("E: FCR off leaves the physics untouched and reports no FCR revenue", () => {
    const series = buildSeries(cfg);
    const off = simulate(cfg, series, 15, 3);
    expect(off.ancillary.fcr).toBeNull();
    expect(off.ancillary.avgReservedPowerUpKw).toBe(0);
    expect(off.energyBalance.ok).toBe(true);

    // Re-running gives bit-identical physics — the FCR layer is pure post-processing.
    const again = simulate(cfg, series, 15, 3);
    expect(again.selfConsumptionPct).toBe(off.selfConsumptionPct);
    expect(again.importKWh).toBe(off.importKWh);
    expect(again.modelledPeakKw).toBe(off.modelledPeakKw);
  });

  it("FCR on prices only the reservation the battery actually held", () => {
    const on = {
      ...cfg,
      strategies: { ...cfg.strategies, ancillaryServices: true },
      ancillary: { ...cfg.ancillary, enabled: true, offeredPowerKw: 3 },
    };
    const series = buildSeries(on);
    const res = simulate(on, series, 15, 3);
    const fcr = res.ancillary.fcr;
    expect(fcr).not.toBeNull();
    expect(fcr!.referenceYear).toBe(2025);
    expect(fcr!.reservedHours).toBe(res.ancillary.readyHours);
    expect(fcr!.avgReservedPowerKw).toBeLessThanOrEqual(3 + 1e-9);
    // Paid amount can never exceed the offered power held every hour.
    const ceiling = computeFcrRevenue({ reservedPowerKwByHour: flatReservation(3) }).annualGrossEur;
    expect(fcr!.annualGrossEur).toBeLessThanOrEqual(ceiling + 1e-9);
    expect(res.energyBalance.ok).toBe(true);
  });
});
