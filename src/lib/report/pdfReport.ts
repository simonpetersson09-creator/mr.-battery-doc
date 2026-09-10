/**
 * Entry point for the customer PDF report.
 *
 * PRESENTATION LAYER ONLY. The report is always built from the already-simulated result
 * the result page renders — the same outcome, the same customer economics and the same
 * pre-simulated capacity alternatives. No calculation, no engine access and no currency
 * logic lives here or anywhere below it.
 */
import type { BatteryAppResult } from "@/lib/battery-app";
import type { BatteryAlternative } from "@/lib/battery-app/capacityAlternatives";
import type { CustomerEconomy } from "@/lib/battery-app/customerEconomy";
import { buildDocDefinition } from "./docDefinition";
import { buildReportModel, type ReportModel } from "./reportModel";

export const PDF_REPORT_AVAILABLE = true;

export interface PdfReportRequest {
  /** The current, freshly simulated outcome shown on the result page. */
  outcome: Extract<BatteryAppResult, { status: "ok" }>;
  /** UI language, for report copy only. Never affects country, currency or market. */
  language: string;
  /**
   * The SAME customer economics the result page renders (ancillary counted at the
   * customer's share). The report must never recompute it.
   */
  customerEconomy: CustomerEconomy;
  /** Desired payback horizon shown on the result page. */
  targetPaybackYears: number;
  /** The SAME simulated alternatives the result page renders. */
  alternatives: BatteryAlternative[];
}

interface PdfMakeApi {
  addVirtualFileSystem: (vfs: Record<string, string>) => void;
  createPdf: (doc: unknown) => {
    download: (name: string) => Promise<void> | void;
    getBuffer: () => Promise<Uint8Array>;
  };
}

export function buildReport(request: PdfReportRequest): ReportModel {
  return buildReportModel(request);
}

export function reportFileName(model: ReportModel): string {
  return `mr-battery-doc-${model.createdISO}-${model.reportId}.pdf`;
}

/** Builds the PDF in the browser and starts the download. */
export async function generatePdfReport(request: PdfReportRequest): Promise<void> {
  const model = buildReport(request);
  const docDefinition = buildDocDefinition(model);

  const [pdfMakeModule, fontsModule] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
  ]);

  const pdfMake = ((pdfMakeModule as { default?: unknown }).default ??
    pdfMakeModule) as PdfMakeApi;
  const vfs = ((fontsModule as { default?: unknown }).default ?? fontsModule) as Record<
    string,
    string
  >;
  pdfMake.addVirtualFileSystem(vfs);

  await pdfMake.createPdf(docDefinition).download(reportFileName(model));
}
