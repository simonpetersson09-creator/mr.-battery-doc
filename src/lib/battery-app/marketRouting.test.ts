import { describe, expect, it } from "vitest";
import {
  isValidMarketArea,
  marketAreaOptions,
  requiresMarketArea,
  reserveCalculationAvailable,
  reserveMarketConfig,
} from "@/lib/reserve-market";
import { validateGridStep } from "@/lib/battery-app/stepValidation";
import { createInitialState, type WizardState } from "@/state/wizard";
import { ancillaryDataAvailable } from "@/lib/battery-app/ancillaryAvailability";

function gridReady(s: WizardState): WizardState {
  return { ...s, grid: { ...s.grid, gridValuesConfirmed: true } };
}

describe("country + market area routing", () => {
  it("SE: no area, upward FCR-D up, Swedish dataset", () => {
    expect(requiresMarketArea("SE")).toBe(false);
    const c = reserveMarketConfig("SE")!;
    expect([c.product, c.physics, c.datasetId]).toEqual([
      "FCR_D_UP",
      "upward",
      "SE_FCR_D_UP_2025",
    ]);
    expect(reserveCalculationAvailable("SE")).toBe(true);
  });

  it("FI: no area, upward FCR-D up, Finnish dataset", () => {
    expect(requiresMarketArea("FI")).toBe(false);
    const c = reserveMarketConfig("FI")!;
    expect([c.product, c.physics, c.datasetId]).toEqual([
      "FCR_D_UP",
      "upward",
      "FI_FCR_D_UP_2025",
    ]);
    expect(reserveCalculationAvailable("FI")).toBe(true);
  });

  it("DE: no area, symmetric FCR, no fabricated revenue", () => {
    expect(requiresMarketArea("DE")).toBe(false);
    const c = reserveMarketConfig("DE")!;
    expect([c.product, c.physics, c.synchronousArea, c.datasetId]).toEqual([
      "FCR",
      "symmetric",
      "continental",
      "DE_FCR_2025",
    ]);
    expect(reserveCalculationAvailable("DE")).toBe(false);
    expect(ancillaryDataAvailable("DE")).toBe(false);
  });

  it("DK1: continental, symmetric FCR", () => {
    const c = reserveMarketConfig("DK", "DK1")!;
    expect([c.product, c.physics, c.synchronousArea, c.datasetId]).toEqual([
      "FCR",
      "symmetric",
      "continental",
      "DK1_FCR_2025",
    ]);
    expect(reserveCalculationAvailable("DK", "DK1")).toBe(false);
  });

  it("DK2: nordic, upward FCR-D up", () => {
    const c = reserveMarketConfig("DK", "DK2")!;
    expect([c.product, c.physics, c.synchronousArea, c.datasetId]).toEqual([
      "FCR_D_UP",
      "upward",
      "nordic",
      "DK2_FCR_D_UP_2025",
    ]);
    expect(reserveCalculationAvailable("DK", "DK2")).toBe(false);
  });

  it("never guesses a Danish area", () => {
    expect(reserveMarketConfig("DK", null)).toBeNull();
    expect(requiresMarketArea("DK")).toBe(true);
    expect(marketAreaOptions("DK").map((o) => o.value)).toEqual(["DK1", "DK2"]);
    expect(marketAreaOptions("SE")).toEqual([]);
  });

  it("rejects an area that belongs to another country", () => {
    expect(isValidMarketArea("SE", "DK1")).toBe(false);
    expect(isValidMarketArea("DK", null)).toBe(false);
    expect(isValidMarketArea("DK", "DK2")).toBe(true);
  });
});

describe("step 1 gating", () => {
  it("blocks Denmark until an area is chosen, then allows it", () => {
    const base = gridReady(createInitialState("DK"));
    expect(validateGridStep(base).ok).toBe(false);
    const withArea = { ...base, grid: { ...base.grid, marketArea: "DK1" as const } };
    expect(validateGridStep(withArea).ok).toBe(true);
  });

  it("does not require an area for SE, FI or DE", () => {
    for (const c of ["SE", "FI", "DE"] as const)
      expect(validateGridStep(gridReady(createInitialState(c))).ok).toBe(true);
  });
});
