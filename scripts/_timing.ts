import { runBatteryEngine } from "@/lib/battery-engine";
const t0 = Date.now();
const r = runBatteryEngine({
  site: { country: "SE", mainFuseA: 25 },
  consumption: { annualKWh: 20000, profile: "normal" },
  production: { enabled: true, annualKWh: 14000 },
  strategies: { selfConsumption: true, reduceImport: true, peakShaving: true, fcrDUp: true },
});
console.log("ms", Date.now() - t0);
console.log(r.summary.recommendation.capacityKWh, r.summary.recommendation.recommendedPowerKw, r.summary.economy.totalOperatingBenefitSek);
console.log("sweepRuns", r.diagnostics.sweep.results.length, "powerOptions", r.summary.powerOptions.length);
