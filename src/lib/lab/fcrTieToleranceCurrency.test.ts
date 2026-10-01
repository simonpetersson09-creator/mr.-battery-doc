/**
 * The FCR tie tolerance is 25 SEK of economic value, converted to the result currency.
 * The currency itself must never change which FCR level is chosen.
 */
import { describe, expect, it } from "vitest";
import { toEconomyConfig, toLabConfig } from "@/lib/battery-engine/input";
import { DEFAULT_RATES_PER_EUR } from "@/lib/currency";
import { buildSeries } from "./simulate";
import {
  FCR_TIE_TOLERANCE_SEK,
  fcrTieToleranceLocal,
  optimizeFcrReservation,
  type OperatingEconomyConfig,
} from "./operatingEconomy";

const FR = [0, 0.2, 0.4, 0.6, 0.8, 1];

function input(country: string, rate: number) {
  return {
    site: { voltageV: 400, phases: 3, mainFuseA: 250, country, marketArea: null },
    consumption: { annualKWh: 20000, profile: "normal" },
    production: { enabled: true, annualKWh: 10000, kWp: 10 },
    strategies: { selfConsumption: true, reduceImport: true, peakShaving: true, fcrDUp: true, optimiseFcrReservation: true },
    economy: {
      importEnergyPriceSekPerKWh: 0.3 * rate, exportEnergyValueSekPerKWh: 0.05 * rate,
      peakDemandChargeSekPerKwMonth: null, peakTariffSource: "default-estimate",
      eurSekRate: rate, customerAncillaryShare: 0.75,
    },
    battery: { fixedCapacityKWh: 10, fixedPowerKw: 5 },
  } as never;
}

function opt(country: string, rate: number) {
  const i = input(country, rate);
  const cfg = toLabConfig(i);
  return optimizeFcrReservation(cfg, 10, 5, toEconomyConfig(i), FR, buildSeries(cfg));
}

const econ = (eurSekRate: number) => ({ eurSekRate }) as OperatingEconomyConfig;

describe("FCR tie tolerance = 25 SEK in the local currency", () => {
  it("converts via the central rate table (local units per EUR)", () => {
    const sek = DEFAULT_RATES_PER_EUR.SEK;
    expect(fcrTieToleranceLocal(econ(sek))).toBeCloseTo(25, 10);
    expect(fcrTieToleranceLocal(econ(1))).toBeCloseTo(25 / sek, 10);
    expect(fcrTieToleranceLocal(econ(DEFAULT_RATES_PER_EUR.CHF))).toBeCloseTo((25 / sek) * 0.94, 10);
    expect(fcrTieToleranceLocal(econ(DEFAULT_RATES_PER_EUR.CZK))).toBeCloseTo((25 / sek) * 25, 10);
    expect(FCR_TIE_TOLERANCE_SEK).toBe(25);
  });

  it("the same economics give the same choice in SEK, EUR, CHF and CZK", () => {
    for (const c of ["AT", "SI", "FR", "BE", "CZ"]) {
      const picks = [1, DEFAULT_RATES_PER_EUR.SEK, DEFAULT_RATES_PER_EUR.CHF, DEFAULT_RATES_PER_EUR.CZK].map(
        (r) => opt(c, r).best.offeredPowerKw,
      );
      expect(new Set(picks).size, c).toBe(1);
    }
  }, 600_000);

  it("5 kW / 10 kWh: AT/SI/BE/CZ pick 4 kW, FR picks 0 kW", () => {
    const rate: Record<string, number> = { AT: 1, SI: 1, FR: 1, BE: 1, CZ: 25 };
    const expected: Record<string, number> = { AT: 4, SI: 4, FR: 0, BE: 4, CZ: 4 };
    for (const c of Object.keys(expected)) expect(opt(c, rate[c]!).best.offeredPowerKw, c).toBe(expected[c]);
  }, 600_000);
});
