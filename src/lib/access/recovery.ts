/**
 * PURCHASE RECOVERY.
 *
 * StoreKit keeps a transaction unfinished until the app acknowledges it. That is
 * what protects a user who paid and then lost the app: on the next start the
 * transaction is still there. This module turns those unfinished transactions
 * into entitlements and reports which ones may be finished.
 *
 * Rules:
 *  - Only an explicitly verified transaction grants anything.
 *  - A subscription transaction activates Premium.
 *  - A consumable transaction unlocks the calculation recorded in the purchase
 *    intent. Without a matching intent we do NOT guess a calculation and we do
 *    NOT finish the transaction, so it can be recovered on a later start.
 *
 * Pure functions — no StoreKit, no storage, no React.
 */
import { withPremium, withUnlockedCalculation, type Entitlements } from "./entitlements";
import { productKeyForId } from "./products";
import type { PurchaseIntent } from "./purchaseIntent";

export interface UnfinishedTransaction {
  transactionId: string;
  productId: string;
  /** Explicit StoreKit verification result. Anything but `true` grants nothing. */
  verified?: boolean;
  expiresISO?: string | null;
}

export interface RecoveryOutcome {
  entitlements: Entitlements;
  /** Transactions safe to finish (granted, or permanently not grantable). */
  finish: string[];
  /** Transactions to keep for a later attempt (e.g. consumable without intent). */
  keep: string[];
  /** True when the stored intent was consumed and may be cleared. */
  intentConsumed: boolean;
}

export function recoverTransactions(
  current: Entitlements,
  transactions: UnfinishedTransaction[],
  intent: PurchaseIntent | null,
): RecoveryOutcome {
  let entitlements = current;
  const finish: string[] = [];
  const keep: string[] = [];
  let intentConsumed = false;

  for (const tx of transactions) {
    const key = productKeyForId(tx.productId);
    if (!key) {
      // Not one of our products — nothing to grant, nothing to keep waiting for.
      finish.push(tx.transactionId);
      continue;
    }
    if (tx.verified !== true) {
      // Unverified: never unlock. Keep it so a later verified delivery can win.
      keep.push(tx.transactionId);
      continue;
    }
    if (key === "premiumYear") {
      entitlements = withPremium(entitlements, tx.expiresISO ?? null);
      finish.push(tx.transactionId);
      continue;
    }
    const calculationId = intent && intent.key === "singleReport" ? intent.calculationId : "";
    if (!calculationId) {
      keep.push(tx.transactionId);
      continue;
    }
    entitlements = withUnlockedCalculation(entitlements, calculationId);
    intentConsumed = true;
    finish.push(tx.transactionId);
  }

  return { entitlements, finish, keep, intentConsumed };
}
