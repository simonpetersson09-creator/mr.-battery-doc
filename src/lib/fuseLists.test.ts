import { describe, expect, it } from "vitest";
import { fuseOptions, phaseOptions, isListedFuse, theoreticalGridPowerKw } from "@/lib/country-config";
import { runBatteryEngine } from "@/lib/battery-engine";
import { normalizeWizardToEngineInput } from "@/lib/battery-app/normalizeWizardToEngineInput";
import { createInitialState } from "@/state/wizard";

const BIG = [125, 160, 200, 250, 315, 400];
describe("utökade säkringslistor", () => {
  it("exakta listor", () => {
    expect(fuseOptions("SE")).toEqual([16, 20, 25, 35, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400]);
    expect(fuseOptions("FI")).toEqual([16, 20, 25, 35, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400]);
    for (const c of ["DK", "DE", "AT"] as const) expect(fuseOptions(c)).toEqual([16, 20, 25, 32, 35, 40, 50, 63, 80, 100, ...BIG]);
    expect(fuseOptions("CH")).toEqual([16, 20, 25, 32, 40, 50, 63, 80, 100, ...BIG]);
    for (const c of ["CZ", "SI"] as const) {
      expect(fuseOptions(c, "3x400")).toEqual(expect.arrayContaining(BIG));
      expect(fuseOptions(c, "1x230")).not.toContain(250);
    }
    expect(fuseOptions("BE", "3x400")).toContain(250);
    expect(fuseOptions("BE", "3x230")).toContain(250);
    expect(fuseOptions("BE", "1x230")).not.toContain(250);
    expect(fuseOptions("BE", "3x400")).not.toContain(315);
    for (const o of phaseOptions("FR")) expect(o.fuses).toEqual([10, 13, 16, 20, 25, 32, 35, 40, 50, 63, 80, 100, 125, 160, 200]);
  });
  it("250 A ger rätt nätffekt (3×400 V)", () => {
    for (const c of ["SE", "FI", "DK", "DE", "AT", "CH", "CZ", "SI", "BE"] as const) {
      expect(isListedFuse(c, 250, "3x400")).toBe(true);
      expect(theoreticalGridPowerKw(250, c, "3x400")).toBeCloseTo((Math.sqrt(3) * 400 * 250) / 1000, 1);
    }
  });
  it("kalkyl med 250 A går igenom och säkringen når motorn", { timeout: 300_000 }, () => {
    for (const c of ["SE", "DE", "CH"] as const) {
      const s: any = structuredClone(createInitialState(c as any));
      s.grid.gridValuesConfirmed = true; s.grid.mainFuseA = 250;
      const inp: any = normalizeWizardToEngineInput(s);
      expect(JSON.stringify(inp)).toContain("250");
      const r: any = runBatteryEngine(inp);
      expect(r.summary).toBeTruthy();
    }
  });
});
