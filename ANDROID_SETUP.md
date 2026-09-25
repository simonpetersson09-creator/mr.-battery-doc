# Mr. Battery Doc — Android / Google Play

Status: Android shell added. **Google Play purchases are prepared but switched off**
(`GOOGLE_PLAY_BILLING_ENABLED = false` in `src/lib/access/products.ts`) until
server-side Google Play verification exists. The iOS app and Apple purchases are unchanged.

## Build locally
Requires Android Studio (includes JDK 21 + Android SDK).

```bash
bun install
bun run sync:android   # builds capacitor-www/ and runs cap sync android
bun run open:android   # opens android/ in Android Studio
```
Run on a device/emulator from Android Studio. For Play: Build → Generate Signed App Bundle (.aab).

## Identity
- applicationId / package: `se.shiningdays.mrbatterydoc` (same as iOS Bundle ID)
- App name: Mr. Battery Doc, portrait only
- Permissions: INTERNET, `com.android.vending.BILLING` (added by cordova-plugin-purchase)

## Purchases
- Same product ids as iOS (valid on Play): `com.mrbatterydoc.calculation.unlock`
  (in-app product, consumed) and `com.mrbatterydoc.premium.yearly` (subscription,
  base plan `yearly` — `GOOGLE_PLAY_PREMIUM_BASE_PLAN_ID`).
- Store selection: `initNativeStore()` → StoreKit on iOS, Google Play on Android.
- Store wording on Android: `src/i18n/platformCopy.ts`.
- Manage subscription on Android opens Google Play's subscription page.

## Still missing before enabling purchases
1. Server-side Google Play verification (Google service account) — not started.
2. Products created and active in Play Console.
3. Set `GOOGLE_PLAY_BILLING_ENABLED = true`.
4. Real app icons/splash for Android (Capacitor defaults today).
