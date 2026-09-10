import type { PurchaseGateway } from "../purchaseGateway";
import { createNativeGateway, nativePurchasePlugin } from "./native";
import { createMockGateway, mockPurchasesEnabled } from "./mock";
import { createDevTestGateway } from "./devTest";
import { purchaseTestModeEnabled } from "../devTestMode";
import { createWebGateway } from "./web";

/**
 * Native iOS when a StoreKit plugin has been registered by the app shell, the
 * development-only test gateway when Purchase Test Mode is switched on in a DEV
 * build, the unit-test mock only when explicitly enabled, otherwise the web
 * gateway — which cannot purchase anything.
 *
 * Both simulated gateways are unreachable in production: their guards require
 * `import.meta.env.DEV`.
 */
export function selectPurchaseGateway(): PurchaseGateway {
  const plugin = nativePurchasePlugin();
  if (plugin) return createNativeGateway(plugin);
  if (purchaseTestModeEnabled()) return createDevTestGateway();
  if (mockPurchasesEnabled()) return createMockGateway();
  return createWebGateway();
}
