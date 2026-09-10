/** Groups negative-customer-benefit cases by root cause. Read-only. */
type Row = {
  id: string; family: string; market: string; load: number; pv: number; fuse: number;
  profile: string; strat: string; demandCharge: number | null; cap: number; kw: number;
  energy: number; peak: number | null; fcr: number; total: number | null; customer: number | null;
  unserved: number; curtailed: number; peakBefore: number; peakAfter: number;
};
const rows: Row[] = [];
for (let i = 0; i < 8; i++) rows.push(...(JSON.parse(await Bun.file(`/tmp/adv/neg-${i}.json`).text()) as Row[]));
rows.sort((a, b) => (a.customer ?? 0) - (b.customer ?? 0));

function cause(r: Row): string {
  if (r.cap === 0) return "no-battery";
  const noDemandFee = !r.demandCharge;
  const peakRan = r.strat.includes("peak");
  if (r.energy < 0 && peakRan && noDemandFee) return "peak-shaving-without-demand-fee";
  if (r.energy < 0 && (r.peak ?? 0) <= 0 && r.fcr > 0) return "fcr-reservation-blocks-energy";
  if (r.energy < 0 && r.curtailed > 1) return "lost-export/curtailment";
  if (r.energy < 0 && r.unserved > 1) return "fuse-limited-unserved-load";
  if (r.energy < 0) return "grid-charging-losses";
  return "other";
}

const groups = new Map<string, Row[]>();
for (const r of rows) {
  const c = cause(r);
  if (!groups.has(c)) groups.set(c, []);
  groups.get(c)!.push(r);
}
console.log("TOTAL negative cases:", rows.length);
console.table(
  [...groups.entries()].map(([k, v]) => ({
    cause: k,
    n: v.length,
    worst: Math.min(...v.map((x) => x.customer ?? 0)),
    median: v[Math.floor(v.length / 2)]!.customer,
    demandFeeZero: v.filter((x) => !x.demandCharge).length,
    fcrOn: v.filter((x) => x.fcr > 0).length,
  })).sort((a, b) => b.n - a.n),
);
console.log("WORST 12");
console.table(rows.slice(0, 12).map((r) => ({
  id: r.id, fam: r.family, mkt: r.market, load: r.load, pv: r.pv, fuse: r.fuse,
  strat: r.strat, demand: r.demandCharge, cap: r.cap, kw: r.kw,
  energy: r.energy, peak: r.peak, fcr: r.fcr, customer: r.customer, cause: cause(r),
})));
