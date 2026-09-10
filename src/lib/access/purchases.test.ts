/**
 * STOREKIT FOUNDATION TESTS.
 *
 * Covers product identification, purchase recovery, the consumable ↔ calculation
 * binding, Premium entitlement, restore rules, web/native separation and that no
 * Apple secret can reach the frontend configuration.
 */
import { describe, expect, it } from "vitest";

import {
  APP_STORE_CONNECT_CONFIRMED,
  PRODUCT_IDS,
  PRODUCT_TYPES,
  productKeyForId,
} from "./products";
import { createNativeGateway, interpretNativePurchase, type NativePurchasePlugin } from "./gateways/native";
import { createWebGateway } from "./gateways/web";
import { selectPurchaseGateway } from "./gateways";
import { applyPurchase, applyRestore } from "./applyPurchase";
import {
  EMPTY_ENTITLEMENTS,
  hasResultAccess,
  isPremiumActive,
  withPremium,
  withUnlockedCalculation,
} from "./entitlements";
import { recoverTransactions } from "./recovery";
import { createIntent, parseIntent, INTENT_MAX_AGE_MS } from "./purchaseIntent";
import { isVerificationBlocking, verifyPurchaseWithServer } from "./serverVerification";

const CALC = "calc-abc";
const OTHER = "calc-xyz";

function plugin(over: Partial<NativePurchasePlugin> = {}): NativePurchasePlugin {
  return {
    getProducts: async (ids) => ids.map((productId) => ({ productId, displayPrice: "49,00 kr" })),
    purchase: async () => ({ status: "purchased", verified: true }),
    restorePremium: async () => ({ active: false }),
    ...over,
  };
}

describe("product identification", () => {
  it("resolves products by explicit product id, never by array position", async () => {
    const gw = createNativeGateway(
      plugin({
        // Deliberately reversed order.
        getProducts: async () => [
          { productId: PRODUCT_IDS.premiumYear, displayPrice: "199,00 kr" },
          { productId: PRODUCT_IDS.singleReport, displayPrice: "49,00 kr" },
        ],
      }),
    );
    const res = await gw.loadProducts();
    expect(res.status).toBe("ok");
    if (res.status !== "ok") return;
    expect(res.products.find((p) => p.key === "premiumYear")?.productId).toBe(PRODUCT_IDS.premiumYear);
    expect(res.products.find((p) => p.key === "singleReport")?.displayPrice).toBe("49,00 kr");
    expect(productKeyForId(PRODUCT_IDS.premiumYear)).toBe("premiumYear");
    expect(productKeyForId("com.someone.else")).toBeNull();
  });

  it("uses the real App Store Connect product ids and types", () => {
    expect(PRODUCT_TYPES.singleReport).toBe("consumable");
    expect(PRODUCT_TYPES.premiumYear).toBe("auto-renewable-subscription");
    expect(PRODUCT_IDS.singleReport).toBe("com.mrbatterydoc.calculation.unlock");
    expect(PRODUCT_IDS.premiumYear).toBe("com.mrbatterydoc.premium.yearly");
    expect(APP_STORE_CONNECT_CONFIRMED).toBe(true);
  });

  it("buys the product the user picked", async () => {
    const bought: string[] = [];
    const gw = createNativeGateway(
      plugin({
        purchase: async (productId) => {
          bought.push(productId);
          return { status: "purchased", verified: true };
        },
      }),
    );
    await gw.purchase("singleReport");
    expect(bought).toEqual([PRODUCT_IDS.singleReport]);
  });
});

describe("purchase outcomes never over-grant", () => {
  it("a cancelled purchase unlocks nothing", async () => {
    const gw = createNativeGateway(plugin({ purchase: async () => ({ userCancelled: true }) }));
    const res = await gw.purchase("singleReport");
    expect(res).toEqual({ status: "cancelled" });
    expect(applyPurchase(EMPTY_ENTITLEMENTS, res, CALC)).toEqual(EMPTY_ENTITLEMENTS);
  });

  it("a failed purchase unlocks nothing", async () => {
    const gw = createNativeGateway(
      plugin({
        purchase: async () => {
          throw new Error("network unreachable");
        },
      }),
    );
    const res = await gw.purchase("premiumYear");
    expect(res).toEqual({ status: "failed", code: "network" });
    expect(applyPurchase(EMPTY_ENTITLEMENTS, res, CALC)).toEqual(EMPTY_ENTITLEMENTS);
  });

  it("an unverified purchase unlocks nothing", () => {
    const res = interpretNativePurchase("singleReport", { status: "purchased", verified: false });
    expect(applyPurchase(EMPTY_ENTITLEMENTS, res, CALC)).toEqual(EMPTY_ENTITLEMENTS);
  });

  it("a successful consumable unlocks only that calculation", () => {
    const e = applyPurchase(EMPTY_ENTITLEMENTS, { status: "purchased", key: "singleReport" }, CALC);
    expect(hasResultAccess(e, CALC)).toBe(true);
    expect(hasResultAccess(e, OTHER)).toBe(false);
    expect(e.premium.active).toBe(false);
  });

  it("keeps an already bought report open when Premium later lapses", () => {
    let e = withUnlockedCalculation(EMPTY_ENTITLEMENTS, CALC);
    e = withPremium(e, "2020-01-01T00:00:00.000Z"); // expired
    expect(isPremiumActive(e)).toBe(false);
    expect(hasResultAccess(e, CALC)).toBe(true);
    expect(hasResultAccess(e, OTHER)).toBe(false);
  });

  it("Premium unlocks any calculation while it is valid", () => {
    const e = withPremium(EMPTY_ENTITLEMENTS, "2099-01-01T00:00:00.000Z");
    expect(hasResultAccess(e, OTHER)).toBe(true);
  });
});

describe("restore", () => {
  it("restores Premium", async () => {
    const gw = createNativeGateway(
      plugin({ restorePremium: async () => ({ active: true, expiresISO: "2099-01-01T00:00:00.000Z" }) }),
    );
    const e = applyRestore(EMPTY_ENTITLEMENTS, await gw.restore());
    expect(isPremiumActive(e)).toBe(true);
  });

  it("never invents a restored consumable", async () => {
    const gw = createNativeGateway(plugin());
    const res = await gw.restore();
    expect(res).toEqual({ status: "nothing" });
    expect(applyRestore(withUnlockedCalculation(EMPTY_ENTITLEMENTS, CALC), res).unlockedCalculations)
      .toEqual([CALC]);
  });
});

describe("interrupted purchase recovery", () => {
  const intent = createIntent("singleReport", CALC);

  it("unlocks the paid calculation from an unfinished transaction after a restart", () => {
    const out = recoverTransactions(
      EMPTY_ENTITLEMENTS,
      [{ transactionId: "t1", productId: PRODUCT_IDS.singleReport, verified: true }],
      intent,
    );
    expect(hasResultAccess(out.entitlements, CALC)).toBe(true);
    expect(out.finish).toEqual(["t1"]);
    expect(out.intentConsumed).toBe(true);
  });

  it("keeps a consumable transaction waiting when the calculation is unknown", () => {
    const out = recoverTransactions(
      EMPTY_ENTITLEMENTS,
      [{ transactionId: "t1", productId: PRODUCT_IDS.singleReport, verified: true }],
      null,
    );
    expect(out.entitlements).toEqual(EMPTY_ENTITLEMENTS);
    expect(out.keep).toEqual(["t1"]);
    expect(out.finish).toEqual([]);
  });

  it("never grants from an unverified transaction", () => {
    const out = recoverTransactions(
      EMPTY_ENTITLEMENTS,
      [{ transactionId: "t1", productId: PRODUCT_IDS.premiumYear, verified: false }],
      intent,
    );
    expect(out.entitlements).toEqual(EMPTY_ENTITLEMENTS);
    expect(out.keep).toEqual(["t1"]);
  });

  it("recovers Premium and ignores foreign products", () => {
    const out = recoverTransactions(
      EMPTY_ENTITLEMENTS,
      [
        { transactionId: "p", productId: PRODUCT_IDS.premiumYear, verified: true, expiresISO: "2099-01-01T00:00:00.000Z" },
        { transactionId: "x", productId: "com.other.app.thing", verified: true },
      ],
      null,
    );
    expect(isPremiumActive(out.entitlements)).toBe(true);
    expect(out.finish.sort()).toEqual(["p", "x"]);
  });

  it("ignores corrupt or abandoned intents", () => {
    expect(parseIntent({ key: "nope" })).toBeNull();
    expect(parseIntent("garbage")).toBeNull();
    const old = createIntent("singleReport", CALC, new Date(Date.now() - INTENT_MAX_AGE_MS - 1000));
    expect(parseIntent(old)).toBeNull();
  });

  it("gives an adapter without recovery support no transactions", async () => {
    const gw = createNativeGateway(plugin());
    expect(await gw.pendingTransactions?.()).toEqual([]);
    await expect(gw.finishTransaction?.("t1")).resolves.toBeUndefined();
  });
});

describe("web and native are separated", () => {
  it("the browser build has no StoreKit and no fake purchase", async () => {
    const web = createWebGateway();
    expect(web.kind).toBe("web");
    expect(await web.purchase("premiumYear")).toEqual({ status: "failed", code: "not-supported" });
    expect(await web.loadProducts()).toEqual({ status: "failed", code: "not-supported" });
    expect(web.pendingTransactions).toBeUndefined();
  });

  it("selects the web gateway when no StoreKit adapter is registered", () => {
    expect(selectPurchaseGateway().kind).toBe("web");
  });

  it("a missing StoreKit configuration does not crash the app", async () => {
    const gw = createNativeGateway(
      plugin({
        getProducts: async () => [],
        purchase: async () => ({ status: "failed", code: "PRODUCT_NOT_AVAILABLE" }),
      }),
    );
    expect(await gw.loadProducts()).toEqual({ status: "failed", code: "products-unavailable" });
    expect((await gw.purchase("singleReport")).status).toBe("failed");
  });
});

describe("server verification", () => {
  it("treats a missing backend as no opinion, not as a grant or a block", async () => {
    const res = await verifyPurchaseWithServer(
      { key: "premiumYear", productId: PRODUCT_IDS.premiumYear, transactionId: "t1" },
      async () => new Response(JSON.stringify({ status: "config-required" })),
    );
    expect(res.status).toBe("config-required");
    expect(isVerificationBlocking(res)).toBe(false);
  });

  it("blocks only on an explicit invalid verdict", async () => {
    const res = await verifyPurchaseWithServer(
      { key: "singleReport", productId: PRODUCT_IDS.singleReport, transactionId: "t1", calculationId: CALC },
      async () => new Response(JSON.stringify({ status: "invalid", reason: "unknown transaction" })),
    );
    expect(isVerificationBlocking(res)).toBe(true);
  });

  it("survives an unreachable backend", async () => {
    const res = await verifyPurchaseWithServer(
      { key: "premiumYear", productId: PRODUCT_IDS.premiumYear, transactionId: "t1" },
      async () => {
        throw new Error("offline");
      },
    );
    expect(res).toEqual({ status: "unavailable" });
  });

  it("holds no Apple secrets in frontend configuration", async () => {
    const frontend = JSON.stringify({ PRODUCT_IDS, APP_STORE_CONNECT_CONFIRMED });
    for (const forbidden of ["PRIVATE KEY", "issuerId", "APPLE_PRIVATE_KEY", "keyId", "sharedSecret"]) {
      expect(frontend.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });
});
