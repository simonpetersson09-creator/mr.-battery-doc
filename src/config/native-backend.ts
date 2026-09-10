/**
 * Central native backend configuration.
 *
 * The frontend always ships inside the Capacitor bundle — we never set
 * `server.url` for the whole app. Only the few calls that genuinely need a server
 * (today: AI-assisted monthly import) are routed to a published HTTPS backend when
 * the app runs inside the native WebView.
 *
 * WEB    -> same-origin server function (unchanged).
 * NATIVE -> NATIVE_BACKEND_URL + a public HTTP endpoint.
 *
 * CONFIGURATION POINT: set VITE_NATIVE_BACKEND_URL to the published site origin,
 * e.g. https://project--<id>.lovable.app (no trailing slash), before building the
 * iOS release. Until it is set, native import fails with the normal, friendly
 * "could not read the document" message instead of crashing.
 */

import { isNativePlatform } from "@/lib/platform/runtime";

const configured = (import.meta.env["VITE_NATIVE_BACKEND_URL"] as string | undefined) ?? "";

/** Published HTTPS origin used by native builds. Empty string = not configured yet. */
export const NATIVE_BACKEND_URL = configured.replace(/\/+$/, "");

export function isNativeBackendConfigured(): boolean {
  return /^https:\/\//i.test(NATIVE_BACKEND_URL);
}

/**
 * Absolute URL for a public API path in native builds, or a same-origin relative
 * path on the web. Returns null when native has no backend configured.
 */
export function apiUrl(path: string): string | null {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  if (!isNativePlatform()) return suffix;
  return isNativeBackendConfigured() ? `${NATIVE_BACKEND_URL}${suffix}` : null;
}

/** The one public endpoint the native app calls. */
export const IMPORT_EXTRACT_PATH = "/api/public/extract-monthly";
