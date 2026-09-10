import { describe, it } from "vitest";
import { writeFileSync } from "node:fs";
import { runBatteryApp } from "@/lib/battery-app";
import { computeBatteryAlternatives } from "@/lib/battery-app/capacityAlternatives";
import { customerEconomyFromResult } from "@/lib/battery-app/customerEconomy";
import { buildDocDefinition } from "./docDefinition";
import { buildReportModel } from "./reportModel";
import { createInitialState } from "@/state/wizard";

describe("qa", () => {
  it("writes a pdf", async () => {
    const s = structuredClone(createInitialState());
    s.consumption.profileId = "evening-heavy";
    s.consumption.annualKwh = 20000;
    s.production.mode = "manual";
    s.production.annualKwh = 10000;
    s.strategies.fcrDUp = true;
    const outcome = runBatteryApp(s);
    if (outcome.status !== "ok") throw new Error("no");
    const ce = customerEconomyFromResult(outcome.result, s.preferences.customerAncillaryShare);
    const alts = computeBatteryAlternatives(outcome.input, outcome.result, s.preferences.customerAncillaryShare);
    const model = buildReportModel({
      outcome, language: "sv", customerEconomy: ce, targetPaybackYears: 11, alternatives: alts,
    });
    const doc = buildDocDefinition(model);
    const m = (await import("pdfmake/build/pdfmake")) as any;
    const pdfMake = m.default ?? m;
    const f = (await import("pdfmake/build/vfs_fonts")) as any;
    pdfMake.addVirtualFileSystem(f.default ?? f);
    const buf = await pdfMake.createPdf(doc).getBuffer();
    writeFileSync("/tmp/report.pdf", Buffer.from(buf));
  }, 120000);
});
