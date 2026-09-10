/**
 * Public HTTP endpoint for the monthly document import — used ONLY by the native
 * Capacitor build, which has no same-origin server for server functions.
 *
 * Same input contract, same extraction core and same response shape as the web
 * server function. No secrets are exposed: the AI key stays server-side.
 */

import { createFileRoute } from "@tanstack/react-router";
import { extractMonthlyInputSchema } from "@/lib/import/extractMonthlyInput";
import { DEFAULT_ALLOWED_ORIGIN, isAllowedImportOrigin } from "@/lib/import/corsOrigins";

/** true only for local dev/preview builds; production bundles ship false. */
function isDevelopment(): boolean {
  return import.meta.env.DEV === true;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = isAllowedImportOrigin(origin, isDevelopment())
    ? origin!
    : DEFAULT_ALLOWED_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export const Route = createFileRoute("/api/public/extract-monthly")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) =>
        new Response(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) }),

      POST: async ({ request }) => {
        const headers = {
          "Content-Type": "application/json",
          ...corsHeaders(request.headers.get("origin")),
        };
        try {
          const parsed = extractMonthlyInputSchema.safeParse(await request.json());
          if (!parsed.success) {
            return new Response(
              JSON.stringify({
                series: [],
                selfConsumptionPct: null,
                notes: [],
                error: "Invalid request.",
                errorCode: "unreadable",
              }),
              { status: 400, headers },
            );
          }
          const { runMonthlyExtraction } = await import("@/lib/import/extractMonthly.server");
          const result = await runMonthlyExtraction(parsed.data);
          return new Response(JSON.stringify(result), { status: 200, headers });
        } catch {
          return new Response(
            JSON.stringify({
              series: [],
              selfConsumptionPct: null,
              notes: [],
              error: "Document could not be read.",
              errorCode: "unreadable",
            }),
            { status: 500, headers },
          );
        }
      },
    },
  },
});
