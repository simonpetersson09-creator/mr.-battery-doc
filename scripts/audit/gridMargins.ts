/**
 * GRID DESIGN MARGIN SENSITIVITY AUDIT — read-only.
 *
 * Runs the SAME scenarios through three grid-margin variants:
 *   A 90/95 (current baseline)  B 95/95  C 100/100
 * Nothing else is varied and no production code is touched: the margins are supplied
 * through the public engine input (site.importMarginPct / site.exportMarginPct).
 */
import { runBatteryEngine } from "@/lib/battery-engine";
import type { BatteryEngineInput } from "@/lib/battery-engine";
import { getCountry } from "@/lib/country-config";
import {
  customerEconomyFromResult,
  maxInvestmentSek,
  DEFAULT_CUSTOMER_ANCILLARY_SHARE,
  DEFAULT_TARGET_PAYBACK_YEARS,
} from "@/lib/battery-app/customerEconomy";

export type Market = "SE" | "FI" | "DE" | "DK1" | "DK2";

export interface Variant {
  key: "A" | "B" | "C";
  imp: number;
  exp: number;
}
export const VARIANTS: Variant[] = [
  { key: "A", imp: 90, exp: 95 },
  { key: "B", imp: 95, exp: 95 },
  { key: "C", imp: 100, exp: 100 },
];
/** Isolation variants: only one margin moves at a time. */
export const ISO_VARIANTS: Variant[] = [
  { key: "A", imp: 100, exp: 95 }, // import only -> 100
  { key: "B", imp: 90, exp: 100 }, // export only -> 100
];

export interface Scenario {
  id: string;
  family: string;
  market: Market;
  loadKWh: number;
  pvKWh: number;
  profile: string;
  fuseA: number;
  strategies: { self: boolean; reduce: boolean; peak: boolean; fcr: boolean };
  demandCharge?: number | null;
}

const MARKETS: Market[] = ["SE", "FI", "DE", "DK1", "DK2"];
const PROFILES = [
  "normal",
  "evening-heavy",
  "day-heavy",
  "heat-pump",
  "direct-electric",
  "heat-pump-ev",
  "ev-night",
  "ev-evening",
  "pool-summer",
  "office",
  "retail-restaurant",
  "workshop",
];
const STRATS: { name: string; v: Scenario["strategies"] }[] = [
  { name: "all", v: { self: true, reduce: true, peak: true, fcr: true } },
  { name: "self", v: { self: true, reduce: false, peak: false, fcr: false } },
  { name: "reduce", v: { self: false, reduce: true, peak: false, fcr: false } },
  { name: "peak", v: { self: false, reduce: false, peak: true, fcr: false } },
  { name: "fcr", v: { self: false, reduce: false, peak: false, fcr: true } },
  { name: "self+peak", v: { self: true, reduce: true, peak: true, fcr: false } },
  { name: "self+fcr", v: { self: true, reduce: true, peak: false, fcr: true } },
];
const FUSES = [16, 20, 25, 35, 50, 63, 80, 100, 125, 160, 200, 250, 400];

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function fitFuse(loadKWh: number, tightness: number): number {
  const avgKw = loadKWh / 8760;
  const target = avgKw * tightness;
  return FUSES.find((f) => f * 400 * Math.sqrt(3) * 0.001 >= target) ?? 400;
}

export function buildScenarios(): Scenario[] {
  const out: Scenario[] = [];
  let i = 0;
  const push = (s: Omit<Scenario, "id">) =>
    out.push({ ...s, id: `G${String(i++).padStart(5, "0")}` });
  const rnd = lcg(20260911);

  const LOADS = [2000, 5000, 12000, 25000, 60000, 150000, 400000, 900000];
  const PV = [0, 0.3, 1.0, 2.0];
  // 1. core: market x load x pv, three fuse tightness levels (tight = near the grid limit)
  for (const m of MARKETS)
    for (const load of LOADS)
      for (const ratio of PV)
        for (const tight of [3, 6, 12]) {
          push({
            family: "core",
            market: m,
            loadKWh: load,
            pvKWh: Math.round(load * ratio),
            profile: PROFILES[Math.floor(rnd() * PROFILES.length)],
            fuseA: fitFuse(load, tight),
            strategies: STRATS[Math.floor(rnd() * STRATS.length)].v,
          });
        }

  // 2. profiles x strategies, SE + DE, villa and commercial size
  for (const m of ["SE", "DE"] as Market[])
    for (const p of PROFILES)
      for (const load of [15000, 200000])
        for (const st of STRATS)
          push({
            family: "profile",
            market: m,
            loadKWh: load,
            pvKWh: Math.round(load * 0.6),
            profile: p,
            fuseA: fitFuse(load, 5),
            strategies: st.v,
          });

  // 3. export-bound: very high PV against small fuses
  for (const m of MARKETS)
    for (const load of [10000, 40000, 150000])
      for (const ratio of [2.5, 4, 6])
        for (const tight of [3, 4]) {
          push({
            family: "export-bound",
            market: m,
            loadKWh: load,
            pvKWh: Math.round(load * ratio),
            profile: "day-heavy",
            fuseA: fitFuse(load, tight),
            strategies: { self: true, reduce: true, peak: true, fcr: true },
          });
        }

  // 4. import-bound: undersized fuse, no PV
  for (const m of MARKETS)
    for (const load of [12000, 50000, 200000, 600000])
      for (const tight of [2, 2.5, 3])
        push({
          family: "import-bound",
          market: m,
          loadKWh: load,
          pvKWh: 0,
          profile: "heat-pump-ev",
          fuseA: fitFuse(load, tight),
          strategies: { self: true, reduce: true, peak: true, fcr: true },
        });

  // 5. peak / demand-charge sweep incl. demandFee = 0
  for (const m of MARKETS)
    for (const fee of [0, 30, 100])
      for (const load of [20000, 120000, 500000])
        push({
          family: "peak-fee",
          market: m,
          loadKWh: load,
          pvKWh: Math.round(load * 0.4),
          profile: "workshop",
          fuseA: fitFuse(load, 4),
          strategies: { self: true, reduce: true, peak: true, fcr: false },
          demandCharge: fee,
        });

  // 6. FCR-heavy: grid headroom matters most for the reservation
  for (const m of MARKETS)
    for (const load of [30000, 100000, 300000])
      for (const tight of [3, 5, 8])
        push({
          family: "fcr",
          market: m,
          loadKWh: load,
          pvKWh: Math.round(load * 0.5),
          profile: "office",
          fuseA: fitFuse(load, tight),
          strategies: { self: true, reduce: true, peak: true, fcr: true },
        });

  // 7. extreme but allowed
  for (const m of MARKETS)
    for (const [load, pv, fuse] of [
      [1500, 0, 16],
      [3000, 9000, 16],
      [800000, 400000, 250],
      [1200000, 0, 400],
      [250000, 750000, 100],
    ] as number[][])
      push({
        family: "extreme",
        market: m,
        loadKWh: load,
        pvKWh: pv,
        profile: "normal",
        fuseA: fuse,
        strategies: { self: true, reduce: true, peak: true, fcr: true },
      });

  return out;
}

function marketToSite(m: Market) {
  if (m === "DK1") return { country: "DK" as const, marketArea: "DK1" as const };
  if (m === "DK2") return { country: "DK" as const, marketArea: "DK2" as const };
  return { country: m as "SE" | "FI" | "DE", marketArea: null };
}

export function buildInput(s: Scenario, v: Variant): BatteryEngineInput {
  const site = marketToSite(s.market);
  const c = getCountry(site.country);
  return {
    site: {
      country: site.country,
      marketArea: site.marketArea,
      mainFuseA: s.fuseA,
      importMarginPct: v.imp,
      exportMarginPct: v.exp,
    },
    consumption: { annualKWh: s.loadKWh, profile: s.profile as never },
    production: { enabled: s.pvKWh > 0, annualKWh: s.pvKWh },
    strategies: {
      selfConsumption: s.strategies.self,
      reduceImport: s.strategies.reduce,
      peakShaving: s.strategies.peak,
      fcrDUp: s.strategies.fcr,
      optimiseFcrReservation: s.strategies.fcr,
    },
    economy: {
      importEnergyPriceSekPerKWh: c.economy.importPrice,
      exportEnergyValueSekPerKWh: c.economy.exportPrice,
      peakDemandChargeSekPerKwMonth:
        s.demandCharge === undefined ? c.economy.demandCharge : s.demandCharge,
      eurSekRate: c.economy.eurSekRate,
    },
  } as BatteryEngineInput;
}

export interface Metrics {
  capKWh: number;
  powKw: number;
  physKw: number;
  opImportKw: number;
  opExportKw: number;
  importBoundHours: number;
  exportBoundHours: number;
  maxImportKw: number;
  maxExportKw: number;
  curtailed: number;
  unserved: number;
  peakReductionKw: number;
  gridChargedKWh: number;
  chargedKWh: number;
  dischargedKWh: number;
  cycles: number;
  energyBenefit: number;
  peakBenefit: number;
  fcrCustomerValue: number;
  customerBenefit: number;
  maxInvestment: number;
  fcrOffered: number;
  fcrHeld: number;
  fail: string[];
}

function num(x: number | null | undefined): number {
  return typeof x === "number" && Number.isFinite(x) ? x : 0;
}

export function runVariant(s: Scenario, v: Variant): Metrics {
  const input = buildInput(s, v);
  const res = runBatteryEngine(input);
  const sum = res.summary;
  const rec = sum.recommendation;
  const sim = res.diagnostics.simulation;
  const cust = customerEconomyFromResult(res, DEFAULT_CUSTOMER_ANCILLARY_SHARE);
  const fail: string[] = [];

  const powerKw = rec.recommendedPowerKw ?? rec.productPowerKw;
  if (!sum.energyBalance.ok) fail.push("ENERGY_BALANCE");
  for (const x of [
    rec.capacityKWh,
    powerKw,
    sum.energy.importAfterKWh,
    sum.energy.exportAfterKWh,
    sum.economy.energyBenefitSek,
  ])
    if (!Number.isFinite(x)) fail.push("NAN");
  if (sim.socStartKWh < -1e-6 || sim.socEndKWh < -1e-6) fail.push("SOC_NEGATIVE");
  if (sim.socStartKWh > rec.capacityKWh + 1e-6 || sim.socEndKWh > rec.capacityKWh + 1e-6)
    fail.push("SOC_ABOVE_CAPACITY");
  if (powerKw > rec.maxProductPowerKw + 1e-6) fail.push("PRODUCT_POWER_ABOVE_CAP");
  if (rec.capacityKWh > 0 && powerKw / rec.capacityKWh > 0.5 + 1e-9) fail.push("C_RATE");
  // grid limit must be respected against the margin ACTUALLY tested
  const g = sim.grid;
  const expectedImp = g.physicalImportKw * (v.imp / 100);
  const expectedExp = g.physicalExportKw * (v.exp / 100);
  if (Math.abs(g.operationalImportKw - expectedImp) > 1e-6) fail.push("IMPORT_LIMIT_WRONG");
  if (Math.abs(g.operationalExportKw - expectedExp) > 1e-6) fail.push("EXPORT_LIMIT_WRONG");
  if (g.maxActualImportKw > g.operationalImportKw + 1e-6) fail.push("IMPORT_OVER_LIMIT");
  if (g.maxActualExportKw > g.operationalExportKw + 1e-6) fail.push("EXPORT_OVER_LIMIT");

  return {
    capKWh: rec.capacityKWh,
    powKw: powerKw,
    physKw: rec.physicalPowerNeedKw,
    opImportKw: g.operationalImportKw,
    opExportKw: g.operationalExportKw,
    importBoundHours: g.importBoundHours,
    exportBoundHours: g.exportBoundHours,
    maxImportKw: g.maxActualImportKw,
    maxExportKw: g.maxActualExportKw,
    curtailed: num(sum.grid.exportCurtailedKWh),
    unserved: num(sum.grid.unservedLoadKWh),
    peakReductionKw: num(sum.peak.peakReductionKw),
    gridChargedKWh: num(sum.energy.gridChargedKWh),
    chargedKWh: num(sim.chargedKWh),
    dischargedKWh: num(sim.dischargedKWh),
    cycles: num(sum.energy.equivalentFullCycles),
    energyBenefit: num(sum.economy.energyBenefitSek),
    peakBenefit: num(sum.economy.demandCostSavingSek),
    fcrCustomerValue: num(cust.ancillaryCustomerValueSek),
    customerBenefit: num(cust.totalCustomerBenefitSek),
    maxInvestment: num(maxInvestmentSek(cust.totalCustomerBenefitSek, DEFAULT_TARGET_PAYBACK_YEARS)),
    fcrOffered: num(sum.fcr.offeredPowerKw),
    fcrHeld: num(sum.fcr.avgHeldPowerKw),
    fail,
  };
}
