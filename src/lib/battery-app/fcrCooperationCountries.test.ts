/**
 * BE / FR / CZ / SI — electrical systems, CZK, symmetric FCR slots without fallback.
 */
import { describe, expect, it } from "vitest";
import { t } from "@/i18n";
import {
  COUNTRIES,
  SUPPORTED_COUNTRY_CODES,
  formatMoney,
  getCountry,
  phaseOptions,
  resolvePhaseOption,
  theoreticalGridPowerKw,
} from "@/lib/country-config";
import { formatCurrency, localUnitsPerEur } from "@/lib/currency";
import { normalizeWizardToEngineInput } from "@/lib/battery-app/normalizeWizardToEngineInput";
import { runBatteryApp } from "@/lib/battery-app";
import { customerEconomyFromResult } from "@/lib/battery-app/customerEconomy";
import { ancillaryUnavailableText } from "@/lib/battery-app/ancillaryAvailability";
import {
  PENDING_ANCILLARY_MARKETS,
  fcrPriceSeriesForCountry,
  hasConfiguredAncillaryProducts,
  marketProfileForPriceArea,
  reserveModeForMarket,
} from "@/lib/lab/ancillary";
import {
  expandFourHourBlocksToHourly,
  fcrCooperationSeriesId,
} from "@/lib/lab/ancillary/countryMarkets";
import { reserveCalculationAvailable } from "@/lib/reserve-market";
import { buildReportModel, collectReportText } from "@/lib/report/reportModel";
import { createInitialState, type WizardState } from "@/state/wizard";

const NEW = ["BE", "FR", "CZ", "SI"] as const;
const S3 = Math.sqrt(3);

function caseFor(country: WizardState["grid"]["country"], patch?: (s: WizardState) => void) {
  const s = structuredClone(createInitialState(country));
  s.grid.gridValuesConfirmed = true;
  s.consumption.annualKwh = 20000;
  s.consumption.profileId = "normal";
  s.production.mode = "manual";
  s.production.annualKwh = 10000;
  s.economy.importPrice = 0.3;
  s.strategies.fcrDUp = true;
  patch?.(s);
  return s;
}

const CASES: Array<[(typeof NEW)[number], string, number, number]> = [
  ["BE", "1x230", 1, 230],
  ["BE", "3x230", 3, 230],
  ["BE", "3x400", 3, 400],
  ["FR", "1x230", 1, 230],
  ["FR", "3x400", 3, 400],
  ["CZ", "1x230", 1, 230],
  ["CZ", "3x400", 3, 400],
  ["SI", "1x230", 1, 230],
  ["SI", "3x400", 3, 400],
];

describe("BE/FR/CZ/SI electrical systems", () => {
  it("are supported with currency and locale", () => {
    expect(SUPPORTED_COUNTRY_CODES).toEqual(["SE", "FI", "DK", "DE", "AT", "CH", "BE", "FR", "CZ", "SI"]);
    expect(COUNTRIES.BE.economy.currency).toBe("EUR");
    expect(COUNTRIES.FR.locale).toBe("fr-FR");
    expect(COUNTRIES.CZ.economy.currency).toBe("CZK");
    expect(COUNTRIES.CZ.locale).toBe("cs-CZ");
    expect(COUNTRIES.SI.locale).toBe("sl-SI");
  });

  it("offer exactly the requested connection types", () => {
    expect(phaseOptions("BE").map((o) => o.id).sort()).toEqual(["1x230", "3x230", "3x400"]);
    for (const c of ["FR", "CZ", "SI"] as const)
      expect(phaseOptions(c).map((o) => o.id).sort()).toEqual(["1x230", "3x400"]);
    expect(resolvePhaseOption("FR").id).toBe("1x230");
    expect(resolvePhaseOption("CZ").id).toBe("3x400");
    expect(resolvePhaseOption("SI").id).toBe("3x400");
  });

  it.each(CASES)("%s %s: formula and engine input", (c, id, phases, voltage) => {
    const expected = phases === 1 ? (230 * 25) / 1000 : (S3 * voltage * 25) / 1000;
    expect(theoreticalGridPowerKw(25, c, id)).toBeCloseTo(expected, 6);
    const input = normalizeWizardToEngineInput(
      caseFor(c, (s) => {
        s.grid.connectionId = id;
        s.grid.phases = phases as 1 | 3;
        s.grid.mainFuseA = 25;
      }),
    );
    expect(input.site?.country).toBe(c);
    expect(input.site?.phases).toBe(phases);
    expect(input.site?.voltageV).toBe(voltage);
  });

  it("BE 3x230 is not silently treated as 400 V", () => {
    expect(theoreticalGridPowerKw(40, "BE", "3x230")).toBeCloseTo((S3 * 230 * 40) / 1000, 6);
    expect(theoreticalGridPowerKw(40, "BE", "3x230")).not.toBeCloseTo(theoreticalGridPowerKw(40, "BE", "3x400"), 1);
  });

  it("uses neutral economy, never Swedish values", () => {
    for (const c of NEW) {
      const e = getCountry(c).economy;
      expect([e.importPrice, e.exportPrice, e.demandCharge]).toEqual([0, 0, 0]);
      expect(e.economyVerified).toBe(false);
    }
  });

  it("formats CZK centrally", () => {
    expect(localUnitsPerEur("CZ")).toBeGreaterThan(1);
    expect(formatCurrency(1234, "CZK", { locale: "cs-CZ", digits: 0 })).toMatch(/Kč/);
    expect(formatMoney(1234, "CZ", 0)).toMatch(/Kč/);
  });

  it("names the countries in the UI", () => {
    for (const c of NEW) expect(t(`countries.${c}`)).not.toBe(`countries.${c}`);
  });
});

describe("BE/FR/CZ/SI symmetric FCR, no fallback", () => {
  for (const c of NEW) {
    it(`${c}: symmetric FCR slot with own series id, 0 revenue until imported`, () => {
      expect(reserveModeForMarket(c)).toBe("symmetric");
      const products = PENDING_ANCILLARY_MARKETS[c].products;
      expect(products).toHaveLength(1);
      expect(products[0]!.kind).toBe("FCR");
      expect(products[0]!.direction).toBe("symmetric");
      expect(products[0]!.priceSeriesId).toBe(fcrCooperationSeriesId(c, 2025));
      expect(products[0]!.priceSeriesId).toBe(`FCR_${c}_2025`);
      expect(hasConfiguredAncillaryProducts(c)).toBe(false);
      expect(fcrPriceSeriesForCountry(c)).toBeNull();
      expect(reserveCalculationAvailable(c)).toBe(false);
      expect(marketProfileForPriceArea(c).id).toBe(c);
      expect(marketProfileForPriceArea(c).services).toEqual([]);

      const state = caseFor(c);
      const input = normalizeWizardToEngineInput(state);
      expect(input.site?.country).toBe(c);
      expect(input.strategies?.fcrDUp).toBeFalsy();
      const outcome = runBatteryApp(state);
      if (outcome.status !== "ok") throw new Error(outcome.status);
      const ce = customerEconomyFromResult(outcome.result, state.preferences.customerAncillaryShare);
      expect(ce.ancillaryMarketValueSek).toBe(0);
      expect(ancillaryUnavailableText(c)).toBe(t("ancillary.priceDataNotConfigured", { where: t(`countries.${c}`) }));
    });
  }

  it("series ids are distinct per country", () => {
    expect(new Set(NEW.map((c) => fcrCooperationSeriesId(c, 2025))).size).toBe(4);
  });

  it("expands 4-hour blocks to 8760 hours, keeping each block's price", () => {
    const blocks = [];
    for (let day = 0; day < 365; day++)
      for (let block = 0; block < 6; block++) blocks.push({ day, block, priceEurPerMwH: day * 10 + block });
    const h = expandFourHourBlocksToHourly(blocks);
    expect(h).toHaveLength(8760);
    expect(h.slice(0, 4)).toEqual([0, 0, 0, 0]);
    expect(h[4]).toBe(1);
    expect(h[23]).toBe(5);
    expect(h[24]).toBe(10);
    expect(h[8759]).toBe(3645);
    expect(expandFourHourBlocksToHourly([{ day: 0, block: 0, priceEurPerMwH: 5 }])[4]).toBeNaN();
  });
});

describe("saved cases and reports", () => {
  it("old saved case without connectionId still resolves", () => {
    expect(resolvePhaseOption("FR", 3).id).toBe("3x400");
    expect(resolvePhaseOption("SE", null).id).toBe("3x400");
    expect(resolvePhaseOption("BE", "bogus").id).toBe("3x400");
  });

  it("CZ report shows CZK and BE report shows 3x230 V", () => {
    const report = (st: WizardState) => {
      const outcome = runBatteryApp(st);
      if (outcome.status !== "ok") throw new Error(outcome.status);
      return collectReportText(buildReportModel({
        outcome, language: "en",
        customerEconomy: customerEconomyFromResult(outcome.result, st.preferences.customerAncillaryShare),
        targetPaybackYears: 10, alternatives: [], now: new Date(2026, 9, 1), reportId: "MBD-TEST",
      }));
    };
    const czText = report(caseFor("CZ"));
    expect(czText.join(" ")).toMatch(/Kč/);
    const be = caseFor("BE", (s) => {
      s.grid.connectionId = "3x230";
      s.grid.phases = 3;
    });
    const beText = report(be).join(" ");
    expect(beText).toMatch(/230 V/);
  });
});
