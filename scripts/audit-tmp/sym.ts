import { runBatteryEngine } from "../../src/lib/battery-engine/run";
for (const [label, site] of [["DE",{country:"DE" as const}],["DK1",{country:"DK" as const,marketArea:"DK1" as const}]] as const) {
  for (const [c,p] of [[5,3],[10,10],[30,15]] as const) {
    const s = runBatteryEngine({ site:{...site, mainFuseA:25}, consumption:{annualKWh:20000}, production:{enabled:true,kWp:14}, battery:{fixedCapacityKWh:c,fixedPowerKw:p}, strategies:{fcrDUp:true,optimiseFcrReservation:true} }).summary;
    console.log(label, `${c}/${p}`, "res", s.fcr.offeredPowerKw, "held", +(s.fcr.avgHeldPowerKw??0).toFixed(3), "gross", Math.round(s.fcr.grossSek??0), "cust", Math.round(s.economy.annualCustomerBenefitSek??0));
  }
}
