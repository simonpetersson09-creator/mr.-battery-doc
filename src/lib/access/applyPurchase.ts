/**
 * Turns a purchase/restore outcome into new entitlements.
 *
 * Only an explicitly purchased result unlocks anything: cancelled, pending,
 * failed and unsupported outcomes leave the entitlements untouched.
 */
import {
  withPremium,
  withUnlockedCalculation,
  type Entitlements,
} from "./entitlements";
import type { PurchaseResult, RestoreResult } from "./purchaseGateway";

export function applyPurchase(
  current: Entitlements,
  result: PurchaseResult,
  calculationId: string,
): Entitlements {
  if (result.status !== "purchased") return current;
  if (result.key === "premiumYear")
    return withPremium(current, result.premiumExpiresISO ?? null);
  // Consumable: bound to THIS calculation, never to future ones.
  return withUnlockedCalculation(current, calculationId);
}

export function applyRestore(current: Entitlements, result: RestoreResult): Entitlements {
  if (result.status !== "restored") return current;
  return withPremium(current, result.premiumExpiresISO);
}
