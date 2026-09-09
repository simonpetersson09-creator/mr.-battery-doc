/**
 * i18n safety net.
 *
 * These tests protect two promises:
 *  1. every language carries every key (no silent Swedish leaks),
 *  2. changing the language never touches country, market, currency or any
 *     value that reaches the Battery Engine.
 */

import { describe, expect, it } from "vitest";
import { SUPPORTED_LANGUAGES, formatNumber, i18n, t, type Language } from "@/i18n";
import { sv } from "@/i18n/locales/sv";
import { en } from "@/i18n/locales/en";
import { de } from "@/i18n/locales/de";
import { da } from "@/i18n/locales/da";
import { fi } from "@/i18n/locales/fi";
import { countryName, marketAreaName, reserveProductName } from "@/i18n/labels";
import { reserveProductLabel, reserveMarketConfig } from "@/lib/reserve-market";
import { getCountry } from "@/lib/country-config";

const RESOURCES: Record<Language, unknown> = { sv, en, de, da, fi };

function flatten(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    flatten(v, prefix ? `${prefix}.${k}` : k),
  );
}

const withLanguage = <T,>(lng: Language, fn: () => T): T => {
  const before = i18n.language as Language;
  void i18n.changeLanguage(lng);
  try {
    return fn();
  } finally {
    void i18n.changeLanguage(before);
  }
};

describe("locale parity", () => {
  const svKeys = flatten(sv).sort();

  it("supports exactly sv, en, de, da and fi", () => {
    expect([...SUPPORTED_LANGUAGES].sort()).toEqual(["da", "de", "en", "fi", "sv"]);
  });

  for (const lng of SUPPORTED_LANGUAGES) {
    it(`${lng} has the same keys as the source language`, () => {
      expect(flatten(RESOURCES[lng]).sort()).toEqual(svKeys);
    });

    it(`${lng} has no empty strings`, () => {
      const empties: string[] = [];
      const walk = (o: unknown, p = "") => {
        if (typeof o === "string") {
          if (o.trim() === "") empties.push(p);
          return;
        }
        if (o && typeof o === "object")
          for (const [k, v] of Object.entries(o)) walk(v, p ? `${p}.${k}` : k);
      };
      walk(RESOURCES[lng]);
      expect(empties).toEqual([]);
    });
  }
});

describe("translation lookup", () => {
  it("returns a real string for every key in every language", () => {
    for (const lng of SUPPORTED_LANGUAGES) {
      withLanguage(lng, () => {
        for (const key of flatten(sv)) {
          const value = t(key);
          expect(value, `${lng}:${key}`).toBeTruthy();
          expect(value, `${lng}:${key}`).not.toBe(key);
        }
      });
    }
  });

  it("interpolates values", () => {
    withLanguage("en", () => {
      expect(t("common.step", { current: 2, total: 6 })).toContain("2");
    });
  });
});

describe("language never changes country, market, currency or engine data", () => {
  it("country configuration is identical in every language", () => {
    const se = getCountry("SE");
    for (const lng of SUPPORTED_LANGUAGES) {
      withLanguage(lng, () => {
        const again = getCountry("SE");
        expect(again.economy).toEqual(se.economy);
        expect(again.grid).toEqual(se.grid);
      });
    }
  });

  it("reserve routing and canonical product values are identical in every language", () => {
    const cases = [
      ["SE", null],
      ["FI", null],
      ["DE", null],
      ["DK", "DK1"],
      ["DK", "DK2"],
    ] as const;
    for (const [c, a] of cases) {
      const canonical = reserveMarketConfig(c, a);
      for (const lng of SUPPORTED_LANGUAGES) {
        withLanguage(lng, () => {
          expect(reserveMarketConfig(c, a)).toEqual(canonical);
        });
      }
    }
  });

  it("only the visible spelling of labels changes", () => {
    // Canonical Swedish label stays the engine/config-facing value.
    expect(reserveProductLabel("SE")).toBe("FCR-D upp");
    const english = withLanguage("en", () => ({
      country: countryName("DK"),
      area: marketAreaName("DK1"),
      product: reserveProductName("DE", null),
    }));
    expect(english.country).toBe("Denmark");
    expect(english.area).toContain("DK1");
    expect(english.product).toBe("FCR");
  });
});

describe("number formatting follows the interface language", () => {
  it("uses the locale of the selected language", () => {
    const swedish = withLanguage("sv", () => formatNumber(12345.6, 1));
    const german = withLanguage("de", () => formatNumber(12345.6, 1));
    const english = withLanguage("en", () => formatNumber(12345.6, 1));
    expect(swedish).toContain("12");
    expect(german).toContain("12");
    expect(english).toContain("12,345");
    expect(german).toContain("12.345");
  });
});
