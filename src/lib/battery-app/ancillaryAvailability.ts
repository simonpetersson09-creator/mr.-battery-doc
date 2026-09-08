/**
 * Is there a VERIFIED historical ancillary (FCR-D up) price dataset for a country?
 *
 * App layer only — the engine itself never invents a price. When this is false the UI
 * must present the ancillary economics as "not available for this country", never as
 * 0 kr, and never with another country's prices.
 */

import { fcrMarketArea, getCountry, type CountryCode } from "@/lib/country-config";
import { hasVerifiedFcrPrices } from "@/lib/lab/ancillary/prices";

export function ancillaryDataAvailable(code: CountryCode): boolean {
  return hasVerifiedFcrPrices(fcrMarketArea(code));
}

/** Short customer-facing note when the country has no verified dataset. */
export function ancillaryUnavailableText(code: CountryCode): string | null {
  if (ancillaryDataAvailable(code)) return null;
  return `Stödtjänster kan inte beräknas för ${getCountry(code).name} ännu – verifierat historiskt prisunderlag saknas. Ingen intäkt antas.`;
}
