import { describe, expect, it } from "vitest";
import {
  GOOGLE_PLAY_PACKAGE_NAME,
  evaluateProductPurchase,
  evaluateSubscription,
  readGoogleConfig,
} from "./googlePlayServer.server";

const ONE = "com.mrbatterydoc.calculation.unlock";
const SUB = "com.mrbatterydoc.premium.yearly";
const future = new Date(Date.now() + 86_400_000).toISOString();

describe("Google Play verification rules", () => {
  it("uses the Mr Battery Doc package", () => {
    expect(GOOGLE_PLAY_PACKAGE_NAME).toBe("se.shiningdays.mrbatterydoc");
  });
  it("needs a service account", () => {
    expect(readGoogleConfig({}).ok).toBe(false);
    expect(readGoogleConfig({ GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: "{bad" }).ok).toBe(false);
  });
  it("one-time: purchased verifies, pending/cancelled/consumed-elsewhere do not", () => {
    expect(evaluateProductPurchase({ purchaseState: 0, consumptionState: 0 }, ONE, false).status).toBe("verified");
    expect(evaluateProductPurchase({ purchaseState: 2 }, ONE, false).status).toBe("unavailable");
    expect(evaluateProductPurchase({ purchaseState: 1 }, ONE, false).status).toBe("invalid");
    expect(evaluateProductPurchase({ purchaseState: 0, consumptionState: 1 }, ONE, false).status).toBe("invalid");
    expect(evaluateProductPurchase({ purchaseState: 0, consumptionState: 1 }, ONE, true).status).toBe("verified");
    expect(evaluateProductPurchase({ purchaseState: 0 }, SUB, false).status).toBe("invalid");
  });
  it("subscription: active with future expiry verifies; expired/wrong plan do not", () => {
    const item = { productId: SUB, expiryTime: future, offerDetails: { basePlanId: "yearly" } };
    const ok = evaluateSubscription({ subscriptionState: "SUBSCRIPTION_STATE_ACTIVE", lineItems: [item] }, SUB);
    expect(ok).toEqual({ status: "verified", premiumExpiresISO: future });
    expect(evaluateSubscription({ subscriptionState: "SUBSCRIPTION_STATE_EXPIRED", lineItems: [item] }, SUB).status).toBe("invalid");
    expect(evaluateSubscription({ subscriptionState: "SUBSCRIPTION_STATE_PENDING", lineItems: [item] }, SUB).status).toBe("unavailable");
    expect(
      evaluateSubscription(
        { subscriptionState: "SUBSCRIPTION_STATE_ACTIVE", lineItems: [{ ...item, offerDetails: { basePlanId: "monthly" } }] },
        SUB,
      ).status,
    ).toBe("invalid");
    expect(evaluateSubscription({ subscriptionState: "SUBSCRIPTION_STATE_ACTIVE", lineItems: [item] }, ONE).status).toBe("invalid");
  });
});
