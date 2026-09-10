/**
 * Stable identifier for ONE finished calculation.
 *
 * A consumable purchase unlocks exactly the calculation it was bought for, so the
 * identifier must be derived from the inputs that shape the result. Same inputs =>
 * same id => still unlocked. Change one number => a new calculation, which is not
 * paid for.
 *
 * This is an access key only. It never reaches the engine and never affects any
 * physics, sizing or economics.
 */
import type { WizardState } from "@/state/wizard";

/** Only the fields that can change the simulated result or the customer economics. */
function calculationFingerprint(s: WizardState): unknown {
  return {
    grid: {
      country: s.grid.country,
      marketArea: s.grid.marketArea,
      mainFuseA: s.grid.mainFuseA,
    },
    consumption: {
      mode: s.consumption.mode,
      annualKwh: s.consumption.annualKwh,
      profileId: s.consumption.profileId,
      monthlyKwh: s.consumption.monthlyKwh,
    },
    production: {
      mode: s.production.mode,
      dcKwp: s.production.dcKwp,
      acKw: s.production.acKw,
      annualKwh: s.production.annualKwh,
      useMonthly: s.production.useMonthly,
      monthlyKwh: s.production.monthlyKwh,
      selfConsumptionPct: s.production.selfConsumptionPct,
    },
    strategies: s.strategies,
    economy: {
      importPrice: s.economy.importPrice,
      exportPrice: s.economy.exportPrice,
      demandCharge: s.economy.demandCharge,
      currency: s.economy.currency,
      eurSekRate: s.economy.eurSekRate,
    },
    preferences: s.preferences,
  };
}

/** FNV-1a, 32 bit — deterministic and dependency free. */
function hash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function calculationId(state: WizardState): string {
  return `calc_${hash(JSON.stringify(calculationFingerprint(state)))}`;
}
