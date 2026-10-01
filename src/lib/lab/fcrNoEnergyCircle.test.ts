/**
 * Storage management and the ordinary dispatch share one SOC floor: no grid -> battery ->
 * load circle in mixed FCR + self-consumption operation (reference: CH 5 kW / 10 kWh).
 */
import { describe, expect, it } from "vitest";
import { toLabConfig } from "@/lib/battery-engine/input";
import { buildSeries, simulate } from "./simulate";

describe("no artificial storage-management energy circle", () => {
  it("CH 5/10, 3.5 kW FCR: storage management only replaces losses, year is cyclic", () => {
    const cfg0 = toLabConfig({
      site: { voltageV: 400, phases: 3, mainFuseA: 250, country: "CH", marketArea: null },
      consumption: { annualKWh: 20000, profile: "normal" },
      production: { enabled: true, annualKWh: 10000, kWp: 10 },
      strategies: { selfConsumption: true, reduceImport: true, peakShaving: true, fcrDUp: true },
      economy: { peakDemandChargeSekPerKwMonth: null, eurSekRate: 0.94 },
      battery: { fixedCapacityKWh: 10, fixedPowerKw: 5 },
    } as never);
    const cfg = { ...cfg0, ancillary: { ...cfg0.ancillary, enabled: true, offeredPowerKw: 3.5 } };
    const s = simulate(cfg, buildSeries(cfg), 10, 5);
    const a = s.ancillary;
    // Before the fix: ~2 178 kWh/year grid charging by storage management.
    expect(a.storageManagementGridChargeKWh).toBeLessThan(5);
    expect(a.storageManagementChargeKWh).toBeLessThan(5);
    expect(s.socCycleConverged).toBe(true);
    expect(s.energyBalance.ok).toBe(true);
    expect(a.avgReservedPowerUpKw).toBeCloseTo(a.reservedPowerUpKw, 3);
  });
});
