import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor configuration for the native iOS shell of Mr. Battery Doc.
 *
 * IMPORTANT — `appId` below is a PLACEHOLDER. The real Bundle Identifier must be
 * decided together with the Apple Developer account and then replaced here AND in
 * Xcode (Signing & Capabilities). Nothing else in the app depends on this value.
 *
 * `webDir` points at the static SPA build produced by `bun run build:native`
 * (TanStack Start SPA mode, which emits dist/client/index.html).
 */
const config: CapacitorConfig = {
  appId: "com.todo.mrbatterydoc",
  appName: "Mr. Battery Doc",
  webDir: "dist/client",
  ios: {
    /* Matches --background so the native view never flashes white/black behind
       the WebView or during rubber-band scrolling. */
    backgroundColor: "#FDFBF4",
    /* "never": the web layer handles safe areas itself via env(safe-area-inset-*),
       otherwise iOS adds a second inset on top and we get a visible band. */
    contentInset: "never",
    limitsNavigationsToAppBoundDomains: false,
  },
  server: {
    // App content is bundled — no remote server URL in production builds.
    androidScheme: "https",
    iosScheme: "capacitor",
  },
};

export default config;
