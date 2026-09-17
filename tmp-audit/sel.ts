import { createInitialState } from "@/state/wizard";
import { normalizeWizardToEngineInput } from "@/lib/battery-app/normalizeWizardToEngineInput";
import { runBatteryEngine } from "@/lib/battery-engine";
import { computeAncillaryScenario } from "@/lib/battery-app/ancillaryScenario";

function go(fuse: number, country: any = "SE", area?: any) {
  const s = createInitialState(country);
  if (area) s.grid.marketArea = area;
  s.grid.mainFuseA = fuse; s.grid.mainFuseManual = true; s.grid.gridValuesConfirmed = true;
  s.consumption.mode="annual"; s.consumption.annualKwh=10000; s.consumption.profileId="heat-pump";
  s.production.mode="none"; s.strategies.solarSelfConsumption=false; s.strategies.reducedGridImport=false; s.strategies.peakShaving=false; s.strategies.fcrDUp=true;
  const input = normalizeWizardToEngineInput(s,{});
  const t0 = performance.now();
  const res = runBatteryEngine(input);
  const sc = computeAncillaryScenario(input, res);
  const ms = (performance.now()-t0)/1000;
  if (!sc || !sc.selected) { console.log(`${country}${area??""} ${fuse}A -> no scenario`); return; }
  const c = sc.selected, t = sc.technical!;
  console.log(`${country}${area??""} ${fuse}A -> ${c.capacityKWh} kWh / ${c.powerKw} kW | up ${(t.upCoverage*100).toFixed(1)}% down ${(t.downCoverage*100).toFixed(1)}% | paidUp ${c.paidUpKw.toFixed(2)} paidDown ${c.paidDownKw.toFixed(2)} | maxUp ${(t.maxUpCapacityKwh/8760).toFixed(2)} maxDown ${(t.maxDownCapacityKwh/8760).toFixed(2)} kW | customer ${Math.round(c.customerBenefitSek??0)} kr | cards ${sc.candidates.map(x=>x.capacityKWh+"/"+x.powerKw).join(",")} | ${ms.toFixed(1)}s`);
}
for (const f of [16,20,25,35]) go(f);
for (const [c,a] of [["FI",undefined],["DK","DK2"],["DK","DK1"],["DE",undefined]] as any[]) go(16,c,a);
