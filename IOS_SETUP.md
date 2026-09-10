# Mr. Battery Doc — iOS / Capacitor foundation

Status: native shell prepared, **no real in-app purchases implemented**.

## Build flow

```bash
bun run build          # normal web build (SSR, unchanged)
bun run build:native   # static SPA build → dist/client/index.html
bun run sync:ios       # build:native + cap sync ios
bun run open:ios       # opens ios/App/App.xcworkspace in Xcode (macOS only)
```

`CAPACITOR_BUILD=1` switches TanStack Start to SPA mode so the whole app is a
static bundle the WebView can boot offline. Client-side routing works, and a
cold start / refresh always lands on the SPA shell (no 404).

## iOS project

- `ios/` created with `npx cap add ios` (Capacitor 8).
- Display name: **Mr. Battery Doc** (`CFBundleDisplayName`).
- Bundle Identifier: `com.todo.mrbatterydoc` — **PLACEHOLDER, must be replaced**
  in `capacitor.config.ts` and in Xcode → Signing & Capabilities.
- Deployment target: iOS 15.0. Version 1.0, build 1.
- Orientation: portrait only (mobile-first UI).
- Info.plist contains **no permission keys** — the app needs none. File/image
  import uses the WebView file picker, which requires no Info.plist entitlement.
- No signing team configured (none available in this project).
- App icon / launch screen: Capacitor defaults — real assets still to be added.

## Purchases (not implemented)

The platform-independent layer already exists:

- `src/lib/access/products.ts` — the only place product IDs live (placeholders).
- `src/lib/access/gateways/{index,native,web,mock}.ts` — gateway selection.
- `src/lib/platform/runtime.ts` — `isNativePlatform()` / `openExternalUrl()`.

The native gateway is only selected when the iOS shell registers an adapter via
`registerNativePurchasePlugin()`. Browser builds therefore can never purchase or
fake an entitlement.

**Recommended StoreKit solution:** `@capacitor-community/in-app-purchases`
(thin StoreKit 2 wrapper, no backend, no vendor account) is the best fit if we
keep entitlements on-device as today. If we later need server-side receipt
validation, cross-device restore and subscription analytics, RevenueCat
(`@revenuecat/purchases-capacitor`) is the stronger option but adds a vendor and
a backend dependency. **No plugin installed yet — decision pending.**

Remaining before real purchases:
1. Apple Developer account + final Bundle Identifier.
2. Real product IDs created in App Store Connect (consumable + yearly auto-renewable).
3. Choose plugin (see above), install, implement the adapter, register on startup.
4. Public Terms / Privacy URLs (App Store requires reachable URLs for subscriptions).

## Known native limitation

`src/lib/import/extractMonthly.functions.ts` (AI-assisted image/PDF import) is a
server function. In the static native bundle it has no server to call, so image
and PDF import must be pointed at the hosted API base URL before release. CSV/TSV
import, the engine, history and PDF generation are fully client-side and work
offline.
