/**
 * PRESENTATION ONLY — derives what the result page shows from an already computed
 * BatteryEngineResult. No physics, no economics, no recomputation: every value is read
 * straight from the engine summary. Kept as a pure module so the customer-facing
 * semantics can be regression tested without rendering React.
 */

import { formatNumber, t } from "@/i18n";
import type { BatteryEngineResult } from "@/lib/battery-engine";
import type { WithoutFcrOptimum } from "./withoutFcrOptimum";

export interface PowerLevelRow {
  label: string;
  kw: number;
}

const nf = (v: number, digits = 0) => formatNumber(v, digits);

export interface ResultPresentationOptions {
  /** The customer's peak-shaving strategy toggle (UI state, not engine physics). */
  peakShavingSelected: boolean;
  /** True when the customer typed their own demand charge. */
  demandChargeTouched: boolean;
  /**
   * Genuine FCR-off counterfactual for the SAME capacity. Omit it and no "utan FCR"
   * level is presented — a reconstructed level is never acceptable.
   */
  withoutFcr?: WithoutFcrOptimum | null;
  /**
   * Customer-facing reserve product name from the central market config
   * ("FCR-D upp" for SE/FI/DK2, "FCR" for DE/DK1).
   */
  reserveProductLabel?: string;
}


export interface ResultPresentation {
  noBattery: boolean;
  capacityKWh: number;
  /** The ONLY power the customer-facing recommendation is allowed to show. */
  recommendedPowerKw: number;
  physicalPowerNeedKw: number;
  /** Set when the physical need is above the largest purchasable product level. */
  powerCapNote: string | null;
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
  /** Structured power-level rows for the compact "Varför X kW?" card. */
  fcrPowerLevels: PowerLevelRow[];
  /** Short neutral explanation shown under the power-level rows. */
  fcrPowerExplanation: string | null;
  /** Power level motivated by the property itself (actual FCR-off result when available). */
  propertyOnlyPowerKw: number | null;
  /** System power the calculation would recommend with FCR removed from the objective. */
  withoutFcrPowerKw: number | null;
  /** True when the physical need row differs from the FCR-off system power. */
  showPhysicalNeedRow: boolean;
  /** Annual benefit, SEK/year, of the FCR-off candidate (FCR revenue excluded). */
  withoutFcrBenefitSek: number | null;
  /** Annual benefit, SEK/year, of the recommended candidate (FCR included). */
  withFcrBenefitSek: number | null;
  /** withFcr - withoutFcr, SEK/year. */
  benefitDeltaSek: number | null;

  /** Base power chosen by the physical product sizing step. */
  productPowerKw: number;
  /** productPowerKw / capacityKWh. */
  productCRate: number;
  /** recommendedPowerKw / capacityKWh — the C-rate of the FINAL recommendation. */
  systemCRate: number;
  /** Sizing-method paragraphs, rewritten so "recommended" always means the final power. */
  sizingMethodLines: string[];
  /** What utilityPctOfReference actually measures (physical useful energy at base power). */
  baseUtilityPct: number;
  baseUtilityLabel: string;

  capacityWhy: string;
  powerWhy: string | null;
}



export function buildResultPresentation(
  result: BatteryEngineResult,
  opts: ResultPresentationOptions,
): ResultPresentation {
  /**
   * PRODUCT NAME comes from the central reserve market config (SE/FI/DK2 = "FCR-D upp",
   * DE/DK1 = "FCR"). Never hardcoded per string.
   */
  const productLabel = opts.reserveProductLabel ?? t("reserveProduct.FCR_D_UP");
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
    * The power level the property alone motivates. This MUST come from a full FCR-off
   * counterfactual (`computeWithoutFcrOptimum`), never from "FCR-influenced total minus FCR
   * revenue" — the reservation also changes dispatch, SOC, energy, peak and import/export.
   * When no counterfactual is supplied, no "utan FCR" level is shown at all.
   */
  const propertyOnlyPowerKw: number | null = opts.withoutFcr
    ? opts.withoutFcr.withoutFcrOptimalPowerKw
    : null;
  const withoutFcrBenefitSek: number | null = opts.withoutFcr
    ? opts.withoutFcr.withoutFcrBenefitSek
    : null;


  const selectedOption =
    s.powerOptions.find((o) => o.selected) ??
    s.powerOptions.find((o) => Math.abs(o.powerKw - recommendedPowerKw) < 1e-9) ??
    null;
  const withFcrBenefitSek = selectedOption ? selectedOption.totalOperatingBenefitSek : total;
  const benefitDeltaSek =
    withFcrBenefitSek !== null && withoutFcrBenefitSek !== null
      ? withFcrBenefitSek - withoutFcrBenefitSek
      : null;

  // Only meaningful when the recommended power is genuinely above the property-only level.
  const showFcrPowerCard =
    !noBattery &&
    fcrDrivesPower &&
    propertyOnlyPowerKw !== null &&
    recommendedPowerKw > propertyOnlyPowerKw + 1e-9;

  const propKw = propertyOnlyPowerKw !== null ? nf(propertyOnlyPowerKw, 1) : "";
  const physKw = nf(r.physicalPowerNeedKw, 1);
  const recKw = nf(recommendedPowerKw, 1);
  // The physical need and the FCR-off system power are different concepts; only split the
  // rows when the engine actually produced two different levels.
  const showPhysicalNeedRow =
    showFcrPowerCard &&
    propertyOnlyPowerKw !== null &&
    Math.abs(propertyOnlyPowerKw - r.physicalPowerNeedKw) > 0.05;

  const capacityWhy = noBattery
    ? t("results.capacityWhy.none")
    : t(hasSolar ? "results.capacityWhy.withSolar" : "results.capacityWhy.withoutSolar", {
        capacity: nf(r.capacityKWh),
      });

  const fcrCardText = showPhysicalNeedRow
    ? t("results.why.textSplit", {
        physical: physKw,
        product: productLabel,
        without: propKw,
        recommended: recKw,
      })
    : t("results.why.textSimple", { without: propKw, recommended: recKw });

  const fcrPowerLevels: PowerLevelRow[] = [];
  if (showFcrPowerCard && propertyOnlyPowerKw !== null) {
    if (showPhysicalNeedRow) {
      fcrPowerLevels.push({ label: t("results.why.physicalNeed"), kw: r.physicalPowerNeedKw });
      fcrPowerLevels.push({
        label: t("results.why.without", { product: productLabel }),
        kw: propertyOnlyPowerKw,
      });
      fcrPowerLevels.push({ label: t("results.why.with"), kw: recommendedPowerKw });
    } else {
      fcrPowerLevels.push({ label: t("results.why.ownNeed"), kw: propertyOnlyPowerKw });
      fcrPowerLevels.push({ label: t("results.why.with"), kw: recommendedPowerKw });
    }
  }
  const fcrPowerExplanation = showFcrPowerCard ? t("results.why.explanation") : null;


  let powerWhy: string | null;
  if (noBattery) {
    powerWhy = null;
  } else if (showFcrPowerCard) {
    powerWhy = fcrCardText;
  } else if (raisedAbovePhysical) {
    powerWhy = t("results.powerWhy.raised", { recommended: recKw, physical: physKw });
  } else if (powerFloorApplied) {
    powerWhy = t("results.powerWhy.floor", { recommended: recKw, physical: physKw });
  } else {
    powerWhy = t("results.powerWhy.matched", { recommended: recKw, physical: physKw });
  }



  /**
   * PRODUCT CAP. The physical need may exceed the largest product level we sell; the
   * recommendation may not. Only the wording differs — no value is recalculated.
   */
  const powerCapNote =
    !noBattery && r.productCapBound && r.maxProductPowerKw > 0
      ? t("results.powerCap.note", {
          physical: physKw,
          product: nf(r.maxProductPowerKw, 1),
        })
      : null;

  const capacityKWh = r.capacityKWh;
  const productPowerKw = r.productPowerKw;
  const systemCRate = capacityKWh > 0 ? recommendedPowerKw / capacityKWh : 0;
  const productCRate = capacityKWh > 0 ? productPowerKw / capacityKWh : 0;

  /**
   * The engine's sizing narrative describes the PHYSICAL product step. It must not use the
   * word "recommended" when a later operating-benefit step selected a higher system power.
   * Purely a relabelling of existing engine text — no value is recomputed.
   */
  const rewrittenPower = (r.powerExplanation ?? "")
    .replace(
      /Rekommenderad effekt [^.]*\.\s*/,
      t("results.sizing.basePower", { power: nf(productPowerKw, 1), crate: nf(productCRate, 2) }),
    )
    .replace(/Nyttan vid rekommenderad effekt/, t("results.sizing.basePhysicalUtility"));

  const sizingMethodLines: string[] = [];
  if (r.explanation) sizingMethodLines.push(r.explanation);
  if (rewrittenPower) sizingMethodLines.push(rewrittenPower);
  if (
    propertyOnlyPowerKw !== null &&
    propertyOnlyPowerKw > productPowerKw + 1e-9 &&
    recommendedPowerKw > propertyOnlyPowerKw + 1e-9 &&
    capacityKWh > 0
  ) {
    sizingMethodLines.push(
      t("results.sizing.withoutProduct", {
        product: productLabel,
        power: nf(propertyOnlyPowerKw, 1),
        crate: nf(propertyOnlyPowerKw / capacityKWh, 2),
      }),
    );
  }
  if (!noBattery && recommendedPowerKw > productPowerKw + 1e-9) {
    sizingMethodLines.push(
      t("results.sizing.selected", {
        power: nf(recommendedPowerKw, 1),
        crate: nf(systemCRate, 2),
      }),
    );
    if (fcrDrivesPower) {
      sizingMethodLines.push(t("results.sizing.fcrInfluenced", { product: productLabel }));
    }
  }

  return {
    noBattery,
    capacityKWh: r.capacityKWh,
    recommendedPowerKw,
    physicalPowerNeedKw: r.physicalPowerNeedKw,
    powerCapNote,
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
        ? t("results.demandNote.entered")
        : t("results.demandNote.standard")
      : peakChanged
        ? t("results.demandNote.noTariff")
        : null,

    totalBenefitSek: total,
    noEconomy,
    limitedBenefit,
    limitedBenefitTitle: limitedBenefit ? t("results.limited.title") : null,
    limitedBenefitText: limitedBenefit ? t("results.limited.text") : null,

    showFcr,
    fcrDrivesPower,
    fcrPowerNote: null,
    fcrPowerNoteSecondary: null,

    showFcrPowerCard,
    fcrPowerCardTitle: showFcrPowerCard ? t("results.why.title", { power: recKw }) : null,
    fcrPowerCardText: showFcrPowerCard ? fcrCardText : null,
    fcrPowerCardNeutralText: null,
    fcrHistoricalNote: showFcrPowerCard ? t("results.why.historicalNote") : null,
    fcrPowerLevels,
    fcrPowerExplanation,
    propertyOnlyPowerKw,
    withoutFcrPowerKw: propertyOnlyPowerKw,
    showPhysicalNeedRow,
    withoutFcrBenefitSek: showFcrPowerCard ? withoutFcrBenefitSek : null,
    withFcrBenefitSek: showFcrPowerCard ? withFcrBenefitSek : null,
    benefitDeltaSek: showFcrPowerCard ? benefitDeltaSek : null,




    productPowerKw,
    productCRate,
    systemCRate,
    sizingMethodLines,
    baseUtilityPct: ps.utilityPctOfReference,
    baseUtilityLabel: t("results.sizing.basePhysicalUtility"),

    capacityWhy,
    powerWhy,
  };
}
