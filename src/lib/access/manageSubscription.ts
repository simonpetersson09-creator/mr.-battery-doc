/**
 * "Manage subscription".
 *
 * Native iOS: Apple's own management sheet when the StoreKit adapter exposes it,
 * otherwise the system subscriptions URL. Web: the normal Apple web page — never
 * a fake native navigation.
 */
import { MANAGE_SUBSCRIPTION_URL, openExternalUrl } from "@/lib/platform/runtime";
import { nativePurchasePlugin } from "./gateways/native";

/** How the request was handled, so the UI can explain itself instead of doing nothing. */
export type ManageSubscriptionResult = "native" | "external";

export async function openManageSubscription(): Promise<ManageSubscriptionResult> {
  const plugin = nativePurchasePlugin();
  if (plugin?.manageSubscriptions) {
    try {
      await plugin.manageSubscriptions();
      return "native";
    } catch {
      /* fall through to the URL */
    }
  }
  // Web/development: Apple's own page. Never a fake in-app navigation.
  openExternalUrl(MANAGE_SUBSCRIPTION_URL);
  return "external";
}
