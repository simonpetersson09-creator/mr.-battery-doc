/**
 * "Manage subscription".
 *
 * Native: the store's own management sheet when the adapter exposes it
 * (Apple on iOS, Google Play on Android), otherwise the store's subscriptions
 * URL. Web: Apple's web page as before — never a fake native navigation.
 */
import { manageSubscriptionUrl, openExternalUrl } from "@/lib/platform/runtime";
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
  openExternalUrl(manageSubscriptionUrl());
  return "external";
}
