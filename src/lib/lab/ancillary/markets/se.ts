import { FI_MARKET } from "./fi";
import type { MarketProfile, ServiceDefinition } from "../types";

/**
 * Sweden (Svenska kraftnät) — market PROFILE only.
 *
 * Contains market rules and requirements. It deliberately contains NO PRICES:
 * prices come from the dataset the user supplies (see ../ingest.ts).
 * Requirement values below are the documented market rules used as explicit
 * assumptions; they are shown to the user and can be overridden per run.
 */
/**
 * Only FCR-D up is part of the ACTIVE product model in this version. The other
 * Swedish services are parked below (definitions kept, not offered) so they can be
 * re-activated later without re-deriving their requirements.
 */
export const SE_MARKET: MarketProfile = {
  id: "SE",
  label: "Sverige (Svenska kraftnät)",
  currency: "SEK",
  nativeCapacityUnit: "currency/MW/h",
  nativeEnergyUnit: "currency/MWh",
  notes: [
    "Kapacitetsersättning publiceras normalt i SEK/MW/h och räknas här om till kr/kW/h.",
    "Aktiverad energi avräknas separat (SEK/MWh) och kräver aktiveringsdata som prislistor sällan innehåller.",
    "Ett villabatteri deltar i praktiken via aggregator/BSP och måste förkvalificeras.",
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
      notes: ["Uthållighetskravet är kort — energibehovet är litet, effektbehovet styr."],
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
      notes: ["Nedreglering kräver LADDNINGSutrymme (SOC-tak) och importmarginal i nätet."],
    },
  ],
  columnAliases: {
    "fcr-d ned": "FCR-D-down",
    "fcr-d down": "FCR-D-down",
    "fcrd ned": "FCR-D-down",
    "fcr-d upp": "FCR-D-up",
    "fcr-d up": "FCR-D-up",
    "fcrd upp": "FCR-D-up",
  },
};

/**
 * PARKED services — not part of the active product model. Kept verbatim so they can
 * be re-activated in a later version without re-deriving the market requirements.
 * Nothing in the engine reads this array.
 */
export const SE_PARKED_SERVICES: ServiceDefinition[] = [
    {
      key: "FCR-N",
      label: "FCR-N (normaldriftreserv, symmetrisk)",
      direction: "symmetric",
      payments: ["capacity", "activated-energy"],
      procuredHoursPerYear: 8760,
      requirements: {
        minBidKw: 100,
        enduranceHours: 1,
        socHeadroomPct: 10,
        serviceMinSocPct: 30,
        serviceMaxSocPct: 70,
        availabilityPct: 95,
        requiresAggregator: true,
        requiresPrequalification: true,
        /** Nordic LER: 20 % of the FCR-D capacity kept as NEM power in the opposite direction. */
        nemPowerSharePct: 20,
      },
      notes: [
        "Symmetriskt krav: både upp och ned samtidigt, vilket kräver ett SOC-fönster mitt i batteriet.",
        "Aktiverad energi avräknas löpande och kan vara både intäkt och kostnad.",
      ],
    },
    {
      key: "FFR",
      label: "FFR (snabb frekvensreserv, sommarhalvår)",
      direction: "up",
      payments: ["capacity"],
      procuredHoursPerYear: 4380,
      requirements: {
        minBidKw: 100,
        enduranceHours: 0.1,
        socHeadroomPct: 5,
        serviceMinSocPct: 20,
        serviceMaxSocPct: 95,
        availabilityPct: 95,
        requiresAggregator: true,
        requiresPrequalification: true,
        /** Nordic LER: 20 % of the FCR-D capacity kept as NEM power in the opposite direction. */
        nemPowerSharePct: 20,
      },
      notes: ["Upphandlas bara under vissa timmar/perioder — antal betalda timmar är lägre."],
    },
    {
      key: "mFRR-up",
      label: "mFRR upp (manuell reserv, uppreglering)",
      direction: "up",
      payments: ["capacity", "activated-energy"],
      procuredHoursPerYear: 8760,
      requirements: {
        minBidKw: 1000,
        enduranceHours: 1,
        socHeadroomPct: 5,
        serviceMinSocPct: 20,
        serviceMaxSocPct: 95,
        availabilityPct: 90,
        requiresAggregator: true,
        requiresPrequalification: true,
        /** Nordic LER: 20 % of the FCR-D capacity kept as NEM power in the opposite direction. */
        nemPowerSharePct: 20,
      },
      notes: ["Kräver en full timmes uthållighet — energikravet är här dimensionerande."],
    },
];

/** Column aliases for the parked services, likewise unused by the engine. */
export const SE_PARKED_COLUMN_ALIASES: Record<string, string> = {
  "fcr-n": "FCR-N",
  fcrn: "FCR-N",
  ffr: "FFR",
  "mfrr upp": "mFRR-up",
  "mfrr up": "mFRR-up",
  mfrr: "mFRR-up",
};

export const MARKETS = { SE: SE_MARKET, FI: FI_MARKET } as const;
