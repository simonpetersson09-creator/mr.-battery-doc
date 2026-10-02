import { it } from "vitest";
import { runBatteryEngine } from "@/lib/battery-engine";
it("x",()=>{const s=runBatteryEngine({ strategies: { peakShaving: true, fcrDUp: true, optimiseFcrReservation: true }, battery: { fixedCapacityKWh: 15, fixedPowerKw: 3 } } as any).summary;
const r4=(x:number)=>Math.round(x*1e4)/1e4;
console.log("GM", JSON.stringify({physicalPowerNeedKw:s.recommendation.physicalPowerNeedKw,importAfterKWh:r4(s.energy.importAfterKWh),exportAfterKWh:r4(s.energy.exportAfterKWh),shiftedToLoadKWh:r4(s.energy.shiftedToLoadKWh),cycles:r4(s.energy.equivalentFullCycles),utilisationPct:r4(s.energy.utilisationPct),peakAfterKw:r4(s.grid.importPeakAfterKw),peakReductionKw:r4(s.peak.peakReductionKw),demand:s.peak.demandCostSavingSek,off:s.fcr.offeredPowerKw,held:r4(s.fcr.avgHeldPowerKw??0),gross:r4(s.fcr.grossSek??0),opt:s.fcr.optimisedPowerKw,energy:s.economy.energyBenefitSek,total:s.economy.totalOperatingBenefitSek,res:s.energyBalance.residualKWh,status:s.grid.status}));});
