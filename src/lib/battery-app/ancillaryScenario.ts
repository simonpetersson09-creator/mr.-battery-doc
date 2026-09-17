/**
 * ANCILLARY SCENARIO (MODEL C) — PV = 0 SPECIAL FLOW ONLY.
 *
 * WHEN IT APPLIES: the frozen physical dimensioning finds no battery need (no solar,
 * no peak shaving) and the owner has selected ancillary services. Nothing in this file
 * can change the ordinary recommendation, and PV > 0 cases never reach it.
 *
 * HOW THE SIZE IS CHOSEN (technical, price independent):
 *   1. Every candidate is a full 8760 h run of the SAME frozen engine, with capacity and
 *      power both pinned to REAL steps from the central config. There is no automatic
 *      C-rate pairing: kWh and kW are two independent dimensions here.
 *   2. The technical metric is the yearly sum of the hourly PAID reserve power per
 *      direction (kW*h). It comes from the engine's own grid/SOC/endurance/NEM physics
 *      and never from a price, a fuse formula or an average headroom shortcut.
 *   3. Power steps are walked upwards until the metric saturates -> that is 100 %.
 *   4. The smallest real product kW reaching >= 95 % of the technical maximum in EVERY
 *      active direction is selected, then the smallest capacity that still reaches 95 %
 *      of what is achievable at that kW.
 *   5. A Pareto check guarantees no smaller kWh/kW pair meets the same thresholds.
 *
 * SEK/year is calculated and presented AFTER the technical pair is chosen. It is never
 * an input to the sizing: without verified battery and installation prices the highest
 * revenue is not the same thing as the best battery.
 */

import { runBatteryEngine, DEFAULT_MAX_PRODUCT_C_RATE } from "@/lib/battery-engine";
import type { BatteryEngineInput, BatteryEngineResult } from "@/lib/battery-engine";
import { capacityLadder } from "./capacityAlternatives";
import type { BatteryAlternative } from "./capacityAlternatives";
import { defaultConfig } from "@/lib/lab/defaults";
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
export const ANCILLARY_SCENARIO_CAPACITIES_KWH = [5, 10, 15, 20, 25, 30, 40];

/**
 * Share of the technically achievable reserve performance a candidate must reach.
 * 95 % was the most robust threshold in the sensitivity audit: below it the selection
 * gives away real capability, above it single marginal hours start to decide the size.
 */
export const ANCILLARY_TECHNICAL_COVERAGE = 0.95;

/** A step counts as saturated when it adds less than this share of technical performance. */
const SATURATION_GAIN = 0.01;

export interface AncillaryScenarioCandidate {
  capacityKWh: number;
  /** Real product power step the candidate was simulated with — never a C-rate product. */
  powerKw: number;
  /** Installed (nameplate) battery power of the candidate, kW. */
  installedPowerKw: number;
  /** C-rate of the pair = powerKw / capacityKWh. */
  cRate: number;
  /**
   * True when the pair stays inside the engine's already verified hardware envelope
   * (the central maxProductCRate). No new C-rate is invented here.
   */
  hardwareVerified: boolean;
  /** Yearly sum of hourly PAID up-regulation power, kW*h. Price independent. */
  upCapacityKwh: number;
  /** Yearly sum of hourly PAID down-regulation power, kW*h. Price independent. */
  downCapacityKwh: number;
  /** Mean paid up / down power over the scheduled hours, kW. */
  paidUpKw: number;
  paidDownKw: number;
  /** Max physically reservable power over the scheduled hours, kW. */
  paidUpMaxKw: number;
  paidDownMaxKw: number;
  /** Share of the installed power the model can actually use, per direction. */
  utilizedPowerRatioUp: number;
  utilizedPowerRatioDown: number;
  /** Which physical factor bound the reserve, hour counts from the engine. */
  powerLimitedHours: number;
  gridLimitedHours: number;
  energyLimitedHours: number;
  /** Ordinary energy work of the battery in this candidate. */
  equivalentFullCycles: number;
  throughputKWh: number;
  /**
   * True when the battery does no modelled energy work (no cycles, no throughput):
   * the size is then driven by reserve capability, not by the household's energy need.
   */
  ancillaryDriven: boolean;
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

export interface AncillaryPowerScanStep {
  powerKw: number;
  capacityKWh: number;
  upCapacityKwh: number;
  downCapacityKwh: number;
  /** Technical gain vs the previous (smaller) power step, kW*h and relative. */
  marginalGainKwh: number;
  marginalGainShare: number;
  /** Extra installed kW this step added. */
  addedPowerKw: number;
  utilizedPowerRatioUp: number;
  utilizedPowerRatioDown: number;
  gridLimitedHours: number;
  powerLimitedHours: number;
  energyLimitedHours: number;
}

export interface AncillaryTechnicalSelection {
  /** Technical maximum found by the saturation search, kW*h per direction. */
  maxUpCapacityKwh: number;
  maxDownCapacityKwh: number;
  /** Coverage of the selected pair, 0..1 per active direction. */
  upCoverage: number;
  downCoverage: number;
  /** Coverage threshold actually applied. */
  coverageThreshold: number;
  /** The verified hardware envelope the selection respected (existing central value). */
  maxProductCRate: number;
}

export interface AncillaryScenario {
  /** Presentation set: the capacity sweep at the selected power, ascending. */
  candidates: AncillaryScenarioCandidate[];
  /** The technically dimensioned pair. Never chosen on SEK/year. */
  selected: AncillaryScenarioCandidate | null;
  technical: AncillaryTechnicalSelection | null;
  /** Measured marginal technical gain per real product power step. */
  powerScan: AncillaryPowerScanStep[];
  /** True when the selected pair does no modelled energy work for the household. */
  ancillaryDriven: boolean;
  customerAncillaryShare: number;
  targetPaybackYears: number;
}

function marketValue(res: BatteryEngineResult): number {
  const f = res.summary.fcr;
  if (!f.enabled) return 0;
  const v = f.grossSek ?? 0;
  return Number.isFinite(v) ? v : 0;
}

function num(v: number | null | undefined): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/** Real product power steps, read from the central config. Never duplicated here. */
function productSteps(input: BatteryEngineInput): number[] {
  const list = input.battery?.powerStepsKw ?? defaultConfig().powerSizing.productStepsKw;
  return [...list].filter((s) => s > 0).sort((a, b) => a - b);
}

/** The verified hardware envelope already used by the ordinary engine. Never a new value. */
export function maxProductCRateOf(input: BatteryEngineInput): number {
  const v = input.battery?.maxProductCRateForCandidates;
  return typeof v === "number" && v > 0 ? v : DEFAULT_MAX_PRODUCT_C_RATE;
}

function runCandidate(
  input: BatteryEngineInput,
  capacityKWh: number,
  powerKw: number,
  share: number,
  years: number,
): AncillaryScenarioCandidate | null {
  try {
    const { fixedPowerKw: _ignored, ...battery } = input.battery ?? {};
    const res = runBatteryEngine({
      ...input,
      battery: { ...battery, fixedCapacityKWh: capacityKWh, fixedPowerKw: powerKw },
    });
    const rec = res.summary.recommendation;
    const f = res.summary.fcr;
    const energy = res.summary.energy;
    const total = res.summary.economy.totalOperatingBenefitSek;
    const market = marketValue(res);
    const customerBenefit = customerBenefitFromTotals(total, market, share);
    const hours = num(f.reservedHours);
    const paidUpKw = num(f.monetizedPowerKw);
    const paidDownKw = num(f.avgHeldDownPowerKw);
    const installedPowerKw = rec.recommendedPowerKw ?? rec.productPowerKw;
    const cap = rec.capacityKWh;
    const cRate = cap > 0 ? installedPowerKw / cap : 0;
    const cycles = num(energy.equivalentFullCycles);
    const throughputKWh = num(energy.totalUsefulKWh);
    return {
      capacityKWh: cap,
      powerKw: installedPowerKw,
      installedPowerKw,
      cRate,
      hardwareVerified: cRate <= maxProductCRateOf(input) + 1e-9,
      upCapacityKwh: paidUpKw * hours,
      downCapacityKwh: paidDownKw * hours,
      paidUpKw,
      paidDownKw,
      paidUpMaxKw: num(f.reservablePowerMaxKw),
      paidDownMaxKw: paidDownKw,
      utilizedPowerRatioUp: installedPowerKw > 0 ? paidUpKw / installedPowerKw : 0,
      utilizedPowerRatioDown: installedPowerKw > 0 ? paidDownKw / installedPowerKw : 0,
      powerLimitedHours: num(f.powerLimitedHours),
      gridLimitedHours: num(f.gridLimitedHours),
      energyLimitedHours: num(f.energyLimitedHours),
      equivalentFullCycles: cycles,
      throughputKWh,
      ancillaryDriven: cycles <= 1e-6 && throughputKWh <= 1e-6,
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

/** Sum of the technical performance in the directions that are actually paid. */
function score(c: AncillaryScenarioCandidate): number {
  return c.upCapacityKwh + c.downCapacityKwh;
}

function meetsCoverage(
  c: AncillaryScenarioCandidate,
  maxUp: number,
  maxDown: number,
  threshold: number,
): boolean {
  const upOk = maxUp <= 0 || c.upCapacityKwh >= maxUp * threshold - 1e-9;
  const downOk = maxDown <= 0 || c.downCapacityKwh >= maxDown * threshold - 1e-9;
  return upOk && downOk;
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
  const caps = ANCILLARY_SCENARIO_CAPACITIES_KWH.filter((c) => ladder.has(c)).sort(
    (a, b) => a - b,
  );
  if (caps.length === 0) return null;
  const steps = productSteps(input);
  if (steps.length === 0) return null;

  /* --------- memoised engine runs: every pair is simulated at most once --------- */
  const cache = new Map<string, AncillaryScenarioCandidate | null>();
  const evaluate = (cap: number, kw: number): AncillaryScenarioCandidate | null => {
    const key = `${cap}|${kw}`;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    const c = runCandidate(input, cap, kw, share, years);
    cache.set(key, c);
    return c;
  };
  const evaluated = (): AncillaryScenarioCandidate[] =>
    [...cache.values()].filter((c): c is AncillaryScenarioCandidate => c !== null);

  /* --------- 0. verified hardware envelope -------------------------------------
   * The ordinary engine already has ONE verified physical battery/inverter limit:
   * maxProductCRate. This flow respects exactly that value — no new C-rate is
   * invented here — so a pair like 15 kWh / 20 kW (1.33 C) can never be selected. */
  const cRateLimit = maxProductCRateOf(input);
  const powersFor = (cap: number) => steps.filter((kw) => kw <= cap * cRateLimit + 1e-9);
  const capsFor = (kw: number) => caps.filter((cap) => kw <= cap * cRateLimit + 1e-9);
  const usableSteps = steps.filter((kw) => capsFor(kw).length > 0);
  if (usableSteps.length === 0 || powersFor(caps[caps.length - 1]!).length === 0) return null;

  /* --------- 1. power scan: walk the real steps upwards until saturation ---------
   * Each step is seeded with the smallest capacity that can host it inside the verified
   * hardware envelope. That is a SEARCH SEED only: the capacity is re-optimised across
   * the ladder at the selected power in step 3, and the 95 % rule is always measured
   * against the maximum found over every simulated pair. */
  const scan: AncillaryScenarioCandidate[] = [];
  let best = 0;
  let flat = 0;
  for (const kw of usableSteps) {
    const seed = capsFor(kw)[0]!;
    const c = evaluate(seed, kw);
    if (!c) continue;
    scan.push(c);
    const s = score(c);
    if (s > best * (1 + SATURATION_GAIN)) {
      best = Math.max(best, s);
      flat = 0;
    } else {
      best = Math.max(best, s);
      flat += 1;
      // Two consecutive steps without material technical gain = saturated.
      if (flat >= 2) break;
    }
  }
  if (scan.length === 0) return null;

  /* Measured marginal technical gain per real power step. Reported, never a price and
   * never a new hardcoded cut-off percentage. */
  const powerScan: AncillaryPowerScanStep[] = scan.map((c, i) => {
    const prev = i > 0 ? scan[i - 1]! : null;
    const cur = score(c);
    const before = prev ? score(prev) : 0;
    return {
      powerKw: c.powerKw,
      capacityKWh: c.capacityKWh,
      upCapacityKwh: c.upCapacityKwh,
      downCapacityKwh: c.downCapacityKwh,
      marginalGainKwh: cur - before,
      marginalGainShare: before > 0 ? (cur - before) / before : 1,
      addedPowerKw: prev ? c.powerKw - prev.powerKw : c.powerKw,
      utilizedPowerRatioUp: c.utilizedPowerRatioUp,
      utilizedPowerRatioDown: c.utilizedPowerRatioDown,
      gridLimitedHours: c.gridLimitedHours,
      powerLimitedHours: c.powerLimitedHours,
      energyLimitedHours: c.energyLimitedHours,
    };
  });

  const maxOf = (list: AncillaryScenarioCandidate[]) => ({
    up: Math.max(0, ...list.map((c) => c.upCapacityKwh)),
    down: Math.max(0, ...list.map((c) => c.downCapacityKwh)),
  });

  /* --------- 2. smallest kW reaching the threshold in every active direction ------ */
  let limits = maxOf(evaluated());
  let power =
    scan.find((c) => meetsCoverage(c, limits.up, limits.down, ANCILLARY_TECHNICAL_COVERAGE))
      ?.powerKw ?? scan.reduce((a, b) => (score(b) > score(a) ? b : a)).powerKw;

  /* --------- 3. smallest kWh that still holds that power ------------------------- */
  const sweepAt = (kw: number): AncillaryScenarioCandidate[] =>
    capsFor(kw)
      .map((cap) => evaluate(cap, kw))
      .filter((c): c is AncillaryScenarioCandidate => c !== null)
      .sort((a, b) => a.capacityKWh - b.capacityKWh);

  let sweep = sweepAt(power);
  // The sweep can raise the technical maximum; re-derive the power once against it.
  limits = maxOf(evaluated());
  const rescan = scan.find((c) =>
    meetsCoverage(c, limits.up, limits.down, ANCILLARY_TECHNICAL_COVERAGE),
  );
  if (rescan && rescan.powerKw !== power) {
    power = rescan.powerKw;
    sweep = sweepAt(power);
    limits = maxOf(evaluated());
  }
  if (sweep.length === 0) return null;

  const atPower = maxOf(sweep);
  let selected =
    sweep.find((c) =>
      meetsCoverage(c, atPower.up, atPower.down, ANCILLARY_TECHNICAL_COVERAGE),
    ) ?? sweep[sweep.length - 1]!;

  /* --------- 4. Pareto check: no smaller pair may meet the same thresholds -------- */
  const dominating = evaluated()
    .filter(
      (c) =>
        c.hardwareVerified &&
        c.capacityKWh <= selected.capacityKWh &&
        c.powerKw <= selected.powerKw &&
        (c.capacityKWh < selected.capacityKWh || c.powerKw < selected.powerKw) &&
        meetsCoverage(c, limits.up, limits.down, ANCILLARY_TECHNICAL_COVERAGE),
    )
    .sort((a, b) => a.capacityKWh - b.capacityKWh || a.powerKw - b.powerKw);
  if (dominating.length > 0) selected = dominating[0]!;

  const candidates = sweep.some((c) => c.capacityKWh === selected.capacityKWh)
    ? sweep
    : [...sweep, selected].sort((a, b) => a.capacityKWh - b.capacityKWh);

  // No priced reserve data for this market -> no scenario, never a 0 kr claim.
  if (!candidates.some((c) => c.ancillaryMarketValueSek > 0)) return null;

  return {
    candidates,
    selected,
    technical: {
      maxUpCapacityKwh: limits.up,
      maxDownCapacityKwh: limits.down,
      upCoverage: limits.up > 0 ? selected.upCapacityKwh / limits.up : 1,
      downCoverage: limits.down > 0 ? selected.downCapacityKwh / limits.down : 1,
      coverageThreshold: ANCILLARY_TECHNICAL_COVERAGE,
      maxProductCRate: cRateLimit,
    },
    powerScan,
    ancillaryDriven: selected.ancillaryDriven,
    customerAncillaryShare: share,
    targetPaybackYears: years,
  };
}

/**
 * The technically dimensioned pair. It is NOT "the most profitable battery": no price
 * enters the selection, only the engine's own modelled reserve capability.
 */
export function bestAncillaryCandidate(
  scenario: AncillaryScenario | null,
): AncillaryScenarioCandidate | null {
  return scenario?.selected ?? null;
}

/**
 * The technical pick plus its nearest simulated capacity neighbours, mapped onto the
 * ordinary three-battery comparison card. Same shape, same card, no extra section.
 */
export function ancillaryAlternatives(
  scenario: AncillaryScenario | null,
): BatteryAlternative[] {
  const best = bestAncillaryCandidate(scenario);
  if (!scenario || !best) return [];
  const idx = scenario.candidates.indexOf(best);
  const toAlt = (
    c: AncillaryScenarioCandidate,
    level: BatteryAlternative["level"],
  ): BatteryAlternative => ({
    level,
    capacityKWh: c.capacityKWh,
    powerKw: c.powerKw,
    annualBenefitSek: c.annualBenefitSek,
    ancillaryMarketValueSek: c.ancillaryMarketValueSek,
    customerBenefitSek: c.customerBenefitSek,
  });
  const out: BatteryAlternative[] = [];
  const lower = idx > 0 ? scenario.candidates[idx - 1] : undefined;
  const higher = idx < scenario.candidates.length - 1 ? scenario.candidates[idx + 1] : undefined;
  if (lower) out.push(toAlt(lower, "lower"));
  out.push(toAlt(best, "recommended"));
  if (higher) out.push(toAlt(higher, "higher"));
  return out;
}
