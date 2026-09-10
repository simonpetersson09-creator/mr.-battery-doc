/**
 * Platform-independent purchase interface.
 *
 * The paywall only ever talks to this interface, so native StoreKit, the browser
 * build and the test mock stay strictly separated.
 */
import type { ProductKey } from "./products";
import type { UnfinishedTransaction } from "./recovery";

export interface StoreProduct {
  key: ProductKey;
  productId: string;
  /** StoreKit's localized price string — the ONLY price the UI should display. */
  displayPrice: string;
}

export type PurchaseErrorCode =
  | "cancelled"
  | "network"
  | "products-unavailable"
  | "product-unavailable"
  | "verification"
  | "not-supported"
  | "unknown";

export type LoadProductsResult =
  | { status: "ok"; products: StoreProduct[] }
  | { status: "failed"; code: PurchaseErrorCode };

export type PurchaseResult =
  | {
      status: "purchased";
      key: ProductKey;
      premiumExpiresISO?: string | null;
      /** StoreKit transaction reference — required for server verification. */
      transactionId?: string;
      productId?: string;
      originalTransactionId?: string | null;
    }
  | { status: "cancelled" }
  | { status: "pending" }
  /** Paid but not (yet) server-verified: no access, recoverable on a later start. */
  | { status: "unresolved" }
  | { status: "failed"; code: PurchaseErrorCode };

export type RestoreResult =
  | { status: "restored"; premiumExpiresISO: string | null }
  | { status: "nothing" }
  | { status: "failed"; code: PurchaseErrorCode };

export interface PurchaseGateway {
  readonly kind: "native" | "web" | "mock";
  /**
   * True when every purchased transaction must be confirmed by our backend
   * against Apple before it grants anything. Always true for native StoreKit.
   */
  readonly requiresServerVerification?: boolean;
  loadProducts(): Promise<LoadProductsResult>;
  purchase(key: ProductKey): Promise<PurchaseResult>;
  /** Subscriptions only. A consumable report purchase is never restorable. */
  restore(): Promise<RestoreResult>;
  /** Unfinished StoreKit transactions to recover on start. Native only. */
  pendingTransactions?(): Promise<UnfinishedTransaction[]>;
  /** Acknowledges a recovered transaction. Native only. */
  finishTransaction?(transactionId: string): Promise<void>;
}

/**
 * IAP plugins report failures inconsistently: some throw, some return an error
 * object, some set a `userCancelled` flag on a normal result. Everything funnels
 * through here so a cancellation is never shown as an error — and an error is
 * never mistaken for a success.
 */
export function interpretPurchaseError(err: unknown): PurchaseErrorCode {
  if (!err) return "unknown";
  const o = err as Record<string, unknown>;
  if (o["userCancelled"] === true || o["userCanceled"] === true) return "cancelled";
  const code = String(o["code"] ?? o["errorCode"] ?? "").toUpperCase();
  const message = String(o["message"] ?? o["errorMessage"] ?? err).toLowerCase();
  if (code.includes("CANCEL") || message.includes("cancel")) return "cancelled";
  if (code.includes("NETWORK") || message.includes("network") || message.includes("offline"))
    return "network";
  if (code.includes("PRODUCT") || message.includes("product not") || message.includes("unavailable"))
    return "product-unavailable";
  if (
    code.includes("RECEIPT") ||
    code.includes("INVALID") ||
    message.includes("receipt") ||
    message.includes("verif")
  )
    return "verification";
  return "unknown";
}
