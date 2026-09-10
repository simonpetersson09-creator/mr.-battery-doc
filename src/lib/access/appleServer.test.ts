import { describe, expect, it } from "vitest";
import {
  createAppleJWT,
  decodeJwsPayload,
  evaluateTransaction,
  isValidPrivateKeyPem,
  normalizePrivateKey,
  readAppleConfig,
} from "./appleServer.server";

async function generateP8(): Promise<string> {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ]);
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", pair.privateKey);
  const b64 = btoa(String.fromCharCode(...new Uint8Array(pkcs8)));
  const lines = b64.match(/.{1,64}/g)!.join("\n");
  return `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----`;
}

describe("apple server credentials", () => {
  it("reports every missing variable", () => {
    const res = readAppleConfig({});
    expect(res.ok).toBe(false);
    if (!res.ok)
      expect(res.missing).toEqual([
        "APPLE_ISSUER_ID",
        "APPLE_KEY_ID",
        "APPLE_PRIVATE_KEY",
        "APPLE_BUNDLE_ID",
      ]);
  });

  it("accepts an escaped-newline .p8 value", async () => {
    const pem = await generateP8();
    const escaped = pem.replace(/\n/g, "\\n");
    const normalized = normalizePrivateKey(escaped);
    expect(isValidPrivateKeyPem(normalized)).toBe(true);
    expect(normalized).toBe(pem);
  });

  it("reads a complete config", async () => {
    const pem = await generateP8();
    const res = readAppleConfig({
      APPLE_ISSUER_ID: "issuer",
      APPLE_KEY_ID: "keyid",
      APPLE_PRIVATE_KEY: pem,
      APPLE_BUNDLE_ID: "com.example.app",
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.config.bundleId).toBe("com.example.app");
  });

  it("creates a valid Apple JWT header and payload", async () => {
    const pem = await generateP8();
    const jwt = await createAppleJWT(
      { issuerId: "issuer", keyId: "keyid", bundleId: "com.example.app", privateKeyPem: pem },
      1_700_000_000,
    );
    const [h, p, s] = jwt.split(".");
    expect(s!.length).toBeGreaterThan(0);
    const header = JSON.parse(atob(h!.replace(/-/g, "+").replace(/_/g, "/")));
    expect(header).toMatchObject({ alg: "ES256", kid: "keyid", typ: "JWT" });
    const payload = JSON.parse(atob(p!.replace(/-/g, "+").replace(/_/g, "/")));
    expect(payload).toMatchObject({
      iss: "issuer",
      aud: "appstoreconnect-v1",
      bid: "com.example.app",
      iat: 1_700_000_000,
    });
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  it("decodes a JWS payload segment", () => {
    const payload = { bundleId: "com.example.app", productId: "p" };
    const seg = btoa(JSON.stringify(payload)).replace(/=+$/, "");
    expect(decodeJwsPayload(`x.${seg}.y`)).toMatchObject(payload);
    expect(decodeJwsPayload("nope")).toBeNull();
  });
});

describe("transaction evaluation", () => {
  const expected = {
    bundleId: "com.mrbatterydoc.app",
    productId: "com.mrbatterydoc.calculation.unlock",
    transactionId: "tx1",
  };

  it("verifies a matching consumable", () => {
    expect(
      evaluateTransaction({ ...expected }, expected),
    ).toEqual({ status: "verified", premiumExpiresISO: null });
  });

  it("rejects a bundle or product mismatch", () => {
    expect(evaluateTransaction({ ...expected, bundleId: "other" }, expected).status).toBe("invalid");
    expect(evaluateTransaction({ ...expected, productId: "other" }, expected).status).toBe("invalid");
  });

  it("rejects revoked and expired transactions", () => {
    expect(evaluateTransaction({ ...expected, revocationDate: 1 }, expected).status).toBe("invalid");
    expect(
      evaluateTransaction({ ...expected, expiresDate: 1000 }, expected, 5000).status,
    ).toBe("invalid");
  });

  it("returns the subscription expiry for an active subscription", () => {
    const res = evaluateTransaction({ ...expected, expiresDate: 10_000 }, expected, 5_000);
    expect(res).toEqual({ status: "verified", premiumExpiresISO: new Date(10_000).toISOString() });
  });
});
