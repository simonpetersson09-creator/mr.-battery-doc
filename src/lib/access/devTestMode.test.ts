/**
 * PURCHASE UI TEST MODE TESTS.
 *
 * Verifies every simulated purchase state and, most importantly, that the whole
 * mechanism is unreachable in a production build.
 */
import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  devVerifyPurchase,
  getTestConfig,
  purchaseTestModeEnabled,
  resetPurchaseTestState,
  setDevPremiumState,
  setTestConfig,
} from "./devTestMode";
import { createDevTestGateway } from "./gateways/devTest";
import { selectPurchaseGateway } from "./gateways";
import { PRODUCT_IDS } from "./products";
import { ACCESS_STORAGE_KEY } from "./storageKey";
import { isPremiumActive, parseEntitlements } from "./entitlements";
import { verifyPurchaseOutcome } from "./verifyFlow";

// Minimal in-memory storage: the suite runs in Node, without a browser.
const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
});

beforeEach(() => {
  localStorage.clear();
  resetPurchaseTestState();
  setTestConfig({ enabled: true });
});

describe("production guard", () => {
it("gates every entry point on import.meta.env.DEV", () => {
    const src = readFileSync(new URL("./devTestMode.ts", import.meta.url), "utf8");
    // The single build-time switch every exported function consults.
    expect(src).toContain("import.meta.env.DEV === true");
    for (const fn of [
      "export function getTestConfig",
      "export function setTestConfig",
      "export async function devVerifyPurchase",
      "export function setDevPremiumState",
      "export function resetPurchaseTestState",
    ]) {
      const body = src.slice(src.indexOf(fn));
      expect(body.slice(0, 200)).toContain("isDevBuild()");
    }
    expect(purchaseTestModeEnabled()).toBe(import.meta.env.DEV && getTestConfig().enabled);

    const panel = readFileSync(
      new URL("../../routes/installningar.tsx", import.meta.url),
      "utf8",
    );
    // The dev panel is only ever imported behind the DEV flag.
    expect(panel).toContain("import.meta.env.DEV");
  });

  it("selects the test gateway only while the tester enabled the mode", () => {
    setTestConfig({ enabled: false });
    expect(selectPurchaseGateway().kind).toBe("web");
    setTestConfig({ enabled: true });
    expect(selectPurchaseGateway().kind).toBe("mock");
  });
});

describe("simulated purchases", () => {
  it("returns a purchase carrying the real product id", async () => {
    const res = await createDevTestGateway().purchase("singleReport");
    expect(res.status).toBe("purchased");
    if (res.status !== "purchased") return;
    expect(res.productId).toBe(PRODUCT_IDS.singleReport);
    expect(res.transactionId).toBeTruthy();
  });

  it("reproduces cancelled, pending and failed outcomes", async () => {
    const gw = createDevTestGateway();
    setTestConfig({ report: "cancelled" });
    expect((await gw.purchase("singleReport")).status).toBe("cancelled");
    setTestConfig({ report: "pending" });
    expect((await gw.purchase("singleReport")).status).toBe("pending");
    setTestConfig({ report: "failed" });
    expect((await gw.purchase("singleReport")).status).toBe("failed");
  });

  it("reproduces StoreKit being unavailable", async () => {
    setTestConfig({ storeKitUnavailable: true });
    const gw = createDevTestGateway();
    expect((await gw.loadProducts()).status).toBe("failed");
    expect((await gw.purchase("premiumYear")).status).toBe("failed");
  });

  it("marks test prices so they cannot be mistaken for Apple prices", async () => {
    const res = await createDevTestGateway().loadProducts();
    if (res.status !== "ok") throw new Error("expected products");
    expect(res.products.every((p) => p.displayPrice.includes("TEST"))).toBe(true);
  });
});

describe("simulated verification", () => {
  it("grants access on success and denies it when rejected", async () => {
    const purchase = await createDevTestGateway().purchase("singleReport");
    if (purchase.status !== "purchased") throw new Error("expected purchase");

    const ok = await verifyPurchaseOutcome("singleReport", purchase, "calc-1", devVerifyPurchase);
    expect(ok.result.status).toBe("purchased");
    expect(ok.finishTransaction).toBe(true);

    setTestConfig({ report: "verificationRejected" });
    const bad = await verifyPurchaseOutcome("singleReport", purchase, "calc-1", devVerifyPurchase);
    expect(bad.result.status).toBe("failed");

    setTestConfig({ report: "verificationError" });
    const soft = await verifyPurchaseOutcome("singleReport", purchase, "calc-1", devVerifyPurchase);
    expect(soft.result.status).toBe("unresolved");
    expect(soft.finishTransaction).toBe(false);
  });
});

describe("restore scenarios", () => {
  it("covers restored, nothing and failed", async () => {
    const gw = createDevTestGateway();
    expect((await gw.restore()).status).toBe("restored");
    setTestConfig({ restore: "nothing" });
    expect((await gw.restore()).status).toBe("nothing");
    setTestConfig({ restore: "failed" });
    expect((await gw.restore()).status).toBe("failed");
  });
});

function stored() {
  return parseEntitlements(JSON.parse(localStorage.getItem(ACCESS_STORAGE_KEY) ?? "null"));
}

describe("premium test state", () => {
  it("can switch Premium on, expire it and reset everything", () => {
    setDevPremiumState("active");
    expect(isPremiumActive(stored())).toBe(true);

    setDevPremiumState("expired");
    expect(isPremiumActive(stored())).toBe(false);

    setDevPremiumState("active");
    resetPurchaseTestState();
    expect(localStorage.getItem(ACCESS_STORAGE_KEY)).toBeNull();
    expect(purchaseTestModeEnabled()).toBe(false);
  });
});
