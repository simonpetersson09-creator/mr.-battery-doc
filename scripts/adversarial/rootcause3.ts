/** Finding 4 (25->30 kWh discontinuity) reproduction. Read-only. */
import { runBatteryEngine } from "@/lib/battery-engine";
import { customerEconomyFromResult } from "@/lib/battery-app/customerEconomy";
import { buildInput, type AdvScenario } from "./harness";

const site = process.argv[2] === "big"
  ? { load: 250000, pv: 100000, fuse: 200, profile: "workshop" }
  : { load: 20000, pv: 14000, fuse: 63, profile: "heat-pump" };
const market = (process.argv[3] ?? "SE") as AdvScenario["market"];

const rows: Record<string, unknown>[] = [];
for (const cap of [5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 300, 500]) {
  const s: AdvScenario = {
    id: "L" + cap,
    family: "ladder",
    market,
    loadKWh: site.load,
    pvKWh: site.pv,
    profile: site.profile,
    fuseA: site.fuse,
    strategies: { self: true, reduce: true, peak: true, fcr: true },
    fixedCapacityKWh: cap,
    noReplay: true,
  } as AdvScenario;
  const res = runBatteryEngine(buildInput(s));
  const sm = res.summary;
  const cust = customerEconomyFromResult(res, 0.75);
  rows.push({
    cap,
    kw: sm.recommendation.powerKw,
    prodKw: sm.recommendation.productPowerKw,
    physKw: sm.recommendation.physicalPowerNeedKw,
    fcrOffered: sm.fcr.offeredPowerKw,
    fcrHeld: +sm.fcr.avgHeldPowerKw.toFixed(1),
    fcrOptKw: sm.fcr.optimisedPowerKw,
    energy: Math.round(sm.economy.energyBenefitSek),
    peak: sm.economy.demandCostSavingSek === null ? null : Math.round(sm.economy.demandCostSavingSek),
    fcr: Math.round(sm.economy.fcrGrossSek ?? 0),
    total: Math.round(sm.economy.totalOperatingBenefitSek ?? 0),
    customer: cust.totalCustomerBenefitSek === null ? null : Math.round(cust.totalCustomerBenefitSek),
    cycles: +sm.energy.equivalentFullCycles.toFixed(1),
    useful: Math.round(sm.energy.totalUsefulKWh),
    shifted: Math.round(sm.energy.shiftedSolarKWh),
    gridCharged: Math.round(sm.energy.gridChargedKWh),
    peakAfter: +sm.grid.importPeakAfterKw.toFixed(1),
  });
}
console.table(rows);
