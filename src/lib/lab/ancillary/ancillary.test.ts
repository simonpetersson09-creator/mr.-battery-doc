import { describe, expect, it } from "vitest";

import {
  computeAncillary,
  defaultAncillaryConfig,
  enduranceEnergyKWh,
  ingestPriceTable,
  normalisePrice,
  parseUnit,
  SE_MARKET,
  ancillaryReservation,
  ancillaryPlan,
  type BatteryCapability,
} from "./index";

const bat = (over: Partial<BatteryCapability> = {}): BatteryCapability => ({
  capacityKWh: 15,
  powerKw: 5,
  usableKWh: 13.5,
  roundTripEfficiency: 0.9,
  gridImportKw: 10,
  gridExportKw: 10,
  usedImportKw: 3,
  usedExportKw: 4,
  ...over,
});

const cfg = (over: Partial<ReturnType<typeof defaultAncillaryConfig>> = {}) => ({
  ...defaultAncillaryConfig(),
  enabled: true,
  serviceKeys: ["FCR-D-up"],
  offeredPowerKw: 5,
  aggregatorAccessConfirmed: true,
  prequalificationConfirmed: true,
  ...over,
});

describe("ancillary: units", () => {
  it("parses and normalises SEK/MW/h to kr/kW/h", () => {
    const u = parseUnit("SEK/MW/h")!;
    expect(u.denominator).toBe("MW/h");
    const n = normalisePrice(120, u, 744);
    expect(n.kind).toBe("capacity");
    expect(n.value).toBeCloseTo(0.12, 9);
  });

  it("treats SEK/MW without a time denominator as per period and warns", () => {
    const n = normalisePrice(74400, parseUnit("SEK/MW")!, 744);
    expect(n.value).toBeCloseTo(0.1, 9);
    expect(n.warning).toBeTruthy();
  });

  it("normalises SEK/MWh as activated energy", () => {
    expect(normalisePrice(500, parseUnit("SEK/MWh")!, 744).kind).toBe("activated-energy");
  });
});

describe("ancillary: ingestion", () => {
  const table = ["Period\tFCR-D upp\tOkänd tjänst", "2025-01\t120\t9", "2025-02\t100\t9"].join("\n");

  it("maps known columns, reports unknown ones and keeps the period", () => {
    const ds = ingestPriceTable(table, {
      market: SE_MARKET,
      unit: "SEK/MW/h",
      source: "test",
    });
    expect(ds.resolution).toBe("monthly");
    expect(ds.periodFrom).toBe("2025-01");
    expect(ds.periodTo).toBe("2025-02");
    expect(ds.unmapped).toContain("Okänd tjänst");
    expect(ds.points).toHaveLength(2);
    expect(ds.points[0]!.value).toBeCloseTo(0.12, 9);
    expect(ds.points[0]!.hoursInPeriod).toBe(31 * 24);
  });

  it("skips unreadable periods instead of guessing", () => {
    const ds = ingestPriceTable("Period\tFCR-D upp\nnågot\t100", {
      market: SE_MARKET,
      unit: "SEK/MW/h",
      source: "test",
    });
    expect(ds.points).toHaveLength(0);
    expect(ds.warnings.join(" ")).toMatch(/kunde inte tolkas/);
  });

  it("flags a foreign currency without converting", () => {
    const ds = ingestPriceTable("Period\tFCR-D upp\n2025-06\t100", {
      market: SE_MARKET,
      unit: "EUR/MW/h",
      source: "test",
    });
    expect(ds.warnings.join(" ")).toMatch(/valuta/);
    expect(ds.points[0]!.value).toBeCloseTo(0.1, 9);
  });
});

describe("ancillary: gates", () => {
  it("computes nothing without a dataset and says so", () => {
    const out = computeAncillary(SE_MARKET, cfg(), bat());
    expect(out.grossKr).toBeNull();
    expect(out.netKr).toBeNull();
    expect(out.dataGaps.join(" ")).toMatch(/Inget prisunderlag/);
    expect(out.disclaimer).toMatch(/inte en garanterad/);
  });

  it("blocks without aggregator access or prequalification when no scenario is assumed", () => {
    const out = computeAncillary(
      SE_MARKET,
      cfg({
        assumeMarketAccess: false,
        aggregatorAccessConfirmed: false,
        prequalificationConfirmed: false,
      }),
      bat(),
    );
    const blockers = out.services[0]!.blockers.join(" ");
    expect(blockers).toMatch(/Aggregatoråtkomst/);
    expect(blockers).toMatch(/Förkvalificering/);
    expect(out.services[0]!.paidHours).toBe(0);
  });

  it("zero offered power gives zero qualified power", () => {
    const out = computeAncillary(SE_MARKET, cfg({ offeredPowerKw: 0 }), bat());
    expect(out.services[0]!.qualifiedPowerKw).toBe(0);
    expect(out.reservedPowerKw).toBe(0);
  });

  it("limits up-regulation by the remaining export headroom", () => {
    const out = computeAncillary(SE_MARKET, cfg(), bat({ gridExportKw: 5, usedExportKw: 3 }));
    expect(out.services[0]!.qualifiedPowerKw).toBeCloseTo(2, 9);
  });

  it("offers FCR-D up only — no other Swedish service is selectable", () => {
    expect(SE_MARKET.services.map((s) => s.key)).toEqual(["FCR-D-up"]);
    expect(defaultAncillaryConfig().serviceKeys).toEqual(["FCR-D-up"]);
    // A legacy saved config naming another service still resolves to FCR-D up.
    const out = computeAncillary(SE_MARKET, cfg({ serviceKeys: ["FCR-N", "mFRR-up"] }), bat());
    expect(out.services.map((s) => s.serviceKey)).toEqual(["FCR-D-up"]);
    const plan = ancillaryPlan(cfg({ serviceKeys: ["FCR-N"] }))!;
    expect(plan.downPowerKw).toBe(0);
  });

  it("blocks a service whose endurance does not fit the SOC window", () => {
    const out = computeAncillary(
      SE_MARKET,
      cfg({ offeredPowerKw: 5 }),
      bat({ capacityKWh: 1, usableKWh: 0.9, powerKw: 5 }),
    );
    expect(out.services[0]!.qualifiedPowerKw).toBe(0);
    expect(out.services[0]!.blockers.join(" ")).toMatch(/Uthålligheten/);
  });

  it("corrects endurance energy for discharge efficiency on up-regulation", () => {
    const svc = SE_MARKET.services.find((s) => s.key === "FCR-D-up")!;
    const need = enduranceEnergyKWh(svc, 5, 15, 0.9);
    expect(need).toBeGreaterThan(5 * svc.requirements.enduranceHours + 0.05 * 15);
  });
});

describe("ancillary: hypothetical scenario, pooling and reservation plan", () => {
  it("computes a scenario without confirmations and labels it as hypothetical", () => {
    const out = computeAncillary(
      SE_MARKET,
      cfg({
        assumeMarketAccess: true,
        aggregatorAccessConfirmed: false,
        prequalificationConfirmed: false,
      }),
      bat(),
    );
    expect(out.services[0]!.blockers).toHaveLength(0);
    expect(out.hypotheticalScenario).toBe(true);
    expect(out.services[0]!.assumptions.join(" ")).toMatch(/HYPOTETISKT/);
  });

  it("lets a small battery pass the minimum bid size through pooling", () => {
    const pooled = computeAncillary(SE_MARKET, cfg({ aggregatedParticipation: true }), bat());
    expect(pooled.services[0]!.blockers.join(" ")).not.toMatch(/budstorlek|minsta bud/i);
    const alone = computeAncillary(SE_MARKET, cfg({ aggregatedParticipation: false, aggregatorAccessConfirmed: false }), bat());
    expect(alone.services[0]!.blockers.join(" ")).toMatch(/bud/i);
  });

  it("never shows a missing price as zero revenue", () => {
    const out = computeAncillary(SE_MARKET, cfg(), bat());
    expect(out.grossKr).toBeNull();
    expect(out.revenueStatus).toBe("missing-price-data");
    expect(out.activationSimulated).toBe(false);
  });

  it("keeps up and down reservation separate in the plan", () => {
    const up = ancillaryPlan(cfg({ serviceKeys: ["FCR-D-up"] }))!;
    expect(up.upPowerKw).toBe(5);
    expect(up.downPowerKw).toBe(0);
    expect(up.upEnergyKWh).toBeGreaterThan(0);
    expect(up.downEnergyKWh).toBe(0);
  });

  it("limits the reservation to the chosen hours and months", () => {
    const plan = ancillaryPlan(cfg({ reservationHours: [18, 19], reservationMonths: [1] }))!;
    expect(plan.wholeYear).toBe(false);
    expect(plan.hoursOfDay).toEqual([18, 19]);
    expect(plan.notes.join(" ")).toMatch(/valda perioder/);
  });

  it("lowered availability from the simulation reduces the paid hours", () => {
    const dataset = ingestPriceTable(["Period\tFCR-D upp", "2025-01\t120"].join("\n"), {
      market: SE_MARKET,
      unit: "SEK/MW/h",
      source: "test",
    });
    const full = computeAncillary(SE_MARKET, cfg({ dataset }), bat(), 100);
    const half = computeAncillary(SE_MARKET, cfg({ dataset }), bat(), 50);
    expect(half.services[0]!.paidHours).toBeLessThan(full.services[0]!.paidHours);
  });
});

describe("ancillary: revenue and reservation", () => {
  const dataset = ingestPriceTable(
    ["Period\tFCR-D upp", "2025-01\t120", "2025-02\t120"].join("\n"),
    { market: SE_MARKET, unit: "SEK/MW/h", source: "test" },
  );

  it("capacity revenue = price x qualified kW x paid hours", () => {
    const out = computeAncillary(SE_MARKET, cfg({ dataset }), bat());
    const hours = (31 + 28) * 24 * 0.95;
    expect(out.grossKr).toBeCloseTo(0.12 * 5 * hours, 6);
    expect(out.netKr).toBeNull();
  });

  it("net requires both aggregator cost inputs", () => {
    const out = computeAncillary(
      SE_MARKET,
      cfg({ dataset, aggregatorSharePct: 20, aggregatorFixedKrPerYear: 0 }),
      bat(),
    );
    expect(out.netKr).toBeCloseTo(out.grossKr! * 0.8, 6);
    expect(out.dataGaps.join(" ")).toMatch(/slitage/);
  });

  it("reports a missing price for a selected service instead of assuming one", () => {
    const foreign = {
      ...dataset,
      points: dataset.points.map((pt) => ({ ...pt, serviceKey: "parked-service" })),
    };
    const out = computeAncillary(SE_MARKET, cfg({ dataset: foreign }), bat());
    expect(out.dataGaps.join(" ")).toMatch(/saknar kapacitetspris/);
    expect(out.grossKr).toBeNull();
  });

  it("reservation is a single shared window, never doubled per service", () => {
    const res = ancillaryReservation(cfg({ serviceKeys: ["FCR-D-up", "FCR-N"] }))!;
    expect(res.reservedPowerKw).toBe(5);
    expect(res.enduranceHours).toBe(0.35);
    expect(res.serviceMinSocPct).toBe(20);
    expect(res.serviceMaxSocPct).toBe(95);
    expect(res.paymentKrPerKwYear).toBe(0);
  });

  it("disabled config produces no services and no revenue", () => {
    const out = computeAncillary(SE_MARKET, { ...cfg({ dataset }), enabled: false }, bat());
    expect(out.services).toHaveLength(0);
    expect(out.grossKr).toBeNull();
  });
});
