/**
 * AT / CH — country rollout safety net (the Netherlands and Dutch were removed).
 * Covers currency, locale, ancillary isolation (no fallback to any other country's
 * prices or rules) and CHF through calculation + PDF.
 */
import { describe, expect, it } from "vitest";
import { i18n, SUPPORTED_LANGUAGES, t } from "@/i18n";
import {
  COUNTRIES,
  SUPPORTED_COUNTRY_CODES,
  SUPPORTED_COUNTRY_LIST,
  defaultFuseA,
  fuseOptions,
  formatMoney,
  getCountry,
  gridStandardLabel,
  hasPhaseChoice,
  isSupportedCountry,
  theoreticalGridPowerKw,
  type CountryCode,
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

const NEW = ["AT", "CH"] as const;

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

describe("six countries", () => {
  it("lists the first six, with currency and locale per country", () => {
    expect(SUPPORTED_COUNTRY_CODES.slice(0, 6)).toEqual(["SE", "FI", "DK", "DE", "AT", "CH"]);
    const expected = {
      SE: ["SEK", "sv-SE"], FI: ["EUR", "fi-FI"], DK: ["DKK", "da-DK"], DE: ["EUR", "de-DE"],
      AT: ["EUR", "de-AT"], CH: ["CHF", "de-CH"],
    } as const;
    for (const c of SUPPORTED_COUNTRY_CODES.slice(0, 6)) {
      expect(getCountry(c).economy.currency).toBe(expected[c as keyof typeof expected][0]);
      expect(getCountry(c).locale).toBe(expected[c as keyof typeof expected][1]);
    }
  });

  it("uses the requested defaults for AT/CH", () => {
    expect(COUNTRIES.AT.economy.importPrice).toBe(0.293);
    expect(COUNTRIES.CH.economy.importPrice).toBe(0.277);
    expect(COUNTRIES.CH.economy.exportPrice).toBe(0.06);
    for (const c of NEW) expect(COUNTRIES[c].economy.demandCharge).toBe(0);
    expect(COUNTRIES.AT.grid.standards).toEqual(["OVE E 8101:2025"]);
    expect(COUNTRIES.CH.grid.standards).toEqual(["NIN 2025 / SN 411000"]);
  });
});

describe("connection type", () => {
  it("countries without a phase choice ignore a stray phase value and stay 3-phase 400 V", () => {
    const s = caseFor("SE", (x) => { x.grid.phases = 1; });
    expect(normalizeWizardToEngineInput(s).site).toMatchObject({ phases: 3, voltageV: 400 });
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

describe("Netherlands is not a market; Dutch stays as a Belgian language", () => {
  it("NL is not a supported market and cannot be selected as a country", () => {
    expect(SUPPORTED_COUNTRY_CODES as readonly string[]).not.toContain("NL");
    expect(Object.keys(COUNTRIES) as string[]).not.toContain("NL");
    expect(isSupportedCountry("NL" as unknown as CountryCode)).toBe(false);
    expect(SUPPORTED_COUNTRY_LIST.map((c) => c.locale)).not.toContain("nl-NL");
  });

  it("Dutch (nl) remains a supported language for Belgium", () => {
    expect(SUPPORTED_LANGUAGES as readonly string[]).toContain("nl");
    expect(getReportCopy("nl")).not.toBe(getReportCopy("en"));
  });

  it("names AT/CH in every supported language", () => {
    for (const lng of SUPPORTED_LANGUAGES) {
      const tl = i18n.getFixedT(lng);
      for (const c of NEW) expect(tl(`countries.${c}`)).not.toBe(`countries.${c}`);
    }
  });
});
