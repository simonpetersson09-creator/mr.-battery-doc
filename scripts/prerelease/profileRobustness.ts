/**
 * PRE-RELEASE — SECTION C: PROFILE ROBUSTNESS, READ ONLY.
 *
 * Same customer, same energy, same grid, same economy — only the synthetic load profile
 * is swapped for neighbouring plausible profiles. Reports how much the recommendation
 * moves. The profile model itself is never modified.
 */
import { runBatteryEngine } from "../../src/lib/battery-engine/run";
import type { BatteryEngineInput } from "../../src/lib/battery-engine/types";
import { CUSTOMER_LOAD_PROFILES } from "../../src/lib/lab/loadProfiles";
import type { LoadProfileShape } from "../../src/lib/lab/types";

const PV = [101, 302, 806, 1410, 1813, 2216, 2317, 2014, 1612, 906, 403, 100];
const scale = (a: number[], target: number) => {
  const s = a.reduce((x, y) => x + y, 0);
  return a.map((v) => (v / s) * target);
};

interface Customer {
  name: string;
  annualKWh: number;
  pvKWh: number;
  fuseA: number;
  neighbours: LoadProfileShape[];
}

const HOUSE: LoadProfileShape[] = ["normal", "evening-heavy", "day-heavy", "flat"];
const HEATED: LoadProfileShape[] = ["heat-pump", "direct-electric", "heat-pump-ev", "evening-heavy"];
const EV: LoadProfileShape[] = ["ev-night", "ev-evening", "heat-pump-ev", "evening-heavy"];
const COMM: LoadProfileShape[] = ["office", "retail-restaurant", "workshop", "flat", "low-base-peaks"];

const CUSTOMERS: Customer[] = [
  { name: "Liten villa utan sol", annualKWh: 8000, pvKWh: 0, fuseA: 20, neighbours: HOUSE },
  { name: "Normal villa + sol", annualKWh: 20000, pvKWh: 14000, fuseA: 25, neighbours: HOUSE },
  { name: "Villa värmepump", annualKWh: 28000, pvKWh: 10000, fuseA: 25, neighbours: HEATED },
  { name: "Villa med elbil", annualKWh: 24000, pvKWh: 9000, fuseA: 25, neighbours: EV },
  { name: "Stor villa", annualKWh: 45000, pvKWh: 20000, fuseA: 63, neighbours: HEATED },
  { name: "Litet företag", annualKWh: 120000, pvKWh: 40000, fuseA: 100, neighbours: COMM },
  { name: "Kommersiellt 500 MWh", annualKWh: 500000, pvKWh: 0, fuseA: 200, neighbours: COMM },
];

const known = new Set(CUSTOMER_LOAD_PROFILES.map((p) => p.id));

function build(c: Customer, profile: LoadProfileShape): BatteryEngineInput {
  return {
    site: { country: "SE", mainFuseA: c.fuseA, phases: 3, voltageV: 400 },
    consumption: { annualKWh: c.annualKWh, profile },
    production:
      c.pvKWh > 0
        ? {
            enabled: true,
            monthlyKWh: scale(PV, c.pvKWh),
            annualKWh: c.pvKWh,
            kWp: c.pvKWh / 950,
            inverterAcKw: c.pvKWh / 1150,
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
    },
  };
}

const STEPS = [0, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 300, 400, 500];
const stepIndex = (kWh: number) => {
  let best = 0;
  let bestD = Infinity;
  STEPS.forEach((s, i) => {
    const d = Math.abs(s - kWh);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
};

const pct = (a: number, b: number) => (b === 0 ? (a === 0 ? 0 : 100) : (Math.abs(a - b) / Math.abs(b)) * 100);
const quant = (xs: number[], q: number) => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * (s.length - 1)))]!;
};

let RUNS = 0;
let kwhChanged = 0;
let kwChanged = 0;
let comparisons = 0;
let move1 = 0;
let move2 = 0;
const capDeltasPct: number[] = [];
const benefitDeltasPct: number[] = [];
const sensitive: string[] = [];

console.log("=== C. PROFILROBUSTHET ===");
for (const c of CUSTOMERS) {
  const neighbours = c.neighbours.filter((p) => known.has(p));
  const rows: string[] = [];
  const caps: number[] = [];
  const kws: number[] = [];
  const bens: number[] = [];
  let refCap: number | null = null;
  let refKw: number | null = null;
  let refBen: number | null = null;
  for (const p of neighbours) {
    const r = runBatteryEngine(build(c, p));
    RUNS += 1;
    const rec = r.summary.recommendation;
    const ben = r.summary.economy.annualCustomerBenefitSek ?? 0;
    caps.push(rec.capacityKWh);
    kws.push(rec.powerKw);
    bens.push(ben);
    rows.push(
      `${p}: ${rec.capacityKWh} kWh / ${rec.powerKw} kW, nytta ${Math.round(ben)} kr, ` +
        `egenanv ${r.summary.energy.selfConsumptionAfterPct.toFixed(0)}%, självförs ${r.summary.energy.selfSufficiencyAfterPct.toFixed(0)}%, ` +
        `import ${Math.round(r.summary.energy.importAfterKWh)} kWh, peak ${r.summary.grid.importPeakAfterKw.toFixed(1)} kW, ` +
        `FCR ${r.summary.fcr.offeredPowerKw.toFixed(1)} kW`,
    );
    if (refCap === null) {
      refCap = rec.capacityKWh;
      refKw = rec.powerKw;
      refBen = ben;
      continue;
    }
    comparisons += 1;
    if (rec.capacityKWh !== refCap) kwhChanged += 1;
    if (rec.powerKw !== refKw) kwChanged += 1;
    const steps = Math.abs(stepIndex(rec.capacityKWh) - stepIndex(refCap));
    if (steps === 1) move1 += 1;
    if (steps >= 2) move2 += 1;
    capDeltasPct.push(pct(rec.capacityKWh, refCap));
    benefitDeltasPct.push(pct(ben, refBen ?? 0));
    if (steps >= 2) sensitive.push(`${c.name}: ${p} flyttar rekommendationen ${steps} produktsteg`);
  }
  const spread = Math.max(...caps) - Math.min(...caps);
  console.log(`\n-- ${c.name} (${c.annualKWh} kWh/år, ${c.fuseA} A)`);
  rows.forEach((r) => console.log(`   ${r}`));
  console.log(
    `   spann kWh ${Math.min(...caps)}–${Math.max(...caps)} (${spread}), kW ${Math.min(...kws)}–${Math.max(...kws)}, ` +
      `nytta ${Math.round(Math.min(...bens))}–${Math.round(Math.max(...bens))} kr`,
  );
}

console.log("\n=== SAMMANFATTNING C ===");
console.log(`Körningar: ${RUNS}, jämförelser mot referensprofil: ${comparisons}`);
console.log(`kWh ändras: ${kwhChanged}/${comparisons} (${((kwhChanged / comparisons) * 100).toFixed(0)} %)`);
console.log(`kW ändras:  ${kwChanged}/${comparisons} (${((kwChanged / comparisons) * 100).toFixed(0)} %)`);
console.log(
  `kapacitet: median ${quant(capDeltasPct, 0.5).toFixed(1)} %, p90 ${quant(capDeltasPct, 0.9).toFixed(1)} %, max ${Math.max(...capDeltasPct).toFixed(1)} %`,
);
console.log(
  `kundnytta: median ${quant(benefitDeltasPct, 0.5).toFixed(1)} %, p90 ${quant(benefitDeltasPct, 0.9).toFixed(1)} %, max ${Math.max(...benefitDeltasPct).toFixed(1)} %`,
);
console.log(`1 produktsteg: ${move1}, 2+ produktsteg: ${move2}`);
sensitive.slice(0, 20).forEach((s) => console.log(`   [känslig] ${s}`));
