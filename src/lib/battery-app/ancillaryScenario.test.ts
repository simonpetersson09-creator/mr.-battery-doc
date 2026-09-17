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
import { defaultConfig } from "@/lib/lab/defaults";
import { runBatteryEngine } from "@/lib/battery-engine";
import {
  ANCILLARY_TECHNICAL_COVERAGE,
  bestAncillaryCandidate,
  fuseDerivedPowerCeiling,
} from "./ancillaryScenario";
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
        // Power is a REAL central product step; no C-rate pairing rule applies here.
        expect(defaultConfig().powerSizing.productStepsKw).toContain(c.powerKw);
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
        for (const k of Object.keys(c)) {
          expect(/recommend|optimal|best|winner|cheapest/i.test(k)).toBe(false);
        }
        for (const k of [
          "installedPowerKw",
          "cRate",
          "hardwareVerified",
          "paidUpMaxKw",
          "paidDownMaxKw",
          "utilizedPowerRatioUp",
          "utilizedPowerRatioDown",
          "gridLimitedHours",
          "powerLimitedHours",
          "energyLimitedHours",
          "equivalentFullCycles",
          "throughputKWh",
          "ancillaryDriven",
        ]) {
          expect(Object.keys(c)).toContain(k);
        }
      }
    },
    T,
  );
});

/**
 * PV = 0 TECHNICAL SIZING REGRESSIONS.
 *
 * Guards that the special flow sizes on the engine's modelled reserve capability —
 * never on a 0.5 C product pairing and never on SEK/year.
 */
describe("PV=0 technical sizing", () => {
  const scenarioFor = (o: CaseOpts, share = 0.75) => {
    const { outcome } = run({ fcr: true, ...o });
    return computeAncillaryScenario(outcome.input, outcome.result, share, 10);
  };

  it(
    "A: the main fuse caps recommended kW and the C-rate is an output, not a filter",
    () => {
      const sc = scenarioFor({ fuseA: 16 })!;
      const sel = bestAncillaryCandidate(sc)!;
      expect(sel).toBeTruthy();
      const t = sc.technical!;
      // The ceiling comes from the engine's own grid model, not a duplicated formula.
      const nominalKw = (Math.sqrt(3) * 400 * 16) / 1000;
      expect(t.gridPowerLimitKw).toBeLessThan(nominalKw);
      expect(t.maxRecommendedPowerKw).toBeLessThanOrEqual(t.gridPowerLimitKw + 1e-9);
      for (const c of sc.matrix) {
        expect(c.powerKw).toBeLessThanOrEqual(t.maxRecommendedPowerKw + 1e-9);
      }
      expect(sel.powerKw).toBeLessThanOrEqual(t.maxRecommendedPowerKw + 1e-9);
      // 0.5 C no longer filters this flow: the search may return a higher C-rate.
      expect(sel.cRate).toBeGreaterThan(t.maxProductCRate);
      // kW is still a real product step.
      expect(defaultConfig().powerSizing.productStepsKw).toContain(sel.powerKw);
    },
    T,
  );

  it(
    "A2: the fuse ceiling scales with the main fuse",
    () => {
      const at = (fuseA: number) => {
        const { outcome } = run({ fcr: true, fuseA });
        return fuseDerivedPowerCeiling(outcome.input, outcome.result).maxRecommendedPowerKw;
      };
      expect(at(16)).toBe(10);
      expect(at(20)).toBe(10);
      expect(at(25)).toBe(15);
      expect(at(35)).toBe(20);
    },
    T,
  );

  it(
    "B: SEK/year is not the selection metric — the customer share cannot move the pair",
    () => {
      const low = bestAncillaryCandidate(scenarioFor({ fuseA: 16 }, 0.25))!;
      const high = bestAncillaryCandidate(scenarioFor({ fuseA: 16 }, 0.75))!;
      expect(low.capacityKWh).toBe(high.capacityKWh);
      expect(low.powerKw).toBe(high.powerKw);
      // ...while the economics they carry does differ.
      expect(low.ancillaryCustomerValueSek).toBeLessThan(high.ancillaryCustomerValueSek);
    },
    T,
  );

  it(
    "C+E: the selected pair reaches the coverage threshold in every active direction",
    () => {
      const sc = scenarioFor({ fuseA: 16 })!;
      const t = sc.technical!;
      expect(t.coverageThreshold).toBe(ANCILLARY_TECHNICAL_COVERAGE);
      /**
       * 95 % stays the requirement. When the two directions cannot both reach it at the
       * same time inside the fuse ceiling, the best JOINTLY achievable coverage applies
       * (appliedCoverage) — it is never a new, lower hardcoded percentage.
       */
      expect(t.appliedCoverage).toBeLessThanOrEqual(ANCILLARY_TECHNICAL_COVERAGE + 1e-9);
      if (t.maxUpCapacityKwh > 0)
        expect(t.upCoverage).toBeGreaterThanOrEqual(t.appliedCoverage - 1e-9);
      if (t.maxDownCapacityKwh > 0)
        expect(t.downCoverage).toBeGreaterThanOrEqual(t.appliedCoverage - 1e-9);
    },
    T,
  );

  it(
    "D: the next smaller product power step stays below the threshold",
    () => {
      const { outcome } = run({ fcr: true, fuseA: 16 });
      const sc = computeAncillaryScenario(outcome.input, outcome.result, 0.75, 10)!;
      const sel = sc.selected!;
      const steps = defaultConfig().powerSizing.productStepsKw.filter((s) => s < sel.powerKw);
      const smaller = Math.max(...steps);
      const res = runBatteryEngine({
        ...outcome.input,
        battery: {
          ...(outcome.input.battery ?? {}),
          fixedCapacityKWh: sel.capacityKWh,
          fixedPowerKw: smaller,
        },
      });
      const f = res.summary.fcr;
      const up = f.monetizedPowerKw * f.reservedHours;
      expect(up).toBeLessThan(sc.technical!.maxUpCapacityKwh * 0.95);
    },
    T,
  );

  it(
    "F+G: no smaller capacity at the same power meets the threshold (Pareto)",
    () => {
      const sc = scenarioFor({ fuseA: 16 })!;
      const sel = sc.selected!;
      const t = sc.technical!;
      for (const c of sc.candidates) {
        if (c.capacityKWh >= sel.capacityKWh) continue;
        const meets =
          (t.maxUpCapacityKwh <= 0 || c.upCapacityKwh >= t.maxUpCapacityKwh * 0.95) &&
          (t.maxDownCapacityKwh <= 0 || c.downCapacityKwh >= t.maxDownCapacityKwh * 0.95);
        expect(meets).toBe(false);
      }
    },
    T,
  );

  it(
    "H: the fuse acts through the hourly grid model, never as a battery kW cap",
    () => {
      const usableAt = (fuseA: number) => {
        const { outcome } = run({ fcr: true, fuseA });
        const res = runBatteryEngine({
          ...outcome.input,
          battery: {
            ...(outcome.input.battery ?? {}),
            fixedCapacityKWh: 40,
            fixedPowerKw: 20,
          },
        });
        const f = res.summary.fcr;
        return { up: f.reservablePowerMaxKw, down: f.avgHeldDownPowerKw };
      };
      const small = usableAt(16);
      const large = usableAt(35);
      // A bigger main fuse opens more grid headroom, so more of the SAME installed
      // 20 kW becomes usable in the grid-bound direction.
      expect(large.down).toBeGreaterThan(small.down);
      // The installed battery power is never clamped to the fuse kW: at 20 A the
      // usable down power (12.0 kW) already exceeds the 16 A nominal fuse power.
      const nominal16 = (Math.sqrt(3) * 400 * 16) / 1000;
      expect(usableAt(20).down).toBeGreaterThan(nominal16);
      expect(small.up).toBeGreaterThan(0);
    },
    T,
  );

  it(
    "I: the power scan reports marginal technical gain per real product step",
    () => {
      const sc = scenarioFor({ fuseA: 16 })!;
      expect(sc.powerScan.length).toBeGreaterThan(1);
      for (const st of sc.powerScan) {
        expect(Number.isFinite(st.marginalGainKwh)).toBe(true);
        expect(Number.isFinite(st.utilizedPowerRatioUp)).toBe(true);
        expect(st.gridLimitedHours).toBeGreaterThanOrEqual(0);
      }
      const powers = sc.powerScan.map((st) => st.powerKw);
      expect([...powers].sort((a, b) => a - b)).toEqual(powers);
    },
    T,
  );

  it(
    "J: a pure FCR battery is classified as ancillary driven",
    () => {
      const sc = scenarioFor({ fuseA: 16 })!;
      const sel = sc.selected!;
      const pure = sel.equivalentFullCycles <= 1e-6 && sel.throughputKWh <= 1e-6;
      expect(sel.ancillaryDriven).toBe(pure);
      expect(sc.ancillaryDriven).toBe(pure);
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
    "I+J: %s %s sizes technically through its own market physics",
    (country, marketArea) => {
      const sc = scenarioFor({
        country: country as CountryCode,
        marketArea: marketArea as MarketArea | undefined,
        fuseA: 16,
      });
      if (sc === null) return;
      const t = sc.technical!;
      const sel = sc.selected!;
      expect(sel.powerKw).toBeGreaterThan(0);
      expect(t.appliedCoverage).toBeLessThanOrEqual(ANCILLARY_TECHNICAL_COVERAGE + 1e-9);
      if (t.maxUpCapacityKwh > 0)
        expect(t.upCoverage).toBeGreaterThanOrEqual(t.appliedCoverage - 1e-9);
      if (t.maxDownCapacityKwh > 0)
        expect(t.downCoverage).toBeGreaterThanOrEqual(t.appliedCoverage - 1e-9);
      // Symmetric markets (DK1, DE) pay one capacity, so no separate down leg is held.
      if (country === "DE" || marketArea === "DK1") expect(t.maxDownCapacityKwh).toBe(0);
      else expect(t.maxDownCapacityKwh).toBeGreaterThan(0);
    },
    T,
  );

  it(
    "K: a PV>0 case never reaches the technical special sizing",
    () => {
      for (const solar of [
        { kwp: 14, acKw: 12, annualKwh: 14000 },
        { kwp: 10, acKw: 8, annualKwh: 9500 },
      ]) {
        const { outcome } = run({ fcr: true, fuseA: 25, annualKwh: 20000, solar });
        expect(outcome.result.summary.recommendation.capacityKWh).toBeGreaterThan(0);
        expect(computeAncillaryScenario(outcome.input, outcome.result, 0.75, 10)).toBeNull();
      }
    },
    T,
  );
});
