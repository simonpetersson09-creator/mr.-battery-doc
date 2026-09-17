/**
 * DETERMINISTIC ANCILLARY SOC (degenerate cyclic year).
 *
 * WHY THIS EXISTS
 * When the battery does NO ordinary energy work (no self-consumption, no peak shaving,
 * no arbitrage: 0 cycles, 0 throughput) the SOC never moves. The cyclic SOC fixed point
 * `soc_start = soc_end` is then satisfied by EVERY constant SOC inside the window, i.e.
 * the fixed point is degenerate and the iteration returns whatever level it happened to
 * stop at after its iteration budget. Different capacities then got different, arbitrary
 * absolute SOC margins, which produced false non-monotonicity in pure FCR operation.
 *
 * WHAT THIS DOES
 * For that degenerate case only, the start SOC is solved from the ANCILLARY PHYSICS the
 * dispatch already uses — the same active service window, the same endurance, the same
 * efficiencies, the same offered bid per direction. No price, no SEK, no customer share
 * and no invented weighting between the directions enter the objective.
 *
 * OBJECTIVE (technical, reused from the engine)
 *   coverage_dir(soc) = min(1, energyCapability_dir(soc) / offeredPower_dir)
 * with, exactly as in dispatch.ts:
 *   energyUp(soc)   = (soc - serviceFloor) * dischargeEff / upEnduranceHours
 *   energyDown(soc) = (serviceCeil - soc) / chargeEff     / downEnduranceHours
 * The chosen SOC MAXIMISES THE WORST ACTIVE DIRECTION, which is the engine's own
 * definition of a feasible bid (a direction that cannot back its offered power is
 * clipped). Up-coverage is non-decreasing in SOC and down-coverage is non-increasing,
 * so the maximiser is an interval and is found analytically — no iteration budget, no
 * grid resolution, no tie-breaking on money. When several SOC levels are equally good
 * (both directions fully backed) the MIDPOINT of that interval is used: it is the only
 * point that keeps the same technical margin towards both ends of the tie.
 */

import type { AncillaryPlan } from "./ancillary/types";
import type { BatteryWindow } from "./dispatch";

export interface AncillarySocSolution {
  /** Start SOC as a percentage of NOMINAL capacity — the engine's own unit. */
  socPct: number;
  socKWh: number;
  /** Feasible interval the solution was picked from, kWh. */
  windowFloorKWh: number;
  windowCeilKWh: number;
  /** Worst-direction coverage at the solution, 0..1. */
  coverage: number;
  /** True when several SOC levels are equally good and the midpoint was taken. */
  tie: boolean;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Solves the technically best start SOC for a battery whose SOC is not moved by any
 * ordinary energy dispatch. Returns null when the plan is inactive or the window is
 * empty — the caller then keeps the ordinary cyclic fixed point.
 */
export function solveAncillarySoc(
  win: BatteryWindow,
  plan: AncillaryPlan | null,
): AncillarySocSolution | null {
  if (!plan || !plan.active) return null;
  const nominal = win.nominalKWh;
  if (!(nominal > 0)) return null;

  // Active service window — identical construction to dispatch.ts.
  const serviceFloor = Math.max(win.socFloorKWh, (plan.serviceMinSocPct / 100) * nominal);
  const serviceCeil = Math.min(win.socCeilKWh, (plan.serviceMaxSocPct / 100) * nominal);
  if (!(serviceCeil > serviceFloor)) return null;

  const dischargeEff = Math.max(win.dischargeEff, 1e-9);
  const chargeEff = Math.max(win.chargeEff, 1e-9);

  const offeredUp = Math.max(0, plan.upPowerKw);
  const offeredDown =
    plan.reserveMode === "upward" ? 0 : Math.max(0, plan.downPowerKw);
  const upEndurance = offeredUp > 0 ? plan.upEnergyKWh / offeredUp : 0;
  const downEndurance = offeredDown > 0 ? plan.downEnergyKWh / offeredDown : 0;

  // Stored energy (battery side) required to fully back each offered direction.
  const upNeedKWh = offeredUp > 0 ? (offeredUp * upEndurance) / dischargeEff : 0;
  const downRoomKWh = offeredDown > 0 ? offeredDown * downEndurance * chargeEff : 0;

  const lo = serviceFloor;
  const hi = serviceCeil;

  const coverageUp = (soc: number) =>
    upNeedKWh > 0 ? Math.min(1, Math.max(0, soc - serviceFloor) / upNeedKWh) : 1;
  const coverageDown = (soc: number) =>
    downRoomKWh > 0 ? Math.min(1, Math.max(0, serviceCeil - soc) / downRoomKWh) : 1;
  const worst = (soc: number) => Math.min(coverageUp(soc), coverageDown(soc));

  // SOC levels where each direction first / last reaches full coverage.
  const upFull = serviceFloor + upNeedKWh; // up fully backed at or above this
  const downFull = serviceCeil - downRoomKWh; // down fully backed at or below this

  let soc: number;
  let tie = false;
  if (upNeedKWh <= 0 && downRoomKWh <= 0) {
    // Nothing is offered that needs energy: every level is equal, take the midpoint.
    soc = (lo + hi) / 2;
    tie = true;
  } else if (upFull <= downFull + 1e-12) {
    // Both directions can be fully backed at the same time -> interval of maximisers.
    const a = clamp(upFull, lo, hi);
    const b = clamp(downFull, lo, hi);
    soc = (a + b) / 2;
    tie = b > a + 1e-12;
  } else {
    /**
     * The two directions cannot both be fully backed. The worst-direction objective is
     * maximised where the two coverages are EQUAL (up rising, down falling), which is
     * the single analytic balance point:
     *   (soc - F) / upNeed = (C - soc) / downRoom
     */
    const denom = upNeedKWh + downRoomKWh;
    soc =
      denom > 0
        ? (serviceFloor * downRoomKWh + serviceCeil * upNeedKWh) / denom
        : (lo + hi) / 2;
    soc = clamp(soc, lo, hi);
  }

  return {
    socPct: (soc / nominal) * 100,
    socKWh: soc,
    windowFloorKWh: lo,
    windowCeilKWh: hi,
    coverage: worst(soc),
    tie,
  };
}
