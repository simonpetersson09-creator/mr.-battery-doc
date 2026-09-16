import type { MarketProfile, ServiceDefinition } from "../types";

/**
 * Finland (Fingrid) — market PROFILE only.
 *
 * Contains market rules and requirements. It deliberately contains NO PRICES: the Finnish
 * prices come from the verified Fingrid datasets (see ../prices).
 *
 * WHY A SEPARATE FINNISH PROFILE:
 * Before this file Finland reused the Swedish profile for the requirement values. With
 * FCR-D ned added, the Finnish market rules are stated explicitly so that no Swedish rule
 * can silently leak into a Finnish calculation. The numbers below are the COMMON NORDIC
 * FCR-D requirements that Fingrid applies in the Nordic synchronous area (same technical
 * product as Svenska kraftnät's FCR-D). They are identical to the Swedish values today,
 * which is why the Finnish FCR-D up result is bit-for-bit unchanged. If Fingrid publishes
 * a deviating national value, it is changed HERE and nowhere else.
 *
 * ONLY FCR-D up and FCR-D down are active. FCR-N is deliberately NOT defined here.
 */
export const FI_MARKET: MarketProfile = {
  id: "FI",
  label: "Finland (Fingrid)",
  currency: "EUR",
  nativeCapacityUnit: "currency/MW/h",
  nativeEnergyUnit: "currency/MWh",
  notes: [
    "Kapacitetsersättning publiceras i EUR/MW/h och räknas om till kundens valuta i ekonomimodulen.",
    "Aktiverad energi avräknas separat och simuleras inte — endast bokad beredskap.",
    "Ett villabatteri deltar i praktiken via aggregator/BSP och måste förkvalificeras hos Fingrid.",
  ],
  services: [
    {
      key: "FCR-D-up",
      label: "FCR-D upp (störningsreserv, uppreglering)",
      direction: "up",
      payments: ["capacity"],
      procuredHoursPerYear: 8760,
      requirements: {
        minBidKw: 100,
        /**
         * NORDIC FCR-D ENDURANCE: 20 minutes, stated exactly as 20/60 h (never 0.33).
         * Verified Nordic requirement (15 min alert state + 5 min normal state).
         * Defined here in the market profile, not as a global constant.
         */
        enduranceHours: 20 / 60,
        socHeadroomPct: 5,
        serviceMinSocPct: 20,
        serviceMaxSocPct: 95,
        availabilityPct: 95,
        requiresAggregator: true,
        requiresPrequalification: true,
        /** Nordic LER: 20 % of the FCR-D capacity kept as NEM power in the opposite direction. */
        nemPowerSharePct: 20,
      },
      notes: [
        "Nordiskt FCR-D-krav: kort uthållighet — effektbehovet styr, inte energibehovet.",
      ],
    },
    {
      key: "FCR-D-down",
      label: "FCR-D ned (störningsreserv, nedreglering)",
      direction: "down",
      payments: ["capacity"],
      procuredHoursPerYear: 8760,
      requirements: {
        minBidKw: 100,
        /**
         * NORDIC FCR-D ENDURANCE: 20 minutes, stated exactly as 20/60 h (never 0.33).
         * Verified Nordic requirement (15 min alert state + 5 min normal state).
         * Defined here in the market profile, not as a global constant.
         */
        enduranceHours: 20 / 60,
        socHeadroomPct: 5,
        serviceMinSocPct: 5,
        serviceMaxSocPct: 80,
        availabilityPct: 95,
        requiresAggregator: true,
        requiresPrequalification: true,
        /** Nordic LER: 20 % of the FCR-D capacity kept as NEM power in the opposite direction. */
        nemPowerSharePct: 20,
      },
      notes: [
        "Nedreglering kräver LADDNINGSutrymme (SOC-tak) och importmarginal i nätet.",
      ],
    },
  ],
  columnAliases: {
    "fcr-d ylös": "FCR-D-up",
    "fcr-d up": "FCR-D-up",
    "fcr-d upp": "FCR-D-up",
    "fcr-d alas": "FCR-D-down",
    "fcr-d down": "FCR-D-down",
    "fcr-d ned": "FCR-D-down",
  },
};

/**
 * PARKED for Finland — FCR-N is NOT implemented and must not be activated, priced,
 * reserved or optimised. Kept empty on purpose so no code can pick it up by accident.
 */
export const FI_PARKED_SERVICES: ServiceDefinition[] = [];
