/**
 * Per-step validation for the wizard's "Next" button.
 *
 * Presentation-layer gating only — it mirrors the rules in `validate.ts` and never
 * changes, corrects or invents user values. Messages are localized; the rules are not.
 */

import { t } from "@/i18n";
import { isKnownProfile } from "@/lib/consumption-profiles";
import { marketAreaOptions, requiresMarketArea } from "@/lib/reserve-market";
import type { WizardState } from "@/state/wizard";
import { completeMonths } from "./normalizeWizardToEngineInput";

export interface StepValidity {
  ok: boolean;
  message: string | null;
}

const ok: StepValidity = { ok: true, message: null };
const fail = (key: string): StepValidity => ({ ok: false, message: t(key) });

export function validateGridStep(s: WizardState): StepValidity {
  if (!s.grid.country) return fail("validation.country");
  if (requiresMarketArea(s.grid.country) && !s.grid.marketArea) return fail("validation.area");
  if (
    s.grid.marketArea &&
    !marketAreaOptions(s.grid.country).some((o) => o.value === s.grid.marketArea)
  )
    return fail("validation.area");
  if (!Number.isFinite(s.grid.mainFuseA) || s.grid.mainFuseA <= 0) return fail("validation.fuse");
  if (!s.grid.gridValuesConfirmed) return fail("validation.confirmGrid");
  return ok;
}

export function validateConsumptionStep(s: WizardState): StepValidity {
  const c = s.consumption;
  if (c.mode === "monthly") {
    const months = completeMonths(c.monthlyKwh);
    if (!months) return fail("validation.months");
    if (months.reduce((a, b) => a + b, 0) <= 0) return fail("validation.monthsZero");
  } else {
    if (typeof c.annualKwh !== "number" || !Number.isFinite(c.annualKwh) || c.annualKwh <= 0)
      return fail("validation.annualConsumption");
  }
  if (!isKnownProfile(c.profileId)) return fail("validation.profile");
  return ok;
}

export function validateProductionStep(s: WizardState): StepValidity {
  const p = s.production;
  if (p.mode === "none") return ok;

  const months = p.useMonthly ? completeMonths(p.monthlyKwh) : null;
  if (p.useMonthly && !months) return fail("validation.productionMonths");
  if (
    !months &&
    (typeof p.annualKwh !== "number" || !Number.isFinite(p.annualKwh) || p.annualKwh <= 0)
  )
    return fail("validation.productionAnnual");
  if (typeof p.dcKwp === "number" && p.dcKwp < 0) return fail("validation.dcKwp");
  if (typeof p.acKw === "number" && p.acKw < 0) return fail("validation.acKw");
  return ok;
}

export function validateBatteryStep(_s: WizardState): StepValidity {
  return ok;
}

export function validateEconomyStep(s: WizardState): StepValidity {
  const e = s.economy;
  if (!Number.isFinite(e.importPrice) || e.importPrice < 0) return fail("validation.importPrice");
  if (!Number.isFinite(e.exportPrice) || e.exportPrice < 0) return fail("validation.exportPrice");
  if (!Number.isFinite(e.demandCharge) || e.demandCharge < 0)
    return fail("validation.demandCharge");
  if (s.strategies.fcrDUp && (!Number.isFinite(e.eurSekRate) || e.eurSekRate <= 0))
    return fail("validation.fxRateAncillary");
  return ok;
}
