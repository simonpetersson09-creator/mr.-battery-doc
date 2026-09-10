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

export function productKeyForId(productId: string): ProductKey | null {
  const hit = (Object.keys(PRODUCT_IDS) as ProductKey[]).find(
    (key) => PRODUCT_IDS[key] === productId,
  );
  return hit ?? null;
}
