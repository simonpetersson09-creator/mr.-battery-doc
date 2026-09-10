/**
 * READ-ONLY before/after report for the model decisions (FCR objective, zero demand fee,
 * negative customer benefit). "Before" is reconstructed from the same candidate
 * simulations by scoring them with the OLD objective; nothing is re-tuned.
 */
import { toEconomyConfig, toLabConfig, toTimeSeries } from "../../src/lib/battery-engine/input";
import type { BatteryEngineInput } from "../../src/lib/battery-engine/types";
import { runBatteryEngine } from "../../src/lib/battery-engine/run";
import {
  annualCustomerBenefitSek,
  evaluateOperatingEconomy,
  FCR_TIE_TOLERANCE_SEK,
  optimizeFcrReservation,
} from "../../src/lib/lab/operatingEconomy";
import type { LabConfig } from "../../src/lib/lab/types";

const kr = (v: number | null) => (v === null ? "n/a" : `${Math.round(v)} kr`);

function fcrBeforeAfter(label: string, inp: BatteryEngineInput, cap: number, kw: number) {
  const cfg = toLabConfig(inp);
  const series = toTimeSeries(cfg, inp);
  const econ = toEconomyConfig(inp);
  const opt = optimizeFcrReservation(cfg, cap, kw, econ, undefined, series);
  // OLD objective: highest total operating benefit (energy + peak + raw FCR gross).
  const bestOld = Math.max(...opt.candidates.map((c) => c.totalOperatingBenefitSek));
  const before =
    opt.candidates.find((c) => c.totalOperatingBenefitSek >= bestOld - FCR_TIE_TOLERANCE_SEK)!;
  const after = opt.best;
  console.log(`\n== ${label} (${cap} kWh / ${kw} kW) ==`);
  for (const [tag, c] of [
    ["BEFORE (raw FCR objective)", before],
    ["AFTER  (customer benefit) ", after],
  ] as const) {
    console.log(
      `${tag}: reservation ${c.offeredPowerKw} kW | energy ${kr(c.energyBenefitSek)} | peak ${kr(
        c.peakBenefitSek,
      )} | fcr gross ${kr(c.fcrGrossSek)} | customer ${kr(c.annualCustomerBenefitSek)}`,
    );
  }
}

function zeroFeeBeforeAfter(label: string, inp: BatteryEngineInput, cap: number, kw: number) {
  const cfg = toLabConfig(inp);
  const series = toTimeSeries(cfg, inp);
  const econ = toEconomyConfig(inp);
  const on: LabConfig = { ...cfg, peakShaving: { ...cfg.peakShaving, gridChargingEnabled: true } };
  const off: LabConfig = { ...cfg, peakShaving: { ...cfg.peakShaving, gridChargingEnabled: false } };
  console.log(`\n== ${label} (${cap} kWh / ${kw} kW, demandFee = 0) ==`);
  for (const [tag, c] of [
    ["BEFORE (grid charging on) ", on],
    ["AFTER  (grid charging off)", off],
  ] as const) {
    const e = evaluateOperatingEconomy(c, cap, kw, econ, series);
    const cust = annualCustomerBenefitSek(
      e.economy.energy.energyBenefitSek,
      e.economy.peak.annualPeakBenefitSek,
      e.economy.fcr.grossSek,
      econ,
    );
    console.log(
      `${tag}: grid charged ${Math.round(e.result.chargedFromGridKWh)} kWh | energy ${kr(
        e.economy.energy.energyBenefitSek,
      )} | customer ${kr(cust)} | balance ${e.result.energyBalance.ok}`,
    );
  }
}

const LOAD_BIG = new Array(12).fill(250000 / 12);
const LOAD_SMALL = [2264, 1887, 1698, 1509, 1321, 1226, 1132, 1226, 1415, 1698, 2075, 2549];
const PV = [101, 302, 806, 1410, 1813, 2216, 2317, 2014, 1612, 906, 403, 100];
const ECON = {
  importEnergyPriceSekPerKWh: 1.5,
  exportEnergyValueSekPerKWh: 0.6,
  peakDemandChargeSekPerKwMonth: 30,
  peakTariffSource: "user-provided" as const,
  eurSekRate: 11.3,
};

// 1. SE 250 MWh / 200 A
const se: BatteryEngineInput = {
  site: { country: "SE", mainFuseA: 200, phases: 3, voltageV: 400 },
  consumption: { monthlyKWh: LOAD_BIG, annualKWh: 250000, profile: "normal" },
  production: { enabled: false },
  strategies: { selfConsumption: true, reduceImport: true, peakShaving: true, fcrDUp: true, optimiseFcrReservation: true },
  economy: ECON,
};
const seRes = runBatteryEngine(se);
console.log("== SE 250 MWh / 200 A ==");
console.log(
  `recommendation ${seRes.summary.recommendation.capacityKWh} kWh / ${seRes.summary.recommendation.powerKw} kW | customer ${kr(
    seRes.summary.economy.annualCustomerBenefitSek,
  )} | positive ${seRes.summary.economy.hasPositiveCustomerBenefit}`,
);
fcrBeforeAfter("SE 250 MWh / 200 A", se, seRes.summary.recommendation.capacityKWh, seRes.summary.recommendation.powerKw);

// 2. the 25 -> 30 kWh case
const small: BatteryEngineInput = {
  site: { country: "SE", mainFuseA: 25, phases: 3, voltageV: 400 },
  consumption: { monthlyKWh: LOAD_SMALL, annualKWh: 20000, profile: "normal" },
  production: { enabled: true, monthlyKWh: PV, annualKWh: 14000, kWp: 14, inverterAcKw: 12 },
  strategies: { selfConsumption: true, reduceImport: true, peakShaving: true, fcrDUp: true, optimiseFcrReservation: true },
  economy: ECON,
};
fcrBeforeAfter("25 kWh step", small, 25, 12.5);
fcrBeforeAfter("30 kWh step", small, 30, 15);

// 3. FI / DE with demandFee = 0
const zeroEcon = { ...ECON, peakDemandChargeSekPerKwMonth: 0 };
for (const country of ["FI", "DE"] as const) {
  zeroFeeBeforeAfter(
    `${country} zero demand fee`,
    {
      site: { country, mainFuseA: 63, phases: 3, voltageV: 400 },
      consumption: { monthlyKWh: LOAD_SMALL, annualKWh: 20000, profile: "normal" },
      production: { enabled: true, monthlyKWh: PV, annualKWh: 14000, kWp: 14, inverterAcKw: 12 },
      strategies: { selfConsumption: true, reduceImport: true, peakShaving: true, fcrDUp: false },
      economy: zeroEcon,
    },
    20,
    10,
  );
}

// 4. worst negative customer benefit case
const negative: BatteryEngineInput = {
  site: { country: "SE", mainFuseA: 25, phases: 3, voltageV: 400 },
  consumption: { monthlyKWh: LOAD_SMALL, annualKWh: 20000, profile: "normal" },
  production: { enabled: true, monthlyKWh: PV, annualKWh: 14000, kWp: 14, inverterAcKw: 12 },
  strategies: { selfConsumption: true, reduceImport: true, peakShaving: true, fcrDUp: false },
  economy: {
    ...ECON,
    importEnergyPriceSekPerKWh: 0.05,
    exportEnergyValueSekPerKWh: 0.9,
    peakDemandChargeSekPerKwMonth: 0,
  },
};
const negRes = runBatteryEngine(negative);
console.log("\n== worst negative customer benefit case ==");
console.log(
  `customer ${kr(negRes.summary.economy.annualCustomerBenefitSek)} | positive ${negRes.summary.economy.hasPositiveCustomerBenefit} | balance ${negRes.summary.energyBalance.ok}`,
);
