/**
 * Dynamic UI copy for the demand charge (effektavgift) field.
 * Pure presentation — no economy logic, defaults or engine values change.
 *
 * Semantics: a 0 value means "Battery Doc assumes no demand charge by default",
 * NOT "the country has no demand charge". The customer can always type a value.
 */
export function demandChargeHint(value: number): string {
  return value > 0
    ? "Schablon baserad på valt land. Ändra om du känner till ditt elnätsföretags effektavgift."
    : "Ingen effektavgift antagen. Ändra om ditt elnätsföretag tar ut en effektavgift.";
}
