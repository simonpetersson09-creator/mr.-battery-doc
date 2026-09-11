import { computeGridLimits } from "./dispatch";
import { simulate } from "./simulate";
import type { LabConfig, PowerSizing, PowerSizingPoint, SimResult, TimeSeries } from "./types";

/**
 * Useful energy = kWh the battery delivered back to the load, measured AFTER conversion
 * losses, PLUS solar it rescued from export curtailment and released to the grid later.
 * Gross charged energy is deliberately not used, and the two terms are disjoint.
 */
export function usefulEnergyKWh(r: SimResult): number {
  return r.totalUsefulKWh;
}

export function nearestProductStep(needKw: number, steps: number[]): number {
  const sorted = [...steps].sort((a, b) => a - b);
  return sorted.find((p) => p >= needKw - 1e-9) ?? sorted[sorted.length - 1] ?? needKw;
}

/**
 * Power sizing for one already-chosen capacity. Three separate layers:
 *  1. physical need  — from the simulated sweep, relative to the highest tested power
 *  2. product level  — mapped onto real product steps (C-rate only as product rule)
 *  3. grid limit     — reported as binding hours / blocked kWh, never as an automatic cut
 */
export function sizePower(
  cfg: LabConfig,
  series: TimeSeries,
  capacityKWh: number,
): PowerSizing {
  const ladder = [...new Set(cfg.powerSizing.fineStepsKw)]
    .filter((p) => p > 0)
    .sort((a, b) => a - b);
  const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 2 });

  if (capacityKWh <= 0 || ladder.length === 0) {
    return {
      capacityKWh,
      referencePowerKw: 0,
      referenceUsefulKWh: 0,
      physicalNeedKw: 0,
      physicalCRate: 0,
      productKw: 0,
      productCRate: 0,
      productFloorAppliedKw: null,
      utilityPctOfReference: 0,
      missedKWhVsReference: 0,
      powerBoundHours: 0,
      powerMissedKWh: 0,
      gridImportBoundHours: 0,
      gridExportBoundHours: 0,
      gridBlockedKWh: 0,
      gridUnservedKWh: 0,
      gridWarning: null,
      curve: [],
      basePowerKw: 0,
      baseUsefulKWh: 0,
      upgradeCandidateKw: null,
      upgradeGainKWh: 0,
      upgradeGainPct: 0,
      upgradeApplied: false,
      topStepGainPct: 0,
      powerUpperLimitReached: false,
      explanation: "Inget batteri — ingen effektdimensionering.",

    };
  }

  const runs = new Map<number, SimResult>();
  const runAt = (p: number) => {
    const cached = runs.get(p);
    if (cached) return cached;
    const r = simulate(cfg, series, capacityKWh, p);
    runs.set(p, r);
    return r;
  };

  const referencePowerKw = ladder[ladder.length - 1]!;
  const reference = runAt(referencePowerKw);
  const referenceUsefulKWh = usefulEnergyKWh(reference);

  const curve: PowerSizingPoint[] = ladder.map((p) => {
    const r = runAt(p);
    const useful = usefulEnergyKWh(r);
    return {
      powerKw: p,
      usefulKWh: useful,
      pctOfReference: referenceUsefulKWh > 0 ? (useful / referenceUsefulKWh) * 100 : 100,
      powerBoundHours: r.powerBoundHours,
      powerMissedKWh: r.powerMissedKWh,
    };
  });

  const threshold = cfg.powerSizing.utilityThresholdPct;
  const physicalNeedKw =
    curve.find((p) => p.pctOfReference >= threshold - 1e-9)?.powerKw ?? referencePowerKw;

  /**
   * ---- product layer ----
   * kW is sized independently of kWh. Start at the configured base power (3 kW) and
   * only step up when a real control simulation shows meaningful extra useful energy.
   * Binding hours and theoretical "missed energy" are never used on their own.
   */
  const productSteps = [...new Set(cfg.powerSizing.productStepsKw)]
    .filter((p) => p > 0)
    .sort((a, b) => a - b);
  const floorFromCRate =
    cfg.powerSizing.productMinCRate > 0 ? capacityKWh * cfg.powerSizing.productMinCRate : 0;
  const basePowerKw = nearestProductStep(
    Math.max(cfg.powerSizing.basePowerKw, floorFromCRate),
    productSteps,
  );
  const baseUsefulKWh = usefulEnergyKWh(runAt(basePowerKw));

  let productKw = basePowerKw;
  let upgradeCandidateKw: number | null = null;
  let upgradeGainKWh = 0;
  let upgradeGainPct = 0;
  let upgradeApplied = false;

  /**
   * Every capacity is allowed to step up — there is no capacity gate, because the
   * gain requirement itself is the physical test. Candidates are bounded by the
   * product step that covers the physical need: above it the simulation cannot
   * deliver meaningful extra energy by definition of the utility threshold.
   */
  const upperCandidateKw = nearestProductStep(physicalNeedKw, productSteps);
  const candidates = productSteps.filter(
    (p) => p > basePowerKw && p <= upperCandidateKw + 1e-9,
  );
  let currentUseful = baseUsefulKWh;
  for (const candidate of candidates) {
    const useful = usefulEnergyKWh(runAt(candidate));
    // Gain is always measured against the currently accepted power, so a step that
    // lands on a local plateau is skipped instead of ending the search.
    const gainKWh = useful - currentUseful;
    const gainPct = currentUseful > 0 ? (gainKWh / currentUseful) * 100 : 0;
    if (upgradeCandidateKw === null) {
      // Report the first candidate above the base power, applied or not.
      upgradeCandidateKw = candidate;
      upgradeGainKWh = gainKWh;
      upgradeGainPct = gainPct;
    }
    if (gainPct < cfg.powerSizing.upgradeMinGainPct) continue;
    currentUseful = useful;
    productKw = candidate;
    upgradeApplied = true;
    upgradeCandidateKw = candidate;
    upgradeGainKWh = gainKWh;
    upgradeGainPct = gainPct;
  }


  const ceilFromCRate =
    cfg.powerSizing.productMaxCRate > 0 ? capacityKWh * cfg.powerSizing.productMaxCRate : 0;
  if (ceilFromCRate > 0 && productKw > ceilFromCRate) {
    const under = [...productSteps].sort((a, b) => b - a).find((p) => p <= ceilFromCRate);
    if (under) productKw = under;
  }

  const atProduct = runAt(productKw);
  const usefulAtProduct = usefulEnergyKWh(atProduct);
  const limits = computeGridLimits(cfg.grid);

  const gridBinds =
    atProduct.gridImportBoundHours > 0 || atProduct.gridExportBoundHours > 0;
  const gridWarning = gridBinds
    ? `Anslutningen binder: import ${atProduct.gridImportBoundHours} h, export ${atProduct.gridExportBoundHours} h ` +
      `(${fmt(atProduct.gridBlockedKWh)} kWh blockerad export, ${fmt(
        atProduct.gridUnservedKWh,
      )} kWh otäckt last) vid gräns ${fmt(limits.maxImportKw)} kW. ` +
      `Effekten sänks inte automatiskt — nätflödet begränsas dynamiskt i dispatchen.`
    : null;

  const explanation =
    `${fmt(capacityKWh)} kWh: effekten dimensioneras separat från kapaciteten. ` +
    `Utgångspunkt ${fmt(basePowerKw)} kW (${fmt(baseUsefulKWh)} kWh nyttig energi). ` +
    (upgradeCandidateKw !== null
      ? `Kontrollsimulering av ${fmt(upgradeCandidateKw)} kW gav ${fmt(
          upgradeGainKWh,
        )} kWh/år (${fmt(upgradeGainPct)} %) extra nyttig energi; kravet är ${fmt(
          cfg.powerSizing.upgradeMinGainPct,
        )} % — ${upgradeApplied ? "effekten höjdes" : "effekten höjdes inte"}. ` +
        `Samtliga produktsteg upp till ${fmt(
          upperCandidateKw,
        )} kW prövades, så en platå mellan två steg stoppar inte sökningen. `
      : `Utgångseffekten täcker redan det fysiska behovet — inget högre produktsteg prövas. `) +

    `Rekommenderad effekt ${fmt(productKw)} kW (${fmt(productKw / capacityKWh)} C). ` +
    `Fysiskt effektbehov vid ${fmt(threshold)} %-referens är ${fmt(physicalNeedKw)} kW ` +
    `(${fmt(physicalNeedKw / capacityKWh)} C, referens ${fmt(
      referencePowerKw,
    )} kW). Nyttan vid rekommenderad effekt är ${fmt(
      referenceUsefulKWh > 0 ? (usefulAtProduct / referenceUsefulKWh) * 100 : 100,
    )} % av obegränsad effekt (${fmt(
      Math.max(0, referenceUsefulKWh - usefulAtProduct),
    )} kWh/år missas).`;


  return {
    capacityKWh,
    referencePowerKw,
    referenceUsefulKWh,
    physicalNeedKw,
    physicalCRate: physicalNeedKw / capacityKWh,
    productKw,
    productCRate: productKw / capacityKWh,
    productFloorAppliedKw: floorFromCRate > physicalNeedKw ? floorFromCRate : null,
    utilityPctOfReference:
      referenceUsefulKWh > 0 ? (usefulAtProduct / referenceUsefulKWh) * 100 : 100,
    missedKWhVsReference: Math.max(0, referenceUsefulKWh - usefulAtProduct),
    powerBoundHours: atProduct.powerBoundHours,
    powerMissedKWh: atProduct.powerMissedKWh,
    gridImportBoundHours: atProduct.gridImportBoundHours,
    gridExportBoundHours: atProduct.gridExportBoundHours,
    gridBlockedKWh: atProduct.gridBlockedKWh,
    gridUnservedKWh: atProduct.gridUnservedKWh,
    gridWarning,
    curve,
    basePowerKw,
    baseUsefulKWh,
    upgradeCandidateKw,
    upgradeGainKWh,
    upgradeGainPct,
    upgradeApplied,
    explanation,

  };
}
