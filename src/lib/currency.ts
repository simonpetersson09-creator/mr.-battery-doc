/**
 * CENTRAL CURRENCY LAYER.
 *
 * One place decides:
 *   1. which currency a country's customer sees and enters values in,
 *   2. what a reserve (FCR) revenue in EUR is worth in that currency,
 *   3. how a money value is formatted.
 *
 * ARCHITECTURE (never mixed, always in this order):
 *   reserve physics -> reserve economics in EUR -> currency conversion -> local
 *   economics (energy, peak, total) -> presentation.
 *
 * The Battery Engine is currency AGNOSTIC: every "...Sek" field inside the engine means
 * "one unit of the customer's local currency". The only currency-aware number handed to
 * the engine is `eurSekRate`, which is LOCAL CURRENCY UNITS PER EUR for the chosen
 * country. That keeps FCR physics free of SEK/DKK knowledge and makes the historical
 * price datasets (all EUR/MW/h) reusable by every market.
 */

export type Currency = "SEK" | "EUR" | "DKK" | "NOK";

export type CurrencyCountry = "SE" | "NO" | "FI" | "DK" | "DE";

/** Country -> the currency its customers see and enter values in. Source of truth. */
export const CURRENCY_BY_COUNTRY: Record<CurrencyCountry, Currency> = {
  SE: "SEK",
  NO: "NOK",
  FI: "EUR",
  DK: "DKK",
  DE: "EUR",
};

/**
 * DEFAULT EXCHANGE RATES — units of the currency per 1 EUR.
 * Planning assumptions, not live rates. One table, one place to swap for live rates
 * later without touching the engine or any UI.
 */
export const DEFAULT_RATES_PER_EUR: Record<Currency, number> = {
  EUR: 1,
  SEK: 11.3,
  DKK: 7.46,
  NOK: 11.6,
};

export function currencyForCountry(code: CurrencyCountry): Currency {
  return CURRENCY_BY_COUNTRY[code] ?? "SEK";
}

/** Local currency units per 1 EUR for a country. Handed to the engine as `eurSekRate`. */
export function localUnitsPerEur(
  code: CurrencyCountry,
  rates: Record<Currency, number> = DEFAULT_RATES_PER_EUR,
): number {
  return rates[currencyForCountry(code)];
}

/**
 * THE ONLY conversion function in the app. Converts via EUR, so any pair is supported.
 * Same currency in and out returns the amount untouched (no rounding, no drift).
 */
export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  rates: Record<Currency, number> = DEFAULT_RATES_PER_EUR,
): number {
  if (from === to) return amount;
  const inEur = amount / (rates[from] || 1);
  return inEur * (rates[to] || 1);
}

/** Short unit suffix used next to input fields, e.g. "kr/kWh" or "€/kWh". */
export const CURRENCY_SUFFIX: Record<Currency, string> = {
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
  EUR: "€",
};

const LOCALE_BY_CURRENCY: Record<Currency, string> = {
  SEK: "sv-SE",
  NOK: "nb-NO",
  DKK: "da-DK",
  EUR: "de-DE",
};

/** Formats a money amount with the correct locale and currency symbol. */
export function formatCurrency(
  value: number,
  currency: Currency,
  opts: { locale?: string; digits?: number } = {},
): string {
  const digits = opts.digits ?? 0;
  return new Intl.NumberFormat(opts.locale ?? LOCALE_BY_CURRENCY[currency], {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
    .format(value)
    .replace(/\u00a0/g, " ");
}

/** "1 234 kr/år" / "1.234 €/år" — the per-year form used across the result page. */
export function formatPerYear(
  value: number,
  currency: Currency,
  opts: { locale?: string; digits?: number } = {},
): string {
  return `${formatCurrency(value, currency, opts)}/år`;
}
