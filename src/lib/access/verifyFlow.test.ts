import { describe, expect, it, vi } from "vitest";
import { verifyPurchaseOutcome, verifyUnfinishedTransactions } from "./verifyFlow";
import { PRODUCT_IDS, productKeyForId } from "./products";
import type { VerificationResult } from "./serverVerification";

const verifier = (result: VerificationResult) => vi.fn(async () => result);

const purchased = {
  status: "purchased" as const,
  key: "singleReport" as const,
  transactionId: "tx-1",
  productId: PRODUCT_IDS.singleReport,
  originalTransactionId: null,
};

describe("server-verified purchase flow", () => {
  it("unlocks only after the backend verifies the transaction", async () => {
    const verify = verifier({ status: "verified" });
    const out = await verifyPurchaseOutcome("singleReport", purchased, "calc-1", verify);
    expect(out.result.status).toBe("purchased");
    expect(out.finishTransaction).toBe(true);
    expect(verify).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: PRODUCT_IDS.singleReport,
        transactionId: "tx-1",
        calculationId: "calc-1",
      }),
    );
  });

  it("never unlocks or finishes a rejected transaction", async () => {
    const out = await verifyPurchaseOutcome(
      "singleReport",
      purchased,
      "calc-1",
      verifier({ status: "invalid", reason: "not-found" } as VerificationResult),
    );
    expect(out.result).toEqual({ status: "failed", code: "verification" });
    expect(out.finishTransaction).toBe(false);
  });

  it("keeps an unverifiable purchase recoverable without granting access", async () => {
    for (const status of ["unavailable", "config-required"] as const) {
      const out = await verifyPurchaseOutcome(
        "premiumYear",
        { ...purchased, key: "premiumYear", productId: PRODUCT_IDS.premiumYear },
        "calc-1",
        verifier({ status } as VerificationResult),
      );
      expect(out.result.status).toBe("unresolved");
      expect(out.finishTransaction).toBe(false);
    }
  });

  it("cannot verify a purchase without a transaction id", async () => {
    const verify = verifier({ status: "verified" });
    const out = await verifyPurchaseOutcome(
      "singleReport",
      { status: "purchased", key: "singleReport" },
      "calc-1",
      verify,
    );
    expect(out.result.status).toBe("unresolved");
    expect(verify).not.toHaveBeenCalled();
  });

  it("passes cancelled, pending and failed through untouched", async () => {
    const verify = verifier({ status: "verified" });
    for (const result of [
      { status: "cancelled" as const },
      { status: "pending" as const },
      { status: "failed" as const, code: "network" as const },
    ]) {
      const out = await verifyPurchaseOutcome("singleReport", result, "calc-1", verify);
      expect(out.result).toEqual(result);
      expect(out.finishTransaction).toBe(false);
    }
    expect(verify).not.toHaveBeenCalled();
  });

  it("marks recovered transactions verified only on an explicit server verdict", async () => {
    const verify = vi.fn(async (req: { transactionId: string }) =>
      req.transactionId === "good"
        ? ({ status: "verified" } as VerificationResult)
        : ({ status: "unavailable" } as VerificationResult),
    );
    const out = await verifyUnfinishedTransactions(
      [
        { transactionId: "good", productId: PRODUCT_IDS.singleReport },
        { transactionId: "bad", productId: PRODUCT_IDS.premiumYear },
        { transactionId: "alien", productId: "com.other.product" },
      ],
      "calc-9",
      verify,
      productKeyForId,
    );
    expect(out.map((t) => t.verified)).toEqual([true, false, false]);
  });

  it("treats a thrown verifier as unavailable, never as verified", async () => {
    const out = await verifyUnfinishedTransactions(
      [{ transactionId: "tx", productId: PRODUCT_IDS.premiumYear }],
      "",
      vi.fn(async () => {
        throw new Error("offline");
      }),
      productKeyForId,
    );
    expect(out[0]!.verified).toBe(false);
  });
});
