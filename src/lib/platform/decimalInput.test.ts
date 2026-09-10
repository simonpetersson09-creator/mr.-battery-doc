import { describe, expect, it } from "vitest";

import { parseDecimalInput, sanitizeDecimalText } from "./decimalInput";

describe("decimal input parsing (iOS keypad safe)", () => {
  it("reads a comma and a dot as the same number", () => {
    expect(parseDecimalInput("1,50")).toBe(1.5);
    expect(parseDecimalInput("1.50")).toBe(1.5);
  });

  it("ignores grouping spaces used in sv/fi/de number entry", () => {
    expect(parseDecimalInput("21 200")).toBe(21200);
    expect(parseDecimalInput("21\u00a0200,5")).toBe(21200.5);
  });

  it("returns null for empty or half-typed input instead of NaN", () => {
    expect(parseDecimalInput("")).toBeNull();
    expect(parseDecimalInput("-")).toBeNull();
    expect(parseDecimalInput(",")).toBeNull();
    expect(parseDecimalInput("abc")).toBeNull();
  });

  it("keeps negative values and exponents intact", () => {
    expect(parseDecimalInput("-3,25")).toBe(-3.25);
    expect(parseDecimalInput("1e3")).toBe(1000);
  });

  it("strips characters that can never be part of a number", () => {
    expect(sanitizeDecimalText("12kWh")).toBe("12");
  });
});
