import { writeFileSync } from "node:fs";
import { runBatteryApp } from "@/lib/battery-app";
import { computeBatteryAlternatives } from "@/lib/battery-app/capacityAlternatives";
import { customerEconomyFromResult } from "@/lib/battery-app/customerEconomy";
import { buildDocDefinition } from "@/lib/report/docDefinition";
import { buildReportModel } from "@/lib/report/reportModel";
import { createInitialState } from "@/state/wizard";

const s = structuredClone(createInitialState());
s.consumption.profileId = "evening-heavy";
s.consumption.annualKwh = 20000;
s.production.mode = "manual";
s.production.annualKwh = 10000;
console.log("running engine...");
const outcome = runBatteryApp(s);
if (outcome.status !== "ok") throw new Error("not ok");
console.log("engine done");
const ce = customerEconomyFromResult(outcome.result, s.preferences.customerAncillaryShare);
const alts = computeBatteryAlternatives(outcome.input, outcome.result, s.preferences.customerAncillaryShare);
console.log("alts done");
const model = buildReportModel({ outcome, language: "sv", customerEconomy: ce, targetPaybackYears: 10, alternatives: alts, now: new Date(2026, 8, 10), reportId: "MBD-20260910-QA001" });
const dd = buildDocDefinition(model);
console.log("model done");
const PdfPrinter: any = (await import("pdfmake/src/printer.js")).default;
const VirtualFileSystem: any = (await import("pdfmake/src/virtual-fs.js")).default;
const URLResolver: any = (await import("pdfmake/src/URLResolver.js")).default;
const vfs = new VirtualFileSystem();
const printer = new PdfPrinter({ Roboto: {
  normal: "node_modules/pdfmake/fonts/Roboto/Roboto-Regular.ttf",
  bold: "node_modules/pdfmake/fonts/Roboto/Roboto-Medium.ttf",
  italics: "node_modules/pdfmake/fonts/Roboto/Roboto-Italic.ttf",
  bolditalics: "node_modules/pdfmake/fonts/Roboto/Roboto-MediumItalic.ttf",
}}, vfs, new URLResolver(vfs), () => true);
const doc = await printer.createPdfKitDocument(dd as any);
const chunks: any[] = [];
doc.on("data", (c: any) => chunks.push(c));
await new Promise<void>((res) => { doc.on("end", () => res()); doc.end(); });
writeFileSync("/tmp/qa.pdf", Buffer.concat(chunks));
console.log("pdf written");
