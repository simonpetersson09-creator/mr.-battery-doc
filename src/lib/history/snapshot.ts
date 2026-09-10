/**
 * HISTORY SNAPSHOTS.
 *
 * A snapshot is an IMMUTABLE copy of one purchased calculation: everything the
 * result page and the PDF report need in order to be rendered again WITHOUT
 * running a new simulation.
 *
 * Consequences of that rule:
 *  - changing default prices, ancillary prices, the dimensioning engine or the
 *    country config can never change an already stored snapshot,
 *  - opening a history entry never calls the engine,
 *  - nothing here is ever sent to a server (see `verification.ts`).
 *
 * Heavy engine diagnostics (the 8760 series, the full sweep, every simulated
 * candidate) are deliberately NOT stored — they are debug data, they are not
 * rendered, and they would not fit in local storage. The few diagnostics fields
 * the UI and the report actually read (`powerSizing`, parts of `config`) are.
 */
import type { BatteryAppResult } from "@/lib/battery-app";
import type { BatteryAlternative } from "@/lib/battery-app/capacityAlternatives";
import type { CustomerEconomy } from "@/lib/battery-app/customerEconomy";
import type { WithoutFcrOptimum } from "@/lib/battery-app/withoutFcrOptimum";
import type { BatteryEngineInput, BatteryEngineResult } from "@/lib/battery-engine";
import type { CountryCode } from "@/lib/country-config";
import type { Currency } from "@/lib/currency";
import type { MarketArea } from "@/lib/reserve-market";
import type { WizardState } from "@/state/wizard";

/** Bumped whenever the stored shape changes; older versions are dropped on read. */
export const SNAPSHOT_SCHEMA_VERSION = 1;

export interface SnapshotHeadline {
  capacityKWh: number;
  powerKw: number;
  /** Yearly customer benefit in the snapshot's own currency. */
  annualCustomerBenefit: number | null;
  maxInvestment: number | null;
  targetPaybackYears: number;
  customerAncillaryShare: number;
}

export interface CalculationSnapshot {
  schemaVersion: number;
  calculationId: string;
  createdISO: string;
  /** Country / market / currency AS THEY WERE when the calculation was bought. */
  country: CountryCode;
  marketArea: MarketArea | null;
  currency: Currency;
  /** All wizard inputs — the basis for "Ändra uppgifter". */
  wizard: WizardState;
  engineVersion: string;
  /** Engine input and the full customer-facing summary (energy, grid, peak, fcr, economy). */
  input: BatteryEngineInput;
  summary: BatteryEngineResult["summary"];
  /** The only diagnostics the result page and the PDF read. */
  powerSizing: BatteryEngineResult["diagnostics"]["powerSizing"];
  config: {
    grid: BatteryEngineResult["diagnostics"]["config"]["grid"];
    battery: BatteryEngineResult["diagnostics"]["config"]["battery"];
    consumption: { shape: BatteryEngineResult["diagnostics"]["config"]["consumption"]["shape"] };
  };
  /** Pre-computed derived layers, so reopening never re-simulates. */
  alternatives: BatteryAlternative[];
  withoutFcr: WithoutFcrOptimum | null;
  customerEconomy: CustomerEconomy;
  headline: SnapshotHeadline;
}

type OkOutcome = Extract<BatteryAppResult, { status: "ok" }>;

export function buildSnapshot(args: {
  calculationId: string;
  wizard: WizardState;
  outcome: OkOutcome;
  alternatives: BatteryAlternative[];
  withoutFcr: WithoutFcrOptimum | null;
  customerEconomy: CustomerEconomy;
  maxInvestment: number | null;
  now?: Date;
}): CalculationSnapshot {
  const { outcome, wizard } = args;
  const d = outcome.result.diagnostics;
  const r = outcome.result.summary.recommendation;
  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    calculationId: args.calculationId,
    createdISO: (args.now ?? new Date()).toISOString(),
    country: wizard.grid.country,
    marketArea: wizard.grid.marketArea,
    currency: wizard.economy.currency,
    wizard: structuredCopy(wizard),
    engineVersion: outcome.result.engineVersion,
    input: structuredCopy(outcome.input),
    summary: structuredCopy(outcome.result.summary),
    powerSizing: structuredCopy(d.powerSizing),
    config: {
      grid: structuredCopy(d.config.grid),
      battery: structuredCopy(d.config.battery),
      consumption: { shape: d.config.consumption.shape },
    },
    alternatives: structuredCopy(args.alternatives),
    withoutFcr: args.withoutFcr ? structuredCopy(args.withoutFcr) : null,
    customerEconomy: structuredCopy(args.customerEconomy),
    headline: {
      capacityKWh: r.capacityKWh,
      powerKw: r.recommendedPowerKw,
      annualCustomerBenefit: args.customerEconomy.totalCustomerBenefitSek,
      maxInvestment: args.maxInvestment,
      targetPaybackYears: wizard.preferences.targetPaybackYears,
      customerAncillaryShare: wizard.preferences.customerAncillaryShare,
    },
  };
}

/** JSON round trip: guarantees the snapshot is plain, immutable data. */
function structuredCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Rebuilds the exact `status: "ok"` outcome shape the result page and the PDF
 * expect. The unused diagnostics are absent by design — nothing rendered reads
 * them, and the stored fields are the ones that are.
 */
export function snapshotOutcome(snapshot: CalculationSnapshot): OkOutcome {
  const result = {
    engineVersion: snapshot.engineVersion,
    summary: snapshot.summary,
    diagnostics: {
      powerSizing: snapshot.powerSizing,
      config: snapshot.config,
    },
  } as unknown as BatteryEngineResult;
  return { status: "ok", input: snapshot.input, result };
}

/**
 * Defensive parse. Corrupt, truncated or older-schema data must never reach the
 * result page — it is simply not a snapshot.
 */
export function parseSnapshot(raw: unknown): CalculationSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o["schemaVersion"] !== SNAPSHOT_SCHEMA_VERSION) return null;
  if (typeof o["calculationId"] !== "string" || o["calculationId"].length === 0) return null;
  if (typeof o["createdISO"] !== "string" || Number.isNaN(Date.parse(o["createdISO"]))) return null;

  const required = ["wizard", "input", "summary", "powerSizing", "config", "customerEconomy", "headline"];
  for (const key of required) {
    const v = o[key];
    if (!v || typeof v !== "object") return null;
  }
  const summary = o["summary"] as Record<string, unknown>;
  if (!summary["recommendation"] || !summary["energy"] || !summary["economy"]) return null;
  if (!Array.isArray(o["alternatives"])) return null;

  return o as unknown as CalculationSnapshot;
}
