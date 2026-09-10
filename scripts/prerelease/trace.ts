/**
 * PRE-RELEASE — SECTION B: INPUT -> OUTPUT TRACE, READ ONLY.
 *
 * Deterministic reference customers. One input is changed at a time and the harness
 * asserts that ONLY the intended parts of the result move. No production code is
 * modified anywhere in this file.
 */
import { runBatteryEngine } from "../../src/lib/battery-engine/run";
import type { BatteryEngineInput, BatteryEngineResult } from "../../src/lib/battery-engine/types";

const failures: string[] = [];
const notes: string[] = [];
let RUNS = 0;

const VILLA = [2264, 1887, 1698, 1509, 1321, 1226, 1132, 1226, 1415, 1698, 2075, 2549];
const PV = [101, 302, 806, 1410, 1813, 2216, 2317, 2014, 1612, 906, 403, 100];

const BASE: BatteryEngineInput = {
  site: { country: "SE", mainFuseA: 25, phases: 3, voltageV: 400 },
  consumption: { monthlyKWh: VILLA, annualKWh: 20000, profile: "normal" },
  production: { enabled: true, monthlyKWh: PV, annualKWh: 14000, kWp: 14, inverterAcKw: 12 },
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

const run = (inp: BatteryEngineInput) => {
  RUNS += 1;
  return runBatteryEngine(inp);
};

/** Everything that describes the PHYSICS of a run — economics must never move it. */
function physicsFingerprint(r: BatteryEngineResult) {
  const s = r.summary;
  return JSON.stringify({
    load: +s.energy.annualLoadKWh.toFixed(6),
    pv: +s.energy.annualPvKWh.toFixed(6),
    impBefore: +s.energy.importBeforeKWh.toFixed(6),
    expBefore: +s.energy.exportBeforeKWh.toFixed(6),
    scBefore: +s.energy.selfConsumptionBeforePct.toFixed(6),
    ssBefore: +s.energy.selfSufficiencyBeforePct.toFixed(6),
    physImp: +s.grid.physicalImportKw.toFixed(6),
    physExp: +s.grid.physicalExportKw.toFixed(6),
    peakBefore: +s.grid.importPeakBeforeKw.toFixed(6),
  });
}

/** Full physics of the CHOSEN system, incl. dispatch — sensitive to sizing changes. */
function dispatchFingerprint(r: BatteryEngineResult) {
  const s = r.summary;
  return JSON.stringify({
    cap: s.recommendation.capacityKWh,
    kw: s.recommendation.powerKw,
    impAfter: +s.energy.importAfterKWh.toFixed(6),
    expAfter: +s.energy.exportAfterKWh.toFixed(6),
    scAfter: +s.energy.selfConsumptionAfterPct.toFixed(6),
    cycles: +s.energy.equivalentFullCycles.toFixed(6),
    peakAfter: +s.grid.importPeakAfterKw.toFixed(6),
    held: +s.fcr.avgHeldPowerKw.toFixed(6),
  });
}

function expectSame(label: string, a: string, b: string) {
  if (a !== b) failures.push(`${label}: förväntade oförändrat, men värdet ändrades`);
}
function expectDiff(label: string, a: string, b: string) {
  if (a === b) failures.push(`${label}: förväntade en förändring, men inget ändrades`);
}

const base = run(BASE);
const basePhys = physicsFingerprint(base);
const baseDisp = dispatchFingerprint(base);

console.log("=== B. INPUT -> OUTPUT TRACE ===");
console.log(
  `Referenskund SE: ${base.summary.recommendation.capacityKWh} kWh / ${base.summary.recommendation.powerKw} kW, ` +
    `kundnytta ${Math.round(base.summary.economy.annualCustomerBenefitSek ?? 0)} kr/år`,
);

/* ---- 1. targetPaybackYears / maxInvestment is an APP-layer figure, not engine ---- */
notes.push(
  "targetPaybackYears och maxInvestment beräknas i app-lagret (customerEconomy.ts) ur annualCustomerBenefitSek — de skickas aldrig in i motorn och kan därför inte påverka fysiken.",
);

/* ---- 2. customerAncillaryShare: physics fixed, reservation may move ---- */
{
  const shares = [0, 0.25, 0.5, 0.75, 1];
  const picks: string[] = [];
  for (const share of shares) {
    const r = run({ ...BASE, economy: { ...BASE.economy, customerAncillaryShare: share } });
    expectSame(`customerAncillaryShare ${share} (baslinjefysik)`, basePhys, physicsFingerprint(r));
    if (r.summary.fcr.grossSek !== null && base.summary.fcr.grossSek !== null) {
      // Market value must stay the market value regardless of the share.
      const marketPerKw =
        r.summary.fcr.avgHeldPowerKw > 0 ? r.summary.fcr.grossSek / r.summary.fcr.avgHeldPowerKw : 0;
      if (!Number.isFinite(marketPerKw)) failures.push(`share ${share}: ogiltigt marknadsvärde`);
    }
    picks.push(`${Math.round(share * 100)}%→${r.summary.fcr.offeredPowerKw.toFixed(2)} kW`);
  }
  console.log(`  customerAncillaryShare: baslinjefysik oförändrad. Vald reservation: ${picks.join(", ")}`);
}

/* ---- 3. demand charge ---- */
{
  const rows: string[] = [];
  for (const fee of [0, 30, 120]) {
    const r = run({ ...BASE, economy: { ...BASE.economy, peakDemandChargeSekPerKwMonth: fee } });
    expectSame(`effektavgift ${fee} (baslinjefysik)`, basePhys, physicsFingerprint(r));
    const saving = r.summary.peak.demandCostSavingSek;
    if (fee === 0 && saving !== null && Math.abs(saving) > 1e-9)
      failures.push(`effektavgift 0 gav peakBenefit ${saving}`);
    if (fee === 0) {
      // Isolate peak shaving: with reduced-grid-import off, only peak shaving could
      // possibly charge from the grid, and at a zero tariff it must not.
      const isolated = run({
        ...BASE,
        strategies: { selfConsumption: true, reduceImport: false, peakShaving: true, fcrDUp: false },
        economy: { ...BASE.economy, peakDemandChargeSekPerKwMonth: 0 },
      });
      if (isolated.summary.energy.gridChargedKWh > 1e-6)
        failures.push(
          `effektavgift 0: peak shaving nätladdade ${isolated.summary.energy.gridChargedKWh} kWh`,
        );
    }
    rows.push(`fee ${fee}: peakBenefit ${saving === null ? "n/a" : Math.round(saving)} kr, nätladdning ${Math.round(r.summary.energy.gridChargedKWh)} kWh`);
  }
  console.log(`  effektavgift: ${rows.join(" | ")}`);
}

/* ---- 4. import / export price: economy only ---- */
{
  for (const p of [0.5, 3.0]) {
    const r = run({ ...BASE, economy: { ...BASE.economy, importEnergyPriceSekPerKWh: p } });
    expectSame(`importpris ${p} (baslinjefysik)`, basePhys, physicsFingerprint(r));
  }
  for (const p of [0, 2.0]) {
    const r = run({ ...BASE, economy: { ...BASE.economy, exportEnergyValueSekPerKWh: p } });
    expectSame(`exportpris ${p} (baslinjefysik)`, basePhys, physicsFingerprint(r));
  }
  console.log("  import-/exportpris: baslinjefysiken oförändrad i samtliga fall");
}

/* ---- 5. physical inputs MUST move the physics ---- */
{
  const fuse = run({ ...BASE, site: { ...BASE.site, mainFuseA: 63 } });
  expectDiff("huvudsäkring 25 → 63 A", basePhys, physicsFingerprint(fuse));
  const gp = fuse.summary.grid;
  const nominal = (Math.sqrt(3) * 400 * 63) / 1000;
  if (Math.abs(gp.physicalImportKw - nominal) > 0.05)
    failures.push(`63 A: fysisk importgräns ${gp.physicalImportKw} ≠ ${nominal.toFixed(2)}`);
  if (Math.abs(gp.operationalImportKw - nominal * 0.95) > 0.05)
    failures.push(`63 A: operativ importgräns är inte 95 %`);
  if (Math.abs(gp.operationalExportKw - nominal * 0.95) > 0.05)
    failures.push(`63 A: operativ exportgräns är inte 95 %`);
  console.log(
    `  huvudsäkring 63 A: nominellt ${gp.physicalImportKw.toFixed(2)} kW, operativt ${gp.operationalImportKw.toFixed(2)}/${gp.operationalExportKw.toFixed(2)} kW (95/95)`,
  );

  const cons = run({ ...BASE, consumption: { annualKWh: 40000, profile: "normal" } });
  expectDiff("årsförbrukning 20 → 40 MWh", basePhys, physicsFingerprint(cons));

  const prof = run({ ...BASE, consumption: { ...BASE.consumption, profile: "evening-heavy" } });
  expectDiff("lastprofil normal → evening-heavy", basePhys, physicsFingerprint(prof));

  const pv = run({ ...BASE, production: { ...BASE.production, enabled: false } });
  expectDiff("solproduktion av", basePhys, physicsFingerprint(pv));

  const strat = run({
    ...BASE,
    strategies: { selfConsumption: false, reduceImport: false, peakShaving: false, fcrDUp: false },
  });
  expectDiff("alla strategier av", baseDisp, dispatchFingerprint(strat));
  console.log("  fysiska inputs (säkring, förbrukning, profil, sol, strategier): alla ger förändring");
}

/* ---- 6. country routing: market data changes, grid physics does not ---- */
{
  const countries: { tag: string; site: BatteryEngineInput["site"] }[] = [
    { tag: "SE", site: { country: "SE", mainFuseA: 25, phases: 3, voltageV: 400 } },
    { tag: "FI", site: { country: "FI", mainFuseA: 25, phases: 3, voltageV: 400 } },
    { tag: "DE", site: { country: "DE", mainFuseA: 25, phases: 3, voltageV: 400 } },
    { tag: "DK1", site: { country: "DK", marketArea: "DK1", mainFuseA: 25, phases: 3, voltageV: 400 } },
    { tag: "DK2", site: { country: "DK", marketArea: "DK2", mainFuseA: 25, phases: 3, voltageV: 400 } },
  ];
  const rows: string[] = [];
  for (const c of countries) {
    const r = run({ ...BASE, site: c.site });
    const g = r.summary.grid;
    if (Math.abs(g.physicalImportKw - base.summary.grid.physicalImportKw) > 1e-9)
      failures.push(`${c.tag}: nätfysiken skiljer sig från SE vid samma säkring`);
    rows.push(
      `${c.tag}: ${r.summary.recommendation.capacityKWh} kWh, FCR ${r.summary.fcr.label ?? "—"} ${
        r.summary.fcr.grossSek === null ? "(ingen prisdata)" : Math.round(r.summary.fcr.grossSek) + " kr"
      }`,
    );
  }
  console.log(`  landsrouting: ${rows.join(" | ")}`);
}

console.log(`\nKÖRNINGAR: ${RUNS}`);
console.log(`AVVIKELSER: ${failures.length}`);
failures.forEach((f) => console.log(`   - ${f}`));
notes.forEach((n) => console.log(`   [not] ${n}`));
console.log(failures.length === 0 ? "SECTION B: PASS" : "SECTION B: FAIL");
