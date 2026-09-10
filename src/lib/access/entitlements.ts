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
}

export const EMPTY_ENTITLEMENTS: Entitlements = {
  premium: { active: false, expiresISO: null },
  unlockedCalculations: [],
};

/** Keeps the stored list bounded — old calculations are no longer reachable anyway. */
const MAX_UNLOCKED = 50;

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
  return {
    premium: {
      active: premium["active"] === true,
      expiresISO: typeof premium["expiresISO"] === "string" ? (premium["expiresISO"] as string) : null,
    },
    unlockedCalculations: unlocked.slice(-MAX_UNLOCKED),
  };
}
