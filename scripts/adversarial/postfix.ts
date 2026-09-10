/**
 * POST-FIX ENGINE VALIDATION — READ ONLY.
 *
 * Validates the three new model rules (customer-benefit FCR objective, zero-fee peak
 * shaving, negative customer benefit) for regressions. No production code is imported
 * for writing; every figure comes from the normal simulation path.
 */
import { toEconomyConfig, toLabConfig, toTimeSeries } from "../../src/lib/battery-engine/input";
import type { BatteryEngineInput } from "../../src/lib/battery-engine/types";
import { runBatteryEngine } from "../../src/lib/battery-engine/run";
import { computeGridLimits } from "../../src/lib/lab/dispatch";
import {
  annualCustomerBenefitSek,
  customerAncillaryShareOf,
  evaluateOperatingEconomy,
  FCR_TIE_TOLERANCE_SEK,
  optimizeFcrReservation,
} from "../../src/lib/lab/operatingEconomy";
import { simulate } from "../../src/lib/lab/simulate";
import type { LabConfig, SimResult } from "../../src/lib/lab/types";

const r0 = (v: number | null) => (v === null ? "  n/a" : String(Math.round(v)));
const f2 = (v: number) => v.toFixed(2);

let TOTAL = 0;
const fcrMismatch: string[] = [];
const shareErrors: string[] = [];
const peakErrors: string[] = [];
const discontinuities: string[] = [];
const negatives: string[] = [];
const invariantFailures: string[] = [];

const finite = (v: unknown) => typeof v === "number" && Number.isFinite(v);

function checkInvariants(tag: string, cfg: LabConfig, cap: number, kw: number, sim: SimResult) {
  const limits = computeGridLimits(cfg.grid);
  const a = sim.ancillary;
  if (!sim.energyBalance.ok) invariantFailures.push(`${tag}: energy balance`);
  if (sim.dispatchPower.maxChargeKw > kw + 1e-6) invariantFailures.push(`${tag}: charge > power`);
  if (sim.dispatchPower.maxDischargeKw > kw + 1e-6)
    invariantFailures.push(`${tag}: discharge > power`);
  if (sim.grid.maxActualImportKw > limits.maxImportKw + 1e-6)
    invariantFailures.push(`${tag}: import > grid limit`);
  if (sim.grid.maxActualExportKw > limits.maxExportKw + 1e-6)
    invariantFailures.push(`${tag}: export > grid limit`);
  if (a.enabled) {
    if (a.heldPowerAvgKw > a.reservedPowerUpKw + 1e-6)
      invariantFailures.push(`${tag}: held > offered`);
    if (a.monetizedPowerAvgKw > a.heldPowerAvgKw + 1e-6)
      invariantFailures.push(`${tag}: monetized > held`);
    if (a.reservedPowerUpKw > 200 + 1e-9) invariantFailures.push(`${tag}: offered > 200 kW`);
  }
  for (const [k, v] of Object.entries({
    imp: sim.importKWh,
    exp: sim.exportKWh,
    dis: sim.dischargedKWh,
    chg: sim.chargedKWh,
    held: a.heldPowerAvgKw,
  }))
    if (!finite(v)) invariantFailures.push(`${tag}: non-finite ${k}`);
}

/* ------------------------------------------------------------------ *
 * case definitions
 * ------------------------------------------------------------------ */

const VILLA = [2264, 1887, 1698, 1509, 1321, 1226, 1132, 1226, 1415, 1698, 2075, 2549];
const PV = [101, 302, 806, 1410, 1813, 2216, 2317, 2014, 1612, 906, 403, 100];
const COMMERCIAL = new Array(12).fill(250000 / 12);

const ECON = {
  importEnergyPriceSekPerKWh: 1.5,
  exportEnergyValueSekPerKWh: 0.6,
  peakDemandChargeSekPerKwMonth: 30,
  peakTariffSource: "user-provided" as const,
  eurSekRate: 11.3,
};

interface Case {
  name: string;
  input: BatteryEngineInput;
  cap: number;
  kw: number;
}

const MARKETS: { name: string; country: "SE" | "FI" | "DE" | "DK"; area?: string }[] = [
  { name: "SE", country: "SE" },
  { name: "FI", country: "FI" },
  { name: "DE", country: "DE" },
  { name: "DK1", country: "DK", area: "DK1" },
  { name: "DK2", country: "DK", area: "DK2" },
];

function fcrCase(m: (typeof MARKETS)[number], big: boolean): Case {
  return {
    name: `${m.name} ${big ? "kommersiell" : "villa"}`,
    input: {
      site: {
        country: m.country,
        ...(m.area ? { marketArea: m.area as never } : {}),
        mainFuseA: big ? 200 : 25,
        phases: 3,
        voltageV: 400,
      },
      consumption: {
        monthlyKWh: big ? COMMERCIAL : VILLA,
        annualKWh: big ? 250000 : 20000,
        profile: "normal",
      },
      production: big
        ? { enabled: false }
        : { enabled: true, monthlyKWh: PV, annualKWh: 14000, kWp: 14, inverterAcKw: 12 },
      strategies: {
        selfConsumption: true,
        reduceImport: true,
        peakShaving: true,
        fcrDUp: true,
        optimiseFcrReservation: true,
      },
      economy: ECON,
    },
    cap: big ? 100 : 30,
    kw: big ? 50 : 15,
  };
}

const prepare = (inp: BatteryEngineInput) => {
  const cfg = toLabConfig(inp);
  return { cfg, series: toTimeSeries(cfg, inp), econ: toEconomyConfig(inp) };
};

/* ------------------------------------------------------------------ *
 * 1. partial FCR reservation
 * ------------------------------------------------------------------ */

console.log("=== 1. PARTIELL FCR-RESERVATION ===");
const FRACTIONS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];

for (const m of MARKETS) {
  for (const big of [false, true]) {
    const c = fcrCase(m, big);
    const { cfg, series, econ } = prepare(c.input);
    const opt = optimizeFcrReservation(cfg, c.cap, c.kw, econ, FRACTIONS, series);
    TOTAL += opt.candidates.length;
    console.log(`\n-- ${c.name}: ${c.cap} kWh / ${c.kw} kW`);
    console.log("  resv kW | energy | peak | ancCust | customer");
    for (const cand of opt.candidates) {
      const anc = (cand.fcrGrossSek ?? 0) * customerAncillaryShareOf(econ);
      const mark = cand.fraction === opt.best.fraction ? " <= VALD" : "";
      console.log(
        `  ${f2(cand.offeredPowerKw).padStart(7)} | ${r0(cand.energyBenefitSek).padStart(6)} | ${r0(
          cand.peakBenefitSek,
        ).padStart(5)} | ${r0(anc).padStart(7)} | ${r0(cand.annualCustomerBenefitSek).padStart(8)}${mark}`,
      );
      if (cand.annualCustomerBenefitSek <= 0)
        negatives.push(`${c.name} @${cand.offeredPowerKw} kW: ${r0(cand.annualCustomerBenefitSek)} kr`);
    }
    const chosenCfg: LabConfig = {
      ...cfg,
      strategies: { ...cfg.strategies, ancillaryServices: opt.best.offeredPowerKw > 0 },
      ancillary: {
        ...cfg.ancillary,
        enabled: opt.best.offeredPowerKw > 0,
        offeredPowerKw: opt.best.offeredPowerKw,
      },
    };
    checkInvariants(`${c.name} vald`, chosenCfg, c.cap, c.kw, simulate(chosenCfg, series, c.cap, c.kw));
    const best = Math.max(...opt.candidates.map((x) => x.annualCustomerBenefitSek));
    if (opt.best.annualCustomerBenefitSek < best - FCR_TIE_TOLERANCE_SEK)
      fcrMismatch.push(
        `${c.name}: valde ${opt.best.offeredPowerKw} kW (${r0(opt.best.annualCustomerBenefitSek)} kr) mot bästa ${r0(best)} kr`,
      );
  }
}

/* ------------------------------------------------------------------ *
 * 2. customer share
 * ------------------------------------------------------------------ */

console.log("\n=== 2. CUSTOMER SHARE ===");
for (const m of MARKETS.slice(0, 3)) {
  const c = fcrCase(m, false);
  const { cfg, series } = prepare(c.input);
  let physicsRef: { held: number; market: number | null; disch: number } | null = null;
  const chosen: string[] = [];
  for (const share of [0, 0.25, 0.5, 0.75, 1]) {
    const econ = { ...toEconomyConfig(c.input), customerAncillaryShare: share };
    const opt = optimizeFcrReservation(cfg, c.cap, c.kw, econ, FRACTIONS, series);
    TOTAL += 1;
    // Physics is compared at a FIXED reservation so the share cannot move it.
    const fixed = opt.candidates.find((x) => x.fraction === 0.5)!;
    const fixedCfg: LabConfig = {
      ...cfg,
      strategies: { ...cfg.strategies, ancillaryServices: true },
      ancillary: { ...cfg.ancillary, enabled: true, offeredPowerKw: fixed.offeredPowerKw },
    };
    const fixedSim = simulate(fixedCfg, series, c.cap, c.kw);
    const phys = {
      held: fixed.avgHeldPowerKw,
      market: fixed.fcrGrossSek,
      disch: fixedSim.dischargedKWh,
    };
    if (!physicsRef) physicsRef = phys;
    else {
      if (Math.abs(phys.held - physicsRef.held) > 1e-9)
        shareErrors.push(`${c.name} share ${share}: held power ändrades`);
      if ((phys.market ?? 0) !== (physicsRef.market ?? 0))
        shareErrors.push(`${c.name} share ${share}: marknadsvärde ändrades`);
      if (Math.abs(phys.disch - physicsRef.disch) > 1e-9)
        shareErrors.push(`${c.name} share ${share}: urladdning ändrades`);
    }
    const expected = annualCustomerBenefitSek(
      fixed.energyBenefitSek,
      fixed.peakBenefitSek,
      fixed.fcrGrossSek,
      econ,
    );
    if (Math.abs(expected - fixed.annualCustomerBenefitSek) > 1e-6)
      shareErrors.push(`${c.name} share ${share}: kundvärde räknas fel`);
    chosen.push(`${Math.round(share * 100)}%→${f2(opt.best.offeredPowerKw)} kW`);
  }
  console.log(`  ${c.name}: fysik oförändrad vid fast reservation | ekonomiskt val: ${chosen.join(", ")}`);
}

/* ------------------------------------------------------------------ *
 * 3. peak shaving vs demand fee
 * ------------------------------------------------------------------ */

console.log("\n=== 3. PEAK SHAVING ===");
for (const fee of [0, 10, 30, 100, 300]) {
  const inp: BatteryEngineInput = {
    site: { country: "SE", mainFuseA: 63, phases: 3, voltageV: 400 },
    consumption: { monthlyKWh: VILLA, annualKWh: 20000, profile: "normal" },
    production: { enabled: true, monthlyKWh: PV, annualKWh: 14000, kWp: 14, inverterAcKw: 12 },
    strategies: { selfConsumption: true, reduceImport: true, peakShaving: true, fcrDUp: false },
    economy: { ...ECON, peakDemandChargeSekPerKwMonth: fee },
  };
  const { cfg, series, econ } = prepare(inp);
  const e = evaluateOperatingEconomy(cfg, 20, 10, econ, series);
  TOTAL += 1;
  const cust = annualCustomerBenefitSek(
    e.economy.energy.energyBenefitSek,
    e.economy.peak.annualPeakBenefitSek,
    e.economy.fcr.grossSek,
    econ,
  );
  const gridCharged = e.result.chargedFromGridKWh;
  const peakKw = e.economy.peak.monthlyReductionKw.reduce((a, b) => Math.max(a, b), 0);
  console.log(
    `  fee ${String(fee).padStart(3)} kr/kW/mån | grid charged ${r0(gridCharged).padStart(5)} kWh | energy ${r0(
      e.economy.energy.energyBenefitSek,
    ).padStart(5)} | peak ${r0(e.economy.peak.annualPeakBenefitSek).padStart(6)} | customer ${r0(cust).padStart(6)} | max peak red ${f2(peakKw)} kW`,
  );
  checkInvariants(`peak fee ${fee}`, cfg, 20, 10, e.result);
  if (fee === 0 && gridCharged > 1e-6) peakErrors.push(`fee 0: nätladdning ${r0(gridCharged)} kWh`);
  if (peakKw > 10 + 1e-6) peakErrors.push(`fee ${fee}: peakreduktion ${f2(peakKw)} kW > batterieffekt`);
  // Double counting guard: the peak value must be the signed monthly kW * tariff, nothing else.
  const expectedPeak =
    econ.peakDemandChargeSekPerKwMonth === null
      ? null
      : e.economy.peak.monthlyReductionKw.reduce((a, kw) => a + kw * econ.peakDemandChargeSekPerKwMonth!, 0);
  if (
    expectedPeak !== null &&
    Math.abs((e.economy.peak.annualPeakBenefitSek ?? 0) - expectedPeak) > 1e-6
  )
    peakErrors.push(`fee ${fee}: peakvärde stämmer inte med tariff * kW`);
}

/* ------------------------------------------------------------------ *
 * 4. positive / negative cases, before vs after
 * ------------------------------------------------------------------ */

console.log("\n=== 4. POSITIVA OCH NEGATIVA FALL ===");
const profileCases: { name: string; input: BatteryEngineInput }[] = [
  { name: "normal villa SE", input: fcrCase(MARKETS[0]!, false).input },
  { name: "stor kommersiell SE", input: fcrCase(MARKETS[0]!, true).input },
  {
    name: "låg positiv (billig el)",
    input: {
      ...fcrCase(MARKETS[0]!, false).input,
      strategies: { selfConsumption: true, reduceImport: true, peakShaving: true, fcrDUp: false },
      economy: { ...ECON, importEnergyPriceSekPerKWh: 0.55, peakDemandChargeSekPerKwMonth: 5 },
    },
  },
  {
    name: "negativ (export värd mer)",
    input: {
      ...fcrCase(MARKETS[0]!, false).input,
      strategies: { selfConsumption: true, reduceImport: true, peakShaving: true, fcrDUp: false },
      economy: {
        ...ECON,
        importEnergyPriceSekPerKWh: 0.05,
        exportEnergyValueSekPerKWh: 0.9,
        peakDemandChargeSekPerKwMonth: 0,
      },
    },
  },
  { name: "FCR-dominerad DK2", input: fcrCase(MARKETS[4]!, true).input },
];
for (const p of profileCases) {
  const res = runBatteryEngine(p.input);
  TOTAL += 1;
  const e = res.summary.economy;
  const rec = res.summary.recommendation;
  console.log(
    `  ${p.name.padEnd(24)} ${String(rec.capacityKWh).padStart(4)} kWh / ${f2(rec.powerKw).padStart(6)} kW | customer ${r0(
      e.annualCustomerBenefitSek,
    ).padStart(6)} kr | positive ${e.hasPositiveCustomerBenefit}`,
  );
  if ((e.annualCustomerBenefitSek ?? 0) <= 0) negatives.push(`${p.name}: ${r0(e.annualCustomerBenefitSek)} kr`);
  if (e.hasPositiveCustomerBenefit !== ((e.annualCustomerBenefitSek ?? 0) > 0))
    invariantFailures.push(`${p.name}: positiv-flagga stämmer inte med kundnyttan`);
  if (rec.powerKw > 200 + 1e-9) invariantFailures.push(`${p.name}: rekommenderad effekt > 200 kW`);
}

/* ------------------------------------------------------------------ *
 * 5. discontinuities around candidate steps
 * ------------------------------------------------------------------ */

console.log("\n=== 5. DISCONTINUITIES ===");
{
  const c = fcrCase(MARKETS[0]!, false);
  const { cfg, series, econ } = prepare(c.input);
  const caps = [10, 15, 20, 25, 30, 40, 50];
  let prev: { cap: number; cust: number; resv: number; energy: number } | null = null;
  for (const cap of caps) {
    const kw = Math.min(cap * 0.5, 200);
    const opt = optimizeFcrReservation(cfg, cap, kw, econ, FRACTIONS, series);
    TOTAL += 1;
    const b = opt.best;
    console.log(
      `  ${String(cap).padStart(3)} kWh / ${f2(kw).padStart(5)} kW | resv ${f2(b.offeredPowerKw).padStart(6)} kW | energy ${r0(
        b.energyBenefitSek,
      ).padStart(5)} | customer ${r0(b.annualCustomerBenefitSek).padStart(6)}`,
    );
    if (prev) {
      if (b.annualCustomerBenefitSek < prev.cust - 25)
        discontinuities.push(
          `${prev.cap} → ${cap} kWh: kundnyttan faller ${r0(prev.cust - b.annualCustomerBenefitSek)} kr`,
        );
      if (prev.energy > 100 && b.energyBenefitSek < prev.energy * 0.5)
        discontinuities.push(
          `${prev.cap} → ${cap} kWh: energinyttan kollapsar ${r0(prev.energy)} → ${r0(b.energyBenefitSek)} kr`,
        );
    }
    prev = { cap, cust: b.annualCustomerBenefitSek, resv: b.offeredPowerKw, energy: b.energyBenefitSek };
  }
  // Power sweep at a fixed capacity.
  let pprev: { kw: number; cust: number } | null = null;
  for (const kw of [5, 7.5, 10, 15, 20, 25]) {
    const opt = optimizeFcrReservation(cfg, 30, kw, econ, FRACTIONS, series);
    TOTAL += 1;
    const b = opt.best;
    console.log(
      `  30 kWh / ${f2(kw).padStart(5)} kW | resv ${f2(b.offeredPowerKw).padStart(6)} kW | customer ${r0(
        b.annualCustomerBenefitSek,
      ).padStart(6)}`,
    );
    if (pprev && b.annualCustomerBenefitSek < pprev.cust - 25)
      discontinuities.push(
        `${pprev.kw} → ${kw} kW: kundnyttan faller ${r0(pprev.cust - b.annualCustomerBenefitSek)} kr`,
      );
    pprev = { kw, cust: b.annualCustomerBenefitSek };
  }
}

/* ------------------------------------------------------------------ *
 * 6/7. summary
 * ------------------------------------------------------------------ */

const section = (title: string, rows: string[]) => {
  console.log(`\n${title}: ${rows.length}`);
  rows.slice(0, 15).forEach((x) => console.log(`   - ${x}`));
  if (rows.length > 15) console.log(`   ... +${rows.length - 15}`);
};

console.log("\n=== 7. SLUTRAPPORT ===");
console.log(`TOTAL CASES: ${TOTAL}`);
section("FCR OPTIMUM MISMATCHES", fcrMismatch);
section("CUSTOMER SHARE PHYSICS ERRORS", shareErrors);
section("PEAK ECONOMICS ERRORS", peakErrors);
section("NEW DISCONTINUITIES", discontinuities);
section("NEGATIVE BENEFIT CASES", negatives);
section("HARD INVARIANT FAILURES", invariantFailures);
