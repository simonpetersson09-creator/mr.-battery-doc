/**
 * READ-ONLY before/after report for the MODEL CONSISTENCY FIX.
 *
 *  before = non-cyclic year (fixed 50 % initial SOC), the pre-fix behaviour
 *  after  = cyclic year (initial SOC solved as a fixed point)
 *
 * Both sides use the SAME capacity/power (the one the current engine recommends), so the
 * only difference is the year condition. Peak benefit is read from the single source of
 * truth in both cases.
 */
import { runBatteryEngine } from "../../src/lib/battery-engine/run";
import type { BatteryEngineInput } from "../../src/lib/battery-engine/types";
import { toEconomyConfig, toLabConfig, toTimeSeries } from "../../src/lib/battery-engine/input";
import { simulate } from "../../src/lib/lab/simulate";
import {
  annualCustomerBenefitSek,
  energyEconomy,
  peakEconomy,
} from "../../src/lib/lab/operatingEconomy";

const CASES: Record<string, BatteryEngineInput> = {
  "villa 30 kWh": { battery: { fixedCapacityKWh: 30, fixedPowerKw: 15 } },
  "kommersiellt 200 kWh": {
    consumption: { annualKWh: 400000, profile: "office" },
    production: { annualKWh: 300000, kWp: 300, inverterAcKw: 250 },
    site: { mainFuseA: 630 },
    battery: { fixedCapacityKWh: 200, fixedPowerKw: 100 },
  },
  "utan sol": { production: { enabled: false } },
  "mycket sol": { consumption: { annualKWh: 8000 }, production: { annualKWh: 30000, kWp: 30, inverterAcKw: 25 } },
  "FCR": { strategies: { fcrDUp: true, optimiseFcrReservation: true } },
  "peak shaving": { strategies: { peakShaving: true } },
  "peak shaving demandFee=0": {
    strategies: { peakShaving: true },
    economy: { peakDemandChargeSekPerKwMonth: 0 },
  },
};

const f = (v: number | null) => (v === null ? "n/a" : v.toFixed(2));

for (const [name, input] of Object.entries(CASES)) {
  const engine = runBatteryEngine(input);
  const cap = engine.summary.recommendation.capacityKWh;
  const kw = engine.summary.recommendation.powerKw;
  const cfg = toLabConfig(input);
  const econ = toEconomyConfig(input);
  const series = toTimeSeries(cfg, input);

  console.log(`\n=== ${name} — ${cap} kWh / ${kw} kW (fysiskt behov ${engine.summary.recommendation.physicalPowerNeedKw} kW) ===`);
  for (const cyclicSoc of [false, true]) {
    const r = simulate(cfg, series, cap, kw, { cyclicSoc });
    const e = energyEconomy(r, econ);
    const p = peakEconomy(r, econ);
    const anc = r.ancillary.fcr?.annualGrossSek ?? null;
    const total = annualCustomerBenefitSek(e.energyBenefitSek, p.annualPeakBenefitSek, anc, econ);
    console.log(
      `${cyclicSoc ? "efter " : "före  "} socStart=${r.socStartKWh.toFixed(3)} socEnd=${r.socEndKWh.toFixed(3)} dSOC=${r.socDeltaKWh.toFixed(4)}` +
        ` charge=${r.chargedKWh.toFixed(1)} discharge=${r.dischargedKWh.toFixed(1)} losses=${r.lossesKWh.toFixed(1)}` +
        ` energy=${f(e.energyBenefitSek)} peak=${f(p.annualPeakBenefitSek)} anc=${f(anc)} kundnytta=${f(total)}` +
        ` resid=${r.energyBalance.residualKWh.toExponential(2)} iter=${r.socCycleIterations} conv=${r.socCycleConverged}` +
        ` gridCharge=${r.chargedFromGridKWh.toFixed(1)}`,
    );
  }
}

console.log("\n=== INITIAL SOC SENSITIVITY (villa 30 kWh / 15 kW, efter fix) ===");
for (const pct of [5, 25, 50, 75, 95]) {
  const input: BatteryEngineInput = { battery: { fixedCapacityKWh: 30, fixedPowerKw: 15, initialSocPct: pct } };
  const cfg = toLabConfig(input);
  const econ = toEconomyConfig(input);
  const series = toTimeSeries(cfg, input);
  const r = simulate(cfg, series, 30, 15);
  const e = energyEconomy(r, econ);
  const p = peakEconomy(r, econ);
  console.log(
    `  initialSoc=${pct}% socStart=${r.socStartKWh.toFixed(3)} socEnd=${r.socEndKWh.toFixed(3)} dSOC=${r.socDeltaKWh.toExponential(2)}` +
      ` kundnytta=${f(annualCustomerBenefitSek(e.energyBenefitSek, p.annualPeakBenefitSek, null, econ))}`,
  );
}
