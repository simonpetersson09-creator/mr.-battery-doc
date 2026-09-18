/**
 * ANCILLARY-DRIVEN SYSTEM POWER.
 *
 * Product rule under test: with ancillary services OFF the recommendation stays at the
 * 95 % base power for energy handling. With them ON the recommendation becomes the
 * HIGHEST real product step the potential analysis was allowed to simulate — i.e. the
 * largest step inside the nominal main-fuse product guardrail and the global 200 kW cap.
 *
 * No cost model, no C-rate rule and no multiplier is involved, and the capacity sizing is
 * untouched by the power raise.
 */
import { describe, expect, it } from "vitest";

import { runBatteryEngine } from "@/lib/battery-engine";
import type { BatteryEngineInput } from "@/lib/battery-engine";
import {
  benefitBreakdown,
  customerEconomyFromResult,
  maxInvestmentSek,
} from "@/lib/battery-app/customerEconomy";

const ECON = {
  importEnergyPriceSekPerKWh: 1.5,
  exportEnergyValueSekPerKWh: 0.6,
  peakDemandChargeSekPerKwMonth: 30,
  peakTariffSource: "user-provided" as const,
  eurSekRate: 11.3,
};

function site(fuseA: number, annualKWh: number, kWp: number, fcr: boolean): BatteryEngineInput {
  return {
    site: { country: "SE", mainFuseA: fuseA, phases: 3, voltageV: 400 },
    consumption: { annualKWh, profile: "workshop" },
    production: { enabled: true, kWp, annualKWh: Math.round(kWp * 950) },
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

/** Audit case C032. */
const c032 = (fcr: boolean) => site(100, 200000, 100, fcr);

describe("ancillary services and the recommended system power", () => {
  it("1. FCR off: the recommendation is exactly the base power for energy handling", () => {
    const r = runBatteryEngine(c032(false)).summary.recommendation;
    expect(r.basePowerForEnergyKw).toBe(15);
    expect(r.recommendedPowerKw).toBe(15);
    expect(r.ancillaryRaisedPowerKw).toBeNull();
  });

  it("2. C032 with FCR on: 15 kW base power, 60 kW recommended", () => {
    const r = runBatteryEngine(c032(true)).summary.recommendation;
    expect(r.basePowerForEnergyKw).toBe(15);
    expect(r.recommendedPowerKw).toBe(60);
    expect(r.ancillaryRaisedPowerKw).toBe(60);
    // The capacity sizing is NOT affected by the power raise.
    expect(r.capacityKWh).toBe(150);
  });

  it("3. a large main fuse can reach the global 200 kW product cap, never above it", () => {
    const r = runBatteryEngine(site(800, 2000000, 800, true)).summary.recommendation;
    expect(r.recommendedPowerKw).toBe(200);
    expect(r.recommendedPowerKw).toBeLessThanOrEqual(200);
  });

  it("4. the recommendation never exceeds the nominal main-fuse product step", () => {
    for (const fuseA of [16, 25, 63, 100]) {
      const res = runBatteryEngine(site(fuseA, 200000, 100, true)).summary;
      const potential = res.ancillaryPowerPotential;
      const guardrailStep = potential?.fuseGuardrailStepKw ?? Infinity;
      expect(res.recommendation.recommendedPowerKw).toBeLessThanOrEqual(guardrailStep + 1e-9);
    }
  });

  it("5. economy, FCR and max investment come from the RAISED configuration", () => {
    const res = runBatteryEngine(c032(true));
    const s = res.summary;
    // The simulated reserve belongs to the 60 kW system, not to the 15 kW base power.
    expect(s.fcr.offeredPowerKw).toBeCloseTo(60, 6);
    expect(s.fcr.avgHeldPowerKw ?? 0).toBeGreaterThan(40);
    const ce = customerEconomyFromResult(res, 0.75);
    const low = runBatteryEngine(c032(false));
    const ceLow = customerEconomyFromResult(low, 0.75);
    expect(ce.totalCustomerBenefitSek ?? 0).toBeGreaterThan(ceLow.totalCustomerBenefitSek ?? 0);
    const maxInv = maxInvestmentSek(ce.totalCustomerBenefitSek, 10);
    expect(maxInv).toBeCloseTo((ce.totalCustomerBenefitSek ?? 0) * 10, 6);
  });

  it("9. pure FCR (no solar) is untouched by the solar-flow rule", () => {
    const pure: BatteryEngineInput = {
      site: { country: "SE", mainFuseA: 100, phases: 3, voltageV: 400 },
      consumption: { annualKWh: 60000, profile: "workshop" },
      production: { enabled: false },
      strategies: {
        selfConsumption: false,
        reduceImport: false,
        peakShaving: false,
        fcrDUp: true,
        optimiseFcrReservation: true,
      },
      economy: ECON,
    };
    const a = runBatteryEngine(pure).summary.recommendation;
    const b = runBatteryEngine({ ...pure, consumption: { annualKWh: 300000, profile: "workshop" } })
      .summary.recommendation;
    // Load-independent, exactly as before.
    expect(a.recommendedPowerKw).toBe(b.recommendedPowerKw);
    expect(a.capacityKWh).toBe(b.capacityKWh);
  });
});

describe("annual benefit distribution", () => {
  it("6. positive shares sum to exactly 100 %", () => {
    const ce = customerEconomyFromResult(runBatteryEngine(c032(true)), 0.75);
    const bd = benefitBreakdown(ce);
    const sum = bd.components.reduce((a, c) => a + (c.sharePct ?? 0), 0);
    expect(sum).toBe(100);
  });

  it("7. a negative component keeps its SEK value and never gets a share", () => {
    const bd = benefitBreakdown({
      engineTotalBenefitSek: 41095,
      energyBenefitSek: -225,
      peakBenefitSek: 0,
      ancillaryMarketValueSek: 55093,
      customerAncillaryShare: 0.75,
      ancillaryCustomerValueSek: 41320,
      totalCustomerBenefitSek: 41095,
      ancillaryEnabled: true,
    });
    const energy = bd.components.find((c) => c.key === "energy")!;
    const anc = bd.components.find((c) => c.key === "ancillary")!;
    expect(energy.sek).toBe(-225);
    expect(energy.sharePct).toBeNull();
    expect(anc.sharePct).toBe(100);
    expect(bd.positiveBenefitTotalSek).toBe(41320);
    expect(bd.totalCustomerBenefitSek).toBe(41095);
  });

  it("8. with ancillary services off there is no positive ancillary component", () => {
    const ce = customerEconomyFromResult(runBatteryEngine(c032(false)), 0.75);
    const bd = benefitBreakdown(ce);
    const anc = bd.components.find((c) => c.key === "ancillary")!;
    expect(ce.ancillaryEnabled).toBe(false);
    expect(anc.sek).toBe(0);
    expect(anc.sharePct).toBeNull();
  });
});
