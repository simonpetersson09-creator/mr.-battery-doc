import { describe, expect, it } from "vitest";
import { runBatteryEngine } from "@/lib/battery-engine";
import { normalizeWizardToEngineInput } from "@/lib/battery-app/normalizeWizardToEngineInput";
import { createInitialState } from "@/state/wizard";

/** Hard 1.0 C limit on the final automatic recommendation: capacity >= power. */
function run(cc: "CH" | "SI" | "DE", fuse: number, pv: number, annual: number, fcr: boolean) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s: any = structuredClone(createInitialState(cc));
  s.grid.gridValuesConfirmed = true;
  s.grid.mainFuseA = fuse;
  s.consumption.annualKwh = annual;
  s.consumption.profileId = "normal";
  s.production.mode = "manual";
  s.production.annualKwh = pv;
  s.strategies.fcrDUp = fcr;
  s.preferences.customerAncillaryShare = 0.75;
  return runBatteryEngine(normalizeWizardToEngineInput(s));
}

describe("1.0 C limit", () => {
  for (const [cc, fuse, pv, annual, kw, kwh] of [
    ["CH", 63, 10000, 20000, 40, 40], // was 40 / 25
    ["SI", 63, 10000, 20000, 40, 40], // was 40 / 25
    ["CH", 250, 10000, 20000, 150, 150], // was 150 / 100
    ["CH", 160, 10000, 20000, 100, 100], // 100 kW -> at least 100 kWh
    ["CH", 315, 10000, 20000, 200, 200], // 200 kW -> at least 200 kWh
    ["CH", 100, 10000, 20000, 60, 75], // no 60 kWh step -> next real step 75
    ["CH", 200, 10000, 20000, 125, 150], // no 125 kWh step -> next real step 150
  ] as const) {
    it(`${cc} ${fuse} A: ${kw} kW -> ${kwh} kWh`, () => {
      const r = run(cc, fuse, pv, annual, true);
      const rec = r.summary.recommendation;
      expect(rec.powerKw).toBe(kw);
      expect(rec.capacityKWh).toBe(kwh);
      expect(rec.powerKw / rec.capacityKWh).toBeLessThanOrEqual(1 + 1e-9);
      expect(r.summary.ancillaryPowerPotential?.capacityKWh).toBe(kwh);
      expect(Math.abs(r.summary.energyBalance.residualKWh)).toBeLessThan(1e-6);
    }, 600_000);
  }
  it("cases already at or below 1.0 C are unchanged", () => {
    const de = run("DE", 63, 10000, 20000, true).summary.recommendation;
    expect([de.powerKw, de.capacityKWh]).toEqual([40, 40]);
    const off = run("CH", 25, 10000, 20000, false).summary.recommendation;
    expect([off.powerKw, off.capacityKWh]).toEqual([3, 20]);
  }, 600_000);
});
