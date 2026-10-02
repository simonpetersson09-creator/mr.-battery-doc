import { describe, expect, it } from "vitest";
import { runBatteryEngine } from "@/lib/battery-engine";
import { normalizeWizardToEngineInput } from "@/lib/battery-app/normalizeWizardToEngineInput";
import { createInitialState } from "@/state/wizard";

/** Reserve capacity must be sized for the FINAL (ancillary-raised) power. */
function run(cc: "CH" | "SE", fcr: boolean) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s: any = structuredClone(createInitialState(cc));
  s.grid.gridValuesConfirmed = true;
  s.grid.mainFuseA = 250;
  s.consumption.annualKwh = 20000;
  s.consumption.profileId = "normal";
  s.production.mode = "manual";
  s.production.annualKwh = 10000;
  s.strategies.fcrDUp = fcr;
  s.preferences.customerAncillaryShare = 0.75;
  return runBatteryEngine(normalizeWizardToEngineInput(s));
}

describe("final power drives reserve capacity", () => {
  for (const [cc, kwh, baseKwh] of [
    ["CH", 100, 20],
    ["SE", 200, 25],
  ] as const) {
    it(`${cc}: 150 kW / ${kwh} kWh with reserve, ${baseKwh} kWh / 3 kW without`, () => {
      const r = run(cc, true);
      const rec = r.summary.recommendation;
      expect(rec.powerKw).toBe(150);
      expect(rec.capacityKWh).toBe(kwh);
      expect(r.diagnostics.fcrEnduranceCapacity?.baseCapacityKWh).toBe(baseKwh);
      // No stale capacity anywhere downstream.
      expect(r.summary.ancillaryPowerPotential?.capacityKWh).toBe(kwh);
      expect(Math.abs(r.summary.energyBalance.residualKWh)).toBeLessThan(1e-6);
      expect(r.summary.fcr.avgHeldPowerKw).toBeLessThanOrEqual(r.summary.fcr.offeredPowerKw + 1e-9);

      const off = run(cc, false);
      expect(off.summary.recommendation.powerKw).toBe(3);
      expect(off.summary.recommendation.capacityKWh).toBe(baseKwh);
    }, 600_000);
  }
});
