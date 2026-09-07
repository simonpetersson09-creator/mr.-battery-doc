/**
 * Battery Engine integration point.
 *
 * The verified engine from Energy Architect is NOT implemented here yet.
 * When it arrives, implement `dimensionBattery` in this folder and delete the
 * mock below. The UI already calls only this function.
 */

import type { BatteryEngineInput, BatteryRecommendation } from "./types";
import { mockRecommendation } from "./mock";

export * from "./types";

export function dimensionBattery(input: BatteryEngineInput): BatteryRecommendation {
  // TODO: replace with the verified Energy Architect Battery Engine.
  return mockRecommendation(input);
}
