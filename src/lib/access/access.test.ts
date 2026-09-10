/**
 * PAYWALL / ACCESS TESTS.
 *
 * The paywall is an access layer on top of the finished calculation. These tests
 * cover the routing decision, the entitlement rules, every purchase outcome and
 * that the result object is identical before and after the paywall.
 */
import { describe, expect, it } from "vitest";

import { createInitialState, type WizardState } from "@/state/wizard";
import { calculationId } from "./calculationId";
import { clearCalculationCache, getCalculation } from "./calculationCache";
import {
  EMPTY_ENTITLEMENTS,
  hasResultAccess,
  isPremiumActive,
  parseEntitlements,
  withPremium,
  withUnlockedCalculation,
} from "./entitlements";
import { applyPurchase, applyRestore } from "./applyPurchase";
import { destinationAfterStep5 } from "./flow";
import { createMockGateway } from "./gateways/mock";
import { createWebGateway } from "./gateways/web";
import { createNativeGateway, interpretNativePurchase } from "./gateways/native";
import { interpretPurchaseError } from "./purchaseGateway";
import { PRODUCTS_CONFIGURED, PRODUCT_IDS, PRODUCT_TYPES } from "./products";

function completeState(patch: (s: WizardState) => void = () => {}): WizardState {
  const s = structuredClone(createInitialState());
  s.consumption.annualKwh = 40_000;
  s.consumption.profileId = "evening-heavy";
  patch(s);
  return s;
}

const state = completeState();
const calcId = calculationId(state);

describe("routing after step 5", () => {
  it("sends a user without entitlements to the paywall", () => {
    expect(
      destinationAfterStep5({
        calculationStatus: "ok",
        entitlements: EMPTY_ENTITLEMENTS,
        calculationId: calcId,
      }),
    ).toBe("/betalvagg");
  });

  it("sends an active Premium user straight to the result", () => {
    expect(
      destinationAfterStep5({
        calculationStatus: "ok",
        entitlements: withPremium(EMPTY_ENTITLEMENTS, "2099-01-01T00:00:00.000Z"),
        calculationId: calcId,
      }),
    ).toBe("/resultat");
  });

  it("never sells an incomplete calculation", () => {
    expect(
      destinationAfterStep5({
        calculationStatus: "incomplete",
        entitlements: EMPTY_ENTITLEMENTS,
        calculationId: calcId,
      }),
    ).toBe("/resultat");
  });
});

describe("entitlements", () => {
  it("unlocks only the purchased calculation", () => {
    const e = withUnlockedCalculation(EMPTY_ENTITLEMENTS, calcId);
    expect(hasResultAccess(e, calcId)).toBe(true);

    const other = calculationId(completeState((s) => (s.consumption.annualKwh = 41_000)));
    expect(other).not.toBe(calcId);
    expect(hasResultAccess(e, other)).toBe(false);
    expect(
      destinationAfterStep5({
        calculationStatus: "ok",
        entitlements: e,
        calculationId: other,
      }),
    ).toBe("/betalvagg");
  });

  it("treats an expired subscription as no access", () => {
    const e = withPremium(EMPTY_ENTITLEMENTS, "2020-01-01T00:00:00.000Z");
    expect(isPremiumActive(e)).toBe(false);
    expect(hasResultAccess(e, calcId)).toBe(false);
  });

  it("grants nothing from corrupt storage", () => {
    expect(parseEntitlements("nonsense")).toEqual(EMPTY_ENTITLEMENTS);
    expect(hasResultAccess(parseEntitlements({ premium: { active: "yes" } }), calcId)).toBe(false);
  });

  it("keeps the same id when the user goes back and returns unchanged", () => {
    expect(calculationId(completeState())).toBe(calcId);
  });
});

describe("purchase outcomes", () => {
  it("unlocks the current calculation on a successful one-off purchase", async () => {
    const gw = createMockGateway({ purchase: (key) => ({ status: "purchased", key }) });
    const res = await gw.purchase("singleReport");
    const e = applyPurchase(EMPTY_ENTITLEMENTS, res, calcId);
    expect(hasResultAccess(e, calcId)).toBe(true);
    expect(e.premium.active).toBe(false);
  });

  it("activates Premium on a successful subscription purchase", async () => {
    const gw = createMockGateway({
      purchase: (key) => ({ status: "purchased", key, premiumExpiresISO: "2099-01-01T00:00:00.000Z" }),
    });
    const e = applyPurchase(EMPTY_ENTITLEMENTS, await gw.purchase("premiumYear"), calcId);
    expect(isPremiumActive(e)).toBe(true);
    expect(hasResultAccess(e, "some-other-calculation")).toBe(true);
  });

  it("unlocks nothing when the user cancels", async () => {
    const gw = createMockGateway({ purchase: () => ({ status: "cancelled" }) });
    const e = applyPurchase(EMPTY_ENTITLEMENTS, await gw.purchase("singleReport"), calcId);
    expect(e).toEqual(EMPTY_ENTITLEMENTS);
  });

  it("unlocks nothing on a failed purchase", async () => {
    const gw = createMockGateway({ purchase: () => ({ status: "failed", code: "network" }) });
    const e = applyPurchase(EMPTY_ENTITLEMENTS, await gw.purchase("singleReport"), calcId);
    expect(hasResultAccess(e, calcId)).toBe(false);
  });

  it("unlocks nothing while a purchase is pending", async () => {
    const gw = createMockGateway({ purchase: () => ({ status: "pending" }) });
    const e = applyPurchase(EMPTY_ENTITLEMENTS, await gw.purchase("premiumYear"), calcId);
    expect(hasResultAccess(e, calcId)).toBe(false);
  });

  it("unlocks nothing when verification fails", () => {
    const res = interpretNativePurchase("premiumYear", { status: "purchased", verified: false });
    expect(res).toEqual({ status: "failed", code: "verification" });
    expect(applyPurchase(EMPTY_ENTITLEMENTS, res, calcId)).toEqual(EMPTY_ENTITLEMENTS);
  });

  it("restores Premium and only Premium", async () => {
    const gw = createMockGateway({
      restore: { status: "restored", premiumExpiresISO: "2099-01-01T00:00:00.000Z" },
    });
    const e = applyRestore(EMPTY_ENTITLEMENTS, await gw.restore());
    expect(isPremiumActive(e)).toBe(true);

    const none = applyRestore(EMPTY_ENTITLEMENTS, { status: "nothing" });
    expect(none.unlockedCalculations).toEqual([]);
    expect(none.premium.active).toBe(false);
  });

  it("reports missing store products instead of unlocking", async () => {
    const gw = createMockGateway({ products: { status: "failed", code: "products-unavailable" } });
    const res = await gw.loadProducts();
    expect(res).toEqual({ status: "failed", code: "products-unavailable" });
  });

  it("reads cancellations and errors from returned objects, not just exceptions", () => {
    expect(interpretPurchaseError({ userCancelled: true })).toBe("cancelled");
    expect(interpretPurchaseError({ code: "NETWORK_ERROR" })).toBe("network");
    expect(interpretPurchaseError({ message: "Receipt invalid" })).toBe("verification");
    expect(interpretNativePurchase("singleReport", { userCancelled: true })).toEqual({
      status: "cancelled",
    });
  });

  it("never purchases in the browser build", async () => {
    const web = createWebGateway();
    expect(await web.purchase("premiumYear")).toEqual({
      status: "failed",
      code: "not-supported",
    });
    expect(applyPurchase(EMPTY_ENTITLEMENTS, await web.purchase("singleReport"), calcId)).toEqual(
      EMPTY_ENTITLEMENTS,
    );
  });

  it("maps a native store failure to a readable error", async () => {
    const gw = createNativeGateway({
      getProducts: async () => {
        throw new Error("network unreachable");
      },
      purchase: async () => ({ status: "failed", code: "NETWORK" }),
      restorePremium: async () => ({ active: false }),
    });
    expect(await gw.loadProducts()).toEqual({ status: "failed", code: "network" });
    expect(await gw.purchase("premiumYear")).toEqual({ status: "failed", code: "network" });
  });
});

describe("the calculation survives the paywall", () => {
  it("returns the identical result object before and after a purchase", () => {
    clearCalculationCache();
    const before = getCalculation(state);
    expect(before.outcome.status).toBe("ok");

    // The purchase only changes entitlements.
    const e = applyPurchase(
      EMPTY_ENTITLEMENTS,
      { status: "purchased", key: "singleReport" },
      before.id,
    );
    expect(hasResultAccess(e, before.id)).toBe(true);

    const after = getCalculation(state);
    expect(after.id).toBe(before.id);
    // Same object: the engine did NOT run again.
    expect(after.outcome).toBe(before.outcome);
  });

  it("runs a new calculation when the inputs change", () => {
    clearCalculationCache();
    const first = getCalculation(state);
    const changed = getCalculation(completeState((s) => (s.consumption.annualKwh = 55_000)));
    expect(changed.id).not.toBe(first.id);
    expect(changed.outcome).not.toBe(first.outcome);
  });
});

describe("product configuration", () => {
  it("keeps the product ids central and flags the placeholders", () => {
    expect(PRODUCT_TYPES.singleReport).toBe("consumable");
    expect(PRODUCT_TYPES.premiumYear).toBe("auto-renewable-subscription");
    expect(Object.values(PRODUCT_IDS)).toHaveLength(2);
    // Still placeholders — must be replaced with the real App Store Connect ids.
    expect(PRODUCTS_CONFIGURED).toBe(false);
  });
});
