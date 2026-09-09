import { describe, expect, it } from "vitest";
import { demandChargeHint } from "./economyCopy";
import { getCountry } from "@/lib/country-config";

const POSITIVE =
  "Schablon baserad på valt land. Ändra om du känner till ditt elnätsföretags effektavgift.";
const ZERO =
  "Ingen effektavgift antagen. Ändra om ditt elnätsföretag tar ut en effektavgift.";

describe("demandChargeHint", () => {
  it("A: Sverige default 30 → schablontext", () => {
    const v = getCountry("SE").economy.demandCharge;
    expect(v).toBe(30); // default oförändrat
    expect(demandChargeHint(v)).toBe(POSITIVE);
  });

  it("B: Finland default 0 → ingen-avgift-text", () => {
    const v = getCountry("FI").economy.demandCharge;
    expect(v).toBe(0);
    expect(demandChargeHint(v)).toBe(ZERO);
  });

  it("C: Tyskland default 0 → ingen-avgift-text", () => {
    const v = getCountry("DE").economy.demandCharge;
    expect(v).toBe(0);
    expect(demandChargeHint(v)).toBe(ZERO);
  });

  it("D/E: Danmark default 0 (gäller DK1 och DK2) → ingen-avgift-text", () => {
    const v = getCountry("DK").economy.demandCharge;
    expect(v).toBe(0);
    expect(demandChargeHint(v)).toBe(ZERO);
  });

  it("F: kund anger 12 → schablontext visas", () => {
    expect(demandChargeHint(12)).toBe(POSITIVE);
    expect(demandChargeHint(0.01)).toBe(POSITIVE);
    expect(demandChargeHint(0)).toBe(ZERO);
  });
});
