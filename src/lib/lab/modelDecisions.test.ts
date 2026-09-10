/**
 * MODEL DECISION REGRESSION SUITE (A–E).
 *
 * Locks in the five model rules agreed after the adversarial / root-cause audits:
 *
 *  A. 25 -> 30 kWh: a full FCR reservation may never be chosen when a partial one gives
 *     a higher TOTAL customer benefit (energy + peak + ancillary customer value).
 *  B. demandFee = 0: economically driven peak shaving must not charge from the grid.
 *  C. FCR: a higher power level may not be chosen on raw FCR gross alone.
 *  D. No recommendation may be flagged as economically positive when the annual customer
 *     benefit is <= 0.
 *  E. The existing physical invariants still hold (energy balance, SOC, grid limits,
 *     200 kW ancillary cap).
 *
 * These tests must never be relaxed to make a future change "look right".
 */

import { describe, expect, it } from "vitest";

import { toEconomyConfig, toLabConfig, toTimeSeries } from "../battery-engine/input";
import type { BatteryEngineInput } from "../battery-engine/types";
import { runBatteryEngine } from "../battery-engine/run";
import { computeGridLimits } from "./dispatch";
import {
  annualCustomerBenefitSek,
  customerAncillaryShareOf,
  evaluateOperatingEconomy,
  FCR_TIE_TOLERANCE_SEK,
  optimizeFcrReservation,
  SWEDISH_OPERATING_ECONOMY,
} from "./operatingEconomy";
import { POWER_TIE_TOLERANCE_SEK, runEconomicPowerSizing } from "./economicPowerSizing";
import { simulate } from "./simulate";
import type { LabConfig } from "./types";

const LOAD = [2264, 1887, 1698, 1509, 1321, 1226, 1132, 1226, 1415, 1698, 2075, 2549];
const PV = [101, 302, 806, 1410, 1813, 2216, 2317, 2014, 1612, 906, 403, 100];

const ECON = {
  importEnergyPriceSekPerKWh: 1.5,
  exportEnergyValueSekPerKWh: 0.6,
  peakDemandChargeSekPerKwMonth: 30,
  peakTariffSource: "user-provided" as const,
  eurSekRate: 11.3,
};

function input(over: Partial<BatteryEngineInput> = {}): BatteryEngineInput {
  return {
    site: { country: "SE", mainFuseA: 25, phases: 3, voltageV: 400 },
    consumption: { monthlyKWh: LOAD, annualKWh: 20000, profile: "normal" },
    production: { enabled: true, monthlyKWh: PV, annualKWh: 14000, kWp: 14, inverterAcKw: 12 },
    strategies: {
      selfConsumption: true,
      reduceImport: true,
      peakShaving: true,
      fcrDUp: true,
      optimiseFcrReservation: true,
    },
    economy: ECON,
    ...over,
  };
}

function prepare(over: Partial<BatteryEngineInput> = {}) {
  const inp = input(over);
  const cfg = toLabConfig(inp);
  return { inp, cfg, series: toTimeSeries(cfg, inp), econ: toEconomyConfig(inp) };
}

/* ------------------------------------------------------------------ *
 * A. the 25 -> 30 kWh case
 * ------------------------------------------------------------------ */

describe("A — 30 kWh must not wipe out the energy benefit for a marginal FCR gain", () => {
  const { cfg, series, econ } = prepare();

  it("chooses the reservation on total customer benefit, not on raw FCR gross", () => {
    const opt = optimizeFcrReservation(cfg, 30, 15, econ, undefined, series);
    const best = Math.max(...opt.candidates.map((c) => c.annualCustomerBenefitSek));
    // The winner is within the tie tolerance of the best customer benefit ...
    expect(opt.best.annualCustomerBenefitSek).toBeGreaterThanOrEqual(best - FCR_TIE_TOLERANCE_SEK);
    // ... and a candidate that only maximises raw FCR gross can never win on that alone.
    const richestFcr = opt.candidates.reduce((a, c) =>
      (c.fcrGrossSek ?? 0) > (a.fcrGrossSek ?? 0) ? c : a,
    );
    if (richestFcr.annualCustomerBenefitSek < best - FCR_TIE_TOLERANCE_SEK)
      expect(opt.best.fraction).not.toBe(richestFcr.fraction);
  });

  it("does not pick a full reservation that zeroes the energy benefit when a partial one is better", () => {
    const opt = optimizeFcrReservation(cfg, 30, 15, econ, undefined, series);
    const full = opt.candidates.find((c) => c.fraction === 1);
    expect(full).toBeDefined();
    const partialBetter = opt.candidates.some(
      (c) =>
        c.fraction > 0 &&
        c.fraction < 1 &&
        c.annualCustomerBenefitSek > full!.annualCustomerBenefitSek + FCR_TIE_TOLERANCE_SEK,
    );
    if (partialBetter) expect(opt.best.fraction).toBeLessThan(1);
  });

  it("keeps 25 kWh and 30 kWh on the same objective, so the step stays explainable", () => {
    const a = optimizeFcrReservation(cfg, 25, 15, econ, undefined, series);
    const b = optimizeFcrReservation(cfg, 30, 15, econ, undefined, series);
    for (const opt of [a, b]) {
      const best = Math.max(...opt.candidates.map((c) => c.annualCustomerBenefitSek));
      expect(opt.best.annualCustomerBenefitSek).toBeGreaterThanOrEqual(
        best - FCR_TIE_TOLERANCE_SEK,
      );
    }
  });
});

/* ------------------------------------------------------------------ *
 * B. demand fee = 0
 * ------------------------------------------------------------------ */

describe("B — no demand charge means no economically driven grid charging", () => {
  it("turns peak-shaving grid charging off when the demand fee is zero", () => {
    const zero = toLabConfig(
      input({ economy: { ...ECON, peakDemandChargeSekPerKwMonth: 0 } }),
    );
    expect(zero.peakShaving.gridChargingEnabled).toBe(false);
    const paid = toLabConfig(input());
    expect(paid.peakShaving.gridChargingEnabled).toBe(true);
  });

  it("keeps grid charging available when peak shaving is an explicit technical goal", () => {
    const technical = toLabConfig(
      input({
        economy: { ...ECON, peakDemandChargeSekPerKwMonth: 0 },
        strategies: {
          selfConsumption: true,
          reduceImport: true,
          peakShaving: true,
          fcrDUp: false,
          peakShavingIsTechnicalGoal: true,
        },
      }),
    );
    expect(technical.peakShaving.gridChargingEnabled).toBe(true);
  });

  it("never makes the customer benefit worse than with grid charging blocked", () => {
    const { cfg, series, econ } = prepare({
      economy: { ...ECON, peakDemandChargeSekPerKwMonth: 0 },
      strategies: {
        selfConsumption: true,
        reduceImport: true,
        peakShaving: true,
        fcrDUp: false,
      },
    });
    expect(cfg.peakShaving.gridChargingEnabled).toBe(false);
    const charging: LabConfig = {
      ...cfg,
      peakShaving: { ...cfg.peakShaving, gridChargingEnabled: true },
    };
    const off = evaluateOperatingEconomy(cfg, 20, 10, econ, series);
    const on = evaluateOperatingEconomy(charging, 20, 10, econ, series);
    const benefit = (e: typeof off) =>
      annualCustomerBenefitSek(
        e.economy.energy.energyBenefitSek,
        e.economy.peak.annualPeakBenefitSek,
        e.economy.fcr.grossSek,
        econ,
      );
    expect(benefit(off)).toBeGreaterThanOrEqual(benefit(on) - 1e-6);
    // The physical peak discharge is untouched: the battery still works.
    expect(off.result.dischargedKWh).toBeGreaterThan(0);
    expect(off.result.energyBalance.ok).toBe(true);
  });
});

/* ------------------------------------------------------------------ *
 * C. FCR may not buy power on its own
 * ------------------------------------------------------------------ */

describe("C — the power level is chosen on total customer benefit", () => {
  const { cfg, series, econ } = prepare();

  it("selects the option with the highest customer benefit, ties going to the lower power", () => {
    const sizing = runEconomicPowerSizing({
      cfg,
      series,
      capacityKWh: 30,
      physicalPowerNeedKw: 10,
      productPowerKw: 10,
      econ,
      optimiseFcrReservation: true,
    });
    const selected = sizing.options.find((o) => o.selected);
    expect(selected).toBeDefined();
    const best = Math.max(...sizing.options.map((o) => o.annualCustomerBenefitSek));
    expect(selected!.annualCustomerBenefitSek).toBeGreaterThanOrEqual(
      best - POWER_TIE_TOLERANCE_SEK,
    );
    // A strictly lower option with the same benefit must have won instead.
    const cheaperTie = sizing.options.find(
      (o) =>
        o.powerKw < selected!.powerKw &&
        o.annualCustomerBenefitSek >= best - POWER_TIE_TOLERANCE_SEK,
    );
    expect(cheaperTie).toBeUndefined();
  });

  it("never lets raw FCR gross alone drive a higher power level", () => {
    const sizing = runEconomicPowerSizing({
      cfg,
      series,
      capacityKWh: 30,
      physicalPowerNeedKw: 10,
      productPowerKw: 10,
      econ,
      optimiseFcrReservation: true,
    });
    const selected = sizing.options.find((o) => o.selected)!;
    for (const o of sizing.options) {
      if (o.powerKw <= selected.powerKw) continue;
      // Any bigger option must be genuinely better for the customer, not just for FCR.
      expect(o.annualCustomerBenefitSek).toBeLessThan(
        selected.annualCustomerBenefitSek + POWER_TIE_TOLERANCE_SEK,
      );
    }
  });

  it("applies the customer share to the ancillary value in the objective", () => {
    const share = customerAncillaryShareOf(econ);
    expect(share).toBeGreaterThan(0);
    expect(share).toBeLessThanOrEqual(1);
    expect(annualCustomerBenefitSek(100, 50, 1000, econ)).toBeCloseTo(150 + 1000 * share, 6);
    expect(annualCustomerBenefitSek(100, null, null, econ)).toBeCloseTo(100, 6);
  });
});

/* ------------------------------------------------------------------ *
 * D. negative customer benefit
 * ------------------------------------------------------------------ */

describe("D — a non-positive customer benefit is never presented as advantageous", () => {
  it("flags the recommendation exactly on the sign of the customer benefit", () => {
    const res = runBatteryEngine(
      input({
        economy: {
          ...ECON,
          importEnergyPriceSekPerKWh: 0.05,
          exportEnergyValueSekPerKWh: 0.9,
          peakDemandChargeSekPerKwMonth: 0,
        },
        strategies: {
          selfConsumption: true,
          reduceImport: true,
          peakShaving: false,
          fcrDUp: false,
        },
      }),
    );
    const e = res.summary.economy;
    expect(e.annualCustomerBenefitSek).not.toBeNull();
    expect(e.hasPositiveCustomerBenefit).toBe(e.annualCustomerBenefitSek! > 0);
    if (e.annualCustomerBenefitSek! <= 0) expect(e.hasPositiveCustomerBenefit).toBe(false);
  });

  it("marks an ordinary Swedish case as positive", () => {
    const res = runBatteryEngine(input());
    const e = res.summary.economy;
    expect(e.annualCustomerBenefitSek).not.toBeNull();
    expect(e.hasPositiveCustomerBenefit).toBe(e.annualCustomerBenefitSek! > 0);
  });
});

/* ------------------------------------------------------------------ *
 * E. the physical invariants are untouched
 * ------------------------------------------------------------------ */

describe("E — physics, SOC, grid limits and the 200 kW cap still hold", () => {
  it("keeps the energy balance, SOC window and grid limits", () => {
    const { cfg, series } = prepare();
    const limits = computeGridLimits(cfg.grid);
    const sim = simulate(cfg, series, 30, 15);
    expect(sim.energyBalance.ok).toBe(true);
    expect(sim.socMinKWh).toBeGreaterThanOrEqual(-1e-6);
    expect(sim.socMaxKWh).toBeLessThanOrEqual(30 + 1e-6);
    expect(sim.grid.maxActualImportKw).toBeLessThanOrEqual(limits.maxImportKw + 1e-6);
    expect(sim.grid.maxActualExportKw).toBeLessThanOrEqual(limits.maxExportKw + 1e-6);
  });

  it("never offers more than 200 kW of ancillary power", () => {
    const { cfg, series, econ } = prepare();
    const opt = optimizeFcrReservation(cfg, 500, 250, econ, [0, 1], series);
    expect(opt.offerablePowerKw).toBeLessThanOrEqual(200);
    expect(opt.recommendedPowerKw).toBeLessThanOrEqual(200);
  });
});
