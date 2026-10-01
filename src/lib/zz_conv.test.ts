import { it } from "vitest";
import { writeFileSync } from "fs";
import { runBatteryEngine } from "@/lib/battery-engine";
it("c", () => {
  const out: any[] = [];
  for (const [c, p, cap] of [["CH", 10, 15], ["SI", 10, 15], ["CH", 50, 100], ["AT", 10, 15]] as const) {
    const r = runBatteryEngine({ site: { voltageV: 400, phases: 3, mainFuseA: 250, country: c as never, marketArea: null }, consumption: { annualKWh: 20000, profile: "normal" }, production: { enabled: true, annualKWh: 10000, kWp: 10 }, strategies: { selfConsumption: true, reduceImport: true, peakShaving: true, fcrDUp: true, optimiseFcrReservation: true }, economy: { peakDemandChargeSekPerKwMonth: null, customerAncillaryShare: 0.75 }, battery: { fixedCapacityKWh: cap, fixedPowerKw: p } } as any);
    const s: any = r.diagnostics.simulation; const a: any = s.ancillary;
    out.push([c, p, cap, s.socCycleConverged, s.socStartKWh, s.socEndKWh, s.socCycleIterations, a.reservedPowerUpKw, a.avgReservedPowerUpKw, a.storageManagementChargeKWh, a.storageManagementDischargeKWh, s.chargedKWh, s.dischargedKWh, a.storageManagementTargetSocKWh]);
  }
  writeFileSync("/tmp/diag/conv.json", JSON.stringify(out));
}, 600000);
