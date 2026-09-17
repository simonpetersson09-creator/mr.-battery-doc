import { createInitialState } from "@/state/wizard";
import { normalizeWizardToEngineInput } from "@/lib/battery-app/normalizeWizardToEngineInput";
import { runBatteryEngine } from "@/lib/battery-engine";
const s = createInitialState("SE");
s.grid.mainFuseA = 16; s.grid.mainFuseManual = true; s.grid.gridValuesConfirmed = true;
s.consumption.mode="annual"; s.consumption.annualKwh=10000; s.consumption.profileId="heat-pump";
s.production.mode="none"; s.strategies.solarSelfConsumption=false; s.strategies.reducedGridImport=false; s.strategies.peakShaving=false; s.strategies.fcrDUp=true;
const input = normalizeWizardToEngineInput(s,{});
for (const [c,p] of [[20,20],[40,10],[10,5]] as number[][]) {
  const t0=performance.now();
  const r = runBatteryEngine({...input, battery:{...(input.battery??{}), fixedCapacityKWh:c, fixedPowerKw:p}});
  console.log(c,p,(performance.now()-t0).toFixed(0)+"ms", "up",r.summary.fcr.monetizedPowerKw.toFixed(2),"down",r.summary.fcr.avgHeldDownPowerKw.toFixed(2),"hours",r.summary.fcr.reservedHours);
}
