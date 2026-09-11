/**
 * Per-step validation for the wizard's "Next" button.
 *
 * Presentation-layer gating only — it mirrors the rules in `validate.ts` and never
 * changes, corrects or invents user values. Messages are localized; the rules are not.
 *
 * SINGLE SOURCE OF TRUTH: the step validators below and the inline field errors
 * shown next to each input are derived from the SAME predicates in this file. The
 * rules and allowed min/max values are unchanged — only the presentation of the
 * existing messages was extended.
 */

import { t } from "@/i18n";
import { isKnownProfile } from "@/lib/consumption-profiles";
import { marketAreaOptions, requiresMarketArea } from "@/lib/reserve-market";
import type { WizardState } from "@/state/wizard";
import { completeMonths } from "./normalizeWizardToEngineInput";
import { MAX_TARGET_PAYBACK_YEARS, MIN_TARGET_PAYBACK_YEARS } from "./customerEconomy";

export interface StepValidity {
  ok: boolean;
  message: string | null;
}

/** Localized message per field, or null when the field is valid. */
export type FieldErrors<K extends string> = Record<K, string | null>;

const ok: StepValidity = { ok: true, message: null };
const fail = (key: string): StepValidity => ({ ok: false, message: t(key) });
/** First non-null message of an ordered field list, as a step-level validity. */
function firstError(messages: (string | null)[]): StepValidity {
  const message = messages.find((m) => m !== null) ?? null;
  return message === null ? ok : { ok: false, message };
}
const msg = (invalid: boolean, key: string): string | null => (invalid ? t(key) : null);

/* ---------------------------------------------------------------- grid ---- */

export type GridField = "country" | "marketArea" | "mainFuseA" | "gridValuesConfirmed";

export function gridFieldErrors(s: WizardState): FieldErrors<GridField> {
  const areaMissing = requiresMarketArea(s.grid.country) && !s.grid.marketArea;
  const areaUnknown =
    !!s.grid.marketArea &&
    !marketAreaOptions(s.grid.country).some((o) => o.value === s.grid.marketArea);
  return {
    country: msg(!s.grid.country, "validation.country"),
    marketArea: msg(areaMissing || areaUnknown, "validation.area"),
    mainFuseA: msg(
      !Number.isFinite(s.grid.mainFuseA) || s.grid.mainFuseA <= 0,
      "validation.fuse",
    ),
    gridValuesConfirmed: msg(!s.grid.gridValuesConfirmed, "validation.confirmGrid"),
  };
}

export function validateGridStep(s: WizardState): StepValidity {
  const e = gridFieldErrors(s);
  return firstError([e.country, e.marketArea, e.mainFuseA, e.gridValuesConfirmed]);
}

/* --------------------------------------------------------- consumption ---- */

export type ConsumptionField = "monthlyKwh" | "annualKwh" | "profileId";

export function consumptionFieldErrors(s: WizardState): FieldErrors<ConsumptionField> {
  const c = s.consumption;
  let monthly: string | null = null;
  let annual: string | null = null;
  if (c.mode === "monthly") {
    const months = completeMonths(c.monthlyKwh);
    if (!months) monthly = t("validation.months");
    else if (months.reduce((a, b) => a + b, 0) <= 0) monthly = t("validation.monthsZero");
  } else {
    annual = msg(
      typeof c.annualKwh !== "number" || !Number.isFinite(c.annualKwh) || c.annualKwh <= 0,
      "validation.annualConsumption",
    );
  }
  return {
    monthlyKwh: monthly,
    annualKwh: annual,
    profileId: msg(!isKnownProfile(c.profileId), "validation.profile"),
  };
}

export function validateConsumptionStep(s: WizardState): StepValidity {
  const e = consumptionFieldErrors(s);
  return firstError([e.monthlyKwh, e.annualKwh, e.profileId]);
}

/* ---------------------------------------------------------- production ---- */

export type ProductionField = "monthlyKwh" | "annualKwh" | "dcKwp" | "acKw";

export function productionFieldErrors(s: WizardState): FieldErrors<ProductionField> {
  const p = s.production;
  const none = p.mode === "none";
  const months = !none && p.useMonthly ? completeMonths(p.monthlyKwh) : null;
  return {
    monthlyKwh: msg(!none && p.useMonthly && !months, "validation.productionMonths"),
    annualKwh: msg(
      !none &&
        !months &&
        (typeof p.annualKwh !== "number" || !Number.isFinite(p.annualKwh) || p.annualKwh <= 0),
      "validation.productionAnnual",
    ),
    dcKwp: msg(!none && typeof p.dcKwp === "number" && p.dcKwp < 0, "validation.dcKwp"),
    acKw: msg(!none && typeof p.acKw === "number" && p.acKw < 0, "validation.acKw"),
  };
}

export function validateProductionStep(s: WizardState): StepValidity {
  if (s.production.mode === "none") return ok;
  const e = productionFieldErrors(s);
  return firstError([e.monthlyKwh, e.annualKwh, e.dcKwp, e.acKw]);
}

export function validateBatteryStep(_s: WizardState): StepValidity {
  return ok;
}

/* ------------------------------------------------------------- economy ---- */

export type EconomyField =
  | "importPrice"
  | "exportPrice"
  | "demandCharge"
  | "eurSekRate"
  | "customerAncillaryShare";

export function economyFieldErrors(s: WizardState): FieldErrors<EconomyField> {
  const e = s.economy;
  const share = s.preferences.customerAncillaryShare;
  return {
    importPrice: msg(
      !Number.isFinite(e.importPrice) || e.importPrice < 0,
      "validation.importPrice",
    ),
    exportPrice: msg(
      !Number.isFinite(e.exportPrice) || e.exportPrice < 0,
      "validation.exportPrice",
    ),
    demandCharge: msg(
      !Number.isFinite(e.demandCharge) || e.demandCharge < 0,
      "validation.demandCharge",
    ),
    eurSekRate: msg(
      s.strategies.fcrDUp && (!Number.isFinite(e.eurSekRate) || e.eurSekRate <= 0),
      "validation.fxRateAncillary",
    ),
    customerAncillaryShare: msg(
      s.strategies.fcrDUp && (!Number.isFinite(share) || share < 0 || share > 1),
      "validation.customerShare",
    ),
  };
}

export function validateEconomyStep(s: WizardState): StepValidity {
  const e = economyFieldErrors(s);
  return firstError([
    e.importPrice,
    e.exportPrice,
    e.demandCharge,
    e.eurSekRate,
    e.customerAncillaryShare,
  ]);
}

/** Desired payback horizon: only the slider range is enforced. */
export function validatePaybackStep(s: WizardState): StepValidity {
  const y = s.preferences.targetPaybackYears;
  if (!Number.isFinite(y) || y < MIN_TARGET_PAYBACK_YEARS || y > MAX_TARGET_PAYBACK_YEARS)
    return fail("validation.paybackYears");
  return ok;
}
