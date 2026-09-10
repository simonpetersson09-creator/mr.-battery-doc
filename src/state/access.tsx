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

const STORAGE_KEY = "mr-battery-doc:access:v1";

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
}: {
  children: ReactNode;
  /** Test seam. Production always resolves the platform gateway. */
  gateway?: PurchaseGateway;
}) {
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
      const transactions = await resolved.pendingTransactions!();
      if (!alive || transactions.length === 0) return;
      const intent = readIntent();
      setEntitlements((e) => {
        const outcome = recoverTransactions(e, transactions, intent);
        if (outcome.intentConsumed) clearIntent();
        for (const id of outcome.finish) void resolved.finishTransaction?.(id);
        return outcome.entitlements;
      });
    })();
    return () => {
      alive = false;
    };
  }, [hydrated, resolved]);

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
        const result = await resolved.purchase(key);
        setEntitlements((e) => applyPurchase(e, result, calculationId));
        if (result.status === "purchased" || result.status === "cancelled") clearIntent();
        return result;
      } finally {
        inFlight.current = false;
        setPurchaseInFlight(false);
      }
    },
    [resolved],
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
