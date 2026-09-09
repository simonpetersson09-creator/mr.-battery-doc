/**
 * Dynamic UI copy for the demand charge field.
 * Pure presentation — no economy logic, defaults or engine values change.
 *
 * Semantics: a 0 value means "Battery Doc assumes no demand charge by default",
 * NOT "the country has no demand charge". The customer can always type a value.
 */

import { t } from "@/i18n";

export function demandChargeHint(value: number): string {
  return value > 0
    ? t("economics.demandCharge.hintDefault")
    : t("economics.demandCharge.hintZero");
}
