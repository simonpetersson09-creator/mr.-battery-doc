/**
 * Symmetric FCR (shared engine): plan clipped to rating / (1 + NEM share) and active
 * storage management keeps a pure-reserve year cyclic.
 */
import { describe, expect, it } from "vitest";
import { runBatteryEngine } from "@/lib/battery-engine";

const CASES: [number, number][] = [[5, 10], [10, 15], [15, 30], [50, 100], [125, 150]];
const ENDURANCE: Record<string, number> = { DE: 0.25 + 0.125 + 1 / 24, AT: 0.5, CH: 0.25, BE: 25 / 60, FR: 0.5, CZ: 0.5, SI: 0.25 };

function run(country: string, p: number, c: number) {
  return runBatteryEngine({
    site: { voltageV: 400, phases: 3, mainFuseA: 250, country: country as never, marketArea: null },
    consumption: { annualKWh: 20000, profile: "normal" },
    production: { enabled: true, annualKWh: 10000, kWp: 10 },
    strategies: { selfConsumption: true, reduceImport: true, peakShaving: true, fcrDUp: true, optimiseFcrReservation: true },
    economy: { peakDemandChargeSekPerKwMonth: null, customerAncillaryShare: 0.75 },
    battery: { fixedCapacityKWh: c, fixedPowerKw: p },
  });
}

describe("symmetric FCR storage management", () => {
  for (const country of Object.keys(ENDURANCE)) {
    for (const [p, c] of CASES) {
      it(`${country} ${p} kW / ${c} kWh`, () => {
        const r = run(country, p, c);
        const s = r.diagnostics.simulation;
        const a = s.ancillary;
        expect(a.reservedPowerUpKw).toBeLessThanOrEqual(p / 1.25 + 1e-9);
        expect(a.reservedEnergyUpKWh).toBeCloseTo(a.reservedPowerUpKw * ENDURANCE[country]!, 6);
        expect(a.avgReservedPowerUpKw).toBeLessThanOrEqual(a.reservedPowerUpKw + 1e-9);
        expect(s.socCycleConverged).toBe(true);
        expect(Math.abs(s.socEndKWh - s.socStartKWh)).toBeLessThanOrEqual(Math.max(1e-9, c * 1e-4));
        expect(a.storageManagementChargeKWh).toBeGreaterThan(0);
        expect(s.energyBalance.ok).toBe(true);
        expect(r.summary.fcr.grossSek ?? 0).toBeGreaterThan(0);
      });
    }
  }
});
