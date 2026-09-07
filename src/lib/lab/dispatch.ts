import { HOURS_PER_YEAR, MONTH_DAYS } from "./defaults";
import { expandPriceSeries, quantile } from "./profiles";
import type { AncillaryPlan } from "./ancillary/types";
import type {
  BatteryParams,
  FlexConfig,
  GridParams,
  PeakShavingConfig,
  SpotPriceInput,
  StrategyFlags,
  TimeSeries,
} from "./types";

export interface GridLimits {
  /** Operational design limits actually used by the dispatch, kW. */
  maxImportKw: number;
  maxExportKw: number;
  fuseKw: number;
  /** Absolute physical connection limits (fuse or manual override), kW. */
  physicalImportKw: number;
  physicalExportKw: number;
  /** Design margins in % of the physical limit (100 = margin switched off). */
  importMarginPct: number;
  exportMarginPct: number;
}

/**
 * DESIGN ASSUMPTION, not physics: the operational limits are a configurable
 * safety margin below the physical connection limit. 100 % disables the margin.
 */
export const DEFAULT_IMPORT_MARGIN_PCT = 90;
export const DEFAULT_EXPORT_MARGIN_PCT = 95;

/**
 * Physical connection capacity.
 * Three-phase (Swedish 230/400 V): P = sqrt(3) * U_line * I, with U = 400 V line-to-line.
 * Single-phase: P = U * I with U = 230 V phase-to-neutral.
 */
export function computeFuseKw(mainFuseA: number, voltageV: number, phases: number): number {
  const a = Math.max(0, mainFuseA);
  const u = Math.max(0, voltageV);
  const n = Math.max(1, Math.round(phases));
  const factor = n >= 3 ? Math.sqrt(3) : n;
  return (factor * u * a) / 1000;
}

export function computeGridLimits(grid: GridParams): GridLimits {
  const fuseKw = computeFuseKw(grid.mainFuseA, grid.voltageV, grid.phases);
  const physicalImportKw = grid.maxImportKw > 0 ? grid.maxImportKw : fuseKw;
  const physicalExportKw = grid.maxExportKw > 0 ? grid.maxExportKw : fuseKw;
  const importMarginPct = clampMargin(grid.importMarginPct ?? DEFAULT_IMPORT_MARGIN_PCT);
  const exportMarginPct = clampMargin(grid.exportMarginPct ?? DEFAULT_EXPORT_MARGIN_PCT);
  return {
    fuseKw,
    physicalImportKw,
    physicalExportKw,
    importMarginPct,
    exportMarginPct,
    maxImportKw: physicalImportKw * (importMarginPct / 100),
    maxExportKw: physicalExportKw * (exportMarginPct / 100),
  };
}

function clampMargin(pct: number): number {
  if (!Number.isFinite(pct) || pct <= 0) return 100;
  return Math.min(100, pct);
}


export interface BatteryWindow {
  nominalKWh: number;
  usableKWh: number;
  socFloorKWh: number;
  socCeilKWh: number;
  /** Energy locked away from energy-shifting by backup + flex reservations. */
  reservedKWh: number;
  chargeKw: number;
  dischargeKw: number;
  chargeEff: number;
  dischargeEff: number;
  /** Power that cannot be used by energy strategies (reserved for flex). */
  reservedPowerKw: number;
  /** Energy the flex service must be able to move in either direction, kWh. */
  flexEnergyNeedKWh: number;
  flexServiceFloorKWh: number;
  flexServiceCeilKWh: number;
  flexFeasible: boolean;
  notes: string[];
}

/**
 * Resolves the physical operating window once, so no two strategies can use the
 * same kWh/kW twice. Backup and flex reservations shrink the window that the
 * energy strategies (self-consumption, peak shaving, arbitrage) may use.
 */
export function resolveWindow(
  battery: BatteryParams,
  strategies: StrategyFlags,
  flex: FlexConfig,
  capacityKWh: number,
  powerKw: number,
): BatteryWindow {
  const notes: string[] = [];
  const nominal = capacityKWh;
  const socMin = (battery.minSocPct / 100) * nominal;
  const socMax = (battery.maxSocPct / 100) * nominal;
  let floor = socMin;
  let ceil = socMax;
  let reserved = 0;

  if (strategies.backupReserve && battery.reserveSocPct > 0) {
    const backup = (battery.reserveSocPct / 100) * nominal;
    if (backup > floor) {
      reserved += backup - floor;
      floor = backup;
    }
  }

  // The old flexibility strategy uses this whole-year window shift. Ancillary services
  // (frequency market) instead use a DIRECTIONAL, period-limited reservation applied per
  // hour further down, so power/energy is still never reserved twice.
  const flexOn = strategies.flexibility && flex.enabled;
  let flexFeasible = false;
  let reservedPowerKw = 0;
  let flexEnergyNeedKWh = 0;
  let flexServiceFloorKWh = 0;
  let flexServiceCeilKWh = 0;
  if (flexOn) {
    const serviceFloor = (flex.serviceMinSocPct / 100) * nominal;
    const serviceCeil = (flex.serviceMaxSocPct / 100) * nominal;
    const enduranceKWh =
      flex.reservedPowerKw * flex.enduranceHours + (flex.socHeadroomPct / 100) * nominal;
    const needFloor = Math.max(serviceFloor, floor + enduranceKWh);
    const needCeil = Math.min(serviceCeil, ceil);
    reservedPowerKw = Math.min(flex.reservedPowerKw, powerKw);
    if (needFloor + 0.001 < needCeil && flex.reservedPowerKw <= powerKw) {
      reserved += needFloor - floor;
      floor = needFloor;
      ceil = needCeil;
      flexFeasible = true;
      flexEnergyNeedKWh = flex.reservedPowerKw * flex.enduranceHours;
      flexServiceFloorKWh = serviceFloor;
      flexServiceCeilKWh = serviceCeil;
    } else {
      notes.push(
        "Flexibilitetsreservationen är inte fysiskt möjlig med detta batteri (för lite energi eller effekt) — tjänsten räknas som otillgänglig.",
      );
      reservedPowerKw = 0;
    }
  }

  const usable =
    battery.usableKWh > 0
      ? Math.min(battery.usableKWh, Math.max(0, ceil - floor))
      : Math.max(0, ceil - floor);
  if (battery.usableKWh > 0 && battery.usableKWh > socMax - socMin) {
    notes.push("Angiven användbar kapacitet är större än SOC-fönstret; SOC-fönstret begränsar.");
  }

  const eff = Math.sqrt(Math.max(0.01, Math.min(1, battery.roundTripEfficiency)));
  return {
    nominalKWh: nominal,
    usableKWh: usable,
    socFloorKWh: floor,
    socCeilKWh: floor + usable,
    reservedKWh: reserved,
    chargeKw: Math.max(0, powerKw - reservedPowerKw),
    dischargeKw: Math.max(0, powerKw - reservedPowerKw),
    chargeEff: eff,
    dischargeEff: eff,
    reservedPowerKw,
    flexEnergyNeedKWh,
    flexServiceFloorKWh,
    flexServiceCeilKWh,
    flexFeasible,
    notes,
  };
}

export interface DispatchTallies {
  chargedKWh: number;
  dischargedKWh: number;
  chargedFromPvKWh: number;
  chargedFromGridKWh: number;
  dischargedToLoadKWh: number;
  dischargedToGridKWh: number;
  lossesKWh: number;
  standbyKWh: number;
  selfDischargeKWh: number;
  directPvToLoadKWh: number;
  curtailedKWh: number;
  curtailmentRecoveredKWh: number;
  /**
   * Split of chargedFromPvKWh by what the energy would have done WITHOUT the battery:
   *  - wouldExport: PV surplus the connection could legally have exported
   *  - wouldCurtail: PV surplus above the export limit, i.e. energy that would have been spilled
   * The two always sum to chargedFromPvKWh, so no kWh is counted twice.
   */
  chargedFromPvWouldExportKWh: number;
  chargedFromPvWouldCurtailKWh: number;
  unservedKWh: number;
  /** Hours where the battery kW limit bound charge or discharge. */
  powerBoundHours: number;
  /** kWh not moved because of the battery kW limit (energy and SOC allowed it). */
  powerMissedKWh: number;
  /** Hours where the OPERATIONAL limit bound the real net grid flow. */
  gridImportBoundHours: number;
  gridExportBoundHours: number;
  gridBlockedKWh: number;
  /** kWh of load the operational import limit could not cover. */
  gridImportLimitedKWh: number;
  /** Share of the blocked/limited kWh that only the design margin caused. */
  gridBlockedByMarginKWh: number;
  gridImportLimitedByMarginKWh: number;
  /** Hours where the flow would have exceeded the ABSOLUTE physical limit. */
  physicalImportWouldBindHours: number;
  physicalExportWouldBindHours: number;
  /** Highest actually realised grid flows, kW. */
  maxImportKw: number;
  maxExportKw: number;
  socStart: number;
  socEnd: number;
  equivalentFullCycles: number;
  cycleLimitHit: boolean;
  /** Hours the ancillary reservation was scheduled. */
  ancillaryReservedHours: number;
  /** Of those, the hours the battery could actually hold the readiness. */
  ancillaryReadyHours: number;
  /** Grid energy charged only to keep the ancillary readiness, kWh. */
  ancillaryReadinessChargeKWh: number;
}

export interface DispatchOutput {
  importSeries: number[];
  exportSeries: number[];
  baseImportSeries: number[];
  baseExportSeries: number[];
  socSeries: number[];
  tallies: DispatchTallies;
  window: BatteryWindow;
  monthlyPeakThresholdKw: number[];
  arbitrageChargeCostKr: number;
  arbitrageDischargeRevenueKr: number;
  flexAvailableHours: number;
  /** Share of the scheduled ancillary hours where the readiness could be held, %. */
  ancillaryAvailabilityPct: number;
  /**
   * Up-regulation power the battery ACTUALLY held reserved, per hour, kW (8 760 values).
   * Pure reporting: it mirrors the reservation the dispatch already withheld from the
   * other strategies. 0 in hours where the reservation was not scheduled or could not be
   * held. This is the only series the FCR economics may be paid on.
   */
  ancillaryReservedPowerKwByHour: number[];
  notes: string[];
}


function monthIndexRanges() {
  const out: { start: number; end: number }[] = [];
  let cursor = 0;
  for (const d of MONTH_DAYS) {
    out.push({ start: cursor, end: cursor + d * 24 });
    cursor += d * 24;
  }
  return out;
}

/** Baseline (no battery) grid exchange. */
export function baseline(series: TimeSeries, limits: GridLimits) {
  const imp: number[] = new Array(HOURS_PER_YEAR).fill(0);
  const exp: number[] = new Array(HOURS_PER_YEAR).fill(0);
  let curtailed = 0;
  let unserved = 0;
  for (let h = 0; h < HOURS_PER_YEAR; h++) {
    const load = series.load[h] ?? 0;
    const pv = series.pv[h] ?? 0;
    const net = load - pv;
    if (net >= 0) {
      /**
       * The baseline is capped by the SAME grid limit as the battery case. Without the
       * cap the reference peak could exceed the connection itself (e.g. a 308 kW peak
       * behind a 40 kW fuse), which made peak reduction look enormous and compared two
       * different worlds. The demand the connection cannot deliver is booked as
       * unserved instead of as import.
       */
      const i = Math.min(net, limits.maxImportKw);
      imp[h] = i;
      unserved += net - i;
    } else {
      const surplus = -net;
      const e = Math.min(surplus, limits.maxExportKw);
      exp[h] = e;
      curtailed += surplus - e;
    }
  }
  return { imp, exp, curtailed, unserved };
}

/**
 * Headroom for charging from the grid: the connection limit minus the household's
 * own net import in the same hour. Keeps the real net flow inside the fuse instead
 * of the simplified rule batteryPower <= connectionPower.
 */
export function gridChargeHeadroomKw(netImportKw: number, maxImportKw: number): number {
  return Math.max(0, maxImportKw - netImportKw);
}

export interface DispatchArgs {
  series: TimeSeries;
  battery: BatteryParams;
  grid: GridParams;
  strategies: StrategyFlags;
  peak: PeakShavingConfig;
  spot: SpotPriceInput;
  flex: FlexConfig;
  /** Directional, period-limited ancillary reservation. Null = no reservation. */
  ancillary?: AncillaryPlan | null;
  capacityKWh: number;
  powerKw: number;
}

/**
 * Rule-based hourly dispatch. Priority order inside each hour:
 *   1. direct PV self-consumption (no battery involved)
 *   2. discharge: peak shaving -> import reduction -> arbitrage export
 *   3. charge: PV surplus (curtailment first) -> peak-shaving top-up -> cheap-hour grid charging
 * Charging and discharging can never happen in the same hour.
 */
export function dispatch(args: DispatchArgs): DispatchOutput {
  const { series, battery, strategies, peak, spot, flex } = args;
  const plan = strategies.ancillaryServices ? (args.ancillary ?? null) : null;
  const limits = computeGridLimits(args.grid);
  const win = resolveWindow(battery, strategies, flex, args.capacityKWh, args.powerKw);
  const notes = [...win.notes];

  const base = baseline(series, limits);

  // Modelled monthly peak-shaving thresholds from the baseline import profile.
  const ranges = monthIndexRanges();
  const thresholds = ranges.map(({ start, end }, mi) => {
    let peakKw = 0;
    for (let h = start; h < end; h++) {
      const hod = h % 24;
      if (!peak.activeHours.includes(hod)) continue;
      peakKw = Math.max(peakKw, base.imp[h] ?? 0);
    }
    if (!peak.activeMonths.includes(mi + 1)) return Infinity;
    return peakKw * (1 - peak.targetReductionPct / 100);
  });

  /**
   * Deterministic foresight for peak-shaving grid charging: for every hour, how much
   * energy the battery must be able to deliver during the peak hours that fall inside
   * the next PEAK_LOOKAHEAD_HOURS. Only the modelled excess above the monthly
   * threshold counts, so the battery is never charged beyond what peak shaving needs.
   */
  const PEAK_LOOKAHEAD_HOURS = 24;
  const peakNeedKWh: number[] = new Array(HOURS_PER_YEAR).fill(0);
  if (strategies.peakShaving) {
    const excess: number[] = new Array(HOURS_PER_YEAR).fill(0);
    for (let h = 0; h < HOURS_PER_YEAR; h++) {
      if (!peak.activeHours.includes(h % 24)) continue;
      const thrH = thresholds[(series.monthOfHour[h] ?? 1) - 1] ?? Infinity;
      if (!Number.isFinite(thrH)) continue;
      excess[h] = Math.max(0, (base.imp[h] ?? 0) - thrH);
    }
    let running = 0;
    for (let h = 0; h < PEAK_LOOKAHEAD_HOURS && h < HOURS_PER_YEAR; h++) running += excess[h] ?? 0;
    for (let h = 0; h < HOURS_PER_YEAR; h++) {
      peakNeedKWh[h] = running;
      running -= excess[h] ?? 0;
      const nextIn = h + PEAK_LOOKAHEAD_HOURS;
      if (nextIn < HOURS_PER_YEAR) running += excess[nextIn] ?? 0;
    }
  }


  // Spot price context per day (cheap/expensive thresholds).
  const prices = spot.enabled ? expandPriceSeries(spot.series) : null;
  const dailyCheap: number[] = [];
  const dailyExpensive: number[] = [];
  if (prices) {
    for (let d = 0; d < 365; d++) {
      const day = prices.slice(d * 24, d * 24 + 24);
      dailyCheap.push(quantile(day, spot.cheapQuantile));
      dailyExpensive.push(quantile(day, spot.expensiveQuantile));
    }
  }

  const imp: number[] = new Array(HOURS_PER_YEAR).fill(0);
  const exp: number[] = new Array(HOURS_PER_YEAR).fill(0);
  const socSeries: number[] = new Array(HOURS_PER_YEAR).fill(0);
  /** Reporting only: the up-power actually held reserved each hour, kW. */
  const ancillaryReservedPowerKwByHour: number[] = new Array(HOURS_PER_YEAR).fill(0);

  let soc = Math.min(
    win.socCeilKWh,
    Math.max(win.socFloorKWh, (battery.initialSocPct / 100) * win.nominalKWh),
  );
  const socStart = soc;

  const t: DispatchTallies = {
    chargedKWh: 0,
    dischargedKWh: 0,
    chargedFromPvKWh: 0,
    chargedFromGridKWh: 0,
    dischargedToLoadKWh: 0,
    dischargedToGridKWh: 0,
    lossesKWh: 0,
    standbyKWh: 0,
    selfDischargeKWh: 0,
    directPvToLoadKWh: 0,
    curtailedKWh: 0,
    curtailmentRecoveredKWh: 0,
    chargedFromPvWouldExportKWh: 0,
    chargedFromPvWouldCurtailKWh: 0,
    unservedKWh: 0,
    powerBoundHours: 0,
    powerMissedKWh: 0,
    gridImportBoundHours: 0,
    gridExportBoundHours: 0,
    gridBlockedKWh: 0,
    gridImportLimitedKWh: 0,
    gridBlockedByMarginKWh: 0,
    gridImportLimitedByMarginKWh: 0,
    physicalImportWouldBindHours: 0,
    physicalExportWouldBindHours: 0,
    maxImportKw: 0,
    maxExportKw: 0,
    socStart,
    socEnd: soc,
    equivalentFullCycles: 0,
    cycleLimitHit: false,
    ancillaryReservedHours: 0,
    ancillaryReadyHours: 0,
    ancillaryReadinessChargeKWh: 0,
  };

  let arbCost = 0;
  let arbRevenue = 0;
  let throughput = 0; // discharged kWh out of the battery, for cycle counting
  let flexAvailableHours = 0;

  /**
   * Cycle cap (equivalent full cycles per year). 0 = unlimited.
   * The budget is PRO-RATA over the year: at hour h the battery may have used at
   * most `cap * ((h+1)/8760 + oneMonthBuffer)` cycles. This prevents the battery
   * from spending the whole annual budget in January and then standing still.
   */
  const cycleCap = battery.maxCyclesPerYear > 0 ? battery.maxCyclesPerYear : Infinity;
  const CYCLE_BUDGET_BUFFER = 1 / 12;
  const cycleBudgetAt = (h: number) =>
    cycleCap === Infinity
      ? Infinity
      : cycleCap * Math.min(1, (h + 1) / HOURS_PER_YEAR + CYCLE_BUDGET_BUFFER);
  const canCycle = (h: number) =>
    win.usableKWh > 0 && throughput / Math.max(win.usableKWh, 1e-9) < cycleBudgetAt(h);

  // Standby draw and self-discharge (only when a battery exists).
  const standbyPerHour =
    win.nominalKWh > 0 ? Math.max(0, battery.standbyW) / 1000 : 0;
  const selfDischargeRate =
    win.nominalKWh > 0
      ? Math.max(0, battery.selfDischargePctPerMonth) / 100 / (HOURS_PER_YEAR / 12)
      : 0;

  /**
   * Ancillary (frequency market) reservation, DIRECTIONAL and PERIOD LIMITED.
   *  - up-regulation needs stored energy: the hourly SOC floor is raised
   *  - down-regulation needs free room: the hourly SOC ceiling is lowered
   *  - charge and discharge efficiency are handled separately (AC <-> stored)
   * Outside the scheduled hours/months nothing is reserved, so the other strategies
   * keep the full battery there.
   */
  const planActive = plan !== null && plan.active && win.nominalKWh > 0;
  const planHourSet = new Set(plan?.hoursOfDay ?? []);
  const planMonthSet = new Set(plan?.months ?? []);
  const planHeadroomKWh = planActive ? ((plan!.socHeadroomPct / 100) * win.nominalKWh) : 0;
  const planServiceFloor = planActive ? (plan!.serviceMinSocPct / 100) * win.nominalKWh : 0;
  const planServiceCeil = planActive ? (plan!.serviceMaxSocPct / 100) * win.nominalKWh : 0;
  // Stored (battery-side) energy needed to deliver the up-regulation AC energy.
  const planUpStoredKWh = planActive
    ? plan!.upEnergyKWh / Math.max(win.dischargeEff, 1e-9) + planHeadroomKWh
    : 0;
  // Free SOC room needed to absorb the down-regulation AC energy.
  const planDownRoomKWh = planActive
    ? plan!.downEnergyKWh * win.chargeEff + planHeadroomKWh
    : 0;
  const planReservedHour = (hod: number, month: number) =>
    planActive && planHourSet.has(hod) && planMonthSet.has(month);

  for (let h = 0; h < HOURS_PER_YEAR; h++) {
    // ---------- passive losses first ----------
    // Self-discharge may never push SOC below the allowed floor (min SOC / reserve).
    if (selfDischargeRate > 0 && soc > win.socFloorKWh) {
      const sd = Math.min(soc - win.socFloorKWh, soc * selfDischargeRate);
      soc -= sd;
      t.selfDischargeKWh += sd;
      t.lossesKWh += sd;
    }

    const seriesLoad = series.load[h] ?? 0;
    // Standby is an extra AC load; it is booked as a loss so the energy balance holds.
    const load = seriesLoad + standbyPerHour;
    if (standbyPerHour > 0) {
      t.standbyKWh += standbyPerHour;
      t.lossesKWh += standbyPerHour;
    }
    const pv = series.pv[h] ?? 0;
    const month = series.monthOfHour[h] ?? 1;
    const day = Math.floor(h / 24);
    const price = prices ? (prices[h] ?? 0) : 0;
    const cheap = prices ? price <= (dailyCheap[day] ?? 0) : false;
    const expensive = prices ? price >= (dailyExpensive[day] ?? 0) : false;
    const spread = prices ? (dailyExpensive[day] ?? 0) - (dailyCheap[day] ?? 0) : 0;
    const spreadOk = spread >= spot.minSpread;

    // ---------- ancillary reservation for THIS hour ----------
    const hod = h % 24;
    const resNow = planReservedHour(hod, month);
    const resNext = planReservedHour((h + 1) % 24, series.monthOfHour[h + 1] ?? month);
    const upFloorKWh = plan && plan.upPowerKw > 0 ? planUpStoredKWh : 0;
    const downRoomKWh = plan && plan.downPowerKw > 0 ? planDownRoomKWh : 0;
    const hourFloor = resNow
      ? Math.min(
          win.socCeilKWh,
          Math.max(win.socFloorKWh, planServiceFloor, win.socFloorKWh + upFloorKWh),
        )
      : win.socFloorKWh;
    const hourCeil = resNow
      ? Math.max(
          hourFloor,
          Math.min(win.socCeilKWh, planServiceCeil, win.socCeilKWh - downRoomKWh),
        )
      : win.socCeilKWh;
    const dischargeLimitKw = resNow
      ? Math.max(0, win.dischargeKw - (plan?.upPowerKw ?? 0))
      : win.dischargeKw;
    const chargeLimitKw = resNow
      ? Math.max(0, win.chargeKw - (plan?.downPowerKw ?? 0))
      : win.chargeKw;
    if (resNow) {
      t.ancillaryReservedHours++;
      const powerOk =
        (plan?.upPowerKw ?? 0) <= win.dischargeKw + 1e-9 &&
        (plan?.downPowerKw ?? 0) <= win.chargeKw + 1e-9;
      const energyOk = soc >= hourFloor - 1e-9 && soc <= hourCeil + 1e-9 && hourCeil > hourFloor - 1e-9;
      if (powerOk && energyOk) {
        t.ancillaryReadyHours++;
        ancillaryReservedPowerKwByHour[h] = plan?.upPowerKw ?? 0;
      }
    }

    const direct = Math.min(load, pv);
    let surplus = pv - direct;
    let deficit = load - direct;
    // PV that served load directly (standby share excluded: it is a loss, not use).
    t.directPvToLoadKWh += Math.min(direct, seriesLoad);

    /**
     * Flex availability: the service is only available in an hour when the battery
     * can actually deliver AND absorb the reserved power for the full endurance,
     * inside the service SOC window.
     */
    if (win.flexFeasible && win.flexEnergyNeedKWh > 0) {
      const canDown = soc - win.flexServiceFloorKWh >= win.flexEnergyNeedKWh - 1e-9;
      const canUp = win.flexServiceCeilKWh - soc >= win.flexEnergyNeedKWh - 1e-9;
      if (canDown && canUp) flexAvailableHours++;
    }

    // ---------- discharge decision ----------
    let peakWantToLoad = 0;
    let otherWantToLoad = 0;
    let wantDischargeToGrid = 0;
    const thr = thresholds[month - 1] ?? Infinity;

    if (strategies.peakShaving && peak.activeHours.includes(h % 24) && deficit > thr) {
      peakWantToLoad = deficit - thr;
    }
    if (strategies.reduceImport) {
      otherWantToLoad = Math.max(otherWantToLoad, deficit);
    }
    if (strategies.arbitrage && prices && expensive && spreadOk) {
      otherWantToLoad = Math.max(otherWantToLoad, deficit);
      wantDischargeToGrid = Math.max(0, dischargeLimitKw - Math.max(peakWantToLoad, otherWantToLoad));
    }
    const wantDischargeToLoad = Math.max(peakWantToLoad, otherWantToLoad);

    /**
     * Energy the coming peak hours need is RESERVED: import reduction and arbitrage may
     * not drain it, otherwise the battery is empty exactly when the peak arrives (and it
     * would be recharged from the grid over and over). Peak shaving itself may of course
     * use the reserve.
     */
    const peakReserveKWh =
      strategies.peakShaving && win.dischargeEff > 0
        ? Math.min(
            Math.max(0, win.socCeilKWh - win.socFloorKWh),
            (peakNeedKWh[h] ?? 0) / win.dischargeEff,
          )
        : 0;

    const wantDischarge = wantDischargeToLoad + wantDischargeToGrid;
    let delivered = 0;
    let toGrid = 0;
    if (wantDischarge > 0 && canCycle(h)) {
      const powerLimit = dischargeLimitKw;
      const energyAvailable = Math.max(0, (soc - hourFloor) * win.dischargeEff);
      const energyUnreserved = Math.max(
        0,
        (soc - hourFloor - peakReserveKWh) * win.dischargeEff,
      );
      const possible = Math.min(wantDischarge, powerLimit, energyAvailable);
      // Power binding: energy and SOC would have allowed more, only kW stopped it.
      const wantedWithinEnergy = Math.min(wantDischarge, energyAvailable);
      if (wantedWithinEnergy - powerLimit > 1e-9) {
        t.powerBoundHours++;
        t.powerMissedKWh += wantedWithinEnergy - powerLimit;
      }
      // Peak shaving first (may use the reserve), then the rest inside the unreserved part.
      const toLoadPeak = Math.min(peakWantToLoad, possible);
      const toLoadOther = Math.min(
        Math.max(0, wantDischargeToLoad - toLoadPeak),
        possible - toLoadPeak,
        Math.max(0, energyUnreserved - toLoadPeak),
      );
      const toLoad = toLoadPeak + toLoadOther;
      toGrid = Math.min(
        possible - toLoad,
        Math.max(0, energyUnreserved - toLoad),
        Math.max(0, limits.maxExportKw - surplus),
        wantDischargeToGrid,
      );
      delivered = toLoad + toGrid;
      if (delivered > 0) {
        const fromBattery = delivered / win.dischargeEff;
        soc -= fromBattery;
        t.dischargedKWh += delivered;
        t.dischargedToLoadKWh += toLoad;
        t.dischargedToGridKWh += toGrid;
        t.lossesKWh += fromBattery - delivered;
        throughput += delivered;
        deficit -= toLoad;
        if (toGrid > 0 && prices) arbRevenue += toGrid * price * spot.exportShare;
      }
    }


    // ---------- charge decision ----------
    // Only when nothing was actually discharged this hour (a planned discharge that
    // ended up as 0 kWh must not block charging).
    if (delivered <= 0) {
      let charged = 0;
      if (canCycle(h)) {
        let powerLeft = chargeLimitKw;
        const roomKWh = Math.max(0, hourCeil - soc);
        let acceptable = roomKWh / win.chargeEff; // AC energy the battery can still take

        if ((strategies.selfConsumption || strategies.curtailmentRecovery) && surplus > 0) {
          const exportable = limits.maxExportKw;
          const wouldCurtail = Math.max(0, surplus - exportable);
          const fromPv = Math.min(surplus, powerLeft, acceptable);
          const wantedWithinEnergy = Math.min(surplus, acceptable);
          if (wantedWithinEnergy - powerLeft > 1e-9) {
            t.powerBoundHours++;
            t.powerMissedKWh += wantedWithinEnergy - powerLeft;
          }
          if (fromPv > 0) {
            /**
             * Charging always eats the TOP slice of the surplus first, because that is the
             * slice the export limit would have spilled. The rest of the charged energy
             * would have been exported legally. The two slices are disjoint by
             * construction, which is what prevents double counting downstream.
             */
            const recovered = Math.min(fromPv, wouldCurtail);
            t.chargedFromPvKWh += fromPv;
            t.curtailmentRecoveredKWh += recovered;
            t.chargedFromPvWouldCurtailKWh += recovered;
            t.chargedFromPvWouldExportKWh += fromPv - recovered;
            surplus -= fromPv;
            powerLeft -= fromPv;
            acceptable -= fromPv;
            charged += fromPv;
          }
        }

        /**
         * Peak-shaving grid charging. Purely physical: it only tops the battery up to
         * the SOC the coming peak hours require, only while the household's own net
         * import is BELOW the monthly peak threshold, and only inside the free import
         * headroom. It can therefore never create a new peak above the threshold the
         * strategy defends, and it does not use prices in any way.
         */
        if (strategies.peakShaving && acceptable > 0 && powerLeft > 0) {
          const need = peakNeedKWh[h] ?? 0;
          if (need > 0) {
            const targetSoc = Math.min(
              hourCeil,
              hourFloor + need / Math.max(win.dischargeEff, 1e-9),
            );
            const shortfall = targetSoc - soc;
            if (shortfall > 1e-9) {
              const wanted = Math.min(powerLeft, acceptable, shortfall / win.chargeEff);
              const headroomKw = Math.min(
                gridChargeHeadroomKw(deficit, limits.maxImportKw),
                Number.isFinite(thr) ? Math.max(0, thr - deficit) : Infinity,
              );
              if (wanted - headroomKw > 1e-9) {
                t.gridImportBoundHours++;
                t.gridImportLimitedKWh += wanted - headroomKw;
                const physHeadroom = gridChargeHeadroomKw(deficit, limits.physicalImportKw);
                t.gridImportLimitedByMarginKWh +=
                  Math.min(wanted, physHeadroom) - Math.min(wanted, headroomKw);
                if (wanted - physHeadroom > 1e-9) t.physicalImportWouldBindHours++;
              }
              const fromGrid = Math.min(wanted, headroomKw);
              if (fromGrid > 0) {
                t.chargedFromGridKWh += fromGrid;
                deficit += fromGrid;
                powerLeft -= fromGrid;
                acceptable -= fromGrid;
                charged += fromGrid;
              }
            }
          }
        }



        /**
         * READINESS CHARGING for the ancillary reservation. Only what is needed to reach
         * the hourly SOC floor the up-regulation requires, only inside the battery power
         * and the free import headroom. If the headroom is not enough the readiness is
         * simply not held that hour, which lowers the availability instead of pretending
         * the service was delivered.
         */
        if ((resNow || resNext) && upFloorKWh > 0) {
          const targetSoc = Math.min(hourCeil, resNow ? hourFloor : hourFloor);
          const shortfall = targetSoc - soc;
          if (shortfall > 1e-9) {
            const readinessPowerLeft = Math.max(0, win.chargeKw - charged);
            const wanted = Math.min(readinessPowerLeft, shortfall / win.chargeEff);
            const headroomKw = gridChargeHeadroomKw(deficit, limits.maxImportKw);
            if (wanted - headroomKw > 1e-9) {
              t.gridImportBoundHours++;
              t.gridImportLimitedKWh += wanted - headroomKw;
              const physHeadroom = gridChargeHeadroomKw(deficit, limits.physicalImportKw);
              t.gridImportLimitedByMarginKWh +=
                Math.min(wanted, physHeadroom) - Math.min(wanted, headroomKw);
              if (wanted - physHeadroom > 1e-9) t.physicalImportWouldBindHours++;
            }
            const fromGrid = Math.min(wanted, headroomKw);
            if (fromGrid > 0) {
              t.chargedFromGridKWh += fromGrid;
              t.ancillaryReadinessChargeKWh += fromGrid;
              deficit += fromGrid;
              powerLeft = Math.max(0, powerLeft - fromGrid);
              acceptable = Math.max(0, acceptable - fromGrid);
              charged += fromGrid;
            }
          }
        }

        /**
         * Any charging that is NOT covered by PV surplus is grid charging and must
         * respect the import limit on the REAL net flow (load + charge - pv - discharge).
         * All future grid-charging strategies must go through this headroom check.
         */
        if (
          strategies.arbitrage &&
          prices &&
          cheap &&
          spreadOk &&
          acceptable > 0 &&
          powerLeft > 0
        ) {
          const headroomKw = gridChargeHeadroomKw(deficit, limits.maxImportKw);
          const wanted = Math.min(powerLeft, acceptable);
          if (wanted - headroomKw > 1e-9) {
            // The operational import limit throttled grid charging (not a fault).
            t.gridImportBoundHours++;
            t.gridImportLimitedKWh += wanted - headroomKw;
            const physHeadroom = gridChargeHeadroomKw(deficit, limits.physicalImportKw);
            t.gridImportLimitedByMarginKWh +=
              Math.min(wanted, physHeadroom) - Math.min(wanted, headroomKw);
            if (wanted - physHeadroom > 1e-9) t.physicalImportWouldBindHours++;
          }
          const fromGrid = Math.min(wanted, headroomKw);
          if (fromGrid > 0) {
            t.chargedFromGridKWh += fromGrid;
            arbCost += fromGrid * (price + spot.importMarkup);
            deficit += fromGrid;
            charged += fromGrid;
          }
        }

        if (charged > 0) {
          const stored = charged * win.chargeEff;
          soc += stored;
          t.chargedKWh += charged;
          t.lossesKWh += charged - stored;
        }
      } else if (win.usableKWh > 0) {
        t.cycleLimitHit = true;
      }
    }

    // ---------- grid exchange ----------
    // The operational limit is honoured first; the physical limit can never be
    // exceeded because operational <= physical by construction.
    const exportWanted = surplus + toGrid;
    const exportNow = Math.min(exportWanted, limits.maxExportKw);
    const blocked = Math.max(0, exportWanted - exportNow);
    t.curtailedKWh += blocked;
    if (blocked > 1e-9) {
      t.gridExportBoundHours++;
      t.gridBlockedKWh += blocked;
      const physBlocked = Math.max(0, exportWanted - limits.physicalExportKw);
      t.gridBlockedByMarginKWh += blocked - physBlocked;
      if (physBlocked > 1e-9) t.physicalExportWouldBindHours++;
    }
    exp[h] = exportNow;
    const importNow = Math.min(deficit, limits.maxImportKw);
    const unserved = Math.max(0, deficit - importNow);
    t.unservedKWh += unserved;
    if (unserved > 1e-9) {
      t.gridImportBoundHours++;
      t.gridImportLimitedKWh += unserved;
      const physUnserved = Math.max(0, deficit - limits.physicalImportKw);
      t.gridImportLimitedByMarginKWh += unserved - physUnserved;
      if (physUnserved > 1e-9) t.physicalImportWouldBindHours++;
    }
    imp[h] = importNow;
    if (importNow > t.maxImportKw) t.maxImportKw = importNow;
    if (exportNow > t.maxExportKw) t.maxExportKw = exportNow;
    socSeries[h] = soc;
  }


  t.socEnd = soc;
  t.equivalentFullCycles = win.usableKWh > 0 ? throughput / win.usableKWh : 0;

  return {
    importSeries: imp,
    exportSeries: exp,
    baseImportSeries: base.imp,
    baseExportSeries: base.exp,
    socSeries,
    tallies: t,
    window: win,
    monthlyPeakThresholdKw: thresholds,
    arbitrageChargeCostKr: arbCost,
    arbitrageDischargeRevenueKr: arbRevenue,
    flexAvailableHours,
    ancillaryReservedPowerKwByHour,
    ancillaryAvailabilityPct:
      t.ancillaryReservedHours > 0 ? (t.ancillaryReadyHours / t.ancillaryReservedHours) * 100 : 0,
    notes,
  };
}
