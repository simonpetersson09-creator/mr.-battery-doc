/**
 * PURCHASE TEST MODE — DEVELOPMENT ONLY.
 *
 * Lets a developer click through the whole purchase UI (paywall, settings,
 * restore, manage subscription, error states) without App Store products.
 *
 * HARD PRODUCTION GUARD
 * Every entry point below returns "off" unless `import.meta.env.DEV` is true.
 * In a production or App Store build:
 *   - `purchaseTestModeEnabled()` is always false
 *   - `selectPurchaseGateway()` can therefore never pick the test gateway
 *   - no simulated purchase, Premium grant, fake transaction or verification
 *     bypass exists at runtime, and the dev panel is never rendered.
 * The simulated flows also never touch Apple or our verification backend.
 */
import { EMPTY_ENTITLEMENTS, withPremium, type Entitlements } from "./entitlements";
import { ACCESS_STORAGE_KEY } from "./storageKey";
import type { VerificationRequest, VerificationResult } from "./serverVerification";

const CONFIG_KEY = "mr-battery-doc:dev:purchase-test:v1";

/** The build-time switch. Everything in this module is dead in production. */
export function isDevBuild(): boolean {
  return import.meta.env.DEV === true;
}

export type PurchaseScenario =
  | "success"
  | "cancelled"
  | "pending"
  | "failed"
  | "verificationRejected"
  | "verificationError";

export type RestoreScenario = "success" | "nothing" | "failed";
export type PremiumState = "off" | "active" | "expired";

export interface PurchaseTestConfig {
  enabled: boolean;
  report: PurchaseScenario;
  premium: PurchaseScenario;
  restore: RestoreScenario;
  /** Simulates "no products / StoreKit unavailable". */
  storeKitUnavailable: boolean;
}

export const DEFAULT_TEST_CONFIG: PurchaseTestConfig = {
  enabled: false,
  report: "success",
  premium: "success",
  restore: "success",
  storeKitUnavailable: false,
};

const listeners = new Set<() => void>();
let cache: PurchaseTestConfig | null = null;

function parse(raw: unknown): PurchaseTestConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_TEST_CONFIG;
  const o = raw as Record<string, unknown>;
  const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
    allowed.includes(v as T) ? (v as T) : fallback;
  return {
    enabled: o["enabled"] === true,
    report: pick(
      o["report"],
      ["success", "cancelled", "pending", "failed", "verificationRejected", "verificationError"],
      "success",
    ),
    premium: pick(
      o["premium"],
      ["success", "cancelled", "pending", "failed", "verificationRejected", "verificationError"],
      "success",
    ),
    restore: pick(o["restore"], ["success", "nothing", "failed"], "success"),
    storeKitUnavailable: o["storeKitUnavailable"] === true,
  };
}

export function getTestConfig(): PurchaseTestConfig {
  if (!isDevBuild()) return DEFAULT_TEST_CONFIG;
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    cache = raw ? parse(JSON.parse(raw)) : DEFAULT_TEST_CONFIG;
  } catch {
    cache = DEFAULT_TEST_CONFIG;
  }
  return cache;
}

export function setTestConfig(patch: Partial<PurchaseTestConfig>): PurchaseTestConfig {
  if (!isDevBuild()) return DEFAULT_TEST_CONFIG;
  const next = { ...getTestConfig(), ...patch };
  cache = next;
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l());
  return next;
}

export function subscribeTestConfig(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** True only in a development build where the tester switched the mode on. */
export function purchaseTestModeEnabled(): boolean {
  return isDevBuild() && getTestConfig().enabled;
}

/**
 * Simulated server verification. Mirrors the real verdicts so the production
 * verify-flow (which decides access and finishing) is exercised unchanged.
 */
export async function devVerifyPurchase(req: VerificationRequest): Promise<VerificationResult> {
  if (!isDevBuild()) return { status: "unavailable" };
  const cfg = getTestConfig();
  const scenario = req.key === "premiumYear" ? cfg.premium : cfg.report;
  if (scenario === "verificationRejected") return { status: "invalid", reason: "dev-test" };
  if (scenario === "verificationError") return { status: "unavailable" };
  return {
    status: "verified",
    premiumExpiresISO:
      req.key === "premiumYear"
        ? new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString()
        : null,
  };
}

/** Directly sets the cached Premium state so the UI can be inspected. */
export function setDevPremiumState(state: PremiumState): void {
  if (!isDevBuild()) return;
  let entitlements: Entitlements = EMPTY_ENTITLEMENTS;
  try {
    const raw = localStorage.getItem(ACCESS_STORAGE_KEY);
    if (raw) entitlements = JSON.parse(raw) as Entitlements;
  } catch {
    /* start from empty */
  }
  const next =
    state === "off"
      ? { ...entitlements, premium: { active: false, expiresISO: null } }
      : withPremium(
          entitlements,
          state === "active"
            ? new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString()
            : new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        );
  try {
    localStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
}

/** Wipes every simulated entitlement and resets the scenarios. */
export function resetPurchaseTestState(): void {
  if (!isDevBuild()) return;
  try {
    localStorage.removeItem(ACCESS_STORAGE_KEY);
  } catch {
    /* storage unavailable */
  }
  cache = null;
  try {
    localStorage.removeItem(CONFIG_KEY);
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l());
}
