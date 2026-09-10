/**
 * APP STORE SERVER API — server-only credentials and signing.
 *
 * Reads Apple credentials from the server environment ONLY:
 *   APPLE_ISSUER_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY, APPLE_BUNDLE_ID
 *
 * Nothing here may be imported from client code. No credential value is ever
 * logged, returned to the client, or embedded in a bundle.
 */

export interface AppleConfig {
  issuerId: string;
  keyId: string;
  privateKeyPem: string;
  bundleId: string;
}

export type AppleConfigResult =
  | { ok: true; config: AppleConfig }
  | { ok: false; missing: string[] };

const ENV_KEYS = [
  "APPLE_ISSUER_ID",
  "APPLE_KEY_ID",
  "APPLE_PRIVATE_KEY",
  "APPLE_BUNDLE_ID",
] as const;

/**
 * Normalizes a .p8 private key pasted as a secret. Accepts real newlines,
 * escaped "\n" sequences, surrounding quotes and CRLF.
 */
export function normalizePrivateKey(raw: string): string {
  return raw
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\\r/g, "")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim();
}

export function isValidPrivateKeyPem(pem: string): boolean {
  return (
    pem.startsWith("-----BEGIN PRIVATE KEY-----") &&
    pem.trimEnd().endsWith("-----END PRIVATE KEY-----") &&
    pemBody(pem).length > 0
  );
}

function pemBody(pem: string): string {
  return pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
}

/** Reads and validates the Apple config from process.env (call inside handlers). */
export function readAppleConfig(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): AppleConfigResult {
  const missing: string[] = [];
  for (const key of ENV_KEYS) {
    if (!env[key] || env[key]!.trim() === "") missing.push(key);
  }
  if (missing.length > 0) return { ok: false, missing };

  const privateKeyPem = normalizePrivateKey(env["APPLE_PRIVATE_KEY"]!);
  if (!isValidPrivateKeyPem(privateKeyPem)) return { ok: false, missing: ["APPLE_PRIVATE_KEY"] };

  return {
    ok: true,
    config: {
      issuerId: env["APPLE_ISSUER_ID"]!.trim(),
      keyId: env["APPLE_KEY_ID"]!.trim(),
      bundleId: env["APPLE_BUNDLE_ID"]!.trim(),
      privateKeyPem,
    },
  };
}

function base64UrlEncode(bytes: Uint8Array | string): string {
  const raw =
    typeof bytes === "string"
      ? bytes
      : Array.from(bytes, (b) => String.fromCharCode(b)).join("");
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const binary = atob(pemBody(pem));
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) buf[i] = binary.charCodeAt(i);
  return buf.buffer;
}

/**
 * Creates a signed ES256 JWT for the App Store Server API.
 * https://developer.apple.com/documentation/appstoreserverapi/generating_tokens_for_api_requests
 */
export async function createAppleJWT(
  config: AppleConfig,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<string> {
  const header = { alg: "ES256", kid: config.keyId, typ: "JWT" };
  const payload = {
    iss: config.issuerId,
    iat: nowSeconds,
    exp: nowSeconds + 20 * 60,
    aud: "appstoreconnect-v1",
    bid: config.bundleId,
  };

  const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(
    JSON.stringify(payload),
  )}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(config.privateKeyPem),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(signingInput),
  );

  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export interface AppleTransactionPayload {
  bundleId?: string;
  productId?: string;
  transactionId?: string;
  originalTransactionId?: string;
  type?: string;
  revocationDate?: number;
  expiresDate?: number;
}

/** Decodes the payload segment of a signed JWS returned by Apple. */
export function decodeJwsPayload(jws: string): AppleTransactionPayload | null {
  const parts = jws.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(decodeURIComponent(escape(atob(padded)))) as AppleTransactionPayload;
  } catch {
    return null;
  }
}

const PRODUCTION_HOST = "https://api.storekit.itunes.apple.com";
const SANDBOX_HOST = "https://api.storekit-sandbox.itunes.apple.com";

/** Fetches transaction info from Apple, falling back to sandbox on 404. */
export async function fetchTransactionInfo(
  transactionId: string,
  config: AppleConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; payload: AppleTransactionPayload } | { ok: false; reason: string }> {
  const token = await createAppleJWT(config);
  const path = `/inApps/v1/transactions/${encodeURIComponent(transactionId)}`;

  for (const host of [PRODUCTION_HOST, SANDBOX_HOST]) {
    let res: Response;
    try {
      res = await fetchImpl(`${host}${path}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
    } catch {
      return { ok: false, reason: "apple-unreachable" };
    }
    if (res.status === 404) continue;
    if (res.status === 401 || res.status === 403) return { ok: false, reason: "apple-auth" };
    if (!res.ok) return { ok: false, reason: "apple-error" };
    const body = (await res.json()) as { signedTransactionInfo?: string };
    const payload = body.signedTransactionInfo ? decodeJwsPayload(body.signedTransactionInfo) : null;
    if (!payload) return { ok: false, reason: "apple-malformed" };
    return { ok: true, payload };
  }
  return { ok: false, reason: "transaction-not-found" };
}

export type VerifyOutcome =
  | { status: "verified"; premiumExpiresISO: string | null }
  | { status: "invalid"; reason: string }
  | { status: "unavailable"; reason: string };

/** Validates a fetched Apple transaction against the expected purchase. */
export function evaluateTransaction(
  payload: AppleTransactionPayload,
  expected: { bundleId: string; productId: string; transactionId: string },
  nowMs: number = Date.now(),
): VerifyOutcome {
  if (payload.bundleId !== expected.bundleId) return { status: "invalid", reason: "bundle-mismatch" };
  if (payload.productId !== expected.productId)
    return { status: "invalid", reason: "product-mismatch" };
  if (payload.transactionId && payload.transactionId !== expected.transactionId)
    return { status: "invalid", reason: "transaction-mismatch" };
  if (payload.revocationDate) return { status: "invalid", reason: "revoked" };

  if (payload.expiresDate) {
    if (payload.expiresDate <= nowMs) return { status: "invalid", reason: "expired" };
    return { status: "verified", premiumExpiresISO: new Date(payload.expiresDate).toISOString() };
  }
  return { status: "verified", premiumExpiresISO: null };
}
