import { defaultConfig } from "../../src/lib/lab/defaults";
import { buildSeries, simulate } from "../../src/lib/lab/simulate";
import { computeGridLimits, dispatch, baseline } from "../../src/lib/lab/dispatch";
import type { LabConfig } from "../../src/lib/lab/types";

function mk(over: (c: LabConfig) => void): LabConfig {
  const c = defaultConfig();
  over(c);
  return c;
}

type Case = { name: string; cfg: LabConfig; cap: number; kw: number };
const cases: Case[] = [];
for (const [name, over] of Object.entries({
  base: (_c: LabConfig) => {},
  bigLoad: (c: LabConfig) => { c.consumption.annualKWh = 250000; c.grid.mainFuseA = 200; },
  noPv: (c: LabConfig) => { c.solar.annualKWh = 0; },
  hugePv: (c: LabConfig) => { c.solar.annualKWh = 60000; c.consumption.annualKWh = 8000; },
  smallFuse: (c: LabConfig) => { c.grid.mainFuseA = 16; },
  fcrOn: (c: LabConfig) => { c.strategies.ancillaryServices = true; },
  noPeakFee: (c: LabConfig) => { c.tariff && ((c.tariff as any).demandFeeKrPerKwMonth = 0); },
} as Record<string, (c: LabConfig) => void>)) {
  for (const [cap, kw] of [[10, 5], [25, 12.5], [30, 15], [100, 50]] as [number, number][]) {
    cases.push({ name: `${name}/${cap}kWh-${kw}kW`, cfg: mk(over), cap, kw });
  }
}

let worstAbs = 0, worstRel = 0, worstName = "";
let socDiffWorst = 0, socDiffName = "";
const rtLines: string[] = [];

for (const c of cases) {
  const series = buildSeries(c.cfg);
  const limits = computeGridLimits(c.cfg.grid);
  const d = dispatch({
    series, battery: c.cfg.battery, grid: c.cfg.grid, strategies: c.cfg.strategies,
    peak: c.cfg.peakShaving, spot: c.cfg.spot, flex: c.cfg.flex,
    ancillary: null, capacityKWh: c.cap, powerKw: c.kw,
  });
  const t = d.tallies;
  const S = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const load = S(series.load), pv = S(series.pv);
  const imp = S(d.importSeries), exp = S(d.exportSeries);
  // production + import + discharge(AC out) = load - unserved + export + charge(AC in) + curtail + losses(internal) ... 
  const lhs = pv + imp + t.dischargedKWh;
  const rhs = (load - t.unservedKWh) + exp + t.chargedKWh + t.curtailedKWh;
  const resid = lhs - rhs;
  const rel = Math.abs(resid) / Math.max(1, load);
  if (Math.abs(resid) > Math.abs(worstAbs)) { worstAbs = resid; worstRel = rel; worstName = c.name; }
  const socDiff = t.socEnd - t.socStart;
  if (Math.abs(socDiff) > Math.abs(socDiffWorst)) { socDiffWorst = socDiff; socDiffName = c.name; }
  const rt = t.chargedKWh > 0 ? t.dischargedKWh / t.chargedKWh : NaN;
  rtLines.push(`${c.name}: resid=${resid.toFixed(6)} kWh (rel ${(rel*1e6).toFixed(3)} ppm) socStart=${t.socStart.toFixed(3)} socEnd=${t.socEnd.toFixed(3)} d/c=${rt.toFixed(4)} losses=${t.lossesKWh.toFixed(1)} charged=${t.chargedKWh.toFixed(1)}`);
}
console.log(rtLines.join("\n"));
console.log(`\nWORST ABS RESIDUAL: ${worstAbs.toExponential(3)} kWh (${worstName}), rel ${(worstRel*1e6).toFixed(4)} ppm`);
console.log(`WORST SOC START/END DIFF: ${socDiffWorst.toFixed(3)} kWh (${socDiffName})`);
