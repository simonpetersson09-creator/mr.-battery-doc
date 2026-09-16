import { runBatteryEngine, type BatteryEngineInput } from "@/lib/battery-engine";

function make(cap: number, pw: number, mode: "up" | "updown"): BatteryEngineInput {
  return {
    site: { voltageV: 400, phases: 3, mainFuseA: 25, country: "FI", marketArea: null },
    consumption: { annualKWh: 20000, profile: "normal" },
    production: { enabled: true, annualKWh: 14000, kWp: 14 },
    strategies: {
      selfConsumption: true, reduceImport: true, peakShaving: true,
      fcrDUp: true, optimiseFcrReservation: true,
    },
    economy: {
      importEnergyPriceSekPerKWh: 1.5, exportEnergyValueSekPerKWh: 0.6,
      peakDemandChargeSekPerKwMonth: 30, peakTariffSource: "default-estimate", eurSekRate: 11.3,
    },
    battery: { fixedCapacityKWh: cap, fixedPowerKw: pw },
    ...(mode === "up" ? { _forceUpOnly: true } : {}),
  } as BatteryEngineInput;
}

for (const [cap, pw] of [[5, 3], [10, 10]] as const) {
  for (const mode of ["up", "updown"] as const) {
    const r = runBatteryEngine(make(cap, pw, mode));
    const a = r.diagnostics.simulation.ancillary;
    const f = r.summary.fcr;
    const s = r.diagnostics.simulation;
    console.log(JSON.stringify({
      cap, pw, mode, reserveMode: a.reserveMode,
      offeredKw: a.reservedPowerUpKw,
      heldUp: a.heldPowerAvgKw, heldDown: a.downHeldPowerAvgKw,
      grossUp: f.grossUpSek, grossDown: f.grossDownSek, gross: f.grossSek,
      customerFcr: f.customerSek ?? null,
      cycles: s.cycles?.equivalentFullCycles ?? null,
    }));
  }
}
