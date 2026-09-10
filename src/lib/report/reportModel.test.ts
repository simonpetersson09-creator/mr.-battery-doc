/**
 * REPORT REGRESSION TESTS.
 *
 * The report is a presentation layer: every value it prints must come from the same
 * simulated result the app renders. These tests run the real engine through the real
 * app layer, build the report model and assert that it matches the result object.
 */
import { describe, expect, it } from "vitest";

import { runBatteryApp } from "@/lib/battery-app";
import { computeBatteryAlternatives } from "@/lib/battery-app/capacityAlternatives";
import { customerEconomyFromResult, maxInvestmentSek } from "@/lib/battery-app/customerEconomy";
import { buildDocDefinition } from "./docDefinition";
import { buildReportModel, collectReportText, createReportId } from "./reportModel";
import type { WizardState } from "@/state/wizard";
import { createInitialState } from "@/state/wizard";

function stateWith(patch: (s: WizardState) => void): WizardState {
  const s = structuredClone(createInitialState());
  s.consumption.profileId = "evening-heavy";
  patch(s);
  return s;
}

function build(state: WizardState, targetYears = 11) {
  const outcome = runBatteryApp(state);
  if (outcome.status !== "ok") throw new Error(`engine not ok: ${outcome.status}`);
  const ce = customerEconomyFromResult(outcome.result, state.preferences.customerAncillaryShare);
  const alternatives = computeBatteryAlternatives(
    outcome.input,
    outcome.result,
    state.preferences.customerAncillaryShare,
  );
  const model = buildReportModel({
    outcome,
    language: "sv",
    customerEconomy: ce,
    targetPaybackYears: targetYears,
    alternatives,
    now: new Date(2026, 8, 10),
    reportId: "MBD-20260910-TEST1",
  });
  return { outcome, ce, alternatives, model };
}

const baseState = () =>
  stateWith((s) => {
    s.consumption.annualKwh = 20000;
    s.production.mode = "manual";
    s.production.annualKwh = 10000;
  });

describe("report model", () => {
  it("matches the simulated result for capacity, power and benefit", () => {
    const { outcome, ce, model } = build(baseState());
    expect(model.raw.capacityKWh).toBe(outcome.result.summary.recommendation.capacityKWh);
    expect(model.raw.powerKw).toBe(outcome.result.summary.recommendation.recommendedPowerKw);
    expect(model.raw.totalCustomerBenefitSek).toBe(ce.totalCustomerBenefitSek);
    expect(model.raw.energyBenefitSek).toBe(ce.energyBenefitSek);
    expect(model.raw.peakBenefitSek).toBe(ce.peakBenefitSek);
    expect(model.raw.ancillaryCustomerValueSek).toBe(ce.ancillaryCustomerValueSek);
  });

  it("uses the same payback time and max investment as the result page", () => {
    const { ce, model } = build(baseState(), 13);
    expect(model.raw.targetPaybackYears).toBe(13);
    expect(model.raw.maxInvestmentSek).toBe(maxInvestmentSek(ce.totalCustomerBenefitSek, 13));
  });

  it("prints before/after values straight from the simulation", () => {
    const { outcome, model } = build(baseState());
    const e = outcome.result.summary.energy;
    const section = model.sections.find((x) => x.id === "summary");
    const block = section?.blocks.find((b) => b.kind === "beforeAfter");
    expect(block).toBeTruthy();
    if (block?.kind !== "beforeAfter") throw new Error("missing before/after block");
    const importRow = block.rows.find((r) => r.label === model.copy.summary.gridImport);
    expect(importRow?.before).toContain(String(Math.round(e.importBeforeKWh)).slice(0, 2));
    expect(importRow?.after).toContain(String(Math.round(e.importAfterKWh)).slice(0, 2));
  });

  it("shows the pre-simulated alternatives without re-running the engine", () => {
    const { alternatives, model } = build(baseState());
    const section = model.sections.find((x) => x.id === "sizing");
    const block = section?.blocks.find((b) => b.kind === "alternatives");
    if (block?.kind !== "alternatives") throw new Error("missing alternatives block");
    expect(block.items).toHaveLength(alternatives.length);
    expect(block.items.filter((i) => i.highlight)).toHaveLength(1);
  });

  it("includes an ancillary section with a market value when prices exist", () => {
    const { model } = build(
      stateWith((s) => {
        s.consumption.annualKwh = 20000;
        s.production.mode = "manual";
        s.production.annualKwh = 10000;
        s.strategies.fcrDUp = true;
      }),
    );
    expect(model.raw.ancillaryEnabled).toBe(true);
    const section = model.sections.find((x) => x.id === "ancillary");
    expect(section).toBeTruthy();
    const text = collectReportText(model).join("\n");
    expect(text).toContain(model.copy.ancillary.title);
  });

  it("never fabricates revenue when ancillary services are switched off", () => {
    const { model } = build(
      stateWith((s) => {
        s.consumption.annualKwh = 20000;
        s.strategies.fcrDUp = false;
      }),
    );
    expect(model.raw.ancillaryEnabled).toBe(false);
    expect(model.sections.some((x) => x.id === "ancillary")).toBe(false);
    expect(model.raw.ancillaryCustomerValueSek).toBe(0);
  });

  it("builds a report without solar production", () => {
    const { model } = build(
      stateWith((s) => {
        s.consumption.annualKwh = 18000;
        s.production.mode = "none";
      }),
    );
    expect(model.raw.hasSolar).toBe(false);
    const text = collectReportText(model).join("\n");
    expect(text).not.toContain(model.copy.energy.selfConsumptionBefore);
  });

  it("uses Swedish number and unit formatting", () => {
    const { model } = build(baseState());
    const text = collectReportText(model).join("\n");
    expect(text).toMatch(/\d\s?kWh/);
    expect(text).toMatch(/kW/);
  });

  it("has a unique, well formed report id and footer", () => {
    const a = createReportId(new Date(2026, 8, 10));
    const b = createReportId(new Date(2026, 8, 10));
    expect(a).toMatch(/^MBD-20260910-[A-Z0-9]{5}$/);
    expect(a).not.toBe(b);
    const { model } = build(baseState());
    expect(model.footerText).toContain("Mr. Battery Doc");
    expect(model.footerText).toContain(model.reportId);
  });

  it("contains no undefined, null, NaN or empty headings", () => {
    for (const state of [
      baseState(),
      stateWith((s) => {
        s.consumption.annualKwh = 12000;
        s.production.mode = "none";
        s.strategies.fcrDUp = true;
      }),
    ]) {
      const { model } = build(state);
      const strings = collectReportText(model);
      for (const value of strings) {
        expect(typeof value).toBe("string");
        expect(value).not.toMatch(/undefined|NaN|\bnull\b/);
      }
      for (const section of model.sections) expect(section.title ?? "x").not.toBe("");
    }
  });

  it("renders a paginated pdfmake document with a footer on every page", () => {
    const { model } = build(baseState());
    const doc = buildDocDefinition(model) as {
      content: unknown[];
      footer: (p: number, c: number) => { columns: { text: string }[] };
    };
    expect(Array.isArray(doc.content)).toBe(true);
    expect(doc.content.length).toBeGreaterThan(10);
    const footer = doc.footer(2, 9);
    expect(footer.columns[0]?.text).toContain(model.reportId);
    expect(footer.columns[1]?.text).toBe("2 / 9");
  });
});
