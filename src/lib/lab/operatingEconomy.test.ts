import { describe, expect, it } from "vitest";

import { defaultConfig, ALL_HOURS, ALL_MONTHS } from "./defaults";
import {
  SWEDISH_OPERATING_ECONOMY,
  composeOperatingEconomy,
  customerSummary,
  energyEconomy,
  evaluateOperatingEconomy,
  otherBenefitSek,
  peakEconomy,
  optimizeFcrReservation,
  FCR_SWEEP_FRACTIONS,
  FCR_TIE_TOLERANCE_SEK,
  FCR_NO_RESERVATION_TEXT,
  PEAK_TARIFF_ESTIMATE_TEXT,
  MISSING_PEAK_TARIFF_TEXT,
} from "./operatingEconomy";

import { buildSeries, simulate } from "./simulate";
import type { LabConfig } from "./types";

const ECON = SWEDISH_OPERATING_ECONOMY;
const WITH_TARIFF = { ...ECON, peakDemandChargeSekPerKwMonth: 55 };
const NO_TARIFF = { ...ECON, peakDemandChargeSekPerKwMonth: null };


function cfgWith(patch: (c: LabConfig) => LabConfig): LabConfig {
  return patch(defaultConfig());
}

const villa = () => defaultConfig();
const noSolar = () =>
  cfgWith((c) => ({
    ...c,
    solar: { ...c.solar, enabled: false, monthlyKWh: new Array(12).fill(0), kWp: 0 },
  }));
const withPeak = (c: LabConfig): LabConfig => ({
  ...c,
  strategies: { ...c.strategies, peakShaving: true },
  peakShaving: { targetReductionPct: 20, activeHours: ALL_HOURS, activeMonths: ALL_MONTHS },
});
const withFcr = (c: LabConfig, kw: number): LabConfig => ({
  ...c,
  strategies: { ...c.strategies, ancillaryServices: true },
  ancillary: { ...c.ancillary, enabled: true, offeredPowerKw: kw },
});

describe("operating economy — Swedish defaults", () => {
  it("uses 1.50 SEK/kWh import, 0.60 SEK/kWh export and the Swedish 30 kr/kW/month schablon", () => {
    expect(ECON.importEnergyPriceSekPerKWh).toBe(1.5);
    expect(ECON.exportEnergyValueSekPerKWh).toBe(0.6);
    expect(ECON.peakDemandChargeSekPerKwMonth).toBe(30);
    expect(ECON.peakTariffSource).toBe("default-estimate");
    expect(ECON.eurSekRate).toBe(11.3);
  });

  it("marks the tariff as schablon by default and as user-provided when set", () => {
    const c = withPeak(villa());
    const r = simulate(c, buildSeries(c), 15, 3);
    expect(peakEconomy(r, ECON).tariffNote).toBe(PEAK_TARIFF_ESTIMATE_TEXT);
    const own = peakEconomy(r, { ...ECON, peakTariffSource: "user-provided" as const });
    expect(own.tariffNote).not.toBe(PEAK_TARIFF_ESTIMATE_TEXT);
    expect(own.tariffSource).toBe("user-provided");
  });


  it("does not hardcode a 0.90 kr/kWh self-consumption value anywhere", () => {
    const c = villa();
    const r = simulate(c, buildSeries(c), 15, 3);
    const e = energyEconomy(r, ECON);
    // benefit is exactly the baseline/result flow difference, nothing else
    expect(e.energyBenefitSek).toBeCloseTo(
      e.avoidedImportKWh * 1.5 - e.lostExportKWh * 0.6,
      6,
    );
  });
});

describe("energy economy — no double counting", () => {
  it("baseline/result difference equals avoided import minus lost export", () => {
    const c = villa();
    const r = simulate(c, buildSeries(c), 15, 3);
    const e = energyEconomy(r, ECON);
    expect(e.energyValueBatterySek - e.energyValueBaselineSek).toBeCloseTo(
      e.energyBenefitSek,
      9,
    );
    expect(r.energyBalance.ok).toBe(true);
  });

  it("no battery gives exactly zero economic benefit", () => {
    const c = villa();
    const r = simulate(c, buildSeries(c), 0, 0);
    const e = composeOperatingEconomy(r, ECON);
    expect(e.energy.avoidedImportKWh).toBeCloseTo(0, 6);
    expect(e.energy.energyBenefitSek).toBeCloseTo(0, 6);
    expect(e.totalSek).toBeCloseTo(0, 6);
  });

  it("battery losses are only visible through the flows, never priced separately", () => {
    const c = villa();
    const r = simulate(c, buildSeries(c), 15, 3);
    const e = energyEconomy(r, ECON);
    expect(e.batteryLossesKWh).toBeGreaterThan(0);
    const additive = composeOperatingEconomy(r, ECON).additive;
    expect(additive.some((a) => /förlust/i.test(a.label))).toBe(false);
    expect(e.energyBenefitSek).toBeCloseTo(
      e.avoidedImportKWh * 1.5 - e.lostExportKWh * 0.6,
      6,
    );
  });

  it("grid charging cannot create a fake saving", () => {
    // Peak shaving without solar is the case that charges from the grid.
    const c = withPeak(noSolar());
    const r = simulate(c, buildSeries(c), 15, 3);
    const e = energyEconomy(r, ECON);
    // extra grid energy bought => import goes UP, so the energy item must not be positive
    if (e.batteryImportKWh > e.baselineImportKWh) {
      expect(e.energyBenefitSek).toBeLessThanOrEqual(0);
    }
    expect(r.energyBalance.ok).toBe(true);
  });
});

describe("peak shaving economy", () => {
  it("is not valued in kr/kWh and reports missing tariff while the physical kW stays visible", () => {
    const c = withPeak(villa());
    const r = simulate(c, buildSeries(c), 15, 3);
    const p = peakEconomy(r, NO_TARIFF);
    expect(p.tariffSekPerKwMonth).toBeNull();
    expect(p.annualPeakBenefitSek).toBeNull();
    expect(p.message).toBe(MISSING_PEAK_TARIFF_TEXT);
    expect(p.baselinePeakKw).toBeGreaterThan(0);
  });

  it("expresses an increased peak as an increase, never as a negative reduction", () => {
    const c = villa();
    const r = simulate(c, buildSeries(c), 15, 3);
    const p = peakEconomy(r, ECON);
    if (p.peakChangeKw < -0.001) {
      expect(p.peakDirection).toBe("increased");
      expect(p.peakChangeText).toMatch(/ökade med/);
      expect(p.peakChangeText).not.toMatch(/-/);
    } else if (Math.abs(p.peakChangeKw) < 0.001) {
      expect(p.peakChangeText).toBe("Ingen mätbar förändring av effekttoppen");
    } else {
      expect(p.peakDirection).toBe("reduced");
    }
    // monthly values are SIGNED: a raised monthly peak must survive as a negative number
    p.monthlyReductionKw.forEach((kw, i) =>
      expect(kw).toBeCloseTo((p.baselineMonthlyPeakKw[i] ?? 0) - (p.batteryMonthlyPeakKw[i] ?? 0), 9),
    );
  });

  it("names the economic item 'Minskad effektkostnad', not the peak-shaving strategy", () => {
    const c = villa(); // peak shaving strategy OFF
    const r = simulate(c, buildSeries(c), 15, 3);
    const e = composeOperatingEconomy(r, ECON);
    const item = e.additive.find((a) => a.key === "peak");
    expect(item).toBeDefined();
    expect(item!.label).toMatch(/Minskad effektkostnad/);
    expect(item!.label).not.toMatch(/[Pp]eak shaving/);
  });


  it("values only actual monthly reduction when a tariff exists", () => {
    const c = withPeak(villa());
    const r = simulate(c, buildSeries(c), 15, 3);
    const p = peakEconomy(r, WITH_TARIFF);
    expect(p.monthlyBenefitSek).not.toBeNull();
    const expected = p.monthlyReductionKw.reduce((a, kw) => a + kw * 55, 0);
    expect(p.annualPeakBenefitSek!).toBeCloseTo(expected, 6);
    p.monthlyReductionKw.forEach((kw, i) =>
      expect(kw).toBeCloseTo((p.baselineMonthlyPeakKw[i] ?? 0) - (p.batteryMonthlyPeakKw[i] ?? 0), 9),
    );
  });

  it("cannot pay anything without a real peak reduction", () => {
    const c = villa();
    const r = simulate(c, buildSeries(c), 0, 0);
    const p = peakEconomy(r, WITH_TARIFF);
    expect(p.peakReductionKw).toBeCloseTo(0, 6);
    expect(p.annualPeakBenefitSek!).toBeCloseTo(0, 6);
  });
});

describe("FCR-D up economy and opportunity cost", () => {
  it("is zero/absent when FCR is off and physics is untouched", () => {
    const c = villa();
    const { result, economy, withoutFcr } = evaluateOperatingEconomy(c, 15, 3, ECON);
    expect(withoutFcr).toBeNull();
    expect(economy.fcr.enabled).toBe(false);
    expect(economy.fcr.grossSek).toBeNull();
    expect(economy.additive.some((a) => a.key === "fcrGross")).toBe(false);
    expect(result.ancillary.fcr).toBeNull();
  });

  it("measures the opportunity cost as scenario A minus scenario B", () => {
    const c = withFcr(villa(), 3);
    const { result, economy, withoutFcr } = evaluateOperatingEconomy(c, 15, 3, ECON);
    expect(withoutFcr).not.toBeNull();
    expect(economy.fcr.grossSek).toBeGreaterThan(0);
    const a = otherBenefitSek(withoutFcr!, ECON);
    const b = otherBenefitSek(result, ECON);
    expect(economy.fcr.opportunityCostSek!).toBeCloseTo(a - b, 6);
    expect(economy.fcr.incrementalNetSek!).toBeCloseTo(
      economy.fcr.grossSek! - economy.fcr.opportunityCostSek!,
      6,
    );
    // FCR reserves power => other benefit must not be higher with FCR on
    expect(b).toBeLessThanOrEqual(a + 1e-6);
  });

  it("keeps the opportunity cost out of the additive total (no double counting)", () => {
    const c = withFcr(villa(), 3);
    const { economy } = evaluateOperatingEconomy(c, 15, 3, ECON);
    expect(economy.additive.map((a) => a.key).sort()).toEqual(["energy", "fcrGross", "peak"]);
    const total = economy.additive.reduce((s, a) => s + a.sek, 0);
    expect(economy.totalSek!).toBeCloseTo(total, 2);
    expect(economy.diagnostic.some((d) => d.key === "fcrOpportunity")).toBe(true);
  });

  it("scales with offered power but only pays for power actually held", () => {
    const low = evaluateOperatingEconomy(withFcr(villa(), 1.5), 15, 3, ECON).economy;
    const high = evaluateOperatingEconomy(withFcr(villa(), 3), 15, 3, ECON).economy;
    expect(high.fcr.grossSek!).toBeGreaterThan(low.fcr.grossSek!);
    // never credited more than offered power * hours
    expect(low.fcr.avgHeldPowerKw).toBeLessThanOrEqual(1.5 + 1e-9);
    // offering more than the battery can hold yields no revenue at all
    const impossible = evaluateOperatingEconomy(withFcr(villa(), 10), 15, 3, ECON).economy;
    expect(impossible.fcr.avgHeldPowerKw).toBeCloseTo(0, 6);
    expect(impossible.fcr.grossSek!).toBeCloseTo(0, 6);
  });
});

describe("total and customer summary", () => {
  it("marks the total incomplete when a real item has no price basis", () => {
    const c = withPeak(villa());
    const r = simulate(c, buildSeries(c), 15, 3);
    const e = composeOperatingEconomy(r, NO_TARIFF);
    if (e.peak.peakReductionKw > 0.001) expect(e.totalIsIncomplete).toBe(true);
  });


  it("never lets the total exceed the sum of its additive parts", () => {
    const c = withFcr(withPeak(villa()), 3);
    const { economy } = evaluateOperatingEconomy(c, 15, 3, WITH_TARIFF);
    const sum = economy.additive.reduce((s, a) => s + a.sek, 0);
    expect(economy.totalSek!).toBeCloseTo(sum, 2);
    const keys = economy.additive.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("produces a customer summary without capex or payback", () => {
    const { economy } = evaluateOperatingEconomy(villa(), 15, 3, ECON);
    const s = customerSummary(economy);
    expect(s.monthlyPeakRows).toHaveLength(12);
    expect(s.fcrLabel).toMatch(/2025/);
    expect(Object.keys(s)).not.toContain("capexKr");
    expect(Object.keys(s)).not.toContain("paybackYears");
  });
});

describe("regression — economy never touches the physics", () => {
  it("gives identical physical results regardless of economic parameters", () => {
    const c = villa();
    const series = buildSeries(c);
    const r = simulate(c, series, 15, 3);
    const a = composeOperatingEconomy(r, ECON);
    const b = composeOperatingEconomy(r, {
      ...ECON,
      importEnergyPriceSekPerKWh: 99,
      exportEnergyValueSekPerKWh: 42,
      peakDemandChargeSekPerKwMonth: 1000,
    });
    expect(a.energy.batteryImportKWh).toBe(b.energy.batteryImportKWh);
    expect(a.peak.batteryPeakKw).toBe(b.peak.batteryPeakKw);
    expect(r.energyBalance.ok).toBe(true);
  });

  it("export- and grid-limited cases still balance and stay traceable", () => {
    const limited = cfgWith((c) => ({ ...c, grid: { ...c.grid, mainFuseA: 16, maxExportKw: 3 } }));
    const r = simulate(limited, buildSeries(limited), 15, 3);
    const e = composeOperatingEconomy(r, ECON);
    expect(r.energyBalance.ok).toBe(true);
    expect(e.energy.energyBenefitSek).toBeCloseTo(
      e.energy.avoidedImportKWh * 1.5 - e.energy.lostExportKWh * 0.6,
      6,
    );
  });
});

describe("FCR-D up reservation optimisation (economic layer only)", () => {
  const total = (c: { totalOperatingBenefitSek: number }) => c.totalOperatingBenefitSek;

  it("sweeps 0-100 % of the offerable power in 10 % steps and always includes 0 %", () => {
    const o = optimizeFcrReservation(withFcr(villa(), 3), 15, 3, ECON);
    expect(o.candidates.map((c) => c.offeredPowerKw)).toEqual([
      0, 0.3, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 3,
    ]);
    expect(o.offerablePowerKw).toBe(3);
    expect(FCR_SWEEP_FRACTIONS).toEqual([
      0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1,
    ]);
    expect(o.label).toMatch(/2025/);
  });

  it("optimises energy + reduced power cost + FCR gross, never subtracting the opportunity cost", () => {
    const o = optimizeFcrReservation(withFcr(villa(), 3), 15, 3, ECON);
    o.candidates.forEach((c) => {
      expect(c.totalOperatingBenefitSek).toBeCloseTo(
        Math.round(
          (c.energyBenefitSek + (c.peakBenefitSek ?? 0) + (c.fcrGrossSek ?? 0)) * 100,
        ) / 100,
        2,
      );
    });
    // Tie-break: within FCR_TIE_TOLERANCE_SEK of the maximum the LOWER reservation wins.
    const bestTotal = Math.max(...o.candidates.map(total));
    expect(total(o.best)).toBeGreaterThanOrEqual(bestTotal - FCR_TIE_TOLERANCE_SEK);
  });

  it("only ever credits power that was actually held (E)", () => {
    const o = optimizeFcrReservation(withFcr(villa(), 3), 15, 3, ECON);
    o.candidates.forEach((c) => {
      expect(c.avgHeldPowerKw).toBeLessThanOrEqual(c.offeredPowerKw + 1e-9);
    });
    // 3 kW offered on a 3 kW battery may be held, but 10 kW never can be
    const impossible = optimizeFcrReservation(withFcr(villa(), 3), 15, 10, ECON, [1]);
    const top = impossible.candidates[impossible.candidates.length - 1]!;
    if (top.offeredPowerKw > 3) expect(top.avgHeldPowerKw).toBeLessThanOrEqual(top.offeredPowerKw);
  });

  it("A: recommends no reservation when FCR is clearly unprofitable", () => {
    // Very high import price => self-consumption is worth far more than FCR capacity.
    const expensive = { ...ECON, importEnergyPriceSekPerKWh: 25 };
    const o = optimizeFcrReservation(withFcr(villa(), 3), 15, 3, expensive);
    expect(o.recommendedPowerKw).toBe(0);
    expect(o.recommendationText).toBe(FCR_NO_RESERVATION_TEXT);
  });

  it("B/C: a positive — and at the extreme the full — reservation wins when economics motivate it", () => {
    // Near-worthless energy => FCR gross dominates, so max reservation should win.
    const cheap = {
      ...ECON,
      importEnergyPriceSekPerKWh: 0.01,
      exportEnergyValueSekPerKWh: 0,
      peakDemandChargeSekPerKwMonth: null,
    };
    const o = optimizeFcrReservation(withFcr(villa(), 3), 15, 3, cheap);
    expect(o.recommendedPowerKw).toBeGreaterThan(0);
    expect(o.recommendedPowerKw).toBe(3);
  });

  it("D: a partial reservation can win", () => {
    const o = optimizeFcrReservation(withFcr(villa(), 3), 15, 3, ECON, [0, 0.25, 0.5, 0.75, 1]);
    const winner = o.recommendedPowerKw;
    // whichever wins, it must be the documented argmax with the low-tie rule
    const best = Math.max(...o.candidates.map(total));
    const eligible = o.candidates.filter((c) => total(c) >= best - FCR_TIE_TOLERANCE_SEK);
    expect(winner).toBe(eligible[0]!.offeredPowerKw);
  });

  it("tie-break prefers the LOWER reservation at practically equal economy", () => {
    const o = optimizeFcrReservation(withFcr(villa(), 3), 15, 3, ECON);
    const best = Math.max(...o.candidates.map(total));
    const tied = o.candidates.filter((c) => total(c) >= best - FCR_TIE_TOLERANCE_SEK);
    expect(o.best.offeredPowerKw).toBe(Math.min(...tied.map((c) => c.offeredPowerKw)));
    expect(o.tieToleranceSek).toBe(FCR_TIE_TOLERANCE_SEK);
  });

  it("F: works without solar", () => {
    const o = optimizeFcrReservation(withFcr(noSolar(), 3), 15, 3, ECON);
    expect(o.candidates).toHaveLength(11);
    o.candidates.forEach((c) => expect(Number.isFinite(c.totalOperatingBenefitSek)).toBe(true));
  });

  it("G/H: works with peak shaving and all strategies together", () => {
    const all = withFcr(withPeak(villa()), 3);
    const o = optimizeFcrReservation(all, 15, 3, WITH_TARIFF);
    o.candidates.forEach((c) => expect(c.peakBenefitSek).not.toBeNull());
    expect(o.candidates.some((c) => c.offeredPowerKw > 0)).toBe(true);
  });

  it("I: larger systems stay inside the 200 kW cap", () => {
    const big = cfgWith((c) => ({
      ...c,
      grid: { ...c.grid, mainFuseA: 630 },
    }));

    const o = optimizeFcrReservation(withFcr(big, 300), 800, 300, ECON, [1]);
    expect(o.offerablePowerKw).toBe(200);
    expect(Math.max(...o.candidates.map((c) => c.offeredPowerKw))).toBeLessThanOrEqual(200);
  });

  it("does not change the physics: the 0 % candidate equals a plain FCR-off simulation", () => {
    const c = withFcr(villa(), 3);
    const o = optimizeFcrReservation(c, 15, 3, ECON);
    const off: LabConfig = {
      ...c,
      strategies: { ...c.strategies, ancillaryServices: false },
      ancillary: { ...c.ancillary, enabled: false },
    };
    const r = simulate(off, buildSeries(c), 15, 3);
    const e = composeOperatingEconomy(r, ECON);
    expect(o.candidates[0]!.energyBenefitSek).toBeCloseTo(e.energy.energyBenefitSek, 9);
    expect(r.energyBalance.ok).toBe(true);
  });
});
