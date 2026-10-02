/**
 * HARD 1.0 C LIMIT for the final AUTOMATIC battery recommendation: power / capacity <= 1.0.
 * Shared by the main engine and the separate ancillary-only scenario. Only capacity is
 * raised (never power lowered), to the smallest real capacity step >= power. Caller-fixed
 * sizes are never passed through here.
 */
export const MAX_AUTO_C_RATE = 1.0;
const EPS = 1e-9;

/** True when the pair breaks the automatic 1.0 C limit. */
export function exceedsAutoCRate(powerKw: number, capacityKWh: number): boolean {
  return powerKw > 0 && powerKw > capacityKWh * MAX_AUTO_C_RATE + EPS;
}

/** Real capacity steps that satisfy the limit for `powerKw`, smallest first. */
export function cRateCapacitySteps(powerKw: number, capacitySteps: readonly number[]): number[] {
  return capacitySteps
    .filter((c) => c > 0 && !exceedsAutoCRate(powerKw, c))
    .sort((a, b) => a - b);
}

/** Smallest real capacity step that satisfies the limit, or null when none exists. */
export function minCapacityForAutoCRate(
  powerKw: number,
  capacitySteps: readonly number[],
): number | null {
  return cRateCapacitySteps(powerKw, capacitySteps)[0] ?? null;
}
