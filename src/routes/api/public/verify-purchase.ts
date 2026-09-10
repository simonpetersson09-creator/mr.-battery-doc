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
});

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
