/**
 * Native iOS (StoreKit) gateway.
 *
 * The Capacitor IAP plugin is NOT a build-time dependency of the web bundle. The
 * iOS shell registers an adapter at startup with `registerNativePurchasePlugin`,
 * and this gateway is only selected when such an adapter exists. That keeps the
 * browser build free of native imports and makes the plugin choice (RevenueCat or
 * another StoreKit plugin) a single, replaceable file in the iOS app.
 *
 * The adapter contract is deliberately tiny — everything else (entitlement rules,
 * per-calculation unlocking, error copy) lives in platform-independent code.
 */
import { PRODUCT_IDS, type ProductKey } from "../products";
import {
  interpretPurchaseError,
  type PurchaseGateway,
  type PurchaseResult,
  type StoreProduct,
} from "../purchaseGateway";

export interface NativePurchasePlugin {
  /** Localized StoreKit products for the given identifiers. */
  getProducts(productIds: string[]): Promise<
    Array<{ productId: string; displayPrice: string }>
  >;
  /**
   * Starts the native purchase flow and resolves only when StoreKit has a verified
   * outcome. May throw, or return an error/cancel object — both are handled.
   */
  purchase(productId: string): Promise<{
    status?: "purchased" | "cancelled" | "pending" | "failed";
    userCancelled?: boolean;
    verified?: boolean;
    expiresISO?: string | null;
    code?: string;
    message?: string;
  }>;
  /** Restores/verifies existing SUBSCRIPTION entitlements only. */
  restorePremium(): Promise<{ active: boolean; expiresISO?: string | null }>;
}

let plugin: NativePurchasePlugin | null = null;

export function registerNativePurchasePlugin(p: NativePurchasePlugin | null): void {
  plugin = p;
}

export function nativePurchasePlugin(): NativePurchasePlugin | null {
  return plugin;
}

export function createNativeGateway(p: NativePurchasePlugin): PurchaseGateway {
  return {
    kind: "native",
    async loadProducts() {
      try {
        const ids = Object.values(PRODUCT_IDS);
        const raw = await p.getProducts(ids);
        const products: StoreProduct[] = [];
        for (const key of Object.keys(PRODUCT_IDS) as ProductKey[]) {
          const hit = raw.find((r) => r.productId === PRODUCT_IDS[key]);
          if (hit) products.push({ key, productId: hit.productId, displayPrice: hit.displayPrice });
        }
        if (products.length === 0) return { status: "failed", code: "products-unavailable" };
        return { status: "ok", products };
      } catch (err) {
        const code = interpretPurchaseError(err);
        return { status: "failed", code: code === "unknown" ? "products-unavailable" : code };
      }
    },
    async purchase(key) {
      try {
        const res = await p.purchase(PRODUCT_IDS[key]);
        return interpretNativePurchase(key, res);
      } catch (err) {
        const code = interpretPurchaseError(err);
        return code === "cancelled" ? { status: "cancelled" } : { status: "failed", code };
      }
    },
    async restore() {
      try {
        const res = await p.restorePremium();
        if (!res?.active) return { status: "nothing" };
        return { status: "restored", premiumExpiresISO: res.expiresISO ?? null };
      } catch (err) {
        return { status: "failed", code: interpretPurchaseError(err) };
      }
    },
  };
}

/**
 * A resolved promise is NOT a successful purchase. Only an explicitly purchased
 * and verified result unlocks anything.
 */
export function interpretNativePurchase(
  key: ProductKey,
  res: Awaited<ReturnType<NativePurchasePlugin["purchase"]>> | null | undefined,
): PurchaseResult {
  if (!res) return { status: "failed", code: "unknown" };
  if (res.userCancelled === true || res.status === "cancelled") return { status: "cancelled" };
  if (res.status === "pending") return { status: "pending" };
  if (res.status === "failed") return { status: "failed", code: interpretPurchaseError(res) };
  if (res.status === "purchased") {
    if (res.verified === false) return { status: "failed", code: "verification" };
    return { status: "purchased", key, premiumExpiresISO: res.expiresISO ?? null };
  }
  return { status: "failed", code: interpretPurchaseError(res) };
}
