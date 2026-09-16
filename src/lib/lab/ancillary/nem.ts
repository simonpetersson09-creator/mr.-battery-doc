/**
 * NEM — NORMAL ENERGY MANAGEMENT POWER RESERVATION (Nordic FCR-D with LER).
 *
 * VERIFIED RULE MODELLED HERE
 * A Limited Energy Reservoir participating in Nordic FCR-D must, on top of the sold
 * FCR-D capacity, keep POWER available in the OPPOSITE direction so the reservoir can
 * be managed back towards its working point (Normal Energy Management). The reserved
 * NEM power is a share of the FCR-D capacity — 20 % in the Nordic FCR-D rules.
 *
 * FORMULA (the only place it is defined):
 *
 *   discharge side:  U + s * D  <=  Pdischarge
 *   charge side:     D + s * U  <=  Pcharge
 *
 *   U = paid FCR-D UP capacity   (needs DISCHARGE power)
 *   D = paid FCR-D DOWN capacity (needs CHARGE power)
 *   s = NEM share of the FCR-D capacity (0.20)
 *
 * WHY IT IS WRITTEN THIS WAY — NO DOUBLE COUNTING:
 *  - NEM for the UP product is charging power, so it loads the CHARGE side only; NEM
 *    for the DOWN product is discharging power and loads the DISCHARGE side only.
 *    A direction therefore never pays a NEM surcharge on its own capacity
 *    (U is NOT scaled by 1.2 on the discharge side).
 *  - Already reserved OPPOSITE FCR-D capacity does NOT satisfy the NEM requirement:
 *    it is committed to the frequency product and cannot be used for energy
 *    management. It is therefore added, not maxed, on the same physical side.
 *  - This is a PHYSICAL POWER constraint only. It is not an energy (kWh) requirement,
 *    not a SOC-window change, not a revenue deduction and not a cap on the
 *    reservation percentage.
 *
 * The solver only ever SCALES THE PAIR DOWN (factor <= 1), so a larger NEM share or a
 * smaller inverter can never increase the reservable FCR power.
 */
export interface NemInput {
  /** Candidate paid up capacity before the NEM constraint, kW. */
  upKw: number;
  /** Candidate paid down capacity before the NEM constraint, kW. */
  downKw: number;
  /** Physical discharge power available this hour, kW. */
  dischargeKw: number;
  /** Physical charge power available this hour, kW. */
  chargeKw: number;
  /** NEM share of the FCR-D capacity, fraction (0.2 = 20 %). */
  nemShare: number;
}

export interface NemResult {
  upKw: number;
  downKw: number;
  /** NEM power actually held on the charge side (for the up product), kW. */
  nemChargeKw: number;
  /** NEM power actually held on the discharge side (for the down product), kW. */
  nemDischargeKw: number;
  /** True when the NEM requirement reduced at least one direction this hour. */
  limiting: boolean;
}

export function applyNemPowerReservation(input: NemInput): NemResult {
  const s = Math.max(0, input.nemShare);
  const up0 = Math.max(0, input.upKw);
  const down0 = Math.max(0, input.downKw);
  const pDis = Math.max(0, input.dischargeKw);
  const pCh = Math.max(0, input.chargeKw);

  if (s <= 0 || (up0 <= 0 && down0 <= 0)) {
    return { upKw: up0, downKw: down0, nemChargeKw: 0, nemDischargeKw: 0, limiting: false };
  }

  const dischargeNeed = up0 + s * down0;
  const chargeNeed = down0 + s * up0;
  let f = 1;
  if (dischargeNeed > 1e-12) f = Math.min(f, pDis / dischargeNeed);
  if (chargeNeed > 1e-12) f = Math.min(f, pCh / chargeNeed);
  f = Math.max(0, Math.min(1, f));

  const up = up0 * f;
  const down = down0 * f;
  return {
    upKw: up,
    downKw: down,
    nemChargeKw: s * up,
    nemDischargeKw: s * down,
    limiting: f < 1 - 1e-12,
  };
}
