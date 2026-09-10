import type { PurchaseGateway } from "../purchaseGateway";
import { createNativeGateway, nativePurchasePlugin } from "./native";
import { createMockGateway, mockPurchasesEnabled } from "./mock";
import { createWebGateway } from "./web";

/**
 * Native iOS when a StoreKit plugin has been registered by the app shell,
 * the mock only in an explicitly enabled development build, otherwise the web
 * gateway — which cannot purchase anything.
 */
export function selectPurchaseGateway(): PurchaseGateway {
  const plugin = nativePurchasePlugin();
  if (plugin) return createNativeGateway(plugin);
  if (mockPurchasesEnabled()) return createMockGateway();
  return createWebGateway();
}
