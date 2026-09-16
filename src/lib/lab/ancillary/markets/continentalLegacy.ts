import type { MarketProfile } from "../types";

/**
 * CONTINENTAL LEGACY PROFILE — DE and DK1 ONLY.
 *
 * WHY THIS FILE EXISTS: DE (Regelleistung/PRL) and DK1 (Energinet CE-FCR) used to
 * inherit the SWEDISH profile. They are NOT the Nordic FCR-D product: the continental
 * symmetric FCR has its own endurance, its own LER dimensioning rules and no Nordic
 * NEM rule. This profile FREEZES the previously inherited values so the Nordic
 * corrections (20 min endurance, NEM power reservation) can never leak into a market
 * they were never verified for.
 *
 * STATUS: NOT REGULATORILY VERIFIED.
 *  - DK1 needs its own CE-FCR profile (verified ~24 min per direction + 25 % NEM).
 *  - DE needs its own FCR/PQ profile (LER dimensioning, alert state, PQ rules).
 * Nordic parameters must never be copied into these markets automatically.
 */
export const CONTINENTAL_LEGACY_MARKET: MarketProfile = {
  id: "SE",
  label: "Kontinental FCR (DE/DK1) – overifierad arvsprofil",
  currency: "EUR",
  nativeCapacityUnit: "currency/MW/h",
  nativeEnergyUnit: "currency/MWh",
  notes: [
    "OVERIFIERAD PROFIL: DE och DK1 använder tills vidare de tidigare ärvda nordiska kraven.",
    "Egna marknadsprofiler krävs innan resultatet får beskrivas som regulatoriskt korrekt.",
  ],
  services: [
    {
      key: "FCR-D-up",
      label: "FCR (symmetrisk, kontinental) – uppreglering",
      direction: "up",
      payments: ["capacity"],
      procuredHoursPerYear: 8760,
      requirements: {
        minBidKw: 100,
        // FROZEN legacy value (not a verified continental requirement).
        enduranceHours: 0.35,
        socHeadroomPct: 5,
        serviceMinSocPct: 20,
        serviceMaxSocPct: 95,
        availabilityPct: 95,
        requiresAggregator: true,
        requiresPrequalification: true,
        // No Nordic NEM rule applies to the continental product.
        nemPowerSharePct: 0,
      },
      notes: ["Arvsvärden – ska ersättas av en verifierad kontinental profil."],
    },
    {
      key: "FCR-D-down",
      label: "FCR (symmetrisk, kontinental) – nedreglering",
      direction: "down",
      payments: ["capacity"],
      procuredHoursPerYear: 8760,
      requirements: {
        minBidKw: 100,
        enduranceHours: 0.35,
        socHeadroomPct: 5,
        serviceMinSocPct: 5,
        serviceMaxSocPct: 80,
        availabilityPct: 95,
        requiresAggregator: true,
        requiresPrequalification: true,
        nemPowerSharePct: 0,
      },
      notes: ["Arvsvärden – ska ersättas av en verifierad kontinental profil."],
    },
  ],
  columnAliases: {
    "fcr up": "FCR-D-up",
    "fcr down": "FCR-D-down",
  },
};
