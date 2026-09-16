import type { MarketProfile } from "../types";

/**
 * GERMANY — FCR (Regelleistung / ÜNB "PQ-Bedingungen für FCR, aFRR und mFRR in
 * Deutschland", version 1.05, 05.07.2024, section 3.1.6).
 *
 * VERIFIED PRODUCT MODEL
 *  - ONE symmetric FCR product with ONE capacity price. The up/down entries below are
 *    internal dimensioning only and are never sold or paid separately.
 *
 * ENERGY (Speicherdimensionierung, section 3.1.6). The required storage is the SUM of
 * four components; per 1 MW marketable power and PER DIRECTION:
 *    1. alert state, 15 min full activation                 0.25 h   (0.25 MWh)
 *    2. max of { previous activation 0.5 MW * 1/4 h ;
 *                storage-management lag 0.25 MW * 0.5 h }   0.125 h  (0.125 MWh)
 *    3. activation of reserve operation, 5 min bridging     1/24 h   (0.0417 MWh)
 *    => 0.25 + 0.125 + 1/24 = 5/12 h = 25 minutes per direction
 *       (the document's symmetric 1 MW example: 0.83 MWh total = 2 * 5/12 MWh).
 *
 * POWER (equation 3.9): Pmax >= 1.25 * P_VL — compensating energy trades of a quarter of
 * the marketable power must be possible without impairing a full FCR activation. Modelled
 * as a 25 % power reservation in the opposite direction, so 1.25*C <= P_discharge and
 * 1.25*C <= P_charge (8 kW FCR on a 10 kW / 10 kW battery). Not a bid cap.
 *
 * THE "30 MINUTES" FIGURE IS NOT THE CURRENT GERMAN CRITERION. In the 05.07.2024 text
 * 30 minutes appears only (a) as the ASSUMED storage-management lag inside component 2
 * and (b) as the upper end of a possible future alert-state value ("zwischen 15 und 30
 * Minuten") after the Art. 156(11) cost-benefit analysis. The binding alert-state value
 * today is 15 minutes, which is what component 1 uses.
 *
 * NOT MODELLED (reported, never approximated): the dynamic allowed working range
 * CoG/CuG (eq. 3.7/3.8), compensating intraday trades, the 2 h storage restoration duty,
 * reserve-operation behaviour and the prequalification test procedure.
 */
const DE_ENDURANCE_HOURS = 0.25 + 0.125 + 1 / 24;

export const DE_MARKET: MarketProfile = {
  id: "SE",
  label: "Tyskland (ÜNB/Regelleistung, symmetrisk FCR)",
  currency: "EUR",
  nativeCapacityUnit: "currency/MW/h",
  nativeEnergyUnit: "currency/MWh",
  notes: [
    "EN symmetrisk FCR-produkt med EN kapacitetsersättning (Regelleistung).",
    "Energikrav per riktning: 15 min gefährdeter Zustand + max{föregående abrop; speichermanagement-lag} + 5 min reservbetrieb = 25 minuter.",
    "Effektkrav: Pmax ≥ 1,25 × vermarktbare Leistung — 25 % effektreserv för speichermanagement.",
    "Ej modellerat: dynamiskt arbetsområde (CoG/CuG), kompenserande handel och reservbetrieb som driftbeteende.",
  ],
  services: [
    {
      key: "FCR-D-up",
      label: "FCR (symmetrisk, DE) – uppriktning (intern dimensionering)",
      direction: "up",
      payments: ["capacity"],
      procuredHoursPerYear: 8760,
      requirements: {
        minBidKw: 100,
        enduranceHours: DE_ENDURANCE_HOURS,
        socHeadroomPct: 5,
        serviceMinSocPct: 20,
        serviceMaxSocPct: 95,
        availabilityPct: 95,
        requiresAggregator: true,
        requiresPrequalification: true,
        nemPowerSharePct: 25,
      },
      notes: ["Uppriktningen kräver lagrad energi och urladdningseffekt."],
    },
    {
      key: "FCR-D-down",
      label: "FCR (symmetrisk, DE) – nedriktning (intern dimensionering)",
      direction: "down",
      payments: ["capacity"],
      procuredHoursPerYear: 8760,
      requirements: {
        minBidKw: 100,
        enduranceHours: DE_ENDURANCE_HOURS,
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

export { DE_ENDURANCE_HOURS };
