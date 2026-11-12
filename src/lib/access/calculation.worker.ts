/// <reference lib="webworker" />
/**
 * Runs the exact same calculation functions off the main thread, so the app
 * stays responsive while "Calculate" works. Same inputs, same functions —
 * only the thread changes.
 */
import { getCalculation, getDerivedAnalyses } from "./calculationCache";
import type { WizardState } from "@/state/wizard";

type Req = { reqId: number; kind: "calc" | "derived"; state: WizardState };

self.onmessage = (e: MessageEvent<Req>) => {
  const { reqId, kind, state } = e.data;
  try {
    const data = kind === "calc" ? getCalculation(state) : getDerivedAnalyses(state);
    (self as unknown as Worker).postMessage({ reqId, ok: true, data });
  } catch (err) {
    (self as unknown as Worker).postMessage({ reqId, ok: false, error: String(err) });
  }
};
