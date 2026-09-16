/**
 * ANCILLARY SCENARIO (MODEL C) — comparison layer only.
 *
 * WHAT IT IS NOT: a recommendation. The engine's physical dimensioning decides the
 * recommended battery, and this module can never change it. When the physical
 * recommendation is 0 kWh (no solar, no peak shaving) and the owner has selected
 * ancillary services, the app may still show how DIFFERENT battery sizes would be
 * compensated on the reserve market. No candidate is ever labelled best/optimal.
 *
 * Every candidate is produced by the SAME frozen engine, with only the capacity locked
 * to an existing ladder step. Power, FCR physics, endurance, NEM, grid limits, market
 * routing, price series and reservation optimisation all come from the engine exactly as
 * they do for a normal run — nothing here is simplified, extrapolated or hardcoded.
 */

import { runBatteryEngine } from "@/lib/battery-engine";
import type { BatteryEngineInput, BatteryEngineResult } from "@/lib/battery-engine";
import { capacityLadder } from "./capacityAlternatives";
import { defaultConfig } from "@/lib/lab/defaults";
import { DEFAULT_MAX_PRODUCT_C_RATE } from "@/lib/lab/economicPowerSizing";
import {
  clampCustomerAncillaryShare,
  clampTargetPaybackYears,
  customerBenefitFromTotals,
  maxInvestmentSek,
  DEFAULT_CUSTOMER_ANCILLARY_SHARE,
  DEFAULT_TARGET_PAYBACK_YEARS,
} from "./customerEconomy";

/**
 * Representative capacities for the comparison. Every value is an existing step on the
 * engine's own capacity ladder; steps the engine does not simulate are dropped.
 */
export const ANCILLARY_SCENARIO_CAPACITIES_KWH = [5, 10, 15, 20, 30, 40];

export interface AncillaryScenarioCandidate {
  capacityKWh: number;
  /** Power sized by the engine for that capacity — never a hardcoded C-rate. */
  powerKw: number;
  /** Historical market value of the reserve product for that candidate. */
  ancillaryMarketValueSek: number;
  /** The customer's share of that market value. */
  ancillaryCustomerValueSek: number;
  /** Engine total for that candidate (ancillary at 100 % market value). */
  annualBenefitSek: number | null;
  /** Full modelled annual customer benefit for that candidate (may be negative). */
  customerBenefitSek: number | null;
  /** Annual customer benefit x chosen payback years. Null when the benefit is not positive. */
  maxInvestmentSek: number | null;
}

export interface AncillaryScenario {
  candidates: AncillaryScenarioCandidate[];
  customerAncillaryShare: number;
  targetPaybackYears: number;
}

function marketValue(res: BatteryEngineResult): number {
  const f = res.summary.fcr;
  if (!f.enabled) return 0;
  const v = f.grossSek ?? 0;
  return Number.isFinite(v) ? v : 0;
}

/** Largest configured product power step within the engine's C-rate ceiling. */
function productPowerForCapacity(capacityKWh: number, steps?: number[]): number {
  const list = (steps ?? defaultConfig().powerSizing.productStepsKw).filter((s) => s > 0);
  const ceiling = capacityKWh * DEFAULT_MAX_PRODUCT_C_RATE;
  const within = list.filter((s) => s <= ceiling + 1e-9);
  return within.length > 0 ? Math.max(...within) : 0;
}

function runCandidate(
  input: BatteryEngineInput,
  capacityKWh: number,
  share: number,
  years: number,
): AncillaryScenarioCandidate | null {
  try {
    const { fixedPowerKw: _ignored, ...battery } = input.battery ?? {};
    /**
     * Without solar or peak shaving the physical need is 0 kW, so the engine would size
     * the pack at 0 kW and no reserve could be offered. The comparison therefore locks
     * each candidate to the largest REAL product step the pack can sustain at the
     * engine's own C-rate ceiling — a product level, never an invented rating.
     */
    const powerKw = productPowerForCapacity(capacityKWh, battery.powerStepsKw);
    if (!(powerKw > 0)) return null;
    const res = runBatteryEngine({
      ...input,
      battery: { ...battery, fixedCapacityKWh: capacityKWh, fixedPowerKw: powerKw },
    });
    const rec = res.summary.recommendation;
    const total = res.summary.economy.totalOperatingBenefitSek;
    const market = marketValue(res);
    const customerBenefit = customerBenefitFromTotals(total, market, share);
    return {
      capacityKWh: rec.capacityKWh,
      powerKw: rec.recommendedPowerKw ?? rec.productPowerKw,
      ancillaryMarketValueSek: market,
      ancillaryCustomerValueSek: market * share,
      annualBenefitSek: total,
      customerBenefitSek: customerBenefit,
      maxInvestmentSek: maxInvestmentSek(customerBenefit, years),
    };
  } catch {
    return null;
  }
}

/**
 * Returns the scenario ONLY when:
 *  - the physical recommendation is 0 kWh,
 *  - the owner selected ancillary services,
 *  - and the market actually has priced reserve data in the current engine.
 * Otherwise null, and the result page is exactly what it was before.
 */
export function computeAncillaryScenario(
  input: BatteryEngineInput,
  result: BatteryEngineResult,
  customerAncillaryShare: number = DEFAULT_CUSTOMER_ANCILLARY_SHARE,
  targetPaybackYears: number = DEFAULT_TARGET_PAYBACK_YEARS,
): AncillaryScenario | null {
  const rec = result.summary.recommendation;
  if (rec.capacityKWh > 0) return null;
  if (rec.sizingWasFixed) return null;
  if (!input.strategies?.fcrDUp) return null;

  const share = clampCustomerAncillaryShare(customerAncillaryShare);
  const years = clampTargetPaybackYears(targetPaybackYears);
  const ladder = new Set(capacityLadder(result));
  const caps = ANCILLARY_SCENARIO_CAPACITIES_KWH.filter((c) => ladder.has(c));

  const candidates: AncillaryScenarioCandidate[] = [];
  for (const cap of caps) {
    const candidate = runCandidate(input, cap, share, years);
    if (candidate) candidates.push(candidate);
  }
  // No priced reserve data for this market -> no scenario, never a 0 kr claim.
  if (!candidates.some((c) => c.ancillaryMarketValueSek > 0)) return null;

  candidates.sort((a, b) => a.capacityKWh - b.capacityKWh);
  return { candidates, customerAncillaryShare: share, targetPaybackYears: years };
}
