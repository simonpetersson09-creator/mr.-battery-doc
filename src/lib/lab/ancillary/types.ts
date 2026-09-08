/**
 * Ancillary services / frequency markets — common engine types.
 *
 * Design rules (deliberate, and enforced by the tests):
 *  - The ENGINE is market agnostic. Everything country specific lives in a
 *    MarketProfile (see ./markets/*), so more countries can be added later.
 *  - NO default prices exist anywhere in this module. Revenue is only ever
 *    computed from an ingested price dataset that the user supplied. Missing
 *    data is reported as a gap, never silently replaced by an assumption.
 *  - Capacity payment (kr per kW and hour of availability) and activated
 *    energy payment (kr per kWh actually delivered) are separate concepts and
 *    are never mixed.
 *  - Up-regulation (discharge) and down-regulation (charge) are separate
 *    directions with separate SOC/headroom requirements.
 */

export type MarketId = "SE";

/** What the payment is for. */
export type PaymentKind = "capacity" | "activated-energy";

/** Which way the battery has to move power when the service is called. */
export type RegulationDirection = "up" | "down" | "symmetric";

/** Resolution of the supplied price data — decides how detailed we may compute. */
export type PriceResolution = "hourly" | "daily" | "weekly" | "monthly" | "annual" | "unknown";

/** Physical/market requirements a battery must meet to be qualified for a service. */
export interface ServiceRequirements {
  /** Minimum bid size in kW (market rule, per bid — aggregators may pool). */
  minBidKw: number;
  /** Endurance: hours the reserved power must be sustainable in the paid direction. */
  enduranceHours: number;
  /** Extra SOC headroom demanded on top of endurance, % of nominal. */
  socHeadroomPct: number;
  /** SOC window the service itself requires, % of nominal. */
  serviceMinSocPct: number;
  serviceMaxSocPct: number;
  /** Availability requirement over the paid hours, %. */
  availabilityPct: number;
  /** True when participation realistically requires an aggregator/BSP. */
  requiresAggregator: boolean;
  /** True when prequalification testing by the TSO is required. */
  requiresPrequalification: boolean;
}

export interface ServiceDefinition {
  /** Stable key used to map ingested price columns onto a service. */
  key: string;
  /** Name as used by the TSO/market. */
  label: string;
  direction: RegulationDirection;
  /** Payment kinds this service can pay out. */
  payments: PaymentKind[];
  /** Hours per year the service is procured (market design, not availability). */
  procuredHoursPerYear: number;
  requirements: ServiceRequirements;
  /** Free-text notes shown as explicit assumptions in the output. */
  notes: string[];
}

export interface MarketProfile {
  id: MarketId;
  label: string;
  currency: string;
  /** Native unit the TSO publishes capacity prices in, before normalisation. */
  nativeCapacityUnit: "currency/MW/h" | "currency/kW/h";
  /** Native unit for activated energy prices. */
  nativeEnergyUnit: "currency/MWh" | "currency/kWh";
  services: ServiceDefinition[];
  /** Column-header aliases → service key, used by the ingestion review step. */
  columnAliases: Record<string, string>;
  notes: string[];
}

/** One normalised price observation. Always kr/kW/h or kr/kWh — never native units. */
export interface PricePoint {
  serviceKey: string;
  paymentKind: PaymentKind;
  /** ISO-ish period label exactly as it appeared in the source, e.g. "2025-09". */
  period: string;
  /** Normalised value: kr/kW/h for capacity, kr/kWh for activated energy. */
  value: number;
  /** Hours the period covers, used to turn kr/kW/h into kr/kW/period. */
  hoursInPeriod: number;
}

export interface PriceDataset {
  marketId: MarketId;
  currency: string;
  resolution: PriceResolution;
  /** First and last period label present in the data. */
  periodFrom: string;
  periodTo: string;
  points: PricePoint[];
  /** Source description supplied by the user (who published it, when). */
  source: string;
  /** Anything the ingestion could not interpret — must be shown to the user. */
  unmapped: string[];
  warnings: string[];
}

export interface AncillaryConfig {
  enabled: boolean;
  marketId: MarketId;
  /** Service keys the user wants to evaluate. Empty = none. */
  serviceKeys: string[];
  /** Power the owner intends to offer to the market, kW. */
  offeredPowerKw: number;
  /** Share of the procured hours the battery is actually offered, %. */
  offeredHoursSharePct: number;
  /**
   * HYPOTHETICAL SCENARIO. When true the calculation assumes that an aggregator
   * would accept the asset and that it would pass prequalification, WITHOUT the
   * owner having any agreement. Everything computed under this flag must be
   * labelled as a scenario, never as confirmed market participation.
   */
  assumeMarketAccess: boolean;
  /**
   * Participation through an aggregator pool. The market minimum bid then applies
   * to the POOL, not to the single battery, so a 3 kW asset is not disqualified by
   * a 100 kW minimum bid. Technical battery requirements still apply in full.
   */
  aggregatedParticipation: boolean;
  /** Hours of day (0-23) the reservation is actually offered. */
  reservationHours: number[];
  /** Months (1-12) the reservation is actually offered. */
  reservationMonths: number[];
  /** Aggregator cut of gross revenue, %. Null = unknown → reported as a gap. */
  aggregatorSharePct: number | null;
  /** Fixed aggregator/subscription fee, kr/year. Null = unknown. */
  aggregatorFixedKrPerYear: number | null;
  /** Explicit confirmation that an aggregator will accept this asset. */
  aggregatorAccessConfirmed: boolean;
  /** Explicit confirmation that the asset is (or will be) prequalified. */
  prequalificationConfirmed: boolean;
  /**
   * EUR -> SEK conversion used by the FCR economics. An explicit ASSUMPTION, kept apart
   * from the price data itself so it can later be replaced by an annual average or
   * external FX data.
   */
  eurSekRate: number;
  /**
   * Which country's HISTORICAL FCR-D up price series to apply on top of the held
   * reservation. Physics and sizing are unaffected. Defaults to "SE".
   */
  priceCountry?: "SE" | "FI" | "DK" | "DE";
  /** Ingested dataset. Null until the user supplies prices. */
  dataset: PriceDataset | null;
}

/**
 * Directional reservation plan handed to the dispatch. Up- and down-regulation are
 * reserved SEPARATELY, and only during the scheduled hours/months, so the battery is
 * fully available to the other strategies outside the reserved periods.
 */
export interface AncillaryPlan {
  active: boolean;
  /** Discharge power withheld for up-regulation, kW. */
  upPowerKw: number;
  /** Charge power withheld for down-regulation, kW. */
  downPowerKw: number;
  /** AC energy that must be deliverable during an up-regulation call, kWh. */
  upEnergyKWh: number;
  /** AC energy that must be absorbable during a down-regulation call, kWh. */
  downEnergyKWh: number;
  /** Extra SOC headroom the services demand, % of nominal. */
  socHeadroomPct: number;
  serviceMinSocPct: number;
  serviceMaxSocPct: number;
  hoursOfDay: number[];
  months: number[];
  /** True when the reservation covers every hour of the year (a simplification). */
  wholeYear: boolean;
  /** Never true in this version: activation itself is not simulated. */
  activationSimulated: boolean;
  notes: string[];
}


export interface ServiceOutcome {
  serviceKey: string;
  label: string;
  direction: RegulationDirection;
  /** Power that passed every physical/market gate, kW. */
  qualifiedPowerKw: number;
  /** Energy reserved for the service and unavailable to other strategies, kWh. */
  reservedEnergyKWh: number;
  /** Hours actually paid: procured hours x offered share x availability. */
  paidHours: number;
  /** Gross capacity revenue over the data period, kr. Null = data missing. */
  grossCapacityKr: number | null;
  /** Gross activated-energy revenue, kr. Null when activation data is missing. */
  grossActivatedEnergyKr: number | null;
  /** Reasons the service is not feasible (empty = feasible). */
  blockers: string[];
  /** Data the calculation would need but did not get. */
  dataGaps: string[];
  assumptions: string[];
}

export type RevenueStatus = "missing-price-data" | "computed";

export const MISSING_PRICE_TEXT = "Intäkt kan inte beräknas – prisunderlag saknas";

export interface AncillaryOutcome {
  enabled: boolean;
  marketId: MarketId;
  currency: string;
  /** Period the historical result refers to — never presented as a forecast. */
  periodFrom: string | null;
  periodTo: string | null;
  resolution: PriceResolution;
  services: ServiceOutcome[];
  /** Sum of gross revenue over the data period, kr. Null when no data. */
  grossKr: number | null;
  /** Owner net after aggregator cut. Null when cost data is missing. */
  netKr: number | null;
  /** Missing prices are never 0 kr: the status says which case it is. */
  revenueStatus: RevenueStatus;
  revenueMessage: string;
  /** Total power/energy locked away from the other strategies. */
  reservedPowerKw: number;
  reservedPowerUpKw: number;
  reservedPowerDownKw: number;
  reservedEnergyKWh: number;
  /** True when market access/prequalification is ASSUMED, not confirmed. */
  hypotheticalScenario: boolean;
  /** Activation (how often the service is actually called) is not simulated. */
  activationSimulated: boolean;
  dataGaps: string[];
  assumptions: string[];
  /** Mandatory disclaimer text: historical outcome, not guaranteed future yield. */
  disclaimer: string;
}


/**
 * Reservation shape shared with the dispatch (structurally identical to FlexConfig).
 * One single reservation mechanism = power/energy can never be booked twice.
 */
export interface FlexLikeReservation {
  enabled: boolean;
  reservedPowerKw: number;
  enduranceHours: number;
  socHeadroomPct: number;
  serviceMinSocPct: number;
  serviceMaxSocPct: number;
  availabilityPct: number;
  paymentKrPerKwYear: number;
  revenueSharePct: number;
}
