import { describe, expect, it } from "vitest";

import { runBatteryEngine } from "./index";
import type { BatteryEngineInput } from "./types";
import { BATTERY_ENGINE_TOLERANCES } from "./version";

/**
 * GOLDEN MASTER SUITE — the migration contract for Battery Engine v1.
 *
 * Every case below is a frozen input with a frozen expected output. The SAME cases must
 * produce the SAME numbers after the engine is imported into another project.
 *
 * Parity rules:
 *  - discrete values (recommended kWh/kW, statuses, booleans): EXACTLY equal
 *  - floating point values: within BATTERY_ENGINE_TOLERANCES (1e-6 relative-free absolute
 *    on the rounded reference values below, which are stored with 4 decimals)
 *
 * Any diff here means the physics or the economics changed and must be investigated
 * before the engine is considered migrated.
 */

const CASES: Record<string, { label: string; input: BatteryEngineInput }> = {
  GM01: { label: "Standardvilla 10 000 kWh / 12 000 kWh sol / 15 kWh / 3 kW", input: { battery: { fixedCapacityKWh: 15, fixedPowerKw: 3 } } },
  GM02: { label: "Utan sol", input: { production: { enabled: false } } },
  GM03: { label: "Peak shaving utan sol", input: { production: { enabled: false }, strategies: { peakShaving: true } } },
  GM04: { label: "Peak shaving med sol", input: { strategies: { peakShaving: true } } },
  GM05: { label: "FCR-D upp 1,5 kW", input: { strategies: { fcrDUp: true, fcrOfferedPowerKw: 1.5 }, battery: { fixedCapacityKWh: 15, fixedPowerKw: 3 } } },
  GM06: { label: "Alla strategier + FCR-optimering", input: { strategies: { peakShaving: true, fcrDUp: true, optimiseFcrReservation: true }, battery: { fixedCapacityKWh: 15, fixedPowerKw: 3 } } },
  GM07: { label: "Exportbegransad (3 kW export)", input: { site: { maxExportKw: 3 } } },
  GM08: { label: "Importbegransad (4 kW import, 25 000 kWh, ingen sol)", input: { site: { mainFuseA: 16, maxImportKw: 4 }, production: { enabled: false }, consumption: { annualKWh: 25000 } } },
  GM09: { label: "Stort system 400 MWh kontor", input: { consumption: { annualKWh: 400000, profile: "office" }, production: { annualKWh: 300000, kWp: 300, inverterAcKw: 250 }, site: { mainFuseA: 630 } } },
  GM10: { label: "200 kW-taket (250 kW erbjuds)", input: { consumption: { annualKWh: 400000, profile: "office" }, production: { annualKWh: 300000, kWp: 300, inverterAcKw: 250 }, site: { mainFuseA: 630 }, battery: { fixedCapacityKWh: 500, fixedPowerKw: 200 }, strategies: { fcrDUp: true, fcrOfferedPowerKw: 250 } } },
  GM11: { label: "Varmepumpsprofil 20 000 kWh", input: { consumption: { annualKWh: 20000, profile: "heat-pump" } } },
  GM12: { label: "Elbilsprofil 18 000 kWh", input: { consumption: { annualKWh: 18000, profile: "ev-night" } } },
};

/**
 * Reference values regenerated after the strategy-conflict audit fixes (F1–F4):
 *  - monthly peak differences are SIGNED, so a month whose peak the battery raised now
 *    lowers `demandCostSavingSek` instead of being clamped to zero;
 *  - the FCR-D up reservation floor is defended against the next hour's self-discharge,
 *    so the readiness is genuinely held and `fcrHeldKw` / `fcrGrossSek` rise;
 *  - all charging nets against free PV surplus before importing.
 * Regenerated again after the engine correction audit. Two intentional output changes:
 *  1. DIAGNOSTIC FIX: grid charging capped by the PEAK-SHAVING threshold is no longer
 *     booked as a connection limitation, so GM03/GM04/GM06 report gridStatus "none";
 *  2. OPTIMISATION: the FCR reservation sweep uses 10 % resolution instead of 25 %, so
 *     GM06 picks 1,8 kW instead of 1,5 kW and its dispatch/economy follow.
 * Regenerated again after the Swedish demand-charge schablon changed from 55 to
 * 30 SEK/kW/month. ONLY `demandCostSavingSek` (scaled by 30/55) and the
 * `totalOperatingBenefitSek` that contains it moved; every physical field, the sizing,
 * the FCR reservation and the FCR revenue are unchanged.
 */
const EXPECTED = {
  "GM01": {
    "capacityKWh": 15,
    "powerKw": 3,
    "physicalPowerNeedKw": 2.5,
    "importBeforeKWh": 7126.1765,
    "importAfterKWh": 4876.0325,
    "exportBeforeKWh": 9126.1765,
    "exportAfterKWh": 6444.4824,
    "shiftedToLoadKWh": 2364.4067,
    "recoveredCurtailmentKWh": 0,
    "cycles": 175.1412,
    "utilisationPct": 47.9839,
    "peakBeforeKw": 5.5338,
    "peakAfterKw": 5.5538,
    "gridStatus": "none",
    "unservedKWh": 0,
    "peakReductionKw": -0.02,
    "demandCostSavingSek": 275.46,
    "fcrEnabled": false,
    "fcrOfferedKw": 0,
    "fcrHeldKw": 0,
    "fcrGrossSek": null,
    "fcrOptimisedKw": null,
    "energyBenefitSek": 1766.2,
    "totalOperatingBenefitSek": 2041.66,
    "balanceOk": true,
    "residualKWh": 0
  },
  "GM02": {
    "capacityKWh": 0,
    "powerKw": 0,
    "physicalPowerNeedKw": 0,
    "importBeforeKWh": 10000,
    "importAfterKWh": 10000,
    "exportBeforeKWh": 0,
    "exportAfterKWh": 0,
    "shiftedToLoadKWh": 0,
    "recoveredCurtailmentKWh": 0,
    "cycles": 0,
    "utilisationPct": 0,
    "peakBeforeKw": 5.5338,
    "peakAfterKw": 5.5338,
    "gridStatus": "none",
    "unservedKWh": 0,
    "peakReductionKw": 0,
    "demandCostSavingSek": 0,
    "fcrEnabled": false,
    "fcrOfferedKw": 0,
    "fcrHeldKw": 0,
    "fcrGrossSek": null,
    "fcrOptimisedKw": null,
    "energyBenefitSek": 0,
    "totalOperatingBenefitSek": 0,
    "balanceOk": true,
    "residualKWh": 0
  },
  "GM03": {
    "capacityKWh": 5,
    "powerKw": 3,
    "physicalPowerNeedKw": 1,
    "importBeforeKWh": 10000,
    "importAfterKWh": 10186.4268,
    "exportBeforeKWh": 0,
    "exportAfterKWh": 0,
    "shiftedToLoadKWh": 121.8631,
    "recoveredCurtailmentKWh": 0,
    "cycles": 27.0807,
    "utilisationPct": 7.4194,
    "peakBeforeKw": 5.5338,
    "peakAfterKw": 4.4871,
    "gridStatus": "none",
    "unservedKWh": 0,
    "peakReductionKw": 1.0467,
    "demandCostSavingSek": 224.37,
    "fcrEnabled": false,
    "fcrOfferedKw": 0,
    "fcrHeldKw": 0,
    "fcrGrossSek": null,
    "fcrOptimisedKw": null,
    "energyBenefitSek": -279.64,
    "totalOperatingBenefitSek": -55.27,
    "balanceOk": true,
    "residualKWh": 0
  },
  "GM04": {
    "capacityKWh": 15,
    "powerKw": 3,
    "physicalPowerNeedKw": 2.5,
    "importBeforeKWh": 7126.1765,
    "importAfterKWh": 4910.538,
    "exportBeforeKWh": 9126.1765,
    "exportAfterKWh": 6476.5901,
    "shiftedToLoadKWh": 2385.5608,
    "recoveredCurtailmentKWh": 0,
    "cycles": 176.7082,
    "utilisationPct": 48.4132,
    "peakBeforeKw": 5.5338,
    "peakAfterKw": 4.4871,
    "gridStatus": "none",
    "unservedKWh": 0,
    "peakReductionKw": 1.0467,
    "demandCostSavingSek": 385.49,
    "fcrEnabled": false,
    "fcrOfferedKw": 0,
    "fcrHeldKw": 0,
    "fcrGrossSek": null,
    "fcrOptimisedKw": null,
    "energyBenefitSek": 1733.71,
    "totalOperatingBenefitSek": 2119.19,
    "balanceOk": true,
    "residualKWh": 0
  },
  "GM05": {
    "capacityKWh": 15,
    "powerKw": 3,
    "physicalPowerNeedKw": 3,
    "importBeforeKWh": 7126.1765,
    "importAfterKWh": 5064.6084,
    "exportBeforeKWh": 9126.1765,
    "exportAfterKWh": 6651.4159,
    "shiftedToLoadKWh": 2175.9637,
    "recoveredCurtailmentKWh": 0,
    "cycles": 161.1825,
    "utilisationPct": 44.1596,
    "peakBeforeKw": 5.5338,
    "peakAfterKw": 5.5538,
    "gridStatus": "none",
    "unservedKWh": 0,
    "peakReductionKw": -0.02,
    "demandCostSavingSek": 290.35,
    "fcrEnabled": true,
    "fcrOfferedKw": 1.5,
    "fcrHeldKw": 1.5,
    "fcrGrossSek": 901.72,
    "fcrOptimisedKw": null,
    "energyBenefitSek": 1607.5,
    "totalOperatingBenefitSek": 2799.57,
    "balanceOk": true,
    "residualKWh": 0
  },
  "GM06": {
    "capacityKWh": 15,
    "powerKw": 3,
    "physicalPowerNeedKw": 2.5,
    "importBeforeKWh": 7126.1765,
    "importAfterKWh": 5156.2495,
    "exportBeforeKWh": 9126.1765,
    "exportAfterKWh": 6747.7562,
    "shiftedToLoadKWh": 2133.2001,
    "recoveredCurtailmentKWh": 0,
    "cycles": 158.0148,
    "utilisationPct": 43.2917,
    "peakBeforeKw": 5.5338,
    "peakAfterKw": 4.4872,
    "gridStatus": "none",
    "unservedKWh": 0,
    "peakReductionKw": 1.0466,
    "demandCostSavingSek": 371.49,
    "fcrEnabled": true,
    "fcrOfferedKw": 1.8,
    "fcrHeldKw": 1.8,
    "fcrGrossSek": 1082.07,
    "fcrOptimisedKw": 1.8,
    "energyBenefitSek": 1527.84,
    "totalOperatingBenefitSek": 2981.39,
    "balanceOk": true,
    "residualKWh": 0
  },
  "GM07": {
    "capacityKWh": 15,
    "powerKw": 3,
    "physicalPowerNeedKw": 2.5,
    "importBeforeKWh": 7126.1765,
    "importAfterKWh": 4876.0325,
    "exportBeforeKWh": 6218.0423,
    "exportAfterKWh": 4097.5532,
    "shiftedToLoadKWh": 2364.4067,
    "recoveredCurtailmentKWh": 479.7905,
    "cycles": 175.1412,
    "utilisationPct": 47.9839,
    "peakBeforeKw": 5.5338,
    "peakAfterKw": 5.5538,
    "gridStatus": "export-limited",
    "unservedKWh": 0,
    "peakReductionKw": -0.02,
    "demandCostSavingSek": 275.46,
    "fcrEnabled": false,
    "fcrOfferedKw": 0,
    "fcrHeldKw": 0,
    "fcrGrossSek": null,
    "fcrOptimisedKw": null,
    "energyBenefitSek": 2102.92,
    "totalOperatingBenefitSek": 2378.38,
    "balanceOk": true,
    "residualKWh": 0
  },
  "GM08": {
    "capacityKWh": 0,
    "powerKw": 0,
    "physicalPowerNeedKw": 0,
    "importBeforeKWh": 18836.3749,
    "importAfterKWh": 18836.3749,
    "exportBeforeKWh": 0,
    "exportAfterKWh": 0,
    "shiftedToLoadKWh": 0,
    "recoveredCurtailmentKWh": 0,
    "cycles": 0,
    "utilisationPct": 0,
    "peakBeforeKw": 3.6,
    "peakAfterKw": 3.6,
    "gridStatus": "battery-limited",
    "unservedKWh": 6163.6251,
    "peakReductionKw": 0,
    "demandCostSavingSek": 0,
    "fcrEnabled": false,
    "fcrOfferedKw": 0,
    "fcrHeldKw": 0,
    "fcrGrossSek": null,
    "fcrOptimisedKw": null,
    "energyBenefitSek": 0,
    "totalOperatingBenefitSek": 0,
    "balanceOk": true,
    "residualKWh": 0
  },
  "GM09": {
    "capacityKWh": 200,
    "powerKw": 40,
    "physicalPowerNeedKw": 40,
    "importBeforeKWh": 247069.1937,
    "importAfterKWh": 225509.7474,
    "exportBeforeKWh": 147069.1937,
    "exportAfterKWh": 123010.7274,
    "shiftedToLoadKWh": 21686.4663,
    "recoveredCurtailmentKWh": 0,
    "cycles": 120.4804,
    "utilisationPct": 33.0083,
    "peakBeforeKw": 214.5155,
    "peakAfterKw": 214.5355,
    "gridStatus": "none",
    "unservedKWh": 0,
    "peakReductionKw": -0.02,
    "demandCostSavingSek": 510.37,
    "fcrEnabled": false,
    "fcrOfferedKw": 0,
    "fcrHeldKw": 0,
    "fcrGrossSek": null,
    "fcrOptimisedKw": null,
    "energyBenefitSek": 17904.09,
    "totalOperatingBenefitSek": 18414.46,
    "balanceOk": true,
    "residualKWh": 0
  },
  "GM10": {
    "capacityKWh": 500,
    "powerKw": 200,
    "physicalPowerNeedKw": 0.5,
    "importBeforeKWh": 247069.1937,
    "importAfterKWh": 247196.2137,
    "exportBeforeKWh": 147069.1937,
    "exportAfterKWh": 146732.2261,
    "shiftedToLoadKWh": 0,
    "recoveredCurtailmentKWh": 0,
    "cycles": 0,
    "utilisationPct": 0,
    "peakBeforeKw": 214.5155,
    "peakAfterKw": 214.5355,
    "gridStatus": "none",
    "unservedKWh": 0,
    "peakReductionKw": -0.02,
    "demandCostSavingSek": -7.2,
    "fcrEnabled": true,
    "fcrOfferedKw": 250,
    "fcrHeldKw": 0,
    "fcrGrossSek": 0,
    "fcrOptimisedKw": null,
    "energyBenefitSek": -392.71,
    "totalOperatingBenefitSek": -399.91,
    "balanceOk": true,
    "residualKWh": 0
  },
  "GM11": {
    "capacityKWh": 20,
    "powerKw": 3,
    "physicalPowerNeedKw": 3,
    "importBeforeKWh": 14648.2829,
    "importAfterKWh": 11982.1849,
    "exportBeforeKWh": 6648.6273,
    "exportAfterKWh": 3505.7453,
    "shiftedToLoadKWh": 2793.4539,
    "recoveredCurtailmentKWh": 0,
    "cycles": 155.1919,
    "utilisationPct": 42.5183,
    "peakBeforeKw": 9.9766,
    "peakAfterKw": 9.9766,
    "gridStatus": "none",
    "unservedKWh": 0.3844,
    "peakReductionKw": 0,
    "demandCostSavingSek": 148.6,
    "fcrEnabled": false,
    "fcrOfferedKw": 0,
    "fcrHeldKw": 0,
    "fcrGrossSek": null,
    "fcrOptimisedKw": null,
    "energyBenefitSek": 2113.42,
    "totalOperatingBenefitSek": 2262.02,
    "balanceOk": true,
    "residualKWh": 0
  },
  "GM12": {
    "capacityKWh": 25,
    "powerKw": 5,
    "physicalPowerNeedKw": 3.5,
    "importBeforeKWh": 13967.396,
    "importAfterKWh": 10440.2615,
    "exportBeforeKWh": 7967.396,
    "exportAfterKWh": 3870.6108,
    "shiftedToLoadKWh": 3647.6041,
    "recoveredCurtailmentKWh": 0,
    "cycles": 162.1157,
    "utilisationPct": 44.4153,
    "peakBeforeKw": 9.2524,
    "peakAfterKw": 9.2724,
    "gridStatus": "none",
    "unservedKWh": 0,
    "peakReductionKw": -0.02,
    "demandCostSavingSek": 130.34,
    "fcrEnabled": false,
    "fcrOfferedKw": 0,
    "fcrHeldKw": 0,
    "fcrGrossSek": null,
    "fcrOptimisedKw": null,
    "energyBenefitSek": 2832.63,
    "totalOperatingBenefitSek": 2962.97,
    "balanceOk": true,
    "residualKWh": 0
  }
} as const;

const DISCRETE = ["capacityKWh", "powerKw", "physicalPowerNeedKw", "gridStatus", "fcrEnabled", "fcrOptimisedKw", "balanceOk"] as const;

describe("Golden Master — Battery Engine v1 migration contract", () => {
  for (const [key, def] of Object.entries(CASES)) {
    it(`${key}: ${def.label}`, () => {
      const r = runBatteryEngine(def.input);
      const s = r.summary;
      const actual: Record<string, unknown> = {
        capacityKWh: s.recommendation.capacityKWh,
        powerKw: s.recommendation.powerKw,
        physicalPowerNeedKw: s.recommendation.physicalPowerNeedKw,
        importBeforeKWh: s.energy.importBeforeKWh,
        importAfterKWh: s.energy.importAfterKWh,
        exportBeforeKWh: s.energy.exportBeforeKWh,
        exportAfterKWh: s.energy.exportAfterKWh,
        shiftedToLoadKWh: s.energy.shiftedToLoadKWh,
        recoveredCurtailmentKWh: s.energy.recoveredCurtailmentKWh,
        cycles: s.energy.equivalentFullCycles,
        utilisationPct: s.energy.utilisationPct,
        peakBeforeKw: s.grid.importPeakBeforeKw,
        peakAfterKw: s.grid.importPeakAfterKw,
        gridStatus: s.grid.status,
        unservedKWh: s.grid.unservedLoadKWh,
        peakReductionKw: s.peak.peakReductionKw,
        demandCostSavingSek: s.peak.demandCostSavingSek,
        fcrEnabled: s.fcr.enabled,
        fcrOfferedKw: s.fcr.offeredPowerKw,
        fcrHeldKw: s.fcr.avgHeldPowerKw,
        fcrGrossSek: s.fcr.grossSek,
        fcrOptimisedKw: s.fcr.optimisedPowerKw,
        energyBenefitSek: s.economy.energyBenefitSek,
        totalOperatingBenefitSek: s.economy.totalOperatingBenefitSek,
        balanceOk: s.energyBalance.ok,
        residualKWh: s.energyBalance.residualKWh,
      };
      const exp = EXPECTED[key as keyof typeof EXPECTED] as Record<string, unknown>;
      for (const [field, want] of Object.entries(exp)) {
        const got = actual[field];
        if ((DISCRETE as readonly string[]).includes(field) || typeof want !== "number" || want === null) {
          expect(got, `${key}.${field}`).toEqual(want);
          continue;
        }
        // Reference values are stored rounded: energy/power to 4 decimals, money to 2.
        // The tolerance therefore only covers the stored rounding, nothing else.
        const tol = /Sek$/.test(field) ? 5e-3 : 5e-4;
        expect(Math.abs((got as number) - want), `${key}.${field}`).toBeLessThan(tol);
      }
      // The energy balance must always close, in every golden master.
      expect(s.energyBalance.ok, `${key}.energyBalance`).toBe(true);
      expect(Math.abs(s.energyBalance.residualKWh)).toBeLessThan(1);
      // The engine version travels with the result.
      expect(r.engineVersion).toBe("1.0.0");
      expect(BATTERY_ENGINE_TOLERANCES.discrete).toBe(0);
    });
  }
});
