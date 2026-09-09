/** Aggregates the shard results into the audit report tables. Read-only. */
import { readdirSync, readFileSync } from "fs";

const rows: any[] = [];
for (const f of readdirSync("/tmp/stress")) {
  if (f.startsWith("out-") && f.endsWith(".json")) rows.push(...JSON.parse(readFileSync(`/tmp/stress/${f}`, "utf8")));
}
rows.sort((a, b) => (a.id < b.id ? -1 : 1));

const markets = ["SE", "FI", "DE", "DK1", "DK2"];
const per: Record<string, any> = {};
for (const m of markets)
  per[m] = {
    scenarios: 0, pass: 0, fail: 0, anomalies: 0, capBound: 0, clipped: 0, lowAvail: 0,
    balanceFail: 0, socFail: 0, gridFail: 0, reserveFail: 0, currencyFail: 0, routingFail: 0,
    nan: 0, maxResidual: 0, hourViol: 0, replayMismatch: 0, totalMismatch: 0,
  };

let maxHourErr = 0;
let sumHourErr = 0;
let hourCount = 0;
for (const r of rows) {
  const p = per[r.market];
  p.scenarios++;
  const failed = (r.fail?.length ?? 0) > 0;
  if (failed) p.fail++; else p.pass++;
  p.anomalies += r.anomalies?.length ?? 0;
  if (r.capBound) p.capBound++;
  if (r.anomalies?.includes("G:grid-clip>20%")) p.clipped++;
  if (r.anomalies?.includes("H:low-availability")) p.lowAvail++;
  if (r.fail?.includes("ENERGY_BALANCE")) p.balanceFail++;
  if (r.fail?.includes("SOC")) p.socFail++;
  if (r.fail?.includes("GRID_IMPORT") || r.fail?.includes("GRID_EXPORT")) p.gridFail++;
  if (r.fail?.includes("RESERVE_INVARIANT")) p.reserveFail++;
  if (r.fail?.includes("CURRENCY")) p.currencyFail++;
  if (r.fail?.includes("ROUTING")) p.routingFail++;
  if (r.fail?.includes("NAN") || r.fail?.includes("NAN_TOTAL")) p.nan++;
  if (r.fail?.includes("HOURLY_CONSERVATION")) p.hourViol++;
  if (r.fail?.includes("TOTAL_DECOMPOSITION")) p.totalMismatch++;
  if (r.replayMatch === false) p.replayMismatch++;
  p.maxResidual = Math.max(p.maxResidual, Math.abs(r.balanceResidual ?? 0));
  maxHourErr = Math.max(maxHourErr, r.maxHourlyBalanceErr ?? 0);
  sumHourErr += r.meanHourlyBalanceErr ?? 0;
  hourCount++;
}

console.log("== TOTALS ==");
console.log(JSON.stringify({
  scenarios: rows.length,
  failures: rows.filter((r) => r.fail?.length).length,
  anomalies: rows.reduce((a, r) => a + (r.anomalies?.length ?? 0), 0),
  maxHourlyConservationErr: maxHourErr,
  meanHourlyConservationErr: sumHourErr / hourCount,
  maxAnnualBalanceResidual: Math.max(...rows.map((r) => Math.abs(r.balanceResidual ?? 0))),
}));

console.log("== PER MARKET ==");
for (const m of markets) console.log(m, JSON.stringify(per[m]));

const failList = rows.filter((r) => r.fail?.length);
console.log("== FAILURES ==", failList.length);
for (const r of failList.slice(0, 40))
  console.log(r.id, r.market, r.tag, JSON.stringify(r.fail), `load=${r.load} pv=${r.pv} fuse=${r.fuse} hsc=${r.hsc} strat=${r.strat} econ=${r.econ}`);

const counts: Record<string, number> = {};
for (const r of rows) for (const a of r.anomalies ?? []) counts[a] = (counts[a] ?? 0) + 1;
console.log("== ANOMALY COUNTS ==", JSON.stringify(counts, null, 1));

/* ---- sensitivity pairs ---- */
console.log("== SENSITIVITY ==");
const byTag: Record<string, any[]> = {};
for (const r of rows) (byTag[`${r.market}|${r.tag}`] ??= []).push(r);
for (const key of Object.keys(byTag)) {
  if (!key.includes("sens:") || !key.endsWith(":a")) continue;
  const a = byTag[key][0];
  const b = byTag[key.replace(/:a$/, ":b")]?.[0];
  if (!b) continue;
  const capJump = Math.abs((a.capKWh ?? 0) - (b.capKWh ?? 0));
  const powJump = Math.abs((a.powKw ?? 0) - (b.powKw ?? 0));
  const flag = capJump >= 10 || powJump >= 5;
  console.log(
    `${key.replace(":a", "")} ${a.capKWh}kWh/${a.powKw}kW -> ${b.capKWh}kWh/${b.powKw}kW` +
      ` benefit ${Math.round(a.benefit ?? 0)} -> ${Math.round(b.benefit ?? 0)}${flag ? "  <== JUMP" : ""}`,
  );
}

/* ---- fuse sweep ---- */
console.log("== FUSE SWEEP (20 000 kWh / 14 000 kWh PV, all strategies) ==");
for (const m of markets) {
  const set = rows.filter((r) => r.market === m && r.tag === "fuse-sweep").sort((a, b) => a.fuse - b.fuse);
  for (const r of set)
    console.log(
      `${m} ${r.fuse}A -> ${r.capKWh}kWh/${r.powKw}kW held=${r.held.toFixed(2)}kW avail=${r.availability.toFixed(0)}% limiting=${r.limiting} benefit=${Math.round(r.benefit ?? 0)}`,
    );
}

/* ---- battery sweep ---- */
console.log("== BATTERY SWEEP (fixed kWh/kW) ==");
for (const m of markets) {
  const set = rows.filter((r) => r.market === m && r.tag === "battery-sweep").sort((a, b) => a.capKWh - b.capKWh || a.powKw - b.powKw);
  for (const r of set)
    console.log(
      `${m} ${r.capKWh}kWh/${r.powKw}kW energy=${Math.round(r.energyBenefit)} peak=${r.peakBenefit === null ? "n/a" : Math.round(r.peakBenefit)} reserve=${r.fcrGross === null ? "n/a" : Math.round(r.fcrGross)} total=${Math.round(r.benefit ?? 0)} cycles=${r.cycles.toFixed(0)} held=${r.held.toFixed(2)} clip=${(r.gridClipShare * 100).toFixed(0)}% limiting=${r.limiting}`,
    );
}

/* ---- reserve off ---- */
console.log("== RESERVE OFF SUBSET ==");
for (const r of rows.filter((x) => x.strat?.endsWith("-") && x.strat[3] === "-").slice(0, 12))
  console.log(r.id, r.market, r.tag, `held=${r.held} offered=${r.offered} fcrGross=${r.fcrGross} total=${Math.round(r.benefit ?? 0)}`);

/* ---- top 20 most interesting ---- */
function interest(r: any) {
  let s = 0;
  if (r.fail?.length) s += 100;
  if (r.anomalies?.includes("A:reserve>90%")) s += 8;
  if (r.anomalies?.includes("G:grid-clip>20%")) s += 7;
  if (r.anomalies?.includes("H:low-availability")) s += 5;
  if (r.anomalies?.includes("M:power-divergence")) s += 3;
  if (r.anomalies?.includes("negative-benefit")) s += 20;
  if (r.anomalies?.includes("C:capacity-at-max")) s += 6;
  if (r.anomalies?.includes("F:cycles-high")) s += 6;
  if (r.anomalies?.includes("E:cycles-low")) s += 4;
  if (r.anomalies?.includes("diag:held>reservable-avg")) s += 2;
  if (r.capBound) s += 1;
  return s;
}
console.log("== TOP 20 ==");
for (const r of [...rows].sort((a, b) => interest(b) - interest(a)).slice(0, 20))
  console.log(
    `${r.id} ${r.market} ${r.tag} load=${r.load} pv=${r.pv} prof=${r.profile} fuse=${r.fuse} hsc=${r.hsc} strat=${r.strat} econ=${r.econ} => ${r.capKWh}kWh/${r.powKw}kW phys=${r.physKw}kW held=${r.held.toFixed(2)} cycles=${r.cycles.toFixed(0)} total=${Math.round(r.benefit ?? 0)} reserveShare=${r.reserveShare === null ? "n/a" : (r.reserveShare * 100).toFixed(0) + "%"} limiting=${r.limiting} anomalies=${(r.anomalies ?? []).join(",")} fail=${(r.fail ?? []).join(",")}`,
  );

/* ---- cap-bound share ---- */
console.log("== CAP-BOUND SHARE ==");
for (const m of markets) {
  const set = rows.filter((r) => r.market === m && r.capKWh > 0);
  console.log(m, `${set.filter((r) => r.capBound).length}/${set.length} = ${((set.filter((r) => r.capBound).length / Math.max(1, set.length)) * 100).toFixed(1)}%`);
}

/* ---- reserve labels ---- */
const labels: Record<string, Set<string>> = {};
for (const r of rows) if (r.reserveLabel) (labels[r.market] ??= new Set()).add(r.reserveLabel);
console.log("== RESERVE LABELS ==", JSON.stringify(Object.fromEntries(Object.entries(labels).map(([k, v]) => [k, [...v]])), null, 1));
