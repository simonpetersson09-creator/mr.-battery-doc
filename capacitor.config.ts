import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor configuration for the native iOS shell of Mr. Battery Doc.
 *
 * `appId` is the real App Store Bundle Identifier and must stay identical to
 * PRODUCT_BUNDLE_IDENTIFIER in Xcode and to APPLE_BUNDLE_ID on the server, since
 * Apple validates purchases against it.
 *
 * `webDir` points at capacitor-www/, the locally packaged SPA bundle produced by
 * `bun run build:native`. The entire UI ships inside the app; no remote frontend.
 */
const config: CapacitorConfig = {
  appId: "se.shiningdays.mrbatterydoc",
  appName: "Mr. Battery Doc",
  webDir: "capacitor-www",
  /* App background painted by the native container behind the WebView. */
  backgroundColor: "#FDFBF4",
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
