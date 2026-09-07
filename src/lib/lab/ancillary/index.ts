import { DEFAULT_EUR_SEK_RATE } from "./fcrEconomics";
import { MARKETS, SE_MARKET } from "./markets/se";
import type {
  AncillaryConfig,
  AncillaryPlan,
  FlexLikeReservation,
  MarketId,
  MarketProfile,
} from "./types";

export * from "./types";
export * from "./ingest";
export * from "./revenue";
export * from "./fcrEconomics";
export { MARKETS, SE_MARKET };

/**
 * The ONLY ancillary service in the active product model. Everything else in the
 * Swedish market is parked (see markets/se.ts). Selecting a service is therefore not
 * a user choice any more: turning ancillary services on means FCR-D up.
 */
export const ACTIVE_SERVICE_KEY = "FCR-D-up";

/** Services actually offered by the product, regardless of legacy saved config. */
export function activeServices(market: MarketProfile) {
  return market.services.filter((s) => s.key === ACTIVE_SERVICE_KEY);
}

export const ALL_HOURS_OF_DAY = Array.from({ length: 24 }, (_, i) => i);
export const ALL_MONTHS_OF_YEAR = Array.from({ length: 12 }, (_, i) => i + 1);

export function marketProfile(id: MarketId): MarketProfile {
  return MARKETS[id] ?? SE_MARKET;
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
  const market = marketProfile(cfg.marketId);
  const selected = activeServices(market);
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

  return {
    active: hoursOfDay.length > 0 && months.length > 0,
    upPowerKw: up.length > 0 ? cfg.offeredPowerKw : 0,
    downPowerKw: down.length > 0 ? cfg.offeredPowerKw : 0,
    upEnergyKWh: up.length > 0 ? cfg.offeredPowerKw * maxEndurance(up) : 0,
    downEnergyKWh: down.length > 0 ? cfg.offeredPowerKw * maxEndurance(down) : 0,
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
  const market = marketProfile(cfg.marketId);
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
