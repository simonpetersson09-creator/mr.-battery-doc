import { runBatteryEngine } from "../src/lib/battery-engine";
const c = (area: "DK1"|"DK2") => runBatteryEngine({
  site: { voltageV: 400, phases: 3, mainFuseA: 25, country: "DK", marketArea: area },
  consumption: { annualKWh: 20000, profile: "normal" },
  production: { enabled: true, annualKWh: 14000, kWp: 14 },
  strategies: { selfConsumption: true, reduceImport: true, peakShaving: true, fcrDUp: true, optimiseFcrReservation: true },
  economy: { importEnergyPriceSekPerKWh: 1.5, exportEnergyValueSekPerKWh: 0.6, peakDemandChargeSekPerKwMonth: 30, peakTariffSource: "default-estimate", eurSekRate: 7.46 },
});
for (const a of ["DK1","DK2"] as const) {
  const r = c(a);
  const s = r.summary;
  console.log(a, JSON.stringify({
    rec: s.recommendation, }, null, 1));
}
