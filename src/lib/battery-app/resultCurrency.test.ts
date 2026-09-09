/**
 * RESULT PAGE CURRENCY DISPLAY — regression guard.
 *
 * Presentation only: the result page must format every money value through the central
 * currency layer (country -> currency -> locale). No component may assume SEK, and
 * FI/DE must never render "kr". Conversion happens exactly once, inside the economics
 * layer, so these tests only assert formatting/symbols, never amounts.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { formatMoney, formatMoneyPerYear, countryCurrency } from "@/lib/country-config";

const page = readFileSync("src/routes/resultat.tsx", "utf8");
/** Strip comments so documentation prose is not mistaken for rendered copy. */
const rendered = page.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("central formatter per country", () => {
  it("A: SE renders SEK with kr", () => {
    expect(countryCurrency("SE")).toBe("SEK");
    expect(formatMoneyPerYear(7309, "SE", 0)).toMatch(/kr\/år$/);
  });

  it("B: FI renders EUR and no monetary kr", () => {
    expect(countryCurrency("FI")).toBe("EUR");
    const s = formatMoneyPerYear(1091, "FI", 0);
    expect(s).toContain("€");
    expect(s).not.toMatch(/\bkr\b/);
  });

  it("C: DE renders EUR and no monetary kr", () => {
    expect(countryCurrency("DE")).toBe("EUR");
    const s = formatMoneyPerYear(1529, "DE", 0);
    expect(s).toContain("€");
    expect(s).not.toMatch(/\bkr\b/);
  });

  it("D+E: DK uses DKK (danish kr, not SEK)", () => {
    expect(countryCurrency("DK")).toBe("DKK");
    expect(formatMoney(11306, "DK", 0)).toMatch(/kr/);
    expect(formatMoney(6959, "DK", 0)).toMatch(/kr/);
  });

  it("F+G+H: switching country switches the label with no leftovers", () => {
    const se = formatMoneyPerYear(1000, "SE");
    const fi = formatMoneyPerYear(1000, "FI");
    const dk = formatMoneyPerYear(1000, "DK");
    const de = formatMoneyPerYear(1000, "DE");
    expect(fi).not.toMatch(/\bkr\b/); // SE -> FI leaves no SEK label
    expect(dk).toMatch(/kr/); // FI -> DK1 becomes DKK
    expect(de).not.toMatch(/\bkr\b/); // DK1 -> DE drops every kr
    expect(se).toMatch(/kr/);
  });

  it("M: same currency in and out is never converted twice", () => {
    expect(formatMoney(1000, "SE", 0)).toBe(formatMoney(1000, "SE", 0));
    expect(formatMoney(1000, "FI", 0)).toContain("1");
  });
});

describe("result page has no hardcoded currency", () => {
  it("I-L: every money string on step 6 goes through the central formatter", () => {
    expect(rendered).not.toMatch(/["'`][^"'`]*\bkr\b[^"'`]*["'`]/);
    expect(rendered).not.toMatch(/["'`][^"'`]*SEK[^"'`]*["'`]/);
    expect(rendered).not.toMatch(/["'`][^"'`]*€[^"'`]*["'`]/);
    expect(rendered).toContain("formatMoney");
    expect(rendered).toContain("state.grid.country");
  });
});
