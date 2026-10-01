/**
 * Apple purchase verification endpoint (server side).
 *
 * The signing credentials are read from the server environment ONLY — nothing
 * Apple-related is ever shipped in the iOS bundle. Until the credentials are
 * configured the endpoint answers `config-required`, which the app treats as
 * "no server opinion" and never as a grant.
 *
 * Required environment variables (App Store Server API):
 *   APPLE_ISSUER_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY, APPLE_BUNDLE_ID
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const ALLOWED_ORIGINS = new Set([
  "capacitor://localhost",
  "ionic://localhost",
  "https://localhost",
  "http://localhost",
]);

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "capacitor://localhost";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

const requestSchema = z.object({
  key: z.enum(["singleReport", "premiumYear"]),
  productId: z.string().min(1).max(200),
  transactionId: z.string().min(1).max(200),
  originalTransactionId: z.string().max(200).nullish(),
  calculationId: z.string().max(200).optional(),
  signedTransaction: z.string().max(20_000).optional(),
  platform: z.enum(["app_store", "google_play"]).optional(),
  purchaseToken: z.string().min(1).max(4096).optional(),
});

const json = (body: unknown, headers: Record<string, string>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

export const Route = createFileRoute("/api/public/verify-purchase")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) =>
        new Response(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) }),

      POST: async ({ request }) => {
        const headers = {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          ...corsHeaders(request.headers.get("origin")),
        };

        let parsed;
        try {
          parsed = requestSchema.safeParse(await request.json());
        } catch {
          return new Response(JSON.stringify({ status: "invalid", reason: "malformed" }), {
            status: 400,
            headers,
          });
        }
        if (!parsed.success) {
          return new Response(JSON.stringify({ status: "invalid", reason: "malformed" }), {
            status: 400,
            headers,
          });
        }

        if (parsed.data.platform === "google_play") {
          return json(await verifyGooglePlay(parsed.data), headers);
        }

        // Read credentials inside the handler — env is injected per request.
        // Server-only module, loaded lazily so nothing Apple-related can reach
        // the client graph.
        const apple = await import("@/lib/access/appleServer.server");
        const cfg = apple.readAppleConfig();

        if (!cfg.ok) {
          // No Apple credentials yet: no server opinion. The app keeps using
          // StoreKit's own verification and does not unlock anything extra.
          return new Response(JSON.stringify({ status: "config-required" }), { status: 200, headers });
        }

        const { productId, transactionId } = parsed.data;
        const info = await apple.fetchTransactionInfo(transactionId, cfg.config);
        if (!info.ok) {
          const blocking = info.reason === "transaction-not-found";
          return new Response(
            JSON.stringify(
              blocking
                ? { status: "invalid", reason: info.reason }
                : { status: "unavailable" },
            ),
            { status: 200, headers },
          );
        }

        const outcome = apple.evaluateTransaction(info.payload, {
          bundleId: cfg.config.bundleId,
          productId,
          transactionId,
        });
        if (outcome.status === "verified") {
          return new Response(
            JSON.stringify({ status: "verified", premiumExpiresISO: outcome.premiumExpiresISO }),
            { status: 200, headers },
          );
        }
        if (outcome.status === "invalid") {
          return new Response(JSON.stringify({ status: "invalid", reason: outcome.reason }), {
            status: 200,
            headers,
          });
        }
        return new Response(JSON.stringify({ status: "unavailable" }), { status: 200, headers });
      },
    },
  },
});

/**
 * Google Play: the purchase token is checked against the Google Play Developer
 * API for package se.shiningdays.mrbatterydoc. The client's own claim is never
 * trusted. A one-time purchase token is bound to exactly one calculation.
 */
async function verifyGooglePlay(data: {
  key: "singleReport" | "premiumYear";
  productId: string;
  purchaseToken?: string;
  calculationId?: string;
}): Promise<Record<string, unknown>> {
  const g = await import("@/lib/access/googlePlayServer.server");
  const cfg = g.readGoogleConfig();
  if (!cfg.ok) return { status: "config-required" };
  const token = data.purchaseToken;
  if (!token) return { status: "invalid", reason: "missing-token" };

  if (data.key === "premiumYear") {
    const res = await g.fetchSubscriptionPurchase(cfg.config, token);
    if (!res.ok) return res.reason === "not-found" ? { status: "invalid", reason: "not-found" } : { status: "unavailable" };
    const v = g.evaluateSubscription(res.body, data.productId);
    return v.status === "verified" ? { status: "verified", premiumExpiresISO: v.premiumExpiresISO } : v;
  }

  // One-time report: needs the calculation it pays for, otherwise no opinion.
  const calculationId = data.calculationId ?? "";
  if (!calculationId) return { status: "unavailable" };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const table = supabaseAdmin.from("google_play_consumed_purchases");
  const existing = await table.select("calculation_id").eq("purchase_token", token).maybeSingle();
  if (existing.error) return { status: "unavailable" };

  const res = await g.fetchProductPurchase(cfg.config, data.productId, token);
  if (!res.ok) return res.reason === "not-found" ? { status: "invalid", reason: "not-found" } : { status: "unavailable" };
  const v = g.evaluateProductPurchase(res.body, data.productId, !!existing.data);
  if (v.status !== "verified") return v;

  if (existing.data) {
    // Replay of the same delivery is fine; reuse for another calculation is not.
    return existing.data.calculation_id === calculationId
      ? { status: "verified", premiumExpiresISO: null }
      : { status: "invalid", reason: "token-already-used" };
  }
  const ins = await supabaseAdmin.from("google_play_consumed_purchases").insert({
    purchase_token: token,
    product_id: data.productId,
    order_id: v.orderId ?? null,
    calculation_id: calculationId,
  });
  if (ins.error) {
    // Lost a race: re-read and apply the same binding rule.
    const again = await supabaseAdmin
      .from("google_play_consumed_purchases")
      .select("calculation_id")
      .eq("purchase_token", token)
      .maybeSingle();
    if (again.data?.calculation_id === calculationId) return { status: "verified", premiumExpiresISO: null };
    return again.data ? { status: "invalid", reason: "token-already-used" } : { status: "unavailable" };
  }
  return { status: "verified", premiumExpiresISO: null };
}
