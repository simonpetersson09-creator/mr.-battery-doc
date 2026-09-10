/**
 * Runtime platform detection and external-link handling.
 *
 * The web bundle must NOT import @capacitor/core statically: the browser build
 * has no native bridge, and the paywall logic depends on the difference. We read
 * the global the Capacitor WebView injects instead, so this file works unchanged
 * in the browser, during SSR and inside the native shell.
 */

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
}

function capacitor(): CapacitorGlobal | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor ?? null;
}

/** True only inside a Capacitor native WebView (iOS/Android). */
export function isNativePlatform(): boolean {
  const cap = capacitor();
  return typeof cap?.isNativePlatform === "function" ? cap.isNativePlatform() === true : false;
}

/** "ios" | "android" | "web" */
export function platformName(): string {
  const cap = capacitor();
  return typeof cap?.getPlatform === "function" ? cap.getPlatform() : "web";
}

export function isIOS(): boolean {
  return platformName() === "ios";
}

/**
 * Opens an external URL. Inside the native WebView a plain in-app navigation would
 * replace the app with the web page (or dead-end the router), so we force the
 * system browser via a new window/target. On the web it is a normal new tab.
 */
export function openExternalUrl(url: string): void {
  if (typeof window === "undefined") return;
  if (isNativePlatform()) {
    // "_system" is honoured by the Capacitor WebView and hands off to Safari.
    window.open(url, "_system");
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Apple Standard EULA — required link target for App Store subscriptions. */
export const APPLE_STANDARD_EULA_URL =
  "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";

/** Apple's subscription management sheet. */
export const MANAGE_SUBSCRIPTION_URL = "https://apps.apple.com/account/subscriptions";
