import { describe, expect, it } from "vitest";
import { getReportCopy } from "./copy";

const LANGS = ["sv", "en", "da", "fi", "de"] as const;

/** Every leaf string path of an object, so structures can be compared exactly. */
function paths(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") return [prefix];
  if (Array.isArray(value)) return value.flatMap((v, i) => paths(v, `${prefix}[${i}]`));
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([k, v]) => paths(v, prefix ? `${prefix}.${k}` : k));
  return [];
}

function leaves(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(leaves);
  if (value && typeof value === "object") return Object.values(value).flatMap(leaves);
  return [];
}

describe("report copy translations", () => {
  const base = paths(getReportCopy("sv"));

  for (const lang of LANGS) {
    it(`${lang} has the same structure as Swedish`, () => {
      expect(paths(getReportCopy(lang))).toEqual(base);
    });

    it(`${lang} has no empty strings`, () => {
      expect(leaves(getReportCopy(lang)).filter((s) => s.trim() === "")).toEqual([]);
    });

    it(`${lang} keeps every placeholder`, () => {
      const sv = leaves(getReportCopy("sv"));
      const other = leaves(getReportCopy(lang));
      sv.forEach((text, i) => {
        const wanted = (text.match(/\{[a-zA-Z]+\}/g) ?? []).sort();
        const got = (other[i]?.match(/\{[a-zA-Z]+\}/g) ?? []).sort();
        expect(got).toEqual(wanted);
      });
    });
  }

  it("unknown languages fall back to English", () => {
    expect(getReportCopy("no")).toBe(getReportCopy("en"));
  });

  it("each language has its own copy object", () => {
    for (const lang of ["en", "da", "fi", "de"] as const) {
      expect(getReportCopy(lang)).not.toBe(getReportCopy("sv"));
    }
  });

});
