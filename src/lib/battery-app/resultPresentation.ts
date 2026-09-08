/**
 * PRESENTATION ONLY — derives what the result page shows from an already computed
 * BatteryEngineResult. No physics, no economics, no recomputation: every value is read
 * straight from the engine summary. Kept as a pure module so the customer-facing
 * semantics can be regression tested without rendering React.
 */

import type { BatteryEngineResult } from "@/lib/battery-engine";

const nf = (v: number, digits = 0) =>
  v.toLocaleString("sv-SE", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export interface ResultPresentationOptions {
  /** The customer's peak-shaving strategy toggle (UI state, not engine physics). */
  peakShavingSelected: boolean;
  /** True when the customer typed their own demand charge. */
  demandChargeTouched: boolean;
}

export interface ResultPresentation {
  noBattery: boolean;
  capacityKWh: number;
  /** The ONLY power the customer-facing recommendation is allowed to show. */
  recommendedPowerKw: number;
  physicalPowerNeedKw: number;
  actualDispatchPowerKw: number;
  fcrHeldPowerKw: number | null;

  /** Energy section relevance. */
  hasSolar: boolean;
  showSelfConsumption: boolean;
  showSelfSufficiency: boolean;
  showExport: boolean;
  showShiftedSolar: boolean;
  showImport: boolean;
  showEnergySection: boolean;

  /** Peak section. */
  showPeakSection: boolean;
  peakChanged: boolean;
  /** Physical peak reduction exists but has no monetary value. */
  showDemandSavingRow: boolean;
  demandNote: string | null;

  /** Economy. */
  totalBenefitSek: number | null;
  noEconomy: boolean;
  limitedBenefit: boolean;
  limitedBenefitTitle: string | null;
  limitedBenefitText: string | null;

  /** FCR. */
  showFcr: boolean;
  fcrDrivesPower: boolean;
  fcrPowerNote: string | null;
  fcrPowerNoteSecondary: string | null;

  /** The "Varför X kW?" card, only when FCR actually raised the system power. */
  showFcrPowerCard: boolean;
  fcrPowerCardTitle: string | null;
  fcrPowerCardText: string | null;
  fcrPowerCardNeutralText: string | null;
  fcrHistoricalNote: string | null;
  /** Power level motivated by the property itself (actual FCR-off result when available). */
  propertyOnlyPowerKw: number | null;

  capacityWhy: string;
  powerWhy: string | null;
}


export function buildResultPresentation(
  result: BatteryEngineResult,
  opts: ResultPresentationOptions,
): ResultPresentation {
  const s = result.summary;
  const r = s.recommendation;
  const e = s.energy;
  const g = s.grid;
  const ps = result.diagnostics.powerSizing;

  const recommendedPowerKw = r.recommendedPowerKw;
  const noBattery = r.capacityKWh <= 0;
  const hasSolar = e.annualPvKWh > 0;

  const showSelfConsumption = hasSolar;
  const showSelfSufficiency = hasSolar;
  const showExport = e.exportBeforeKWh > 0 || e.exportAfterKWh > 0;
  const showShiftedSolar = hasSolar && e.shiftedSolarKWh > 0;
  const importChanged = e.importBeforeKWh !== e.importAfterKWh;
  const showImport = importChanged || !hasSolar;

  const peakChanged = s.peak.peakReductionKw !== 0;
  const demandSaving = s.economy.demandCostSavingSek ?? 0;
  // Physical peak shaving can be real while the economic value is zero (0 kr/kW/month).
  const showDemandSavingRow = demandSaving !== 0;

  const showFcr = s.fcr.enabled;
  const fcrGross = showFcr ? (s.fcr.grossSek ?? 0) : 0;
  const total = s.economy.totalOperatingBenefitSek;
  const noEconomy = s.economy.energyBenefitSek === 0 && demandSaving === 0 && fcrGross === 0;
  const limitedBenefit = !noBattery && !noEconomy && total !== null && total <= 0;

  // FCR only ever explains the power choice while FCR is actually enabled.
  const fcrDrivesPower = showFcr && r.recommendationUsesHistoricalFcr;

  const powerFloorApplied = ps.productFloorAppliedKw !== null && ps.productFloorAppliedKw > 0;
  const raisedAbovePhysical = recommendedPowerKw > r.productPowerKw + 1e-9;

  /**
   * The power level the property alone motivates. Prefer the ACTUAL simulated candidate that
   * wins once the historical FCR revenue is taken out of the objective (same 25 kr/år tie
   * tolerance the engine uses); fall back to the engine's physical need. No recomputation:
   * every number is read from the already simulated candidates.
   */
  const TIE = 25;
  const withoutFcr = s.powerOptions.map((o) => ({
    powerKw: o.powerKw,
    benefit: o.totalOperatingBenefitSek - o.fcrRevenueSek,
  }));
  let propertyOnlyPowerKw: number | null = null;
  if (withoutFcr.length > 0) {
    const best = Math.max(...withoutFcr.map((o) => o.benefit));
    propertyOnlyPowerKw = (withoutFcr.find((o) => o.benefit >= best - TIE) ?? withoutFcr[0]!)
      .powerKw;
  } else if (r.physicalPowerNeedKw > 0) {
    propertyOnlyPowerKw = r.physicalPowerNeedKw;
  }

  // Only meaningful when the recommended power is genuinely above the property-only level.
  const showFcrPowerCard =
    !noBattery &&
    fcrDrivesPower &&
    propertyOnlyPowerKw !== null &&
    recommendedPowerKw > propertyOnlyPowerKw + 1e-9;

  const propKw = propertyOnlyPowerKw !== null ? nf(propertyOnlyPowerKw, 1) : "";
  const recKw = nf(recommendedPowerKw, 1);

  const capacityWhy = noBattery
    ? "Med dina uppgifter flyttar ett batteri för lite energi för att en storlek ska kunna rekommenderas."
    : `${nf(r.capacityKWh)} kWh ger en bra balans mellan hur mycket energi batteriet kan flytta och nyttan av ytterligare kapacitet. Ett större batteri ger relativt liten ytterligare nytta med din förbrukning${hasSolar ? " och solproduktion" : ""}.`;

  let powerWhy: string | null;
  if (noBattery) {
    powerWhy = null;
  } else if (showFcrPowerCard) {
    powerWhy = `Fastighetens eget beräknade effektbehov är cirka ${propKw} kW. ${recKw} kW ger högre beräknad årlig nytta i scenariot där stödtjänster (FCR-D upp) ingår.`;
  } else if (raisedAbovePhysical) {
    powerWhy = `${recKw} kW ger högst beräknad årlig nytta av de systemeffekter som har jämförts. Fastighetens eget effektbehov är lägre (${nf(r.physicalPowerNeedKw, 1)} kW).`;
  } else if (powerFloorApplied) {
    powerWhy = `${recKw} kW följer batteriets tekniska minimikrav i förhållande till kapaciteten. Fastighetens eget effektbehov är lägre (${nf(r.physicalPowerNeedKw, 1)} kW). Högre systemeffekt ger inte tillräckligt större beräknad årlig nytta.`;
  } else {
    powerWhy = `${recKw} kW är dimensionerad efter fastighetens energiflöden och beräknade effektbehov (${nf(r.physicalPowerNeedKw, 1)} kW). Högre systemeffekt ger inte tillräckligt större beräknad årlig nytta.`;
  }


  return {
    noBattery,
    capacityKWh: r.capacityKWh,
    recommendedPowerKw,
    physicalPowerNeedKw: r.physicalPowerNeedKw,
    actualDispatchPowerKw: r.actualDispatchPowerKw,
    fcrHeldPowerKw: showFcr ? s.fcr.avgHeldPowerKw : null,

    hasSolar,
    showSelfConsumption,
    showSelfSufficiency,
    showExport,
    showShiftedSolar,
    showImport,
    showEnergySection:
      showSelfConsumption || showSelfSufficiency || showExport || showShiftedSolar || showImport,

    showPeakSection: opts.peakShavingSelected || peakChanged,
    peakChanged,
    showDemandSavingRow,
    demandNote: showDemandSavingRow
      ? opts.demandChargeTouched
        ? "Beräknat med den effektavgift du angett."
        : "Beräknat med ett svenskt schablonvärde för effektavgift."
      : peakChanged
        ? "Effekttoppen minskar, men ingen effektavgift är prissatt — därför räknas ingen ekonomisk effektbesparing."
        : null,

    totalBenefitSek: total,
    noEconomy,
    limitedBenefit,
    limitedBenefitTitle: limitedBenefit ? "Begränsad ekonomisk nytta" : null,
    limitedBenefitText: limitedBenefit
      ? "Beräkningen visar ingen positiv beräknad årlig nytta med dina nuvarande förutsättningar och valda strategier."
      : null,

    showFcr,
    fcrDrivesPower,
    fcrPowerNote: fcrDrivesPower
      ? "Systemeffekten har valts för att ge högst beräknad årlig nytta med dina valda strategier. Historisk FCR-D upp-intäkt har påverkat effektvalet."
      : null,
    fcrPowerNoteSecondary: fcrDrivesPower ? "Fastighetens eget effektbehov är lägre." : null,

    capacityWhy,
    powerWhy,
  };
}
