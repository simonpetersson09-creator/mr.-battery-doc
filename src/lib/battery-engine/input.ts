/**
 * BATTERY ENGINE — input mapping.
 *
 * Translates the public, stable BatteryEngineInput into the engine's internal LabConfig.
 * Anything the caller leaves out keeps the frozen engine default, so a run is fully
 * reproducible from the input alone. No calculation happens here.
 */

import {
  DEFAULT_LOAD_MONTH_SHARE,
  DEFAULT_PV_MONTH_SHARE,
  defaultConfig,
  spreadAnnual,
} from "../lab/defaults";
import { buildSeries } from "../lab/simulate";
import { priceAreaForMarket, reserveModeForMarket } from "../lab/ancillary";
import { SWEDISH_OPERATING_ECONOMY } from "../lab/operatingEconomy";
import type { OperatingEconomyConfig } from "../lab/operatingEconomy";
import type { LabConfig, TimeSeries } from "../lab/types";
import { HOURS_PER_YEAR } from "../lab/defaults";
import type { BatteryEngineInput } from "./types";

function monthly(
  monthlyKWh: number[] | undefined,
  annualKWh: number | undefined,
  share: number[],
  fallback: number[],
): { monthlyKWh: number[]; modelled: boolean } {
  if (monthlyKWh && monthlyKWh.length === 12)
    return { monthlyKWh: [...monthlyKWh], modelled: false };
  if (typeof annualKWh === "number")
    return { monthlyKWh: spreadAnnual(annualKWh, share), modelled: true };
  return { monthlyKWh: [...fallback], modelled: true };
}

/** Builds the internal configuration for a run. Pure mapping of the public input. */
export function toLabConfig(input: BatteryEngineInput = {}): LabConfig {
  const base = defaultConfig();
  const site = input.site ?? {};
  const cons = input.consumption ?? {};
  const prod = input.production ?? {};
  const bat = input.battery ?? {};
  const st = input.strategies ?? {};

  const load = monthly(cons.monthlyKWh, cons.annualKWh, DEFAULT_LOAD_MONTH_SHARE, base.consumption.monthlyKWh);
  const pvEnabled = prod.enabled ?? base.solar.enabled;
  const pv = monthly(prod.monthlyKWh, prod.annualKWh, DEFAULT_PV_MONTH_SHARE, base.solar.monthlyKWh);

  const cfg: LabConfig = {
    ...base,
    consumption: {
      ...base.consumption,
      monthlyKWh: load.monthlyKWh,
      annualKWh: cons.annualKWh ?? load.monthlyKWh.reduce((a, b) => a + b, 0),
      shape: cons.profile ?? base.consumption.shape,
      monthlyIsModelled: load.modelled,
    },
    solar: {
      ...base.solar,
      enabled: pvEnabled,
      monthlyKWh: pvEnabled ? pv.monthlyKWh : new Array(12).fill(0),
      kWp: prod.kWp ?? (pvEnabled ? base.solar.kWp : 0),
      inverterAcKw: prod.inverterAcKw ?? base.solar.inverterAcKw,
      // Optional MEASURED self-consumption share. Calibrates the intraday load shape only.
      measuredSelfConsumptionPct: prod.measuredSelfConsumptionPct ?? null,
      monthlyIsModelled: pv.modelled,
    },
    battery: {
      ...base.battery,
      minSocPct: bat.minSocPct ?? base.battery.minSocPct,
      maxSocPct: bat.maxSocPct ?? base.battery.maxSocPct,
      initialSocPct: bat.initialSocPct ?? base.battery.initialSocPct,
      roundTripEfficiency: bat.roundTripEfficiency ?? base.battery.roundTripEfficiency,
      standbyW: bat.standbyW ?? base.battery.standbyW,
      selfDischargePctPerMonth:
        bat.selfDischargePctPerMonth ?? base.battery.selfDischargePctPerMonth,
      reserveSocPct: bat.reserveSocPct ?? base.battery.reserveSocPct,
      maxCyclesPerYear: bat.maxCyclesPerYear ?? base.battery.maxCyclesPerYear,
    },
    grid: {
      ...base.grid,
      mainFuseA: site.mainFuseA ?? base.grid.mainFuseA,
      phases: site.phases ?? base.grid.phases,
      voltageV: site.voltageV ?? base.grid.voltageV,
      maxImportKw: site.maxImportKw ?? base.grid.maxImportKw,
      maxExportKw: site.maxExportKw ?? base.grid.maxExportKw,
      importMarginPct: site.importMarginPct ?? base.grid.importMarginPct ?? 90,
      exportMarginPct: site.exportMarginPct ?? base.grid.exportMarginPct ?? 95,

    },
    strategies: {
      ...base.strategies,
      selfConsumption: st.selfConsumption ?? base.strategies.selfConsumption,
      reduceImport: st.reduceImport ?? base.strategies.reduceImport,
      peakShaving: st.peakShaving ?? base.strategies.peakShaving,
      ancillaryServices: st.fcrDUp ?? base.strategies.ancillaryServices,
    },
    peakShaving: {
      ...base.peakShaving,
      targetReductionPct: st.peakTargetReductionPct ?? base.peakShaving.targetReductionPct,
      activeHours: st.peakActiveHours ?? base.peakShaving.activeHours,
      activeMonths: st.peakActiveMonths ?? base.peakShaving.activeMonths,
    },
    ancillary: {
      ...base.ancillary,
      enabled: st.fcrDUp ?? base.ancillary.enabled,
      offeredPowerKw: st.fcrOfferedPowerKw ?? base.ancillary.offeredPowerKw,
      eurSekRate: input.economy?.eurSekRate ?? base.ancillary.eurSekRate,
      // Country only selects the historical price series; no physics depends on it.
      priceCountry: priceAreaForMarket(site.country, site.marketArea),
      // Reserve product follows the market, not a hardcoded country branch.
      reserveMode: reserveModeForMarket(site.country, site.marketArea),
    },
    sweep: {
      capacitiesKWh: bat.capacityStepsKWh ?? base.sweep.capacitiesKWh,
      powersKw: bat.powerStepsKw ?? base.sweep.powersKw,
    },
    powerSizing: {
      ...base.powerSizing,
      productStepsKw: bat.powerStepsKw ?? base.powerSizing.productStepsKw,
    },
  };

  // Advanced escape hatch last, so internal parameters can always be pinned exactly.
  return { ...cfg, ...(input.advanced ?? {}) };
}

/** Economic configuration for a run. Separate from the physics on purpose. */
export function toEconomyConfig(input: BatteryEngineInput = {}): OperatingEconomyConfig {
  const e = input.economy ?? {};
  const hasTariff = e.peakDemandChargeSekPerKwMonth !== undefined;
  return {
    importEnergyPriceSekPerKWh:
      e.importEnergyPriceSekPerKWh ?? SWEDISH_OPERATING_ECONOMY.importEnergyPriceSekPerKWh,
    exportEnergyValueSekPerKWh:
      e.exportEnergyValueSekPerKWh ?? SWEDISH_OPERATING_ECONOMY.exportEnergyValueSekPerKWh,
    peakDemandChargeSekPerKwMonth: hasTariff
      ? e.peakDemandChargeSekPerKwMonth!
      : SWEDISH_OPERATING_ECONOMY.peakDemandChargeSekPerKwMonth,
    peakTariffSource:
      e.peakTariffSource ?? (hasTariff ? "user-provided" : SWEDISH_OPERATING_ECONOMY.peakTariffSource),
    eurSekRate: e.eurSekRate ?? SWEDISH_OPERATING_ECONOMY.eurSekRate,
  };
}

/**
 * The 8760 hourly series for a run. Ready-made series supplied by the caller replace the
 * generated profile hour for hour; nothing else about the profile engine changes.
 */
export function toTimeSeries(cfg: LabConfig, input: BatteryEngineInput = {}): TimeSeries {
  const series = buildSeries(cfg);
  const load = input.consumption?.hourlyKWh;
  const pv = input.production?.hourlyKWh;
  if (load && load.length === HOURS_PER_YEAR) {
    series.load = [...load];
    series.loadProvenance = "verified";
    // A verified hourly series IS the measurement; nothing may reshape it.
    series.selfConsumptionCalibration = null;
  }

  if (pv && pv.length === HOURS_PER_YEAR) {
    series.pv = [...pv];
    series.pvClipped = new Array(HOURS_PER_YEAR).fill(0);
    series.pvProvenance = "verified";
  }
  return series;
}
