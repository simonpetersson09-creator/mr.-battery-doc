/**
 * Pre-flight validation. Blocks an engine run when required data is missing.
 * It NEVER changes or invents user values. Messages are localized; rules are not.
 */

import { t } from "@/i18n";
import { isKnownProfile } from "@/lib/consumption-profiles";
import type { WizardState } from "@/state/wizard";
import { completeMonths } from "./normalizeWizardToEngineInput";

export interface ValidationIssue {
  field: string;
  /** Plain-language message shown to the user. */
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

export function validateBatteryEngineInput(state: WizardState): ValidationResult {
  const issues: ValidationIssue[] = [];
  const add = (field: string, key: string) => issues.push({ field, message: t(key) });

  /* grid */
  const fuse = state.grid.mainFuseA;
  if (!Number.isFinite(fuse) || fuse <= 0) add("grid.mainFuseA", "validation.fuseGeneric");

  /* consumption */
  const c = state.consumption;
  if (c.mode === "monthly") {
    const months = completeMonths(c.monthlyKwh);
    if (!months) add("consumption.monthlyKwh", "validation.months");
    else if (months.reduce((a, b) => a + b, 0) <= 0)
      add("consumption.monthlyKwh", "validation.monthsZero");
  } else {
    if (typeof c.annualKwh !== "number" || !Number.isFinite(c.annualKwh) || c.annualKwh <= 0)
      add("consumption.annualKwh", "validation.annualConsumption");
  }
  // The profile shapes the hourly distribution in BOTH modes.
  if (!isKnownProfile(c.profileId)) add("consumption.profileId", "validation.profileGeneric");

  /* production */
  const p = state.production;
  if (p.mode !== "none") {
    const months = p.useMonthly ? completeMonths(p.monthlyKwh) : null;
    if (p.useMonthly && !months) add("production.monthlyKwh", "validation.productionMonths");
    if (!months && (typeof p.annualKwh !== "number" || p.annualKwh <= 0))
      add("production.annualKwh", "validation.productionAnnual");
    if (typeof p.dcKwp === "number" && p.dcKwp < 0) add("production.dcKwp", "validation.dcKwp");
    if (typeof p.acKw === "number" && p.acKw < 0) add("production.acKw", "validation.acKw");
  }

  /* economy */
  const e = state.economy;
  if (!Number.isFinite(e.importPrice) || e.importPrice < 0)
    add("economy.importPrice", "validation.importPrice");
  if (!Number.isFinite(e.exportPrice) || e.exportPrice < 0)
    add("economy.exportPrice", "validation.exportPrice");
  if (!Number.isFinite(e.demandCharge) || e.demandCharge < 0)
    add("economy.demandCharge", "validation.demandCharge");
  if (!Number.isFinite(e.eurSekRate) || e.eurSekRate <= 0)
    add("economy.eurSekRate", "validation.fxRate");

  // De-duplicate identical messages.
  const seen = new Set<string>();
  const unique = issues.filter((i) => (seen.has(i.field) ? false : (seen.add(i.field), true)));
  return { ok: unique.length === 0, issues: unique };
}
