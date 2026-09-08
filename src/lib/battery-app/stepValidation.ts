/**
 * Per-step validation for the wizard's "Nästa" button.
 *
 * Presentation-layer gating only — it mirrors the rules in `validate.ts` and never
 * changes, corrects or invents user values.
 */

import { isKnownProfile } from "@/lib/consumption-profiles";
import type { WizardState } from "@/state/wizard";
import { completeMonths } from "./normalizeWizardToEngineInput";

export interface StepValidity {
  ok: boolean;
  message: string | null;
}

const ok: StepValidity = { ok: true, message: null };
const fail = (message: string): StepValidity => ({ ok: false, message });

export function validateGridStep(s: WizardState): StepValidity {
  if (!s.grid.country) return fail("Välj land.");
  if (!Number.isFinite(s.grid.mainFuseA) || s.grid.mainFuseA <= 0)
    return fail("Ange en giltig huvudsäkring i ampere.");
  if (!s.grid.gridValuesConfirmed)
    return fail("Bekräfta att nätvärdena stämmer innan du fortsätter.");
  return ok;
}

export function validateConsumptionStep(s: WizardState): StepValidity {
  const c = s.consumption;
  if (c.mode === "monthly") {
    const months = completeMonths(c.monthlyKwh);
    if (!months) return fail("Fyll i alla 12 månader med giltiga värden.");
    if (months.reduce((a, b) => a + b, 0) <= 0)
      return fail("Månadsförbrukningen kan inte vara noll.");
  } else {
    if (typeof c.annualKwh !== "number" || !Number.isFinite(c.annualKwh) || c.annualKwh <= 0)
      return fail("Ange din årsförbrukning i kWh.");
  }
  if (!isKnownProfile(c.profileId)) return fail("Välj den förbrukningsprofil som passar bäst.");
  return ok;
}

export function validateProductionStep(s: WizardState): StepValidity {
  const p = s.production;
  if (p.mode === "none") return ok;

  const months = p.useMonthly ? completeMonths(p.monthlyKwh) : null;
  if (p.useMonthly && !months) return fail("Fyll i alla 12 månader för solproduktionen.");
  if (!months && (typeof p.annualKwh !== "number" || !Number.isFinite(p.annualKwh) || p.annualKwh <= 0))
    return fail("Ange solcellernas årsproduktion i kWh.");
  if (typeof p.dcKwp === "number" && p.dcKwp < 0)
    return fail("Paneleffekten kan inte vara negativ.");
  if (typeof p.acKw === "number" && p.acKw < 0)
    return fail("Växelriktarens effekt kan inte vara negativ.");
  return ok;
}

export function validateBatteryStep(_s: WizardState): StepValidity {
  return ok;
}

export function validateEconomyStep(s: WizardState): StepValidity {
  const e = s.economy;
  if (!Number.isFinite(e.importPrice) || e.importPrice < 0)
    return fail("Priset på köpt el kan inte vara negativt.");
  if (!Number.isFinite(e.exportPrice) || e.exportPrice < 0)
    return fail("Ersättningen för såld solel kan inte vara negativ.");
  if (!Number.isFinite(e.demandCharge) || e.demandCharge < 0)
    return fail("Effektavgiften kan inte vara negativ.");
  if (s.strategies.fcrDUp && (!Number.isFinite(e.eurSekRate) || e.eurSekRate <= 0))
    return fail("EUR/SEK måste vara större än noll när FCR-D upp är påslaget.");
  return ok;
}
