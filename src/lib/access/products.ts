/**
 * CENTRAL PRODUCT CONFIGURATION.
 *
 * The App Store product identifiers live here and NOWHERE else. Components and
 * gateways must always refer to a product by its key ("singleReport" /
 * "premiumYear"), never by a hardcoded identifier string.
 *
 * The identifiers below are the LIVE App Store Connect ids, created with exactly
 * these strings. StoreKit's localized price is always the authoritative price.
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
 * Both identifiers above are now created in App Store Connect with exactly
 * these strings (consumable 49 SEK, auto-renewable yearly 199 SEK in Sweden).
 * StoreKit's localized price is always the authoritative price; the intended
 * prices above are only used as a fallback label before StoreKit answers.
 */
export const APP_STORE_CONNECT_CONFIRMED = true;

/** Subscription group name for the yearly plan — must match App Store Connect. */
export const PREMIUM_SUBSCRIPTION_GROUP = "Mr Battery Doc Premium";

export const PRODUCTS_CONFIGURED = APP_STORE_CONNECT_CONFIRMED;

export function productKeyForId(productId: string): ProductKey | null {
  const hit = (Object.keys(PRODUCT_IDS) as ProductKey[]).find(
    (key) => PRODUCT_IDS[key] === productId,
  );
  return hit ?? null;
}
