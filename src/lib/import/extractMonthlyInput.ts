/**
 * Shared input contract for the monthly document extraction.
 *
 * Client-safe on purpose: the server function, the public HTTP route (used by the
 * native iOS build) and the client transport all validate against this one schema.
 */

import { z } from "zod";

export const extractMonthlyInputSchema = z.object({
  /** data:<mime>;base64,<data> */
  dataUrl: z.string().min(16).max(25_000_000),
  mimeType: z.string().min(3).max(120),
  fileName: z.string().max(200).default("underlag"),
});

export type ExtractMonthlyInput = z.infer<typeof extractMonthlyInputSchema>;
