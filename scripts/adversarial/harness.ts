/**
 * ADVERSARIAL ENGINE AUDIT — read-only harness.
 *
 * NOT production code and never imported by the app. It runs the frozen Battery Engine
 * through a large deterministic matrix, replays the dispatch hour by hour and records
 * physical invariants, sizing semantics, marginal utility and customer economics.
 * It changes nothing in the engine.
 */
import { runBatteryEngine, toLabConfig, toTimeSeries } from "@/lib/battery-engine";
import type { BatteryEngineInput, BatteryEngineResult } from "@/lib/battery-engine";
import { computeGridLimits, dispatch } from "@/lib/lab/dispatch";
import { ancillaryPlan } from "@/lib/lab/ancillary";
import { getCountry } from "@/lib/country-config";
import { currencyForCountry } from "@/lib/currency";
import {
  customerEconomyFromResult,
  maxInvestmentSek,
  DEFAULT_CUSTOMER_ANCILLARY_SHARE,
  DEFAULT_TARGET_PAYBACK_YEARS,
} from "@/lib/battery-app/customerEconomy";
import { computeBatteryAlternatives } from "@/lib/battery-app/capacityAlternatives";

export type Market = "SE" | "FI" | "DE" | "DK1" | "DK2";

export interface AdvScenario {
  id: string;
  family: string;
  market: Market;
  loadKWh: number;
  pvKWh: number;
  profile: string;
  fuseA: number;
  strategies: { self: boolean; reduce: boolean; peak: boolean; fcr: boolean };
  importPrice?: number;
  exportPrice?: number;
  demandCharge?: number | null;
  share?: number;
  payback?: number;
  fixedCapacityKWh?: number;
  fixedPowerKw?: number;
  /** Run the presentation-layer alternatives (3 extra engine runs). */
  withAlternatives?: boolean;
  /** Skip the hourly replay (used by the cheap sweeps). */
  noReplay?: boolean;
}

export function marketToSite(m: Market) {
  if (m === "DK1") return { country: "DK" as const, marketArea: "DK1" as const };
  if (m === "DK2") return { country: "DK" as const, marketArea: "DK2" as const };
  return { country: m as "SE" | "FI" | "DE", marketArea: null };
}

export function buildInput(s: AdvScenario): BatteryEngineInput {
  const site = marketToSite(s.market);
  const c = getCountry(site.country);
  return {
    site: { country: site.country, marketArea: site.marketArea, mainFuseA: s.fuseA },
    consumption: { annualKWh: s.loadKWh, profile: s.profile as never },
    production: { enabled: s.pvKWh > 0, annualKWh: s.pvKWh },
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
      importEnergyPriceSekPerKWh: s.importPrice ?? c.economy.importPrice,
      exportEnergyValueSekPerKWh: s.exportPrice ?? c.economy.exportPrice,
      peakDemandChargeSekPerKwMonth:
        s.demandCharge === undefined ? c.economy.demandCharge : s.demandCharge,
      eurSekRate: c.economy.eurSekRate,
    },
  };
}

function scanNumbers(obj: unknown, path: string, bad: string[], depth = 0) {
  if (depth > 4 || obj === null || obj === undefined) return;
  if (typeof obj === "number") {
    if (!Number.isFinite(obj)) bad.push(path);
    return;
  }
  if (Array.isArray(obj)) {
    for (let i = 0; i < Math.min(obj.length, 24); i++)
      scanNumbers(obj[i], `${path}[${i}]`, bad, depth + 1);
    return;
  }
  if (typeof obj === "object")
    for (const k of Object.keys(obj as object))
      scanNumbers((obj as Record<string, unknown>)[k], `${path}.${k}`, bad, depth + 1);
}

export interface AdvRow {
  id: string;
  family: string;
  market: Market;
  currency: string;
  load: number;
  pv: number;
  pvRatio: number;
  profile: string;
  fuse: number;
  strat: string;
  importPrice: number;
  exportPrice: number;
  demandCharge: number | null;
  share: number;
  payback: number;

  capKWh: number;
  powKw: number;
  physKw: number;
  productKw: number;
  maxProductKw: number;
  productCapBound: boolean;
  upperLimitReached: boolean;
  cRate: number;
  cycles: number;
  utilisation: number;
  totalUsefulKWh: number;
  usefulPerKWh: number;

  scBefore: number;
  scAfter: number;
  ssBefore: number;
  ssAfter: number;
  importAfter: number;
  exportAfter: number;
  curtailed: number;
  unserved: number;
  unservedGridBound: boolean;
  peakBeforeKw: number;
  peakAfterKw: number;
  peakReductionKw: number;

  energyBenefit: number;
  peakBenefit: number | null;
  fcrGross: number | null;
  engineTotal: number | null;
  customerBenefit: number | null;
  maxInvestment: number | null;

  fcrEnabled: boolean;
  offered: number;
  held: number;
  monetized: number;
  reservable: number;
  availability: number;
  limiting: string;
  gridClipShare: number;

  balanceResidual: number;
  maxHourlyErr: number;
  hourViolations: number;
  socViolations: number;
  gridViolations: number;
  powerViolations: number;
  simultaneousChargeDischarge: number;

  sweepRuns: number;
  alternatives: { level: string; kWh: number; kW: number; customer: number | null }[] | null;

  fail: string[];
  flags: string[];
}

export function auditRun(s: AdvScenario): AdvRow {
  const input = buildInput(s);
  const site = marketToSite(s.market);
  const res: BatteryEngineResult = runBatteryEngine(input);
  const sum = res.summary;
  const rec = sum.recommendation;
  const fail: string[] = [];
  const flags: string[] = [];

  const capacityKWh = rec.capacityKWh;
  const powerKw = rec.recommendedPowerKw ?? rec.productPowerKw;

  /* ---------- hourly replay ---------- */
  let maxErr = 0;
  let hourViol = 0;
  let socViol = 0;
  let gridViol = 0;
  let powViol = 0;
  let bothViol = 0;
  if (!s.noReplay) {
    const cfg = toLabConfig(input);
    const series = toTimeSeries(cfg, input);
    const limits = computeGridLimits(cfg.grid);
    const replayCfg = {
      ...cfg,
      ancillary: { ...cfg.ancillary, offeredPowerKw: sum.fcr.offeredPowerKw },
    };
    const plan = replayCfg.strategies.ancillaryServices
      ? ancillaryPlan(replayCfg.ancillary)
      : null;
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
    } as never) as never as {
      window: Record<string, number>;
      socSeries: number[];
      importSeries: number[];
      exportSeries: number[];
      tallies: Record<string, number>;
    };
    const w = d.window;
    const floor = w.socFloorKWh ?? 0;
    const ceil = w.socCeilKWh ?? capacityKWh;
    const chargeEff = w.chargeEff ?? 1;
    const dischargeEff = w.dischargeEff ?? 1;
    for (const soc of d.socSeries) {
      if (soc < floor - 1e-6 || soc > ceil + 1e-6) socViol++;
      if (soc < -1e-9) socViol++;
    }
    const n = d.socSeries.length;
    for (let h = 0; h < n; h++) {
      const imp = d.importSeries[h] ?? 0;
      const exp2 = d.exportSeries[h] ?? 0;
      if (imp < -1e-9 || exp2 < -1e-9) gridViol++;
      if (imp > limits.maxImportKw + 1e-6 || exp2 > limits.maxExportKw + 1e-6) gridViol++;
      if (imp > 1e-9 && exp2 > 1e-9) bothViol++;
      const socPrev = h === 0 ? d.tallies.socStart : d.socSeries[h - 1];
      const dSoc = d.socSeries[h] - socPrev;
      const batteryNetAc =
        dSoc >= 0 ? dSoc / Math.max(chargeEff, 1e-9) : dSoc * Math.max(dischargeEff, 1e-9);
      if (Math.abs(batteryNetAc) > powerKw + 1e-6) powViol++;
      const pv = series.pv[h] ?? 0;
      const load = series.load[h] ?? 0;
      const standbyKw =
        capacityKWh > 0 ? Math.max(0, (cfg.battery.standbyW ?? 0)) / 1000 : 0;
      const r = imp + pv - load - exp2 - batteryNetAc - standbyKw;
      const importBinds = imp >= limits.maxImportKw - 1e-6;
      const exportBinds = exp2 >= limits.maxExportKw - 1e-6;
      const unexplained =
        r < -1e-3 && !importBinds ? -r : r > 1e-3 && !exportBinds && pv <= load ? r : 0;
      const e = Math.abs(unexplained);
      if (e > maxErr) maxErr = e;
      if (e > 1e-2) hourViol++;
    }
    if (d.tallies.maxChargePowerKw > powerKw + 1e-6) powViol++;
    if (d.tallies.maxDischargePowerKw > powerKw + 1e-6) powViol++;
  }
  if (hourViol > 0) fail.push("HOURLY_CONSERVATION");
  if (socViol > 0) fail.push("SOC");
  if (gridViol > 0) fail.push("GRID");
  if (powViol > 0) fail.push("BATTERY_POWER");
  if (bothViol > 0) fail.push("SIMULTANEOUS_IMPORT_EXPORT");
  if (!sum.energyBalance.ok) fail.push("ENERGY_BALANCE");

  /* ---------- NaN scan ---------- */
  const bad: string[] = [];
  scanNumbers(sum.energy, "energy", bad);
  scanNumbers(sum.grid, "grid", bad);
  scanNumbers(sum.peak, "peak", bad);
  scanNumbers(sum.fcr, "fcr", bad);
  scanNumbers(sum.economy, "economy", bad);
  scanNumbers(rec, "recommendation", bad);
  if (bad.length) fail.push("NAN:" + bad.slice(0, 3).join(","));

  /* ---------- economics ---------- */
  const share = s.share ?? DEFAULT_CUSTOMER_ANCILLARY_SHARE;
  const payback = s.payback ?? DEFAULT_TARGET_PAYBACK_YEARS;
  const cust = customerEconomyFromResult(res, share);
  const maxInv = maxInvestmentSek(cust.totalCustomerBenefitSek, payback);
  const total = sum.economy.totalOperatingBenefitSek;
  const fcrGross = sum.economy.fcrGrossSek;
  const parts = sum.economy.energyBenefitSek + (sum.economy.demandCostSavingSek ?? 0) + (fcrGross ?? 0);
  if (total !== null && Math.abs(total - parts) > 1) fail.push("TOTAL_DECOMPOSITION");

  /* ---------- semantic flags (not failures) ---------- */
  const cRate = capacityKWh > 0 ? powerKw / capacityKWh : 0;
  if (powerKw > rec.maxProductPowerKw + 1e-6) fail.push("PRODUCT_POWER_ABOVE_CAP");
  if (capacityKWh > 0 && !(powerKw > 0)) fail.push("SIZING_POWER_ZERO");
  const cycles = sum.energy.equivalentFullCycles;
  const useful = sum.energy.totalUsefulKWh;
  const usefulPerKWh = capacityKWh > 0 ? useful / capacityKWh : 0;

  if (capacityKWh > 0 && cycles < 50) flags.push("cycles<50");
  if (capacityKWh > 0 && cycles < 100) flags.push("cycles<100");
  if (cycles > 500) flags.push("cycles>500");
  if (capacityKWh > 0 && usefulPerKWh < 40) flags.push("useful/kWh<40");
  if (capacityKWh > 0 && cRate > 0.5 + 1e-9) flags.push("cRate>0.5");
  if (capacityKWh > 0 && cRate < 0.1) flags.push("cRate<0.1");
  if (rec.productCapBound) flags.push("product-cap-bound");
  if (rec.upperLimitReached) flags.push("capacity-at-max");
  if (total !== null && total < 0) flags.push("negative-total");
  if (cust.totalCustomerBenefitSek !== null && cust.totalCustomerBenefitSek < 0)
    flags.push("negative-customer");
  if (sum.economy.energyBenefitSek < -1) flags.push("negative-energy-benefit");
  if ((sum.economy.demandCostSavingSek ?? 0) < -1) flags.push("negative-peak-benefit");
  if ((sum.economy.demandCostSavingSek ?? 0) > 1 && (s.demandCharge ?? 1) === 0)
    fail.push("PEAK_BENEFIT_WITHOUT_TARIFF");
  if (sum.energy.selfConsumptionAfterPct > 100.001) fail.push("SELF_CONSUMPTION>100");
  if (sum.energy.selfSufficiencyAfterPct > 100.001) fail.push("SELF_SUFFICIENCY>100");
  if (sum.energy.importAfterKWh < -1e-6 || sum.energy.exportAfterKWh < -1e-6)
    fail.push("NEGATIVE_GRID_ENERGY");
  if (sum.peak.peakReductionKw > powerKw + 1e-6) fail.push("PEAK_REDUCTION>POWER");
  if (!s.strategies.fcr) {
    if (sum.fcr.enabled || (sum.fcr.avgHeldPowerKw ?? 0) > 1e-9 || (fcrGross ?? 0) > 1e-9)
      fail.push("FCR_WHEN_DISABLED");
  } else {
    if (sum.fcr.monetizedPowerKw > sum.fcr.avgHeldPowerKw + 1e-6) fail.push("MONETIZED>HELD");
    if (sum.fcr.avgHeldPowerKw > sum.fcr.offeredPowerKw + 1e-6) fail.push("HELD>OFFERED");
    if (sum.fcr.avgHeldPowerKw > powerKw + 1e-6) fail.push("HELD>POWER");
  }

  /* ---------- presentation alternatives ---------- */
  let alternatives: AdvRow["alternatives"] = null;
  if (s.withAlternatives) {
    const alts = computeBatteryAlternatives(input, res, share);
    alternatives = alts.map((a) => ({
      level: a.level,
      kWh: a.capacityKWh,
      kW: a.powerKw,
      customer: a.customerBenefitSek,
    }));
    const lower = alts.find((a) => a.level === "lower");
    const mid = alts.find((a) => a.level === "recommended");
    const higher = alts.find((a) => a.level === "higher");
    if (lower && mid && !(lower.capacityKWh < mid.capacityKWh)) fail.push("ALT_ORDER_LOWER");
    if (higher && mid && !(higher.capacityKWh > mid.capacityKWh)) fail.push("ALT_ORDER_HIGHER");
    const caps = alts.map((a) => a.capacityKWh);
    if (new Set(caps).size !== caps.length) fail.push("ALT_DUPLICATE");
    if (higher && mid && higher.customerBenefitSek !== null && mid.customerBenefitSek !== null) {
      if (higher.customerBenefitSek < mid.customerBenefitSek - 1) flags.push("higher-alt-worse");
      if (Math.abs(higher.customerBenefitSek - mid.customerBenefitSek) < 1)
        flags.push("higher-alt-identical");
    }
  }

  return {
    id: s.id,
    family: s.family,
    market: s.market,
    currency: currencyForCountry(site.country),
    load: s.loadKWh,
    pv: s.pvKWh,
    pvRatio: s.loadKWh > 0 ? s.pvKWh / s.loadKWh : 0,
    profile: s.profile,
    fuse: s.fuseA,
    strat: `${s.strategies.self ? "S" : "-"}${s.strategies.reduce ? "R" : "-"}${s.strategies.peak ? "P" : "-"}${s.strategies.fcr ? "F" : "-"}`,
    importPrice: input.economy!.importEnergyPriceSekPerKWh!,
    exportPrice: input.economy!.exportEnergyValueSekPerKWh!,
    demandCharge: input.economy!.peakDemandChargeSekPerKwMonth ?? null,
    share,
    payback,

    capKWh: capacityKWh,
    powKw: powerKw,
    physKw: rec.physicalPowerNeedKw,
    productKw: rec.productPowerKw,
    maxProductKw: rec.maxProductPowerKw,
    productCapBound: rec.productCapBound,
    upperLimitReached: rec.upperLimitReached,
    cRate,
    cycles,
    utilisation: sum.energy.utilisationPct,
    totalUsefulKWh: useful,
    usefulPerKWh,

    scBefore: sum.energy.selfConsumptionBeforePct,
    scAfter: sum.energy.selfConsumptionAfterPct,
    ssBefore: sum.energy.selfSufficiencyBeforePct,
    ssAfter: sum.energy.selfSufficiencyAfterPct,
    importAfter: sum.energy.importAfterKWh,
    exportAfter: sum.energy.exportAfterKWh,
    curtailed: sum.grid.exportCurtailedKWh,
    unserved: sum.grid.unservedLoadKWh,
    unservedGridBound: sum.grid.unservedIsGridBound,
    peakBeforeKw: sum.grid.importPeakBeforeKw,
    peakAfterKw: sum.grid.importPeakAfterKw,
    peakReductionKw: sum.peak.peakReductionKw,

    energyBenefit: sum.economy.energyBenefitSek,
    peakBenefit: sum.economy.demandCostSavingSek,
    fcrGross,
    engineTotal: total,
    customerBenefit: cust.totalCustomerBenefitSek,
    maxInvestment: maxInv,

    fcrEnabled: sum.fcr.enabled,
    offered: sum.fcr.offeredPowerKw,
    held: sum.fcr.avgHeldPowerKw,
    monetized: sum.fcr.monetizedPowerKw,
    reservable: sum.fcr.reservablePowerAvgKw,
    availability: sum.fcr.availabilityPct,
    limiting: sum.fcr.limitingFactor,
    gridClipShare: sum.fcr.offeredPowerKw > 0 ? sum.fcr.gridClippedAvgKw / sum.fcr.offeredPowerKw : 0,

    balanceResidual: Math.abs(sum.energyBalance.residualKWh ?? 0),
    maxHourlyErr: maxErr,
    hourViolations: hourViol,
    socViolations: socViol,
    gridViolations: gridViol,
    powerViolations: powViol,
    simultaneousChargeDischarge: bothViol,

    sweepRuns: res.diagnostics.sweep.results.length + sum.powerOptions.length,
    alternatives,
    fail,
    flags,
  };
}
