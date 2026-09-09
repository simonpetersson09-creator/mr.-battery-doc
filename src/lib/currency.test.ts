import { describe, expect, it } from "vitest";
import {
  convertCurrency,
  currencyForCountry,
  DEFAULT_RATES_PER_EUR,
  formatCurrency,
  formatPerYear,
  localUnitsPerEur,
} from "@/lib/currency";
import { COUNTRIES, countryCurrency, formatMoney, getCountry } from "@/lib/country-config";
import { createInitialState } from "@/state/wizard";

describe("country -> display currency (A-E)", () => {
  it("Sweden is SEK", () => expect(countryCurrency("SE")).toBe("SEK"));
  it("Finland is EUR", () => expect(countryCurrency("FI")).toBe("EUR"));
  it("Germany is EUR", () => expect(countryCurrency("DE")).toBe("EUR"));
  it("Denmark is DKK, for both DK1 and DK2", () => {
    expect(countryCurrency("DK")).toBe("DKK");
    // Market area never changes the customer's currency.
    expect(currencyForCountry("DK")).toBe("DKK");
  });
});

describe("EUR reserve revenue -> local currency (F-H)", () => {
  const revenueEur = 1000;
  it("Germany: EUR -> EUR is untouched (F)", () => {
    expect(convertCurrency(revenueEur, "EUR", "EUR")).toBe(revenueEur);
    expect(localUnitsPerEur("DE")).toBe(1);
  });
  it("Sweden: EUR -> SEK uses the single central rate (G)", () => {
    expect(convertCurrency(revenueEur, "EUR", "SEK")).toBeCloseTo(11300, 6);
    expect(localUnitsPerEur("SE")).toBe(DEFAULT_RATES_PER_EUR.SEK);
  });
  it("Denmark: EUR -> DKK (H)", () => {
    expect(convertCurrency(revenueEur, "EUR", "DKK")).toBeCloseTo(7460, 6);
    expect(localUnitsPerEur("DK")).toBe(DEFAULT_RATES_PER_EUR.DKK);
  });
  it("round trips without drift", () => {
    expect(convertCurrency(convertCurrency(500, "EUR", "SEK"), "SEK", "EUR")).toBeCloseTo(500, 9);
  });
});

describe("engine receives local units per EUR (I)", () => {
  it("every supported country hands the engine its own rate", () => {
    for (const code of ["SE", "FI", "DK", "DE"] as const) {
      const econ = getCountry(code).economy;
      expect(econ.eurSekRate).toBe(localUnitsPerEur(code));
      expect(econ.currency).toBe(countryCurrency(code));
    }
  });
  it("Swedish rate is unchanged from the frozen assumption (N)", () => {
    expect(getCountry("SE").economy.eurSekRate).toBe(11.3);
    expect(getCountry("SE").economy.importPrice).toBe(1.5);
    expect(getCountry("SE").economy.exportPrice).toBe(0.6);
    expect(getCountry("SE").economy.demandCharge).toBe(30);
  });
});

describe("local economy defaults stay in local currency (K)", () => {
  it("EUR countries use EUR-sized prices, DKK country DKK-sized", () => {
    expect(COUNTRIES.FI.economy.importPrice).toBeLessThan(1);
    expect(COUNTRIES.DE.economy.importPrice).toBeLessThan(1);
    expect(COUNTRIES.DK.economy.importPrice).toBeGreaterThan(1);
  });
});

describe("formatting (J-L)", () => {
  it("uses the country's own currency symbol", () => {
    expect(formatMoney(1234, "SE", 0)).toMatch(/kr/);
    expect(formatMoney(1234, "DE", 0)).toMatch(/€/);
    expect(formatMoney(1234, "FI", 0)).toMatch(/€/);
    expect(formatMoney(1234, "DK", 0)).toMatch(/kr/);
    expect(formatMoney(1234, "DE", 0)).not.toMatch(/kr/);
  });
  it("per-year form keeps the currency", () => {
    expect(formatPerYear(850, "EUR")).toMatch(/€/);
    expect(formatPerYear(850, "EUR")).toMatch(/\/år$/);
    expect(formatCurrency(0, "DKK")).toMatch(/kr/);
  });
});

describe("country change resets incompatible economy values (M)", () => {
  it("initial state carries the country's currency", () => {
    expect(createInitialState("DE").economy.currency).toBe("EUR");
    expect(createInitialState("SE").economy.currency).toBe("SEK");
    expect(createInitialState("DK").economy.currency).toBe("DKK");
    expect(createInitialState("DE").economy.importPrice).toBe(COUNTRIES.DE.economy.importPrice);
  });
});

describe("control case: 1 kW reserve revenue in EUR", () => {
  it("converts the same source revenue per country", () => {
    const eur = 250; // one year of historical revenue for 1 kW, illustrative
    expect(convertCurrency(eur, "EUR", countryCurrency("SE"))).toBeCloseTo(2825, 6);
    expect(convertCurrency(eur, "EUR", countryCurrency("FI"))).toBe(250);
    expect(convertCurrency(eur, "EUR", countryCurrency("DK"))).toBeCloseTo(1865, 6);
    expect(convertCurrency(eur, "EUR", countryCurrency("DE"))).toBe(250);
  });
});
