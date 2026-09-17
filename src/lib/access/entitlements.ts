/**
 * CENTRAL ACCESS LOGIC.
 *
 * One rule decides whether the result page and the PDF report may be shown:
 * active Premium, or this exact calculation has been unlocked by a one-off purchase.
 *
 * Pure data + pure functions — no StoreKit, no React, no side effects.
 */

export interface Entitlements {
  premium: {
    active: boolean;
    /** ISO date the subscription is paid through. null = unknown/never verified. */
    expiresISO: string | null;
  };
  /** Calculation ids unlocked by consumable purchases. */
  unlockedCalculations: string[];
  /** Free re-runs granted by a one-off report purchase. Premium ignores these. */
  adjustmentCredits: number;
  /** ISO time the adjustment credits expire. null = no credits / no expiry. */
  adjustmentCreditsExpiresISO: string | null;
}

export const EMPTY_ENTITLEMENTS: Entitlements = {
  premium: { active: false, expiresISO: null },
  unlockedCalculations: [],
  adjustmentCredits: 0,
  adjustmentCreditsExpiresISO: null,
};

/** Keeps the stored list bounded — old calculations are no longer reachable anyway. */
const MAX_UNLOCKED = 50;

/** Number of free re-runs adjustments a one-off report purchase grants. Premium ignores these. */
export const ADJUSTMENT_CREDITS_PER_PURCHASE = 3;

/** Adjustment credits expire this many milliseconds after the purchase. */
export const ADJUSTMENT_CREDITS_TTL_MS = 24 * 60 * 60 * 1000;

/** Effective remaining credits, treating an expired batch as zero. */
export function adjustmentCreditsRemaining(e: Entitlements, now: Date = new Date()): number {
  if (e.adjustmentCredits <= 0) return 0;
  if (!e.adjustmentCreditsExpiresISO) return 0;
  const expires = Date.parse(e.adjustmentCreditsExpiresISO);
  if (Number.isNaN(expires)) return 0;
  return expires > now.getTime() ? e.adjustmentCredits : 0;
}

export function isPremiumActive(e: Entitlements, now: Date = new Date()): boolean {
  if (!e.premium.active) return false;
  if (!e.premium.expiresISO) return true;
  const expires = Date.parse(e.premium.expiresISO);
  if (Number.isNaN(expires)) return true;
  return expires > now.getTime();
}

export function isCalculationUnlocked(e: Entitlements, calculationId: string): boolean {
  return e.unlockedCalculations.includes(calculationId);
}

/**
 * The single gate used by the result page and the PDF button.
 * A one-off purchase NEVER grants access to another calculation.
 */
export function hasResultAccess(
  e: Entitlements,
  calculationId: string,
  now: Date = new Date(),
): boolean {
  return isPremiumActive(e, now) || isCalculationUnlocked(e, calculationId);
}

export function withUnlockedCalculation(e: Entitlements, calculationId: string): Entitlements {
  if (isCalculationUnlocked(e, calculationId)) return e;
  return {
    ...e,
    unlockedCalculations: [...e.unlockedCalculations, calculationId].slice(-MAX_UNLOCKED),
  };
}

/**
 * A one-off report purchase: unlocks the purchased calculation AND grants a
 * fresh batch of adjustment credits (capped at ADJUSTMENT_CREDITS_PER_PURCHASE)
 * that expire ADJUSTMENT_CREDITS_TTL_MS after the purchase. Premium purchases
 * never touch adjustment credits.
 */
export function withPurchasedCalculation(
  e: Entitlements,
  calculationId: string,
  now: Date = new Date(),
): Entitlements {
  return {
    ...withUnlockedCalculation(e, calculationId),
    adjustmentCredits: ADJUSTMENT_CREDITS_PER_PURCHASE,
    adjustmentCreditsExpiresISO: new Date(now.getTime() + ADJUSTMENT_CREDITS_TTL_MS).toISOString(),
  };
}

/** True when the calculation is not otherwise open and the user has spare adjustment credits. */
export function hasAdjustmentCredit(
  e: Entitlements,
  calculationId: string,
  now: Date = new Date(),
): boolean {
  return (
    !isPremiumActive(e, now) &&
    !isCalculationUnlocked(e, calculationId) &&
    adjustmentCreditsRemaining(e, now) > 0
  );
}

/** Consumes one adjustment credit and unlocks the calculation. No-op when not eligible. */
export function consumeAdjustmentCredit(
  e: Entitlements,
  calculationId: string,
  now: Date = new Date(),
): Entitlements {
  if (!hasAdjustmentCredit(e, calculationId, now)) return e;
  return {
    ...e,
    adjustmentCredits: e.adjustmentCredits - 1,
    unlockedCalculations: [...e.unlockedCalculations, calculationId].slice(-MAX_UNLOCKED),
  };
}

export function withPremium(e: Entitlements, expiresISO: string | null): Entitlements {
  return { ...e, premium: { active: true, expiresISO } };
}

export function withoutPremium(e: Entitlements): Entitlements {
  return { ...e, premium: { active: false, expiresISO: null } };
}

/** Defensive parse of persisted entitlements — corrupt storage must never grant access. */
export function parseEntitlements(raw: unknown): Entitlements {
  if (!raw || typeof raw !== "object") return EMPTY_ENTITLEMENTS;
  const o = raw as Record<string, unknown>;
  const premium = (o["premium"] ?? {}) as Record<string, unknown>;
  const unlocked = Array.isArray(o["unlockedCalculations"])
    ? (o["unlockedCalculations"] as unknown[]).filter((v): v is string => typeof v === "string")
    : [];
  const adjustmentCredits =
    typeof o["adjustmentCredits"] === "number" && Number.isFinite(o["adjustmentCredits"])
      ? Math.max(0, Math.floor(o["adjustmentCredits"]))
      : 0;
  return {
    premium: {
      active: premium["active"] === true,
      expiresISO: typeof premium["expiresISO"] === "string" ? (premium["expiresISO"] as string) : null,
    },
    unlockedCalculations: unlocked.slice(-MAX_UNLOCKED),
    adjustmentCredits,
  };
}
