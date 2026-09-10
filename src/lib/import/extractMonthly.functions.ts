/**
 * Document/image extraction for the monthly import (WEB transport).
 *
 * Same-origin server function. The extraction itself lives in
 * `extractMonthly.server.ts`, shared with the public HTTP route the native iOS
 * build uses. Everything after this point (normalisation, validation, review,
 * wizard state) is plain app logic — the Battery Engine is never involved.
 */

import { createServerFn } from "@tanstack/react-start";
import { extractMonthlyInputSchema } from "./extractMonthlyInput";
import type { ExtractionPayload } from "./monthly";

export const extractMonthlyFromDocument = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => extractMonthlyInputSchema.parse(data))
  .handler(
    async ({ data }): Promise<ExtractionPayload & { error?: string; errorCode?: string }> => {
      const { runMonthlyExtraction } = await import("./extractMonthly.server");
      return runMonthlyExtraction(data);
    },
  );
