import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCdvPurchaseAdapter } from "./cdvPurchase";
import { PRODUCT_IDS } from "../products";

/** Minimal fake of the cordova-plugin-purchase global. */
function fakeStore() {
  const approved: Array<(t: unknown) => void> = [];
  const registered: Array<{ id: string; type: string }> = [];
  const finished: string[] = [];
  const transaction = {
    transactionId: "tx-42",
    originalTransactionId: "orig-1",
    products: [{ id: PRODUCT_IDS.singleReport }],
    finish: vi.fn(async () => {
      finished.push("tx-42");
    }),
  };
  const store = {
    register: (p: Array<{ id: string; type: string; platform: string }>) => registered.push(...p),
    initialize: vi.fn(async () => undefined),
    update: vi.fn(async () => undefined),
    restorePurchases: vi.fn(async () => undefined),
    manageSubscriptions: vi.fn(async () => undefined),
    get: (id: string) =>
      id === PRODUCT_IDS.singleReport
        ? {
            id,
            pricing: { price: "59,00 kr" },
            offers: [{ order: async () => approved.forEach((cb) => cb(transaction)) }],
          }
        : id === PRODUCT_IDS.premiumYear
          ? { id, pricing: { price: "219,00 kr" }, offers: [{ order: async () => undefined }] }
          : undefined,
    when: () => ({
      approved: (cb: (t: unknown) => void) => approved.push(cb),
      pending: () => undefined,
    }),
    error: () => undefined,
    localTransactions: [transaction],
  };
  const ns = {
    store,
    Platform: { APPLE_APPSTORE: "ios-appstore" },
    ProductType: { CONSUMABLE: "consumable", PAID_SUBSCRIPTION: "paid subscription" },
  };
  return { ns, store, registered, transaction, finished };
}

describe("native StoreKit adapter", () => {
  let f: ReturnType<typeof fakeStore>;
  beforeEach(() => {
    f = fakeStore();
  });

  it("registers exactly the two App Store products with the right types", async () => {
    const a = createCdvPurchaseAdapter(f.ns as never);
    await a.getProducts([PRODUCT_IDS.singleReport]);
    expect(f.registered).toEqual([
      { id: PRODUCT_IDS.singleReport, type: "consumable", platform: "ios-appstore" },
      { id: PRODUCT_IDS.premiumYear, type: "paid subscription", platform: "ios-appstore" },
    ]);
  });

  it("returns Apple's localized price, looked up by product id", async () => {
    const a = createCdvPurchaseAdapter(f.ns as never);
    const products = await a.getProducts([PRODUCT_IDS.premiumYear, "com.unknown.product"]);
    expect(products).toEqual([{ productId: PRODUCT_IDS.premiumYear, displayPrice: "219,00 kr" }]);
  });

  it("returns the StoreKit transaction reference and does not finish it", async () => {
    const a = createCdvPurchaseAdapter(f.ns as never);
    const res = await a.purchase(PRODUCT_IDS.singleReport);
    expect(res.status).toBe("purchased");
    expect(res.transactionId).toBe("tx-42");
    expect(res.originalTransactionId).toBe("orig-1");
    expect(f.transaction.finish).not.toHaveBeenCalled();
  });

  it("finishes a transaction only when explicitly asked to", async () => {
    const a = createCdvPurchaseAdapter(f.ns as never);
    await a.purchase(PRODUCT_IDS.singleReport);
    await a.finishTransaction?.("tx-42");
    expect(f.transaction.finish).toHaveBeenCalledTimes(1);
  });

  it("reports unfinished transactions without claiming they are verified", async () => {
    const a = createCdvPurchaseAdapter(f.ns as never);
    const pending = await a.pendingTransactions?.();
    expect(pending).toEqual([
      { transactionId: "tx-42", productId: PRODUCT_IDS.singleReport, expiresISO: null },
    ]);
  });

  it("fails cleanly when a product is unavailable in App Store Connect", async () => {
    const a = createCdvPurchaseAdapter(f.ns as never);
    const res = await a.purchase("com.unknown.product");
    expect(res.status).toBe("failed");
  });
});
