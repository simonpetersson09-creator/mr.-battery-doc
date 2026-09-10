/**
 * Decimal input parsing shared by every numeric field.
 *
 * On an iPhone the decimal keypad prints the locale separator, so Swedish, Finnish,
 * Danish and German users type "1,50". A native <input type="number"> discards that
 * value (it becomes ""), which looked like the field refused decimals. Every numeric
 * field therefore uses a text input plus this parser, so a comma and a dot mean the
 * same number on web and on iOS. No calculation, default or validation rule changes —
 * only how keystrokes become a number.
 */

/** Characters a user may legitimately type into a numeric field. */
const ALLOWED = /[^0-9.,\-+eE\s\u00a0]/g;

/** Strips grouping spaces and normalises the decimal separator to a dot. */
export function normalizeDecimalText(text: string): string {
  return text
    .replace(ALLOWED, "")
    .replace(/[\s\u00a0]/g, "")
    .replace(",", ".");
}

/** "1,50" and "1.50" both become 1.5. Empty or unparsable input becomes null. */
export function parseDecimalInput(text: string): number | null {
  const normalized = normalizeDecimalText(text);
  if (normalized === "" || normalized === "-" || normalized === "." || normalized === "-.") {
    return null;
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Keeps only characters that can form a number, so the field never holds junk. */
export function sanitizeDecimalText(text: string): string {
  return text.replace(ALLOWED, "");
}
