/** ROOT-CAUSE AUDIT part 2 (read-only). Full-engine reproduction of findings 3-5. */
import { runBatteryEngine, toLabConfig, toTimeSeries } from "@/lib/battery-engine";
import { runSweep } from "@/lib/lab/sweep";
import { ancillaryCapacityFloor, peakCapacityNeed } from "@/lib/lab/sweep";
import { customerEconomyFromResult } from "@/lib/battery-app/customerEconomy";
import { baseInput } from "./rootcause";

function show(label: string, o: Parameters<typeof baseInput>[0]) {
  const input = baseInput(o);
  const cfg = toLabConfig(input);
  const series = toTimeSeries(cfg, input);
  const sweep = runSweep(cfg, series);
  const res = runBatteryEngine(input);
  const s = res.summary;
  const cust = customerEconomyFromResult(res, 0.75);
  console.log("=== " + label);
  console.log(
    JSON.stringify(
      {
        cap: s.recommendation.capacityKWh,
        powerKw: s.recommendation.powerKw,
        physKw: s.recommendation.physicalPowerNeedKw,
        productKw: s.recommendation.productPowerKw,
        energySweetSpot: sweep.sweetSpot.peakFloor?.energySweetSpotKWh,
        peakFloorApplied: sweep.sweetSpot.peakFloor?.appliedKWh,
        peakNeedKWh: sweep.sweetSpot.peakFloor?.need.needKWh,
        peakStop: sweep.sweetSpot.peakFloor?.stopReason,
        ancFloor: ancillaryCapacityFloor(cfg, cfg.sweep.capacitiesKWh),
        energyBenefit: Math.round(s.economy.energyBenefitSek),
        peakBenefit: s.economy.demandCostSavingSek === null ? null : Math.round(s.economy.demandCostSavingSek),
        fcrMarket: Math.round(s.economy.fcrGrossSek ?? 0),
        fcrCustomer: Math.round(cust.ancillaryCustomerValueSek),
        total: Math.round(s.economy.totalOperatingBenefitSek ?? 0),
        customer: cust.totalCustomerBenefitSek === null ? null : Math.round(cust.totalCustomerBenefitSek),
        cycles: +s.energy.equivalentFullCycles.toFixed(1),
        useful: Math.round(s.energy.totalUsefulKWh),
        offered: s.fcr.offeredPowerKw,
        held: +s.fcr.avgHeldPowerKw.toFixed(2),
        gridCharged: Math.round(s.energy.gridChargedKWh),
        importBefore: Math.round(s.energy.importBeforeKWh),
        importAfter: Math.round(s.energy.importAfterKWh),
        peakBeforeKw: +s.grid.importPeakBeforeKw.toFixed(1),
        peakAfterKw: +s.grid.importPeakAfterKw.toFixed(1),
      },
      null,
      1,
    ),
  );
  console.log("ladderSteps", JSON.stringify(sweep.sweetSpot.steps.map((x) => [x.toKWh, Math.round(x.deltaPerExtraKWh), x.decision])));
}

const which = process.argv[2] ?? "C";
if (which === "C") {
  show("C 200A", { load: 250000, pv: 0, fuse: 200, fcr: true, peak: true });
  show("C 400A", { load: 250000, pv: 0, fuse: 400, fcr: true, peak: true });
  show("C 200A no FCR", { load: 250000, pv: 0, fuse: 200, fcr: false, peak: true });
  show("C 400A no FCR", { load: 250000, pv: 0, fuse: 400, fcr: false, peak: true });
}
if (which === "D") {
  show("D peak on, demandCharge 0", { load: 40000, pv: 0, fuse: 25, fcr: false, peak: true, demandCharge: 0 });
  show("D peak off, demandCharge 0", { load: 40000, pv: 0, fuse: 25, fcr: false, peak: false, demandCharge: 0 });
}
