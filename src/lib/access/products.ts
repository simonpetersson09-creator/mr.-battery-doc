/**
 * CENTRAL PRODUCT CONFIGURATION.
 *
 * The App Store product identifiers live here and NOWHERE else. Components and
 * gateways must always refer to a product by its key ("singleReport" /
 * "premiumYear"), never by a hardcoded identifier string.
 *
 * The identifiers below are PLACEHOLDERS. The final IDs must be decided and
 * created in App Store Connect; until then `PRODUCTS_CONFIGURED` is false and
 * the paywall never claims a native price.
 */

export type ProductKey = "singleReport" | "premiumYear";

export const PRODUCT_IDS: Record<ProductKey, string> = {
  /** Consumable — unlocks ONE finished calculation + its PDF report. */
  singleReport: "TODO.appstore.product.single-report",
  /** Auto-renewable subscription, 1 year — unlimited calculations and reports. */
  premiumYear: "TODO.appstore.product.premium.yearly",
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

const PLACEHOLDER_PREFIX = "TODO.";

/** false while the placeholders above have not been replaced with real IDs. */
export const PRODUCTS_CONFIGURED = Object.values(PRODUCT_IDS).every(
  (id) => !id.startsWith(PLACEHOLDER_PREFIX),
);

export function productKeyForId(productId: string): ProductKey | null {
  const hit = (Object.keys(PRODUCT_IDS) as ProductKey[]).find(
    (key) => PRODUCT_IDS[key] === productId,
  );
  return hit ?? null;
}
