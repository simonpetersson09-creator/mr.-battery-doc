/**
 * NL / AT / CH — country rollout safety net.
 * Covers currency, locale, NL phase choice, ancillary isolation (no fallback to any
 * other country's prices or rules), CHF through calculation + PDF, and Dutch app/PDF.
 */
import { describe, expect, it } from "vitest";
import { i18n, SUPPORTED_LANGUAGES, t } from "@/i18n";
import {
  COUNTRIES,
  SUPPORTED_COUNTRY_CODES,
  defaultFuseA,
  fuseOptions,
  formatMoney,
  getCountry,
  gridStandardLabel,
  hasPhaseChoice,
  theoreticalGridPowerKw,
} from "@/lib/country-config";
import { convertCurrency, formatCurrency, localUnitsPerEur } from "@/lib/currency";
import { normalizeWizardToEngineInput } from "@/lib/battery-app/normalizeWizardToEngineInput";
import { runBatteryApp } from "@/lib/battery-app";
import { customerEconomyFromResult } from "@/lib/battery-app/customerEconomy";
import { ancillaryUnavailableText } from "@/lib/battery-app/ancillaryAvailability";
import {
  PENDING_ANCILLARY_MARKETS,
  fcrDownPriceSeriesForCountry,
  fcrPriceSeriesForCountry,
  hasConfiguredAncillaryProducts,
  marketProfileForPriceArea,
  priceAreaForMarket,
  SE_MARKET,
  FI_MARKET,
} from "@/lib/lab/ancillary";
import { reserveCalculationAvailable } from "@/lib/reserve-market";
import { getReportCopy } from "@/lib/report/copy";
import { buildReportModel, collectReportText } from "@/lib/report/reportModel";
import { createInitialState, type WizardState } from "@/state/wizard";

const NEW = ["NL", "AT", "CH"] as const;

function caseFor(country: WizardState["grid"]["country"], patch?: (s: WizardState) => void) {
  const s = structuredClone(createInitialState(country));
  s.grid.gridValuesConfirmed = true;
  s.consumption.annualKwh = 20000;
  s.consumption.profileId = "normal";
  s.production.mode = "manual";
  s.production.annualKwh = 10000;
  s.strategies.fcrDUp = true;
  patch?.(s);
  return s;
}

describe("seven countries", () => {
  it("lists all seven, with currency and locale per country", () => {
    expect(SUPPORTED_COUNTRY_CODES.slice(0, 7)).toEqual(["SE", "FI", "DK", "DE", "NL", "AT", "CH"]);
    const expected = {
      SE: ["SEK", "sv-SE"], FI: ["EUR", "fi-FI"], DK: ["DKK", "da-DK"], DE: ["EUR", "de-DE"],
      NL: ["EUR", "nl-NL"], AT: ["EUR", "de-AT"], CH: ["CHF", "de-CH"],
    } as const;
    for (const c of SUPPORTED_COUNTRY_CODES.slice(0, 7)) {
      expect(getCountry(c).economy.currency).toBe(expected[c as keyof typeof expected][0]);
      expect(getCountry(c).locale).toBe(expected[c as keyof typeof expected][1]);
    }
  });

  it("uses the requested defaults for NL/AT/CH", () => {
    expect(COUNTRIES.NL.economy.importPrice).toBe(0.244);
    expect(COUNTRIES.AT.economy.importPrice).toBe(0.293);
    expect(COUNTRIES.CH.economy.importPrice).toBe(0.277);
    expect(COUNTRIES.CH.economy.exportPrice).toBe(0.06);
    for (const c of NEW) expect(COUNTRIES[c].economy.demandCharge).toBe(0);
    expect(COUNTRIES.NL.grid.standards).toEqual(["NEN 1010"]);
    expect(COUNTRIES.AT.grid.standards).toEqual(["OVE E 8101:2025"]);
    expect(COUNTRIES.CH.grid.standards).toEqual(["NIN 2025 / SN 411000"]);
  });
});

describe("NL connection type", () => {
  it("offers 1-phase and 3-phase, default 3 x 25 A", () => {
    expect(hasPhaseChoice("NL")).toBe(true);
    expect(hasPhaseChoice("AT")).toBe(false);
    expect(hasPhaseChoice("SE")).toBe(false);
    expect(createInitialState("NL").grid.phases).toBe(3);
    expect(defaultFuseA("NL", 3)).toBe(25);
    expect(fuseOptions("NL", 3)).toEqual(expect.arrayContaining([25, 35, 50, 63, 80]));
    expect(fuseOptions("NL", 1)).toContain(35);
  });

  it("3-phase: P = sqrt(3) x 400 x A; 1-phase: P = 230 x A", () => {
    expect(theoreticalGridPowerKw(25, "NL", 3)).toBeCloseTo(17.32, 2);
    expect(theoreticalGridPowerKw(35, "NL", 1)).toBeCloseTo(8.05, 2);
    expect(gridStandardLabel("NL", 1)).toContain("230 V");
  });

  it("passes the chosen connection to the engine", () => {
    const one = normalizeWizardToEngineInput(caseFor("NL", (s) => { s.grid.phases = 1; s.grid.mainFuseA = 35; }));
    expect(one.site).toMatchObject({ phases: 1, voltageV: 230, mainFuseA: 35, country: "NL" });
    const three = normalizeWizardToEngineInput(caseFor("NL"));
    expect(three.site).toMatchObject({ phases: 3, voltageV: 400, mainFuseA: 25, country: "NL" });
  });

  it("other countries ignore a stray phase value and stay 3-phase 400 V", () => {
    const s = caseFor("SE", (x) => { x.grid.phases = 1; });
    expect(normalizeWizardToEngineInput(s).site).toMatchObject({ phases: 3, voltageV: 400 });
  });
});

describe("ancillary isolation for NL/AT/CH", () => {
  for (const c of NEW) {
    it(`${c}: own market, no other country's prices or rules, revenue 0`, () => {
      expect(fcrPriceSeriesForCountry(c)).toBeNull();
      expect(fcrDownPriceSeriesForCountry(c)).toBeNull();
      expect(priceAreaForMarket(c)).toBe(c);
      const profile = marketProfileForPriceArea(c);
      expect(profile).not.toBe(SE_MARKET);
      expect(profile).not.toBe(FI_MARKET);
      expect(profile.id).toBe(c);
      expect(profile.services).toEqual([]);
      expect(reserveCalculationAvailable(c)).toBe(false);

      const state = caseFor(c);
      const input = normalizeWizardToEngineInput(state);
      expect(input.site?.country).toBe(c); // never untagged => never legacy Swedish
      expect(input.strategies?.fcrDUp).toBeFalsy();

      const outcome = runBatteryApp(state);
      if (outcome.status !== "ok") throw new Error(outcome.status);
      const ce = customerEconomyFromResult(outcome.result, state.preferences.customerAncillaryShare);
      expect(ce.ancillaryMarketValueSek).toBe(0);
      expect(ce.ancillaryCustomerValueSek).toBe(0);
      expect(ancillaryUnavailableText(c)).toBe(t("ancillary.priceDataNotConfigured", { where: t(`countries.${c}`) }));
    });
  }

  it("country markets can get their own products without engine changes", () => {
    for (const c of NEW) {
      expect(PENDING_ANCILLARY_MARKETS[c].country).toBe(c);
      expect(hasConfiguredAncillaryProducts(c)).toBe(false);
    }
    expect(PENDING_ANCILLARY_MARKETS.NL.products).not.toBe(PENDING_ANCILLARY_MARKETS.AT.products);
    const draft = structuredClone(PENDING_ANCILLARY_MARKETS.NL);
    draft.products.push({
      id: "NL_FCR", kind: "FCR", label: "FCR", direction: "symmetric", priceSeriesId: "NL_FCR_TEST",
      energyPriceEurPerMWh: null, minBidKw: null, requiresAggregator: null, enduranceMinutes: null,
      prequalification: null, source: null, verified: true,
    });
    expect(draft.products).toHaveLength(1);
    expect(PENDING_ANCILLARY_MARKETS.NL.products).toHaveLength(0);
  });
});

describe("CHF", () => {
  it("is a full currency: rate, conversion, formatting", () => {
    expect(localUnitsPerEur("CH")).toBeGreaterThan(0);
    expect(convertCurrency(100, "CHF", "CHF")).toBe(100);
    expect(convertCurrency(convertCurrency(100, "CHF", "EUR"), "EUR", "CHF")).toBeCloseTo(100, 8);
    expect(formatCurrency(1234, "CHF")).toContain("CHF");
    expect(formatMoney(1234, "CH", 0)).toContain("CHF");
    expect(createInitialState("CH").economy.currency).toBe("CHF");
  });

  it("flows through the calculation and the PDF report", () => {
    const state = caseFor("CH");
    const outcome = runBatteryApp(state);
    if (outcome.status !== "ok") throw new Error(outcome.status);
    expect(outcome.input.economy?.importEnergyPriceSekPerKWh).toBe(0.277);
    expect(outcome.input.economy?.eurSekRate).toBe(localUnitsPerEur("CH"));
    const model = buildReportModel({
      outcome, language: "de",
      customerEconomy: customerEconomyFromResult(outcome.result, state.preferences.customerAncillaryShare),
      targetPaybackYears: 10, alternatives: [], now: new Date(2026, 9, 1), reportId: "MBD-TEST-CH",
    });
    const text = collectReportText(model).join("\n");
    expect(text).toContain("CHF");
    expect(text).not.toMatch(/\bkr\b|SEK/);
  });
});

describe("Dutch", () => {
  it("is a supported app language with its own strings", () => {
    expect(SUPPORTED_LANGUAGES).toContain("nl");
    void i18n.changeLanguage("nl");
    try {
      expect(t("countries.NL")).toBe("Nederland");
      expect(t("common.next")).not.toBe(i18n.getFixedT("en")("common.next"));
    } finally {
      void i18n.changeLanguage("sv");
    }
  });

  it("has its own PDF copy and produces a Dutch report", () => {
    expect(getReportCopy("nl")).not.toBe(getReportCopy("en"));
    const state = caseFor("NL");
    const outcome = runBatteryApp(state);
    if (outcome.status !== "ok") throw new Error(outcome.status);
    const model = buildReportModel({
      outcome, language: "nl",
      customerEconomy: customerEconomyFromResult(outcome.result, state.preferences.customerAncillaryShare),
      targetPaybackYears: 10, alternatives: [], now: new Date(2026, 9, 1), reportId: "MBD-TEST-NL",
    });
    expect(model.title).toBe(getReportCopy("nl").title);
    expect(collectReportText(model).join("\n")).toContain("€");
  });

  it("names NL/AT/CH in every supported language", () => {
    for (const lng of SUPPORTED_LANGUAGES) {
      const tl = i18n.getFixedT(lng);
      for (const c of NEW) expect(tl(`countries.${c}`)).not.toBe(`countries.${c}`);
    }
  });
});
