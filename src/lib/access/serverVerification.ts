/**
 * SERVER-SIDE PURCHASE VERIFICATION — client side of the contract.
 *
 * No Apple secret ever lives in the app bundle. The app sends only the StoreKit
 * transaction reference; the backend (same native backend base URL as the AI
 * import) does the signed verification against Apple.
 *
 * Until the Apple credentials exist on the server the endpoint answers
 * `config-required`. That is NOT a grant and NOT a denial: local StoreKit
 * verification remains the gate, exactly as today.
 */
import { apiUrl } from "@/config/native-backend";
import type { ProductKey } from "./products";

export const VERIFY_PURCHASE_PATH = "/api/public/verify-purchase";

export interface VerificationRequest {
  key: ProductKey;
  productId: string;
  transactionId: string;
  originalTransactionId?: string | null;
  /** Consumable only: the calculation the purchase pays for. */
  calculationId?: string;
  /** StoreKit 2 signed transaction (JWS). Never a receipt secret. */
  signedTransaction?: string;
}

export type VerificationResult =
  | { status: "verified"; premiumExpiresISO: string | null }
  | { status: "invalid"; reason: string }
  | { status: "config-required" }
  | { status: "unavailable" };

export function isVerificationBlocking(result: VerificationResult): boolean {
  return result.status === "invalid";
}

export async function verifyPurchaseWithServer(
  req: VerificationRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<VerificationResult> {
  const url = apiUrl(VERIFY_PURCHASE_PATH);
  if (!url) return { status: "unavailable" };
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    const body = (await res.json()) as { status?: string; premiumExpiresISO?: string | null; reason?: string };
    if (body.status === "verified")
      return { status: "verified", premiumExpiresISO: body.premiumExpiresISO ?? null };
    if (body.status === "invalid") return { status: "invalid", reason: body.reason ?? "invalid" };
    if (body.status === "config-required") return { status: "config-required" };
    return { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}
