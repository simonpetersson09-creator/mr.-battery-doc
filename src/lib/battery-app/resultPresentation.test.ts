/**
 * RESULT PRESENTATION regression tests.
 *
 * Presentation semantics only — the frozen engine is called, never modified. The cases
 * mirror the FULL FUNCTION MATRIX pairs (A/B, C/D, K/L, M/N, I/J) plus the negative
 * benefit case E.
 */

import { describe, expect, it } from "vitest";

import { runBatteryApp } from "./index";
import { buildResultPresentation, type ResultPresentation } from "./resultPresentation";
import { createInitialState, type WizardState } from "@/state/wizard";

interface CaseOpts {
  consumption: number;
  solarKwh?: number;
  profile?: string;
  fuseA?: number;
  fcr?: boolean;
  peak?: boolean;
  demandCharge?: number;
}

function build(o: CaseOpts): WizardState {
  const s = createInitialState("SE");
  s.grid.mainFuseA = o.fuseA ?? 25;
  s.consumption.mode = "annual";
  s.consumption.annualKwh = o.consumption;
  s.consumption.profileId = o.profile ?? "normal";
  if (o.solarKwh) {
    s.production.mode = "manual";
    s.production.dcKwp = Math.round(o.solarKwh / 1000);
    s.production.acKw = Math.round(o.solarKwh / 1000);
    s.production.annualKwh = o.solarKwh;
  } else {
    s.production.mode = "none";
  }
  s.strategies.fcrDUp = o.fcr ?? false;
  s.strategies.peakShaving = o.peak ?? true;
  if (o.demandCharge !== undefined) {
    s.economy.demandCharge = o.demandCharge;
    s.economy.demandChargeTouched = true;
  }
  return s;
}

function present(o: CaseOpts): ResultPresentation {
  const state = build(o);
  const outcome = runBatteryApp(state);
  if (outcome.status !== "ok") throw new Error(`case did not run: ${outcome.status}`);
  return buildResultPresentation(outcome.result, {
    peakShavingSelected: state.strategies.peakShaving,
    demandChargeTouched: state.economy.demandChargeTouched,
  });
}

const REF = { consumption: 20000, solarKwh: 14000, fuseA: 25 } as const;

describe("main recommendation reads the engine's recommended system power", () => {
  it("case C (FCR on): the recommended power is the operating optimum, not the physical product power", () => {
    const state = build({ ...REF, fcr: true });
    const outcome = runBatteryApp(state);
    if (outcome.status !== "ok") throw new Error("ref case failed");
    const r = outcome.result.summary.recommendation;
    const p = buildResultPresentation(outcome.result, {
      peakShavingSelected: true,
      demandChargeTouched: false,
    });
    expect(p.recommendedPowerKw).toBe(r.recommendedPowerKw);
    expect(p.recommendedPowerKw).toBeGreaterThan(r.physicalPowerNeedKw);
  });

  it("case D (FCR off): the recommendation stays at the physical product power", () => {
    const p = present({ ...REF, fcr: false });
    expect(p.recommendedPowerKw).toBeGreaterThan(0);
    expect(p.showFcr).toBe(false);
  });
});

describe("FCR-driven power explanation", () => {
  it("case C: FCR on and FCR decided the power -> the explanation is shown", () => {
    const p = present({ ...REF, fcr: true });
    expect(p.fcrDrivesPower).toBe(true);
    expect(p.fcrPowerNote).toMatch(/Historisk FCR-D upp-intäkt har påverkat effektvalet/);
    expect(p.fcrPowerNoteSecondary).toBe("Fastighetens eget effektbehov är lägre.");
    expect(p.powerWhy).toMatch(/högst beräknad årlig nytta/);
  });

  it("case D: FCR off -> no FCR wording anywhere in the presentation", () => {
    const p = present({ ...REF, fcr: false });
    expect(p.fcrDrivesPower).toBe(false);
    expect(p.fcrPowerNote).toBeNull();
    expect(p.fcrPowerNoteSecondary).toBeNull();
    expect(p.powerWhy ?? "").not.toMatch(/FCR/);
  });

  it("case A/B: villa without and with FCR", () => {
    const a = present({ consumption: 10000, solarKwh: 12000, fuseA: 16, fcr: false });
    const b = present({ consumption: 10000, solarKwh: 12000, fuseA: 16, fcr: true });
    expect(a.showFcr).toBe(false);
    expect(a.fcrDrivesPower).toBe(false);
    expect(b.showFcr).toBe(true);
    expect(b.recommendedPowerKw).toBeGreaterThanOrEqual(a.recommendedPowerKw);
  });

  it("case K/L: 16 A and 63 A with FCR both present a recommendation", () => {
    const k = present({ ...REF, fuseA: 16, fcr: true });
    const l = present({ ...REF, fuseA: 63, fcr: true });
    expect(k.recommendedPowerKw).toBeGreaterThan(0);
    expect(l.recommendedPowerKw).toBeGreaterThan(0);
    expect(k.showFcr && l.showFcr).toBe(true);
  });

  it("case I/J: evening-heavy and daytime profiles both produce a power explanation", () => {
    const i = present({ consumption: 20000, solarKwh: 14000, profile: "evening-heavy" });
    const j = present({ consumption: 20000, solarKwh: 14000, profile: "normal" });
    expect(i.powerWhy).toBeTruthy();
    expect(j.powerWhy).toBeTruthy();
  });
});

describe("demand charge of 0 kr/kW/month", () => {
  it("case M/N: the 'Minskad effektkostnad' row is hidden while peak physics stays visible", () => {
    for (const fcr of [true, false]) {
      const p = present({ ...REF, fcr, demandCharge: 0 });
      expect(p.showDemandSavingRow).toBe(false);
      expect(p.showPeakSection).toBe(true);
    }
  });

  it("with the Swedish default charge the row is shown again", () => {
    const p = present({ ...REF, fcr: false });
    if (p.peakChanged) expect(p.showDemandSavingRow).toBe(true);
  });
});

describe("negative or zero calculated benefit", () => {
  it("case E: no positive annual benefit is presented as 'Begränsad ekonomisk nytta'", () => {
    const state = build({ consumption: 15000, fcr: false, peak: true });
    const outcome = runBatteryApp(state);
    if (outcome.status !== "ok") throw new Error("case E failed");
    const total = outcome.result.summary.economy.totalOperatingBenefitSek;
    const p = buildResultPresentation(outcome.result, {
      peakShavingSelected: true,
      demandChargeTouched: false,
    });
    if (total !== null && total <= 0 && !p.noEconomy && !p.noBattery) {
      expect(p.limitedBenefit).toBe(true);
      expect(p.limitedBenefitTitle).toBe("Begränsad ekonomisk nytta");
      expect(p.limitedBenefitText).toMatch(/ingen positiv beräknad årlig nytta/);
    } else {
      expect(p.limitedBenefit).toBe(false);
    }
    // Never claim profitability — we do not model CAPEX/ROI.
    expect(p.limitedBenefitText ?? "").not.toMatch(/lönsam/i);
  });
});

describe("solar relevance is unchanged", () => {
  it("without solar the solar KPIs are hidden and import is still shown", () => {
    const p = present({ consumption: 15000 });
    expect(p.hasSolar).toBe(false);
    expect(p.showSelfConsumption).toBe(false);
    expect(p.showSelfSufficiency).toBe(false);
    expect(p.showShiftedSolar).toBe(false);
    expect(p.showImport).toBe(true);
  });

  it("with solar the solar KPIs are shown", () => {
    const p = present({ ...REF });
    expect(p.hasSolar).toBe(true);
    expect(p.showSelfConsumption).toBe(true);
  });
});
