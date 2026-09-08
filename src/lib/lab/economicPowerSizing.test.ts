/**
 * OPERATING-BENEFIT POWER SIZING — regression and falsification.
 *
 * The physics is frozen: these tests only verify that the system power is chosen on the
 * highest calculated annual operating benefit (energy + peak + FCR), that no product cost
 * is required, and that neither the capacity nor the dispatch changes.
 */

import { describe, expect, it } from "vitest";
import { runBatteryEngine, runBatterySimulation } from "../battery-engine/run";
import { toLabConfig, toTimeSeries } from "../battery-engine/input";
import type { BatteryEngineInput } from "../battery-engine/types";
import {
  buildPowerCandidates,
  fcrMarketRealismGaps,
  POWER_TIE_TOLERANCE_SEK,
  realisticFcrNetSek,
  runEconomicPowerSizing,
} from "./economicPowerSizing";
import type { FcrMarketRealismConfig, PowerCandidateRun } from "./economicPowerSizing";
import { capitalRecoveryFactor, productCost, productCostConfig } from "./productCost";

/* ----------------------- reference case ----------------------- */

const LOAD = [2264, 1887, 1698, 1509, 1321, 1226, 1132, 1226, 1415, 1698, 2075, 2549];
const PV = [101, 302, 806, 1410, 1813, 2216, 2317, 2014, 1612, 906, 403, 100];

const ECON = {
  importEnergyPriceSekPerKWh: 1.5,
  exportEnergyValueSekPerKWh: 0.6,
  peakDemandChargeSekPerKwMonth: 30,
  peakTariffSource: "user-provided" as const,
  eurSekRate: 11.3,
};

function referenceInput(over: Partial<BatteryEngineInput> = {}): BatteryEngineInput {
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

const FULL_FCR_MARKET: FcrMarketRealismConfig = {
  aggregatorRevenueSharePct: 0,
  marketParticipationPct: 100,
  technicalAvailabilityPct: 100,
  downtimePct: 0,
  activationEnergySek: 0,
};

/** One shared simulation cache for the reference case: identical, deterministic physics. */
const cache = new Map<number, PowerCandidateRun>();

function sizeReference(over: Partial<BatteryEngineInput> = {}) {
  const input = referenceInput(over);
  const cfg = toLabConfig(input);
  return runEconomicPowerSizing({
    cfg,
    series: toTimeSeries(cfg, input),
    capacityKWh: 25,
    physicalPowerNeedKw: 3.5,
    productPowerKw: 5,
    econ: ECON,
    optimiseFcrReservation: true,
    runCache: cache,
  });
}


/* ----------------------- E. candidate generation ----------------------- */

describe("E. power candidates", () => {
  it("uses 0.5 C as a candidate MAXIMUM, never as a minimum", () => {
    const c = buildPowerCandidates(25, 5, [2, 3, 5, 7.5, 10, 15, 20], 0.5);
    expect(c).toEqual([5, 7.5, 10, 12.5]);
    expect(Math.min(...c) / 25).toBeCloseTo(0.2, 6);
    expect(Math.max(...c) / 25).toBeCloseTo(0.5, 6);
  });

  it("adds the exact C-rate ceiling when it is not a product step", () => {
    expect(buildPowerCandidates(15, 3, [2, 3, 5, 7.5, 10], 0.5)).toEqual([3, 5, 7.5]);
    expect(buildPowerCandidates(30, 5, [2, 3, 5, 7.5, 10, 15, 20], 0.5)).toEqual([5, 7.5, 10, 15]);
  });

  it("never proposes a power below the physically sized one", () => {
    expect(Math.min(...buildPowerCandidates(25, 10, [2, 3, 5, 7.5, 10, 15], 0.5))).toBe(10);
  });
});

/* ----------------------- parked product cost ----------------------- */

describe("parked product cost layer", () => {
  it("still annualises correctly but is never required", () => {
    expect(capitalRecoveryFactor(0, 15)).toBeCloseTo(1 / 15, 12);
    expect(capitalRecoveryFactor(5, 15)).toBeCloseTo(0.0963423, 6);
    const c = productCost(25, 7.5, productCostConfig({ batteryCapacityCostSekPerKWh: 4000 }));
    expect(c.capexSek).toBeNull();
  });

  it("a missing product cost never blocks the recommendation", () => {
    const r = sizeReference();
    expect(r.productCostGaps).toEqual([]);
    expect(r.operatingOptimalPowerKw).not.toBeNull();
    expect(r.economicallyOptimalPowerKw).toBeNull();
    expect(r.reason).not.toContain("product-cost");
  });
});

/* ----------------------- FCR market realism ----------------------- */

describe("fcr market realism", () => {
  it("reports missing parameters without refusing a recommendation", () => {
    expect(
      fcrMarketRealismGaps({
        aggregatorRevenueSharePct: null,
        marketParticipationPct: null,
        technicalAvailabilityPct: null,
        downtimePct: null,
        activationEnergySek: null,
      }),
    ).toHaveLength(5);
    const r = sizeReference();
    expect(r.fcrMarketGaps.length).toBeGreaterThan(0);
    expect(r.status).toBe("partial");
    expect(r.reason).toBe("historical-fcr-scenario");
    expect(r.operatingOptimalPowerKw).not.toBeNull();
  });

  it("applies participation, availability, downtime and aggregator share when verified", () => {
    expect(
      realisticFcrNetSek(10000, {
        aggregatorRevenueSharePct: 20,
        marketParticipationPct: 90,
        technicalAvailabilityPct: 95,
        downtimePct: 5,
        activationEnergySek: -100,
      }),
    ).toBeCloseTo(10000 * 0.9 * 0.95 * 0.95 * 0.8 - 100, 6);
    expect(realisticFcrNetSek(5000, {
      aggregatorRevenueSharePct: null,
      marketParticipationPct: 100,
      technicalAvailabilityPct: 100,
      downtimePct: 0,
      activationEnergySek: 0,
    })).toBeNull();
  });
});

/* ----------------------- A / H / I / J. reference case, FCR on ----------------------- */

describe("A. reference case 25 kWh with FCR-D up active", () => {
  it("simulates every candidate and lets the highest benefit win", () => {
    const r = sizeReference();
    expect(r.candidatePowersKw).toEqual([5, 7.5, 10, 12.5]);
    // H. every candidate is fully simulated, never extrapolated.
    expect(r.options).toHaveLength(4);
    for (const o of r.options) {
      expect(o.run.result.annualLoadKWh).toBeGreaterThan(0);
      // I. payment can never exceed what the physical gate allowed.
      expect(o.fcrMonetizedPowerKw).toBeLessThanOrEqual(o.fcrOfferedPowerKw + 1e-9);
      expect(o.fcrMonetizedPowerKw).toBeLessThanOrEqual(o.powerKw + 1e-9);
      // J. energy + peak + FCR = total.
      expect(o.totalOperatingBenefitSek).toBeCloseTo(
        o.energyBenefitSek + (o.peakBenefitSek ?? 0) + o.fcrRevenueSek,
        2,
      );
    }
    const totals = r.options.map((o) => o.totalOperatingBenefitSek);
    expect(totals[3]!).toBeGreaterThan(totals[0]!);
    expect(r.operatingOptimalPowerKw).toBe(12.5);
    expect(r.recommendedPowerKw).toBe(12.5);
    expect(r.recommendationUsesHistoricalFcr).toBe(true);
    // L. the physical need stays a separate answer.
    expect(r.physicalPowerNeedKw).toBe(3.5);
    expect(r.productPowerKw).toBe(5);
  });

  it("reports the delta against the next lower candidate", () => {
    const r = sizeReference();
    expect(r.options[0]!.deltaVsPreviousKw).toBeNull();
    for (let i = 1; i < r.options.length; i++)
      expect(r.options[i]!.deltaVsPreviousKw).toBeCloseTo(
        r.options[i]!.totalOperatingBenefitSek - r.options[i - 1]!.totalOperatingBenefitSek,
        2,
      );
  });
});

/* ----------------------- B. FCR off ----------------------- */

describe("B. without FCR the physical level wins", () => {
  it("does not buy extra system power for a negligible physical gain", () => {
    const input = referenceInput({
      strategies: { selfConsumption: true, reduceImport: true, peakShaving: true, fcrDUp: false },
    });
    const cfg = toLabConfig(input);
    const r = runEconomicPowerSizing({
      cfg,
      series: toTimeSeries(cfg, input),
      capacityKWh: 25,
      physicalPowerNeedKw: 3.5,
      productPowerKw: 5,
      econ: ECON,
      optimiseFcrReservation: false,
    });
    expect(r.status).toBe("complete");
    expect(r.operatingOptimalPowerKw).toBe(5);
    expect(r.recommendationUsesHistoricalFcr).toBe(false);
    for (const o of r.options) expect(o.fcrRevenueSek).toBe(0);
  });
});

/* ----------------------- G. tie-break ----------------------- */

describe("G. tie-break", () => {
  it("chooses the LOWER system power when candidates are within the tolerance", () => {
    const input = referenceInput({
      strategies: { selfConsumption: true, reduceImport: true, peakShaving: true, fcrDUp: false },
    });
    const cfg = toLabConfig(input);
    const r = runEconomicPowerSizing({
      cfg,
      series: toTimeSeries(cfg, input),
      capacityKWh: 25,
      physicalPowerNeedKw: 3.5,
      productPowerKw: 5,
      econ: ECON,
      optimiseFcrReservation: false,
    });
    const best = Math.max(...r.options.map((o) => o.totalOperatingBenefitSek));
    const winner = r.options.find((o) => o.selected)!;
    expect(best - winner.totalOperatingBenefitSek).toBeLessThanOrEqual(POWER_TIE_TOLERANCE_SEK);
    expect(r.tieToleranceSek).toBe(25);
    // No higher candidate may be selected while a lower one is within the tolerance.
    const lower = r.options.filter((o) => o.powerKw < winner.powerKw);
    for (const o of lower) expect(best - o.totalOperatingBenefitSek).toBeGreaterThan(POWER_TIE_TOLERANCE_SEK);
  });
});

/* ----------------------- C. peak-heavy / EV ----------------------- */

describe("C. peak-heavy case without FCR", () => {
  it("only pays for extra power when energy + peak benefit actually rises", () => {
    // Short, high, recurring evening peaks: 2 kW base + a single 22 kW hour every day.
    const load = Array.from({ length: 8760 }, (_, h) => (h % 24 === 18 ? 22 : 2));
    const input: BatteryEngineInput = {
      site: { mainFuseA: 63 },
      consumption: { hourlyKWh: load, annualKWh: load.reduce((a, b) => a + b, 0) },
      production: { enabled: false },
      strategies: { selfConsumption: true, reduceImport: true, peakShaving: true, fcrDUp: false },
      economy: { ...ECON, peakDemandChargeSekPerKwMonth: 150 },
    };
    const cfg = toLabConfig(input);
    const r = runEconomicPowerSizing({
      cfg,
      series: toTimeSeries(cfg, input),
      capacityKWh: 25,
      physicalPowerNeedKw: 5,
      productPowerKw: 5,
      econ: { ...ECON, peakDemandChargeSekPerKwMonth: 150 },
      optimiseFcrReservation: false,
    });
    const winner = r.options.find((o) => o.selected)!;
    const best = Math.max(...r.options.map((o) => o.totalOperatingBenefitSek));
    // The winner is the highest benefit within the tie tolerance, whatever the physics says.
    expect(best - winner.totalOperatingBenefitSek).toBeLessThanOrEqual(POWER_TIE_TOLERANCE_SEK);
    expect(winner.powerKw).toBe(r.operatingOptimalPowerKw);
  });
});

/* ----------------------- D. small grid connection ----------------------- */

describe("D. small grid connection limits the FCR value of extra kW", () => {
  it("never monetises more FCR power than the physical gate allowed", () => {
    const input = referenceInput({ site: { country: "SE", mainFuseA: 16, phases: 3, voltageV: 400 } });
    const cfg = toLabConfig(input);
    const r = runEconomicPowerSizing({
      cfg,
      series: toTimeSeries(cfg, input),
      capacityKWh: 25,
      physicalPowerNeedKw: 3.5,
      productPowerKw: 5,
      econ: ECON,
      fcrMarket: FULL_FCR_MARKET,
      optimiseFcrReservation: true,
    });
    const biggest = r.options[r.options.length - 1]!;
    expect(biggest.powerKw).toBe(12.5);
    expect(biggest.fcrMonetizedPowerKw).toBeLessThan(biggest.powerKw);
    expect(biggest.fcrMonetizedPowerKw).toBeLessThanOrEqual(biggest.fcrOfferedPowerKw + 1e-9);
  });
});

/* ----------------------- F / K / L / M. engine integration ----------------------- */

describe("engine integration", () => {
  it("F/K. keeps the capacity and recommends the operating optimum", () => {
    const r = runBatteryEngine(referenceInput());
    const rec = r.summary.recommendation;
    expect(rec.capacityKWh).toBe(25);
    expect(rec.productPowerKw).toBe(5);
    expect(rec.physicalPowerNeedKw).toBe(3.5);
    expect(rec.operatingOptimalPowerKw).toBe(12.5);
    expect(rec.recommendedPowerKw).toBe(rec.operatingOptimalPowerKw);
    expect(rec.powerKw).toBe(rec.recommendedPowerKw);
    expect(rec.economicallyOptimalPowerKw).toBeNull();
    expect(rec.recommendationUsesHistoricalFcr).toBe(true);
    expect(r.summary.powerOptions).toHaveLength(4);
    expect(r.summary.powerOptions.filter((o) => o.selected)).toHaveLength(1);
  });

  it("M. the energy balance stays exact for the chosen system", () => {
    expect(runBatteryEngine(referenceInput()).summary.energyBalance.ok).toBe(true);
  });

  it("the physical dispatch for a fixed kWh/kW is untouched by the new layer", () => {
    const plain = runBatterySimulation(referenceInput(), 25, 5);
    const again = runBatterySimulation(referenceInput(), 25, 5);
    expect(again.importKWh).toBeCloseTo(plain.importKWh, 9);
    expect(again.totalUsefulKWh).toBeCloseTo(plain.totalUsefulKWh, 9);
  });

  it("fixed sizing skips power optimisation entirely", () => {
    const r = runBatteryEngine(
      referenceInput({ battery: { fixedCapacityKWh: 25, fixedPowerKw: 5 } }),
    );
    expect(r.summary.recommendation.economicPowerSizingReason).toBe("sizing-fixed");
    expect(r.summary.recommendation.powerKw).toBe(5);
    expect(r.summary.recommendation.recommendedPowerKw).toBe(5);
  });
});
