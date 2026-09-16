import { runBatteryEngine } from "../../src/lib/battery-engine/run";

const areas = ["SE", "DK2", "FI"] as const;
const sizes = [[5,3],[10,10],[30,15]] as const;
for (const area of areas) {
  for (const [c,p] of sizes) {
    const r = runBatteryEngine({
      consumption: { annualKWh: 20000 },
      pv: { kwp: 14 },
      grid: { mainFuseA: 25 },
      battery: { fixedCapacityKWh: c, fixedPowerKw: p },
      strategies: { ancillaryServices: true, optimiseFcrReservation: true },
      ancillary: { priceCountry: area },
    } as never);
    const s = r.summary;
    console.log(area, `${c}/${p}`, JSON.stringify({
      res: s.fcr.offeredPowerKw, pct: +(s.fcr.offeredPowerKw/p*100).toFixed(0),
      upKw: +s.fcr.monetizedPowerKw.toFixed(3), downKw: +(s.fcr.avgHeldDownPowerKw ?? 0).toFixed(3),
      up: Math.round(s.fcr.grossUpSek ?? 0), down: Math.round(s.fcr.grossDownSek ?? 0),
      gross: Math.round(s.fcr.grossSek ?? 0),
      cust: Math.round(s.economy.annualCustomerBenefitSek ?? 0),
      energy: Math.round(s.economy.energyBenefitSek ?? 0),
      peak: Math.round(s.economy.demandCostSavingSek ?? 0),
      cycles: +s.energy.equivalentFullCycles.toFixed(1),
    }));
  }
}
