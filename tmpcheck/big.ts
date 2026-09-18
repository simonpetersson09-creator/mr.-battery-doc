import { runBatteryEngine } from "../src/lib/battery-engine";
const PV=[101,302,806,1410,1813,2216,2317,2014,1612,906,403,100];
const LOAD=[2264,1887,1698,1509,1321,1226,1132,1226,1415,1698,2075,2549];
const sc=(a:number[],t:number)=>{const s=a.reduce((x,y)=>x+y,0);return a.map(v=>v/s*t)};
function build(c:number,pv:number,fuse:number):any{return {site:{country:"SE",mainFuseA:fuse},consumption:{monthlyKWh:sc(LOAD,c),annualKWh:c,profile:"normal"},production:{enabled:true,monthlyKWh:sc(PV,pv),annualKWh:pv,kWp:pv/950,inverterAcKw:pv/1150},strategies:{selfConsumption:true,reduceImport:true,peakShaving:true,fcrDUp:true,optimiseFcrReservation:true},economy:{importEnergyPriceSekPerKWh:1.5,exportEnergyValueSekPerKWh:0.6,peakDemandChargeSekPerKwMonth:30,peakTariffSource:"user-provided",eurSekRate:11.3,customerAncillaryShare:0.75}}}
for (const [c,pv,f] of [[1500000,1000000,630],[3000000,2000000,630],[5000000,100000,630],[400000,300000,630]] as number[][]) {
  const r=runBatteryEngine(build(c,pv,f)).summary.recommendation;
  console.log(c,pv,f,"->",r.capacityKWh,"kWh /",r.powerKw,"kW upper:",r.upperLimitReached,r.powerUpperLimitReached,"physNeed",r.physicalPowerNeedKw);
}
