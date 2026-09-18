/**
 * BASE POWER FOR ENERGY HANDLING (solar flow).
 *
 * The recommended system power is the SMALLEST real product step that reaches 95 % of the
 * saturated PHYSICAL benefit, measured with ancillary services OFF and with the two
 * measures (useful energy and peak reduction) judged SEPARATELY. A measure whose maximum
 * is 0 is N/A and may not block the choice.
 *
 * These tests specifically guard that the older 99 % sizing in `powerSizing.sizePower` can
 * no longer act as a FLOOR under the candidate ladder. Audit case C032 (SE, 200 000 kWh,
 * 100 kWp, 100 A, workshop) previously got 20 kW because 15 kW (98.90 % useful) sat just
 * under the 99 % threshold and was therefore never scanned by the 95 % rule.
 */
import { describe, expect, it } from "vitest";

import { runBatteryEngine } from "@/lib/battery-engine";
import type { BatteryEngineInput } from "@/lib/battery-engine";
import { toLabConfig, toTimeSeries } from "@/lib/battery-engine/input";
import {
  PHYSICAL_SATURATION_FRACTION,
  runEconomicPowerSizing,
} from "./economicPowerSizing";

const ECON = {
  importEnergyPriceSekPerKWh: 1.5,
  exportEnergyValueSekPerKWh: 0.6,
  peakDemandChargeSekPerKwMonth: 30,
  peakTariffSource: "user-provided" as const,
  eurSekRate: 11.3,
};

/** Audit case C032. */
function c032(fcr: boolean): BatteryEngineInput {
  return {
    site: { country: "SE", mainFuseA: 100, phases: 3, voltageV: 400 },
    consumption: { annualKWh: 200000, profile: "workshop" },
    production: { enabled: true, kWp: 100, annualKWh: 95000 },
    strategies: {
      selfConsumption: true,
      reduceImport: true,
      peakShaving: true,
      fcrDUp: fcr,
      optimiseFcrReservation: fcr,
    },
    economy: ECON,
  };
}

/** Smallest step satisfying the rule, computed straight from a reported scan. */
function ruleWinner(scan: { powerKw: number; usefulKWh: number; peakReductionKw: number }[]) {
  const maxUseful = Math.max(...scan.map((p) => p.usefulKWh));
  const maxPeak = Math.max(...scan.map((p) => p.peakReductionKw));
  const ok = (p: { usefulKWh: number; peakReductionKw: number }) =>
    (maxUseful <= 0 || p.usefulKWh >= PHYSICAL_SATURATION_FRACTION * maxUseful - 1e-9) &&
    (maxPeak <= 0 || p.peakReductionKw >= PHYSICAL_SATURATION_FRACTION * maxPeak - 1e-9);
  return { maxUseful, maxPeak, ok, hit: scan.find(ok)! };
}

describe("base power for energy handling — 95 % physical saturation", () => {
  it("1/3. C032 gets 15 kW: 10 kW is below 95 %, 15 kW is not", () => {
    const rec = runBatteryEngine(c032(true)).summary.recommendation;
    expect(rec.capacityKWh).toBe(150);
    // Base power is the 95 % answer; ancillary services raise the INSTALLED power.
    expect(rec.basePowerForEnergyKw).toBe(15);
    // The old 99 % answer is still REPORTED separately and is higher.
    expect(rec.physicalPowerNeedKw).toBe(20);
  });

  it("2/5. the ladder contains 15 kW and the peak measure is N/A, not blocking", () => {
    const input = c032(false);
    const cfg = toLabConfig(input);
    const r = runEconomicPowerSizing({
      cfg,
      series: toTimeSeries(cfg, input),
      capacityKWh: 150,
      physicalPowerNeedKw: 20,
      productPowerKw: 20,
      econ: ECON,
      optimiseFcrReservation: false,
    });
    // The old 99 % floor (20 kW) may not remove lower steps from the ladder.
    expect(r.candidatePowersKw).toContain(15);
    expect(r.candidatePowersKw).toContain(10);
    expect(Math.min(...r.candidatePowersKw)).toBeLessThanOrEqual(3);

    const scan = r.physicalBenefitScan ?? [];
    const { maxUseful, maxPeak, ok, hit } = ruleWinner(scan);
    // C032 has a flat grid-capped baseline peak, so peak reduction is 0 at every step.
    expect(maxPeak).toBe(0);
    expect(maxUseful).toBeGreaterThan(0);
    expect(hit.powerKw).toBe(15);
    expect(r.energyPowerNeedKw).toBe(15);
    const ten = scan.find((p) => p.powerKw === 10)!;
    expect(ok(ten)).toBe(false);
    expect(ten.usefulKWh / maxUseful).toBeLessThan(PHYSICAL_SATURATION_FRACTION);
  });

  it("4. with a real peak reduction BOTH measures must reach 95 %", () => {
    const input: BatteryEngineInput = {
      site: { country: "SE", mainFuseA: 100, phases: 3, voltageV: 400 },
      consumption: { annualKWh: 50000, profile: "workshop" },
      production: { enabled: true, kWp: 40, annualKWh: 38000 },
      strategies: { selfConsumption: true, reduceImport: true, peakShaving: true, fcrDUp: false },
      economy: ECON,
    };
    const engine = runBatteryEngine(input);
    const cfg = toLabConfig(input);
    const r = runEconomicPowerSizing({
      cfg,
      series: toTimeSeries(cfg, input),
      capacityKWh: engine.summary.recommendation.capacityKWh,
      physicalPowerNeedKw: engine.summary.recommendation.physicalPowerNeedKw,
      productPowerKw: engine.summary.recommendation.productPowerKw,
      econ: ECON,
      optimiseFcrReservation: false,
    });
    const scan = r.physicalBenefitScan ?? [];
    const { maxPeak, ok, hit } = ruleWinner(scan);
    expect(maxPeak).toBeGreaterThan(0);
    expect(r.energyPowerNeedKw).toBe(hit.powerKw);
    // Every lower step fails at least one of the two separate criteria.
    for (const p of scan.filter((s) => s.powerKw < hit.powerKw)) expect(ok(p)).toBe(false);
    // The two measures are never summed into one score.
    expect(hit.usefulKWh).toBeGreaterThan(0);
  });

  it("6. the nominal main-fuse guardrail still caps the ladder", () => {
    const input: BatteryEngineInput = {
      ...c032(false),
      site: { country: "SE", mainFuseA: 16, phases: 3, voltageV: 400 },
    };
    const cfg = toLabConfig(input);
    const r = runEconomicPowerSizing({
      cfg,
      series: toTimeSeries(cfg, input),
      capacityKWh: 150,
      physicalPowerNeedKw: 20,
      productPowerKw: 20,
      econ: ECON,
      optimiseFcrReservation: false,
    });
    // 16 A / 3-phase / 400 V = 11.09 kW nominal -> the 10 kW product step.
    expect(Math.max(...r.candidatePowersKw)).toBe(10);
    expect(r.recommendedPowerKw).toBeLessThanOrEqual(10);
  });

  it("7. FCR on/off does not change the base power", () => {
    const off = runBatteryEngine(c032(false)).summary.recommendation;
    const on = runBatteryEngine(c032(true)).summary.recommendation;
    expect(on.basePowerForEnergyKw).toBe(off.basePowerForEnergyKw);
    expect(off.recommendedPowerKw).toBe(off.basePowerForEnergyKw);
    expect(on.recommendationUsesHistoricalFcr).toBe(false);
  });

  it("9. 200 kW is still reachable when the physics genuinely needs it", () => {
    const load = Array.from({ length: 8760 }, (_, h) => {
      const hr = h % 24;
      return hr >= 18 && hr < 20 ? 1600 : 150;
    });
    const r = runBatteryEngine({
      site: { country: "SE", mainFuseA: 2000, phases: 3, voltageV: 400 },
      battery: { fixedCapacityKWh: 500 },
      consumption: { hourlyKWh: load, annualKWh: load.reduce((a, b) => a + b, 0) },
      production: { enabled: false },
      strategies: { selfConsumption: true, reduceImport: true, peakShaving: true, fcrDUp: false },
      economy: { ...ECON, peakDemandChargeSekPerKwMonth: 150 },
    }).summary.recommendation;
    expect(r.recommendedPowerKw).toBe(200);
  });
});
