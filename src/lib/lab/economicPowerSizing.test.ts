/**
 * PRODUCT COST + ECONOMIC POWER SIZING — regression and falsification.
 *
 * The physics is frozen: these tests only verify the new economic layer, that it never
 * invents a recommendation, and that it never changes the capacity or the dispatch.
 */

import { describe, expect, it } from "vitest";
import { runBatteryEngine, runBatterySimulation } from "../battery-engine/run";
import { toLabConfig, toTimeSeries } from "../battery-engine/input";
import type { BatteryEngineInput } from "../battery-engine/types";
import {
  buildPowerCandidates,
  fcrMarketRealismGaps,
  realisticFcrNetSek,
  runEconomicPowerSizing,
} from "./economicPowerSizing";
import type { FcrMarketRealismConfig, PowerCandidateRun } from "./economicPowerSizing";
import { capitalRecoveryFactor, productCost, productCostConfig } from "./productCost";

/* ----------------------- reference case ----------------------- */

const LOAD = [2264, 1887, 1698, 1509, 1321, 1226, 1132, 1226, 1415, 1698, 2075, 2549];
const PV = [101, 302, 806, 1410, 1813, 2216, 2317, 2014, 1612, 906, 403, 100];

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
    economy: {
      importEnergyPriceSekPerKWh: 1.5,
      exportEnergyValueSekPerKWh: 0.6,
      peakDemandChargeSekPerKwMonth: 30,
      peakTariffSource: "user-provided",
      eurSekRate: 11.3,
    },
    ...over,
  };
}

/** Verified-looking TEST values only. Never shipped as engine defaults. */
const FULL_FCR_MARKET: FcrMarketRealismConfig = {
  aggregatorRevenueSharePct: 0,
  marketParticipationPct: 100,
  technicalAvailabilityPct: 100,
  downtimePct: 0,
  activationEnergySek: 0,
};

const BASE_COST = {
  batteryCapacityCostSekPerKWh: 4000,
  fixedInstallationCostSek: 20000,
  lifetimeYears: 15,
  discountRatePct: 5,
};

/** One shared simulation cache: identical physics, re-scored under different costs. */
const cache = new Map<number, PowerCandidateRun>();

function sizeAt(costOver: Record<string, unknown>, fcrMarket = FULL_FCR_MARKET) {
  const input = referenceInput();
  const cfg = toLabConfig(input);
  return runEconomicPowerSizing({
    cfg,
    series: toTimeSeries(cfg, input),
    capacityKWh: 25,
    physicalPowerNeedKw: 3.5,
    productPowerKw: 5,
    econ: {
      importEnergyPriceSekPerKWh: 1.5,
      exportEnergyValueSekPerKWh: 0.6,
      peakDemandChargeSekPerKwMonth: 30,
      peakTariffSource: "user-provided",
      eurSekRate: 11.3,
    },
    cost: productCostConfig({ ...BASE_COST, ...costOver }),
    fcrMarket,
    optimiseFcrReservation: true,
    runCache: cache,
  });
}

/* ----------------------- I. candidate generation ----------------------- */

describe("power candidates", () => {
  it("uses 0.5 C as a candidate MAXIMUM, never as a minimum", () => {
    // Physical sizing lands at 0.20 C and stays the lowest candidate.
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
    const c = buildPowerCandidates(25, 10, [2, 3, 5, 7.5, 10, 15], 0.5);
    expect(Math.min(...c)).toBe(10);
  });
});

/* ----------------------- cost model ----------------------- */

describe("product cost model", () => {
  it("annualises with the capital recovery factor and handles 0 % exactly", () => {
    expect(capitalRecoveryFactor(0, 15)).toBeCloseTo(1 / 15, 12);
    expect(capitalRecoveryFactor(5, 15)).toBeCloseTo(0.0963423, 6);
  });

  it("N. missing parameters produce null, never a false 0 kr", () => {
    const c = productCost(25, 7.5, productCostConfig({ batteryCapacityCostSekPerKWh: 4000 }));
    expect(c.capexSek).toBeNull();
    expect(c.annualisedTotalProductCostSek).toBeNull();
    expect(c.missing).toContain("powerElectronicsCostSekPerKw");
  });

  it("keeps capacity cost identical across system powers of the same capacity", () => {
    const cfg = productCostConfig({ ...BASE_COST, powerElectronicsCostSekPerKw: 1000 });
    const a = productCost(25, 5, cfg);
    const b = productCost(25, 12.5, cfg);
    expect(a.capacityCostSek).toBe(b.capacityCostSek);
    expect(b.capexSek! - a.capexSek!).toBeCloseTo(7.5 * 1000, 6);
  });
});

/* ----------------------- FCR market realism ----------------------- */

describe("fcr market realism", () => {
  it("reports every missing parameter and refuses a realistic net", () => {
    const gaps = fcrMarketRealismGaps({
      aggregatorRevenueSharePct: null,
      marketParticipationPct: null,
      technicalAvailabilityPct: null,
      downtimePct: null,
      activationEnergySek: null,
    });
    expect(gaps).toHaveLength(5);
    expect(realisticFcrNetSek(5000, {
      aggregatorRevenueSharePct: null,
      marketParticipationPct: 100,
      technicalAvailabilityPct: 100,
      downtimePct: 0,
      activationEnergySek: 0,
    })).toBeNull();
  });

  it("applies participation, availability, downtime and aggregator share", () => {
    expect(
      realisticFcrNetSek(10000, {
        aggregatorRevenueSharePct: 20,
        marketParticipationPct: 90,
        technicalAvailabilityPct: 95,
        downtimePct: 5,
        activationEnergySek: -100,
      }),
    ).toBeCloseTo(10000 * 0.9 * 0.95 * 0.95 * 0.8 - 100, 6);
  });
});

/* ----------------------- optimisation scenarios ----------------------- */

describe("economic power sizing — reference case 25 kWh", () => {
  it("C. zero power-electronics cost lets the highest system power win", () => {
    const r = sizeAt({ powerElectronicsCostSekPerKw: 0 });
    expect(r.candidatePowersKw).toEqual([5, 7.5, 10, 12.5]);
    expect(r.status).toBe("complete");
    expect(r.economicallyOptimalPowerKw).toBe(12.5);
    expect(r.operatingOptimalPowerKw).toBe(12.5);
  });

  it("E. a very high power cost makes the physically sized 5 kW win", () => {
    const r = sizeAt({ powerElectronicsCostSekPerKw: 20000 });
    expect(r.economicallyOptimalPowerKw).toBe(5);
    expect(r.options.find((o) => o.selected)!.physicalSizingChoice).toBe(true);
  });

  it("D. an explicit price list can make 10 kW the economic optimum", () => {
    const r = sizeAt({
      explicitOptionCostSek: { "25/5": 200000, "25/7.5": 210000, "25/10": 215000, "25/12.5": 400000 },
    });
    expect(r.economicallyOptimalPowerKw).toBe(10);
  });

  it("D2. a different price list makes 7.5 kW the economic optimum", () => {
    const r = sizeAt({
      explicitOptionCostSek: { "25/5": 200000, "25/7.5": 205000, "25/10": 260000, "25/12.5": 400000 },
    });
    expect(r.economicallyOptimalPowerKw).toBe(7.5);
  });

  it("operating optimum and economic optimum are separate answers", () => {
    const r = sizeAt({
      explicitOptionCostSek: { "25/5": 200000, "25/7.5": 205000, "25/10": 260000, "25/12.5": 400000 },
    });
    expect(r.operatingOptimalPowerKw).toBe(12.5);
    expect(r.economicallyOptimalPowerKw).toBe(7.5);
    expect(r.physicalPowerNeedKw).toBe(3.5);
    expect(r.productPowerKw).toBe(5);
  });

  it("reports full per-candidate economics including increments", () => {
    const r = sizeAt({ powerElectronicsCostSekPerKw: 0 });
    expect(r.options).toHaveLength(4);
    for (const o of r.options) {
      expect(o.operatingBenefitSek).toBeGreaterThan(0);
      expect(o.capexSek).not.toBeNull();
      expect(o.annualNetBenefitSek).not.toBeNull();
      // Payment can never exceed what the gate physically allowed.
      expect(o.fcrMonetizedPowerKw).toBeLessThanOrEqual(o.powerKw + 1e-9);
    }
    expect(r.options[0]!.incrementalOperatingBenefitSek).toBeNull();
    expect(r.options[3]!.incrementalOperatingBenefitSek).toBeGreaterThan(0);
    // Operating benefit rises with power in this FCR-active case.
    const totals = r.options.map((o) => o.operatingBenefitSek);
    expect(totals[3]!).toBeGreaterThan(totals[0]!);
  });

  it("A. no product cost => no economic optimum and no simulation", () => {
    const input = referenceInput();
    const cfg = toLabConfig(input);
    const r = runEconomicPowerSizing({
      cfg,
      series: toTimeSeries(cfg, input),
      capacityKWh: 25,
      physicalPowerNeedKw: 3.5,
      productPowerKw: 5,
      cost: productCostConfig(),
      fcrMarket: FULL_FCR_MARKET,
    });
    expect(r.status).toBe("incomplete");
    expect(r.reason).toBe("product-cost-data-missing");
    expect(r.economicallyOptimalPowerKw).toBeNull();
    expect(r.options).toEqual([]);
    expect(r.productCostGaps.length).toBeGreaterThan(0);
  });

  it("B. missing FCR market data never produces an FCR-driven optimum", () => {
    const r = sizeAt({ powerElectronicsCostSekPerKw: 6000 }, {
      aggregatorRevenueSharePct: null,
      marketParticipationPct: null,
      technicalAvailabilityPct: null,
      downtimePct: null,
      activationEnergySek: null,
    });
    expect(r.status).toBe("partial");
    expect(r.reason).toBe("fcr-market-data-incomplete");
    expect(r.fcrExcludedFromObjective).toBe(true);
    for (const o of r.options) expect(o.fcrRevenueUsedSek).toBe(0);
    // Historical gross is still REPORTED, just never used to justify more kW.
    expect(r.options.some((o) => (o.fcrGrossSek ?? 0) > 0)).toBe(true);
    // FCR gross is large enough to justify 12.5 kW; excluded, it cannot.
    expect(r.economicallyOptimalPowerKw).toBe(5);
    expect(
      sizeAt({ powerElectronicsCostSekPerKw: 6000 }).economicallyOptimalPowerKw!,
    ).toBeGreaterThan(5);
  });
});

/* ----------------------- F. no FCR ----------------------- */

describe("F. without FCR", () => {
  it("does not buy extra system power when the physical gain is tiny", () => {
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
      cost: productCostConfig({ ...BASE_COST, powerElectronicsCostSekPerKw: 1500 }),
      optimiseFcrReservation: false,
    });
    expect(r.status).toBe("complete");
    expect(r.economicallyOptimalPowerKw).toBe(5);
  });
});

/* ----------------------- G. peak-heavy ----------------------- */

describe("G. peak-heavy case, documented limitation", () => {
  it("extra product power alone does not increase peak savings today", () => {
    // Short, high, recurring evening peaks: 2 kW base + a single 22 kW hour every day.
    const load = Array.from({ length: 8760 }, (_, h) => (h % 24 === 18 ? 22 : 2));
    const input: BatteryEngineInput = {
      site: { mainFuseA: 63 },
      consumption: { hourlyKWh: load, annualKWh: load.reduce((a, b) => a + b, 0) },
      production: { enabled: false },
      strategies: { selfConsumption: true, reduceImport: true, peakShaving: true, fcrDUp: false },
      economy: {
        importEnergyPriceSekPerKWh: 1.5,
        exportEnergyValueSekPerKWh: 0.6,
        peakDemandChargeSekPerKwMonth: 150,
        peakTariffSource: "user-provided",
      },
    };
    const cfg = toLabConfig(input);
    const r = runEconomicPowerSizing({
      cfg,
      series: toTimeSeries(cfg, input),
      capacityKWh: 25,
      physicalPowerNeedKw: 5,
      productPowerKw: 5,
      econ: {
        importEnergyPriceSekPerKWh: 1.5,
        exportEnergyValueSekPerKWh: 0.6,
        peakDemandChargeSekPerKwMonth: 150,
        peakTariffSource: "user-provided",
        eurSekRate: 11.3,
      },
      cost: productCostConfig({ ...BASE_COST, powerElectronicsCostSekPerKw: 500 }),
      optimiseFcrReservation: false,
    });
    // Peak shaving discharges towards a THRESHOLD, so every candidate lands on the same
    // dispatch power and the same peak saving. Buying more kW therefore only adds cost.
    const peak = r.options.map((o) => o.peakBenefitSek!);
    expect(new Set(peak.map((p) => p.toFixed(6))).size).toBe(1);
    expect(r.economicallyOptimalPowerKw).toBe(5);
  });
});

/* ----------------------- H. small connection ----------------------- */

describe("H. small grid connection", () => {
  it("never monetises more FCR power than the physical gate allowed", () => {
    const input = referenceInput({ site: { country: "SE", mainFuseA: 16, phases: 3, voltageV: 400 } });
    const cfg = toLabConfig(input);
    const r = runEconomicPowerSizing({
      cfg,
      series: toTimeSeries(cfg, input),
      capacityKWh: 25,
      physicalPowerNeedKw: 3.5,
      productPowerKw: 5,
      cost: productCostConfig({ ...BASE_COST, powerElectronicsCostSekPerKw: 0 }),
      fcrMarket: FULL_FCR_MARKET,
      optimiseFcrReservation: true,
    });
    const biggest = r.options[r.options.length - 1]!;
    expect(biggest.powerKw).toBe(12.5);
    // The gate, not the product rating, sets what gets paid.
    expect(biggest.fcrMonetizedPowerKw).toBeLessThan(biggest.powerKw);
    expect(biggest.fcrMonetizedPowerKw).toBeLessThanOrEqual(biggest.fcrOfferedPowerKw + 1e-9);
  });
});

/* ----------------------- J/K/L/M. no regression ----------------------- */

describe("engine integration", () => {
  it("M/J. without product cost the engine result is unchanged", () => {
    const r = runBatteryEngine(referenceInput());
    expect(r.summary.recommendation.capacityKWh).toBe(25);
    expect(r.summary.recommendation.powerKw).toBe(5);
    expect(r.summary.recommendation.productPowerKw).toBe(5);
    expect(r.summary.recommendation.physicalPowerNeedKw).toBe(3.5);
    expect(r.summary.recommendation.economicallyOptimalPowerKw).toBeNull();
    expect(r.summary.recommendation.economicPowerSizingStatus).toBe("incomplete");
    expect(r.summary.recommendation.economicPowerSizingReason).toBe("product-cost-data-missing");
    expect(r.summary.powerOptions).toEqual([]);
  });

  it("J. product cost never changes the recommended capacity", () => {
    const r = runBatteryEngine(
      referenceInput({
        productCost: { ...BASE_COST, powerElectronicsCostSekPerKw: 0 },
        fcrMarketRealism: FULL_FCR_MARKET,
      }),
    );
    expect(r.summary.recommendation.capacityKWh).toBe(25);
    expect(r.summary.recommendation.productPowerKw).toBe(5);
    expect(r.summary.recommendation.economicallyOptimalPowerKw).toBe(12.5);
    expect(r.summary.recommendation.powerKw).toBe(12.5);
    expect(r.summary.powerOptions).toHaveLength(4);
    expect(r.summary.powerOptions.filter((o) => o.selected)).toHaveLength(1);
  });

  it("K. the energy balance stays exact for the economically chosen system", () => {
    const r = runBatteryEngine(
      referenceInput({
        productCost: { ...BASE_COST, powerElectronicsCostSekPerKw: 0 },
        fcrMarketRealism: FULL_FCR_MARKET,
      }),
    );
    expect(r.summary.energyBalance.ok).toBe(true);
  });

  it("L/M. the physical dispatch for a fixed kWh/kW is untouched by the new layer", () => {
    const plain = runBatterySimulation(referenceInput(), 25, 5);
    const withCost = runBatterySimulation(
      referenceInput({
        productCost: { ...BASE_COST, powerElectronicsCostSekPerKw: 0 },
        fcrMarketRealism: FULL_FCR_MARKET,
      }),
      25,
      5,
    );
    expect(withCost.importKWh).toBeCloseTo(plain.importKWh, 9);
    expect(withCost.exportKWh).toBeCloseTo(plain.exportKWh, 9);
    expect(withCost.totalUsefulKWh).toBeCloseTo(plain.totalUsefulKWh, 9);
  });

  it("fixed sizing skips economic power sizing entirely", () => {
    const r = runBatteryEngine(
      referenceInput({
        battery: { fixedCapacityKWh: 25, fixedPowerKw: 5 },
        productCost: { ...BASE_COST, powerElectronicsCostSekPerKw: 0 },
        fcrMarketRealism: FULL_FCR_MARKET,
      }),
    );
    expect(r.summary.recommendation.economicPowerSizingReason).toBe("sizing-fixed");
    expect(r.summary.recommendation.powerKw).toBe(5);
  });
});
