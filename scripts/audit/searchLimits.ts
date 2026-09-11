/**
 * READ-ONLY HARNESS — upper search-limit classification for capacity and power.
 *
 * Runs the required customer cases plus a temporarily WIDENED search area (capacity
 * 500/750/1000 kWh, power 200/300/400 kW) purely to verify that the new flags classify
 * the results correctly. Production limits are untouched: the widening happens only in
 * this script through `input.advanced`.
 */
import { defaultConfig } from "../../src/lib/lab/defaults";
import { runBatteryEngine } from "../../src/lib/battery-engine/run";
import type { BatteryEngineInput } from "../../src/lib/battery-engine/types";

const PV_SHAPE = [101, 302, 806, 1410, 1813, 2216, 2317, 2014, 1612, 906, 403, 100];
const LOAD_SHAPE = [2264, 1887, 1698, 1509, 1321, 1226, 1132, 1226, 1415, 1698, 2075, 2549];
const scale = (a: number[], target: number) => {
  const s = a.reduce((x, y) => x + y, 0);
  return a.map((v) => (v / s) * target);
};

const FINE_BASE = [
  0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7.5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125,
  150, 175, 200,
];
const PRODUCT_BASE = [2, 3, 5, 7.5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 200];

function build(
  consumption: number,
  pv: number,
  fuse: number,
  opts: { maxCapacityKWh?: number; maxPowerKw?: number } = {},
): BatteryEngineInput {
  const extraPower = (max: number, base: number[]) =>
    max <= 200 ? base : [...base, ...[250, 300, 350, 400].filter((p) => p <= max)];
  const base = defaultConfig();
  const maxCap = opts.maxCapacityKWh ?? 500;
  const maxKw = opts.maxPowerKw ?? 200;
  const advanced =
    opts.maxCapacityKWh || opts.maxPowerKw
      ? {
          sweetSpot: { ...base.sweetSpot, maxNormalCapacityKWh: maxCap },
          powerSizing: {
            ...base.powerSizing,
            fineStepsKw: extraPower(maxKw, FINE_BASE),
            productStepsKw: extraPower(maxKw, PRODUCT_BASE),
          },
          sweep: {
            ...base.sweep,
            capacitiesKWh: [
              ...base.sweep.capacitiesKWh,
              ...[600, 750, 900, 1000].filter((c) => c <= maxCap),
            ],
          },
        }
      : undefined;
  return {
    site: { country: "SE", mainFuseA: fuse },
    consumption: {
      monthlyKWh: scale(LOAD_SHAPE, consumption),
      annualKWh: consumption,
      profile: "normal",
    },
    production:
      pv > 0
        ? {
            enabled: true,
            monthlyKWh: scale(PV_SHAPE, pv),
            annualKWh: pv,
            kWp: pv / 950,
            inverterAcKw: pv / 1150,
          }
        : { enabled: false },
    strategies: {
      selfConsumption: true,
      reduceImport: true,
      peakShaving: true,
      fcrDUp: true,
      optimiseFcrReservation: true,
    },
    economy: {
      importEnergyPriceSekPerKWh: 1.5,
      exportEnergyValueSekPerKWh: 0.6,
      peakDemandChargeSekPerKwMonth: 30,
      peakTariffSource: "user-provided",
      eurSekRate: 11.3,
      customerAncillaryShare: 0.75,
    },
    ...(advanced ? { advanced } : {}),
  };
}

type Case = { tag: string; kWh: number; pv: number; fuse: number };
const CASES: Case[] = [
  { tag: "Normal villa 10 000/8/20A", kWh: 10000, pv: 8000, fuse: 20 },
  { tag: "Stor villa 20 000/14/25A", kWh: 20000, pv: 14000, fuse: 25 },
  { tag: "Kommersiellt 250 000/150/200A", kWh: 250000, pv: 150000, fuse: 200 },
  { tag: "Gränsfall 1,5 GWh/1 MW/630A", kWh: 1500000, pv: 1000000, fuse: 630 },
];

const f = (v: number, d = 1) => v.toFixed(d);

console.log("=== SÖKGRÄNSKLASSIFICERING — PRODUKTIONSGRÄNSER (500 kWh / 200 kW) ===");
for (const c of CASES) {
  const r = runBatteryEngine(build(c.kWh, c.pv, c.fuse));
  const rec = r.summary.recommendation;
  const ps = r.diagnostics.powerSizing;
  console.log(
    `${c.tag}\n  kapacitet ${f(rec.capacityKWh)} kWh (upperLimitReached=${rec.upperLimitReached})` +
      `  effekt ${f(rec.recommendedPowerKw)} kW (powerUpperLimitReached=${rec.powerUpperLimitReached})` +
      `\n  fysiskt behov ${f(rec.physicalPowerNeedKw)} kW, topStepGainPct ${f(ps.topStepGainPct, 3)} %,` +
      ` fysisk sökgräns=${ps.powerUpperLimitReached}, productCapBound=${rec.productCapBound},` +
      ` kundnytta ${f(r.summary.economy.annualCustomerBenefitSek ?? 0, 0)} kr/år`,
  );
}

console.log("\n=== TEMPORÄRT UTÖKAT SÖKOMRÅDE (endast verifiering) ===");
const wide = CASES[3]!;
for (const maxCap of [500, 750, 1000])
  for (const maxKw of [200, 300, 400]) {
    const r = runBatteryEngine(
      build(wide.kWh, wide.pv, wide.fuse, { maxCapacityKWh: maxCap, maxPowerKw: maxKw }),
    );
    const rec = r.summary.recommendation;
    console.log(
      `  tak ${maxCap} kWh / ${maxKw} kW -> ${f(rec.capacityKWh)} kWh (kapgräns=${rec.upperLimitReached})` +
        ` / ${f(rec.recommendedPowerKw)} kW (effektgräns=${rec.powerUpperLimitReached})`,
    );
  }

console.log("\n=== FALSKPOSITIV-KONTROLL (normala fall vid utökat söktak) ===");
for (const c of CASES.slice(0, 3)) {
  const r = runBatteryEngine(build(c.kWh, c.pv, c.fuse, { maxCapacityKWh: 1000, maxPowerKw: 400 }));
  const rec = r.summary.recommendation;
  console.log(
    `  ${c.tag} -> ${f(rec.capacityKWh)} kWh / ${f(rec.recommendedPowerKw)} kW` +
      ` (kapgräns=${rec.upperLimitReached}, effektgräns=${rec.powerUpperLimitReached})`,
  );
}
