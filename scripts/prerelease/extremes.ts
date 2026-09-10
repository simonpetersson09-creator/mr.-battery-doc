/**
 * PRE-RELEASE — SECTIONS F + H: ADVERSARIAL EXTREME CASES, READ ONLY.
 *
 * Sweeps consumption, solar, grid connection, economy, strategies and ancillary customer
 * share and checks every hard invariant. Nothing in src/ is modified or configured by
 * this file; it only calls the public engine entry point.
 */
import { runBatteryEngine } from "../../src/lib/battery-engine/run";
import type { BatteryEngineInput, BatteryEngineResult } from "../../src/lib/battery-engine/types";

const PV_SHAPE = [101, 302, 806, 1410, 1813, 2216, 2317, 2014, 1612, 906, 403, 100];
const LOAD_SHAPE = [2264, 1887, 1698, 1509, 1321, 1226, 1132, 1226, 1415, 1698, 2075, 2549];
const scale = (a: number[], target: number) => {
  const s = a.reduce((x, y) => x + y, 0);
  return a.map((v) => (v / s) * target);
};

const CONSUMPTION = [500, 2000, 8000, 20000, 45000, 100000, 500000, 1200000];
const SOLAR_RATIO = [0, 0.2, 0.7, 2, 4, 6];
const FUSES = [16, 20, 25, 63, 100, 200, 400];
const ECONOMIES: { tag: string; imp: number; exp: number; fee: number }[] = [
  { tag: "imp0", imp: 0, exp: 0.3, fee: 30 },
  { tag: "låg", imp: 0.3, exp: 0.15, fee: 0 },
  { tag: "normal", imp: 1.5, exp: 0.6, fee: 30 },
  { tag: "hög", imp: 6, exp: 1.2, fee: 120 },
  { tag: "exp>imp", imp: 0.4, exp: 1.8, fee: 0 },
  { tag: "exp0", imp: 1.5, exp: 0, fee: 300 },
];
type Strat = NonNullable<BatteryEngineInput["strategies"]>;
const STRATEGIES: { tag: string; s: Strat }[] = [
  { tag: "alla av", s: { selfConsumption: false, reduceImport: false, peakShaving: false, fcrDUp: false } },
  { tag: "egenanv", s: { selfConsumption: true, reduceImport: false, peakShaving: false, fcrDUp: false } },
  { tag: "import", s: { selfConsumption: false, reduceImport: true, peakShaving: false, fcrDUp: false } },
  { tag: "peak", s: { selfConsumption: false, reduceImport: false, peakShaving: true, fcrDUp: false } },
  {
    tag: "fcr",
    s: { selfConsumption: false, reduceImport: false, peakShaving: false, fcrDUp: true, optimiseFcrReservation: true },
  },
  {
    tag: "alla på",
    s: { selfConsumption: true, reduceImport: true, peakShaving: true, fcrDUp: true, optimiseFcrReservation: true },
  },
];
const SHARES = [0, 0.25, 0.5, 0.75, 1];
const MARKETS: { tag: string; country: "SE" | "FI" | "DE" | "DK"; area?: "DK1" | "DK2" }[] = [
  { tag: "SE", country: "SE" },
  { tag: "FI", country: "FI" },
  { tag: "DE", country: "DE" },
  { tag: "DK1", country: "DK", area: "DK1" },
  { tag: "DK2", country: "DK", area: "DK2" },
];

const crashes: string[] = [];
const nonFinite: string[] = [];
const socBreaks: string[] = [];
const balance: string[] = [];
const productCap: string[] = [];
const negatives: string[] = [];
const impossibleReservation: string[] = [];
const badPercent: string[] = [];
const falsePositive: string[] = [];
const shareErrors: string[] = [];
let RUNS = 0;
let negativeBenefitCases = 0;

const fin = (v: unknown) => typeof v === "number" && Number.isFinite(v);

function check(tag: string, r: BatteryEngineResult) {
  const s = r.summary;
  const rec = s.recommendation;
  const e = s.energy;
  const g = s.grid;
  const a = s.fcr;
  const sim = r.diagnostics.simulation;

  for (const [k, v] of Object.entries({
    cap: rec.capacityKWh,
    kw: rec.powerKw,
    impA: e.importAfterKWh,
    expA: e.exportAfterKWh,
    losses: e.batteryLossesKWh,
    cycles: e.equivalentFullCycles,
    peakA: g.importPeakAfterKw,
    held: a.avgHeldPowerKw,
    benefit: s.economy.annualCustomerBenefitSek ?? 0,
  }))
    if (!fin(v)) nonFinite.push(`${tag}: ${k} = ${v}`);

  if (rec.capacityKWh < 0 || rec.powerKw < 0) negatives.push(`${tag}: negativ kWh/kW`);
  if (rec.powerKw > 200 + 1e-9) productCap.push(`${tag}: ${rec.powerKw} kW > 200 kW`);
  if (rec.recommendedPowerKw > 200 + 1e-9) productCap.push(`${tag}: rekommenderad ${rec.recommendedPowerKw} kW > 200`);
  if (!sim.energyBalance.ok) balance.push(`${tag}: energibalans bruten`);

  const cap = rec.capacityKWh;
  if (cap > 0) {
    if (sim.socStartKWh < -1e-6 || sim.socStartKWh > cap + 1e-6)
      socBreaks.push(`${tag}: start-SOC ${sim.socStartKWh.toFixed(4)} utanför 0–${cap}`);
    if (sim.socEndKWh < -1e-6 || sim.socEndKWh > cap + 1e-6)
      socBreaks.push(`${tag}: slut-SOC ${sim.socEndKWh.toFixed(4)} utanför 0–${cap}`);
    // Cyclic year: the evaluated year may not gain energy from SOC_start != SOC_end.
    const tol = Math.max(1e-6, cap * 1e-3);
    if (Math.abs(sim.socDeltaKWh) > tol)
      socBreaks.push(`${tag}: SOC-delta ${sim.socDeltaKWh.toFixed(4)} kWh (tol ${tol.toFixed(4)})`);
  }

  if (a.enabled) {
    if (a.avgHeldPowerKw > a.offeredPowerKw + 1e-6)
      impossibleReservation.push(`${tag}: held ${a.avgHeldPowerKw} > offered ${a.offeredPowerKw}`);
    if (a.monetizedPowerKw > a.avgHeldPowerKw + 1e-6)
      impossibleReservation.push(`${tag}: monetized ${a.monetizedPowerKw} > held ${a.avgHeldPowerKw}`);
    if (a.offeredPowerKw > rec.powerKw + 1e-6)
      impossibleReservation.push(`${tag}: offered ${a.offeredPowerKw} > batterieffekt ${rec.powerKw}`);
    if (a.availabilityPct < -1e-6 || a.availabilityPct > 100 + 1e-6)
      badPercent.push(`${tag}: tillgänglighet ${a.availabilityPct} %`);
  }

  for (const [k, v] of Object.entries({
    scB: e.selfConsumptionBeforePct,
    scA: e.selfConsumptionAfterPct,
    util: e.utilisationPct,
  }))
    if (v < -1e-6 || v > 100 + 1e-6) badPercent.push(`${tag}: ${k} = ${v.toFixed(2)} %`);

  const benefit = s.economy.annualCustomerBenefitSek ?? 0;
  if (benefit <= 0) negativeBenefitCases += 1;
  if (s.economy.hasPositiveCustomerBenefit !== benefit > 0)
    falsePositive.push(`${tag}: positiv-flagga ${s.economy.hasPositiveCustomerBenefit} vid ${benefit.toFixed(0)} kr`);
  if (benefit <= 0 && rec.capacityKWh > 0 && s.economy.hasPositiveCustomerBenefit)
    falsePositive.push(`${tag}: rekommendation presenteras som lönsam vid ${benefit.toFixed(0)} kr`);
}

function build(
  consumption: number,
  solarRatio: number,
  fuseA: number,
  econ: (typeof ECONOMIES)[number],
  strat: Strat,
  market: (typeof MARKETS)[number],
  share = 0.75,
): BatteryEngineInput {
  const pv = consumption * solarRatio;
  return {
    site: {
      country: market.country,
      ...(market.area ? { marketArea: market.area } : {}),
      mainFuseA: fuseA,
      phases: 3,
      voltageV: 400,
    },
    consumption: { monthlyKWh: scale(LOAD_SHAPE, consumption), annualKWh: consumption, profile: "normal" },
    production:
      pv > 0
        ? { enabled: true, monthlyKWh: scale(PV_SHAPE, pv), annualKWh: pv, kWp: pv / 950, inverterAcKw: pv / 1150 }
        : { enabled: false },
    strategies: strat,
    economy: {
      importEnergyPriceSekPerKWh: econ.imp,
      exportEnergyValueSekPerKWh: econ.exp,
      peakDemandChargeSekPerKwMonth: econ.fee,
      peakTariffSource: "user-provided",
      eurSekRate: 11.3,
      customerAncillaryShare: share,
    },
  };
}

function safeRun(tag: string, inp: BatteryEngineInput): BatteryEngineResult | null {
  RUNS += 1;
  try {
    const r = runBatteryEngine(inp);
    check(tag, r);
    return r;
  } catch (err) {
    crashes.push(`${tag}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

console.log("=== H. EXTREMFALL ===");

/* 1. consumption x solar, normal grid/economy, all strategies on */
for (const c of CONSUMPTION)
  for (const ratio of SOLAR_RATIO) {
    const fuse = c <= 8000 ? 25 : c <= 45000 ? 63 : c <= 120000 ? 100 : c <= 600000 ? 200 : 400;
    safeRun(`förbrukning ${c}/sol ${ratio}x`, build(c, ratio, fuse, ECONOMIES[2]!, STRATEGIES[5]!.s, MARKETS[0]!));
  }
console.log(`  förbrukning x sol: ${CONSUMPTION.length * SOLAR_RATIO.length} fall`);

/* 2. grid connection sweep, incl. deliberately undersized connections */
for (const f of FUSES)
  for (const c of [8000, 45000, 500000])
    safeRun(`säkring ${f}A/${c} kWh`, build(c, 0.7, f, ECONOMIES[2]!, STRATEGIES[5]!.s, MARKETS[0]!));
console.log(`  nätanslutning: ${FUSES.length * 3} fall`);

/* 3. economy sweep */
for (const econ of ECONOMIES)
  for (const c of [8000, 45000, 500000])
    safeRun(`ekonomi ${econ.tag}/${c}`, build(c, 0.7, c <= 8000 ? 25 : c <= 45000 ? 63 : 200, econ, STRATEGIES[5]!.s, MARKETS[0]!));
console.log(`  ekonomi: ${ECONOMIES.length * 3} fall`);

/* 4. strategy sweep incl. conflicts */
for (const st of STRATEGIES)
  for (const econ of [ECONOMIES[1]!, ECONOMIES[2]!, ECONOMIES[4]!])
    safeRun(`strategi ${st.tag}/${econ.tag}`, build(20000, 0.7, 25, econ, st.s, MARKETS[0]!));
console.log(`  strategier: ${STRATEGIES.length * 3} fall`);

/* 5. markets */
for (const m of MARKETS)
  for (const c of [20000, 500000])
    safeRun(`marknad ${m.tag}/${c}`, build(c, 0.5, c <= 20000 ? 25 : 200, ECONOMIES[2]!, STRATEGIES[5]!.s, m));
console.log(`  marknader: ${MARKETS.length * 2} fall`);

/* ---------------------------------------------------------------- *
 * F. ANCILLARY / FCR ADVERSARIAL
 * ---------------------------------------------------------------- */
console.log("\n=== F. STÖDTJÄNSTER ===");
for (const m of MARKETS) {
  for (const c of [8000, 20000, 120000, 500000]) {
    const fuse = c <= 8000 ? 20 : c <= 20000 ? 25 : c <= 120000 ? 100 : 200;
    let physRef: string | null = null;
    let priceRef: number | null = null;
    let offeredRef: number | null = null;
    const picks: string[] = [];
    let capRef: number | null = null;
    for (const share of SHARES) {
      const r = safeRun(
        `${m.tag}/${c}/share ${share}`,
        build(c, 0.5, fuse, ECONOMIES[2]!, STRATEGIES[5]!.s, m, share),
      );
      if (!r) continue;
      const a = r.summary.fcr;
      // For the SAME chosen configuration the market value per held kW may never move.
      const perKw = a.grossSek !== null && a.avgHeldPowerKw > 0 ? a.grossSek / a.avgHeldPowerKw : null;
      const phys = JSON.stringify({
        load: +r.summary.energy.annualLoadKWh.toFixed(6),
        impBefore: +r.summary.energy.importBeforeKWh.toFixed(6),
        expBefore: +r.summary.energy.exportBeforeKWh.toFixed(6),
        peakBefore: +r.summary.grid.importPeakBeforeKw.toFixed(6),
      });
      if (physRef === null) {
        physRef = phys;
        capRef = r.summary.recommendation.capacityKWh;
      } else if (phys !== physRef) shareErrors.push(`${m.tag}/${c}: share ${share} ändrade baslinjefysik`);
      // Market price per held kW is a market fact: it may never depend on the share.
      // Only comparable at an IDENTICAL reservation: a different reservation monetises
      // different hours, so the average price per kW legitimately differs.
      if (perKw !== null && (offeredRef === null || offeredRef === a.offeredPowerKw)) {
        offeredRef = a.offeredPowerKw;
        if (priceRef === null) priceRef = perKw;
        else if (Math.abs(perKw - priceRef) > Math.max(1e-6, Math.abs(priceRef) * 1e-6))
          shareErrors.push(`${m.tag}/${c}: share ${share} ändrade marknadspris/kW ${priceRef.toFixed(2)} → ${perKw.toFixed(2)}`);
      }
      picks.push(`${Math.round(share * 100)}%→${r.summary.recommendation.capacityKWh}kWh/${a.offeredPowerKw.toFixed(1)}kW`);
      // FCR must never drive capacity to the ceiling just because the market pays per kW.
      if (capRef !== null && r.summary.recommendation.capacityKWh > capRef * 1.5 + 5)
        shareErrors.push(`${m.tag}/${c}: share ${share} blåste upp kapaciteten ${capRef} → ${r.summary.recommendation.capacityKWh} kWh`);
    }
    console.log(`  ${m.tag} ${String(c).padStart(6)} kWh: ${picks.join(", ")}`);
  }
}

/* ---------------------------------------------------------------- *
 * REPORT
 * ---------------------------------------------------------------- */
const section = (title: string, rows: string[]) => {
  console.log(`${title}: ${rows.length}`);
  rows.slice(0, 12).forEach((x) => console.log(`   - ${x}`));
  if (rows.length > 12) console.log(`   ... +${rows.length - 12}`);
};

console.log("\n=== SAMMANFATTNING F + H ===");
console.log(`SCENARIOKÖRNINGAR: ${RUNS}`);
section("CRASHES", crashes);
section("NAN/INFINITY", nonFinite);
section("SOC-BROTT", socBreaks);
section("ENERGIBALANS", balance);
section("PRODUKTGRÄNS >200 kW", productCap);
section("NEGATIVA kWh/kW", negatives);
section("OMÖJLIGA RESERVATIONER", impossibleReservation);
section("ORIMLIGA PROCENTVÄRDEN", badPercent);
section("FELAKTIGT POSITIVA REKOMMENDATIONER", falsePositive);
section("CUSTOMER SHARE-FEL", shareErrors);
console.log(`Fall med kundnytta <= 0 (korrekt flaggade): ${negativeBenefitCases}`);

const hard =
  crashes.length +
  nonFinite.length +
  socBreaks.length +
  balance.length +
  productCap.length +
  negatives.length +
  impossibleReservation.length +
  badPercent.length +
  falsePositive.length +
  shareErrors.length;
console.log(hard === 0 ? "SECTIONS F + H: PASS" : `SECTIONS F + H: FAIL (${hard})`);
