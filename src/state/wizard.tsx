/**
 * Persistent wizard state.
 *
 * Every choice the user makes is stored here and mirrored to localStorage so
 * the user can navigate back and forward without losing anything.
 * This module holds USER INPUT only — no battery physics, no dimensioning.
 */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  countryCurrency,
  DEFAULT_COUNTRY,
  getCountry,
  isListedFuse,
  type CountryCode,
} from "@/lib/country-config";
import type { Currency } from "@/lib/currency";
import type { ProfileId } from "@/lib/consumption-profiles";
import { isValidMarketArea, requiresMarketArea, type MarketArea } from "@/lib/reserve-market";
import {
  clampCustomerAncillaryShare,
  clampTargetPaybackYears,
  DEFAULT_CUSTOMER_ANCILLARY_SHARE,
  DEFAULT_TARGET_PAYBACK_YEARS,
} from "@/lib/battery-app/customerEconomy";


/**
 * "document" is kept for the future document parser but is NOT exposed in the v1 UI.
 * Any persisted "document" state is coerced back to a supported mode on hydration.
 */
export type ConsumptionMode = "annual" | "monthly" | "document";
export type ProductionMode = "none" | "manual" | "document";

export interface AttachmentMeta {
  id: string;
  name: string;
  size: number;
  kind: "image" | "file";
  /** Document parsing is not implemented yet. */
  status: "pending-parsing";
}

export interface WizardState {
  grid: {
    country: CountryCode;
    /** Geographic market area, only used by countries that need one (DK1/DK2). */
    marketArea: MarketArea | null;
    mainFuseA: number;
    mainFuseManual: boolean;
    /** User has confirmed the auto-derived grid values are correct. */
    gridValuesConfirmed: boolean;
    /**
     * true once the user has picked a country themselves on step 1.
     * Until then the language choice may suggest a default country.
     * Language NEVER follows the country — only this one-way suggestion exists.
     */
    countryTouched: boolean;
  };
  consumption: {
    mode: ConsumptionMode;
    annualKwh: number | null;
    profileId: ProfileId | null;
    monthlyKwh: (number | null)[];
    attachments: AttachmentMeta[];
  };
  production: {
    mode: ProductionMode;
    dcKwp: number | null;
    acKw: number | null;
    annualKwh: number | null;
    useMonthly: boolean;
    monthlyKwh: (number | null)[];
    /** Optional MEASURED self-consumption of solar, %. null = let the model calculate it. */
    selfConsumptionPct: number | null;
    attachments: AttachmentMeta[];
  };
  strategies: {
    solarSelfConsumption: boolean;
    reducedGridImport: boolean;
    peakShaving: boolean;
    /** FCR-D up (stödtjänster). Mapped to the engine when true. */
    fcrDUp: boolean;
  };
  economy: {
    importPrice: number;
    exportPrice: number;
    demandCharge: number;
    /** Currency the values above are entered in. Decided by the country. */
    currency: Currency;
    /** Local currency units per EUR — used to convert reserve revenue before summing. */
    eurSekRate: number;
    /** true when the user has manually edited prices (blocks country overwrite) */
    touched: boolean;
    /** true ONLY when the user edited the demand charge itself (drives peakTariffSource) */
    demandChargeTouched: boolean;
  };
  /**
   * Customer-facing assumptions. Kept outside `economy` so a country change cannot
   * reset them.
   *
   * `targetPaybackYears` NEVER reaches the engine — it only scales the presented
   * maximum investment.
   *
   * `customerAncillaryShare` IS passed to the engine, but strictly as a SELECTION
   * OBJECTIVE: it decides which alternative for the same battery has the best customer
   * benefit. It never changes the physics, and reported ancillary figures keep showing
   * the full market value.
   */
  preferences: {
    /** 0–1. Share of the ancillary MARKET value that reaches the customer. */
    customerAncillaryShare: number;
    /** Desired simple payback horizon in years (5–20). */
    targetPaybackYears: number;
  };
}


const STORAGE_KEY = "mr-battery-doc:wizard:v2";

function economyFromCountry(code: CountryCode) {
  const c = getCountry(code).economy;
  return {
    currency: c.currency,
    importPrice: c.importPrice,
    exportPrice: c.exportPrice,
    demandCharge: c.demandCharge,
    eurSekRate: c.eurSekRate,
    touched: false,
    demandChargeTouched: false,
  };
}

/** v1 exposes no document parser — coerce any persisted "document" mode. */
function coerceSupportedModes(s: WizardState): WizardState {
  const next = { ...s };
  if (next.consumption?.mode === "document")
    next.consumption = { ...next.consumption, mode: "annual" };
  if (next.production?.mode === "document")
    next.production = { ...next.production, mode: "manual" };
  // Old persisted states (before the customer-share / payback step) have no
  // `preferences` at all, and a corrupt one must never reach the UI.
  next.grid = { ...next.grid, countryTouched: next.grid?.countryTouched ?? false };
  next.preferences = {
    customerAncillaryShare: clampCustomerAncillaryShare(
      next.preferences?.customerAncillaryShare ?? DEFAULT_CUSTOMER_ANCILLARY_SHARE,
    ),
    targetPaybackYears: clampTargetPaybackYears(
      next.preferences?.targetPaybackYears ?? DEFAULT_TARGET_PAYBACK_YEARS,
    ),
  };
  // Never let a stale/foreign market area survive (old cases, country switches).
  const area = (next.grid?.marketArea ?? null) as MarketArea | null;
  if (!isValidMarketArea(next.grid.country, area))
    next.grid = { ...next.grid, marketArea: requiresMarketArea(next.grid.country) ? null : null };
  return next;
}

export function createInitialState(country: CountryCode = DEFAULT_COUNTRY): WizardState {
  return {
    grid: {
      country,
      marketArea: null,
      mainFuseA: getCountry(country).grid.defaultMainFuse,
      mainFuseManual: false,
      gridValuesConfirmed: false,
      countryTouched: false,
    },
    consumption: {
      mode: "annual",
      annualKwh: null,
      profileId: null,
      monthlyKwh: Array(12).fill(null),
      attachments: [],
    },
    production: {
      mode: "none",
      dcKwp: null,
      acKw: null,
      annualKwh: null,
      useMonthly: false,
      monthlyKwh: Array(12).fill(null),
      selfConsumptionPct: null,
      attachments: [],
    },
    strategies: {
      solarSelfConsumption: true,
      reducedGridImport: true,
      peakShaving: true,
      fcrDUp: true,
    },
    economy: economyFromCountry(country),
    preferences: {
      customerAncillaryShare: DEFAULT_CUSTOMER_ANCILLARY_SHARE,
      targetPaybackYears: DEFAULT_TARGET_PAYBACK_YEARS,
    },
  };
}


interface WizardContextValue {
  state: WizardState;
  update: (patch: (s: WizardState) => WizardState) => void;
  setCountry: (code: CountryCode) => void;
  /** Applies a language-derived default country only while the user hasn't chosen one. */
  suggestCountry: (code: CountryCode) => void;
  reset: () => void;
  hydrated: boolean;
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WizardState>(() => createInitialState());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as WizardState;
        setState((current) =>
          coerceSupportedModes({
            ...current,
            ...parsed,
            // Legacy/foreign-currency cases: a stored economy in another currency than
            // the stored country's is dropped for that country's own defaults.
            economy:
              (parsed.economy?.currency ?? null) ===
              countryCurrency(parsed.grid?.country ?? current.grid.country)
                ? { ...current.economy, ...parsed.economy }
                : economyFromCountry(parsed.grid?.country ?? current.grid.country),
          }),
        );
      }
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full or unavailable */
    }
  }, [state, hydrated]);

  const value = useMemo<WizardContextValue>(() => {
    return {
      state,
      hydrated,
      update: (patch) => setState((s) => patch(s)),
      setCountry: (code) =>
        setState((s) => applyCountry(s, code, true)),
      suggestCountry: (code) =>
        setState((s) =>
          s.grid.countryTouched || s.grid.country === code ? s : applyCountry(s, code, false),
        ),
      reset: () => {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* storage unavailable */
        }
        setState(createInitialState());
      },
    };
  }, [state, hydrated]);

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

/** Shared country switch used by both the explicit pick and the language suggestion. */
function applyCountry(s: WizardState, code: CountryCode, touched: boolean): WizardState {
  return ({
          ...s,
          grid: {
            country: code,
            // Country change always drops the previous area — never carried over hidden.
            marketArea: null,
            // FUSE POLICY ON COUNTRY CHANGE: the actual ampere value is ALWAYS kept —
            // never silently approximated to a nearby size in the new country's list.
            // If the value is not one of the new country's predefined options it simply
            // becomes a manual ("Annan") value; the physics is identical either way.
            mainFuseA: s.grid.mainFuseA,
            mainFuseManual:
              s.grid.mainFuseManual || !isListedFuse(code, s.grid.mainFuseA),

            gridValuesConfirmed: false,
            countryTouched: touched || s.grid.countryTouched,
          },
          // CURRENCY POLICY: a country change that changes currency ALWAYS resets the
          // economy to the new country's own defaults — a value entered as 1,50 SEK/kWh
          // must never silently be reinterpreted as 1,50 EUR/kWh. When the currency is
          // unchanged, manually edited values are preserved as before.
          economy:
            countryCurrency(s.grid.country) !== countryCurrency(code)
              ? economyFromCountry(code)
              : s.economy.touched
                ? s.economy
                : economyFromCountry(code),
  });
}

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used inside WizardProvider");
  return ctx;
}
