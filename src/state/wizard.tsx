/**
 * Persistent wizard state.
 *
 * Every choice the user makes is stored here and mirrored to localStorage so
 * the user can navigate back and forward without losing anything.
 * This module holds USER INPUT only — no battery physics, no dimensioning.
 */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_COUNTRY,
  getCountry,
  selfConsumptionValue,
  type CountryCode,
} from "@/lib/country-config";
import type { ProfileId } from "@/lib/consumption-profiles";
import type { BatteryEngineInput } from "@/lib/battery-engine";

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
    mainFuseA: number;
    mainFuseManual: boolean;
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
    attachments: AttachmentMeta[];
  };
  strategies: {
    solarSelfConsumption: boolean;
    reducedGridImport: boolean;
    peakShaving: boolean;
  };
  economy: {
    importPrice: number;
    exportPrice: number;
    demandCharge: number;
    /** true when the user has manually edited prices (blocks country overwrite) */
    touched: boolean;
  };
}

const STORAGE_KEY = "mr-battery-doc:wizard:v1";

function economyFromCountry(code: CountryCode) {
  const c = getCountry(code).economy;
  return {
    importPrice: c.importPrice,
    exportPrice: c.exportPrice,
    demandCharge: c.demandCharge,
    touched: false,
  };
}

export function createInitialState(country: CountryCode = DEFAULT_COUNTRY): WizardState {
  return {
    grid: {
      country,
      mainFuseA: getCountry(country).grid.defaultMainFuse,
      mainFuseManual: false,
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
      attachments: [],
    },
    strategies: {
      solarSelfConsumption: true,
      reducedGridImport: true,
      peakShaving: true,
    },
    economy: economyFromCountry(country),
  };
}

interface WizardContextValue {
  state: WizardState;
  update: (patch: (s: WizardState) => WizardState) => void;
  setCountry: (code: CountryCode) => void;
  reset: () => void;
  engineInput: BatteryEngineInput;
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
        setState((current) => ({ ...current, ...parsed }));
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
    const country = getCountry(state.grid.country);
    const selfValue = selfConsumptionValue(state.economy.importPrice, state.economy.exportPrice);

    const engineInput: BatteryEngineInput = {
      grid: {
        country: state.grid.country,
        voltage: country.grid.voltage,
        phases: country.grid.phases,
        frequency: country.grid.frequency,
        mainFuseA: state.grid.mainFuseA,
      },
      consumption: {
        annualKwh: state.consumption.annualKwh ?? 0,
        profileId: state.consumption.profileId,
        monthlyKwh:
          state.consumption.mode === "monthly" &&
          state.consumption.monthlyKwh.every((m) => m !== null)
            ? (state.consumption.monthlyKwh as number[])
            : null,
        source: state.consumption.mode,
      },
      production: {
        hasPv: state.production.mode !== "none",
        dcKwp: state.production.dcKwp,
        acKw: state.production.acKw,
        annualKwh: state.production.annualKwh,
        monthlyKwh:
          state.production.useMonthly && state.production.monthlyKwh.every((m) => m !== null)
            ? (state.production.monthlyKwh as number[])
            : null,
      },
      strategies: { ...state.strategies },
      economics: {
        currency: country.economy.currency,
        importPrice: state.economy.importPrice,
        exportPrice: state.economy.exportPrice,
        selfConsumptionValue: selfValue,
        demandCharge: state.economy.demandCharge,
      },
    };

    return {
      state,
      hydrated,
      engineInput,
      update: (patch) => setState((s) => patch(s)),
      setCountry: (code) =>
        setState((s) => ({
          ...s,
          grid: {
            country: code,
            mainFuseA: s.grid.mainFuseManual
              ? s.grid.mainFuseA
              : getCountry(code).grid.defaultMainFuse,
            mainFuseManual: s.grid.mainFuseManual,
          },
          // Country defaults only overwrite untouched economy values.
          economy: s.economy.touched ? s.economy : economyFromCountry(code),
        })),
      reset: () => setState(createInitialState()),
    };
  }, [state, hydrated]);

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used inside WizardProvider");
  return ctx;
}
