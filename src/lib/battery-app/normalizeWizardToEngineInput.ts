/**
 * WIZARD -> BATTERY ENGINE adapter.
 *
 * This is the ONLY place where Mr. Battery Doc's wizard state is translated into
 * BatteryEngineInput. No physics, no economics, no profile weights and no sizing
 * logic live here — only mapping.
 *
 *   WizardState -> normalizeWizardToEngineInput() -> BatteryEngineInput
 */

import type {
  BatteryEngineInput,
  EngineConsumptionInput,
  EngineEconomyInput,
  EngineProductionInput,
  EngineSiteInput,
  EngineStrategyInput,
} from "@/lib/battery-engine";
import { isKnownProfile } from "@/lib/consumption-profiles";
import { getCountry } from "@/lib/country-config";
import type { WizardState } from "@/state/wizard";

export interface NormalizeOptions {
  /** Pin the sizing instead of letting the engine recommend (tests / fixed products). */
  fixedCapacityKWh?: number;
  fixedPowerKw?: number;
}

/** 12 complete, non-negative monthly values, or null. */
export function completeMonths(values: (number | null)[]): number[] | null {
  if (values.length !== 12) return null;
  if (values.some((v) => v === null || !Number.isFinite(v) || (v as number) < 0)) return null;
  return values.map((v) => v as number);
}

export function normalizeWizardToEngineInput(
  state: WizardState,
  options: NormalizeOptions = {},
): BatteryEngineInput {
  const country = getCountry(state.grid.country);

  /* ---------------- site / grid ---------------- */
  const site: EngineSiteInput = {
    voltageV: country.grid.voltage,
    phases: country.grid.phases,
    mainFuseA: state.grid.mainFuseA,
  };
  // The engine's country model is Swedish; only tag it when the site really is SE.
  if (state.grid.country === "SE") site.country = "SE";
  // Grid limits and margins are derived by the engine from fuse/voltage/phases.

  /* ---------------- consumption ---------------- */
  const consumption: EngineConsumptionInput = {};
  const actualMonths =
    state.consumption.mode === "monthly" ? completeMonths(state.consumption.monthlyKwh) : null;
  if (actualMonths) {
    // A. Real metered months always win.
    consumption.monthlyKWh = actualMonths;
    consumption.annualKWh = actualMonths.reduce((a, b) => a + b, 0);
  } else if (typeof state.consumption.annualKwh === "number") {
    // B. Annual energy + the engine's own profile distribution.
    consumption.annualKWh = state.consumption.annualKwh;
  }
  if (isKnownProfile(state.consumption.profileId)) {
    consumption.profile = state.consumption.profileId as NonNullable<
      EngineConsumptionInput["profile"]
    >;
  }

  /* ---------------- production ---------------- */
  const hasPv = state.production.mode !== "none";
  const production: EngineProductionInput = { enabled: hasPv };
  if (hasPv) {
    const pvMonths = state.production.useMonthly
      ? completeMonths(state.production.monthlyKwh)
      : null;
    if (pvMonths) {
      production.monthlyKWh = pvMonths;
      production.annualKWh = pvMonths.reduce((a, b) => a + b, 0);
    } else if (typeof state.production.annualKwh === "number") {
      production.annualKWh = state.production.annualKwh;
    }
    if (typeof state.production.dcKwp === "number") production.kWp = state.production.dcKwp;
    if (typeof state.production.acKw === "number")
      production.inverterAcKw = state.production.acKw;
  }

  /* ---------------- strategies ---------------- */
  const strategies: EngineStrategyInput = {
    selfConsumption: state.strategies.solarSelfConsumption,
    reduceImport: state.strategies.reducedGridImport,
    peakShaving: state.strategies.peakShaving,
  };
  if (state.strategies.fcrDUp) {
    strategies.fcrDUp = true;
    strategies.optimiseFcrReservation = true;
  }

  /* ---------------- economy (never affects the physics) ---------------- */
  const economy: EngineEconomyInput = {
    importEnergyPriceSekPerKWh: state.economy.importPrice,
    exportEnergyValueSekPerKWh: state.economy.exportPrice,
    peakDemandChargeSekPerKwMonth:
      state.economy.demandCharge > 0 ? state.economy.demandCharge : null,
    // Only an edit of the demand charge itself makes the tariff user-provided.
    peakTariffSource: state.economy.demandChargeTouched ? "user-provided" : "default-estimate",
    eurSekRate: state.economy.eurSekRate,
  };

  const input: BatteryEngineInput = {
    site,
    consumption,
    production,
    strategies,
    economy,
  };

  if (options.fixedCapacityKWh !== undefined && options.fixedPowerKw !== undefined) {
    input.battery = {
      fixedCapacityKWh: options.fixedCapacityKWh,
      fixedPowerKw: options.fixedPowerKw,
    };
  }

  return input;
}
