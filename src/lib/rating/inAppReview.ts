/**
 * In-app review prompt (App Store rating with stars, shown as a system sheet).
 *
 * Native iOS only, via SKStoreReviewController (@capacitor-community/in-app-review).
 * Apple decides whether the sheet is actually shown (max ~3 prompts per 365 days,
 * and never in sandbox/TestFlight debug builds) — we only REQUEST it.
 *
 * Our own policy on top:
 * - at most one request per engine version per device
 * - at least MIN_DAYS_BETWEEN_PROMPTS between requests
 * - only ever triggered after a completed result, never mid-wizard
 */

import { isNativePlatform } from "@/lib/platform/runtime";
import { BATTERY_ENGINE_VERSION } from "@/lib/battery-engine/version";

const STORAGE_KEY = "mr-battery-doc:rating";
const MIN_DAYS_BETWEEN_PROMPTS = 30;

interface RatingState {
  /** Engine version last prompted for. */
  version: string;
  /** Epoch ms of the last request. */
  lastPromptAt: number;
}

function readState(): RatingState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RatingState>;
    if (typeof parsed.version !== "string" || typeof parsed.lastPromptAt !== "number") {
      return null;
    }
    return { version: parsed.version, lastPromptAt: parsed.lastPromptAt };
  } catch {
    return null;
  }
}

function writeState(state: RatingState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — worst case Apple throttles instead */
  }
}

function eligible(now: number): boolean {
  if (!isNativePlatform()) return false;
  const state = readState();
  if (!state) return true;
  if (state.version !== BATTERY_ENGINE_VERSION) {
    // New version: allowed again, but keep the 30-day courtesy gap.
    return now - state.lastPromptAt >= MIN_DAYS_BETWEEN_PROMPTS * 24 * 60 * 60 * 1000;
  }
  return false;
}

/**
 * Requests the system rating sheet if eligible. Resolves true when the request
 * was actually sent to iOS (not necessarily shown — Apple throttles silently).
 */
export async function requestAppReview(): Promise<boolean> {
  const now = Date.now();
  if (!eligible(now)) return false;
  try {
    const { InAppReview } = await import("@capacitor-community/in-app-review");
    await InAppReview.requestReview();
    writeState({ version: BATTERY_ENGINE_VERSION, lastPromptAt: now });
    return true;
  } catch {
    // Plugin missing (web preview) or iOS declined — stay silent by design.
    return false;
  }
}

/**
 * Fire-and-forget helper for the result page: waits a moment so the sheet does
 * not pop over the first render, then requests the review.
 */
export function scheduleAppReview(delayMs = 2500): void {
  window.setTimeout(() => {
    void requestAppReview();
  }, delayMs);
}
