/**
 * UI <-> ENGINE WIRING regression tests.
 *
 * These cover the repairs made after the read-only wiring audit. They test the app layer
 * only — the frozen Battery Engine is never modified, just called.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { normalizeWizardToEngineInput } from "./normalizeWizardToEngineInput";
import { validateBatteryEngineInput } from "./validate";
import {
  validateConsumptionStep,
  validateEconomyStep,
  validateGridStep,
  validateProductionStep,
} from "./stepValidation";
import { createInitialState, type WizardState } from "@/state/wizard";
import { SUPPORTED_COUNTRY_CODES, getCountry } from "@/lib/country-config";

const read = (p: string) => readFileSync(p, "utf8");

function base(): WizardState {
  const s = createInitialState("SE");
  s.consumption.mode = "annual";
  s.consumption.annualKwh = 10000;
  s.consumption.profileId = "evening-heavy";
  s.production.mode = "manual";
  s.production.dcKwp = 12;
  s.production.acKw = 10;
  s.production.annualKwh = 12000;
  return s;
}

describe("photo/file is not exposed as a working v1 feature", () => {
  it("no wizard page renders an attachment picker or document mode", () => {
    const pages = [
      read("src/routes/forbrukning.tsx"),
      read("src/routes/produktion.tsx"),
    ].join("\n");
    expect(pages).not.toMatch(/AttachmentPicker/);
    expect(pages).not.toMatch(/Ta foto|Bifoga fil/);
    expect(pages).not.toMatch(/"document"/);
  });

  it("the shared field library no longer ships the picker", () => {
    expect(read("src/components/wizard/fields.tsx")).not.toMatch(/AttachmentPicker/);
  });
});

describe("FCR-D up toggle", () => {
  it("off = no FCR at all", () => {
    const input = normalizeWizardToEngineInput(base());
    expect(input.strategies?.fcrDUp).toBeUndefined();
    expect(input.strategies?.optimiseFcrReservation).toBeUndefined();
  });

  it("on = engine flag plus automatic reservation optimisation, no manual offered power", () => {
    const s = base();
    s.strategies.fcrDUp = true;
    const input = normalizeWizardToEngineInput(s);
    expect(input.strategies?.fcrDUp).toBe(true);
    expect(input.strategies?.optimiseFcrReservation).toBe(true);
    expect(input.strategies?.fcrOfferedPowerKw).toBeUndefined();
  });

  it("the battery page exposes exactly one ancillary service", () => {
    const page = read("src/routes/batteri.tsx");
    expect(page).toMatch(/FCR-D upp/);
    expect(page).not.toMatch(/FCR-D ned|FCR-N|FFR|mFRR/);
  });
});

describe("EUR/SEK", () => {
  it("maps to economy.eurSekRate", () => {
    const s = base();
    s.economy.eurSekRate = 12.5;
    expect(normalizeWizardToEngineInput(s).economy?.eurSekRate).toBe(12.5);
  });

  it("Swedish default is 11.30", () => {
    expect(createInitialState("SE").economy.eurSekRate).toBe(11.3);
  });

  it("is editable on the economy page when FCR is on", () => {
    expect(read("src/routes/ekonomi.tsx")).toMatch(/EUR\/SEK/);
  });
});

describe("monthly consumption + profile", () => {
  it("actual months win and the profile still reaches the engine", () => {
    const s = base();
    s.consumption.mode = "monthly";
    s.consumption.monthlyKwh = Array.from({ length: 12 }, (_, i) => 100 + i);
    s.consumption.profileId = "heat-pump";
    const input = normalizeWizardToEngineInput(s);
    expect(input.consumption?.monthlyKWh).toEqual([
      100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111,
    ]);
    expect(input.consumption?.annualKWh).toBe(1266);
    expect(input.consumption?.profile).toBe("heat-pump");
  });

  it("monthly mode without a profile is incomplete", () => {
    const s = base();
    s.consumption.mode = "monthly";
    s.consumption.monthlyKwh = Array(12).fill(500);
    s.consumption.profileId = null;
    expect(validateConsumptionStep(s).ok).toBe(false);
    expect(validateBatteryEngineInput(s).ok).toBe(false);
  });
});

describe("Nästa is blocked on invalid input", () => {
  it("grid needs a positive main fuse", () => {
    const s = base();
    expect(validateGridStep(s).ok).toBe(true);
    s.grid.mainFuseA = 0;
    expect(validateGridStep(s).ok).toBe(false);
  });

  it("consumption needs energy and a profile", () => {
    const s = base();
    expect(validateConsumptionStep(s).ok).toBe(true);
    s.consumption.annualKwh = null;
    expect(validateConsumptionStep(s).ok).toBe(false);
  });

  it("production: none is always valid, manual needs production", () => {
    const s = base();
    expect(validateProductionStep(s).ok).toBe(true);
    s.production.annualKwh = null;
    expect(validateProductionStep(s).ok).toBe(false);
    s.production.mode = "none";
    expect(validateProductionStep(s).ok).toBe(true);
  });

  it("production monthly needs all 12 values", () => {
    const s = base();
    s.production.useMonthly = true;
    s.production.monthlyKwh = Array(12).fill(null);
    expect(validateProductionStep(s).ok).toBe(false);
  });

  it("economy rejects negative prices and a bad rate when FCR is on", () => {
    const s = base();
    expect(validateEconomyStep(s).ok).toBe(true);
    s.economy.importPrice = -1;
    expect(validateEconomyStep(s).ok).toBe(false);
    s.economy.importPrice = 1.5;
    s.strategies.fcrDUp = true;
    s.economy.eurSekRate = 0;
    expect(validateEconomyStep(s).ok).toBe(false);
  });
});

describe("restart clears the wizard", () => {
  it("the result page calls reset() and navigates home", () => {
    const page = read("src/routes/resultat.tsx");
    expect(page).toMatch(/reset\(\)/);
    expect(page).toMatch(/navigate\(\{ to: "\/" \}\)/);
  });

  it("reset() removes the persisted state", () => {
    expect(read("src/state/wizard.tsx")).toMatch(/localStorage\.removeItem\(STORAGE_KEY\)/);
  });

  it("a fresh state carries no user values", () => {
    const s = createInitialState("SE");
    expect(s.consumption.annualKwh).toBeNull();
    expect(s.consumption.profileId).toBeNull();
    expect(s.production.mode).toBe("none");
    expect(s.strategies.fcrDUp).toBe(false);
  });
});

describe("peak tariff source", () => {
  it("stays default-estimate when only energy prices change", () => {
    const s = base();
    s.economy.importPrice = 2.1;
    s.economy.exportPrice = 0.4;
    s.economy.touched = true;
    expect(normalizeWizardToEngineInput(s).economy?.peakTariffSource).toBe("default-estimate");
  });

  it("becomes user-provided only when the demand charge is edited", () => {
    const s = base();
    s.economy.demandCharge = 80;
    s.economy.touched = true;
    s.economy.demandChargeTouched = true;
    expect(normalizeWizardToEngineInput(s).economy?.peakTariffSource).toBe("user-provided");
  });
});

describe("country and currency", () => {
  it("v1 offers Sweden only, so no non-SEK value can reach the SEK economy input", () => {
    expect(SUPPORTED_COUNTRY_CODES).toEqual(["SE"]);
    for (const code of SUPPORTED_COUNTRY_CODES) {
      expect(getCountry(code).economy.currency).toBe("SEK");
    }
  });

  it("Swedish defaults", () => {
    const s = createInitialState("SE");
    expect(s.economy.importPrice).toBe(1.5);
    expect(s.economy.exportPrice).toBe(0.6);
    expect(s.economy.demandCharge).toBe(55);
    expect(s.economy.eurSekRate).toBe(11.3);
    expect(s.grid.mainFuseA).toBeGreaterThan(0);
    const input = normalizeWizardToEngineInput(base());
    expect(input.site?.voltageV).toBe(400);
    expect(input.site?.phases).toBe(3);
    expect(input.site?.country).toBe("SE");
  });

  it("all three main strategies default to on", () => {
    const st = createInitialState("SE").strategies;
    expect(st.solarSelfConsumption).toBe(true);
    expect(st.reducedGridImport).toBe(true);
    expect(st.peakShaving).toBe(true);
  });
});
