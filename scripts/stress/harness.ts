/**
 * FINAL MULTI-COUNTRY BATTERY DOC STRESS TEST — read-only audit harness.
 *
 * NOT production code. Imports the engine's public API and internal dispatch for
 * hour-by-hour invariant replay. Changes nothing.
 */
import { runBatteryEngine } from "@/lib/battery-engine";
import type { BatteryEngineInput, BatteryEngineResult } from "@/lib/battery-engine";
import { toLabConfig, toTimeSeries } from "@/lib/battery-engine";
import { computeGridLimits, baseline, dispatch } from "@/lib/lab/dispatch";
import { ancillaryPlan } from "@/lib/lab/ancillary";
import { reserveMarketConfig } from "@/lib/reserve-market";
import { getCountry } from "@/lib/country-config";
import { currencyForCountry } from "@/lib/currency";
import { fcrPriceSeriesForCountry } from "@/lib/lab/ancillary/prices";

export type Market = "SE" | "FI" | "DE" | "DK1" | "DK2";

export interface Scenario {
  id: string;
  tag: string;
  market: Market;
  loadKWh: number;
  pvKWh: number;
  profile: any;
  fuseA: number;
  hsc: number | null;
  strategies: { self: boolean; reduce: boolean; peak: boolean; fcr: boolean };
  econ: "LOW" | "NORMAL" | "HIGH";
  fixedCapacityKWh?: number;
  fixedPowerKw?: number;
}

export function marketToSite(m: Market) {
  if (m === "DK1") return { country: "DK" as const, marketArea: "DK1" as const };
  if (m === "DK2") return { country: "DK" as const, marketArea: "DK2" as const };
  return { country: m as "SE" | "FI" | "DE", marketArea: null };
}

const ECON_FACTOR = { LOW: 0.55, NORMAL: 1, HIGH: 1.8 } as const;

export function buildInput(s: Scenario): BatteryEngineInput {
  const site = marketToSite(s.market);
  const c = getCountry(site.country);
  const f = ECON_FACTOR[s.econ];
  return {
    site: { country: site.country, marketArea: site.marketArea, mainFuseA: s.fuseA },
    consumption: { annualKWh: s.loadKWh, profile: s.profile },
    production: {
      enabled: s.pvKWh > 0,
      annualKWh: s.pvKWh,
      ...(s.hsc !== null ? { measuredSelfConsumptionPct: s.hsc } : {}),
    },
    battery: {
      ...(s.fixedCapacityKWh !== undefined ? { fixedCapacityKWh: s.fixedCapacityKWh } : {}),
      ...(s.fixedPowerKw !== undefined ? { fixedPowerKw: s.fixedPowerKw } : {}),
    },
    strategies: {
      selfConsumption: s.strategies.self,
      reduceImport: s.strategies.reduce,
      peakShaving: s.strategies.peak,
      fcrDUp: s.strategies.fcr,
      optimiseFcrReservation: s.strategies.fcr,
    },
    economy: {
      importEnergyPriceSekPerKWh: c.economy.importPrice * f,
      exportEnergyValueSekPerKWh: c.economy.exportPrice * (s.econ === "LOW" ? 1.3 : 1),
      peakDemandChargeSekPerKwMonth: c.economy.demandCharge > 0 ? c.economy.demandCharge * f : c.economy.demandCharge,
      eurSekRate: c.economy.eurSekRate,
    },
  };
}

const EXPECTED = {
  SE: { mode: "upward", area: "SE", currency: "SEK", product: "FCR_D_UP", dataset: "SE_FCR_D_UP_2025" },
  FI: { mode: "upward", area: "FI", currency: "EUR", product: "FCR_D_UP", dataset: "FI_FCR_D_UP_2025" },
  DE: { mode: "symmetric", area: "DE", currency: "EUR", product: "FCR", dataset: "DE_FCR_2025" },
  DK1: { mode: "symmetric", area: "DK1", currency: "DKK", product: "FCR", dataset: "DK1_FCR_2025" },
  DK2: { mode: "upward", area: "DK2", currency: "DKK", product: "FCR_D_UP", dataset: "DK2_FCR_D_UP_2025" },
} as const;

function finite(v: unknown): boolean {
  return v === null || (typeof v === "number" ? Number.isFinite(v) : true);
}

function scanNumbers(obj: any, path: string, bad: string[], depth = 0) {
  if (depth > 4 || obj === null || obj === undefined) return;
  if (typeof obj === "number") {
    if (!Number.isFinite(obj)) bad.push(path);
    return;
  }
  if (Array.isArray(obj)) {
    for (let i = 0; i < Math.min(obj.length, 24); i++) scanNumbers(obj[i], `${path}[${i}]`, bad, depth + 1);
    return;
  }
  if (typeof obj === "object") {
    for (const k of Object.keys(obj)) scanNumbers(obj[k], `${path}.${k}`, bad, depth + 1);
  }
}

export interface Checked {
  id: string;
  tag: string;
  market: Market;
  load: number;
  pv: number;
  profile: string;
  fuse: number;
  hsc: number | null;
  strat: string;
  econ: string;
  capKWh: number;
  powKw: number;
  physKw: number;
  cRate: number;
  cycles: number;
  benefit: number | null;
  energyBenefit: number;
  peakBenefit: number | null;
  fcrGross: number | null;
  reserveShare: number | null;
  held: number;
  offered: number;
  reservable: number;
  availability: number;
  limiting: string;
  gridClipShare: number;
  capBound: boolean;
  balanceOk: boolean;
  balanceResidual: number;
  socViolations: number;
  importViolations: number;
  exportViolations: number;
  batteryPowerViolations: number;
  maxHourlyBalanceErr: number;
  meanHourlyBalanceErr: number;
  hourlyBalanceViolations: number;
  reserveInvariantViolations: number;
  hourlyReserveViolations: number;
  replayMatch: boolean;
  routingOk: boolean;
  currencyOk: boolean;
  totalMismatch: number;
  reserveLabel: string | null;
  nanFields: string[];
  fail: string[];
  anomalies: string[];
  signature: string;
}

export function checkScenario(s: Scenario): Checked {
  const input = buildInput(s);
  const site = marketToSite(s.market);
  const exp = EXPECTED[s.market];
  const res: BatteryEngineResult = runBatteryEngine(input);
  const sum = res.summary;
  const rec = sum.recommendation;
  const cfg = toLabConfig(input);
  const series = toTimeSeries(cfg, input);
  const fail: string[] = [];
  const anomalies: string[] = [];

  /* ---- routing ---- */
  const rm = reserveMarketConfig(site.country as any, site.marketArea as any);
  const routingOk =
    !!rm &&
    rm.product === exp.product &&
    rm.physics === exp.mode &&
    rm.datasetId === exp.dataset &&
    rm.priceArea === exp.area &&
    cfg.ancillary.reserveMode === exp.mode &&
    (cfg.ancillary as any).priceCountry === exp.area;
  if (!routingOk) fail.push("ROUTING");
  const seriesForArea = fcrPriceSeriesForCountry(exp.area as any);
  if (!seriesForArea) fail.push("PRICE_SERIES_MISSING");

  /* ---- currency ---- */
  const currency = currencyForCountry(site.country);
  const currencyOk = currency === exp.currency && cfg.ancillary.eurSekRate === getCountry(site.country).economy.eurSekRate;
  if (!currencyOk) fail.push("CURRENCY");

  /* ---- hourly replay for physics invariants ---- */
  const capacityKWh = rec.capacityKWh;
  const powerKw = rec.recommendedPowerKw ?? rec.productPowerKw;
  const limits = computeGridLimits(cfg.grid);
  const base = baseline(series, limits);
  void base;
  const replayCfg = {
    ...cfg,
    ancillary: { ...cfg.ancillary, offeredPowerKw: sum.fcr.offeredPowerKw },
  } as typeof cfg;
  const plan = replayCfg.strategies.ancillaryServices ? ancillaryPlan(replayCfg.ancillary) : null;
  const d = dispatch({
    series,
    battery: cfg.battery,
    grid: cfg.grid,
    strategies: cfg.strategies,
    peak: cfg.peakShaving,
    spot: cfg.spot,
    flex: cfg.flex,
    ancillary: plan,
    capacityKWh,
    powerKw,
  } as any);

  const floor = (d.window as any).socFloorKWh ?? 0;
  const ceil = (d.window as any).socCeilKWh ?? capacityKWh;
  let socViol = 0;
  for (const soc of d.socSeries) if (soc < floor - 1e-6 || soc > ceil + 1e-6) socViol++;
  let impViol = 0;
  let expViol = 0;
  for (let h = 0; h < d.importSeries.length; h++) {
    if (d.importSeries[h] > limits.maxImportKw + 1e-6) impViol++;
    if (d.exportSeries[h] > limits.maxExportKw + 1e-6) expViol++;
    if (d.importSeries[h] < -1e-9 || d.exportSeries[h] < -1e-9) impViol++;
    if (d.importSeries[h] > 1e-9 && d.exportSeries[h] > 1e-9) expViol++;
  }
  const t = d.tallies;
  let powViol = 0;
  if (t.maxChargePowerKw > powerKw + 1e-6) powViol++;
  if (t.maxDischargePowerKw > powerKw + 1e-6) powViol++;

  /* Hourly conservation replay.
     r_h = import + pv - load - export - batteryNetAc
     r_h must equal curtailed PV (>=0) minus unserved load (<0, only when the import
     limit binds) plus parasitic standby/self-discharge. A negative residual in an hour
     where the import limit does NOT bind is a conservation violation. */
  const chargeEff = (d.window as any).chargeEff ?? 1;
  const dischargeEff = (d.window as any).dischargeEff ?? 1;
  let maxErr = 0;
  let sumErr = 0;
  let hourViol = 0;
  const n = d.socSeries.length;
  for (let h = 0; h < n; h++) {
    const socPrev = h === 0 ? t.socStart : d.socSeries[h - 1];
    const dSoc = d.socSeries[h] - socPrev;
    const batteryNetAc = dSoc >= 0 ? dSoc / Math.max(chargeEff, 1e-9) : dSoc * Math.max(dischargeEff, 1e-9);
    const imp = d.importSeries[h] ?? 0;
    const exp2 = d.exportSeries[h] ?? 0;
    const pv = series.pv[h] ?? 0;
    const load = series.load[h] ?? 0;
    const standbyKw = capacityKWh > 0 ? Math.max(0, cfg.battery.standbyW ?? 0) / 1000 : 0;
    const r = imp + pv - load - exp2 - batteryNetAc - standbyKw;
    const importBinds = imp >= limits.maxImportKw - 1e-6;
    const exportBinds = exp2 >= limits.maxExportKw - 1e-6;
    const unexplained = r < -1e-3 && !importBinds ? -r : r > 1e-3 && !exportBinds && pv <= load ? r : 0;
    const e = Math.abs(unexplained);
    maxErr = Math.max(maxErr, e);
    sumErr += e;
    if (e > 1e-2) hourViol++;
  }
  if (hourViol > 0) fail.push("HOURLY_CONSERVATION");

  let replayImport = 0;
  for (const v of d.importSeries) replayImport += v;
  const replayMatch = Math.abs(replayImport - sum.energy.importAfterKWh) < 1;

  const balance = sum.energyBalance;
  if (!balance.ok) fail.push("ENERGY_BALANCE");
  if (socViol > 0) fail.push("SOC");
  if (impViol > 0) fail.push("GRID_IMPORT");
  if (expViol > 0) fail.push("GRID_EXPORT");
  if (powViol > 0) fail.push("BATTERY_POWER");

  /* ---- reserve invariants (hour by hour, from the replay) ---- */
  const anc: any = res.diagnostics.simulation.ancillary;
  let resViol = 0;
  let hourlyReserveViol = 0;
  let heldMax = 0;
  if (plan && (plan as any).upPowerKw > 0) {
    const w: any = d.window;
    const offeredPlanKw = (plan as any).upPowerKw as number;
    const upEnergyKWh = (plan as any).upEnergyKWh as number;
    const endurance = offeredPlanKw > 0 ? upEnergyKWh / offeredPlanKw : 0;
    const symmetric = (plan as any).reserveMode === "symmetric";
    for (let h = 0; h < n; h++) {
      const heldH = d.ancillaryReservedPowerKwByHour[h] ?? 0;
      if (heldH <= 1e-9) continue;
      heldMax = Math.max(heldMax, heldH);
      const socPrev = h === 0 ? t.socStart : d.socSeries[h - 1];
      const socLow = Math.min(socPrev, d.socSeries[h]);
      const socHigh = Math.max(socPrev, d.socSeries[h]);
      const imp = d.importSeries[h] ?? 0;
      const exp2 = d.exportSeries[h] ?? 0;
      const gridUp = imp + Math.max(0, limits.maxExportKw - exp2);
      const gridDown = exp2 + Math.max(0, limits.maxImportKw - imp);
      const deliverable = Math.max(0, socLow - w.socFloorKWh) * w.dischargeEff;
      const absorbable = Math.max(0, w.socCeilKWh - socHigh) / Math.max(w.chargeEff, 1e-9);
      const energyUp = endurance > 0 ? deliverable / endurance : w.dischargeKw;
      const energyDown = endurance > 0 ? absorbable / endurance : w.chargeKw;
      const upCap = Math.min(w.dischargeKw, energyUp, gridUp);
      const cap = symmetric ? Math.min(upCap, w.chargeKw, energyDown, gridDown) : upCap;
      if (heldH > cap + 1e-6) hourlyReserveViol++;
    }
  }
  if (hourlyReserveViol > 0) resViol += hourlyReserveViol;
  if (s.strategies.fcr && anc.enabled && anc.reserveMode !== exp.mode) resViol++;
  if (!s.strategies.fcr) {
    if (anc.enabled) resViol++;
    if ((anc.heldPowerAvgKw ?? 0) > 1e-9) resViol++;
    if ((anc.grossKr ?? 0) !== 0 && anc.grossKr !== null) resViol++;
    if ((sum.fcr.monetizedPowerKw ?? 0) > 1e-9) resViol++;
    if (((sum.economy as any).fcrGrossSek ?? 0) > 1e-9) resViol++;
  } else {
    if (anc.monetizedPowerAvgKw > anc.heldPowerAvgKw + 1e-6) resViol++;
    if (anc.heldPowerAvgKw > powerKw + 1e-6) resViol++;
    if (heldMax > powerKw + 1e-6) resViol++;
    if (anc.heldPowerAvgKw > anc.reservablePowerAvgKw + 1e-6) anomalies.push("diag:held>reservable-avg");
    if (exp.mode === "symmetric") {
      const lim = Math.min(anc.reservableUpAvgKw, anc.reservableDownAvgKw);
      if (anc.symmetricHeldPowerKw > lim + 1e-6) anomalies.push("diag:symHeld>min(up,down)-avg");
    }
  }
  if (resViol > 0) fail.push("RESERVE_INVARIANT");

  /* ---- sizing invariants ---- */
  const cRate = capacityKWh > 0 ? powerKw / capacityKWh : 0;
  const physFloorKw = rec.physicalPowerNeedKw ?? 0;
  if (capacityKWh > 0 && !(powerKw > 0)) fail.push("SIZING_POWER_ZERO");
  /* 0.5 C is the ceiling for economic power upsizing. The candidate floor is the physical
     product step, so a small capacity may legitimately sit above 0.5 C — recorded as an
     anomaly, not an invariant breach. A power above 0.5 C that also exceeds the floor is. */
  if (capacityKWh > 0 && cRate > 0.5 + 1e-9) {
    if (powerKw > Math.max(physFloorKw, rec.productPowerKw ?? 0) + 1e-6) fail.push("C_RATE_EXCEEDED");
    else anomalies.push("N:c-rate-above-0.5C-by-product-floor");
  }
  const capBound = capacityKWh > 0 && Math.abs(cRate - 0.5) < 1e-6;

  /* ---- NaN / null money scan ---- */
  const bad: string[] = [];
  scanNumbers(sum.energy, "energy", bad);
  scanNumbers(sum.grid, "grid", bad);
  scanNumbers(sum.peak, "peak", bad);
  scanNumbers(sum.fcr, "fcr", bad);
  scanNumbers(sum.economy, "economy", bad);
  scanNumbers(rec, "recommendation", bad);
  if (bad.length) fail.push("NAN");
  if (!finite(sum.economy.totalOperatingBenefitSek)) fail.push("NAN_TOTAL");

  /* ---- anomalies ---- */
  const total = sum.economy.totalOperatingBenefitSek;
  const fcrGross = (sum.economy as any).fcrGrossSek ?? null;
  const reserveShare = total && total > 0 && fcrGross !== null ? fcrGross / total : null;
  if (reserveShare !== null && reserveShare > 0.9) anomalies.push("A:reserve>90%");
  if (capBound) anomalies.push("B:cap-bound");
  const ladder = [...new Set(res.diagnostics.sweep.results.map((r: any) => r.capacityKWh).filter((c: number) => c > 0))].sort((a, b) => a - b);
  if (capacityKWh > 0 && capacityKWh === ladder[ladder.length - 1]) anomalies.push("C:capacity-at-max");
  if (capacityKWh > 0 && capacityKWh === ladder[0]) anomalies.push("C:capacity-at-min");
  const cycles = sum.energy.equivalentFullCycles;
  if (capacityKWh > 0 && cycles < 20) anomalies.push("E:cycles-low");
  if (cycles > 600) anomalies.push("F:cycles-high");
  const offered = sum.fcr.offeredPowerKw;
  const clipShare = offered > 0 ? sum.fcr.gridClippedAvgKw / offered : 0;
  if (s.strategies.fcr && clipShare > 0.2) anomalies.push("G:grid-clip>20%");
  if (s.strategies.fcr && sum.fcr.availabilityPct < 60) anomalies.push("H:low-availability");
  if (capacityKWh > 0 && rec.physicalPowerNeedKw > 0 && powerKw / rec.physicalPowerNeedKw > 3)
    anomalies.push("M:power-divergence");
  if (total !== null && total < 0) anomalies.push("negative-benefit");

  // total = energy + peak + reserve, one currency only
  const parts = sum.economy.energyBenefitSek + (sum.economy.demandCostSavingSek ?? 0) + (fcrGross ?? 0);
  const totalMismatch = total === null ? 0 : Math.abs(total - parts);
  if (totalMismatch > 1) fail.push("TOTAL_DECOMPOSITION");

  const signature = JSON.stringify([
    capacityKWh,
    powerKw,
    round(sum.energy.importAfterKWh),
    round(sum.energy.exportAfterKWh),
    round(cycles),
    round(sum.economy.energyBenefitSek),
    sum.economy.demandCostSavingSek === null ? null : round(sum.economy.demandCostSavingSek),
    fcrGross === null ? null : round(fcrGross),
    total === null ? null : round(total),
    round(sum.fcr.avgHeldPowerKw),
  ]);

  return {
    id: s.id,
    tag: s.tag,
    market: s.market,
    load: s.loadKWh,
    pv: s.pvKWh,
    profile: String(s.profile),
    fuse: s.fuseA,
    hsc: s.hsc,
    strat: `${s.strategies.self ? "S" : "-"}${s.strategies.reduce ? "R" : "-"}${s.strategies.peak ? "P" : "-"}${s.strategies.fcr ? "F" : "-"}`,
    econ: s.econ,
    capKWh: capacityKWh,
    powKw: powerKw,
    physKw: rec.physicalPowerNeedKw,
    cRate,
    cycles,
    benefit: total,
    energyBenefit: sum.economy.energyBenefitSek,
    peakBenefit: sum.economy.demandCostSavingSek,
    fcrGross,
    reserveShare,
    held: sum.fcr.avgHeldPowerKw,
    offered,
    reservable: sum.fcr.reservablePowerAvgKw,
    availability: sum.fcr.availabilityPct,
    limiting: sum.fcr.limitingFactor,
    gridClipShare: clipShare,
    capBound,
    balanceOk: balance.ok,
    balanceResidual: balance.residualKWh,
    socViolations: socViol,
    importViolations: impViol,
    exportViolations: expViol,
    batteryPowerViolations: powViol,
    maxHourlyBalanceErr: maxErr,
    meanHourlyBalanceErr: sumErr / Math.max(1, n),
    hourlyBalanceViolations: hourViol,
    reserveInvariantViolations: resViol,
    hourlyReserveViolations: hourlyReserveViol,
    replayMatch,
    routingOk,
    currencyOk,
    totalMismatch,
    reserveLabel: sum.fcr.label,
    nanFields: bad.slice(0, 5),
    fail,
    anomalies,
    signature,
  };
}

function round(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}
