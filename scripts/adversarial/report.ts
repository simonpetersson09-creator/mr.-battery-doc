/** Aggregates the adversarial audit rows into the final report. Read-only. */
import { readdirSync, readFileSync } from "fs";
import type { AdvRow } from "./harness";

const rows: AdvRow[] = [];
for (const f of readdirSync("/tmp/adv"))
  if (f.startsWith("out-") && f.endsWith(".json"))
    rows.push(...(JSON.parse(readFileSync(`/tmp/adv/${f}`, "utf8")) as AdvRow[]));
rows.sort((a, b) => (a.id < b.id ? -1 : 1));

const n = (x: number | null | undefined) => (x === null || x === undefined ? 0 : x);
const has = (r: AdvRow, f: string) => (r.fail ?? []).some((x) => x.startsWith(f));
const flag = (r: AdvRow, f: string) => (r.flags ?? []).includes(f);

const totalSims = rows.reduce((a, r) => a + n(r.sweepRuns), 0);
const withBattery = rows.filter((r) => r.capKWh > 0);

const counts = {
  scenarios: rows.length,
  engineSimulations8760: totalSims,
  hardInvariantFailures: rows.filter((r) => (r.fail ?? []).length > 0).length,
  energyBalanceFailures: rows.filter((r) => has(r, "ENERGY_BALANCE") || has(r, "HOURLY_CONSERVATION")).length,
  nanOrInfinity: rows.filter((r) => has(r, "NAN")).length,
  throws: rows.filter((r) => has(r, "THROW")).length,
  productAbove200kW: rows.filter((r) => r.powKw > 200 + 1e-9).length,
  negativeCustomerBenefit: rows.filter((r) => n(r.customerBenefit) < 0).length,
  negativeEngineTotal: rows.filter((r) => r.engineTotal !== null && r.engineTotal < 0).length,
  lowUtilisation: withBattery.filter((r) => r.cycles < 50).length,
  lowUtilisationUnder100: withBattery.filter((r) => r.cycles < 100).length,
  ancillaryPhysicsErrors: rows.filter(
    (r) =>
      has(r, "FCR_WHEN_DISABLED") || has(r, "MONETIZED>HELD") || has(r, "HELD>OFFERED") || has(r, "HELD>POWER"),
  ).length,
  gridAnomalies: rows.filter((r) => has(r, "GRID") || has(r, "SIMULTANEOUS")).length,
  alternativeOrderingErrors: rows.filter(
    (r) => has(r, "ALT_ORDER") || has(r, "ALT_DUPLICATE"),
  ).length,
  maxAnnualBalanceResidual: Math.max(...rows.map((r) => n(r.balanceResidual))),
  maxHourlyResidual: Math.max(...rows.map((r) => n(r.maxHourlyErr))),
  cRateAbove05: withBattery.filter((r) => r.cRate > 0.5 + 1e-9).length,
  productCapBound: rows.filter((r) => r.productCapBound).length,
  capacityAtLadderMax: rows.filter((r) => r.upperLimitReached).length,
  batteriesRecommended: withBattery.length,
  noBattery: rows.length - withBattery.length,
};
console.log("== COUNTS ==");
console.log(JSON.stringify(counts, null, 1));

console.log("\n== FAILURE BREAKDOWN ==");
const fk: Record<string, number> = {};
for (const r of rows) for (const f of r.fail ?? []) fk[f.split(":")[0]] = (fk[f.split(":")[0]] ?? 0) + 1;
console.log(JSON.stringify(fk, null, 1));
for (const r of rows.filter((x) => (x.fail ?? []).length))
  console.log(
    ` FAIL ${r.id} ${r.family} ${r.market} load=${r.load} pv=${r.pv} prof=${r.profile} fuse=${r.fuse} strat=${r.strat} => ${r.capKWh}kWh/${r.powKw}kW ${JSON.stringify(r.fail)}`,
  );

console.log("\n== FLAG COUNTS ==");
const gk: Record<string, number> = {};
for (const r of rows) for (const f of r.flags ?? []) gk[f] = (gk[f] ?? 0) + 1;
console.log(JSON.stringify(gk, null, 1));

/* ---- monotonicity families ---- */
console.log("\n== MONOTONICITY SWEEPS ==");
const monoFamilies = [...new Set(rows.map((r) => r.family))].filter((f) => f.startsWith("mono-"));
const jumps: { key: string; text: string; score: number }[] = [];
for (const fam of monoFamilies) {
  const set = rows.filter((r) => r.family === fam);
  const axis = (r: AdvRow) =>
    fam.includes("load") ? r.load
    : fam.includes("pv") ? r.pv
    : fam.includes("fuse") ? r.fuse
    : fam.includes("import") ? r.importPrice
    : fam.includes("export") ? r.exportPrice
    : fam.includes("demand") ? n(r.demandCharge)
    : fam.includes("share") ? r.share
    : r.payback;
  set.sort((a, b) => axis(a) - axis(b));
  console.log(`-- ${fam}`);
  let prev: AdvRow | null = null;
  for (const r of set) {
    const cust = r.customerBenefit === null ? "n/a" : Math.round(r.customerBenefit);
    console.log(
      `   ${String(axis(r)).padStart(8)} -> ${r.capKWh}kWh/${r.powKw}kW phys=${r.physKw.toFixed(1)}kW cust=${cust} maxInv=${r.maxInvestment === null ? "n/a" : Math.round(r.maxInvestment)} sc=${r.scAfter.toFixed(0)}% ss=${r.ssAfter.toFixed(0)}% peakRed=${r.peakReductionKw.toFixed(1)}kW cycles=${r.cycles.toFixed(0)}`,
    );
    if (prev) {
      const capRel = prev.capKWh > 0 ? Math.abs(r.capKWh - prev.capKWh) / prev.capKWh : r.capKWh > 0 ? 1 : 0;
      const benRel =
        prev.customerBenefit && prev.customerBenefit > 0
          ? Math.abs(n(r.customerBenefit) - prev.customerBenefit) / prev.customerBenefit
          : 0;
      if (capRel > 0.5 || benRel > 0.5)
        jumps.push({
          key: fam,
          text: `${fam}: ${axis(prev)} -> ${axis(r)} : ${prev.capKWh}kWh/${prev.powKw}kW cust=${Math.round(n(prev.customerBenefit))} => ${r.capKWh}kWh/${r.powKw}kW cust=${Math.round(n(r.customerBenefit))}`,
          score: Math.max(capRel, benRel),
        });
    }
    prev = r;
  }
}
console.log("\n== SUSPICIOUS DISCONTINUITIES ==", jumps.length);
for (const j of jumps.sort((a, b) => b.score - a.score)) console.log("  ", j.text);

/* ---- marginal utility ladders ---- */
console.log("\n== MARGINAL UTILITY LADDERS ==");
const ladderFams = [...new Set(rows.map((r) => r.family))].filter((f) => f.startsWith("ladder:"));
for (const fam of ladderFams) {
  const set = rows.filter((r) => r.family === fam).sort((a, b) => a.capKWh - b.capKWh);
  console.log(`-- ${fam}`);
  let prev: AdvRow | null = null;
  for (const r of set) {
    const dU = prev ? (r.totalUsefulKWh - prev.totalUsefulKWh) / (r.capKWh - prev.capKWh) : NaN;
    const dV = prev ? (n(r.customerBenefit) - n(prev.customerBenefit)) / (r.capKWh - prev.capKWh) : NaN;
    console.log(
      `   ${String(r.capKWh).padStart(4)}kWh/${String(r.powKw).padStart(5)}kW useful=${Math.round(r.totalUsefulKWh)} cust=${Math.round(n(r.customerBenefit))} cycles=${r.cycles.toFixed(0)} useful/kWh=${r.usefulPerKWh.toFixed(0)}` +
        (prev ? `  d(useful)/dkWh=${dU.toFixed(1)} d(value)/dkWh=${dV.toFixed(1)}` : ""),
    );
    prev = r;
  }
}

/* ---- fuse sweeps ---- */
console.log("\n== FUSE SWEEP (40 000 kWh / 20 000 kWh PV, heat-pump+EV, all strategies) ==");
for (const m of ["SE", "FI", "DE", "DK1", "DK2"])
  for (const r of rows.filter((x) => x.family === "fuse" && x.market === m).sort((a, b) => a.fuse - b.fuse))
    console.log(
      `   ${m} ${String(r.fuse).padStart(3)}A -> ${r.capKWh}kWh/${r.powKw}kW phys=${r.physKw.toFixed(1)} held=${r.held.toFixed(2)}kW clip=${(r.gridClipShare * 100).toFixed(0)}% limiting=${r.limiting} peakRed=${r.peakReductionKw.toFixed(1)} unserved=${r.unserved.toFixed(0)} cust=${Math.round(n(r.customerBenefit))}`,
    );

/* ---- customer share physics invariance ---- */
console.log("\n== CUSTOMER SHARE: PHYSICS INVARIANCE ==");
for (const m of ["SE", "FI", "DE", "DK1", "DK2"]) {
  const set = rows.filter((r) => r.family === "share" && r.market === m).sort((a, b) => a.share - b.share);
  const sig = (r: AdvRow) =>
    JSON.stringify([r.capKWh, r.powKw, r.offered.toFixed(6), r.held.toFixed(6), r.fcrGross === null ? null : r.fcrGross.toFixed(3), r.importAfter.toFixed(3)]);
  const uniq = new Set(set.map(sig));
  console.log(
    `   ${m}: physicsSignatures=${uniq.size} (must be 1) customerBenefit=${set.map((r) => Math.round(n(r.customerBenefit))).join(" / ")}`,
  );
}

/* ---- alternatives ---- */
console.log("\n== ALTERNATIVES ==");
for (const r of rows.filter((x) => x.alternatives))
  console.log(
    `   ${r.id} ${r.market} load=${r.load} -> ` +
      (r.alternatives ?? [])
        .map((a) => `${a.level}:${a.kWh}kWh/${a.kW}kW=${a.customer === null ? "n/a" : Math.round(a.customer)}`)
        .join("  ") +
      ` flags=${(r.flags ?? []).filter((f) => f.includes("alt")).join(",")}`,
  );

/* ---- no-sun ---- */
console.log("\n== NO SUN: WHAT DRIVES THE BATTERY ==");
for (const r of rows.filter((x) => x.family === "nosun" && x.capKWh > 0))
  console.log(
    `   ${r.id} ${r.market} ${r.load}kWh ${r.strat} -> ${r.capKWh}kWh/${r.powKw}kW energy=${Math.round(r.energyBenefit)} peak=${r.peakBenefit === null ? "n/a" : Math.round(r.peakBenefit)} fcr=${r.fcrGross === null ? "n/a" : Math.round(r.fcrGross)} cycles=${r.cycles.toFixed(0)}`,
  );

/* ---- extreme sun ---- */
console.log("\n== EXTREME SUN ==");
for (const r of rows.filter((x) => x.family === "sun"))
  console.log(
    `   ${r.market} load=${r.load} pv=${r.pv} -> ${r.capKWh}kWh/${r.powKw}kW sc=${r.scBefore.toFixed(0)}->${r.scAfter.toFixed(0)}% ss=${r.ssBefore.toFixed(0)}->${r.ssAfter.toFixed(0)}% export=${Math.round(r.exportAfter)} curtailed=${Math.round(r.curtailed)} cycles=${r.cycles.toFixed(0)}`,
  );

/* ---- product cap ---- */
console.log("\n== PRODUCT CAP CASES ==");
for (const r of rows.filter((x) => x.productCapBound || x.physKw > x.maxProductKw))
  console.log(
    `   ${r.id} ${r.family} ${r.market} load=${r.load} -> phys=${r.physKw.toFixed(1)}kW product=${r.productKw}kW rec=${r.powKw}kW max=${r.maxProductKw}kW cap=${r.capKWh}kWh upperLimit=${r.upperLimitReached}`,
  );

/* ---- negative benefit ---- */
console.log("\n== NEGATIVE BENEFIT CASES ==");
for (const r of rows.filter((x) => n(x.customerBenefit) < 0 || (x.engineTotal !== null && x.engineTotal < 0)))
  console.log(
    `   ${r.id} ${r.family} ${r.market} load=${r.load} pv=${r.pv} ${r.profile} ${r.strat} imp=${r.importPrice} exp=${r.exportPrice} dc=${r.demandCharge} -> ${r.capKWh}kWh/${r.powKw}kW energy=${Math.round(r.energyBenefit)} peak=${r.peakBenefit === null ? "n/a" : Math.round(r.peakBenefit)} fcr=${r.fcrGross === null ? "n/a" : Math.round(r.fcrGross)} total=${Math.round(n(r.engineTotal))} cust=${Math.round(n(r.customerBenefit))}`,
  );

/* ---- shortlist ---- */
function suspicion(r: AdvRow) {
  let s = 0;
  if ((r.fail ?? []).length) s += 100;
  if (n(r.customerBenefit) < 0) s += 40;
  if (r.capKWh > 0 && r.cycles < 20) s += 25;
  else if (r.capKWh > 0 && r.cycles < 50) s += 15;
  else if (r.capKWh > 0 && r.cycles < 100) s += 6;
  if (r.capKWh > 0 && r.usefulPerKWh < 20) s += 12;
  if (flag(r, "higher-alt-worse")) s += 20;
  if (flag(r, "higher-alt-identical")) s += 10;
  if (r.productCapBound) s += 6;
  if (r.upperLimitReached) s += 5;
  if (r.capKWh > 0 && r.cRate > 0.5 + 1e-9) s += 4;
  if (r.capKWh > 0 && r.cRate < 0.1) s += 6;
  if (r.capKWh > 0 && r.load < 3000) s += 8;
  if (r.capKWh > 0 && r.capKWh > r.load / 100) s += 6;
  if (r.unserved > 1) s += 4;
  if (r.gridClipShare > 0.3) s += 4;
  return s;
}
console.log("\n== TOP 20 SUSPICIOUS ==");
for (const r of [...rows].sort((a, b) => suspicion(b) - suspicion(a)).slice(0, 20))
  console.log(
    `   [${suspicion(r)}] ${r.id} ${r.family} ${r.market} load=${r.load} pv=${r.pv} prof=${r.profile} fuse=${r.fuse}A ${r.strat} imp=${r.importPrice} dc=${r.demandCharge}` +
      ` => ${r.capKWh}kWh/${r.powKw}kW (phys=${r.physKw.toFixed(1)}kW C=${r.cRate.toFixed(2)}) cycles=${r.cycles.toFixed(0)} useful=${Math.round(r.totalUsefulKWh)} useful/kWh=${r.usefulPerKWh.toFixed(0)}` +
      ` energy=${Math.round(r.energyBenefit)} peak=${r.peakBenefit === null ? "n/a" : Math.round(r.peakBenefit)} fcr=${r.fcrGross === null ? "n/a" : Math.round(r.fcrGross)} cust=${Math.round(n(r.customerBenefit))}` +
      ` flags=${(r.flags ?? []).join(",")} fail=${(r.fail ?? []).join(",")}`,
  );

/* ---- tiny sites ---- */
console.log("\n== TINY SITES ==");
for (const r of rows.filter((x) => x.family === "tiny"))
  console.log(
    `   ${r.market} load=${r.load} pv=${r.pv} -> ${r.capKWh}kWh/${r.powKw}kW cycles=${r.cycles.toFixed(0)} useful=${Math.round(r.totalUsefulKWh)} cust=${Math.round(n(r.customerBenefit))}`,
  );
