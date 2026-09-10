/**
 * CORS allowlist for the public import endpoint.
 *
 * PRODUCTION only allows the origins that really call it:
 *   - the native Capacitor WebView (iosScheme "capacitor" -> capacitor://localhost)
 *   - the published web app
 * `http://localhost` is a LOCAL DEVELOPMENT origin only and is never allowed in
 * production. Nothing here is a wildcard.
 */

/** Native Capacitor WebView origins. Required on device — never remove. */
export const NATIVE_ORIGINS = [
  "capacitor://localhost",
  "ionic://localhost",
  "https://localhost",
] as const;

/** Published web front ends that may call the endpoint same-origin or cross-origin. */
export const PRODUCTION_WEB_ORIGINS = [
  "https://battery-buddy-wizard.lovable.app",
  "https://project--b7f0f8d1-5a20-4b22-82fc-43644c40e1a4.lovable.app",
  "https://id-preview--b7f0f8d1-5a20-4b22-82fc-43644c40e1a4.lovable.app",
] as const;

/** Dev-server origins. Development/preview builds only. */
export const DEVELOPMENT_ORIGINS = [
  "http://localhost",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
] as const;

export function allowedImportOrigins(isDevelopment: boolean): string[] {
  return [
    ...NATIVE_ORIGINS,
    ...PRODUCTION_WEB_ORIGINS,
    ...(isDevelopment ? DEVELOPMENT_ORIGINS : []),
  ];
}

export function isAllowedImportOrigin(origin: string | null, isDevelopment: boolean): boolean {
  return !!origin && allowedImportOrigins(isDevelopment).includes(origin);
}

/** Fallback keeps the native app working when a WebView omits the Origin header. */
export const DEFAULT_ALLOWED_ORIGIN = "capacitor://localhost";
