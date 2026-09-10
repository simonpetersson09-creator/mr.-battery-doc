/**
 * Transport routing for the monthly document import.
 *
 * The extraction logic and the response shape are identical for both paths — only
 * the transport differs:
 *   WEB    -> same-origin TanStack server function (unchanged behaviour).
 *   NATIVE -> published HTTPS endpoint (/api/public/extract-monthly).
 *
 * All URL knowledge lives in src/config/native-backend.ts; components never know
 * about it.
 */

import { IMPORT_EXTRACT_PATH, apiUrl } from "@/config/native-backend";
import { isNativePlatform } from "@/lib/platform/runtime";
import { extractMonthlyFromDocument } from "./extractMonthly.functions";
import type { ExtractMonthlyInput } from "./extractMonthlyInput";
import type { ExtractionPayload } from "./monthly";

export type ExtractionResponse = ExtractionPayload & { error?: string; errorCode?: string };

/** 90 s: large photos/PDFs can take a while, but the UI must never hang forever. */
const NATIVE_TIMEOUT_MS = 90_000;

function failure(errorCode: string, error: string): ExtractionResponse {
  return { series: [], selfConsumptionPct: null, notes: [], error, errorCode };
}

export async function extractMonthlyDocument(
  input: ExtractMonthlyInput,
): Promise<ExtractionResponse> {
  if (!isNativePlatform()) {
    return extractMonthlyFromDocument({ data: input });
  }

  const url = apiUrl(IMPORT_EXTRACT_PATH);
  if (!url) {
    return failure("notConfigured", "Native backend URL is not configured.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NATIVE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => null)) as ExtractionResponse | null;
    if (!json) {
      return failure(
        res.status === 429 ? "rateLimited" : res.status === 402 ? "creditsExhausted" : "unreadable",
        `Document could not be read (${res.status}).`,
      );
    }
    return json;
  } catch {
    return failure("unreadable", "Document could not be read.");
  } finally {
    clearTimeout(timer);
  }
}
