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
  ADJUSTMENT_CREDITS_TTL_MS,
  adjustmentCreditsRemaining,
  consumeAdjustmentCredit,
  hasAdjustmentCredit,
  hasResultAccess,
  isPremiumActive,
  parseEntitlements,
  withPremium,
  withPurchasedCalculation,
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
    expect(Object.values(PRODUCT_IDS)).toEqual([
      "com.mrbatterydoc.calculation.unlock",
      "com.mrbatterydoc.premium.yearly",
    ]);
    expect(PRODUCTS_CONFIGURED).toBe(false);
  });
});

describe("adjustment credits", () => {
  it("grants three credits on a one-off purchase, none on premium", () => {
    const e = applyPurchase(EMPTY_ENTITLEMENTS, { status: "purchased", key: "singleReport" }, "calc-1");
    expect(e.adjustmentCredits).toBe(3);
    expect(hasResultAccess(e, "calc-1")).toBe(true);

    const p = applyPurchase(EMPTY_ENTITLEMENTS, { status: "purchased", key: "premiumYear", premiumExpiresISO: null }, "calc-1");
    expect(p.adjustmentCredits).toBe(0);
  });

  it("a credit unlocks a new calculation and decrements the counter", () => {
    const e = applyPurchase(EMPTY_ENTITLEMENTS, { status: "purchased", key: "singleReport" }, "calc-1");
    expect(hasAdjustmentCredit(e, "calc-2")).toBe(true);
    const after = consumeAdjustmentCredit(e, "calc-2");
    expect(after.adjustmentCredits).toBe(2);
    expect(hasResultAccess(after, "calc-2")).toBe(true);
  });

  it("lets a calculation through the paywall when credits remain", () => {
    const e = applyPurchase(EMPTY_ENTITLEMENTS, { status: "purchased", key: "singleReport" }, "calc-1");
    expect(destinationAfterStep5({ calculationStatus: "ok", entitlements: e, calculationId: "calc-2" })).toBe("/resultat");
    // after spending all credits, a new calculation hits the paywall again
    let spent = e;
    spent = consumeAdjustmentCredit(spent, "calc-2");
    spent = consumeAdjustmentCredit(spent, "calc-3");
    spent = consumeAdjustmentCredit(spent, "calc-4");
    expect(spent.adjustmentCredits).toBe(0);
    expect(destinationAfterStep5({ calculationStatus: "ok", entitlements: spent, calculationId: "calc-5" })).toBe("/betalvagg");
  });

  it("ignores credits entirely when Premium is active", () => {
    const e = withPremium(applyPurchase(EMPTY_ENTITLEMENTS, { status: "purchased", key: "singleReport" }, "calc-1"), null);
    expect(hasAdjustmentCredit(e, "calc-2")).toBe(false);
    expect(consumeAdjustmentCredit(e, "calc-2")).toBe(e);
    expect(destinationAfterStep5({ calculationStatus: "ok", entitlements: e, calculationId: "calc-2" })).toBe("/resultat");
  });

  it("persists credits through parseEntitlements", () => {
    const e = applyPurchase(EMPTY_ENTITLEMENTS, { status: "purchased", key: "singleReport" }, "calc-1");
    const restored = parseEntitlements(JSON.parse(JSON.stringify(e)));
    expect(restored.adjustmentCredits).toBe(3);
    expect(restored.unlockedCalculations).toEqual(["calc-1"]);
  });

  it("does not grant credits from withUnlockedCalculation alone", () => {
    const e = withUnlockedCalculation(EMPTY_ENTITLEMENTS, "calc-1");
    expect(e.adjustmentCredits).toBe(0);
    expect(destinationAfterStep5({ calculationStatus: "ok", entitlements: e, calculationId: "calc-2" })).toBe("/betalvagg");
  });

  it("sets a 24 h expiry on the adjustment credits", () => {
    const bought = new Date("2026-01-01T12:00:00.000Z");
    const e = applyPurchase(EMPTY_ENTITLEMENTS, { status: "purchased", key: "singleReport" }, "calc-1", bought);
    expect(e.adjustmentCredits).toBe(3);
    expect(e.adjustmentCreditsExpiresISO).toBe(
      new Date(bought.getTime() + ADJUSTMENT_CREDITS_TTL_MS).toISOString(),
    );
    // Within the window the credits are usable.
    expect(adjustmentCreditsRemaining(e, new Date(bought.getTime() + 60_000))).toBe(3);
    expect(hasAdjustmentCredit(e, "calc-2", new Date(bought.getTime() + 60_000))).toBe(true);
  });

  it("expires the adjustment credits after 24 h", () => {
    const bought = new Date("2026-01-01T12:00:00.000Z");
    const e = applyPurchase(EMPTY_ENTITLEMENTS, { status: "purchased", key: "singleReport" }, "calc-1", bought);
    const after = new Date(bought.getTime() + ADJUSTMENT_CREDITS_TTL_MS + 1);
    // Expired: no usable credits, no routing through the paywall.
    expect(adjustmentCreditsRemaining(e, after)).toBe(0);
    expect(hasAdjustmentCredit(e, "calc-2", after)).toBe(false);
    expect(consumeAdjustmentCredit(e, "calc-2", after)).toBe(e);
    expect(destinationAfterStep5({ calculationStatus: "ok", entitlements: e, calculationId: "calc-2", now: after })).toBe("/betalvagg");
  });

  it("persists the expiry through parseEntitlements", () => {
    const bought = new Date("2026-01-01T12:00:00.000Z");
    const e = applyPurchase(EMPTY_ENTITLEMENTS, { status: "purchased", key: "singleReport" }, "calc-1", bought);
    const restored = parseEntitlements(JSON.parse(JSON.stringify(e)));
    expect(restored.adjustmentCredits).toBe(3);
    expect(restored.adjustmentCreditsExpiresISO).toBe(e.adjustmentCreditsExpiresISO);
    expect(adjustmentCreditsRemaining(restored, bought)).toBe(3);
  });

  it("a fresh purchase resets the expiry window", () => {
    const first = new Date("2026-01-01T12:00:00.000Z");
    const expired = new Date(first.getTime() + ADJUSTMENT_CREDITS_TTL_MS + 1);
    let e = applyPurchase(EMPTY_ENTITLEMENTS, { status: "purchased", key: "singleReport" }, "calc-1", first);
    expect(adjustmentCreditsRemaining(e, expired)).toBe(0);
    // A new purchase grants a fresh 24 h window from the new purchase time.
    e = applyPurchase(e, { status: "purchased", key: "singleReport" }, "calc-2", expired);
    expect(adjustmentCreditsRemaining(e, expired)).toBe(3);
    expect(hasAdjustmentCredit(e, "calc-3", expired)).toBe(true);
  });
});
