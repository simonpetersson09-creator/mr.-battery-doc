/**
 * Battery Engine — PRODUCT COST LAYER.
 *
 * Pure economics. This module never touches dispatch, SOC, sizing physics, peak shaving
 * or the FCR gate. It only turns a product configuration (kWh + kW) into a CAPEX and an
 * annualised cost so that different system powers can be compared economically.
 *
 * HARD RULE — no invented market prices.
 * Every parameter defaults to `null` = "we have no verified figure". Null is never
 * silently treated as 0. When a required parameter is null the annualisation returns
 * `null` together with an explicit list of the missing fields, and the caller must then
 * refuse to produce an economic recommendation.
 */

/** Key used when a real product alternative has an explicit list price. */
export function productOptionKey(capacityKWh: number, powerKw: number): string {
  return `${capacityKWh}/${powerKw}`;
}

export interface ProductCostConfig {
  /** Cell/capacity cost, SEK per kWh of nominal capacity. */
  batteryCapacityCostSekPerKWh: number | null;
  /**
   * Power conversion cost, SEK per kW of system power. This is the ONLY term that must
   * differ between two products with the same kWh but different kW.
   */
  powerElectronicsCostSekPerKw: number | null;
  /** Installation/commissioning, SEK. Independent of both kWh and kW. */
  fixedInstallationCostSek: number | null;
  /** Economic lifetime, years. */
  lifetimeYears: number | null;
  /** Discount rate, %. 0 is a valid value and is handled exactly. */
  discountRatePct: number | null;
  /**
   * PLACEHOLDER. Degradation is currently not priced. `null` = no verified model.
   * A future model plugs in here without touching the annualisation formula.
   */
  degradationCostModel: null;
  /** Explicit yearly degradation/replacement provision, SEK/year. Null = unknown. */
  degradationCostSekPerYear: number | null;
  /**
   * Explicit price per real product alternative, SEK, keyed `"<kWh>/<kW>"`. When a key
   * matches, it REPLACES the parametric capacity+power+installation CAPEX for that
   * alternative. Null = no price list available.
   */
  explicitOptionCostSek: Record<string, number> | null;
}

/**
 * DEFAULT: everything unknown. Mr. Battery Doc has no verified Swedish product prices,
 * so the engine ships with a structure, not with numbers.
 */
export const EMPTY_PRODUCT_COST: ProductCostConfig = {
  batteryCapacityCostSekPerKWh: null,
  powerElectronicsCostSekPerKw: null,
  fixedInstallationCostSek: null,
  lifetimeYears: null,
  discountRatePct: null,
  degradationCostModel: null,
  degradationCostSekPerYear: null,
  explicitOptionCostSek: null,
};

export function productCostConfig(
  partial: Partial<ProductCostConfig> = {},
): ProductCostConfig {
  return { ...EMPTY_PRODUCT_COST, ...partial };
}

/**
 * Capital recovery factor.
 *
 *   r > 0 :  crf = r(1+r)^n / ((1+r)^n - 1)
 *   r = 0 :  crf = 1/n            (exact limit, not an approximation)
 *
 * `r` is the discount rate as a fraction, `n` the lifetime in years.
 */
export function capitalRecoveryFactor(discountRatePct: number, lifetimeYears: number): number {
  const n = lifetimeYears;
  if (!(n > 0)) return Number.NaN;
  const r = discountRatePct / 100;
  if (Math.abs(r) < 1e-12) return 1 / n;
  const f = Math.pow(1 + r, n);
  return (r * f) / (f - 1);
}

export interface ProductCostBreakdown {
  capacityKWh: number;
  powerKw: number;
  /** True when an explicit product price replaced the parametric model. */
  fromPriceList: boolean;
  capacityCostSek: number | null;
  powerCostSek: number | null;
  installationCostSek: number | null;
  capexSek: number | null;
  capitalRecoveryFactor: number | null;
  annualisedCapexSek: number | null;
  degradationCostSekPerYear: number | null;
  /** annualised CAPEX + degradation provision. The comparable yearly product cost. */
  annualisedTotalProductCostSek: number | null;
  /** Parameters that must be supplied before a cost can be produced. */
  missing: string[];
}

/** Which required parameters are still unknown for a parametric cost calculation. */
export function missingProductCostFields(cfg: ProductCostConfig): string[] {
  const missing: string[] = [];
  if (cfg.batteryCapacityCostSekPerKWh === null) missing.push("batteryCapacityCostSekPerKWh");
  if (cfg.powerElectronicsCostSekPerKw === null) missing.push("powerElectronicsCostSekPerKw");
  if (cfg.fixedInstallationCostSek === null) missing.push("fixedInstallationCostSek");
  if (cfg.lifetimeYears === null) missing.push("lifetimeYears");
  if (cfg.discountRatePct === null) missing.push("discountRatePct");
  return missing;
}

/**
 * CAPEX and annualised cost of one product alternative.
 *
 * Capacity cost and power cost are deliberately SEPARATE terms, so 25/5, 25/7.5, 25/10
 * and 25/12.5 all carry the same capacity cost and differ only in power electronics.
 * That is what makes the incremental cost of a bigger system power measurable.
 */
export function productCost(
  capacityKWh: number,
  powerKw: number,
  cfg: ProductCostConfig,
): ProductCostBreakdown {
  const explicit = cfg.explicitOptionCostSek?.[productOptionKey(capacityKWh, powerKw)];
  const missing: string[] = [];
  let capacityCostSek: number | null = null;
  let powerCostSek: number | null = null;
  let installationCostSek: number | null = null;
  let capexSek: number | null = null;
  const fromPriceList = typeof explicit === "number" && Number.isFinite(explicit);

  if (fromPriceList) {
    capexSek = explicit!;
    if (cfg.lifetimeYears === null) missing.push("lifetimeYears");
    if (cfg.discountRatePct === null) missing.push("discountRatePct");
  } else {
    missing.push(...missingProductCostFields(cfg));
    if (missing.length === 0) {
      capacityCostSek = capacityKWh * cfg.batteryCapacityCostSekPerKWh!;
      powerCostSek = powerKw * cfg.powerElectronicsCostSekPerKw!;
      installationCostSek = cfg.fixedInstallationCostSek!;
      capexSek = capacityCostSek + powerCostSek + installationCostSek;
    }
  }

  if (missing.length > 0 || capexSek === null)
    return {
      capacityKWh,
      powerKw,
      fromPriceList,
      capacityCostSek,
      powerCostSek,
      installationCostSek,
      capexSek: null,
      capitalRecoveryFactor: null,
      annualisedCapexSek: null,
      degradationCostSekPerYear: cfg.degradationCostSekPerYear,
      annualisedTotalProductCostSek: null,
      missing,
    };

  const crf = capitalRecoveryFactor(cfg.discountRatePct!, cfg.lifetimeYears!);
  const annualisedCapexSek = capexSek * crf;
  return {
    capacityKWh,
    powerKw,
    fromPriceList,
    capacityCostSek,
    powerCostSek,
    installationCostSek,
    capexSek,
    capitalRecoveryFactor: crf,
    annualisedCapexSek,
    degradationCostSekPerYear: cfg.degradationCostSekPerYear,
    // A null degradation provision is a GAP, not a zero cost — but it is identical for
    // every kW alternative of the same capacity, so it cannot bias the power choice.
    annualisedTotalProductCostSek: annualisedCapexSek + (cfg.degradationCostSekPerYear ?? 0),
    missing: [],
  };
}
