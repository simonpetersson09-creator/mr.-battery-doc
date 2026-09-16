import type { MarketProfile } from "../types";

/**
 * DK1 — CONTINENTAL EUROPE FCR (Energinet, DK1 synchronous area: Continental Europe).
 *
 * VERIFIED PRODUCT MODEL
 *  - ONE symmetric FCR product with ONE capacity price. The up/down service entries
 *    below exist only so the engine can dimension the PHYSICAL requirement in both
 *    directions; they are never sold or paid separately (see reserveModeForMarket:
 *    DK1 -> "symmetric").
 *  - LER endurance: 24 minutes in EACH direction, stated exactly as 24/60 h.
 *  - Storage/energy management power reservation: 25 % of the FCR capacity must stay
 *    available in the opposite direction. For a symmetric product with capacity C this
 *    gives 1.25*C <= P_discharge and 1.25*C <= P_charge, i.e. 8 kW FCR on a
 *    10 kW / 10 kW battery. It is a PHYSICAL POWER limit, never an 80 % bid cap: the
 *    optimiser may still offer 100 %, the physics then decides what is paid.
 *
 * NOT MODELLED (reported, never approximated): dynamic working-point band, compensating
 * intraday trades and the prequalification test procedure itself.
 */
export const DK1_MARKET: MarketProfile = {
  id: "SE",
  label: "Danmark DK1 (Energinet, kontinental symmetrisk FCR)",
  currency: "EUR",
  nativeCapacityUnit: "currency/MW/h",
  nativeEnergyUnit: "currency/MWh",
  notes: [
    "DK1 tillhör det kontinentala synkronområdet: EN symmetrisk FCR-produkt med EN kapacitetsersättning.",
    "LER-krav: 24 minuters uthållighet i varje riktning och 25 % effektreserv för energihantering.",
    "Upp- och nedriktning används endast internt för fysisk dimensionering — de säljs aldrig separat.",
  ],
  services: [
    {
      key: "FCR-D-up",
      label: "FCR (symmetrisk, DK1) – uppriktning (intern dimensionering)",
      direction: "up",
      payments: ["capacity"],
      procuredHoursPerYear: 8760,
      requirements: {
        minBidKw: 100,
        /** Energinet CE-FCR LER: 24 minutes per direction, exactly 24/60 h. */
        enduranceHours: 24 / 60,
        socHeadroomPct: 5,
        serviceMinSocPct: 20,
        serviceMaxSocPct: 95,
        availabilityPct: 95,
        requiresAggregator: true,
        requiresPrequalification: true,
        /** 25 % of the FCR capacity reserved for energy management (1.25*C <= P). */
        nemPowerSharePct: 25,
      },
      notes: ["Uppriktningen kräver lagrad energi och urladdningseffekt."],
    },
    {
      key: "FCR-D-down",
      label: "FCR (symmetrisk, DK1) – nedriktning (intern dimensionering)",
      direction: "down",
      payments: ["capacity"],
      procuredHoursPerYear: 8760,
      requirements: {
        minBidKw: 100,
        enduranceHours: 24 / 60,
        socHeadroomPct: 5,
        serviceMinSocPct: 5,
        serviceMaxSocPct: 80,
        availabilityPct: 95,
        requiresAggregator: true,
        requiresPrequalification: true,
        nemPowerSharePct: 25,
      },
      notes: ["Nedriktningen kräver laddningsutrymme och laddeffekt."],
    },
  ],
  columnAliases: {
    "fcr up": "FCR-D-up",
    "fcr down": "FCR-D-down",
  },
};
