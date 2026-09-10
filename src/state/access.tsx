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

  const purchase = useCallback(
    async (key: ProductKey, calculationId: string) => {
      const result = await resolved.purchase(key);
      setEntitlements((e) => applyPurchase(e, result, calculationId));
      return result;
    },
    [resolved],
  );

  const restore = useCallback(async () => {
    const result = await resolved.restore();
    setEntitlements((e) => applyRestore(e, result));
    return result;
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
    }),
    [entitlements, hydrated, resolved, purchase, restore],
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error("useAccess must be used inside AccessProvider");
  return ctx;
}
