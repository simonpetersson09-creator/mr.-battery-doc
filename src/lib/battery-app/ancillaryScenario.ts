/**
 * ANCILLARY SCENARIO (MODEL C) — PV = 0 SPECIAL FLOW ONLY.
 *
 * WHEN IT APPLIES: the frozen physical dimensioning finds no battery need (no solar,
 * no peak shaving) and the owner has selected ancillary services. Nothing in this file
 * can change the ordinary recommendation, and PV > 0 cases never reach it.
 *
 * SEPARATION OF DIMENSIONING AND RESULT (release principle):
 *   A. The TECHNICAL SIZE (kWh/kW) is chosen on a LOAD-NEUTRAL technical reference:
 *      the same frozen engine, same grid/fuse model, same market rules, but with the
 *      household load and production series set to zero. In pure ancillary operation
 *      the household's energy need dimensions nothing; what the connection and the
 *      battery can technically reserve does. The zero-baseline reference is the only
 *      mathematically neutral operating point: it exposes the connection's full
 *      operational import/export headroom, so no invented "typical household" (e.g.
 *      10 000 kWh/year) is hidden inside the sizing.
 *   B. The CUSTOMER RESULT is then produced by running the SELECTED pair through the
 *      customer's real 8760 h load. Grid headroom, NEM, held/paid up/down, revenue,
 *      customer share and max investment therefore still depend on the real load.
 *
 * HOW THE SIZE IS CHOSEN (technical, price independent):
 *   1. Every candidate is a full 8760 h run of the SAME frozen engine, with capacity and
 *      power both pinned to REAL steps from the CENTRAL config ladders (no local list).
 *      There is no automatic C-rate pairing: kWh and kW are two independent dimensions.
 *   2. The technical metric is the yearly sum of the hourly PAID reserve power per
 *      direction (kW*h). It comes from the engine's own grid/SOC/endurance/NEM physics
 *      and never from a price, a fuse formula or an average headroom shortcut.
 *   3. Capacity is walked upwards at the highest allowed power until the metric
 *      saturates -> that is the technical 100 % reference.
 *   4. The smallest real product kW reaching >= 95 % of the technical maximum in EVERY
 *      active direction is selected, then the smallest capacity that still reaches it.
 *   5. A Pareto check guarantees no smaller kWh/kW pair meets the same thresholds.
 *
 * SEK/year is calculated and presented AFTER the technical pair is chosen. It is never
 * an input to the sizing: without verified battery and installation prices the highest
 * revenue is not the same thing as the best battery.
 */

import { runBatteryEngine, DEFAULT_MAX_PRODUCT_C_RATE } from "@/lib/battery-engine";
import type { BatteryEngineInput, BatteryEngineResult } from "@/lib/battery-engine";

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

const HOURS_PER_YEAR = 8760;

/**
 * The CENTRAL capacity ladder, straight from the engine config (sweep steps, capped by
 * the engine's own maxNormalCapacityKWh). No separate list and no artificial 40 kWh
 * ceiling lives in this flow.
 */
export function capacitySteps(input: BatteryEngineInput): number[] {
  const cfg = defaultConfig();
  const list = input.battery?.capacityStepsKWh ?? cfg.sweep.capacitiesKWh;
  const max = cfg.sweetSpot.maxNormalCapacityKWh;
  return [...list]
    .filter((c) => c > 0 && (!(max > 0) || c <= max + 1e-9))
    .sort((a, b) => a - b);
}

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
  /** Technical maximum inside the fuse-derived power ceiling, kW*h per direction. */
  maxUpCapacityKwh: number;
  maxDownCapacityKwh: number;
  /** Coverage of the selected pair, 0..1 per active direction. */
  upCoverage: number;
  downCoverage: number;
  /** The 95 % requirement. */
  coverageThreshold: number;
  /** What was actually achievable in both directions inside the fuse ceiling. */
  appliedCoverage: number;
  /** The central max C-rate — REPORTED ONLY, it never filters here. */
  maxProductCRate: number;
  /** Operational grid power limit from the engine's own grid model, kW. */
  gridPowerLimitKw: number;
  /** Largest real product step at or below that limit, kW. */
  maxRecommendedPowerKw: number;
}

export interface AncillaryScenario {
  /** Presentation set: the capacity sweep at the selected power, ascending. */
  candidates: AncillaryScenarioCandidate[];
  /** The technically dimensioned pair. Never chosen on SEK/year. */
  selected: AncillaryScenarioCandidate | null;
  technical: AncillaryTechnicalSelection | null;
  /** Measured marginal technical gain per real product power step. */
  powerScan: AncillaryPowerScanStep[];
  /** Every simulated kWh x kW pair inside the fuse ceiling. */
  matrix: AncillaryScenarioCandidate[];
  /** Pareto-minimal pairs that meet the technical coverage requirement. */
  paretoFront: AncillaryScenarioCandidate[];
  /** False when several Pareto-minimal pairs qualify and physics gives no winner. */
  uniqueTechnicalOptimum: boolean;
  /**
   * The complete engine result behind `selected`, simulated on the customer's real load.
   * Presentation only (the PDF report reads it); no number is recomputed from it.
   */
  selectedResult: BatteryEngineResult | null;
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

/**
 * The main fuse sets a conservative CEILING for the recommended battery power in this
 * flow. The limit is read from the engine's own grid model (operational import/export
 * power) — the fuse formula is never duplicated — and is then rounded DOWN to a real
 * central product step. Dispatch physics is not affected.
 */
export function fuseDerivedPowerCeiling(
  input: BatteryEngineInput,
  result: BatteryEngineResult,
): { gridPowerLimitKw: number; allowedPowers: number[]; maxRecommendedPowerKw: number } {
  const grid = result.summary.grid;
  const imp = num(grid.operationalImportKw) || Infinity;
  const exp = num(grid.operationalExportKw) || Infinity;
  const gridPowerLimitKw = Math.max(0, Math.min(imp, exp));
  const allowedPowers = productSteps(input).filter(
    (kw) => !Number.isFinite(gridPowerLimitKw) || kw <= gridPowerLimitKw + 1e-9,
  );
  return {
    gridPowerLimitKw,
    allowedPowers,
    maxRecommendedPowerKw: allowedPowers[allowedPowers.length - 1] ?? 0,
  };
}



/**
 * The full engine result behind the last candidate produced by `runCandidate`.
 * Presentation only: the PDF report needs the complete simulated result of the selected
 * pair, and nothing here recomputes or changes any number.
 */
const LAST_RESULT = new WeakMap<AncillaryScenarioCandidate, BatteryEngineResult>();

/** The complete engine result for a candidate, when it is still available. */
export function candidateResult(
  c: AncillaryScenarioCandidate | null | undefined,
): BatteryEngineResult | null {
  return c ? (LAST_RESULT.get(c) ?? null) : null;
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
    const candidate: AncillaryScenarioCandidate = {
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
    LAST_RESULT.set(candidate, res);
    return candidate;
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
 * The 2D search is a few dozen full 8760 h engine runs, so identical inputs are served
 * from a small module-level cache. Pure memoisation: it never changes a result.
 */
const SCENARIO_CACHE = new Map<string, AncillaryScenario | null>();
const SCENARIO_CACHE_MAX = 8;

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
  let cacheKey: string | null = null;
  try {
    cacheKey = JSON.stringify([input, customerAncillaryShare, targetPaybackYears]);
  } catch {
    cacheKey = null;
  }
  if (cacheKey !== null && SCENARIO_CACHE.has(cacheKey)) {
    return SCENARIO_CACHE.get(cacheKey) ?? null;
  }
  const scenario = computeAncillaryScenarioUncached(
    input,
    result,
    customerAncillaryShare,
    targetPaybackYears,
  );
  if (cacheKey !== null) {
    if (SCENARIO_CACHE.size >= SCENARIO_CACHE_MAX) {
      const oldest = SCENARIO_CACHE.keys().next().value;
      if (oldest !== undefined) SCENARIO_CACHE.delete(oldest);
    }
    SCENARIO_CACHE.set(cacheKey, scenario);
  }
  return scenario;
}

/**
 * THE LOAD-NEUTRAL TECHNICAL REFERENCE.
 *
 * Same engine, same grid/fuse model, same market, same battery physics — but the
 * household load and the production series are zero. Rationale: in pure ancillary
 * operation the household energy need dimensions nothing, so letting it decide kWh/kW
 * would make the technical recommendation drift with a number that only affects the
 * revenue simulation. A zero baseline is the only neutral, mathematically defined
 * operating point: it exposes the connection's full operational import/export headroom
 * and therefore measures the connection + battery FCR capability itself. No invented
 * "typical" consumption is used anywhere.
 */
export function neutralTechnicalInput(input: BatteryEngineInput): BatteryEngineInput {
  const zeros = new Array(HOURS_PER_YEAR).fill(0) as number[];
  return {
    ...input,
    consumption: {
      ...(input.consumption ?? {}),
      annualKWh: 0,
      monthlyKWh: new Array(12).fill(0) as number[],
      hourlyKWh: zeros,
    },
    production: {
      ...(input.production ?? {}),
      enabled: false,
      annualKWh: 0,
      kWp: 0,
      monthlyKWh: new Array(12).fill(0) as number[],
      hourlyKWh: zeros,
    },
  };
}

function computeAncillaryScenarioUncached(
  input: BatteryEngineInput,
  result: BatteryEngineResult,
  customerAncillaryShare: number,
  targetPaybackYears: number,
): AncillaryScenario | null {
  const rec = result.summary.recommendation;
  if (rec.capacityKWh > 0) return null;
  if (rec.sizingWasFixed) return null;
  if (!input.strategies?.fcrDUp) return null;

  const share = clampCustomerAncillaryShare(customerAncillaryShare);
  const years = clampTargetPaybackYears(targetPaybackYears);
  const caps = capacitySteps(input);
  if (caps.length === 0) return null;
  if (productSteps(input).length === 0) return null;

  /* --------- 0. the load-neutral technical reference run ------------------------- */
  const neutralInput = neutralTechnicalInput(input);
  let neutralResult: BatteryEngineResult;
  try {
    neutralResult = runBatteryEngine(neutralInput);
  } catch {
    return null;
  }

  /* --------- memoised engine runs: every pair is simulated at most once ---------- */
  const cache = new Map<string, AncillaryScenarioCandidate | null>();
  const evaluate = (cap: number, kw: number): AncillaryScenarioCandidate | null => {
    const key = `${cap}|${kw}`;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    const c = runCandidate(neutralInput, cap, kw, share, years);
    cache.set(key, c);
    return c;
  };

  /* --------- 1. the main fuse sets the RECOMMENDATION ceiling for kW -------------
   * The ceiling comes from the engine's own grid model (operational import/export
   * limit) — the fuse formula is never duplicated here. Dispatch physics is untouched:
   * this only limits which product steps may be RECOMMENDED. The central max C-rate is
   * reported but does NOT filter candidates in this flow, so C-rate is an OUTPUT of the
   * search, not a sizing condition. */
  const cRateLimit = maxProductCRateOf(input);
  const { gridPowerLimitKw, allowedPowers } = fuseDerivedPowerCeiling(
    neutralInput,
    neutralResult,
  );
  if (allowedPowers.length === 0) return null;
  const maxRecommendedPowerKw = allowedPowers[allowedPowers.length - 1]!;

  /* --------- 2. technical maximum: capacity walk at the highest allowed power -----
   * Ascending the CENTRAL capacity ladder until the technical metric saturates. The
   * ladder is never truncated by a local list, so a large fuse is free to keep going
   * as long as extra kWh still buys measurable reserve capability. */
  const capScan: AncillaryScenarioCandidate[] = [];
  let saturated = 0;
  for (const cap of caps) {
    const c = evaluate(cap, maxRecommendedPowerKw);
    if (!c) continue;
    const prev = capScan[capScan.length - 1];
    capScan.push(c);
    if (prev) {
      const before = score(prev);
      const gain = before > 0 ? (score(c) - before) / before : 1;
      saturated = gain < SATURATION_GAIN ? saturated + 1 : 0;
      if (saturated >= 2) break;
    }
  }
  if (capScan.length === 0) return null;
  const referenceCapKWh = capScan[capScan.length - 1]!.capacityKWh;

  /* --------- 3. power walk at that reference capacity ---------------------------- */
  const limits = { up: 0, down: 0 };
  const seen = (): AncillaryScenarioCandidate[] =>
    [...cache.values()].filter((c): c is AncillaryScenarioCandidate => c !== null);
  const refresh = () => {
    const all = seen();
    limits.up = Math.max(0, ...all.map((c) => c.upCapacityKwh));
    limits.down = Math.max(0, ...all.map((c) => c.downCapacityKwh));
  };
  const powerRuns: AncillaryScenarioCandidate[] = [];
  for (const kw of allowedPowers) {
    const c = evaluate(referenceCapKWh, kw);
    if (c) powerRuns.push(c);
  }
  refresh();

  const ratioOf = (c: AncillaryScenarioCandidate) =>
    Math.min(
      limits.up > 0 ? c.upCapacityKwh / limits.up : 1,
      limits.down > 0 ? c.downCapacityKwh / limits.down : 1,
    );
  /* 95 % stays the requirement. When no pair inside the fuse ceiling can reach it in
   * BOTH directions at once, the best jointly achievable balance is used instead —
   * never a new, lower hardcoded percentage. */
  const bestRatio = Math.max(0, ...seen().map(ratioOf));
  const appliedCoverage = Math.min(ANCILLARY_TECHNICAL_COVERAGE, bestRatio);

  /* Smallest allowed product power that meets the coverage requirement. */
  const selectedPowerKw =
    powerRuns.find((c) => ratioOf(c) >= appliedCoverage - 1e-9)?.powerKw ??
    maxRecommendedPowerKw;

  /* --------- 4. smallest capacity that still meets the requirement at that kW ----- */
  for (const cap of caps) {
    if (cap > referenceCapKWh + 1e-9) break;
    const c = evaluate(cap, selectedPowerKw);
    if (c && ratioOf(c) >= appliedCoverage - 1e-9) break;
  }
  const atPower = seen()
    .filter((c) => c.powerKw === selectedPowerKw)
    .sort((a, b) => a.capacityKWh - b.capacityKWh);
  const technicalPick =
    atPower.find((c) => ratioOf(c) >= appliedCoverage - 1e-9) ?? atPower[atPower.length - 1];
  if (!technicalPick) return null;

  const powerScan: AncillaryPowerScanStep[] = powerRuns.map((c, i) => {
    const prev = i > 0 ? powerRuns[i - 1]! : null;
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

  const matrix = seen().sort((a, b) => a.capacityKWh - b.capacityKWh || a.powerKw - b.powerKw);
  const pool = matrix.filter((c) => ratioOf(c) >= appliedCoverage - 1e-9);
  const paretoFront = pool
    .filter(
      (c) =>
        !pool.some(
          (o) =>
            o !== c &&
            o.capacityKWh <= c.capacityKWh &&
            o.powerKw <= c.powerKw &&
            (o.capacityKWh < c.capacityKWh || o.powerKw < c.powerKw),
        ),
    )
    .sort((a, b) => a.capacityKWh - b.capacityKWh || a.powerKw - b.powerKw);
  const uniqueTechnicalOptimum = paretoFront.length === 1;

  /* --------- 5. CUSTOMER RESULT: the chosen pair on the real 8760 h load ----------
   * The size is now fixed. Grid headroom, NEM, held/paid up/down, revenue, customer
   * share and max investment all come from the customer's own consumption. */
  const capIdx = caps.indexOf(technicalPick.capacityKWh);
  const presentationCaps = [caps[capIdx - 1], technicalPick.capacityKWh, caps[capIdx + 1]].filter(
    (c): c is number => typeof c === "number",
  );
  const candidates = presentationCaps
    .map((cap) => runCandidate(input, cap, selectedPowerKw, share, years))
    .filter((c): c is AncillaryScenarioCandidate => c !== null)
    .sort((a, b) => a.capacityKWh - b.capacityKWh);
  const selected =
    candidates.find((c) => Math.abs(c.capacityKWh - technicalPick.capacityKWh) < 1e-9) ?? null;
  if (!selected) return null;

  // No priced reserve data for this market -> no scenario, never a 0 kr claim.
  if (!candidates.some((c) => c.ancillaryMarketValueSek > 0)) return null;

  return {
    candidates,
    selected,
    selectedResult: candidateResult(selected),
    technical: {
      maxUpCapacityKwh: limits.up,
      maxDownCapacityKwh: limits.down,
      upCoverage: limits.up > 0 ? technicalPick.upCapacityKwh / limits.up : 1,
      downCoverage: limits.down > 0 ? technicalPick.downCapacityKwh / limits.down : 1,
      coverageThreshold: ANCILLARY_TECHNICAL_COVERAGE,
      appliedCoverage,
      maxProductCRate: cRateLimit,
      gridPowerLimitKw,
      maxRecommendedPowerKw,
    },
    powerScan,
    matrix,
    paretoFront,
    uniqueTechnicalOptimum,
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
