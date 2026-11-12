import { describe, expect, it } from "vitest";
import { createNativeGateway, type NativePurchasePlugin } from "./native";

const future = new Date(Date.now() + 30 * 864e5).toISOString();
const plugin = (r: Awaited<ReturnType<NonNullable<NativePurchasePlugin["currentPremium"]>>>) =>
  ({ currentPremium: async () => r }) as unknown as NativePurchasePlugin;
const local = { active: true, expiresISO: null, transactionId: "t1" };

describe("Premium-synk kräver serververifiering", () => {
  it("lokalt kvitto + server verified med framtida datum ger Premium", async () => {
    const g = createNativeGateway(plugin(local), async () => ({ status: "verified", premiumExpiresISO: future }));
    expect(await g.syncPremium!()).toEqual({ expiresISO: future });
  });
  it("lokalt kvitto utan serverbekräftelse ger inte Premium", async () => {
    for (const v of [{ status: "invalid", reason: "x" }, { status: "config-required" }, { status: "unavailable" }] as const) {
      const g = createNativeGateway(plugin(local), async () => v);
      expect(await g.syncPremium!()).toBeNull();
    }
  });
  it("verified utan utgångsdatum ger inte evigt Premium", async () => {
    const g = createNativeGateway(plugin(local), async () => ({ status: "verified", premiumExpiresISO: null }));
    expect(await g.syncPremium!()).toBeNull();
  });
  it("utgånget datum från servern ger inte Premium", async () => {
    const past = new Date(Date.now() - 1000).toISOString();
    const g = createNativeGateway(plugin(local), async () => ({ status: "verified", premiumExpiresISO: past }));
    expect(await g.syncPremium!()).toBeNull();
  });
  it("utan transaktions-id frågas inte servern och Premium ges inte", async () => {
    let called = false;
    const g = createNativeGateway(plugin({ active: true, expiresISO: null }), async () => {
      called = true;
      return { status: "verified", premiumExpiresISO: future };
    });
    expect(await g.syncPremium!()).toBeNull();
    expect(called).toBe(false);
  });
});
