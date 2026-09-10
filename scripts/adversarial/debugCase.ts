/** Prints the hourly detail of one scenario for manual inspection. Read-only. */
import { runBatteryEngine, toLabConfig, toTimeSeries } from "@/lib/battery-engine";
import { computeGridLimits, dispatch } from "@/lib/lab/dispatch";
import { ancillaryPlan } from "@/lib/lab/ancillary";
import { buildInput, type AdvScenario } from "./harness";
import { buildMatrix } from "./matrix";

const id = process.argv[2];
const s = buildMatrix().find((x) => x.id === id) as AdvScenario;
if (!s) throw new Error("no scenario " + id);
const input = buildInput(s);
const res = runBatteryEngine(input);
const rec = res.summary.recommendation;
const capacityKWh = rec.capacityKWh;
const powerKw = rec.recommendedPowerKw ?? rec.productPowerKw;
console.log(JSON.stringify({ ...s, capacityKWh, powerKw, phys: rec.physicalPowerNeedKw }, null, 1));

const cfg = toLabConfig(input);
const series = toTimeSeries(cfg, input);
const limits = computeGridLimits(cfg.grid);
const plan = cfg.strategies.ancillaryServices
  ? ancillaryPlan({ ...cfg.ancillary, offeredPowerKw: res.summary.fcr.offeredPowerKw })
  : null;
const d = dispatch({
  series,
  battery: cfg.battery,
  grid: cfg.grid,
  strategies: cfg.strategies,
  peak: cfg.peakShaving,
  spot: cfg.spot,
  flex: cfg.flex,
  ancillary: plan,
  capacityKWh,
  powerKw,
} as never) as never as {
  window: Record<string, number>;
  socSeries: number[];
  importSeries: number[];
  exportSeries: number[];
  tallies: Record<string, number>;
};
const w = d.window;
console.log("window", JSON.stringify({
  usableKWh: w.usableKWh, floor: w.socFloorKWh, ceil: w.socCeilKWh, chargeKw: w.chargeKw,
  dischargeKw: w.dischargeKw, chargeEff: w.chargeEff, dischargeEff: w.dischargeEff,
  reservedPowerKw: w.reservedPowerKw, reservedKWh: w.reservedKWh,
}));
console.log("tallies", JSON.stringify({
  maxCharge: d.tallies.maxChargePowerKw, maxDischarge: d.tallies.maxDischargePowerKw,
  socStart: d.tallies.socStart, socEnd: d.tallies.socEnd,
}));
let worst: { h: number; ac: number }[] = [];
let socOut = 0;
for (let h = 0; h < d.socSeries.length; h++) {
  const prev = h === 0 ? d.tallies.socStart : d.socSeries[h - 1];
  const dSoc = d.socSeries[h] - prev;
  const ac = dSoc >= 0 ? dSoc / w.chargeEff : dSoc * w.dischargeEff;
  if (Math.abs(ac) > powerKw + 1e-6) worst.push({ h, ac });
  if (d.socSeries[h] < w.socFloorKWh - 1e-6 || d.socSeries[h] > w.socCeilKWh + 1e-6) socOut++;
}
worst = worst.sort((a, b) => Math.abs(b.ac) - Math.abs(a.ac)).slice(0, 8);
console.log("acViolations", worst.length, "socOutside", socOut);
for (const v of worst) {
  const h = v.h;
  const prev = h === 0 ? d.tallies.socStart : d.socSeries[h - 1];
  console.log(
    ` h=${h} ac=${v.ac.toFixed(9)} excess=${(Math.abs(v.ac)-powerKw).toExponential(3)} soc ${prev.toFixed(3)} -> ${d.socSeries[h].toFixed(3)} load=${series.load[h].toFixed(2)} pv=${series.pv[h].toFixed(2)} imp=${d.importSeries[h].toFixed(2)} exp=${d.exportSeries[h].toFixed(2)} maxImp=${limits.maxImportKw.toFixed(1)}`,
  );
}
