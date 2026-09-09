/**
 * Can Battery Doc calculate ancillary (reserve) revenue for the selected market?
 *
 * App layer only — the engine itself never invents a price. When this is false the UI
 * must present the ancillary economics as "not available for this market", never as
 * 0 kr, and never with another market's prices.
 */

import { getCountry, type CountryCode } from "@/lib/country-config";
import {
  reserveCalculationAvailable,
  reserveMarketConfig,
  type MarketArea,
} from "@/lib/reserve-market";

export function ancillaryDataAvailable(
  code: CountryCode,
  area: MarketArea | null = null,
): boolean {
  return reserveCalculationAvailable(code, area);
}

/** Short customer-facing note when the market has no finished model/price data. */
export function ancillaryUnavailableText(
  code: CountryCode,
  area: MarketArea | null = null,
): string | null {
  if (ancillaryDataAvailable(code, area)) return null;
  const cfg = reserveMarketConfig(code, area);
  const where = area ? `${getCountry(code).name} ${area}` : getCountry(code).name;
  if (cfg && cfg.physics === "symmetric") {
    return `${where} använder symmetrisk FCR. Marknaden är konfigurerad men beräkningen är ännu inte tillgänglig – ingen intäkt antas.`;
  }
  return `Stödtjänster kan inte beräknas för ${where} ännu – verifierat historiskt prisunderlag saknas. Ingen intäkt antas.`;
}
