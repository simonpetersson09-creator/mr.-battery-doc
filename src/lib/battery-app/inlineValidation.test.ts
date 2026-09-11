/**
 * Inline field errors + language initialization.
 *
 * These are presentation guarantees only:
 *  - the field-level messages come from the SAME predicates as the step gate,
 *    so a field can never say "ok" while Next stays disabled (or the reverse),
 *  - language resolution picks the stored/system language deterministically,
 *    which is what lets the app render the right language on the first paint.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { SUPPORTED_LANGUAGES, resolveInitialLanguage, type Language } from "@/i18n";
import { createInitialState, type WizardState } from "@/state/wizard";
import {
  consumptionFieldErrors,
  economyFieldErrors,
  gridFieldErrors,
  productionFieldErrors,
  validateConsumptionStep,
  validateEconomyStep,
  validateGridStep,
  validateProductionStep,
} from "./stepValidation";

const anyError = (errors: Record<string, string | null>) =>
  Object.values(errors).some((m) => m !== null);

function grid(patch: Partial<WizardState["grid"]>): WizardState {
  const s = createInitialState();
  return { ...s, grid: { ...s.grid, ...patch } };
}

describe("inline field errors mirror the step gate", () => {
  it("a valid grid step has no field errors", () => {
    const s = grid({ mainFuseA: 25, gridValuesConfirmed: true });
    expect(validateGridStep(s).ok).toBe(true);
    expect(anyError(gridFieldErrors(s))).toBe(false);
  });

  it.each([0, -16, Number.NaN])("fuse %s is reported on the fuse field", (value) => {
    const s = grid({ mainFuseA: value, gridValuesConfirmed: true });
    expect(validateGridStep(s).ok).toBe(false);
    expect(gridFieldErrors(s).mainFuseA).toBeTruthy();
  });

  it("an unconfirmed grid step points at the confirmation, not the fuse", () => {
    const s = grid({ mainFuseA: 25, gridValuesConfirmed: false });
    const e = gridFieldErrors(s);
    expect(e.mainFuseA).toBeNull();
    expect(e.gridValuesConfirmed).toBeTruthy();
  });

  it("Denmark without a market area flags the area field", () => {
    const dk = createInitialState("DK");
    const s = { ...dk, grid: { ...dk.grid, marketArea: null, gridValuesConfirmed: true } };
    expect(validateGridStep(s as WizardState).ok).toBe(false);
    expect(gridFieldErrors(s as WizardState).marketArea).toBeTruthy();
  });

  it("a missing or non-positive annual consumption flags that field", () => {
    const base = createInitialState();
    for (const annualKwh of [null, 0, -5]) {
      const s = {
        ...base,
        consumption: { ...base.consumption, mode: "annual" as const, annualKwh },
      };
      expect(validateConsumptionStep(s).ok).toBe(false);
      expect(consumptionFieldErrors(s).annualKwh).toBeTruthy();
    }
  });

  it("an incomplete month grid flags the months, not the annual field", () => {
    const base = createInitialState();
    const monthlyKwh = Array.from({ length: 12 }, (_, i) => (i === 3 ? null : 800));
    const s = { ...base, consumption: { ...base.consumption, mode: "monthly" as const, monthlyKwh } };
    const e = consumptionFieldErrors(s);
    expect(e.monthlyKwh).toBeTruthy();
    expect(e.annualKwh).toBeNull();
  });

  it("a negative DC/AC size flags exactly that production field", () => {
    const base = createInitialState();
    const s = {
      ...base,
      production: {
        ...base.production,
        mode: "manual" as const,
        useMonthly: false,
        annualKwh: 12000,
        dcKwp: -1,
        acKw: 10,
      },
    };
    expect(validateProductionStep(s).ok).toBe(false);
    const e = productionFieldErrors(s);
    expect(e.dcKwp).toBeTruthy();
    expect(e.acKw).toBeNull();
  });

  it("negative prices flag their own economy field", () => {
    const base = createInitialState();
    const s = { ...base, economy: { ...base.economy, importPrice: -1, demandCharge: -2 } };
    expect(validateEconomyStep(s).ok).toBe(false);
    const e = economyFieldErrors(s);
    expect(e.importPrice).toBeTruthy();
    expect(e.demandCharge).toBeTruthy();
    expect(e.exportPrice).toBeNull();
  });

  it("the default state shows no error on any step", () => {
    const s = createInitialState();
    expect(anyError(economyFieldErrors(s))).toBe(false);
    expect(anyError(productionFieldErrors(s))).toBe(false);
  });
});

/* ------------------------------------------------- language initialization -- */

function stubBrowser(opts: { stored?: string | null; languages?: string[] }) {
  const store = new Map<string, string>();
  if (opts.stored) store.set("mr-battery-doc:language", opts.stored);
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    },
  });
  vi.stubGlobal("navigator", {
    languages: opts.languages ?? [],
    language: opts.languages?.[0] ?? "",
  });
}

describe("language initialization", () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each(SUPPORTED_LANGUAGES)("a stored %s choice wins", (lang) => {
    stubBrowser({ stored: lang, languages: ["sv-SE"] });
    expect(resolveInitialLanguage()).toBe(lang);
  });

  it("a regional system language resolves to its base language", () => {
    stubBrowser({ languages: ["de-AT", "en-US"] });
    expect(resolveInitialLanguage()).toBe<Language>("de");
  });

  it("an unsupported system language falls back to English, never Swedish", () => {
    stubBrowser({ languages: ["fr-FR", "es-ES"] });
    expect(resolveInitialLanguage()).toBe<Language>("en");
  });

  it("a Danish and a Finnish system resolve to their own language", () => {
    stubBrowser({ languages: ["da-DK"] });
    expect(resolveInitialLanguage()).toBe<Language>("da");
    stubBrowser({ languages: ["fi-FI"] });
    expect(resolveInitialLanguage()).toBe<Language>("fi");
  });
});
