/**
 * Pre-flight validation. Blocks an engine run when required data is missing.
 * It NEVER changes or invents user values.
 */

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
  const add = (field: string, message: string) => issues.push({ field, message });

  /* grid */
  const fuse = state.grid.mainFuseA;
  if (!Number.isFinite(fuse) || fuse <= 0) add("grid.mainFuseA", "Ange en giltig huvudsäkring.");

  /* consumption */
  const c = state.consumption;
  if (c.mode === "monthly") {
    const months = completeMonths(c.monthlyKwh);
    if (!months) add("consumption.monthlyKwh", "Fyll i alla 12 månader med giltiga värden.");
    else if (months.reduce((a, b) => a + b, 0) <= 0)
      add("consumption.monthlyKwh", "Månadsförbrukningen kan inte vara noll.");
  } else {
    if (typeof c.annualKwh !== "number" || !Number.isFinite(c.annualKwh) || c.annualKwh <= 0)
      add("consumption.annualKwh", "Ange din årsförbrukning i kWh.");
    if (!isKnownProfile(c.profileId))
      add("consumption.profileId", "Välj den förbrukningsprofil som liknar din fastighet.");
    if (c.mode === "document")
      add(
        "consumption.document",
        "Automatisk avläsning av uppladdade filer är inte påslagen ännu — fyll i årsförbrukning och profil.",
      );
  }

  /* production */
  const p = state.production;
  if (p.mode !== "none") {
    const months = p.useMonthly ? completeMonths(p.monthlyKwh) : null;
    if (p.useMonthly && !months)
      add("production.monthlyKwh", "Fyll i alla 12 månader för solproduktionen.");
    if (!months && (typeof p.annualKwh !== "number" || p.annualKwh <= 0))
      add("production.annualKwh", "Ange solcellernas årsproduktion i kWh.");
    if (typeof p.dcKwp === "number" && p.dcKwp < 0)
      add("production.dcKwp", "Paneleffekten kan inte vara negativ.");
    if (typeof p.acKw === "number" && p.acKw < 0)
      add("production.acKw", "Växelriktarens effekt kan inte vara negativ.");
    if (p.mode === "document" && !months && (typeof p.annualKwh !== "number" || p.annualKwh <= 0))
      add(
        "production.document",
        "Automatisk avläsning av uppladdade filer är inte påslagen ännu — fyll i solproduktionen.",
      );
  }

  /* economy */
  const e = state.economy;
  if (!Number.isFinite(e.importPrice) || e.importPrice < 0)
    add("economy.importPrice", "Priset på köpt el kan inte vara negativt.");
  if (!Number.isFinite(e.exportPrice) || e.exportPrice < 0)
    add("economy.exportPrice", "Ersättningen för såld solel kan inte vara negativ.");
  if (!Number.isFinite(e.demandCharge) || e.demandCharge < 0)
    add("economy.demandCharge", "Effektavgiften kan inte vara negativ.");
  if (!Number.isFinite(e.eurSekRate) || e.eurSekRate <= 0)
    add("economy.eurSekRate", "Valutakursen måste vara större än noll.");

  // De-duplicate identical messages.
  const seen = new Set<string>();
  const unique = issues.filter((i) => (seen.has(i.field) ? false : (seen.add(i.field), true)));
  return { ok: unique.length === 0, issues: unique };
}
