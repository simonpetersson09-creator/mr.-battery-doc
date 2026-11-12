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

/** Comparison layers if they are already computed for this input set, else null. */
export function peekDerivedAnalyses(state: WizardState): CachedDerived | null {
  const id = calculationId(state);
  return derived && derived.id === id ? derived : null;
}

/* ---------- Background (Web Worker) execution ----------------------------
 * Same functions, run in a worker so the screen never freezes. Any worker
 * problem falls back to the synchronous path — results are identical. */
let worker: Worker | null = null;
let workerBroken = false;
let nextReq = 1;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: unknown) => void }>();

function getWorker(): Worker | null {
  if (workerBroken || typeof window === "undefined" || typeof Worker === "undefined") return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL("./calculation.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<{ reqId: number; ok: boolean; data?: unknown; error?: string }>) => {
      const p = pending.get(e.data.reqId);
      if (!p) return;
      pending.delete(e.data.reqId);
      if (e.data.ok) p.resolve(e.data.data);
      else p.reject(new Error(e.data.error));
    };
    worker.onerror = () => {
      workerBroken = true;
      worker?.terminate();
      worker = null;
      for (const p of pending.values()) p.reject(new Error("worker failed"));
      pending.clear();
    };
    return worker;
  } catch {
    workerBroken = true;
    return null;
  }
}

function ask<T>(kind: "calc" | "derived", state: WizardState): Promise<T> {
  const w = getWorker();
  if (!w) return Promise.reject(new Error("no worker"));
  const reqId = nextReq++;
  return new Promise<T>((resolve, reject) => {
    pending.set(reqId, { resolve: resolve as (v: unknown) => void, reject });
    try {
      w.postMessage({ reqId, kind, state: JSON.parse(JSON.stringify(state)) });
    } catch (err) {
      pending.delete(reqId);
      reject(err);
    }
  });
}

/** Main calculation without blocking the screen; fills the same one-slot cache. */
export async function calculateInBackground(state: WizardState): Promise<CachedCalculation> {
  const id = calculationId(state);
  if (cached && cached.id === id) return cached;
  try {
    const res = await ask<CachedCalculation>("calc", state);
    if (res.id === id) {
      if (!(cached && cached.id === id)) {
        cached = res;
        derived = null;
      }
      return cached;
    }
  } catch {
    /* fall through to the synchronous path */
  }
  return getCalculation(state);
}

/** Comparison layers without blocking the screen; fills the same cache. */
export async function deriveInBackground(state: WizardState): Promise<CachedDerived> {
  const ready = peekDerivedAnalyses(state);
  if (ready) return ready;
  try {
    const res = await ask<CachedDerived>("derived", state);
    if (res.id === calculationId(state) && cached && cached.id === res.id) {
      derived = res;
      return res;
    }
  } catch {
    /* fall through */
  }
  return getDerivedAnalyses(state);
}
