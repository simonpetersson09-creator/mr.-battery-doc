import { describe, expect, it } from "vitest";

import { ALL_HOURS, ALL_MONTHS, defaultConfig } from "./defaults";
import { computeGridLimits, dispatch } from "./dispatch";
import { SWEDISH_OPERATING_ECONOMY, peakEconomy } from "./operatingEconomy";
import { buildSeries, simulate } from "./simulate";
import type { LabConfig } from "./types";

/**
 * REGRESSION SUITE for the strategy-conflict audit (F1–F6).
 *
 * Every test here locks in a behaviour that the audit found wrong. They must never be
 * relaxed to make a future change "look right".
 */

const WITH_TARIFF = { ...SWEDISH_OPERATING_ECONOMY, peakDemandChargeSekPerKwMonth: 55 };

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

function runDispatch(cfg: LabConfig, capacityKWh: number, powerKw: number) {
  const series = buildSeries(cfg);
  const limits = computeGridLimits(cfg.grid);
  return { series, limits, sim: simulate(cfg, series, capacityKWh, powerKw) };
}

describe("F1 — FCR-D up readiness is judged over the whole hour", () => {
  it("keeps the reservation floor intact against the next hour's self-discharge", () => {
    const cfg = withFcr(defaultConfig(), 1.5);
    const { sim } = runDispatch(cfg, 15, 3);
    // The passive loss is reserved in advance, so the readiness is genuinely held.
    expect(sim.ancillary.availabilityPct).toBeCloseTo(100, 6);
    expect(sim.ancillary.avgReservedPowerUpKw).toBeCloseTo(1.5, 6);
    // Self-discharge still happens — the floor is defended, not switched off.
    expect(sim.selfDischargeKWh).toBeGreaterThan(0);
    expect(sim.energyBalance.ok).toBe(true);
  });

  it("does not pay for readiness the battery could not deliver", () => {
    // A battery whose power rating is below the offered up-power can never hold it.
    const cfg = withFcr(defaultConfig(), 3);
    const { sim } = runDispatch(cfg, 15, 1);
    expect(sim.ancillary.availabilityPct).toBeLessThan(100);
    expect(sim.ancillary.avgReservedPowerUpKw).toBeLessThan(3);
  });

  it("never reports readiness for an hour that is not reserved", () => {
    const cfg = defaultConfig();
    const { sim } = runDispatch(cfg, 15, 3);
    expect(sim.ancillary.enabled).toBe(false);
    expect(sim.ancillary.availabilityPct).toBe(0);
    expect(sim.ancillary.avgReservedPowerUpKw).toBe(0);
  });
});

describe("F2 — a raised monthly peak is a cost, not a zero", () => {
  it("keeps monthly peak differences signed", () => {
    const cfg = defaultConfig();
    const { sim } = runDispatch(cfg, 15, 3);
    const p = peakEconomy(sim, WITH_TARIFF);
    p.monthlyReductionKw.forEach((kw, i) => {
      expect(kw).toBeCloseTo(
        (p.baselineMonthlyPeakKw[i] ?? 0) - (p.batteryMonthlyPeakKw[i] ?? 0),
        9,
      );
    });
    // At least one month must be measurable, in either direction.
    expect(p.monthlyReductionKw.some((kw) => Math.abs(kw) > 1e-6)).toBe(true);
  });

  it("prices every month exactly once, increases included", () => {
    const cfg = defaultConfig();
    const { sim } = runDispatch(cfg, 15, 3);
    const p = peakEconomy(sim, WITH_TARIFF);
    const expected = p.monthlyReductionKw.reduce((a, kw) => a + kw * 55, 0);
    expect(p.annualPeakBenefitSek!).toBeCloseTo(expected, 9);
    // The signed sum must not be reproducible by a clamped sum when a month increased.
    const clamped = p.monthlyReductionKw.reduce((a, kw) => a + Math.max(0, kw) * 55, 0);
    if (p.monthlyReductionKw.some((kw) => kw < -1e-9))
      expect(p.annualPeakBenefitSek!).toBeLessThan(clamped);
  });
});

describe("F3 — FCR readiness charging is priced, never hidden", () => {
  it("keeps readiness charging inside the hard grid and battery limits", () => {
    const cfg = withPeak(withFcr(defaultConfig(), 1.5));
    const { limits, sim } = runDispatch(cfg, 15, 3);
    expect(sim.ancillary.readinessChargeKWh).toBeGreaterThanOrEqual(0);
    expect(sim.grid.maxActualImportKw).toBeLessThanOrEqual(limits.maxImportKw + 1e-9);
    expect(sim.grid.maxActualExportKw).toBeLessThanOrEqual(limits.maxExportKw + 1e-9);
    expect(sim.energyBalance.ok).toBe(true);
  });
});

describe("F4 — no simultaneous import and export in the same hour", () => {
  it("nets charging against free PV surplus when self-consumption is off", () => {
    const base = defaultConfig();
    const cfg = withPeak({
      ...base,
      strategies: { ...base.strategies, selfConsumption: false, curtailmentRecovery: false },
    });
    const series = buildSeries(cfg);
    const d = dispatch({
      series,
      battery: cfg.battery,
      grid: cfg.grid,
      strategies: cfg.strategies,
      peak: cfg.peakShaving,
      spot: cfg.spot,
      flex: cfg.flex,
      ancillary: null,
      capacityKWh: 15,
      powerKw: 3,
    });
    let both = 0;
    for (let h = 0; h < d.importSeries.length; h++) {
      const imp = d.importSeries[h] ?? 0;
      const exp = d.exportSeries[h] ?? 0;
      if (imp > 1e-9 && exp > 1e-9) both++;
    }
    expect(both).toBe(0);
    const sim = simulate(cfg, series, 15, 3);
    expect(sim.energyBalance.ok).toBe(true);
  });
});

describe("F6 — a full power reservation leaves nothing for the energy strategies", () => {
  it("blocks all discharge when the whole battery power is reserved", () => {
    const cfg = withFcr(defaultConfig(), 3);
    const { sim } = runDispatch(cfg, 15, 3);
    expect(sim.dischargedKWh).toBeCloseTo(0, 6);
    expect(sim.equivalentFullCycles).toBeCloseTo(0, 6);
    expect(sim.energyBalance.ok).toBe(true);
  });
});
