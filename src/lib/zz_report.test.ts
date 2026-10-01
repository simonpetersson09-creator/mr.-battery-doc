import { it } from "vitest";
import { toEconomyConfig, toLabConfig } from "@/lib/battery-engine/input";
import { buildSeries } from "@/lib/lab/simulate";
import { optimizeFcrReservation } from "@/lib/lab/operatingEconomy";
it("r", () => {
  for (const [c, r] of [["CH", 0.94], ["DE", 1], ["SE", 11.3]] as const) {
    const i: any = {
      site: { voltageV: 400, phases: 3, mainFuseA: 250, country: c, marketArea: c === "SE" ? "SE3" : null },
      consumption: { annualKWh: 20000, profile: "normal" },
      production: { enabled: true, annualKWh: 10000, kWp: 10 },
      strategies: { selfConsumption: true, reduceImport: true, peakShaving: true, fcrDUp: true, optimiseFcrReservation: true },
      economy: { importEnergyPriceSekPerKWh: 0.3 * r, exportEnergyValueSekPerKWh: 0.05 * r, peakDemandChargeSekPerKwMonth: null, peakTariffSource: "default-estimate", eurSekRate: r, customerAncillaryShare: 0.75 },
      battery: { fixedCapacityKWh: 10, fixedPowerKw: 5 },
    };
    const cfg = toLabConfig(i);
    const o = optimizeFcrReservation(cfg, 10, 5, toEconomyConfig(i), [0, 0.2, 0.4, 0.6, 0.8, 1], buildSeries(cfg));
    console.log("RES", c, o.tieToleranceSek.toFixed(2), o.best.offeredPowerKw, JSON.stringify(o.candidates.map((k) => [k.offeredPowerKw, k.annualCustomerBenefitSek])));
  }
}, 600000);
