/**
 * REPORT REGRESSION TESTS.
 *
 * The report is a presentation layer: every value it prints must come from the same
 * simulated result the app renders. These tests run the real engine through the real
 * app layer, build the report model and assert that it matches the result object.
 */
import { describe, expect, it } from "vitest";

import { runBatteryApp } from "@/lib/battery-app";
import { computeAncillaryScenario } from "@/lib/battery-app/ancillaryScenario";
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

function buildAncillaryOnlyReport(targetYears = 12, language: "sv" | "en" = "sv") {
  const state = stateWith((s) => {
    s.grid.mainFuseA = 20;
    s.consumption.annualKwh = 20000;
    s.consumption.profileId = "normal";
    s.production.mode = "none";
    s.strategies.solarSelfConsumption = false;
    s.strategies.reducedGridImport = false;
    s.strategies.peakShaving = false;
    s.strategies.fcrDUp = true;
    s.preferences.targetPaybackYears = targetYears;
  });
  const outcome = runBatteryApp(state);
  if (outcome.status !== "ok") throw new Error("engine not ok");
  const scenario = computeAncillaryScenario(
    outcome.input,
    outcome.result,
    state.preferences.customerAncillaryShare,
    targetYears,
  );
  if (!scenario?.selected) throw new Error("missing ancillary scenario");
  const model = buildReportModel({
    outcome,
    language,
    customerEconomy: customerEconomyFromResult(
      outcome.result,
      state.preferences.customerAncillaryShare,
    ),
    targetPaybackYears: targetYears,
    alternatives: [],
    ancillaryScenario: scenario,
    now: new Date(2026, 8, 10),
    reportId: "MBD-20260910-NOSOL",
  });
  return { state, outcome, scenario, model };
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

  it("fills the report from the selected ancillary pair when there is no solar", () => {
    const state = stateWith((s) => {
      s.consumption.annualKwh = 10000;
      s.production.mode = "none";
      s.strategies.fcrDUp = true;
      s.strategies.peakShaving = false;
    });
    const outcome = runBatteryApp(state);
    if (outcome.status !== "ok") throw new Error("engine not ok");
    const scenario = computeAncillaryScenario(
      outcome.input,
      outcome.result,
      state.preferences.customerAncillaryShare,
      11,
    );
    expect(scenario?.selected).toBeTruthy();
    const model = buildReportModel({
      outcome,
      language: "sv",
      customerEconomy: customerEconomyFromResult(
        outcome.result,
        state.preferences.customerAncillaryShare,
      ),
      targetPaybackYears: 11,
      alternatives: [],
      ancillaryScenario: scenario,
      now: new Date(2026, 8, 10),
      reportId: "MBD-20260910-TEST2",
    });
    // The ordinary run recommends no battery; the report must show the selected pair.
    expect(outcome.result.summary.recommendation.capacityKWh).toBe(0);
    expect(model.raw.capacityKWh).toBe(scenario?.selected?.capacityKWh);
    expect(model.raw.powerKw).toBeGreaterThan(0);
    expect(model.raw.ancillaryCustomerValueSek).toBeGreaterThan(0);
    expect(model.raw.maxInvestmentSek).toBe(scenario?.selected?.maxInvestmentSek);
    for (const value of collectReportText(model)) {
      expect(value).not.toMatch(/undefined|NaN|\bnull\b/);
    }
  });

  it("keeps the frozen no-solar reference numbers unchanged", () => {
    const { scenario, model } = buildAncillaryOnlyReport();
    expect(scenario.selected?.capacityKWh).toBe(15);
    expect(scenario.selected?.powerKw).toBe(10);
    expect(scenario.selected?.customerBenefitSek).toBeCloseTo(7411.647036632467, 6);
    expect(scenario.selected?.maxInvestmentSek).toBeCloseTo(88939.7644395896, 6);
    expect(model.raw.capacityKWh).toBe(15);
    expect(model.raw.powerKw).toBe(10);
    expect(model.raw.maxInvestmentSek).toBeCloseTo(88939.7644395896, 6);
  });

  it("uses standalone ancillary copy and omits all solar and peak-shaving content", () => {
    const { model } = buildAncillaryOnlyReport();
    const text = collectReportText(model).join("\n");
    expect(text).toContain("Tekniskt dimensioneringsförslag");
    expect(text).toContain("Beräknad ersättning till dig");
    expect(text).toContain("Historiska marknadspriser 2025");
    expect(text).toContain("aggregator");
    expect(text).not.toMatch(
      /solproduktion|solcellsstorlek|egenanvändning|självförsörjning|överskottsel|exporterad solel|lagrad solel|peak shaving|effekttoppskapning|peak reduction|Fysiskt effektbehov|bäst balans|mest lönsam|ekonomiskt optimum/i,
    );
    expect(text).not.toContain("Uppgift saknas");
    expect(model.sections.some((section) => section.id === "energy")).toBe(false);
    expect(model.sections.some((section) => section.id === "grid")).toBe(false);
  });

  it("does not claim that household consumption selects the standalone battery size", () => {
    const { model } = buildAncillaryOnlyReport();
    const text = collectReportText(model).join("\n");
    expect(text).toContain(
      "Din förbrukning används därefter för att beräkna hur mycket reserv som kan hållas tillgänglig",
    );
    expect(text).not.toMatch(/storleken.+förbrukningsprofil|väljer.+högst.+ersättning/i);
  });

  it("keeps the English ancillary-only fallback free from peak-shaving claims", () => {
    const { model } = buildAncillaryOnlyReport(12, "en");
    const text = collectReportText(model).join("\n");
    expect(text).toContain("Technical sizing proposal");
    expect(text).toContain("Historical market prices 2025");
    expect(text).not.toMatch(/peak shaving|peak reduction|self-consumption|self-sufficiency/i);
    expect(text).not.toMatch(/undefined|NaN|null/);
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
      footer: (p: number, c: number) => unknown;
    };
    expect(Array.isArray(doc.content)).toBe(true);
    expect(doc.content.length).toBeGreaterThan(10);
    const footer = JSON.stringify(doc.footer(2, 9));
    expect(footer).toContain(model.brand);
    expect(footer).toContain(model.reportId);
    expect(footer).toContain("2");
    expect(footer).toContain("9");
  });
});
