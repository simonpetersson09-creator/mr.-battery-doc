/** Analysis of the grid-margin sensitivity audit. Read-only. */
import { readdirSync, readFileSync } from "node:fs";

const mode = process.argv[2] ?? "main";
const keys = mode === "iso" ? ["A", "B"] : ["A", "B", "C"];
type M = Record<string, number> & { fail: string[] };
type Row = Record<string, unknown> & { id: string; family: string; market: string };

const rows: Row[] = [];
for (const f of readdirSync("/tmp/gm").filter((f) => f.startsWith(mode + "-") && f.endsWith(".json")))
  rows.push(...(JSON.parse(readFileSync("/tmp/gm/" + f, "utf8")) as Row[]));
rows.sort((a, b) => a.id.localeCompare(b.id));
console.log("scenarios:", rows.length, "variants:", keys.join("/"));

const PRODUCT_TOL = 1e-6;
function q(arr: number[], p: number): number {
  if (!arr.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.floor(p * (a.length - 1)))];
}
const get = (r: Row, k: string) => r[k] as M;

// invariants
for (const k of keys) {
  const failed = rows.filter((r) => (get(r, k)?.fail?.length ?? 0) > 0);
  const kinds = new Map<string, number>();
  for (const r of failed) for (const f of get(r, k).fail) kinds.set(f, (kinds.get(f) ?? 0) + 1);
  console.log(
    `INVARIANTS ${k}: ${failed.length} scenarios with failures`,
    [...kinds.entries()].map(([a, b]) => `${a}=${b}`).join(" ") || "(none)",
  );
}

function compare(base: string, other: string) {
  const capChanged: Row[] = [];
  const powChanged: Row[] = [];
  const dBenefit: number[] = [];
  const perFamily = new Map<string, { n: number; cap: number; pow: number; d: number[] }>();
  let physChanged = 0;
  let gridConstraintFlips = 0;
  const flipsChangingSizing: Row[] = [];
  for (const r of rows) {
    const a = get(r, base);
    const b = get(r, other);
    if (!a || !b || a.fail?.length || b.fail?.length) continue;
    const fam = `${r.family}/${r.market}`;
    const e = perFamily.get(fam) ?? { n: 0, cap: 0, pow: 0, d: [] as number[] };
    e.n++;
    if (Math.abs(a.capKWh - b.capKWh) > PRODUCT_TOL) {
      capChanged.push(r);
      e.cap++;
    }
    if (Math.abs(a.powKw - b.powKw) > PRODUCT_TOL) {
      powChanged.push(r);
      e.pow++;
    }
    if (Math.abs(a.physKw - b.physKw) > 1e-6) physChanged++;
    const d = b.customerBenefit - a.customerBenefit;
    dBenefit.push(d);
    e.d.push(d);
    perFamily.set(fam, e);
    const aBound = a.importBoundHours > 0 || a.exportBoundHours > 0 || a.unserved > 0.001 || a.curtailed > 0.001;
    const bBound = b.importBoundHours > 0 || b.exportBoundHours > 0 || b.unserved > 0.001 || b.curtailed > 0.001;
    if (aBound && !bBound) {
      gridConstraintFlips++;
      if (Math.abs(a.capKWh - b.capKWh) > PRODUCT_TOL || Math.abs(a.powKw - b.powKw) > PRODUCT_TOL)
        flipsChangingSizing.push(r);
    }
  }
  const n = dBenefit.length;
  const abs = dBenefit.map(Math.abs);
  const rel = rows
    .filter((r) => get(r, base) && get(r, other) && !get(r, base).fail?.length && !get(r, other).fail?.length)
    .map((r) => {
      const a = get(r, base).customerBenefit;
      const b = get(r, other).customerBenefit;
      return Math.abs(a) > 1 ? Math.abs(b - a) / Math.abs(a) : 0;
    });
  console.log(`\n===== ${base} -> ${other} (n=${n}) =====`);
  console.log(
    `kWh changed: ${capChanged.length} (${((capChanged.length / n) * 100).toFixed(1)}%)  ` +
      `kW changed: ${powChanged.length} (${((powChanged.length / n) * 100).toFixed(1)}%)  ` +
      `physicalNeedKw changed: ${physChanged}`,
  );
  console.log(
    `annualCustomerBenefit delta SEK: median ${q(abs, 0.5).toFixed(1)}  p90 ${q(abs, 0.9).toFixed(1)}  ` +
      `max ${Math.max(0, ...abs).toFixed(0)}  signed min ${Math.min(0, ...dBenefit).toFixed(0)} max ${Math.max(0, ...dBenefit).toFixed(0)}`,
  );
  console.log(
    `relative delta: median ${(q(rel, 0.5) * 100).toFixed(2)}%  p90 ${(q(rel, 0.9) * 100).toFixed(2)}%  max ${(Math.max(0, ...rel) * 100).toFixed(1)}%`,
  );
  console.log(
    `grid constraint present in ${base} but gone in ${other}: ${gridConstraintFlips}; of those changing sizing: ${flipsChangingSizing.length}`,
  );
  const worst = [...rows]
    .filter((r) => get(r, base) && get(r, other) && !get(r, base).fail?.length && !get(r, other).fail?.length)
    .sort(
      (x, y) =>
        Math.abs(get(y, other).customerBenefit - get(y, base).customerBenefit) -
        Math.abs(get(x, other).customerBenefit - get(x, base).customerBenefit),
    )
    .slice(0, 8);
  console.log("worst benefit shifts:");
  for (const r of worst) {
    const a = get(r, base);
    const b = get(r, other);
    console.log(
      `  ${r.id} ${r.family}/${r.market} load=${r.load} pv=${r.pv} fuse=${r.fuse}A ${r.strat} ` +
        `kWh ${a.capKWh}->${b.capKWh} kW ${a.powKw}->${b.powKw} ` +
        `benefit ${a.customerBenefit.toFixed(0)}->${b.customerBenefit.toFixed(0)} ` +
        `impBound ${a.importBoundHours}->${b.importBoundHours} expBound ${a.exportBoundHours}->${b.exportBoundHours} ` +
        `unserved ${a.unserved.toFixed(0)}->${b.unserved.toFixed(0)} curt ${a.curtailed.toFixed(0)}->${b.curtailed.toFixed(0)}`,
    );
  }
  const fams = [...perFamily.entries()]
    .map(([k, v]) => ({ k, ...v, med: q(v.d.map(Math.abs), 0.5), p90: q(v.d.map(Math.abs), 0.9) }))
    .sort((a, b) => b.p90 - a.p90)
    .slice(0, 12);
  console.log("most affected customer types (family/market, by p90 |ΔSEK|):");
  for (const f of fams)
    console.log(
      `  ${f.k}: n=${f.n} capChg=${f.cap} powChg=${f.pow} medianΔ=${f.med.toFixed(0)} p90Δ=${f.p90.toFixed(0)}`,
    );
  // aggregate physical deltas
  const agg = (fn: (m: M) => number) => {
    let da = 0;
    let db = 0;
    for (const r of rows) {
      const a = get(r, base);
      const b = get(r, other);
      if (!a || !b || a.fail?.length || b.fail?.length) continue;
      da += fn(a);
      db += fn(b);
    }
    return [da, db];
  };
  for (const [label, fn] of [
    ["importBoundHours", (m: M) => m.importBoundHours],
    ["exportBoundHours", (m: M) => m.exportBoundHours],
    ["curtailedKWh", (m: M) => m.curtailed],
    ["unservedKWh", (m: M) => m.unserved],
    ["gridChargedKWh", (m: M) => m.gridChargedKWh],
    ["cycles", (m: M) => m.cycles],
    ["peakReductionKw", (m: M) => m.peakReductionKw],
    ["fcrHeldKw", (m: M) => m.fcrHeld],
    ["maxInvestment", (m: M) => m.maxInvestment],
  ] as [string, (m: M) => number][]) {
    const [x, y] = agg(fn);
    console.log(`  total ${label}: ${x.toFixed(0)} -> ${y.toFixed(0)} (${(y - x).toFixed(0)})`);
  }
}

for (let i = 1; i < keys.length; i++) compare(keys[0], keys[i]);
