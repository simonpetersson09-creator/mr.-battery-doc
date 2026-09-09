/** Determinism, three-alternative and cross-country checks. Read-only. */
import { runBatteryEngine } from "@/lib/battery-engine";
import { computeBatteryAlternatives } from "@/lib/battery-app/capacityAlternatives";
import { buildInput, checkScenario, type Market, type Scenario } from "./harness";
import { buildScenarios } from "./scenarios";

const all = buildScenarios();
const mode = process.argv[2];

function sig(s: Scenario) {
  return checkScenario(s).signature;
}

if (mode === "determinism") {
  const picks: Scenario[] = [];
  for (let i = 0; i < all.length && picks.length < 50; i += Math.floor(all.length / 50)) picks.push(all[i]);
  let bad = 0;
  const diffs: string[] = [];
  for (const s of picks) {
    const a = sig(s);
    const b = sig(s);
    if (a !== b) {
      bad++;
      diffs.push(`${s.id}: ${a} != ${b}`);
    }
  }
  console.log(JSON.stringify({ checked: picks.length, nondeterministic: bad, diffs }));
}

if (mode === "alternatives") {
  const markets: Market[] = ["SE", "FI", "DE", "DK1", "DK2"];
  const rows: any[] = [];
  for (const m of markets) {
    for (const [load, pv, fuse] of [
      [20000, 14000, 25],
      [10000, 0, 16],
      [40000, 20000, 63],
      [5000, 5000, 20],
    ] as [number, number, number][]) {
      const s: Scenario = {
        id: `ALT-${m}-${load}-${pv}-${fuse}`,
        tag: "alternatives",
        market: m,
        loadKWh: load,
        pvKWh: pv,
        profile: "normal",
        fuseA: fuse,
        hsc: null,
        strategies: { self: true, reduce: true, peak: true, fcr: true },
        econ: "NORMAL",
      };
      const input = buildInput(s);
      const res = runBatteryEngine(input);
      const alts = computeBatteryAlternatives(input, res);
      const rec = res.summary.recommendation;
      const mid = alts.find((a) => a.level === "recommended")!;
      const lower = alts.find((a) => a.level === "lower");
      const higher = alts.find((a) => a.level === "higher");
      const ordered =
        (!lower || lower.capacityKWh < mid.capacityKWh) &&
        (!higher || higher.capacityKWh > mid.capacityKWh);
      const midMatch =
        mid.capacityKWh === rec.capacityKWh &&
        mid.powerKw === (rec.recommendedPowerKw ?? rec.productPowerKw) &&
        mid.annualBenefitSek === res.summary.economy.totalOperatingBenefitSek;
      rows.push({
        id: s.id,
        market: m,
        levels: alts.map((a) => `${a.level}:${a.capacityKWh}kWh/${a.powerKw}kW/${a.annualBenefitSek === null ? "null" : Math.round(a.annualBenefitSek)}`),
        ordered,
        midMatch,
      });
    }
  }
  console.log(JSON.stringify(rows, null, 1));
}

if (mode === "cross") {
  const markets: Market[] = ["SE", "FI", "DE", "DK1", "DK2"];
  for (const fcr of [true, false]) {
    for (const pv of [14000, 0]) {
      const rows = markets.map((m) => {
        const s: Scenario = {
          id: `X-${m}`,
          tag: "cross",
          market: m,
          loadKWh: 20000,
          pvKWh: pv,
          profile: "normal",
          fuseA: 25,
          hsc: null,
          strategies: { self: true, reduce: true, peak: true, fcr },
          econ: "NORMAL",
        };
        const res = runBatteryEngine(buildInput(s));
        const sim = res.diagnostics.simulation;
        return {
          market: m,
          fcr,
          pv,
          cap: res.summary.recommendation.capacityKWh,
          kw: res.summary.recommendation.recommendedPowerKw,
          baseImport: Math.round(sim.baseImportKWh * 100) / 100,
          baseExport: Math.round(sim.baseExportKWh * 100) / 100,
          basePeak: Math.round(sim.baseModelledPeakKw * 1000) / 1000,
          importAfter: Math.round(sim.importKWh * 100) / 100,
          cycles: Math.round(sim.equivalentFullCycles * 100) / 100,
          reserveMode: (sim.ancillary as any).reserveMode,
          held: Math.round((sim.ancillary as any).heldPowerAvgKw * 1000) / 1000,
          fcrGross: (res.summary.economy as any).fcrGrossSek,
          total: res.summary.economy.totalOperatingBenefitSek,
        };
      });
      console.log(JSON.stringify(rows, null, 1));
    }
  }
}
