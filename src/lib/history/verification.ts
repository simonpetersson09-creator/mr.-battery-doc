/**
 * PURCHASE-RIGHT VERIFICATION FOR HISTORY.
 *
 * Separation of concerns, identical to the sister app:
 *  - the STORE side (StoreKit / the receipt it verifies) owns the purchase right:
 *    calculation id, purchase type, status. It never stores the calculation.
 *  - the DEVICE owns the snapshot: the full result data, never uploaded.
 *
 * The history list is therefore the JOIN of the two. An entry whose local
 * snapshot is missing is listed but not openable — the purchase is still valid,
 * the result data simply does not exist on this device.
 */
import { hasResultAccess, type Entitlements } from "@/lib/access/entitlements";
import type { CalculationSnapshot } from "./snapshot";

export interface HistoryEntry {
  calculationId: string;
  createdISO: string;
  snapshot: CalculationSnapshot;
  /** Verified purchase right: active Premium or this calculation unlocked. */
  purchased: boolean;
  /** May be opened: purchase right verified AND the local snapshot is readable. */
  openable: boolean;
}

export function buildHistoryEntries(
  snapshots: CalculationSnapshot[],
  entitlements: Entitlements,
  now: Date = new Date(),
): HistoryEntry[] {
  return snapshots.map((snapshot) => {
    const purchased = hasResultAccess(entitlements, snapshot.calculationId, now);
    return {
      calculationId: snapshot.calculationId,
      createdISO: snapshot.createdISO,
      snapshot,
      purchased,
      openable: purchased,
    };
  });
}
