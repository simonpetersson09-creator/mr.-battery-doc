/**
 * CUSTOMER ANCILLARY VALUE — the ONE place the customer's part of the reserve-market value
 * is computed. Engine (selection objective, M1, K1) and app (result page, PDF,
 * ancillary-only mode, capacity alternatives) all go through here, so the economic
 * assumption is identical everywhere and can never be applied twice.
 *
 * The market value itself (`fcr.grossSek`) is never touched: it stays the physical,
 * historical value. Totals keep their own definitions at their call sites; only the
 * ancillary term comes from this module.
 *
 * Pure: no imports, safe for both the engine and the app layer.
 */

/** Default customer share of the ancillary market value (contract share). */
export const DEFAULT_CUSTOMER_ANCILLARY_SHARE = 0.75;

/**
 * Economic revenue factor applied on top of the customer share (0.80 = 20 % safety margin; 1.00 = none).
 * Economic only: it never changes power, held power, SOC, endurance or prices.
 */
export const ANCILLARY_REVENUE_FACTOR = 0.8;

/** The customer's contract share, clamped to 0–1. Invalid input falls back to the default. */
export function clampAncillaryShare(value: unknown): number {
  const n = typeof value === "number" ? value : Number.NaN;
  if (!Number.isFinite(n)) return DEFAULT_CUSTOMER_ANCILLARY_SHARE;
  return Math.min(1, Math.max(0, n));
}

/** Share of the market value that counts as customer value: clamped share x revenue factor. */
export function effectiveAncillaryShare(share: unknown): number {
  return clampAncillaryShare(share) * ANCILLARY_REVENUE_FACTOR;
}

/** Customer value of a reserve market value. Missing or non-finite market value = 0. */
export function customerAncillaryValueSek(
  marketValueSek: number | null | undefined,
  share: unknown,
): number {
  const market =
    typeof marketValueSek === "number" && Number.isFinite(marketValueSek) ? marketValueSek : 0;
  return market * effectiveAncillaryShare(share);
}
