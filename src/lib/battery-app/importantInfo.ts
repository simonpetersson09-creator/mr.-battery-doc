/**
 * Consumer information shown in the collapsible "Important to know" section
 * on the result step. Pure presentation copy — no calculation is affected.
 * All wording is routed through the central translation layer.
 */

import { t } from "@/i18n";

export function importantInfoTitle(): string {
  return t("importantInformation.title");
}

export function importantInfoPoints(): string[] {
  return [1, 2, 3, 4, 5, 6, 7].map((n) => t(`importantInformation.p${n}`));
}

export function importantInfoFooter(): string {
  return t("importantInformation.footer");
}
