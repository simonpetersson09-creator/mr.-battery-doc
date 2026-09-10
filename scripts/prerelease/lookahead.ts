/**
 * PRE-RELEASE — SECTION D: PEAK-SHAVING LOOK-AHEAD SENSITIVITY, READ ONLY.
 *
 * Runs a fixed scenario set and prints the figures the audit compares. The look-ahead
 * horizon itself is patched TEMPORARILY by the runner script (peakLookahead.sh), which
 * restores src/lib/lab/dispatch.ts afterwards. This file never writes to src/.
 */
import { runBatteryEngine } from "../../src/lib/battery-engine/run";
import type { BatteryEngineInput } from "../../src/lib/battery-engine/types";

const PV = [101, 302, 806, 1410, 1813, 2216, 2317, 2014, 1612, 906, 403, 100];
const LOAD = [2264, 1887, 1698, 1509, 1321, 1226, 1132, 1226, 1415, 1698, 2075, 2549];
const scale = (a: number[], t: number) => {
  const s = a.reduce((x, y) => x + y, 0);
  return a.map((v) => (v / s) * t);
};

const CASES: { tag: string; kWh: number; pv: number; fuse: number; fee: number }[] = [
  { tag: "villa 20 MWh, fee 30", kWh: 20000, pv: 14000, fuse: 25, fee: 30 },
  { tag: "villa 20 MWh, fee 120", kWh: 20000, pv: 14000, fuse: 25, fee: 120 },
  { tag: "villa 45 MWh utan sol", kWh: 45000, pv: 0, fuse: 63, fee: 60 },
  { tag: "företag 120 MWh", kWh: 120000, pv: 40000, fuse: 100, fee: 60 },
  { tag: "kommersiell 500 MWh", kWh: 500000, pv: 0, fuse: 200, fee: 60 },
];

const build = (c: (typeof CASES)[number]): BatteryEngineInput => ({
  site: { country: "SE", mainFuseA: c.fuse, phases: 3, voltageV: 400 },
  consumption: { monthlyKWh: scale(LOAD, c.kWh), annualKWh: c.kWh, profile: "normal" },
  production:
    c.pv > 0
      ? { enabled: true, monthlyKWh: scale(PV, c.pv), annualKWh: c.pv, kWp: c.pv / 950, inverterAcKw: c.pv / 1150 }
      : { enabled: false },
  strategies: { selfConsumption: true, reduceImport: true, peakShaving: true, fcrDUp: false },
  economy: {
    importEnergyPriceSekPerKWh: 1.5,
    exportEnergyValueSekPerKWh: 0.6,
    peakDemandChargeSekPerKwMonth: c.fee,
    peakTariffSource: "user-provided",
    eurSekRate: 11.3,
  },
});

const horizon = process.argv[2] ?? "?";
console.log(`### LOOKAHEAD ${horizon} h`);
for (const c of CASES) {
  const r = runBatteryEngine(build(c));
  const s = r.summary;
  console.log(
    [
      horizon,
      c.tag,
      s.recommendation.capacityKWh,
      s.recommendation.powerKw,
      s.peak.peakReductionKw.toFixed(3),
      Math.round(s.energy.gridChargedKWh),
      Math.round(s.energy.totalUsefulKWh),
      Math.round(s.economy.annualCustomerBenefitSek ?? 0),
      s.peak.demandCostSavingSek === null ? "n/a" : Math.round(s.peak.demandCostSavingSek),
    ].join("\t"),
  );
}
