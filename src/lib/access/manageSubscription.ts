/**
 * "Manage subscription".
 *
 * Native iOS: Apple's own management sheet when the StoreKit adapter exposes it,
 * otherwise the system subscriptions URL. Web: the normal Apple web page — never
 * a fake native navigation.
 */
import { MANAGE_SUBSCRIPTION_URL, openExternalUrl } from "@/lib/platform/runtime";
import { nativePurchasePlugin } from "./gateways/native";

export async function openManageSubscription(): Promise<void> {
  const plugin = nativePurchasePlugin();
  if (plugin?.manageSubscriptions) {
    try {
      await plugin.manageSubscriptions();
      return;
    } catch {
      /* fall through to the URL */
    }
  }
  openExternalUrl(MANAGE_SUBSCRIPTION_URL);
}
