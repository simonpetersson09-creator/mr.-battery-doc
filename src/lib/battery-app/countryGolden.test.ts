/**
 * COUNTRY GOLDEN REGRESSION SUITE.
 *
 * Fifteen frozen customer cases across every market Mr. Battery Doc sells in.
 * They exist so that a future UI, StoreKit, native or refactor change can never
 * silently move a calculation result.
 *
 * What is asserted:
 *   1. Hard invariants that must hold for EVERY case (no NaN/Infinity, no
 *      negative sizing, the 200 kW product ceiling, a closed energy balance,
 *      and the three customer-economy identities).
 *   2. Frozen recommended kWh / kW per case. These were not blindly copied from
 *      today's output — each was checked against the case's own consumption,
 *      solar and connection size before being frozen (see CASES comments).
 *
 * If a value here changes, the calculation model changed. Investigate before
 * touching the numbers.
 */
import { describe, expect, it } from "vitest";

import { runBatteryApp } from "./index";
import {
  customerEconomyFromResult,
  maxInvestmentSek,
  clampTargetPaybackYears,
} from "./customerEconomy";
import { createInitialState, type WizardState } from "@/state/wizard";
import type { CountryCode } from "@/lib/country-config";

type MarketArea = NonNullable<WizardState["grid"]["marketArea"]>;

/** Full 8760 engine runs are slow. */
const T = 240_000;

/** The largest product Mr. Battery Doc may ever recommend. */
const MAX_PRODUCT_POWER_KW = 200;

interface Case {
  label: string;
  country: CountryCode;
  marketArea?: MarketArea;
  fuseA: number;
  annualKwh: number;
  profileId: string;
  /** null = no solar at all. */
  solar: { kwp: number; acKw: number; annualKwh: number } | null;
  peakShaving: boolean;
  fcr: boolean;
  importPrice?: number;
  exportPrice?: number;
  demandCharge?: number;
  ancillaryShare?: number;
  paybackYears?: number;
}

const CASES: Record<string, Case> = {
  // --- Sweden -------------------------------------------------------------
  CG01: {
    label: "SE normalvilla 10 000 kWh, 12 kWp sol, 16 A",
    country: "SE",
    fuseA: 16,
    annualKwh: 10000,
    profileId: "evening-heavy",
    solar: { kwp: 12, acKw: 10, annualKwh: 12000 },
    peakShaving: false,
    fcr: false,
  },
  CG02: {
    label: "SE hogforbrukande villa 25 000 kWh, varmepump, peak shaving",
    country: "SE",
    fuseA: 25,
    annualKwh: 25000,
    profileId: "heat-pump",
    solar: { kwp: 15, acKw: 12, annualKwh: 14000 },
    peakShaving: true,
    fcr: false,
  },
  CG03: {
    label: "SE villa utan sol, elbil, 63 A",
    country: "SE",
    fuseA: 63,
    annualKwh: 18000,
    profileId: "ev-night",
    solar: null,
    peakShaving: true,
    fcr: false,
  },
  CG04: {
    label: "SE kontor 400 000 kWh, 200 A, stodtjanster",
    country: "SE",
    fuseA: 200,
    annualKwh: 400000,
    profileId: "office",
    solar: { kwp: 300, acKw: 250, annualKwh: 300000 },
    peakShaving: true,
    fcr: true,
    ancillaryShare: 0.75,
  },
  CG05: {
    label: "SE liten lagenhet 3 000 kWh, ingen sol, effektavgift 0",
    country: "SE",
    fuseA: 16,
    annualKwh: 3000,
    profileId: "evening-heavy",
    solar: null,
    peakShaving: false,
    fcr: false,
    demandCharge: 0,
  },
  // --- Finland ------------------------------------------------------------
  CG06: {
    label: "FI villa 20 000 kWh, varmepump, liten sol",
    country: "FI",
    fuseA: 25,
    annualKwh: 20000,
    profileId: "heat-pump",
    solar: { kwp: 8, acKw: 8, annualKwh: 6500 },
    peakShaving: true,
    fcr: false,
  },
  CG07: {
    label: "FI fastighet 120 000 kWh, 100 A, stodtjanster 100 %",
    country: "FI",
    fuseA: 100,
    annualKwh: 120000,
    profileId: "office",
    solar: { kwp: 90, acKw: 80, annualKwh: 75000 },
    peakShaving: true,
    fcr: true,
    ancillaryShare: 1,
  },
  // --- Germany ------------------------------------------------------------
  CG08: {
    label: "DE villa 8 000 kWh, 10 kWp sol, hogt importpris",
    country: "DE",
    fuseA: 35,
    annualKwh: 8000,
    profileId: "evening-heavy",
    solar: { kwp: 10, acKw: 9, annualKwh: 10000 },
    peakShaving: false,
    fcr: false,
  },
  CG09: {
    label: "DE fastighet 250 000 kWh, 200 A, peak shaving",
    country: "DE",
    fuseA: 200,
    annualKwh: 250000,
    profileId: "office",
    solar: { kwp: 200, acKw: 170, annualKwh: 190000 },
    peakShaving: true,
    fcr: false,
  },
  CG10: {
    label: "DE utan sol 30 000 kWh, effektavgift hog",
    country: "DE",
    fuseA: 63,
    annualKwh: 30000,
    profileId: "normal",
    solar: null,
    peakShaving: true,
    fcr: false,
    demandCharge: 120,
  },
  // --- Denmark DK1 --------------------------------------------------------
  CG11: {
    label: "DK1 villa 15 000 kWh, 10 kWp sol",
    country: "DK",
    marketArea: "DK1",
    fuseA: 25,
    annualKwh: 15000,
    profileId: "evening-heavy",
    solar: { kwp: 10, acKw: 9, annualKwh: 9500 },
    peakShaving: true,
    fcr: false,
  },
  CG12: {
    label: "DK1 fastighet 200 000 kWh med stodtjanster",
    country: "DK",
    marketArea: "DK1",
    fuseA: 200,
    annualKwh: 200000,
    profileId: "office",
    solar: { kwp: 150, acKw: 120, annualKwh: 140000 },
    peakShaving: true,
    fcr: true,
    ancillaryShare: 0.75,
  },
  // --- Denmark DK2 --------------------------------------------------------
  CG13: {
    label: "DK2 villa 12 000 kWh, elbil, ingen sol",
    country: "DK",
    marketArea: "DK2",
    fuseA: 35,
    annualKwh: 12000,
    profileId: "ev-night",
    solar: null,
    peakShaving: true,
    fcr: false,
  },
  CG14: {
    label: "DK2 fastighet 90 000 kWh, stodtjanster 100 %, payback 20 ar",
    country: "DK",
    marketArea: "DK2",
    fuseA: 100,
    annualKwh: 90000,
    profileId: "office",
    solar: { kwp: 70, acKw: 60, annualKwh: 62000 },
    peakShaving: true,
    fcr: true,
    ancillaryShare: 1,
    paybackYears: 20,
  },
  // --- Extremes -----------------------------------------------------------
  CG15: {
    label: "SE mycket stor fastighet 1 200 000 kWh — 200 kW-taket",
    country: "SE",
    fuseA: 630,
    annualKwh: 1200000,
    profileId: "office",
    solar: { kwp: 800, acKw: 700, annualKwh: 760000 },
    peakShaving: true,
    fcr: true,
    ancillaryShare: 0.75,
    paybackYears: 5,
  },
};

/**
 * Frozen recommendations. Each pair was sanity-checked against the case size
 * before freezing: capacity scales with consumption and solar surplus, power
 * never exceeds the grid connection or the 200 kW product ceiling.
 */
const EXPECTED: Record<string, { capacityKWh: number; powerKw: number }> = {
  CG01: { capacityKWh: 15, powerKw: 3 },
  CG02: { capacityKWh: 25, powerKw: 5 },
  CG03: { capacityKWh: 5, powerKw: 3 },
  CG04: { capacityKWh: 300, powerKw: 150 },
  CG05: { capacityKWh: 0, powerKw: 0 },
  CG06: { capacityKWh: 15, powerKw: 3 },
  CG07: { capacityKWh: 50, powerKw: 25 },
  CG08: { capacityKWh: 15, powerKw: 3 },
  CG09: { capacityKWh: 150, powerKw: 30 },
  CG10: { capacityKWh: 5, powerKw: 3 },
  CG11: { capacityKWh: 20, powerKw: 3 },
  CG12: { capacityKWh: 100, powerKw: 50 },
  /**
   * MODEL DECISION (peak shaving with demandFee = 0): Denmark prices no demand charge,
   * so economically driven peak shaving no longer charges from the grid. CG13 previously
   * froze 5 kWh / 3 kW and CG14 50 kWh / 25 kW, both built on grid-charged peak energy
   * that could never be repaid. The physical peak reduction is still simulated.
   */
  CG13: { capacityKWh: 0, powerKw: 0 },
  CG14: { capacityKWh: 40, powerKw: 20 },
  /**
   * CG15 previously froze 250 kW — the PHYSICAL need at 500 kWh / 0.5 C. That is not a
   * purchasable product level; the recommendation is capped at the 200 kW product step.
   * The physical need itself is still reported unclamped.
   */
  CG15: { capacityKWh: 500, powerKw: 200 },
};

function buildState(c: Case): WizardState {
  const s = createInitialState(c.country);
  if (c.marketArea) s.grid.marketArea = c.marketArea;
  s.grid.mainFuseA = c.fuseA;
  s.grid.mainFuseManual = true;
  s.grid.gridValuesConfirmed = true;

  s.consumption.mode = "annual";
  s.consumption.annualKwh = c.annualKwh;
  s.consumption.profileId = c.profileId;

  if (c.solar) {
    s.production.mode = "manual";
    s.production.dcKwp = c.solar.kwp;
    s.production.acKw = c.solar.acKw;
    s.production.annualKwh = c.solar.annualKwh;
  } else {
    s.production.mode = "none";
  }

  s.strategies.peakShaving = c.peakShaving;
  s.strategies.fcrDUp = c.fcr;

  if (c.importPrice !== undefined) s.economy.importPrice = c.importPrice;
  if (c.exportPrice !== undefined) s.economy.exportPrice = c.exportPrice;
  if (c.demandCharge !== undefined) s.economy.demandCharge = c.demandCharge;
  if (c.ancillaryShare !== undefined) s.preferences.customerAncillaryShare = c.ancillaryShare;
  if (c.paybackYears !== undefined) s.preferences.targetPaybackYears = c.paybackYears;
  return s;
}

function finite(label: string, value: number | null | undefined) {
  if (value === null || value === undefined) return;
  expect(Number.isFinite(value), `${label} must be a finite number, got ${value}`).toBe(true);
}

describe("country golden regression cases", () => {
  for (const [key, c] of Object.entries(CASES)) {
    it(
      `${key}: ${c.label}`,
      () => {
        const state = buildState(c);
        const outcome = runBatteryApp(state);
        expect(outcome.status, `${key} must produce a result`).toBe("ok");
        if (outcome.status !== "ok") return;

        const s = outcome.result.summary;
        const rec = s.recommendation;

        // --- hard invariants, every case ---------------------------------
        finite(`${key} capacity`, rec.capacityKWh);
        finite(`${key} power`, rec.powerKw);
        expect(rec.capacityKWh).toBeGreaterThanOrEqual(0);
        expect(rec.powerKw).toBeGreaterThanOrEqual(0);
        // The product ladder is capped at 200 kW; the operating optimum may sit
        // higher (0.5 C of a large pack) and is reported separately.
        expect(rec.productPowerKw ?? 0).toBeLessThanOrEqual(MAX_PRODUCT_POWER_KW);
        // 0.5 C ceiling, with the engine's smallest product step as the floor.
        expect(rec.powerKw).toBeLessThanOrEqual(Math.max(3, rec.capacityKWh * 0.5) + 1e-9);

        for (const [name, value] of Object.entries(s.energy)) {
          if (typeof value === "number") finite(`${key} energy.${name}`, value);
        }
        for (const [name, value] of Object.entries(s.grid)) {
          if (typeof value === "number") finite(`${key} grid.${name}`, value);
        }
        expect(s.energy.importAfterKWh).toBeGreaterThanOrEqual(0);
        expect(s.energy.selfConsumptionAfterPct).toBeLessThanOrEqual(100 + 1e-9);
        expect(s.energyBalance.ok, `${key} energy balance must close`).toBe(true);

        // --- customer economy identities ---------------------------------
        const share = state.preferences.customerAncillaryShare;
        const ce = customerEconomyFromResult(outcome.result, share);
        expect(ce.ancillaryCustomerValueSek).toBeCloseTo(
          ce.ancillaryMarketValueSek * ce.customerAncillaryShare,
          6,
        );
        if (ce.totalCustomerBenefitSek !== null && ce.engineTotalBenefitSek !== null) {
          const parts = ce.energyBenefitSek + ce.peakBenefitSek + ce.ancillaryCustomerValueSek;
          // The engine total is rounded to ore/cent; the parts are not.
          expect(Math.abs((ce.totalCustomerBenefitSek as number) - parts)).toBeLessThan(0.02);
        }

        const years = clampTargetPaybackYears(state.preferences.targetPaybackYears);
        const maxInv = maxInvestmentSek(ce.totalCustomerBenefitSek, years);
        if (maxInv !== null) {
          expect(maxInv).toBeCloseTo((ce.totalCustomerBenefitSek as number) * years, 6);
          expect(maxInv).toBeGreaterThan(0);
        }

        // --- frozen result -----------------------------------------------
        const expected = EXPECTED[key];
        if (!expected) {
          // eslint-disable-next-line no-console
          console.log(
            `FREEZE ${key}: { capacityKWh: ${rec.capacityKWh}, powerKw: ${rec.powerKw} },`,
          );
          return;
        }
        expect(rec.capacityKWh, `${key} recommended capacity changed`).toBe(expected.capacityKWh);
        expect(rec.powerKw, `${key} recommended power changed`).toBe(expected.powerKw);
      },
      T,
    );
  }
});
