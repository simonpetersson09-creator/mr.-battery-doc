/**
 * PURCHASE INTENT.
 *
 * A consumable purchase must unlock exactly the calculation the user paid for.
 * StoreKit can deliver the transaction much later — after a network drop, an app
 * restart or an interrupted (pending) transaction — and by then the in-memory
 * calculation id is gone. The intent is therefore written to disk BEFORE the
 * purchase starts and read again during recovery.
 *
 * Pure data. No StoreKit, no React.
 */
import type { ProductKey } from "./products";

export interface PurchaseIntent {
  key: ProductKey;
  /** Empty for a subscription; the paid-for calculation for a consumable. */
  calculationId: string;
  startedAtISO: string;
}

export const PURCHASE_INTENT_STORAGE_KEY = "mr-battery-doc:purchase-intent:v1";

/** Intents older than this are considered abandoned and are ignored. */
export const INTENT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function createIntent(
  key: ProductKey,
  calculationId: string,
  now: Date = new Date(),
): PurchaseIntent {
  return { key, calculationId, startedAtISO: now.toISOString() };
}

/** Corrupt or stale storage yields no intent — it must never unlock anything. */
export function parseIntent(raw: unknown, now: Date = new Date()): PurchaseIntent | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const key = o["key"];
  if (key !== "singleReport" && key !== "premiumYear") return null;
  const calculationId = typeof o["calculationId"] === "string" ? o["calculationId"] : "";
  const startedAtISO = typeof o["startedAtISO"] === "string" ? o["startedAtISO"] : "";
  const started = Date.parse(startedAtISO);
  if (Number.isNaN(started)) return null;
  if (now.getTime() - started > INTENT_MAX_AGE_MS) return null;
  return { key, calculationId, startedAtISO };
}

export function readIntent(now: Date = new Date()): PurchaseIntent | null {
  try {
    const raw = localStorage.getItem(PURCHASE_INTENT_STORAGE_KEY);
    return raw ? parseIntent(JSON.parse(raw), now) : null;
  } catch {
    return null;
  }
}

export function writeIntent(intent: PurchaseIntent): void {
  try {
    localStorage.setItem(PURCHASE_INTENT_STORAGE_KEY, JSON.stringify(intent));
  } catch {
    /* storage unavailable — the purchase still works in the same session */
  }
}

export function clearIntent(): void {
  try {
    localStorage.removeItem(PURCHASE_INTENT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
