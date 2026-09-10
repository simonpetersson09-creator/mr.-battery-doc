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
import type { WizardState } from "@/state/wizard";
import { calculationId } from "./calculationId";

export interface CachedCalculation {
  id: string;
  outcome: BatteryAppResult;
}

let cached: CachedCalculation | null = null;

/** Runs the calculation once per unique input set and reuses it afterwards. */
export function getCalculation(state: WizardState): CachedCalculation {
  const id = calculationId(state);
  if (cached && cached.id === id) return cached;
  cached = { id, outcome: runBatteryApp(state) };
  return cached;
}

export function clearCalculationCache(): void {
  cached = null;
}
