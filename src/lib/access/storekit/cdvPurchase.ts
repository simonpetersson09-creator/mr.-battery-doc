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
    productUpdated?: (cb: (p: CdvProduct) => void) => unknown;
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

const PRODUCT_LOAD_TIMEOUT_MS = 15_000;

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

/** cordova-plugin-purchase error codes we treat specially (CdvPurchase.ErrorCode). */
const ERR_PAYMENT_CANCELLED = 6500;
const ERR_PAYMENT_NOT_ALLOWED = 6501;
const ERR_PAYMENT_PENDING = 6777031;

type PluginError = { code?: number | string; message?: string; isError?: boolean };

/**
 * `store.order()` / `offer.order()` in v13 resolves with an `IError` object
 * instead of throwing on many failures. Anything that looks like an error must
 * never be treated as a completed purchase.
 */
function asPluginError(value: unknown): PluginError | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  const hasCode = typeof o["code"] === "number" || typeof o["code"] === "string";
  if (o["isError"] === true) return o as PluginError;
  if (hasCode && ("message" in o || "isError" in o)) return o as PluginError;
  return null;
}

/** Maps a returned IError or a thrown exception to our purchase outcome. */
function mapPluginError(
  err: unknown,
):
  | { status: "cancelled" }
  | { status: "pending" }
  | { status: "failed"; code: string; message: string } {
  const e = (err ?? {}) as PluginError;
  const rawCode = e.code;
  const code = String(rawCode ?? "");
  const message = String(e.message ?? "");
  if (rawCode === ERR_PAYMENT_CANCELLED || /cancel/i.test(code) || /cancel/i.test(message))
    return { status: "cancelled" };
  if (rawCode === ERR_PAYMENT_PENDING || /pending|deferred|ask to buy/i.test(`${code} ${message}`))
    return { status: "pending" };
  if (rawCode === ERR_PAYMENT_NOT_ALLOWED || /not allowed/i.test(`${code} ${message}`))
    return { status: "failed", code: code || "PAYMENT_NOT_ALLOWED", message };
  return { status: "failed", code, message };
}

export function createCdvPurchaseAdapter(ns: CdvNamespace): NativePurchasePlugin {
  const store = ns.store;
  let initialized: Promise<void> | null = null;
  const productListeners = new Set<() => void>();

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
      const events = store.when();
      events.productUpdated?.(() => {
        for (const listener of [...productListeners]) listener();
      });
      events.approved((t) => {
          // Approved = paid. We do NOT finish here: our backend must verify first.
          rememberTransaction(t);
          const id = t.products?.[0]?.id;
          const resolve = id ? waiting.get(id) : undefined;
          if (id && resolve) {
            waiting.delete(id);
            resolve(t);
          }
        });
      events.pending?.((t) => rememberTransaction(t));
      store.error(() => {
        /* individual calls surface their own errors */
      });
      const errors = await store.initialize([{ platform: ns.Platform.APPLE_APPSTORE }]);
      if (Array.isArray(errors) && errors.length > 0) {
        const first = errors[0] as { code?: unknown; message?: unknown } | undefined;
        throw Object.assign(new Error(String(first?.message ?? "StoreKit initialization failed")), {
          code: first?.code,
        });
      }
    })().catch((error) => {
      // Do not pin a transient StoreKit/network failure for the whole app session.
      initialized = null;
      throw error;
    });
    return initialized;
  }

  function loadedProducts(productIds: string[]): Array<{ productId: string; displayPrice: string }> {
    const out: Array<{ productId: string; displayPrice: string }> = [];
    for (const id of productIds) {
      const p = store.get(id, ns.Platform.APPLE_APPSTORE);
      const price = p?.pricing?.price ?? p?.offers?.[0]?.pricingPhases?.[0]?.price;
      if (p && price) out.push({ productId: id, displayPrice: price });
    }
    return out;
  }

  async function waitForProducts(
    productIds: string[],
  ): Promise<Array<{ productId: string; displayPrice: string }>> {
    const configuredIds = new Set(Object.values(PRODUCT_IDS));
    const expectedIds = productIds.filter((id) => configuredIds.has(id));
    const current = loadedProducts(productIds);
    if (current.length === expectedIds.length) return current;

    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        const products = loadedProducts(productIds);
        if (products.length !== expectedIds.length) return;
        settled = true;
        clearTimeout(timer);
        productListeners.delete(finish);
        resolve(products);
      };
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        productListeners.delete(finish);
        resolve(loadedProducts(productIds));
      }, PRODUCT_LOAD_TIMEOUT_MS);
      productListeners.add(finish);
      finish();
    });
  }

  return {
    async getProducts(productIds: string[]) {
      // Product metadata can arrive before the initialization promise resolves
      // (receipt/storefront loading may still be running), or in a later update.
      await Promise.race([
        ensureInit(),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error("StoreKit initialization timed out")), PRODUCT_LOAD_TIMEOUT_MS),
        ),
      ]);
      const immediate = loadedProducts(productIds);
      const expectedCount = productIds.filter((id) =>
        Object.values(PRODUCT_IDS).includes(id as (typeof PRODUCT_IDS)[ProductKey]),
      ).length;
      if (immediate.length === expectedCount) return immediate;
      await store.update?.();
      // waitForProducts checks synchronously before subscribing, so an update
      // delivered during store.update() cannot be missed.
      return waitForProducts(productIds);
    },

    async purchase(productId: string) {
      await ensureInit();
      const product = store.get(productId, ns.Platform.APPLE_APPSTORE);
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
        // v13 may RETURN an IError instead of throwing it — both paths must fail.
        const ordered = await (offer.order ? offer.order() : store.order?.(offer));
        const returnedError = asPluginError(ordered);
        if (returnedError) {
          waiting.delete(productId);
          return mapPluginError(returnedError);
        }
      } catch (err) {
        waiting.delete(productId);
        return mapPluginError(err);
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
