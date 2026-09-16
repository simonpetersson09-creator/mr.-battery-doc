import { runBatteryEngine, type BatteryEngineInput } from "@/lib/battery-engine";
const SHARE = 0.75;
for (const [cap, pw] of [[5,3],[10,10],[30,15]] as const) {
  const r = runBatteryEngine({
    site: { voltageV: 400, phases: 3, mainFuseA: 25, country: "DK", marketArea: "DK2" },
    consumption: { annualKWh: 20000, profile: "normal" },
    production: { enabled: true, annualKWh: 14000, kWp: 14 },
    strategies: { selfConsumption: true, reduceImport: true, peakShaving: true, fcrDUp: true, optimiseFcrReservation: true },
    economy: { importEnergyPriceSekPerKWh: 1.5, exportEnergyValueSekPerKWh: 0.6, peakDemandChargeSekPerKwMonth: 30, peakTariffSource: "default-estimate", eurSekRate: 11.3 },
    battery: { fixedCapacityKWh: cap, fixedPowerKw: pw },
  });
  const f = r.summary.fcr, e = r.summary.economy, s: any = r.diagnostics.simulation;
  console.log(JSON.stringify({ cap, pw, mode: s.ancillary.reserveMode, offered: f.offeredPowerKw,
    heldUp: f.avgHeldPowerKw, heldDown: f.avgHeldDownPowerKw,
    grossUp: f.grossUpSek, grossDown: f.grossDownSek, gross: f.grossSek,
    customerFcr: f.grossSek == null ? null : f.grossSek * SHARE,
    energy: e.energyBenefitSek, peak: e.demandCostSavingSek, total: e.annualCustomerBenefitSek,
    cycles: s.equivalentFullCycles ?? null }));
}
