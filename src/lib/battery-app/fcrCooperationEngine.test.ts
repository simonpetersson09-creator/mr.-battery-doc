/**
 * AT/CH/BE/FR/CZ/SI run on the SAME symmetric FCR engine as Germany: own market, own
 * 2025 series, own endurance — everything else is the existing model.
 */
import { describe, expect, it } from "vitest";
import { runBatteryEngine, type BatteryEngineInput } from "@/lib/battery-engine";
import { toLabConfig } from "@/lib/battery-engine/input";
import { SUPPORTED_COUNTRY_CODES } from "@/lib/country-config";
import { normalizeWizardToEngineInput } from "@/lib/battery-app/normalizeWizardToEngineInput";
import { runBatteryApp } from "@/lib/battery-app";
import { customerEconomyFromResult } from "@/lib/battery-app/customerEconomy";
import { ancillaryUnavailableText } from "@/lib/battery-app/ancillaryAvailability";
import {
  ancillaryPlan,
  fcrPriceSeriesForCountry,
  marketProfileForPriceArea,
  reserveModeForMarket,
} from "@/lib/lab/ancillary";
import { DE_MARKET } from "@/lib/lab/ancillary/markets/de";
import { FCR_ENDURANCE_HOURS } from "@/lib/lab/ancillary/countryMarkets";
import { fcrCooperationSeries } from "@/lib/lab/ancillary/prices/fcrCooperation";
import { FCR_SYMMETRIC_DE_2025 } from "@/lib/lab/ancillary/prices";
import { reserveCalculationAvailable, reserveMarketConfig } from "@/lib/reserve-market";
import { createInitialState, type WizardState } from "@/state/wizard";

const SIX = ["AT", "CH", "BE", "FR", "CZ", "SI"] as const;
type C = (typeof SIX)[number];
const ENDURANCE: Record<C, number> = { AT: 0.5, CH: 0.25, BE: 0.4166666667, FR: 0.5, CZ: 0.5, SI: 0.25 };

function engineCase(country: C, fcr: boolean): BatteryEngineInput {
  return {
    site: { voltageV: 400, phases: 3, mainFuseA: 25, country, marketArea: null },
    consumption: { annualKWh: 20000, profile: "normal" },
    production: { enabled: true, annualKWh: 14000, kWp: 14 },
    strategies: { selfConsumption: true, reduceImport: true, peakShaving: true, fcrDUp: fcr, optimiseFcrReservation: fcr },
    economy: {
      importEnergyPriceSekPerKWh: 0.3, exportEnergyValueSekPerKWh: 0.05,
      peakDemandChargeSekPerKwMonth: null, peakTariffSource: "default-estimate", eurSekRate: 1,
    },
    battery: { fixedCapacityKWh: 30, fixedPowerKw: 15 },
  };
}

function wizardCase(country: C, share?: number) {
  const s: WizardState = structuredClone(createInitialState(country));
  s.grid.gridValuesConfirmed = true;
  s.consumption.annualKwh = 20000;
  s.consumption.profileId = "normal";
  s.production.mode = "manual";
  s.production.annualKwh = 10000;
  s.strategies.fcrDUp = true;
  if (share !== undefined) s.preferences.customerAncillaryShare = share;
  return s;
}

const cache = new Map<string, ReturnType<typeof runBatteryEngine>>();
const run = (c: C, fcr: boolean) => {
  const k = `${c}${fcr}`;
  if (!cache.has(k)) cache.set(k, runBatteryEngine(engineCase(c, fcr)));
  return cache.get(k)!;
};

describe("FCR Cooperation countries on the existing symmetric engine", () => {
  it("NL is still absent", () => {
    expect(SUPPORTED_COUNTRY_CODES as readonly string[]).not.toContain("NL");
    expect(fcrPriceSeriesForCountry("NL" as never)).toBeNull();
  });

  for (const c of SIX) {
    describe(c, () => {
      it("FCR toggle reaches the engine; symmetric mode; own market identity", () => {
        const input = normalizeWizardToEngineInput(wizardCase(c));
        expect(input.strategies?.fcrDUp).toBe(true);
        expect(input.strategies?.optimiseFcrReservation).toBe(true);
        expect(reserveModeForMarket(c)).toBe("symmetric");
        const cfg = reserveMarketConfig(c)!;
        expect(cfg).toMatchObject({ country: c, physics: "symmetric", product: "FCR", priceArea: c });
        expect(reserveCalculationAvailable(c)).toBe(true);
        expect(ancillaryUnavailableText(c)).toBeNull();
      });

      it("ancillaryPlan exists and uses the country's endurance + the existing DE model", () => {
        expect(FCR_ENDURANCE_HOURS[c]).toBeCloseTo(ENDURANCE[c], 10);
        const profile = marketProfileForPriceArea(c);
        expect(profile.id).toBe(c);
        expect(profile.services).toHaveLength(DE_MARKET.services.length);
        profile.services.forEach((svc, i) => {
          const de = DE_MARKET.services[i]!;
          expect(svc.requirements.enduranceHours).toBeCloseTo(ENDURANCE[c], 10);
          expect({ ...svc.requirements, enduranceHours: 0 }).toEqual({ ...de.requirements, enduranceHours: 0 });
        });
        const lab = toLabConfig(engineCase(c, true));
        const plan = ancillaryPlan(lab.ancillary);
        expect(plan).not.toBeNull();
        expect(plan!.reserveMode).toBe("symmetric");
      });

      it("uses its own 8760-hour series, never another country's", () => {
        const s = fcrPriceSeriesForCountry(c)!;
        expect(s).toBe(fcrCooperationSeries(c));
        expect(s.pricesEurPerMw).toHaveLength(8760);
        expect(s).not.toBe(FCR_SYMMETRIC_DE_2025);
        for (const o of SIX) if (o !== c) expect(s).not.toBe(fcrPriceSeriesForCountry(o));
      });

      it("reserve is held and changes the dispatch; computeFcrRevenue runs", () => {
        const on = run(c, true);
        const off = run(c, false);
        const reserve = on.diagnostics.reservePhysicalPreview ?? on.diagnostics.simulation.ancillary;
        expect(reserve.reserveMode).toBe("symmetric");
        expect(reserve.priceModel).toBe("ready");
        expect(reserve.physicalHeldPowerAvgKw).toBeGreaterThan(0);
        expect(on.summary.fcr.grossSek).not.toBeNull();
        expect(on.summary.fcr.grossSek as number).toBeGreaterThan(0);
        expect(JSON.stringify(on.diagnostics.simulation.ancillary)).not.toBe(
          JSON.stringify(off.diagnostics.simulation.ancillary),
        );
      });

      it("full app flow gives FCR revenue; the customer-share control scales it", () => {
        const st = wizardCase(c);
        const o = runBatteryApp(st);
        if (o.status !== "ok") throw new Error(o.status);
        const full = customerEconomyFromResult(o.result, 1);
        const half = customerEconomyFromResult(o.result, 0.5);
        expect(full.ancillaryMarketValueSek).toBeGreaterThan(0);
        expect(half.ancillaryMarketValueSek).toBeCloseTo(full.ancillaryMarketValueSek, 6);
        expect(half.ancillaryCustomerValueSek).toBeLessThan(full.ancillaryCustomerValueSek);
      });
    });
  }
});
