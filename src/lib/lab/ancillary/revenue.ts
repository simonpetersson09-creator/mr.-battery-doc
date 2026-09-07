import { MISSING_PRICE_TEXT } from "./types";
import type {
  AncillaryConfig,
  AncillaryOutcome,
  MarketProfile,
  RevenueStatus,
  ServiceDefinition,
  ServiceOutcome,
} from "./types";

export const DISCLAIMER =
  "Beloppen är ett HISTORISKT räknat utfall för den angivna dataperioden och är inte en garanterad framtida avkastning. Marknadspriser varierar och deltagande kräver godkänd aggregator och förkvalificering.";

export interface BatteryCapability {
  capacityKWh: number;
  powerKw: number;
  /** Usable energy left after the other strategies' reservations, kWh. */
  usableKWh: number;
  /** Round-trip efficiency, fraction. */
  roundTripEfficiency: number;
  /** Operational grid limits, kW (the design-margin values, not the physical ones). */
  gridImportKw: number;
  gridExportKw: number;
  /** Highest simulated household net flows, kW — the headroom the service may use. */
  usedImportKw: number;
  usedExportKw: number;
}

/** Energy the service must be able to sustain, kWh — endurance plus SOC headroom. */
export function enduranceEnergyKWh(
  svc: ServiceDefinition,
  qualifiedPowerKw: number,
  capacityKWh: number,
  roundTripEfficiency: number,
): number {
  const dischargeEff = Math.sqrt(Math.max(0.01, roundTripEfficiency));
  const raw = qualifiedPowerKw * svc.requirements.enduranceHours;
  const corrected = svc.direction === "down" ? raw : raw / dischargeEff;
  return corrected + (svc.requirements.socHeadroomPct / 100) * capacityKWh;
}

/** SOC window the service demands, kWh. */
export function serviceWindowKWh(svc: ServiceDefinition, capacityKWh: number): number {
  const lo = (svc.requirements.serviceMinSocPct / 100) * capacityKWh;
  const hi = (svc.requirements.serviceMaxSocPct / 100) * capacityKWh;
  return Math.max(0, hi - lo);
}

function evaluateService(
  svc: ServiceDefinition,
  cfg: AncillaryConfig,
  bat: BatteryCapability,
  measuredAvailabilityPct?: number | null,
): ServiceOutcome {
  const blockers: string[] = [];
  const dataGaps: string[] = [];
  const assumptions: string[] = [...svc.notes];

  const accessOk = cfg.assumeMarketAccess || cfg.aggregatorAccessConfirmed;
  const prequalOk = cfg.assumeMarketAccess || cfg.prequalificationConfirmed;
  if (svc.requirements.requiresAggregator && !accessOk)
    blockers.push("Aggregatoråtkomst är inte bekräftad — deltagande kan inte antas.");
  if (svc.requirements.requiresPrequalification && !prequalOk)
    blockers.push("Förkvalificering hos systemoperatören är inte bekräftad.");
  if (cfg.assumeMarketAccess && !(cfg.aggregatorAccessConfirmed && cfg.prequalificationConfirmed))
    assumptions.push(
      "HYPOTETISKT SCENARIO: aggregatoråtkomst och förkvalificering är antagna, inte bekräftade.",
    );


  // Power gates: battery power, grid headroom in the paid direction, offered power.
  const exportHeadroom = Math.max(0, bat.gridExportKw - bat.usedExportKw);
  const importHeadroom = Math.max(0, bat.gridImportKw - bat.usedImportKw);
  const directionHeadroom =
    svc.direction === "down"
      ? importHeadroom
      : svc.direction === "up"
        ? exportHeadroom
        : Math.min(importHeadroom, exportHeadroom);

  let qualifiedPowerKw = Math.max(
    0,
    Math.min(cfg.offeredPowerKw, bat.powerKw, directionHeadroom),
  );
  if (cfg.offeredPowerKw <= 0) blockers.push("Ingen effekt är erbjuden till marknaden (0 kW).");
  if (directionHeadroom <= 0)
    blockers.push(
      svc.direction === "down"
        ? "Nätets importgräns har inget utrymme kvar för nedreglering."
        : "Nätets exportgräns har inget utrymme kvar för uppreglering.",
    );
  if (qualifiedPowerKw + 1e-9 < cfg.offeredPowerKw)
    assumptions.push(
      `Erbjuden effekt begränsas till ${qualifiedPowerKw.toFixed(1)} kW av batteriets effekt och nätets utrymme.`,
    );
  if (qualifiedPowerKw > 0 && qualifiedPowerKw < svc.requirements.minBidKw) {
    if (cfg.aggregatedParticipation || cfg.aggregatorAccessConfirmed) {
      /**
       * Minimum bid is a POOL-level market rule. With aggregated participation a small
       * asset is not disqualified by it; only the battery's own technical requirements
       * (power, energy, SOC window, grid headroom) remain as gates.
       */
      assumptions.push(
        `Minsta bud (${svc.requirements.minBidKw} kW) gäller aggregatorns pool, inte det enskilda batteriet.`,
      );
    } else {
      blockers.push(
        `Effekten är mindre än minsta bud (${svc.requirements.minBidKw} kW) och inget aggregerat deltagande är angivet.`,
      );
    }
  }

  // Energy gates: endurance must fit inside both the service SOC window and the usable energy.
  const needKWh = enduranceEnergyKWh(svc, qualifiedPowerKw, bat.capacityKWh, bat.roundTripEfficiency);
  const windowKWh = Math.min(serviceWindowKWh(svc, bat.capacityKWh), bat.usableKWh);
  if (qualifiedPowerKw > 0 && needKWh > windowKWh + 1e-9) {
    blockers.push(
      `Uthålligheten kräver ${needKWh.toFixed(1)} kWh men bara ${windowKWh.toFixed(1)} kWh är tillgängligt i tjänstens SOC-fönster.`,
    );
    qualifiedPowerKw = 0;
  }

  const feasible = blockers.length === 0 && qualifiedPowerKw > 0;
  const reservedEnergyKWh = feasible ? Math.min(needKWh, windowKWh) : 0;

  const share = Math.min(100, Math.max(0, cfg.offeredHoursSharePct)) / 100;
  const requiredAvailability = Math.min(100, Math.max(0, svc.requirements.availabilityPct));
  /**
   * If the simulation shows that the readiness (stored energy for up-regulation, free
   * room for down-regulation) cannot be held every reserved hour, the availability
   * DROPS to the simulated level instead of being assumed met.
   */
  const availabilityPctUsed =
    measuredAvailabilityPct === null || measuredAvailabilityPct === undefined
      ? requiredAvailability
      : Math.min(requiredAvailability, Math.max(0, measuredAvailabilityPct));
  const availability = availabilityPctUsed / 100;
  if (
    measuredAvailabilityPct !== null &&
    measuredAvailabilityPct !== undefined &&
    measuredAvailabilityPct + 1e-9 < requiredAvailability
  )
    assumptions.push(
      `Simulerad beredskap (${measuredAvailabilityPct.toFixed(0)} %) är lägre än kravet (${requiredAvailability} %) — tillgängligheten sänks till den simulerade nivån.`,
    );
  const paidHours = feasible ? svc.procuredHoursPerYear * share * availability : 0;
  assumptions.push(
    `Betalda timmar = ${svc.procuredHoursPerYear} upphandlade h x ${Math.round(share * 100)} % erbjuden tid x ${Math.round(availability * 100)} % tillgänglighet.`,
  );


  // ---- revenue: only from ingested data, never from a default price ----
  let grossCapacityKr: number | null = null;
  let grossActivatedEnergyKr: number | null = null;

  const points = (cfg.dataset?.points ?? []).filter((p) => p.serviceKey === svc.key);
  const capacityPoints = points.filter((p) => p.paymentKind === "capacity");
  const energyPoints = points.filter((p) => p.paymentKind === "activated-energy");

  if (!cfg.dataset) {
    dataGaps.push("Inget prisunderlag är inläst — ingen intäkt beräknas.");
  } else if (capacityPoints.length === 0) {
    dataGaps.push(`Prisunderlaget saknar kapacitetspris för ${svc.label}.`);
  } else if (feasible) {
    grossCapacityKr = capacityPoints.reduce(
      (sum, p) => sum + p.value * qualifiedPowerKw * p.hoursInPeriod * share * availability,
      0,
    );
    const covered = capacityPoints.reduce((h, p) => h + p.hoursInPeriod, 0);
    assumptions.push(
      `Kapacitetsintäkt = pris (kr/kW/h) x ${qualifiedPowerKw.toFixed(1)} kW x betalda timmar; underlaget täcker ${covered} timmar.`,
    );
  } else {
    grossCapacityKr = 0;
  }

  if (svc.payments.includes("activated-energy")) {
    if (energyPoints.length === 0)
      dataGaps.push(
        `${svc.label} betalar även för aktiverad energi, men underlaget saknar energipris.`,
      );
    dataGaps.push(
      `Aktiveringsdata (hur ofta och hur mycket ${svc.label} faktiskt aktiveras) saknas — energiintäkt och energikostnad kan inte beräknas.`,
    );
  }

  return {
    serviceKey: svc.key,
    label: svc.label,
    direction: svc.direction,
    qualifiedPowerKw,
    reservedEnergyKWh,
    paidHours,
    grossCapacityKr,
    grossActivatedEnergyKr,
    blockers,
    dataGaps,
    assumptions,
  };
}

/**
 * Historical ancillary-service result for one battery configuration.
 * Pure post-processing: it never changes the physical dispatch. The energy and
 * power it reports as reserved are the SAME reservation the dispatch already
 * withheld from the other strategies, so nothing is double booked.
 */
export function computeAncillary(
  market: MarketProfile,
  cfg: AncillaryConfig,
  bat: BatteryCapability,
  measuredAvailabilityPct?: number | null,
): AncillaryOutcome {
  const selected = market.services.filter((s) => s.key === "FCR-D-up");
  const services = cfg.enabled
    ? selected.map((s) => evaluateService(s, cfg, bat, measuredAvailabilityPct))
    : [];

  const dataGaps = [...new Set(services.flatMap((s) => s.dataGaps))];
  const assumptions = [...market.notes];
  assumptions.push(
    "Aktivering simuleras INTE. Det som visas är bokad beredskap, inte levererad stödtjänst.",
  );

  if (cfg.enabled && selected.length === 0)
    dataGaps.push("Ingen stödtjänst är vald — inget beräknas.");

  const anyRevenue = services.some((s) => s.grossCapacityKr !== null);
  const grossKr = anyRevenue
    ? services.reduce((sum, s) => sum + (s.grossCapacityKr ?? 0), 0)
    : null;

  let netKr: number | null = null;
  if (grossKr !== null) {
    if (cfg.aggregatorSharePct === null) {
      dataGaps.push("Aggregatorns andel av intäkten är okänd — netto kan inte beräknas.");
    } else if (cfg.aggregatorFixedKrPerYear === null) {
      dataGaps.push("Aggregatorns fasta avgift är okänd — netto kan inte beräknas.");
    } else {
      netKr =
        grossKr * (1 - cfg.aggregatorSharePct / 100) - cfg.aggregatorFixedKrPerYear;
      dataGaps.push(
        "Nettot saknar fortfarande kostnad för aktiverad energi och slitage (kräver aktiveringsdata).",
      );
    }
  }

  /**
   * Missing prices are NEVER 0 kr: grossKr stays null and the status explains why.
   * A computed zero (feasible = false with prices present) is still shown as 0.
   */
  const revenueStatus: RevenueStatus = grossKr === null ? "missing-price-data" : "computed";
  const revenueMessage =
    revenueStatus === "missing-price-data" ? MISSING_PRICE_TEXT : "Beräknat på inläst prisunderlag.";

  // Directional reservation: up and down are separate, never summed into one number.
  const dirPower = (dirs: string[]) =>
    services
      .filter((s) => dirs.includes(s.direction))
      .reduce((m, s) => Math.max(m, s.qualifiedPowerKw), 0);
  const reservedPowerUpKw = dirPower(["up", "symmetric"]);
  const reservedPowerDownKw = dirPower(["down", "symmetric"]);
  const reservedPowerKw = Math.max(reservedPowerUpKw, reservedPowerDownKw);
  const reservedEnergyKWh = services.reduce((m, s) => Math.max(m, s.reservedEnergyKWh), 0);

  return {
    enabled: cfg.enabled,
    marketId: market.id,
    currency: cfg.dataset?.currency ?? market.currency,
    periodFrom: cfg.dataset?.periodFrom || null,
    periodTo: cfg.dataset?.periodTo || null,
    resolution: cfg.dataset?.resolution ?? "unknown",
    services,
    grossKr,
    netKr,
    revenueStatus,
    revenueMessage,
    reservedPowerKw,
    reservedPowerUpKw,
    reservedPowerDownKw,
    reservedEnergyKWh,
    hypotheticalScenario:
      cfg.assumeMarketAccess &&
      !(cfg.aggregatorAccessConfirmed && cfg.prequalificationConfirmed),
    activationSimulated: false,
    dataGaps: [...new Set(dataGaps)],
    assumptions,
    disclaimer: DISCLAIMER,
  };
}

