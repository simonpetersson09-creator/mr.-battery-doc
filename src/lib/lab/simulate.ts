import {
  ancillaryPlan,
  computeAncillary,
  computeFcrRevenue,
  fcrPriceSeriesForCountry,
  marketProfile,
  MISSING_PRICE_TEXT,
} from "./ancillary";
import { baseline, computeGridLimits, dispatch } from "./dispatch";
import { HOURS_PER_YEAR, MONTH_DAYS } from "./defaults";
import {
  capexKr,
  demandCharge,
  energyCostKr,
  flexRevenueKr,
  npvKr,
  paybackYears,
} from "./economics";
import { buildTimeSeries } from "./profiles";
import type { LabConfig, SimResult, TimeSeries } from "./types";

function sum(a: number[]): number {
  let s = 0;
  for (const v of a) s += v;
  return s;
}

function monthlyPeaks(series: number[]): number[] {
  const out: number[] = [];
  let cursor = 0;
  for (const days of MONTH_DAYS) {
    let m = 0;
    for (let h = cursor; h < cursor + days * 24; h++) m = Math.max(m, series[h] ?? 0);
    out.push(m);
    cursor += days * 24;
  }
  return out;
}

function peakKw(series: number[]): number {
  let m = 0;
  for (const v of series) m = Math.max(m, v);
  return m;
}

export function buildSeries(cfg: LabConfig): TimeSeries {
  return buildTimeSeries(cfg.consumption, cfg.solar, cfg.variability);
}

/** Runs one full-year simulation for one (capacity, power) combination. */
export function simulate(
  cfg: LabConfig,
  series: TimeSeries,
  capacityKWh: number,
  powerKw: number,
): SimResult {
  const limits = computeGridLimits(cfg.grid);
  const base = baseline(series, limits);
  const plan = cfg.strategies.ancillaryServices ? ancillaryPlan(cfg.ancillary) : null;
  const d = dispatch({
    series,
    battery: cfg.battery,
    grid: cfg.grid,
    strategies: cfg.strategies,
    peak: cfg.peakShaving,
    spot: cfg.spot,
    flex: cfg.flex,
    // Directional, period-limited reservation. It is the ONLY place ancillary power and
    // energy are withheld, so nothing can be booked twice by two strategies.
    ancillary: plan,
    capacityKWh,
    powerKw,
  });

  const annualLoad = sum(series.load);
  const annualPv = sum(series.pv);

  const baseImport = sum(base.imp);
  const baseExport = sum(base.exp);
  const importKWh = sum(d.importSeries);
  const exportKWh = sum(d.exportSeries);
  const t = d.tallies;

  const basePvSelf = annualPv - baseExport - base.curtailed;
  const pvExport = Math.max(0, exportKWh - t.dischargedToGridKWh);
  /**
   * PV self-consumption = PV that directly served the load + the share of the
   * battery energy actually delivered to the load that came from PV. Charging and
   * discharging losses are therefore NOT counted as self-consumed solar.
   */
  const chargedTotal = t.chargedFromPvKWh + t.chargedFromGridKWh;
  const pvShareOfCharge = chargedTotal > 0 ? t.chargedFromPvKWh / chargedTotal : 0;

  /**
   * ---- useful energy, split by ORIGIN of the stored energy ----
   * Charging is tallied in three disjoint buckets (would-be-exported PV, would-be-curtailed
   * PV, grid). The delivered energy is attributed with the same shares, so every kWh is
   * counted exactly once:
   *   shiftedSolar + recoveredToLoad + gridChargedToLoad = shiftedKWh
   *   totalUseful                                        = shiftedKWh + recoveredToGrid
   * Recovered solar that is discharged BACK to the grid later is real avoided spill, and it
   * is the only part of the battery-to-grid flow that counts as useful.
   */
  const shareExportPv = chargedTotal > 0 ? t.chargedFromPvWouldExportKWh / chargedTotal : 0;
  const shareCurtailPv = chargedTotal > 0 ? t.chargedFromPvWouldCurtailKWh / chargedTotal : 0;
  const shareGrid = chargedTotal > 0 ? t.chargedFromGridKWh / chargedTotal : 0;
  const shiftedSolarKWh = t.dischargedToLoadKWh * shareExportPv;
  const recoveredCurtailmentToLoadKWh = t.dischargedToLoadKWh * shareCurtailPv;
  const recoveredCurtailmentToGridKWh = t.dischargedToGridKWh * shareCurtailPv;
  const gridChargedToLoadKWh = t.dischargedToLoadKWh * shareGrid;
  const recoveredCurtailmentKWh =
    recoveredCurtailmentToLoadKWh + recoveredCurtailmentToGridKWh;
  const totalUsefulKWh = t.dischargedToLoadKWh + recoveredCurtailmentToGridKWh;
  const pvSelf = t.directPvToLoadKWh + t.dischargedToLoadKWh * pvShareOfCharge;

  const baseSelfConsumptionPct = annualPv > 0 ? (basePvSelf / annualPv) * 100 : 0;
  const selfConsumptionPct = annualPv > 0 ? (pvSelf / annualPv) * 100 : 0;
  /**
   * Self-sufficiency counts only demand that was ACTUALLY covered by own resources.
   * Load the connection could not deliver (unserved) is neither import nor a win, so it
   * is subtracted too — otherwise an undersized fuse would show up as high self-sufficiency.
   */
  const baseSelfSufficiencyPct =
    annualLoad > 0 ? ((annualLoad - baseImport - base.unserved) / annualLoad) * 100 : 0;
  const selfSufficiencyPct =
    annualLoad > 0 ? ((annualLoad - importKWh - t.unservedKWh) / annualLoad) * 100 : 0;

  const baseModelledPeakKw = peakKw(base.imp);
  const modelledPeakKw = peakKw(d.importSeries);

  // ---- energy balance check ----
  // pv used + import + (soc drop) === load served + export + losses
  const socDelta = t.socEnd - t.socStart;
  const inflow = annualPv - t.curtailedKWh + importKWh;
  const outflow = annualLoad - t.unservedKWh + exportKWh + t.lossesKWh + socDelta;
  const residual = inflow - outflow;
  const tolerance = Math.max(1e-6, annualLoad * 1e-9);

  // ---- economy (no market/flex revenue) ----
  const baseEnergyCost = energyCostKr(base.imp, base.exp, cfg.economics, cfg.spot);
  const batEnergyCost = energyCostKr(d.importSeries, d.exportSeries, cfg.economics, cfg.spot);
  const baseDemand = demandCharge(base.imp, cfg.demandCharge);
  const batDemand = demandCharge(d.importSeries, cfg.demandCharge);
  const demandSaving = baseDemand.annualKr - batDemand.annualKr;
  const energySaving = baseEnergyCost - batEnergyCost;
  const annualSavings = energySaving + demandSaving;

  const capex = capexKr(cfg.economics, capacityKWh, powerKw);
  const cycles = t.equivalentFullCycles;
  const npv = npvKr(annualSavings, cfg.economics, cfg.battery, cycles, capex);

  const flexAvailabilityPct = d.window.flexFeasible
    ? (d.flexAvailableHours / HOURS_PER_YEAR) * 100
    : 0;
  const flexRev = flexRevenueKr(cfg.flex, d.window.flexFeasible, flexAvailabilityPct);
  const annualWithFlex = annualSavings + flexRev;
  const npvWithFlex = npvKr(annualWithFlex, cfg.economics, cfg.battery, cycles, capex);

  /**
   * Ancillary services: the reservation is physically simulated, the ACTIVATION is not.
   * Revenue stays null until the user supplies a price dataset — a missing price is never
   * treated as 0 kr, and it never enters the ordinary economy.
   */
  const ancillaryOutcome = cfg.strategies.ancillaryServices
    ? computeAncillary(
        marketProfile(cfg.ancillary.marketId),
        cfg.ancillary,
        {
          capacityKWh,
          powerKw,
          usableKWh: d.window.usableKWh,
          roundTripEfficiency: cfg.battery.roundTripEfficiency,
          gridImportKw: limits.maxImportKw,
          gridExportKw: limits.maxExportKw,
          usedImportKw: peakKw(base.imp),
          usedExportKw: peakKw(base.exp),
        },
        d.ancillaryAvailabilityPct,
      )
    : null;

  /**
   * FCR-D up economics: historical 2025 Swedish prices applied to the reservation the
   * battery ACTUALLY held each hour. Pure post-processing — it does not touch the physics
   * and never enters annualSavingsKr/NPV.
   */
  const heldReservation = d.ancillaryReservedPowerKwByHour;
  // No verified price dataset for the country => no revenue is invented (null, not 0).
  const fcrSeries = fcrPriceSeriesForCountry(cfg.ancillary.priceCountry);
  const fcr =
    cfg.strategies.ancillaryServices && plan !== null && fcrSeries !== null
      ? computeFcrRevenue({
          reservedPowerKwByHour: heldReservation,
          series: fcrSeries,
          eurSekRate: cfg.ancillary.eurSekRate,
          aggregatorSharePct: cfg.ancillary.aggregatorSharePct,
          aggregatorFixedFeeSek: cfg.ancillary.aggregatorFixedKrPerYear,
        })
      : null;


  const notes = [...d.notes];
  if (plan) notes.push(...plan.notes);
  if (cfg.strategies.ancillaryServices && fcrSeries === null)
    notes.push(
      "Stödtjänster: verifierat historiskt prisunderlag saknas för valt land — intäkten redovisas som ej tillgänglig, inte som 0 kr.",
    );

  if (series.loadProvenance === "modelled")
    notes.push("Effekttoppar och timvärden är MODELLERADE ur syntetisk dygnsprofil.");
  if (t.cycleLimitHit) notes.push("Cykeltaket per år begränsade driften.");
  if (base.unserved > 0.001)
    notes.push(
      `Även utan batteri räcker inte anslutningen i vissa timmar (${base.unserved.toFixed(1)} kWh otäckt last i baslinjen) — baslinjens toppar kapas därför mot samma gräns.`,
    );
  if (t.unservedKWh > 0.001)
    notes.push(`Importgränsen kunde inte täcka lasten i vissa timmar (${t.unservedKWh.toFixed(1)} kWh).`);

  /**
   * Unserved load is a CONNECTION problem, not a battery-sizing problem. If a battery of this
   * size does not measurably reduce it, that must be stated instead of silently letting the
   * user read the recommendation as a fix.
   */
  const unservedDeltaKWh = base.unserved - t.unservedKWh;
  const unservedIsGridBound = base.unserved > 0.001 && unservedDeltaKWh <= 0.001;
  if (unservedIsGridBound)
    notes.push(
      `Batteriet minskar INTE den otäckta lasten (${base.unserved.toFixed(0)} → ${t.unservedKWh.toFixed(
        0,
      )} kWh/år). Begränsningen är huvudsäkringen/anslutningen, inte batteristorleken.`,
    );

  return {
    capacityKWh,
    powerKw,
    usableKWh: d.window.usableKWh,
    annualLoadKWh: annualLoad,
    annualPvKWh: annualPv,
    baseImportKWh: baseImport,
    baseExportKWh: baseExport,
    baseCurtailedKWh: base.curtailed,
    baseUnservedKWh: base.unserved,
    baseSelfConsumptionPct,
    baseSelfSufficiencyPct,
    baseModelledPeakKw,
    baseMonthlyPeakKw: monthlyPeaks(base.imp),
    monthlyPeakKw: monthlyPeaks(d.importSeries),
    importKWh,
    exportKWh,
    selfConsumptionPct,
    selfSufficiencyPct,
    modelledPeakKw,
    peakReductionKw: baseModelledPeakKw - modelledPeakKw,
    peakReductionPct:
      baseModelledPeakKw > 0
        ? ((baseModelledPeakKw - modelledPeakKw) / baseModelledPeakKw) * 100
        : 0,
    chargedKWh: t.chargedKWh,
    dischargedKWh: t.dischargedKWh,
    chargedFromPvKWh: t.chargedFromPvKWh,
    chargedFromGridKWh: t.chargedFromGridKWh,
    shiftedKWh: t.dischargedToLoadKWh,
    shiftedSolarKWh,
    recoveredCurtailmentToLoadKWh,
    recoveredCurtailmentToGridKWh,
    recoveredCurtailmentKWh,
    gridChargedToLoadKWh,
    totalUsefulKWh,
    unservedDeltaKWh,
    unservedIsGridBound,
    directPvToLoadKWh: t.directPvToLoadKWh,
    pvExportKWh: pvExport,
    batteryToGridKWh: t.dischargedToGridKWh,
    lossesKWh: t.lossesKWh,
    standbyKWh: t.standbyKWh,
    selfDischargeKWh: t.selfDischargeKWh,
    curtailmentRecoveredKWh: t.curtailmentRecoveredKWh,
    equivalentFullCycles: cycles,
    utilisationPct:
      d.window.usableKWh > 0 ? (t.dischargedKWh / (d.window.usableKWh * 365)) * 100 : 0,
    powerBoundHours: t.powerBoundHours,
    powerMissedKWh: t.powerMissedKWh,
    gridImportBoundHours: t.gridImportBoundHours,
    gridExportBoundHours: t.gridExportBoundHours,
    gridBlockedKWh: t.gridBlockedKWh,
    gridUnservedKWh: t.unservedKWh,
    grid: {
      physicalImportKw: limits.physicalImportKw,
      physicalExportKw: limits.physicalExportKw,
      operationalImportKw: limits.maxImportKw,
      operationalExportKw: limits.maxExportKw,
      importMarginPct: limits.importMarginPct,
      exportMarginPct: limits.exportMarginPct,
      maxActualImportKw: t.maxImportKw,
      maxActualExportKw: t.maxExportKw,
      importBoundHours: t.gridImportBoundHours,
      importLimitedKWh: t.gridImportLimitedKWh,
      exportBoundHours: t.gridExportBoundHours,
      exportCurtailedKWh: t.gridBlockedKWh,
      importLimitedByMarginKWh: t.gridImportLimitedByMarginKWh,
      exportCurtailedByMarginKWh: t.gridBlockedByMarginKWh,
      physicalImportWouldBindHours: t.physicalImportWouldBindHours,
      physicalExportWouldBindHours: t.physicalExportWouldBindHours,
      peakThresholdLimitedKWh: t.peakThresholdLimitedKWh,
      peakThresholdBoundHours: t.peakThresholdBoundHours,
    },
    flexAvailabilityPct,
    flexReservedKWh: d.window.reservedKWh,
    dispatchPower: { maxChargeKw: t.maxChargePowerKw, maxDischargeKw: t.maxDischargePowerKw },
    ancillary: {
      enabled: cfg.strategies.ancillaryServices && plan !== null,
      hypotheticalScenario: ancillaryOutcome?.hypotheticalScenario ?? false,
      aggregatedParticipation: cfg.ancillary.aggregatedParticipation,
      reservedPowerUpKw: plan?.upPowerKw ?? 0,
      reservedPowerDownKw: plan?.downPowerKw ?? 0,
      reservedEnergyUpKWh: plan?.upEnergyKWh ?? 0,
      reservedEnergyDownKWh: plan?.downEnergyKWh ?? 0,
      reservedHours: t.ancillaryReservedHours,
      readyHours: t.ancillaryReadyHours,
      availabilityPct: d.ancillaryAvailabilityPct,
      readinessChargeKWh: t.ancillaryReadinessChargeKWh,
      wholeYearSimplification: plan?.wholeYear ?? false,
      activationSimulated: false,
      grossKr: ancillaryOutcome?.grossKr ?? null,
      netKr: ancillaryOutcome?.netKr ?? null,
      revenueStatus: ancillaryOutcome?.revenueStatus ?? "missing-price-data",
      revenueMessage: ancillaryOutcome?.revenueMessage ?? MISSING_PRICE_TEXT,
      blockers: [...new Set((ancillaryOutcome?.services ?? []).flatMap((sv) => sv.blockers))],
      dataGaps: ancillaryOutcome?.dataGaps ?? [],
      assumptions: ancillaryOutcome?.assumptions ?? [],
      disclaimer: ancillaryOutcome?.disclaimer ?? "",
      fcr,
      avgReservedPowerUpKw: fcr?.avgReservedPowerKw ?? 0,
      reservablePowerAvgKw: d.fcrGate.avgReservablePowerKw,
      reservablePowerMaxKw: d.fcrGate.maxReservablePowerKw,
      heldPowerAvgKw: fcr?.avgReservedPowerKw ?? 0,
      // The economics is paid on the held series and on nothing else.
      monetizedPowerAvgKw: fcr?.avgReservedPowerKw ?? 0,
      gridHeadroomAvgKw: d.fcrGate.avgGridHeadroomKw,
      gridClippedAvgKw: d.fcrGate.avgGridClippedKw,
      powerLimitedHours: d.fcrGate.powerLimitedHours,
      energyLimitedHours: d.fcrGate.energyLimitedHours,
      gridLimitedHours: d.fcrGate.gridLimitedHours,
      limitingFactor: d.fcrGate.bindingFactor,
    },
    energyBalance: {
      ok: Math.abs(residual) <= tolerance,
      residualKWh: residual,
      detail:
        "PV (efter curtailment) + import = last + export + förluster (verkningsgrad + standby + självurladdning) + SOC-förändring",
    },
    annualSavingsKr: annualSavings,
    demandChargeSavingKr: demandSaving,
    arbitrageResultKr: d.arbitrageDischargeRevenueKr - d.arbitrageChargeCostKr,
    capexKr: capex,
    paybackYears: paybackYears(annualSavings, capex),
    netPresentValueKr: npv,
    flexRevenueKr: flexRev,
    annualSavingsWithFlexKr: annualWithFlex,
    paybackWithFlexYears: paybackYears(annualWithFlex, capex),
    netPresentValueWithFlexKr: npvWithFlex,
    peakIsModelled: true,
    notes,
  };
}
