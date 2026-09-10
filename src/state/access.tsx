/**
 * Access state: what the user has paid for.
 *
 * Premium is stored locally as a CACHE only — StoreKit is the source of truth and
 * is re-verified on start and on "Restore purchases". Consumable report unlocks are
 * stored per calculation id.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  EMPTY_ENTITLEMENTS,
  hasResultAccess,
  isPremiumActive,
  parseEntitlements,
  withoutPremium,
  type Entitlements,
} from "@/lib/access/entitlements";
import { applyPurchase, applyRestore } from "@/lib/access/applyPurchase";
import { selectPurchaseGateway } from "@/lib/access/gateways";
import type {
  LoadProductsResult,
  PurchaseGateway,
  PurchaseResult,
  RestoreResult,
} from "@/lib/access/purchaseGateway";
import type { ProductKey } from "@/lib/access/products";
import { recoverTransactions } from "@/lib/access/recovery";
import { clearIntent, createIntent, readIntent, writeIntent } from "@/lib/access/purchaseIntent";
import { productKeyForId } from "@/lib/access/products";
import { verifyPurchaseOutcome, verifyUnfinishedTransactions, type Verifier } from "@/lib/access/verifyFlow";
import { verifyPurchaseWithServer } from "@/lib/access/serverVerification";
import { devVerifyPurchase, purchaseTestModeEnabled } from "@/lib/access/devTestMode";

import { ACCESS_STORAGE_KEY as STORAGE_KEY } from "@/lib/access/storageKey";

/**
 * Writes entitlements to storage immediately. Used before a StoreKit transaction
 * is finished, so a crash between "paid" and "saved" cannot lose the purchase.
 */
function persistEntitlements(entitlements: Entitlements): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entitlements));
  } catch {
    /* storage unavailable */
  }
}

interface AccessContextValue {
  entitlements: Entitlements;
  hydrated: boolean;
  premiumActive: boolean;
  gateway: PurchaseGateway;
  canOpenResult: (calculationId: string) => boolean;
  loadProducts: () => Promise<LoadProductsResult>;
  purchase: (key: ProductKey, calculationId: string) => Promise<PurchaseResult>;
  restore: () => Promise<RestoreResult>;
  /** True while a purchase or restore is running — blocks double taps. */
  purchaseInFlight: boolean;
}

const AccessContext = createContext<AccessContextValue | null>(null);

export function AccessProvider({
  children,
  gateway,
  verifier,
}: {
  children: ReactNode;
  /** Test seam. Production always resolves the platform gateway. */
  gateway?: PurchaseGateway;
  /** Test seam. Production always verifies against our backend. */
  verifier?: Verifier;
}) {
  const verify = useMemo<Verifier>(
    () =>
      verifier ??
      // Development-only: Purchase Test Mode answers instead of Apple. The guard
      // is false in every production build, which always hits the server.
      (purchaseTestModeEnabled()
        ? (req) => devVerifyPurchase(req)
        : (req) => verifyPurchaseWithServer(req)),
    [verifier],
  );
  const resolved = useMemo(() => gateway ?? selectPurchaseGateway(), [gateway]);
  const [entitlements, setEntitlements] = useState<Entitlements>(EMPTY_ENTITLEMENTS);
  const [hydrated, setHydrated] = useState(false);
  const [purchaseInFlight, setPurchaseInFlight] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setEntitlements(parseEntitlements(JSON.parse(raw)));
    } catch {
      /* corrupt storage grants nothing */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entitlements));
    } catch {
      /* storage unavailable */
    }
  }, [entitlements, hydrated]);

  // A cached Premium that has run out is dropped as soon as it is noticed.
  useEffect(() => {
    if (!hydrated) return;
    setEntitlements((e) => (e.premium.active && !isPremiumActive(e) ? withoutPremium(e) : e));
  }, [hydrated]);

  /**
   * PURCHASE RECOVERY — runs once per app start.
   *
   * A user who paid and then lost the app (crash, restart, interrupted
   * transaction) gets the unlock here, from StoreKit's unfinished transactions
   * plus the purchase intent written before the purchase started.
   */
  useEffect(() => {
    if (!hydrated || !resolved.pendingTransactions) return;
    let alive = true;
    void (async () => {
      const raw = await resolved.pendingTransactions!();
      if (!alive || raw.length === 0) return;
      const intent = readIntent();
      // Our backend decides — StoreKit's own word is never enough.
      const transactions = resolved.requiresServerVerification
        ? await verifyUnfinishedTransactions(
            raw,
            intent && intent.key === "singleReport" ? intent.calculationId : "",
            verify,
            productKeyForId,
          )
        : raw;
      if (!alive) return;
      setEntitlements((e) => {
        const outcome = recoverTransactions(e, transactions, intent);
        if (outcome.intentConsumed) clearIntent();
        // Access is persisted before anything is acknowledged to StoreKit.
        persistEntitlements(outcome.entitlements);
        for (const id of outcome.finish) void resolved.finishTransaction?.(id);
        return outcome.entitlements;
      });
    })();
    return () => {
      alive = false;
    };
  }, [hydrated, resolved, verify]);

  const purchase = useCallback(
    async (key: ProductKey, calculationId: string): Promise<PurchaseResult> => {
      // A second tap must never start a second Apple transaction.
      if (inFlight.current) return { status: "pending" };
      inFlight.current = true;
      setPurchaseInFlight(true);
      // Written BEFORE the purchase so a late/interrupted transaction can still
      // be matched to this exact calculation after a restart.
      writeIntent(createIntent(key, key === "singleReport" ? calculationId : ""));
      try {
        const raw = await resolved.purchase(key);
        // StoreKit says "paid"; only our server-verified verdict grants access.
        const { result, finishTransaction } = resolved.requiresServerVerification
          ? await verifyPurchaseOutcome(key, raw, calculationId, verify)
          : { result: raw, finishTransaction: false };

        setEntitlements((e) => {
          const next = applyPurchase(e, result, calculationId);
          if (result.status === "purchased") persistEntitlements(next);
          return next;
        });
        if (result.status === "purchased" || result.status === "cancelled") clearIntent();
        // Finish only AFTER the entitlement has been written to storage.
        if (finishTransaction && raw.status === "purchased" && raw.transactionId)
          void resolved.finishTransaction?.(raw.transactionId);
        return result;
      } finally {
        inFlight.current = false;
        setPurchaseInFlight(false);
      }
    },
    [resolved, verify],
  );

  const restore = useCallback(async (): Promise<RestoreResult> => {
    if (inFlight.current) return { status: "nothing" };
    inFlight.current = true;
    setPurchaseInFlight(true);
    try {
      const result = await resolved.restore();
      setEntitlements((e) => applyRestore(e, result));
      return result;
    } finally {
      inFlight.current = false;
      setPurchaseInFlight(false);
    }
  }, [resolved]);

  const value = useMemo<AccessContextValue>(
    () => ({
      entitlements,
      hydrated,
      gateway: resolved,
      premiumActive: isPremiumActive(entitlements),
      canOpenResult: (calculationId: string) => hasResultAccess(entitlements, calculationId),
      loadProducts: () => resolved.loadProducts(),
      purchase,
      restore,
      purchaseInFlight,
    }),
    [entitlements, hydrated, resolved, purchase, restore, purchaseInFlight],
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error("useAccess must be used inside AccessProvider");
  return ctx;
}
