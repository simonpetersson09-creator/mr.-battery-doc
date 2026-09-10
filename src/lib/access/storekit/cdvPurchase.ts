/**
 * NATIVE STOREKIT ADAPTER (cordova-plugin-purchase v13, Apple AppStore / StoreKit 2).
 *
 * This is the ONLY place that talks to the IAP plugin. It implements the small
 * `NativePurchasePlugin` contract; every entitlement rule, per-calculation unlock
 * and server verification lives in platform-independent code.
 *
 * Rules honoured here:
 *  - products are looked up by their EXACT product id, never by array position
 *  - prices come from StoreKit only (no hardcoded amounts)
 *  - a transaction is NEVER finished here; the access layer finishes it after a
 *    server-verified purchase has been stored
 *  - nothing runs in the browser: initialisation is refused off native iOS
 */
import { isIOS, isNativePlatform } from "@/lib/platform/runtime";
import { PRODUCT_IDS, PRODUCT_TYPES, type ProductKey } from "../products";
import { registerNativePurchasePlugin, type NativePurchasePlugin } from "../gateways/native";

/* Minimal structural typing of the plugin's global — we never import its module
   into the web bundle. */
interface CdvTransaction {
  transactionId: string;
  originalTransactionId?: string;
  state?: string;
  products?: Array<{ id: string }>;
  expirationDate?: string | Date;
  isPending?: boolean;
  finish?: () => Promise<void> | void;
}
interface CdvProduct {
  id: string;
  title?: string;
  pricing?: { price?: string; currency?: string };
  offers?: Array<{ pricingPhases?: Array<{ price?: string }>; order?: () => Promise<unknown> }>;
  getOffer?: () => { order?: () => Promise<unknown> } | undefined;
  canPurchase?: boolean;
}
interface CdvStore {
  register(products: Array<{ id: string; type: string; platform: string }>): void;
  initialize(platforms: unknown[]): Promise<unknown>;
  update?(): Promise<unknown>;
  restorePurchases(): Promise<unknown>;
  manageSubscriptions?(): Promise<unknown> | void;
  get(id: string, platform?: string): CdvProduct | undefined;
  order?(offer: unknown): Promise<unknown>;
  when(): {
    approved: (cb: (t: CdvTransaction) => void) => unknown;
    finished?: (cb: (t: CdvTransaction) => void) => unknown;
    pending?: (cb: (t: CdvTransaction) => void) => unknown;
  };
  error(cb: (e: { code?: number; message?: string }) => void): void;
  localTransactions?: CdvTransaction[];
  verbosity?: number;
}
interface CdvNamespace {
  store: CdvStore;
  Platform: { APPLE_APPSTORE: string };
  ProductType: { CONSUMABLE: string; PAID_SUBSCRIPTION: string };
  LogLevel?: { QUIET: number };
}

function cdv(): CdvNamespace | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { CdvPurchase?: CdvNamespace }).CdvPurchase ?? null;
}

const APPLE = "ios-appstore";

function productTypeFor(key: ProductKey, ns: CdvNamespace): string {
  return PRODUCT_TYPES[key] === "consumable"
    ? ns.ProductType.CONSUMABLE
    : ns.ProductType.PAID_SUBSCRIPTION;
}

/** Transactions StoreKit still owns, indexed by transaction id, so we can finish them. */
const knownTransactions = new Map<string, CdvTransaction>();

function rememberTransaction(t: CdvTransaction): void {
  if (t?.transactionId) knownTransactions.set(t.transactionId, t);
}

function expiresISO(t: CdvTransaction): string | null {
  if (!t.expirationDate) return null;
  const d = t.expirationDate instanceof Date ? t.expirationDate : new Date(t.expirationDate);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function createCdvPurchaseAdapter(ns: CdvNamespace): NativePurchasePlugin {
  const store = ns.store;
  let initialized: Promise<void> | null = null;

  /** Resolvers waiting for the transaction of an in-flight order, per product id. */
  const waiting = new Map<string, (t: CdvTransaction) => void>();

  function ensureInit(): Promise<void> {
    if (initialized) return initialized;
    initialized = (async () => {
      for (const key of Object.keys(PRODUCT_IDS) as ProductKey[]) {
        store.register([
          { id: PRODUCT_IDS[key], type: productTypeFor(key, ns), platform: ns.Platform.APPLE_APPSTORE },
        ]);
      }
      store
        .when()
        .approved((t) => {
          // Approved = paid. We do NOT finish here: our backend must verify first.
          rememberTransaction(t);
          const id = t.products?.[0]?.id;
          const resolve = id ? waiting.get(id) : undefined;
          if (id && resolve) {
            waiting.delete(id);
            resolve(t);
          }
        });
      store.when().pending?.((t) => rememberTransaction(t));
      store.error(() => {
        /* individual calls surface their own errors */
      });
      await store.initialize([{ platform: ns.Platform.APPLE_APPSTORE }]);
    })();
    return initialized;
  }

  return {
    async getProducts(productIds: string[]) {
      await ensureInit();
      await store.update?.();
      const out: Array<{ productId: string; displayPrice: string }> = [];
      for (const id of productIds) {
        // Explicit lookup by product id — never by index.
        const p = store.get(id, APPLE);
        const price = p?.pricing?.price ?? p?.offers?.[0]?.pricingPhases?.[0]?.price;
        if (p && price) out.push({ productId: id, displayPrice: price });
      }
      return out;
    },

    async purchase(productId: string) {
      await ensureInit();
      const product = store.get(productId, APPLE);
      if (!product) return { status: "failed" as const, code: "PRODUCT_UNAVAILABLE" };

      const transaction = new Promise<CdvTransaction | null>((resolve) => {
        waiting.set(productId, resolve);
        // StoreKit may take a long time (Ask to Buy); the timeout only ends OUR
        // wait — the transaction itself stays unfinished and is recovered later.
        setTimeout(() => {
          if (waiting.get(productId)) {
            waiting.delete(productId);
            resolve(null);
          }
        }, 120_000);
      });

      try {
        const offer = product.getOffer?.() ?? product.offers?.[0];
        if (!offer) return { status: "failed" as const, code: "PRODUCT_UNAVAILABLE" };
        await (offer.order ? offer.order() : store.order?.(offer));
      } catch (err) {
        waiting.delete(productId);
        const e = err as { code?: number; message?: string; isError?: boolean };
        const message = String(e?.message ?? "");
        if (/cancel/i.test(message) || e?.code === 6500) return { status: "cancelled" as const };
        return { status: "failed" as const, code: String(e?.code ?? ""), message };
      }

      const t = await transaction;
      if (!t) return { status: "pending" as const };
      if (t.isPending || t.state === "initiated" || t.state === "pending")
        return { status: "pending" as const };

      return {
        status: "purchased" as const,
        verified: true,
        transactionId: t.transactionId,
        originalTransactionId: t.originalTransactionId ?? null,
        productId,
        expiresISO: expiresISO(t),
      };
    },

    async restorePremium() {
      await ensureInit();
      await store.restorePurchases();
      await store.update?.();
      // Subscriptions only — a consumable report is never "restored" by Apple.
      const premiumId = PRODUCT_IDS.premiumYear;
      const tx = (store.localTransactions ?? []).filter((t) =>
        (t.products ?? []).some((p) => p.id === premiumId),
      );
      const active = tx.find((t) => {
        const iso = expiresISO(t);
        return !iso || Date.parse(iso) > Date.now();
      });
      tx.forEach(rememberTransaction);
      if (!active) return { active: false };
      return { active: true, expiresISO: expiresISO(active) };
    },

    async pendingTransactions() {
      await ensureInit();
      const list = store.localTransactions ?? [];
      const out: Array<{
        transactionId: string;
        productId: string;
        verified?: boolean;
        expiresISO?: string | null;
      }> = [];
      for (const t of list) {
        if (!t.transactionId) continue;
        if (t.state === "finished") continue;
        const productId = t.products?.[0]?.id;
        if (!productId) continue;
        rememberTransaction(t);
        // `verified` stays undefined on purpose: only our backend may set it.
        out.push({ transactionId: t.transactionId, productId, expiresISO: expiresISO(t) });
      }
      return out;
    },

    async finishTransaction(transactionId: string) {
      const t = knownTransactions.get(transactionId);
      await t?.finish?.();
      knownTransactions.delete(transactionId);
    },

    async manageSubscriptions() {
      await ensureInit();
      await store.manageSubscriptions?.();
    },
  };
}

/**
 * Registers the StoreKit adapter — native iOS only. In the browser this is a
 * no-op, so the web build keeps its non-purchasing gateway.
 */
export function initNativeStoreKit(): boolean {
  if (!isNativePlatform() || !isIOS()) return false;
  const ns = cdv();
  if (!ns?.store) return false;
  registerNativePurchasePlugin(createCdvPurchaseAdapter(ns));
  return true;
}
