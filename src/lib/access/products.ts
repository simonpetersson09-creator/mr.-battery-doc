/**
 * CENTRAL PRODUCT CONFIGURATION.
 *
 * The App Store product identifiers live here and NOWHERE else. Components and
 * gateways must always refer to a product by its key ("singleReport" /
 * "premiumYear"), never by a hardcoded identifier string.
 *
 * The identifiers below are the decided App Store Connect ids. They must exist
 * with exactly these strings in App Store Connect; until a StoreKit fetch has
 * verified that, `APP_STORE_CONNECT_CONFIRMED` stays false.
 */

export type ProductKey = "singleReport" | "premiumYear";

export const PRODUCT_IDS: Record<ProductKey, string> = {
  /** Consumable — unlocks ONE finished calculation + its PDF report. */
  singleReport: "com.mrbatterydoc.calculation.unlock",
  /** Auto-renewable subscription, 1 year — unlimited calculations and reports. */
  premiumYear: "com.mrbatterydoc.premium.yearly",
};

/** Product types as they must be created in App Store Connect. */
export const PRODUCT_TYPES: Record<ProductKey, "consumable" | "auto-renewable-subscription"> = {
  singleReport: "consumable",
  premiumYear: "auto-renewable-subscription",
};

/**
 * Intended Swedish price levels. These are NOT display prices — StoreKit's
 * localized price is the source of truth whenever native IAP is available.
 * Used only as a fallback label when no store products could be loaded.
 */
export const INTENDED_PRICES: Record<ProductKey, { amount: number; currency: string }> = {
  singleReport: { amount: 49, currency: "SEK" },
  premiumYear: { amount: 199, currency: "SEK" },
};

/**
 * Flip to true ONLY once both identifiers have been fetched successfully from
 * StoreKit against real App Store Connect products. The paywall never shows the
 * intended prices to users — it shows a neutral loading label until Apple's own
 * localized price arrives.
 */
export const APP_STORE_CONNECT_CONFIRMED = false;

/**
 * Subscription group name for the yearly plan — DOCUMENTATION/CONFIG ONLY.
 * No purchase, entitlement or recovery logic may branch on this human name;
 * runtime always identifies products by the explicit product ids above.
 */
export const PREMIUM_SUBSCRIPTION_GROUP = "Mr Battery Doc Premium";

export const PRODUCTS_CONFIGURED = APP_STORE_CONNECT_CONFIRMED;

/* ------------------------------------------------------------------------- *
 * GOOGLE PLAY (Android) — PLACEHOLDER CONFIGURATION.
 *
 * The Apple ids above are untouched. Google Play uses the same product id
 * strings (they are valid Play product ids), so every platform-independent
 * lookup (`productKeyForId`, entitlement rules) keeps working unchanged.
 * Create them in Play Console with exactly these ids:
 *   - singleReport -> in-app product (one-time, consumed after delivery)
 *   - premiumYear  -> subscription with one auto-renewing yearly base plan
 * ------------------------------------------------------------------------- */
export const GOOGLE_PLAY_PRODUCT_IDS: Record<ProductKey, string> = { ...PRODUCT_IDS };

/** Base plan id of the yearly Premium subscription in Play Console (placeholder). */
export const GOOGLE_PLAY_PREMIUM_BASE_PLAN_ID = "yearly";

/**
 * Master switch for Google Play purchases. Stays false until server-side Google
 * Play verification exists: without it no Android purchase could ever be
 * verified, so the Android app keeps purchasing disabled instead of charging a
 * customer who then gets nothing.
 */
export const GOOGLE_PLAY_BILLING_ENABLED = false;

export function productKeyForId(productId: string): ProductKey | null {
  const hit = (Object.keys(PRODUCT_IDS) as ProductKey[]).find(
    (key) => PRODUCT_IDS[key] === productId,
  );
  return hit ?? null;
}
