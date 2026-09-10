/**
 * Browser / development build.
 *
 * There is no App Store here, so there is NO purchase and never a fake unlock.
 * The paywall renders, explains that purchases happen in the iOS app and offers
 * no way past the gate.
 */
import type { PurchaseGateway } from "../purchaseGateway";

export function createWebGateway(): PurchaseGateway {
  return {
    kind: "web",
    async loadProducts() {
      return { status: "failed", code: "not-supported" };
    },
    async purchase() {
      return { status: "failed", code: "not-supported" };
    },
    async restore() {
      return { status: "failed", code: "not-supported" };
    },
  };
}
