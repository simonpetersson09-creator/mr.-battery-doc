/**
 * One-slot cache for the finished calculation.
 *
 * The simulation runs when the user leaves step 5. Navigating to the paywall,
 * through the App Store dialog and on to the result page must NOT run it again —
 * the result page reads the cached outcome for the same calculation id.
 *
 * This is a cache only: `runBatteryApp` stays the single source of truth and the
 * engine is untouched.
 */
import { runBatteryApp, type BatteryAppResult } from "@/lib/battery-app";
import {
  computeBatteryAlternatives,
  type BatteryAlternative,
} from "@/lib/battery-app/capacityAlternatives";
import {
  computeWithoutFcrOptimum,
  type WithoutFcrOptimum,
} from "@/lib/battery-app/withoutFcrOptimum";
import type { WizardState } from "@/state/wizard";
import { calculationId } from "./calculationId";

export interface CachedCalculation {
  id: string;
  outcome: BatteryAppResult;
}

/**
 * The result page's comparison layers. They re-run the engine at other capacities,
 * so they are computed ONCE per calculation id — same inputs, same arguments and
 * the exact same functions as before. Pure caching: no physics or economics change.
 */
export interface CachedDerived {
  id: string;
  withoutFcr: WithoutFcrOptimum | null;
  alternatives: BatteryAlternative[];
}

let cached: CachedCalculation | null = null;
let derived: CachedDerived | null = null;

/** Runs the calculation once per unique input set and reuses it afterwards. */
export function getCalculation(state: WizardState): CachedCalculation {
  const id = calculationId(state);
  if (cached && cached.id === id) return cached;
  cached = { id, outcome: runBatteryApp(state) };
  derived = null;
  return cached;
}

/** Comparison layers for the cached calculation, computed at most once per id. */
export function getDerivedAnalyses(state: WizardState): CachedDerived {
  const calc = getCalculation(state);
  if (derived && derived.id === calc.id) return derived;
  const outcome = calc.outcome;
  derived =
    outcome.status === "ok"
      ? {
          id: calc.id,
          withoutFcr: outcome.result.summary.fcr.enabled
            ? computeWithoutFcrOptimum(outcome.input, outcome.result)
            : null,
          alternatives: computeBatteryAlternatives(
            outcome.input,
            outcome.result,
            state.preferences.customerAncillaryShare,
          ),
        }
      : { id: calc.id, withoutFcr: null, alternatives: [] };
  return derived;
}

export function clearCalculationCache(): void {
  cached = null;
  derived = null;
}
