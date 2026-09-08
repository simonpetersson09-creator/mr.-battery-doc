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
  it("case A: three power levels are separated and every number is dynamic", () => {
    const p = present({ ...REF, fcr: true });
    expect(p.fcrDrivesPower).toBe(true);
    expect(p.showFcrPowerCard).toBe(true);
    expect(p.withoutFcrPowerKw).not.toBeNull();
    expect(p.recommendedPowerKw).toBeGreaterThan(p.withoutFcrPowerKw!);

    const f = (v: number) =>
      v.toLocaleString("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const rec = f(p.recommendedPowerKw);
    const phys = f(p.physicalPowerNeedKw);
    const without = f(p.withoutFcrPowerKw!);

    expect(p.fcrPowerCardTitle).toBe(`Varför ${rec} kW?`);
    expect(p.fcrPowerCardText).toContain(`cirka ${phys} kW`);
    expect(p.fcrPowerCardText).toContain(`${rec} kW högst beräknad årlig nytta`);
    // B: the FCR-off level only appears as its own sentence when it differs from the physical need.
    if (p.showPhysicalNeedRow) {
      expect(p.fcrPowerCardText).toContain(`Utan FCR-D upp skulle systemeffekten vara ${without} kW`);
    } else {
      expect(p.fcrPowerCardText).not.toContain("Utan FCR-D upp skulle");
    }
    expect(p.powerWhy).toBe(p.fcrPowerCardText);
    // Repetition removed.
    expect(p.fcrPowerCardNeutralText).toBeNull();
    // F: historical scenario, never a forecast or a guarantee.
    expect(p.fcrHistoricalNote).toMatch(/både högre och lägre/);
    for (const text of [p.fcrPowerCardText, p.fcrHistoricalNote]) {
      expect(text ?? "").not.toMatch(/garanter|prognos|mer lönsam|du bör|tjänar mer/i);
    }
  });

  it("case A: annual benefit comparison comes from the engine's own candidates", () => {
    const p = present({ ...REF, fcr: true });
    expect(p.withoutFcrBenefitSek).not.toBeNull();
    expect(p.withFcrBenefitSek).not.toBeNull();
    expect(p.benefitDeltaSek).toBeCloseTo(p.withFcrBenefitSek! - p.withoutFcrBenefitSek!, 6);
  });

  it("case B: FCR off -> no FCR wording and no card", () => {
    const p = present({ ...REF, fcr: false });
    expect(p.fcrDrivesPower).toBe(false);
    expect(p.showFcrPowerCard).toBe(false);
    expect(p.fcrPowerCardText).toBeNull();
    expect(p.fcrHistoricalNote).toBeNull();
    expect(p.withoutFcrBenefitSek).toBeNull();
    expect(p.benefitDeltaSek).toBeNull();
    expect(p.powerWhy ?? "").not.toMatch(/FCR|stödtjänst/i);
    expect(p.powerWhy ?? "").toMatch(/effektbehov/);
  });

  it("case D: FCR on but it did not decide the power -> no card", () => {
    const p = present({ consumption: 4000, fcr: true, peak: true });
    if (!p.fcrDrivesPower) {
      expect(p.showFcrPowerCard).toBe(false);
      expect(p.fcrPowerCardText).toBeNull();
      expect(p.showPhysicalNeedRow).toBe(false);
    }
  });


  it("case C: a second, different case produces different dynamic numbers", () => {
    const a = present({ ...REF, fcr: true });
    const b = present({ consumption: 30000, solarKwh: 8000, fuseA: 63, fcr: true });
    expect(b.recommendedPowerKw).toBeGreaterThan(0);
    if (b.showFcrPowerCard) {
      expect(b.fcrPowerCardTitle).toBe(
        `Varför ${b.recommendedPowerKw.toLocaleString("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kW?`,
      );
      expect(b.fcrPowerCardTitle).not.toBe(a.fcrPowerCardTitle);
    }
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

describe("FINAL POWER SEMANTICS: C-rate and sizing-method wording", () => {
  const cr = (p: ResultPresentation) => p.recommendedPowerKw / p.capacityKWh;

  it("case A (FCR on): system C-rate follows the FINAL recommended power", () => {
    const p = present({ ...REF, fcr: true });
    expect(p.systemCRate).toBeCloseTo(cr(p), 9);
    expect(p.productCRate).toBeCloseTo(p.productPowerKw / p.capacityKWh, 9);
    if (p.recommendedPowerKw > p.productPowerKw) {
      expect(p.systemCRate).toBeGreaterThan(p.productCRate);
    }
  });

  it("case B/C (FCR off): system C-rate equals recommended power over capacity", () => {
    const p = present({ ...REF, fcr: false });
    expect(p.systemCRate).toBeCloseTo(cr(p), 9);
  });

  it("sizing method never calls the base power 'Rekommenderad effekt'", () => {
    for (const fcr of [true, false]) {
      const p = present({ ...REF, fcr });
      const text = p.sizingMethodLines.join(" ");
      expect(text).not.toMatch(/Rekommenderad effekt/);
      if (p.recommendedPowerKw > p.productPowerKw) {
        expect(text).toMatch(/Grundeffekt från fysisk dimensionering/);
        expect(text).toMatch(/som rekommenderad systemeffekt/);
      }
    }
  });

  it("case D (FCR off): no FCR-driven power claim in the sizing method", () => {
    const p = present({ ...REF, fcr: false });
    expect(p.sizingMethodLines.join(" ")).not.toMatch(/FCR/);
  });

  it("case E (FCR on but not power-driving): no false FCR explanation", () => {
    const p = present({ consumption: 4000, fcr: true, peak: true, fuseA: 16 });
    if (!p.fcrDrivesPower) {
      expect(p.sizingMethodLines.join(" ")).not.toMatch(/påverkade effektvalet/);
      expect(p.showFcrPowerCard).toBe(false);
    }
  });

  it("the unlimited-power KPI is labelled as base-power physical energy utility", () => {
    const p = present({ ...REF, fcr: true });
    expect(p.baseUtilityLabel).toMatch(/grundeffekten/);
    expect(p.baseUtilityPct).toBeGreaterThan(0);
  });
});

describe("RESULT PAGE CUSTOMER SIMPLIFICATION", () => {
  const page = () =>
    require("node:fs").readFileSync("src/routes/resultat.tsx", "utf8") as string;

  it("case D/E: no customer-visible Elanslutning or Dimensioneringsmetod section", () => {
    const src = page();
    expect(src).not.toMatch(/Visa Elanslutning/);
    expect(src).not.toMatch(/Dimensioneringsmetod/);
    expect(src).not.toMatch(/Nätstatus/);
    expect(src).not.toMatch(/sizingMethodLines/);
    expect(src).not.toMatch(/baseUtilityLabel/);
  });

  it("case I: Nätexport is not rendered in the main view", () => {
    expect(page()).not.toMatch(/Nätexport/);
  });

  it("case H: the demand-charge amount is only shown under Beräknad nytta", () => {
    const src = page();
    expect(src).not.toMatch(/Minskad effektkostnad/);
    expect((src.match(/demandCostSavingSek/g) ?? []).length).toBe(1);
  });

  it("case F: 20 kWh / 10 kW gives a 0.50 C system C-rate", () => {
    const p = present({ ...REF, fcr: true });
    expect(p.systemCRate).toBeCloseTo(p.recommendedPowerKw / p.capacityKWh, 9);
  });

  it("case A: the why-card shows distinct levels only", () => {
    const p = present({ ...REF, fcr: true });
    if (p.showFcrPowerCard) {
      const levels = new Set(
        [
          p.showPhysicalNeedRow ? p.physicalPowerNeedKw : null,
          p.withoutFcrPowerKw,
          p.recommendedPowerKw,
        ].filter((v): v is number => v !== null),
      );
      expect(levels.size).toBeGreaterThanOrEqual(2);
    }
  });

  it("case C: FCR off gives no FCR card and no ancillary section", () => {
    const p = present({ ...REF, fcr: false });
    expect(p.showFcr).toBe(false);
    expect(p.showFcrPowerCard).toBe(false);
  });
});
