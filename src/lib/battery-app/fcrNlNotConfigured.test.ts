/**
 * NL FCR 2025 stays NOT CONFIGURED (ambiguous tender 1/2 on 2025-10-28/29) while NL
 * remains a fully supported country. The six imported datasets stay byte-identical.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { t } from "@/i18n";
import { COUNTRIES, SUPPORTED_COUNTRY_CODES, phaseOptions } from "@/lib/country-config";
import { normalizeWizardToEngineInput } from "@/lib/battery-app/normalizeWizardToEngineInput";
import { runBatteryApp } from "@/lib/battery-app";
import { customerEconomyFromResult } from "@/lib/battery-app/customerEconomy";
import { ancillaryUnavailableText } from "@/lib/battery-app/ancillaryAvailability";
import {
  fcrPriceSeriesForCountry,
  hasConfiguredAncillaryProducts,
  marketProfileForPriceArea,
} from "@/lib/lab/ancillary";
import {
  fcrCooperationSeries,
  fcrCooperationSeriesById,
} from "@/lib/lab/ancillary/prices/fcrCooperation";
import { reserveCalculationAvailable } from "@/lib/reserve-market";
import { createInitialState } from "@/state/wizard";

const SIX = ["AT", "CH", "BE", "FR", "CZ", "SI"] as const;

/** md5 of the generated source files at the time of the FCR 2025 import. */
const SOURCE_MD5: Record<(typeof SIX)[number], string> = {
  AT: "b6f4b72471c5ad05e857703fc182467b",
  BE: "88858e7e8658dc4e4979ef8720704c35",
  CH: "6b5faf430b68c3ee37abb1dbce2d31f8",
  CZ: "060ef83152eb8851c63628380443f057",
  FR: "03ed310cb9f335eccb159bbe08af6fca",
  SI: "b90ac99ba8ccfc3344fb34290b687c7e",
};

describe("NL: country supported, FCR 2025 not configured", () => {
  it("NL stays selectable with EUR, Dutch locale and 1x230/3x400", () => {
    expect(SUPPORTED_COUNTRY_CODES).toContain("NL");
    expect(COUNTRIES.NL.economy.currency).toBe("EUR");
    expect(COUNTRIES.NL.locale).toBe("nl-NL");
    expect(phaseOptions("NL").map((o) => o.id).sort()).toEqual(["1x230", "3x400"]);
  });

  it("has no usable FCR 2025 series and no fallback", () => {
    expect(fcrCooperationSeries("NL")).toBeNull();
    expect(fcrCooperationSeriesById("FCR_NL_2025")).toBeNull();
    expect(fcrPriceSeriesForCountry("NL")).toBeNull();
    expect(hasConfiguredAncillaryProducts("NL")).toBe(false);
    expect(reserveCalculationAvailable("NL")).toBe(false);
    const profile = marketProfileForPriceArea("NL");
    expect(profile.id).toBe("NL");
    expect(profile.services).toEqual([]);
  });

  it("FCR on in NL gives a working calculation with 0 FCR revenue and a not-configured notice", () => {
    const s = structuredClone(createInitialState("NL"));
    s.grid.gridValuesConfirmed = true;
    s.consumption.annualKwh = 20000;
    s.consumption.profileId = "normal";
    s.production.mode = "manual";
    s.production.annualKwh = 10000;
    s.strategies.fcrDUp = true;
    expect(normalizeWizardToEngineInput(s).strategies?.fcrDUp).toBeFalsy();
    const outcome = runBatteryApp(s);
    if (outcome.status !== "ok") throw new Error(outcome.status);
    const ce = customerEconomyFromResult(outcome.result, s.preferences.customerAncillaryShare);
    expect(ce.ancillaryMarketValueSek).toBe(0);
    expect(ancillaryUnavailableText("NL")).toBe(
      t("ancillary.priceDataNotConfigured", { where: t("countries.NL") }),
    );
  });
});

describe("six retained FCR 2025 imports", () => {
  for (const c of SIX) {
    it(`${c}: source file byte-identical and series is its own`, () => {
      const file = resolve(__dirname, `../lab/ancillary/prices/fcrCoop${c}2025.ts`);
      expect(createHash("md5").update(readFileSync(file)).digest("hex")).toBe(SOURCE_MD5[c]);
      const s = fcrCooperationSeries(c)!;
      expect(s.market).toBe(`FCR Cooperation ${c}`);
      expect(s.pricesEurPerMw).toHaveLength(8760);
      // revenue still disabled
      expect(fcrPriceSeriesForCountry(c)).toBeNull();
      expect(reserveCalculationAvailable(c)).toBe(false);
    });
  }
});
