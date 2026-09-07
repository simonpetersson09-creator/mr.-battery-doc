/**
 * Battery App layer: wizard -> adapter -> Battery Engine -> result state.
 * The engine itself is only reached through `@/lib/battery-engine`.
 */

import { runBatteryEngine, type BatteryEngineInput, type BatteryEngineResult } from "@/lib/battery-engine";
import type { WizardState } from "@/state/wizard";
import { normalizeWizardToEngineInput, type NormalizeOptions } from "./normalizeWizardToEngineInput";
import { validateBatteryEngineInput, type ValidationIssue } from "./validate";

export { normalizeWizardToEngineInput, completeMonths } from "./normalizeWizardToEngineInput";
export { validateBatteryEngineInput } from "./validate";
export type { ValidationIssue, ValidationResult } from "./validate";
export type { NormalizeOptions } from "./normalizeWizardToEngineInput";

export type BatteryAppResult =
  | { status: "incomplete"; issues: ValidationIssue[] }
  | { status: "error"; message: string }
  | { status: "ok"; input: BatteryEngineInput; result: BatteryEngineResult };

/**
 * Runs the frozen engine for the current wizard data.
 * Never falls back to example numbers — an engine failure is reported as an error.
 */
export function runBatteryApp(
  state: WizardState,
  options: NormalizeOptions = {},
): BatteryAppResult {
  const validation = validateBatteryEngineInput(state);
  if (!validation.ok) return { status: "incomplete", issues: validation.issues };

  const input = normalizeWizardToEngineInput(state, options);
  try {
    return { status: "ok", input, result: runBatteryEngine(input) };
  } catch (err) {
    console.error("[battery-engine] run failed", { input, error: err });
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Okänt fel i beräkningen",
    };
  }
}
