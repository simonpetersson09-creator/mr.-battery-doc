/** ROOT-CAUSE AUDIT (read-only). Prints capacity ladders with full sizing semantics. */
import { toLabConfig, toTimeSeries, toEconomyConfig } from "@/lib/battery-engine";
import type { BatteryEngineInput } from "@/lib/battery-engine";
import { sizePower } from "@/lib/lab/powerSizing";
import { runEconomicPowerSizing, EMPTY_FCR_MARKET_REALISM } from "@/lib/lab/economicPowerSizing";
import { productCostConfig } from "@/lib/lab/productCost";
import { customerBenefitFromTotals } from "@/lib/battery-app/customerEconomy";
import { getCountry } from "@/lib/country-config";

export function ladder(input: BatteryEngineInput, caps: number[], share = 0.75) {
  const cfg = toLabConfig(input);
  const econ = toEconomyConfig(input);
  const series = toTimeSeries(cfg, input);
  const rows: Record<string, number | string | null>[] = [];
  let prev: { total: number | null; cust: number | null; fcr: number; en: number; pk: number } | null = null;
  for (const cap of caps) {
    const ps = sizePower(cfg, series, cap);
    const eps = runEconomicPowerSizing({
      cfg,
      series,
      capacityKWh: cap,
      physicalPowerNeedKw: ps.physicalNeedKw,
      productPowerKw: ps.productKw,
      econ,
      cost: productCostConfig({}),
      fcrMarket: EMPTY_FCR_MARKET_REALISM,
      optimiseFcrReservation: cfg.strategies.ancillaryServices,
    });
    const win = eps.options.find((o) => o.selected)!;
    const r = win.run.result;
    const total = win.totalOperatingBenefitSek;
    const fcr = win.fcrGrossSek ?? 0;
    const cust = customerBenefitFromTotals(total, fcr, share);
    rows.push({
      cap,
      physKw: ps.physicalNeedKw,
      prodKw: ps.productKw,
      optKw: win.powerKw,
      cRate: +(win.powerKw / cap).toFixed(3),
      offered: +win.fcrOfferedPowerKw.toFixed(2),
      held: +win.fcrHeldPowerKw.toFixed(2),
      monetized: +win.fcrMonetizedPowerKw.toFixed(2),
      fcrMarket: Math.round(fcr),
      fcrCustomer: Math.round(fcr * share),
      energy: Math.round(win.energyBenefitSek),
      peak: win.peakBenefitSek === null ? null : Math.round(win.peakBenefitSek),
      total: Math.round(total),
      customer: cust === null ? null : Math.round(cust),
      cycles: +r.equivalentFullCycles.toFixed(1),
      useful: Math.round(r.totalUsefulKWh),
      dEnergy: prev ? Math.round(win.energyBenefitSek - prev.en) : null,
      dPeak: prev ? Math.round((win.peakBenefitSek ?? 0) - prev.pk) : null,
      dFcr: prev ? Math.round(fcr - prev.fcr) : null,
      dTotal: prev && prev.total !== null ? Math.round(total - prev.total) : null,
      dCustomer: prev && prev.cust !== null && cust !== null ? Math.round(cust - prev.cust) : null,
    });
    prev = { total, cust, fcr, en: win.energyBenefitSek, pk: win.peakBenefitSek ?? 0 };
  }
  return rows;
}

export function baseInput(o: {
  country?: "SE" | "FI" | "DE" | "DK";
  marketArea?: "DK1" | "DK2" | null;
  load: number;
  pv: number;
  fuse: number;
  profile?: string;
  fcr?: boolean;
  peak?: boolean;
  demandCharge?: number | null;
}): BatteryEngineInput {
  const country = o.country ?? "SE";
  const c = getCountry(country);
  return {
    site: { country, marketArea: o.marketArea ?? null, mainFuseA: o.fuse },
    consumption: { annualKWh: o.load, profile: (o.profile ?? "evening-heavy") as never },
    production: { enabled: o.pv > 0, annualKWh: o.pv },
    battery: {},
    strategies: {
      selfConsumption: true,
      reduceImport: true,
      peakShaving: o.peak ?? true,
      fcrDUp: o.fcr ?? true,
      optimiseFcrReservation: o.fcr ?? true,
    },
    economy: {
      importEnergyPriceSekPerKWh: c.economy.importPrice,
      exportEnergyValueSekPerKWh: c.economy.exportPrice,
      peakDemandChargeSekPerKwMonth:
        o.demandCharge === undefined ? c.economy.demandCharge : o.demandCharge,
      eurSekRate: c.economy.eurSekRate,
    },
  };
}

if (import.meta.main) {
  const which = process.argv[2] ?? "A";
  if (which === "A") {
    const input = baseInput({ load: 250000, pv: 0, fuse: 200, fcr: true, peak: true });
    console.log("A: SE 250 MWh, no PV, 200 A, FCR on");
    console.table(ladder(input, [25, 30, 40, 50, 75, 100, 150, 200, 300, 500]));
  }
  if (which === "Anofcr") {
    const input = baseInput({ load: 250000, pv: 0, fuse: 200, fcr: false, peak: true });
    console.log("A': same without FCR");
    console.table(ladder(input, [25, 30, 40, 50, 75, 100, 150, 200, 300, 500]));
  }
}
