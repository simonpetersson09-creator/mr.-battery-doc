import { runBatteryEngine } from "./lib/battery-engine";
const base = (country:any, area:any=null)=>({
  site:{voltageV:400,phases:3,mainFuseA:25,country,marketArea:area},
  consumption:{annualKWh:20000,profile:"normal"},
  production:{enabled:true,annualKWh:14000,kWp:14},
  strategies:{selfConsumption:true,reduceImport:true,peakShaving:true,fcrDUp:true,optimiseFcrReservation:true},
  economy:{importEnergyPriceSekPerKWh:1.5,exportEnergyValueSekPerKWh:0.6,peakDemandChargeSekPerKwMonth:30,peakTariffSource:"default-estimate",eurSekRate:11.3},
  battery:{fixedCapacityKWh:30,fixedPowerKw:15},
} as any);
for (const [c,a] of [["SE",null],["FI",null],["DK","DK2"],["DK","DK1"],["DE",null]] as any) {
  const r:any = runBatteryEngine(base(c,a));
  const s = r.diagnostics.simulation.ancillary;
  console.log(c,a,{mode:s.reserveMode,held:+s.heldPowerAvgKw.toFixed(3),avail:+s.availabilityPct.toFixed(1),
   up:+s.reservableUpAvgKw.toFixed(2),down:+s.reservableDownAvgKw.toFixed(2),dir:s.limitingDirection,
   phys:s.physicalModel,price:s.priceModel,gross:r.summary.fcr.grossSek});
}
