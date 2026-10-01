import { describe, expect, it } from "vitest";
import { FCR_ENDURANCE_HOURS, PENDING_ANCILLARY_COUNTRIES } from "./countryMarkets";
import { reserveModeForMarket } from "./index";

describe("country-specific FCR endurance (symmetric FCR)", () => {
  const expected = { AT: 0.5, CH: 0.25, BE: 0.4166666667, FR: 0.5, CZ: 0.5, SI: 0.25 } as const;
  for (const [c, h] of Object.entries(expected)) {
    it(`${c} = ${h} h`, () => {
      expect(FCR_ENDURANCE_HOURS[c as keyof typeof expected]).toBeCloseTo(h, 10);
      expect(reserveModeForMarket(c as keyof typeof expected)).toBe("symmetric");
    });
  }
  it("BE is exactly 25 minutes and only the six countries are listed (no NL)", () => {
    expect(FCR_ENDURANCE_HOURS.BE * 60).toBeCloseTo(25, 12);
    expect(Object.keys(FCR_ENDURANCE_HOURS).sort()).toEqual([...PENDING_ANCILLARY_COUNTRIES].sort());
    expect(Object.keys(FCR_ENDURANCE_HOURS)).not.toContain("NL");
  });
});
