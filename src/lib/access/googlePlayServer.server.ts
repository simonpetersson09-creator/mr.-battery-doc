/**
 * Google Play purchase verification (server side only) — Google Play Developer API.
 *
 * Credentials come from the server environment ONLY:
 *   GOOGLE_PLAY_SERVICE_ACCOUNT_JSON — the full JSON key of a Google Cloud
 *   service account that has been granted access in Play Console.
 * Nothing here may be imported from client code. No credential value is logged.
 */
import { GOOGLE_PLAY_PREMIUM_BASE_PLAN_ID, GOOGLE_PLAY_PRODUCT_IDS } from "./products";

export const GOOGLE_PLAY_PACKAGE_NAME = "se.shiningdays.mrbatterydoc";
const SCOPE = "https://www.googleapis.com/auth/androidpublisher";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications";

export interface GoogleConfig {
  clientEmail: string;
  privateKeyPem: string;
}

export function readGoogleConfig(
  env: Record<string, string | undefined> = process.env,
): { ok: true; config: GoogleConfig } | { ok: false } {
  const raw = env["GOOGLE_PLAY_SERVICE_ACCOUNT_JSON"];
  if (!raw) return { ok: false };
  try {
    const j = JSON.parse(raw) as { client_email?: string; private_key?: string };
    if (!j.client_email || !j.private_key?.includes("PRIVATE KEY")) return { ok: false };
    return {
      ok: true,
      config: { clientEmail: j.client_email, privateKeyPem: j.private_key.replace(/\\n/g, "\n") },
    };
  } catch {
    return { ok: false };
  }
}

function b64url(bytes: Uint8Array | string): string {
  const b = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const body = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const bin = atob(body);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

async function accessToken(cfg: GoogleConfig): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  const input = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(
    JSON.stringify({ iss: cfg.clientEmail, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }),
  )}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(cfg.privateKeyPem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(input));
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${input}.${b64url(new Uint8Array(sig))}`,
    }),
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { access_token?: string };
  return j.access_token ?? null;
}

export type GoogleFetch =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; reason: "not-found" | "unavailable" };

async function getJson(cfg: GoogleConfig, path: string): Promise<GoogleFetch> {
  try {
    const token = await accessToken(cfg);
    if (!token) return { ok: false, reason: "unavailable" };
    const res = await fetch(`${API}/${GOOGLE_PLAY_PACKAGE_NAME}/${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // 400/404/410: Google does not know this token for our package.
    if (res.status === 400 || res.status === 404 || res.status === 410)
      return { ok: false, reason: "not-found" };
    if (!res.ok) return { ok: false, reason: "unavailable" };
    return { ok: true, body: (await res.json()) as Record<string, unknown> };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

export function fetchProductPurchase(cfg: GoogleConfig, productId: string, token: string) {
  return getJson(
    cfg,
    `purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}`,
  );
}

export function fetchSubscriptionPurchase(cfg: GoogleConfig, token: string) {
  return getJson(cfg, `purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`);
}

export type GoogleVerdict =
  | { status: "verified"; premiumExpiresISO: string | null; orderId?: string | undefined }
  | { status: "invalid"; reason: string }
  | { status: "unavailable" };

/**
 * One-time product (consumable report). purchaseState 0 = purchased,
 * 1 = cancelled, 2 = pending. `alreadyConsumedByUs` tells whether our own
 * replay table already knows this token (consumed AFTER our grant is fine).
 */
export function evaluateProductPurchase(
  body: Record<string, unknown>,
  expectedProductId: string,
  knownToUs: boolean,
): GoogleVerdict {
  if (expectedProductId !== GOOGLE_PLAY_PRODUCT_IDS.singleReport)
    return { status: "invalid", reason: "product-mismatch" };
  if (typeof body["productId"] === "string" && body["productId"] !== expectedProductId)
    return { status: "invalid", reason: "product-mismatch" };
  const state = body["purchaseState"];
  if (state === 2) return { status: "unavailable" }; // pending: no grant yet
  if (state !== 0) return { status: "invalid", reason: "not-purchased" };
  if (body["consumptionState"] === 1 && !knownToUs)
    return { status: "invalid", reason: "already-consumed" };
  return {
    status: "verified",
    premiumExpiresISO: null,
    orderId: typeof body["orderId"] === "string" ? body["orderId"] : undefined,
  };
}

/** Subscription (subscriptionsv2). Access only while active / in grace / cancelled-but-unexpired. */
export function evaluateSubscription(
  body: Record<string, unknown>,
  expectedProductId: string,
  now: number = Date.now(),
): GoogleVerdict {
  if (expectedProductId !== GOOGLE_PLAY_PRODUCT_IDS.premiumYear)
    return { status: "invalid", reason: "product-mismatch" };
  const state = String(body["subscriptionState"] ?? "");
  if (state === "SUBSCRIPTION_STATE_PENDING") return { status: "unavailable" };
  const items = Array.isArray(body["lineItems"]) ? (body["lineItems"] as Record<string, unknown>[]) : [];
  const item = items.find((i) => i["productId"] === expectedProductId);
  if (!item) return { status: "invalid", reason: "product-mismatch" };
  const basePlan = (item["offerDetails"] as { basePlanId?: string } | undefined)?.basePlanId;
  if (basePlan && basePlan !== GOOGLE_PLAY_PREMIUM_BASE_PLAN_ID)
    return { status: "invalid", reason: "base-plan-mismatch" };
  const expiry = typeof item["expiryTime"] === "string" ? Date.parse(item["expiryTime"]) : NaN;
  const allowed = new Set([
    "SUBSCRIPTION_STATE_ACTIVE",
    "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
    "SUBSCRIPTION_STATE_CANCELED",
  ]);
  if (!allowed.has(state) || !Number.isFinite(expiry) || expiry <= now)
    return { status: "invalid", reason: "inactive" };
  return { status: "verified", premiumExpiresISO: new Date(expiry).toISOString() };
}
