/**
 * TEST-ONLY gateway.
 *
 * It is never selected automatically. `selectPurchaseGateway` only considers it
 * when the build is a development build AND the mock has been enabled explicitly,
 * so a production bundle can never reach a fake purchase.
 */
import { PRODUCT_IDS, type ProductKey } from "../products";
import type {
  LoadProductsResult,
  PurchaseGateway,
  PurchaseResult,
  RestoreResult,
} from "../purchaseGateway";

export interface MockGatewayScript {
  products?: LoadProductsResult;
  purchase?: (key: ProductKey) => PurchaseResult | Promise<PurchaseResult>;
  restore?: RestoreResult;
}

export function createMockGateway(script: MockGatewayScript = {}): PurchaseGateway {
  return {
    kind: "mock",
    async loadProducts() {
      return (
        script.products ?? {
          status: "ok",
          products: (Object.keys(PRODUCT_IDS) as ProductKey[]).map((key) => ({
            key,
            productId: PRODUCT_IDS[key],
            displayPrice: key === "premiumYear" ? "199,00 kr" : "49,00 kr",
          })),
        }
      );
    },
    async purchase(key) {
      if (!script.purchase) return { status: "failed", code: "unknown" };
      return script.purchase(key);
    },
    async restore() {
      return script.restore ?? { status: "nothing" };
    },
  };
}

let mockEnabled = false;

/** Development builds only — a no-op in production. */
export function enableMockPurchases(enabled: boolean): void {
  if (!import.meta.env.DEV) return;
  mockEnabled = enabled;
}

export function mockPurchasesEnabled(): boolean {
  return import.meta.env.DEV && mockEnabled;
}
