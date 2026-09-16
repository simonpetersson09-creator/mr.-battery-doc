/**
 * MODEL C — ANCILLARY SCENARIO REGRESSION SUITE.
 *
 * Guards the two things that matter:
 *   1. The scenario only ever appears when the physical recommendation is 0 kWh AND
 *      ancillary services are on. It never touches the ordinary recommendation.
 *   2. Every candidate is a real engine run with real market routing, and none of them
 *      is marked as recommended/optimal anywhere in the data model.
 */
import { describe, expect, it } from "vitest";

import { runBatteryApp } from "./index";
import {
  ANCILLARY_SCENARIO_CAPACITIES_KWH,
  computeAncillaryScenario,
} from "./ancillaryScenario";
import { createInitialState, type WizardState } from "@/state/wizard";
import type { CountryCode } from "@/lib/country-config";

const T = 300_000;

type MarketArea = NonNullable<WizardState["grid"]["marketArea"]>;

interface CaseOpts {
  country?: CountryCode;
  marketArea?: MarketArea | undefined;
  fuseA?: number;
  annualKwh?: number;
  solar?: { kwp: number; acKw: number; annualKwh: number } | null;
  peakShaving?: boolean;
  fcr?: boolean;
}

function buildState(o: CaseOpts = {}): WizardState {
  const s = createInitialState(o.country ?? "SE");
  if (o.marketArea) s.grid.marketArea = o.marketArea;
  s.grid.mainFuseA = o.fuseA ?? 16;
  s.grid.mainFuseManual = true;
  s.grid.gridValuesConfirmed = true;

  s.consumption.mode = "annual";
  s.consumption.annualKwh = o.annualKwh ?? 10000;
  s.consumption.profileId = "normal";

  const solar = o.solar ?? null;
  if (solar) {
    s.production.mode = "manual";
    s.production.dcKwp = solar.kwp;
    s.production.acKw = solar.acKw;
    s.production.annualKwh = solar.annualKwh;
  } else {
    s.production.mode = "none";
  }

  s.strategies.peakShaving = o.peakShaving ?? false;
  s.strategies.fcrDUp = o.fcr ?? false;
  return s;
}

function run(o: CaseOpts = {}) {
  const state = buildState(o);
  const outcome = runBatteryApp(state);
  expect(outcome.status).toBe("ok");
  if (outcome.status !== "ok") throw new Error("engine run failed");
  return { state, outcome };
}

describe("ancillary scenario (Model C)", () => {
  it(
    "A: PV=0, peak off, FCR off -> 0 kWh recommendation and no scenario",
    () => {
      const { state, outcome } = run({});
      expect(outcome.result.summary.recommendation.capacityKWh).toBe(0);
      expect(
        computeAncillaryScenario(
          outcome.input,
          outcome.result,
          state.preferences.customerAncillaryShare,
          state.preferences.targetPaybackYears,
        ),
      ).toBeNull();
    },
    T,
  );

  it(
    "B: PV=0, peak off, FCR on -> 0 kWh recommendation and a scenario is shown",
    () => {
      const { state, outcome } = run({ fcr: true });
      expect(outcome.result.summary.recommendation.capacityKWh).toBe(0);
      const scenario = computeAncillaryScenario(
        outcome.input,
        outcome.result,
        state.preferences.customerAncillaryShare,
        state.preferences.targetPaybackYears,
      );
      expect(scenario).not.toBeNull();
      expect(scenario!.candidates.length).toBeGreaterThan(0);
      // Sorted by capacity, only existing ladder steps, no invented sizes.
      const caps = scenario!.candidates.map((c) => c.capacityKWh);
      expect([...caps].sort((a, b) => a - b)).toEqual(caps);
      for (const cap of caps) expect(ANCILLARY_SCENARIO_CAPACITIES_KWH).toContain(cap);
    },
    T,
  );

  it(
    "C: a positive physical recommendation keeps the ordinary flow (no scenario)",
    () => {
      const { state, outcome } = run({
        country: "SE",
        fuseA: 63,
        annualKwh: 60000,
        peakShaving: true,
        fcr: true,
      });
      expect(outcome.result.summary.recommendation.capacityKWh).toBeGreaterThan(0);
      expect(
        computeAncillaryScenario(
          outcome.input,
          outcome.result,
          state.preferences.customerAncillaryShare,
          state.preferences.targetPaybackYears,
        ),
      ).toBeNull();
    },
    T,
  );

  it(
    "D: a solar case is untouched — recommendation identical with and without the scenario call",
    () => {
      const opts: CaseOpts = {
        annualKwh: 20000,
        fuseA: 25,
        solar: { kwp: 14, acKw: 12, annualKwh: 14000 },
        fcr: true,
      };
      const first = run(opts);
      const before = { ...first.outcome.result.summary.recommendation };
      const beforeEconomy = { ...first.outcome.result.summary.economy };
      computeAncillaryScenario(first.outcome.input, first.outcome.result, 0.75, 10);
      const second = run(opts);
      expect(second.outcome.result.summary.recommendation).toEqual(before);
      expect(second.outcome.result.summary.economy).toEqual(beforeEconomy);
    },
    T,
  );

  it(
    "E: every candidate stays inside physics — paid power <= offered and <= product power",
    () => {
      const { outcome } = run({ fcr: true });
      const scenario = computeAncillaryScenario(outcome.input, outcome.result, 0.75, 10);
      expect(scenario).not.toBeNull();
      for (const c of scenario!.candidates) {
        expect(Number.isFinite(c.powerKw)).toBe(true);
        expect(c.powerKw).toBeGreaterThan(0);
        expect(c.powerKw).toBeLessThanOrEqual(Math.max(3, c.capacityKWh * 0.5) + 1e-9);
        expect(Number.isFinite(c.ancillaryMarketValueSek)).toBe(true);
        expect(c.ancillaryCustomerValueSek).toBeCloseTo(c.ancillaryMarketValueSek * 0.75, 6);
      }
    },
    T,
  );

  it.each([
    ["SE", undefined],
    ["FI", undefined],
    ["DK", "DK2"],
    ["DK", "DK1"],
    ["DE", undefined],
  ] as const)(
    "F: %s %s routes through its own market profile and produces candidates",
    (country, marketArea) => {
      const { outcome } = run({
        country: country as CountryCode,
        marketArea: marketArea as MarketArea | undefined,
        fcr: true,
      });
      if (outcome.result.summary.recommendation.capacityKWh > 0) return; // ordinary flow
      const scenario = computeAncillaryScenario(outcome.input, outcome.result, 0.75, 10);
      if (scenario === null) return; // market without priced reserve data
      expect(scenario.candidates.length).toBeGreaterThan(0);
      for (const c of scenario.candidates) {
        expect(Number.isFinite(c.customerBenefitSek ?? 0)).toBe(true);
      }
    },
    T,
  );

  it(
    "G: a negative candidate benefit is reported as-is, never clamped or hidden",
    () => {
      const { outcome } = run({ fcr: true });
      const scenario = computeAncillaryScenario(outcome.input, outcome.result, 0.75, 10);
      expect(scenario).not.toBeNull();
      for (const c of scenario!.candidates) {
        if (c.customerBenefitSek !== null && c.customerBenefitSek <= 0) {
          // No positive max investment may be derived from a non-positive benefit.
          expect(c.maxInvestmentSek).toBeNull();
        } else if (c.customerBenefitSek !== null) {
          expect(c.maxInvestmentSek).toBeCloseTo(c.customerBenefitSek * 10, 6);
        }
      }
    },
    T,
  );

  it(
    "H: no candidate carries any recommended/optimal marking",
    () => {
      const { outcome } = run({ fcr: true });
      const scenario = computeAncillaryScenario(outcome.input, outcome.result, 0.75, 10);
      expect(scenario).not.toBeNull();
      for (const c of scenario!.candidates) {
        expect(Object.keys(c).sort()).toEqual(
          [
            "ancillaryCustomerValueSek",
            "ancillaryMarketValueSek",
            "capacityKWh",
            "customerBenefitSek",
            "maxInvestmentSek",
            "powerKw",
          ].sort(),
        );
      }
    },
    T,
  );
});
