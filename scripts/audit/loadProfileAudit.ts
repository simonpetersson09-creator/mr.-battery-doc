/**
 * READ-ONLY LOAD PROFILE AUDIT.
 *
 * Uses the exact production catalogue (src/lib/lab/loadProfiles.ts) and the exact
 * production series builder (buildLoadSeries) — no simplified copies.
 * Writes a text report to stdout and an HTML chart sheet to /mnt/documents.
 */
import { writeFileSync } from "node:fs";

import { runBatteryEngine } from "../../src/lib/battery-engine/run";
import type { BatteryEngineInput } from "../../src/lib/battery-engine/types";
import { HOURS_PER_YEAR, MONTH_DAYS } from "../../src/lib/lab/defaults";
import {
  CUSTOMER_LOAD_PROFILES,
  diurnalSetFor,
  hourWeightsOf,
  isWeekendDay,
  applyLoadProfile,
} from "../../src/lib/lab/loadProfiles";
import { buildLoadSeries } from "../../src/lib/lab/profiles";
import type { ConsumptionInput, LoadProfileShape } from "../../src/lib/lab/types";

const ANNUAL = 20000;
const ids = CUSTOMER_LOAD_PROFILES.map((p) => p.id);

const baseConsumption = (id: LoadProfileShape): ConsumptionInput =>
  applyLoadProfile(
    { annualKWh: ANNUAL, monthlyKWh: new Array(12).fill(0), shape: id, monthlyIsModelled: true },
    id,
  );

const series: Record<string, number[]> = {};
const consumptions: Record<string, ConsumptionInput> = {};
for (const id of ids) {
  const c = baseConsumption(id);
  consumptions[id] = c;
  series[id] = buildLoadSeries(c);
}

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const f = (n: number, d = 1) => n.toFixed(d);
const pct = (n: number) => `${(n * 100).toFixed(1)} %`;

/* ---------------- 1 + 3: structure and quantification ---------------- */

function monthRanges() {
  const out: { start: number; end: number }[] = [];
  let h = 0;
  for (const d of MONTH_DAYS) {
    out.push({ start: h, end: h + d * 24 });
    h += d * 24;
  }
  return out;
}
const MR = monthRanges();

function bandShares(s: number[]) {
  const bands = { n: 0, morning: 0, day: 0, evening: 0, late: 0 };
  for (let i = 0; i < s.length; i++) {
    const hod = i % 24;
    const v = s[i]!;
    if (hod < 6) bands.n += v;
    else if (hod < 9) bands.morning += v;
    else if (hod < 16) bands.day += v;
    else if (hod < 22) bands.evening += v;
    else bands.late += v;
  }
  const t = sum(s);
  return {
    n: bands.n / t,
    morning: bands.morning / t,
    day: bands.day / t,
    evening: bands.evening / t,
    late: bands.late / t,
  };
}

function hourMeans(s: number[], filter: (dayIdx: number) => boolean, monthsIdx?: number[]) {
  const acc = new Array(24).fill(0);
  const cnt = new Array(24).fill(0);
  for (let i = 0; i < s.length; i++) {
    const day = Math.floor(i / 24);
    const month = MR.findIndex((r) => i >= r.start && i < r.end);
    if (monthsIdx && !monthsIdx.includes(month)) continue;
    if (!filter(day)) continue;
    acc[i % 24] += s[i]!;
    cnt[i % 24] += 1;
  }
  const mean = acc.map((v, i) => (cnt[i] ? v / cnt[i] : 0));
  const m = sum(mean) / 24;
  return m > 0 ? mean.map((v) => v / m) : mean;
}

interface Metrics {
  id: string;
  label: string;
  bands: ReturnType<typeof bandShares>;
  maxHour: { h: number; v: number };
  minHour: { h: number; v: number };
  peakBase: number;
  weekdayShare: number;
  weekendShare: number;
  weekdayPerDay: number;
  weekendPerDay: number;
  monthShares: number[];
  winter: number;
  summer: number;
  maxMonth: number;
  minMonth: number;
  monthRatio: number;
  weekdayShape: number[];
  weekendShape: number[];
  janShape: number[];
  julShape: number[];
  hasSeasonShape: boolean;
  hasWeekendDiff: boolean;
}

const metrics: Metrics[] = ids.map((id) => {
  const s = series[id]!;
  const def = CUSTOMER_LOAD_PROFILES.find((p) => p.id === id)!;
  const wd = hourMeans(s, (d) => !isWeekendDay(d));
  const we = hourMeans(s, (d) => isWeekendDay(d));
  const jan = hourMeans(s, (d) => !isWeekendDay(d), [0]);
  const jul = hourMeans(s, (d) => !isWeekendDay(d), [6]);
  const total = sum(s);
  let wdE = 0;
  let weE = 0;
  let wdDays = 0;
  let weDays = 0;
  for (let d = 0; d < 365; d++) {
    let e = 0;
    for (let hh = 0; hh < 24; hh++) e += s[d * 24 + hh]!;
    if (isWeekendDay(d)) {
      weE += e;
      weDays++;
    } else {
      wdE += e;
      wdDays++;
    }
  }
  const monthShares = MR.map((r) => sum(s.slice(r.start, r.end)) / total);
  let maxH = 0;
  let minH = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i]! > s[maxH]!) maxH = i;
    if (s[i]! < s[minH]!) minH = i;
  }
  const maxM = monthShares.indexOf(Math.max(...monthShares));
  const minM = monthShares.indexOf(Math.min(...monthShares));
  const wdSet = def.shape.weekday.join(",");
  return {
    id,
    label: def.label,
    bands: bandShares(s),
    maxHour: { h: maxH, v: s[maxH]! },
    minHour: { h: minH, v: s[minH]! },
    peakBase: s[maxH]! / Math.max(s[minH]!, 1e-9),
    weekdayShare: wdE / total,
    weekendShare: weE / total,
    weekdayPerDay: wdE / wdDays,
    weekendPerDay: weE / weDays,
    monthShares,
    winter: monthShares[0]! + monthShares[1]! + monthShares[11]!,
    summer: monthShares[5]! + monthShares[6]! + monthShares[7]!,
    maxMonth: maxM,
    minMonth: minM,
    monthRatio: monthShares[maxM]! / monthShares[minM]!,
    weekdayShape: wd,
    weekendShape: we,
    janShape: jan,
    julShape: jul,
    hasSeasonShape: Boolean(def.winterShape || def.summerShape),
    hasWeekendDiff: wdSet !== def.shape.weekend.join(","),
  };
});

const MN = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

console.log("=========== 1+3. PROFILSTRUKTUR OCH KVANTIFIERING ===========");
for (const m of metrics) {
  console.log(`\n--- ${m.label} (${m.id})`);
  const bar = (v: number[]) =>
    v
      .map((x) => "▁▂▃▄▅▆▇█"[Math.min(7, Math.max(0, Math.round((x / Math.max(...v)) * 7)))])
      .join("");
  console.log(`  vardag 00-23 : ${bar(m.weekdayShape)}  max ${f(Math.max(...m.weekdayShape), 2)}`);
  console.log(`  helg   00-23 : ${bar(m.weekendShape)}  max ${f(Math.max(...m.weekendShape), 2)}`);
  console.log(`  jan/jul vard : ${bar(m.janShape)} / ${bar(m.julShape)}`);
  console.log(`  månad Jan-Dec: ${bar(m.monthShares)}`);
  console.log(
    `  vardag/helg skiljer: ${m.hasWeekendDiff ? "JA" : "NEJ"}; säsongsform: ${m.hasSeasonShape ? "JA" : "NEJ"}`,
  );
  console.log(
    `  band: 00-06 ${pct(m.bands.n)}, 06-09 ${pct(m.bands.morning)}, 09-16 ${pct(m.bands.day)}, 16-22 ${pct(m.bands.evening)}, 22-24 ${pct(m.bands.late)}`,
  );
  console.log(
    `  högsta timme h${m.maxHour.h % 24} (${f(m.maxHour.v, 2)} kWh), lägsta h${m.minHour.h % 24} (${f(m.minHour.v, 3)} kWh), peak/base ${f(m.peakBase, 1)}`,
  );
  console.log(
    `  vardag ${pct(m.weekdayShare)} / helg ${pct(m.weekendShare)} av året; per dag ${f(m.weekdayPerDay)} vs ${f(m.weekendPerDay)} kWh`,
  );
  console.log(
    `  vinter (dec-feb) ${pct(m.winter)}, sommar (jun-aug) ${pct(m.summer)}; högsta ${MN[m.maxMonth]}, lägsta ${MN[m.minMonth]}, ratio ${f(m.monthRatio, 2)}`,
  );
  const wd24 = m.weekdayShape;
  console.log(
    `  nattlast ${f(wd24.slice(0, 6).reduce((a, b) => a + b, 0) / 6, 2)}, morgontopp ${f(Math.max(...wd24.slice(6, 10)), 2)}, daglast ${f(wd24.slice(9, 16).reduce((a, b) => a + b, 0) / 7, 2)}, kvällstopp ${f(Math.max(...wd24.slice(16, 22)), 2)}`,
  );
}

/* ---------------- 5: similarity ---------------- */

function corr(a: number[], b: number[]) {
  const n = a.length;
  const ma = sum(a) / n;
  const mb = sum(b) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i]! - ma;
    const y = b[i]! - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  return num / Math.sqrt(da * db);
}
function l1diff(a: number[], b: number[]) {
  const ta = sum(a);
  const tb = sum(b);
  let d = 0;
  for (let i = 0; i < a.length; i++) d += Math.abs(a[i]! / ta - b[i]! / tb);
  return d / 2; // 0..1 share of energy moved
}

console.log("\n=========== 5. PROFILLIKHET (8760, normaliserade) ===========");
const pairs: { a: string; b: string; r: number; d: number }[] = [];
for (let i = 0; i < ids.length; i++)
  for (let j = i + 1; j < ids.length; j++) {
    const a = ids[i]!;
    const b = ids[j]!;
    pairs.push({ a, b, r: corr(series[a]!, series[b]!), d: l1diff(series[a]!, series[b]!) });
  }
pairs.sort((x, y) => y.r - x.r);
console.log("Mest lika par (topp 12):");
pairs
  .slice(0, 12)
  .forEach((p) => console.log(`  r=${f(p.r, 3)}  energiflytt ${pct(p.d)}  ${p.a} vs ${p.b}`));
console.log("Minst lika par (botten 6):");
pairs
  .slice(-6)
  .forEach((p) => console.log(`  r=${f(p.r, 3)}  energiflytt ${pct(p.d)}  ${p.a} vs ${p.b}`));

const NAMED: [LoadProfileShape, LoadProfileShape][] = [
  ["normal", "evening-heavy"],
  ["normal", "day-heavy"],
  ["normal", "heat-pump"],
  ["heat-pump", "direct-electric"],
  ["heat-pump", "heat-pump-ev"],
  ["ev-night", "ev-evening"],
  ["office", "workshop"],
  ["office", "retail-restaurant"],
];
console.log("Begärda jämförelser:");
for (const [a, b] of NAMED) {
  const r = corr(series[a]!, series[b]!);
  const d = l1diff(series[a]!, series[b]!);
  console.log(`  ${a} vs ${b}: r=${f(r, 3)}, energiflytt ${pct(d)}`);
}

/* ---------------- 6: battery impact ---------------- */

const PV = [101, 302, 806, 1410, 1813, 2216, 2317, 2014, 1612, 906, 403, 100];
const pvScaled = (() => {
  const s = sum(PV);
  return PV.map((v) => (v / s) * 14000);
})();

function engineInput(profile: LoadProfileShape): BatteryEngineInput {
  return {
    site: { country: "SE", mainFuseA: 25, phases: 3, voltageV: 400 },
    consumption: { annualKWh: ANNUAL, profile },
    production: {
      enabled: true,
      monthlyKWh: pvScaled,
      annualKWh: 14000,
      kWp: 14,
      inverterAcKw: 12,
    },
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
    },
  };
}

console.log("\n=========== 6. PROFILENS BETYDELSE FÖR BATTERIET ===========");
console.log("Samma kund: SE, 20 000 kWh, 14 000 kWh sol, 25 A, 1,50/0,60 kr, 30 kr/kW, FCR-D på.");
console.log(
  "Profil".padEnd(20) +
    "kWh".padStart(5) +
    "kW".padStart(6) +
    "nytta".padStart(9) +
    "egenanv".padStart(9) +
    "självf".padStart(8) +
    "peakred".padStart(9),
);
const impact: Record<string, { kwh: number; kw: number; ben: number }> = {};
for (const id of ids) {
  const r = runBatteryEngine(engineInput(id));
  const rec = r.summary.recommendation;
  const ben = r.summary.economy.annualCustomerBenefitSek ?? 0;
  const peakRed = r.summary.grid.importPeakBeforeKw - r.summary.grid.importPeakAfterKw;
  impact[id] = { kwh: rec.capacityKWh, kw: rec.powerKw, ben };
  console.log(
    id.padEnd(20) +
      String(rec.capacityKWh).padStart(5) +
      String(rec.powerKw).padStart(6) +
      String(Math.round(ben)).padStart(9) +
      `${r.summary.energy.selfConsumptionAfterPct.toFixed(0)}%`.padStart(9) +
      `${r.summary.energy.selfSufficiencyAfterPct.toFixed(0)}%`.padStart(8) +
      `${peakRed.toFixed(1)}kW`.padStart(9),
  );
}

/* ---------------- 7: profile bug checks ---------------- */

console.log("\n=========== 7. PROFILBUGGKONTROLL ===========");
let problems = 0;
const flag = (msg: string) => {
  problems++;
  console.log(`  [AVVIKELSE] ${msg}`);
};
for (const id of ids) {
  const s = series[id]!;
  const c = consumptions[id]!;
  if (s.length !== HOURS_PER_YEAR) flag(`${id}: ${s.length} timmar`);
  if (s.some((v) => !Number.isFinite(v))) flag(`${id}: NaN/Infinity`);
  if (s.some((v) => v < 0)) flag(`${id}: negativ timme`);
  const tot = sum(s);
  if (Math.abs(tot - sum(c.monthlyKWh)) > 1e-6) flag(`${id}: årssumma ${tot} != månadssumma`);
  if (Math.abs(sum(c.monthlyKWh) - ANNUAL) > 0.5)
    flag(`${id}: månadssumma ${sum(c.monthlyKWh)} != ${ANNUAL}`);
  MR.forEach((r, i) => {
    const mSum = sum(s.slice(r.start, r.end));
    if (Math.abs(mSum - (c.monthlyKWh[i] ?? 0)) > 1e-6)
      flag(`${id}: månad ${i + 1} ${mSum} != ${c.monthlyKWh[i]}`);
    if ((r.end - r.start) / 24 !== MONTH_DAYS[i]) flag(`${id}: fel antal dagar månad ${i + 1}`);
  });
  const mean = tot / s.length;
  const spike = Math.max(...s) / mean;
  if (spike > 12) flag(`${id}: extrem timspik ${f(spike, 1)}x medel`);
  // month boundary discontinuity: same hour-of-day+daytype across boundary
  MR.slice(1).forEach((r, i) => {
    const before = s[r.start - 24 + 12]!;
    const after = s[r.start + 12]!;
    const ratio = Math.max(before, after) / Math.max(Math.min(before, after), 1e-9);
    if (ratio > 2.5) flag(`${id}: månadsskifte ${i + 2} hoppar ${f(ratio, 2)}x (kl 12)`);
  });
  // UI chart parity
  const ui = hourWeightsOf(id);
  const def = CUSTOMER_LOAD_PROFILES.find((p) => p.id === id)!;
  const acc = new Array(24).fill(0);
  for (let m = 1; m <= 12; m++) {
    const set = diurnalSetFor(def, m);
    for (let i = 0; i < 24; i++) acc[i] += set.weekday[i]!;
  }
  const mm = sum(acc) / 24;
  const expect = acc.map((v) => v / mm);
  if (ui.some((v, i) => Math.abs(v - expect[i]!) > 1e-9)) flag(`${id}: UI-diagram != profilvikter`);
}
console.log(problems === 0 ? "  Inga avvikelser." : `  ${problems} avvikelser.`);

// UI chart vs engine weekday reality
console.log("\n  UI-diagram vs motorns faktiska vardagsform (korrelation):");
for (const id of ids) {
  const m = metrics.find((x) => x.id === id)!;
  console.log(`    ${id.padEnd(20)} r=${f(corr(hourWeightsOf(id), m.weekdayShape), 4)}`);
}

/* ---------------- HTML charts ---------------- */

const svgBars = (vals: number[], labels: string[], color: string) => {
  const max = Math.max(...vals, 1e-9);
  const w = 14;
  const bars = vals
    .map((v, i) => {
      const hgt = (v / max) * 90;
      return `<rect x="${i * w + 2}" y="${100 - hgt}" width="${w - 3}" height="${hgt}" fill="${color}"/>`;
    })
    .join("");
  const ticks = labels
    .map((l, i) => (l ? `<text x="${i * w + 3}" y="112" font-size="8">${l}</text>` : ""))
    .join("");
  return `<svg viewBox="0 0 ${vals.length * w + 4} 118" width="${vals.length * w + 4}">${bars}${ticks}</svg>`;
};
const hLabels = Array.from({ length: 24 }, (_, i) => (i % 6 === 0 ? String(i).padStart(2, "0") : ""));
const html = `<!doctype html><meta charset="utf-8"><title>Load profile audit</title>
<style>body{font:13px system-ui;margin:24px}h2{margin:24px 0 4px}td{padding:2px 10px;vertical-align:top}th{text-align:left}</style>
<h1>Mr Battery Doc — lastprofiler (produktionsvikter, ${ANNUAL} kWh/år)</h1>
${metrics
  .map(
    (m) => `<h2>${m.label}</h2><table><tr><th>Vardagsdygn</th><th>Helgdygn</th><th>Månad Jan–Dec</th><th>Jan vs Jul (vardag)</th></tr>
<tr><td>${svgBars(m.weekdayShape, hLabels, "#2563eb")}</td>
<td>${svgBars(m.weekendShape, hLabels, "#7c3aed")}</td>
<td>${svgBars(m.monthShares, MN, "#059669")}</td>
<td>${svgBars(m.janShape, hLabels, "#0ea5e9")}<br>${svgBars(m.julShape, hLabels, "#f59e0b")}</td></tr></table>`,
  )
  .join("")}`;
writeFileSync("/mnt/documents/battery-load-profiles.html", html);
console.log("\nDiagram: /mnt/documents/battery-load-profiles.html");
