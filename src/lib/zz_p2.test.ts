import { it } from "vitest";
import { writeFileSync } from "fs";
import { runBatteryEngine } from "@/lib/battery-engine";
const CASES: [number, number][] = [[5, 10], [10, 15], [15, 30], [50, 100], [125, 150]];
it("p2", () => {
  const out: any[] = [];
  for (const [c, area] of [["SE", "SE3"], ["FI", null], ["DK", "DK2"], ["DK", "DK1"]] as const)
    for (const [p, cap] of CASES) {
      const r = runBatteryEngine({ site: { voltageV: 400, phases: 3, mainFuseA: 250, country: c as never, marketArea: area as never }, consumption: { annualKWh: 20000, profile: "normal" }, production: { enabled: false, annualKWh: 0, kWp: 0 }, strategies: { selfConsumption: false, reduceImport: false, peakShaving: false, fcrDUp: true, optimiseFcrReservation: false, fcrOfferedPowerKw: p }, economy: { peakDemandChargeSekPerKwMonth: null, customerAncillaryShare: 0.75 }, battery: { fixedCapacityKWh: cap, fixedPowerKw: p } } as any);
      const s: any = r.diagnostics.simulation; const a: any = s.ancillary;
      out.push({ c: area ?? c, p, cap, mode: a.reserveMode, offUp: a.reservedPowerUpKw, offDown: a.reservedPowerDownKw, heldUp: a.avgReservedPowerUpKw, heldDown: a.physicalHeldDownPowerAvgKw ?? a.avgReservedPowerDownKw, eUp: a.reservedEnergyUpKWh, eDown: a.reservedEnergyDownKWh, s0: s.socStartKWh, s1: s.socEndKWh, conv: s.socCycleConverged, sm: a.storageManagementChargeKWh, smD: a.storageManagementDischargeKWh, sd: s.selfDischargeKWh });
    }
  writeFileSync("/tmp/diag/p2.json", JSON.stringify(out));
}, 600000);
