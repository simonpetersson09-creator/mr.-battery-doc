/**
 * History storage and purchase-right join.
 *
 * Verifies the guarantees the feature rests on: a stored snapshot is immutable,
 * survives a reload, degrades gracefully when the data is corrupt, and is only
 * openable when the purchase right still holds.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { parseSnapshot, SNAPSHOT_SCHEMA_VERSION, type CalculationSnapshot } from "./snapshot";
import {
  HISTORY_STORAGE_KEY,
  clearSnapshots,
  listSnapshots,
  loadSnapshot,
  saveSnapshot,
} from "./store";
import { buildHistoryEntries } from "./verification";
import type { Entitlements } from "@/lib/access/entitlements";

/** Minimal in-memory localStorage so the module under test can run in Node. */
class MemoryStorage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}

(globalThis as unknown as { localStorage: Storage }).localStorage =
  new MemoryStorage() as unknown as Storage;

function snap(id: string, createdISO: string, capacityKWh = 25): CalculationSnapshot {
  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    calculationId: id,
    createdISO,
    country: "SE",
    marketArea: null,
    currency: "SEK",
    wizard: { grid: { country: "SE" } },
    engineVersion: "1.0.0",
    input: {},
    summary: { recommendation: { capacityKWh }, energy: {}, economy: {} },
    powerSizing: {},
    config: { grid: {}, battery: {}, consumption: { shape: "flat" } },
    alternatives: [],
    withoutFcr: null,
    customerEconomy: { totalCustomerBenefitSek: 7456 },
    headline: {
      capacityKWh,
      powerKw: 12.5,
      annualCustomerBenefit: 7456,
      maxInvestment: 74560,
      targetPaybackYears: 10,
      customerAncillaryShare: 0.8,
    },
  } as unknown as CalculationSnapshot;
}

const entitlements = (unlocked: string[], premium = false): Entitlements =>
  ({
    premium: { active: premium, expiresISO: null },
    unlockedCalculations: unlocked,
  }) as unknown as Entitlements;

describe("history snapshots", () => {
  beforeEach(() => clearSnapshots());

  it("stores a purchased calculation and finds it again after a reload", () => {
    saveSnapshot(snap("calc-1", "2026-09-10T10:00:00.000Z"));
    expect(listSnapshots()).toHaveLength(1);
    expect(loadSnapshot("calc-1")?.headline.capacityKWh).toBe(25);
  });

  it("never rewrites an existing snapshot, so today's prices cannot change it", () => {
    saveSnapshot(snap("calc-1", "2026-09-10T10:00:00.000Z", 25));
    saveSnapshot(snap("calc-1", "2026-09-11T10:00:00.000Z", 99));
    expect(listSnapshots()).toHaveLength(1);
    expect(loadSnapshot("calc-1")?.headline.capacityKWh).toBe(25);
  });

  it("lists newest first", () => {
    saveSnapshot(snap("old", "2026-01-01T00:00:00.000Z"));
    saveSnapshot(snap("new", "2026-09-01T00:00:00.000Z"));
    expect(listSnapshots().map((s) => s.calculationId)).toEqual(["new", "old"]);
  });

  it("falls back to an empty history on corrupt storage", () => {
    localStorage.setItem(HISTORY_STORAGE_KEY, "{not json");
    expect(listSnapshots()).toEqual([]);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([{ schemaVersion: 0 }, null, 7]));
    expect(listSnapshots()).toEqual([]);
  });

  it("rejects snapshots from another schema version or with missing parts", () => {
    expect(parseSnapshot({ ...snap("a", "2026-01-01T00:00:00.000Z"), schemaVersion: 99 })).toBeNull();
    const missing = { ...snap("a", "2026-01-01T00:00:00.000Z") } as Record<string, unknown>;
    delete missing["summary"];
    expect(parseSnapshot(missing)).toBeNull();
  });

  it("missing snapshot means no result to open", () => {
    expect(loadSnapshot("unknown")).toBeNull();
  });
});

describe("history purchase rights", () => {
  const s = snap("calc-1", "2026-09-10T10:00:00.000Z");

  it("a one-off purchase keeps the calculation openable without Premium", () => {
    const [entry] = buildHistoryEntries([s], entitlements(["calc-1"]));
    expect(entry?.purchased).toBe(true);
    expect(entry?.openable).toBe(true);
  });

  it("Premium opens stored calculations too", () => {
    const [entry] = buildHistoryEntries([s], entitlements([], true));
    expect(entry?.openable).toBe(true);
  });

  it("an unverified purchase is listed but not openable", () => {
    const [entry] = buildHistoryEntries([s], entitlements([]));
    expect(entry?.openable).toBe(false);
  });
});
