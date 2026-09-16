import { runBatteryEngine } from "../../src/lib/battery-engine/run";
const CASES: Record<string, any> = {
  GM05: { strategies: { fcrDUp: true, fcrOfferedPowerKw: 1.5 }, battery: { fixedCapacityKWh: 15, fixedPowerKw: 3 } },
  GM06: { strategies: { peakShaving: true, fcrDUp: true, optimiseFcrReservation: true }, battery: { fixedCapacityKWh: 15, fixedPowerKw: 3 } },
};
for (const [k, input] of Object.entries(CASES)) {
  const s = runBatteryEngine(input).summary;
  console.log(k, JSON.stringify({
    importAfterKWh: s.energy.importAfterKWh, exportAfterKWh: s.energy.exportAfterKWh,
    shiftedToLoadKWh: s.energy.shiftedToLoadKWh, recoveredCurtailmentKWh: s.energy.recoveredCurtailmentKWh,
    cycles: s.energy.equivalentFullCycles, utilisationPct: s.energy.utilisationPct,
    peakAfterKw: s.grid.importPeakAfterKw, peakReductionKw: s.peak.peakReductionKw,
    demandCostSavingSek: s.peak.demandCostSavingSek, fcrOfferedKw: s.fcr.offeredPowerKw,
    fcrHeldKw: s.fcr.avgHeldPowerKw, fcrGrossSek: s.fcr.grossSek, fcrOptimisedKw: s.fcr.optimisedPowerKw,
    energyBenefitSek: s.economy.energyBenefitSek, totalOperatingBenefitSek: s.economy.totalOperatingBenefitSek,
    residualKWh: s.energyBalance.residualKWh, unservedKWh: s.grid.unservedLoadKWh,
  }, null, 1));
}
