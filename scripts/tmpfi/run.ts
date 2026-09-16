import { runBatteryEngine, type BatteryEngineInput } from "@/lib/battery-engine";

const CUSTOMER_SHARE = 0.75;
function make(cap: number, pw: number): BatteryEngineInput {
  return {
    site: { voltageV: 400, phases: 3, mainFuseA: 25, country: "FI", marketArea: null },
    consumption: { annualKWh: 20000, profile: "normal" },
    production: { enabled: true, annualKWh: 14000, kWp: 14 },
    strategies: { selfConsumption: true, reduceImport: true, peakShaving: true, fcrDUp: true, optimiseFcrReservation: true },
    economy: { importEnergyPriceSekPerKWh: 1.5, exportEnergyValueSekPerKWh: 0.6, peakDemandChargeSekPerKwMonth: 30, peakTariffSource: "default-estimate", eurSekRate: 11.3 },
    battery: { fixedCapacityKWh: cap, fixedPowerKw: pw },
  };
}
for (const [cap, pw] of [[5, 3], [10, 10]] as const) {
  const r = runBatteryEngine(make(cap, pw));
  const f = r.summary.fcr, e = r.summary.economy, s = r.diagnostics.simulation;
  console.log(JSON.stringify({
    cap, pw,
    mode: s.ancillary.reserveMode,
    offeredKw: f.offeredPowerKw,
    heldUpKw: f.avgHeldPowerKw,
    heldDownKw: f.avgHeldDownPowerKw,
    grossUp: f.grossUpSek, grossDown: f.grossDownSek, gross: f.grossSek,
    customerFcr: f.grossSek == null ? null : f.grossSek * CUSTOMER_SHARE,
    energyBenefit: e.energyBenefitSek,
    peak: e.demandCostSavingSek,
    totalCustomer: e.annualCustomerBenefitSek,
    cycles: s.cycles?.equivalentFullCycles ?? s.cycles ?? null,
  }));
}
