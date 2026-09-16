import { runBatteryEngine } from "../../src/lib/battery-engine/run";

const cases = [
  ["SE", { country: "SE" as const }],
  ["DK2", { country: "DK" as const, marketArea: "DK2" as const }],
  ["FI", { country: "FI" as const }],
] as const;
const sizes = [[5,3],[10,10],[30,15]] as const;
for (const [label, site] of cases) {
  for (const [c,p] of sizes) {
    const r = runBatteryEngine({
      site: { ...site, mainFuseA: 25 },
      consumption: { annualKWh: 20000 },
      production: { enabled: true, kWp: 14 },
      battery: { fixedCapacityKWh: c, fixedPowerKw: p },
      strategies: { fcrDUp: true, optimiseFcrReservation: true },
    });
    const s = r.summary;
    console.log(label, `${c}/${p}`, JSON.stringify({
      res: +s.fcr.offeredPowerKw.toFixed(2), pct: +(s.fcr.offeredPowerKw/p*100).toFixed(0),
      upKw: +(s.fcr.avgHeldPowerKw ?? 0).toFixed(3), downKw: +(s.fcr.avgHeldDownPowerKw ?? 0).toFixed(3),
      up: Math.round(s.fcr.grossUpSek ?? 0), down: Math.round(s.fcr.grossDownSek ?? 0),
      gross: Math.round(s.fcr.grossSek ?? 0),
      cust: Math.round(s.economy.annualCustomerBenefitSek ?? 0),
      energy: Math.round(s.economy.energyBenefitSek ?? 0),
      peak: Math.round(s.economy.demandCostSavingSek ?? 0),
      cycles: +s.energy.equivalentFullCycles.toFixed(1),
    }));
  }
}
