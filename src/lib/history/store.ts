/**
 * Local, device-only snapshot storage.
 *
 * Safe storage pattern: every read and write is guarded, unavailable or corrupt
 * storage degrades to "no history" instead of throwing.
 */
import { parseSnapshot, type CalculationSnapshot } from "./snapshot";

export const HISTORY_STORAGE_KEY = "mr-battery-doc-calculations";

/** Keeps local storage bounded — oldest entries are dropped first. */
export const MAX_SNAPSHOTS = 25;

function storage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

/** Newest first. Anything unreadable is silently skipped. */
export function listSnapshots(): CalculationSnapshot[] {
  const s = storage();
  if (!s) return [];
  let raw: string | null = null;
  try {
    raw = s.getItem(HISTORY_STORAGE_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const items = parsed
    .map(parseSnapshot)
    .filter((v): v is CalculationSnapshot => v !== null);
  return items.sort((a, b) => Date.parse(b.createdISO) - Date.parse(a.createdISO));
}

export function loadSnapshot(calculationId: string): CalculationSnapshot | null {
  return listSnapshots().find((s) => s.calculationId === calculationId) ?? null;
}

function write(items: CalculationSnapshot[]): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage full: drop the oldest half and try once more.
    try {
      s.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items.slice(0, Math.ceil(items.length / 2))));
    } catch {
      /* give up — history is a convenience, never a blocker */
    }
  }
}

/** Stores a snapshot once. An existing snapshot for the same id is NEVER overwritten. */
export function saveSnapshot(snapshot: CalculationSnapshot): void {
  const existing = listSnapshots();
  if (existing.some((s) => s.calculationId === snapshot.calculationId)) return;
  write([snapshot, ...existing].slice(0, MAX_SNAPSHOTS));
}

export function removeSnapshot(calculationId: string): void {
  write(listSnapshots().filter((s) => s.calculationId !== calculationId));
}

export function clearSnapshots(): void {
  const s = storage();
  try {
    s?.removeItem(HISTORY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
