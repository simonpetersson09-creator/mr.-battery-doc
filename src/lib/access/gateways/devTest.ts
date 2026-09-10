/**
 * DEVELOPMENT-ONLY purchase gateway.
 *
 * Produces the StoreKit outcomes a tester selects in the purchase test panel,
 * so the paywall, settings, error states and access rules can be clicked
 * through without App Store products.
 *
 * It is never selected in a production build: `selectPurchaseGateway` only
 * reaches it when `purchaseTestModeEnabled()` is true, which requires
 * `import.meta.env.DEV`.
 */
import { PRODUCT_IDS, type ProductKey } from "../products";
import type {
  LoadProductsResult,
  PurchaseGateway,
  PurchaseResult,
  RestoreResult,
} from "../purchaseGateway";
import { getTestConfig, isDevBuild, type PurchaseScenario } from "../devTestMode";

/** Clearly marked as fake so a test price can never be mistaken for Apple's. */
const TEST_PRICES: Record<ProductKey, string> = {
  singleReport: "49,00 kr (TEST)",
  premiumYear: "199,00 kr/år (TEST)",
};

function outcome(key: ProductKey, scenario: PurchaseScenario): PurchaseResult {
  switch (scenario) {
    case "cancelled":
      return { status: "cancelled" };
    case "pending":
      return { status: "pending" };
    case "failed":
      return { status: "failed", code: "network" };
    // Both verification scenarios look like a normal StoreKit success here; the
    // simulated verification step downgrades them, exactly like production.
    default:
      return {
        status: "purchased",
        key,
        transactionId: `dev-${key}-${Date.now()}`,
        productId: PRODUCT_IDS[key],
        originalTransactionId: null,
        premiumExpiresISO: null,
      };
  }
}

export function createDevTestGateway(): PurchaseGateway {
  return {
    kind: "mock",
    // The simulated purchases still travel through the real verify-flow.
    requiresServerVerification: true,

    async loadProducts(): Promise<LoadProductsResult> {
      const cfg = getTestConfig();
      if (cfg.storeKitUnavailable) return { status: "failed", code: "products-unavailable" };
      return {
        status: "ok",
        products: (Object.keys(PRODUCT_IDS) as ProductKey[]).map((key) => ({
          key,
          productId: PRODUCT_IDS[key],
          displayPrice: TEST_PRICES[key],
        })),
      };
    },

    async purchase(key: ProductKey): Promise<PurchaseResult> {
      const cfg = getTestConfig();
      if (cfg.storeKitUnavailable) return { status: "failed", code: "product-unavailable" };
      // A short delay so loading states and double-tap blocking are visible.
      await new Promise((r) => setTimeout(r, 350));
      return outcome(key, key === "premiumYear" ? cfg.premium : cfg.report);
    },

    async restore(): Promise<RestoreResult> {
      const cfg = getTestConfig();
      await new Promise((r) => setTimeout(r, 350));
      if (cfg.storeKitUnavailable) return { status: "failed", code: "not-supported" };
      // Consumable report purchases are deliberately NOT restorable — Apple
      // cannot restore them either.
      if (cfg.restore === "nothing") return { status: "nothing" };
      if (cfg.restore === "failed") return { status: "failed", code: "network" };
      return {
        status: "restored",
        premiumExpiresISO: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
      };
    },
  };
}

/** Guard used by the gateway selector; false in every production build. */
export function devTestGatewayAvailable(): boolean {
  return isDevBuild();
}
