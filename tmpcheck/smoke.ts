import { runBatteryEngine } from "../src/lib/battery-engine";
const LOAD=[2264,1887,1698,1509,1321,1226,1132,1226,1415,1698,2075,2549];
const PV=[101,302,806,1410,1813,2216,2317,2014,1612,906,403,100];
const ECON={importEnergyPriceSekPerKWh:1.5,exportEnergyValueSekPerKWh:0.6,peakDemandChargeSekPerKwMonth:30,peakTariffSource:"user-provided" as const,eurSekRate:11.3};
function inp(fuse:number,fcr:boolean,annual=20000,pv=14000){return {site:{country:"SE",mainFuseA:fuse,phases:3,voltageV:400},consumption:{monthlyKWh:LOAD.map(m=>m*annual/20000),annualKWh:annual,profile:"normal"},production:{enabled:true,monthlyKWh:PV.map(m=>m*pv/14000),annualKWh:pv,kWp:14,inverterAcKw:12},strategies:{selfConsumption:true,reduceImport:true,peakShaving:true,fcrDUp:fcr,optimiseFcrReservation:fcr},economy:ECON} as any;}
for (const fuse of [16,25,63,200]) for (const fcr of [false,true]) {
  const t=Date.now();
  const r=runBatteryEngine(inp(fuse,fcr));
  const rec=r.summary.recommendation;
  const d=r.diagnostics.fcrEnduranceCapacity;
  console.log(`${fuse}A fcr=${fcr} -> ${rec.capacityKWh} kWh / ${rec.powerKw} kW  C=${(rec.powerKw/rec.capacityKWh).toFixed(2)} energyNeed=${r.diagnostics.economicPowerSizing.energyPowerNeedKw} guardStep=${r.diagnostics.economicPowerSizing.fuseGuardrailStepKw} capStep=${d?.reason}:${d?.baseCapacityKWh}->${d?.capacityKWh} ebal=${r.summary.energyBalance.ok} ${Date.now()-t}ms`);
}
