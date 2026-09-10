/**
 * SERVER-VERIFIED PURCHASE FLOW.
 *
 * StoreKit alone never grants access. Every purchased transaction — fresh or
 * recovered — is sent to /api/public/verify-purchase, which checks it against
 * Apple's App Store Server API. Only a `verified` verdict unlocks anything.
 *
 * Mapping (mandated):
 *   purchased + verified          -> purchased
 *   user cancelled                -> cancelled
 *   pending / Ask to Buy          -> pending
 *   StoreKit error                -> failed
 *   verification unavailable      -> unresolved (recoverable, no access)
 *   verification rejected         -> failed / verification (no access)
 *
 * Pure orchestration: the verifier is injected, so this file has no network,
 * no StoreKit and no React.
 */
import type { ProductKey } from "./products";
import type { PurchaseResult } from "./purchaseGateway";
import type { UnfinishedTransaction } from "./recovery";
import type { VerificationRequest, VerificationResult } from "./serverVerification";

export type Verifier = (req: VerificationRequest) => Promise<VerificationResult>;

export interface VerifiedPurchase {
  /** The outcome the UI reacts to. */
  result: PurchaseResult;
  /** True only when the transaction may be finished (access is granted). */
  finishTransaction: boolean;
}

/**
 * Applies server verification to a StoreKit purchase outcome.
 * Non-purchased outcomes pass through untouched and never finish a transaction.
 */
export async function verifyPurchaseOutcome(
  key: ProductKey,
  result: PurchaseResult,
  calculationId: string,
  verify: Verifier,
): Promise<VerifiedPurchase> {
  if (result.status !== "purchased") return { result, finishTransaction: false };

  // A purchased result without a transaction reference cannot be verified and
  // therefore cannot grant access.
  if (!result.transactionId) {
    return { result: { status: "unresolved" }, finishTransaction: false };
  }

  const verdict = await verify({
    key,
    productId: result.productId ?? "",
    transactionId: result.transactionId,
    originalTransactionId: result.originalTransactionId ?? null,
    ...(key === "singleReport" ? { calculationId } : {}),
  });

  if (verdict.status === "verified") {
    return {
      result: {
        ...result,
        premiumExpiresISO: verdict.premiumExpiresISO ?? result.premiumExpiresISO ?? null,
      },
      // Finish only after the caller has stored the entitlement.
      finishTransaction: true,
    };
  }
  if (verdict.status === "invalid") {
    return { result: { status: "failed", code: "verification" }, finishTransaction: false };
  }
  // config-required / unavailable: temporary, recoverable, never a grant.
  return { result: { status: "unresolved" }, finishTransaction: false };
}

/**
 * Server-verifies unfinished transactions before recovery decides anything.
 * Anything the server does not explicitly verify comes back `verified: false`,
 * which recovery treats as "keep, do not unlock".
 */
export async function verifyUnfinishedTransactions(
  transactions: UnfinishedTransaction[],
  intentCalculationId: string,
  verify: Verifier,
  productKeyForId: (productId: string) => ProductKey | null,
): Promise<UnfinishedTransaction[]> {
  const out: UnfinishedTransaction[] = [];
  for (const tx of transactions) {
    const key = productKeyForId(tx.productId);
    if (!key) {
      out.push({ ...tx, verified: false });
      continue;
    }
    let verdict: VerificationResult;
    try {
      verdict = await verify({
        key,
        productId: tx.productId,
        transactionId: tx.transactionId,
        ...(key === "singleReport" ? { calculationId: intentCalculationId } : {}),
      });
    } catch {
      verdict = { status: "unavailable" };
    }
    out.push({
      ...tx,
      verified: verdict.status === "verified",
      expiresISO:
        verdict.status === "verified"
          ? (verdict.premiumExpiresISO ?? tx.expiresISO ?? null)
          : (tx.expiresISO ?? null),
    });
  }
  return out;
}
