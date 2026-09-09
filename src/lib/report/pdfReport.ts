/**
 * Entry point for the customer PDF report.
 *
 * The report generator itself is NOT implemented yet. This module exists so the result
 * page has one single, typed place to call once the generator lands — no calculation,
 * no currency logic and no engine access live here. The report must always be built
 * from the already-simulated result handed in by the result page (the same source of
 * truth the UI renders), never from a second calculation.
 */
import type { BatteryAppOutcome } from "@/lib/battery-app";

/** Flip to true in the same change that adds a real generator. */
export const PDF_REPORT_AVAILABLE = false;

export interface PdfReportRequest {
  /** The current, freshly simulated outcome shown on the result page. */
  outcome: Extract<BatteryAppOutcome, { status: "ok" }>;
  /** UI language, for report copy only. Never affects country, currency or market. */
  language: string;
}

export function generatePdfReport(_request: PdfReportRequest): never {
  throw new Error("PDF report generator is not implemented yet.");
}
