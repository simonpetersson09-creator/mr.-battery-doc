import { DEFAULT_EUR_SEK_RATE } from "./fcrEconomics";
import { FI_MARKET } from "./markets/fi";
import { MARKETS, SE_MARKET } from "./markets/se";
import type { FcrMarketArea } from "./prices";
import type {
  AncillaryConfig,
  AncillaryPlan,
  FlexLikeReservation,
  MarketId,
  MarketProfile,
  ReserveMode,
} from "./types";

export * from "./types";
export * from "./ingest";
export * from "./revenue";
export * from "./fcrEconomics";
export * from "./prices";
export { MARKETS, SE_MARKET, FI_MARKET };

/**
 * The ONLY ancillary service in the active product model. Everything else in the
 * Swedish market is parked (see markets/se.ts). Selecting a service is therefore not
 * a user choice any more: turning ancillary services on means FCR-D up.
 */
export const ACTIVE_SERVICE_KEY = "FCR-D-up";
/** Swedish down-regulation product, active only in the "up-and-down" reserve mode. */
export const ACTIVE_DOWN_SERVICE_KEY = "FCR-D-down";

/**
 * WHICH RESERVE PRODUCT A MARKET USES. One table, no per-country engine:
 *  - Nordic FCR-D up (SE, FI, DK2)  -> "upward"
 *  - Continental FCR (DE, DK1)      -> "symmetric"
 * Denmark must state its price area; an unknown area is never guessed and falls back
 * to the Nordic upward product only for DK2.
 */
export function reserveModeForMarket(
  country: "SE" | "FI" | "DK" | "DE" | undefined,
  marketArea?: "DK1" | "DK2" | null,
): ReserveMode {
  if (country === "DE") return "symmetric";
  /**
   * DK2 is part of the SAME Nordic FCR market as Sweden and shares its 2025 price series,
   * so it runs FCR-D upp + FCR-D ned as well. DK1 stays on the continental symmetric
   * product. An unknown Danish area is never guessed.
   */
  if (country === "DK") return marketArea === "DK1" ? "symmetric" : "up-and-down";
  /**
   * SWEDEN and FINLAND run two separate Nordic products on the same battery, each with its
   * verified national FCR-D ned price series (SvK 2025 / Fingrid dataset 283) and their
   * own market definitions. A market without a verified
   * FCR-D ned series keeps the pure upward product — data is never borrowed across
   * market areas that do not share a market.
   */
  if (country === "SE" || country === "FI") return "up-and-down";
  return "upward";
}

/** Price/market area used for the historical dataset lookup. */
export function priceAreaForMarket(
  country: "SE" | "FI" | "DK" | "DE" | undefined,
  marketArea?: "DK1" | "DK2" | null,
): FcrMarketArea {
  if (country === "DK" && (marketArea === "DK1" || marketArea === "DK2")) return marketArea;
  return country ?? "SE";
}

/** Services actually offered by the product, regardless of legacy saved config. */
export function activeServices(market: MarketProfile, mode: ReserveMode = "upward") {
  const keys =
    mode === "up-and-down"
      ? [ACTIVE_SERVICE_KEY, ACTIVE_DOWN_SERVICE_KEY]
      : [ACTIVE_SERVICE_KEY];
  return market.services.filter((s) => keys.includes(s.key));
}

export const ALL_HOURS_OF_DAY = Array.from({ length: 24 }, (_, i) => i);
export const ALL_MONTHS_OF_YEAR = Array.from({ length: 12 }, (_, i) => i + 1);

export function marketProfile(id: MarketId): MarketProfile {
  return MARKETS[id] ?? SE_MARKET;
}

/**
 * Market RULES for a price area. Each market answers for its own requirements; only
 * areas without an own profile fall back to the Nordic Swedish rule set (the legacy
 * behaviour for saved cases created before the country was tracked).
 */
export function marketProfileForPriceArea(area: FcrMarketArea | undefined): MarketProfile {
  return area === "FI" ? FI_MARKET : SE_MARKET;
}

/** Default config: market rules only, NO prices and NO assumed revenue. */
export function defaultAncillaryConfig(): AncillaryConfig {
  return {
    enabled: false,
    marketId: "SE",
    serviceKeys: [ACTIVE_SERVICE_KEY],
    offeredPowerKw: 0,
    offeredHoursSharePct: 100,
    // Hypothetical scenario is the default: the tool must be usable before the
    // owner has any aggregator agreement. Everything is labelled as a scenario.
    assumeMarketAccess: true,
    aggregatedParticipation: true,
    reservationHours: [...ALL_HOURS_OF_DAY],
    reservationMonths: [...ALL_MONTHS_OF_YEAR],
    eurSekRate: DEFAULT_EUR_SEK_RATE,
    priceCountry: "SE",
    reserveMode: "upward",
    aggregatorSharePct: null,
    aggregatorFixedKrPerYear: null,
    aggregatorAccessConfirmed: false,
    prequalificationConfirmed: false,
    dataset: null,
  };
}

/** True when the market gates may be treated as met (confirmed OR assumed scenario). */
export function marketAccessGranted(cfg: AncillaryConfig): boolean {
  return cfg.assumeMarketAccess || cfg.aggregatorAccessConfirmed;
}
export function prequalificationGranted(cfg: AncillaryConfig): boolean {
  return cfg.assumeMarketAccess || cfg.prequalificationConfirmed;
}

/**
 * Directional reservation plan for the dispatch. Up- and down-regulation are kept
 * apart, and the reservation only applies during the scheduled hours/months — the
 * other strategies keep the full battery outside those periods.
 */
export function ancillaryPlan(cfg: AncillaryConfig): AncillaryPlan | null {
  if (!cfg.enabled || cfg.offeredPowerKw <= 0) return null;
  // Market RULES follow the price area (Finland answers for Finnish requirements), never
  // the legacy `marketId`, which is "SE" in every saved configuration.
  const market = marketProfileForPriceArea(cfg.priceCountry);
  const mode: ReserveMode = cfg.reserveMode ?? "upward";
  const selected = activeServices(market, mode);
  if (selected.length === 0) return null;

  const up = selected.filter((s) => s.direction === "up" || s.direction === "symmetric");
  const down = selected.filter((s) => s.direction === "down" || s.direction === "symmetric");
  const maxEndurance = (list: typeof selected) =>
    list.length === 0 ? 0 : Math.max(...list.map((s) => s.requirements.enduranceHours));

  // A missing or empty period list means "no restriction" (whole year), never
  // "no reservation" — otherwise an older saved configuration silently disables it.
  const hoursOfDay = cfg.reservationHours?.length ? [...cfg.reservationHours] : [...ALL_HOURS_OF_DAY];
  const months = cfg.reservationMonths?.length ? [...cfg.reservationMonths] : [...ALL_MONTHS_OF_YEAR];
  const wholeYear = hoursOfDay.length === 24 && months.length === 12;

  const notes: string[] = [];
  notes.push(
    wholeYear
      ? "FÖRENKLING: reservationen antas gälla alla timmar hela året."
      : `Reservation endast under valda perioder: ${hoursOfDay.length} timmar/dygn i ${months.length} månader.`,
  );
  if (cfg.assumeMarketAccess && !(cfg.aggregatorAccessConfirmed && cfg.prequalificationConfirmed))
    notes.push(
      "HYPOTETISKT SCENARIO: aggregatoråtkomst och förkvalificering är antagna, inte bekräftade.",
    );
  notes.push("Aktivering av tjänsten simuleras INTE — endast bokad beredskap.");

  /**
   * SYMMETRIC FCR: the same kW is sold in BOTH directions, so the down side mirrors
   * the up side (power and endurance energy) even though the underlying service
   * definition is an up-service. In "upward" mode nothing changes.
   */
  const symmetric = mode === "symmetric";
  const upAndDown = mode === "up-and-down";
  if (upAndDown)
    notes.push(
      "FCR-D UPP + FCR-D NED: två separata produkter på samma batteri. Uppsidan kräver lagrad energi och urladdningseffekt, nedsidan kräver laddningsutrymme och laddeffekt — samma kW eller kWh räknas aldrig två gånger.",
    );
  const endurance = maxEndurance(selected);
  if (symmetric)
    notes.push(
      "SYMMETRISK FCR: samma effekt måste kunna levereras uppåt och tas emot nedåt varje timme.",
    );

  return {
    active: hoursOfDay.length > 0 && months.length > 0,
    reserveMode: mode,
    upPowerKw: symmetric ? cfg.offeredPowerKw : up.length > 0 ? cfg.offeredPowerKw : 0,
    downPowerKw: symmetric ? cfg.offeredPowerKw : down.length > 0 ? cfg.offeredPowerKw : 0,
    upEnergyKWh: symmetric
      ? cfg.offeredPowerKw * endurance
      : up.length > 0
        ? cfg.offeredPowerKw * maxEndurance(up)
        : 0,
    downEnergyKWh: symmetric
      ? cfg.offeredPowerKw * endurance
      : down.length > 0
        ? cfg.offeredPowerKw * maxEndurance(down)
        : 0,
    socHeadroomPct: Math.max(...selected.map((s) => s.requirements.socHeadroomPct)),
    serviceMinSocPct: Math.max(...selected.map((s) => s.requirements.serviceMinSocPct)),
    serviceMaxSocPct: Math.min(...selected.map((s) => s.requirements.serviceMaxSocPct)),
    hoursOfDay,
    months,
    wholeYear,
    activationSimulated: false,
    notes,
  };
}

/**
 * Legacy flex-shaped reservation (kept for the older flexibility strategy and for
 * tests). The dispatch now uses `ancillaryPlan` for directional reservations.
 */
export function ancillaryReservation(cfg: AncillaryConfig): FlexLikeReservation | null {
  if (!cfg.enabled || cfg.offeredPowerKw <= 0) return null;
  const market = marketProfileForPriceArea(cfg.priceCountry);
  const selected = activeServices(market);
  if (selected.length === 0) return null;
  const enduranceHours = Math.max(...selected.map((s) => s.requirements.enduranceHours));
  const socHeadroomPct = Math.max(...selected.map((s) => s.requirements.socHeadroomPct));
  const serviceMinSocPct = Math.max(...selected.map((s) => s.requirements.serviceMinSocPct));
  const serviceMaxSocPct = Math.min(...selected.map((s) => s.requirements.serviceMaxSocPct));
  const availabilityPct = Math.max(...selected.map((s) => s.requirements.availabilityPct));
  return {
    enabled: true,
    reservedPowerKw: cfg.offeredPowerKw,
    enduranceHours,
    socHeadroomPct,
    serviceMinSocPct,
    serviceMaxSocPct,
    availabilityPct,
    // Revenue is never derived from these two — kept at 0 so no price can be implied.
    paymentKrPerKwYear: 0,
    revenueSharePct: 0,
  };
}
