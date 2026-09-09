import { sv } from "@/i18n/locales/sv";
import { describe, expect, it } from "vitest";
import { reserveMarketConfig, reserveProductLabel } from "@/lib/reserve-market";
import { buildResultPresentation } from "@/lib/battery-app/resultPresentation";
import { runBatteryEngine } from "@/lib/battery-engine";
import { COUNTRIES } from "@/lib/country-config";
import { localUnitsPerEur } from "@/lib/currency";
import resultatSource from "@/routes/resultat.tsx?raw";
import batteriSource from "@/routes/batteri.tsx?raw";

describe("reserve product labels come from the market config", () => {
  it("D+E: DE and DK1 are FCR", () => {
    expect(reserveProductLabel("DE")).toBe("FCR");
    expect(reserveProductLabel("DK", "DK1")).toBe("FCR");
  });

  it("F: SE, FI and DK2 are FCR-D upp", () => {
    expect(reserveProductLabel("SE")).toBe("FCR-D upp");
    expect(reserveProductLabel("FI")).toBe("FCR-D upp");
    expect(reserveProductLabel("DK", "DK2")).toBe("FCR-D upp");
  });

  it("G: the label always matches the reserve physics of that market", () => {
    for (const [c, a] of [["SE", null], ["FI", null], ["DE", null], ["DK", "DK1"], ["DK", "DK2"]] as const) {
      const cfg = reserveMarketConfig(c, a)!;
      expect(cfg.productLabel).toBe(cfg.physics === "symmetric" ? "FCR" : "FCR-D upp");
    }
    // Denmark without an area picked never shows a Nordic product name.
    expect(reserveProductLabel("DK")).toBe("stödtjänster");
  });

  it("G: no route hardcodes a product name, and Step 4 never shows it", () => {
    expect(resultatSource).not.toContain('"Stödtjänster – FCR-D upp"');
    expect(batteriSource).not.toContain('"Stödtjänster – FCR-D upp"');
    // Technical details on the result page may name the canonical product.
    expect(resultatSource).toContain("reserveProductLabel");
    // Step 4 is customer-facing: it must not render or interpolate any
    // market product name — only the plain "Stödtjänster" copy.
    expect(batteriSource).not.toContain("reserveProductName");
    expect(batteriSource).not.toContain("reserveProductLabel");
    expect(sv.strategies.ancillary.title).toBe("Stödtjänster");
    expect(sv.strategies.ancillary.title).not.toContain("{{product}}");
    expect(sv.strategies.ancillary.description).not.toMatch(/FCR/i);
  });

  it("uses the supplied product name in the power explanation", () => {
    const c = COUNTRIES.DE;
    const result = runBatteryEngine({
      site: { voltageV: 400, phases: 3, mainFuseA: 25, country: "DE", marketArea: null },
      consumption: { annualKWh: 20000, profile: "normal" },
      production: { enabled: true, annualKWh: 14000, kWp: 14 },
      strategies: { selfConsumption: true, reduceImport: true, peakShaving: true, fcrDUp: true, optimiseFcrReservation: true },
      economy: {
        importEnergyPriceSekPerKWh: c.economy.importPrice,
        exportEnergyValueSekPerKWh: c.economy.exportPrice,
        peakDemandChargeSekPerKwMonth: c.economy.demandCharge,
        peakTariffSource: "default-estimate",
        eurSekRate: localUnitsPerEur("DE"),
      },
    } as never);
    const p = buildResultPresentation(result, {
      peakShavingSelected: true,
      demandChargeTouched: false,
      reserveProductLabel: reserveProductLabel("DE"),
    });
    const text = [p.powerWhy ?? "", ...p.sizingMethodLines, ...p.fcrPowerLevels.map((l) => l.label)].join(" ");
    expect(text).not.toContain("FCR-D upp");
  });

  it("H+I+J: the market-value note is tied to the ancillary rows and changes no engine number", () => {
    // The note lives inside the same conditional block as the ancillary rows.
    const anchor = resultatSource.indexOf("results.benefit.ancillaryMarket");
    const block = resultatSource.slice(anchor, anchor + 1400);
    // The MARKET value row is still the untouched engine figure.
    expect(block).toContain("moneyPerYear(ce.ancillaryMarketValueSek)");
    expect(block).toContain("results.benefit.ancillaryNote");
    // No fee/percentage is ever applied to the engine figure inline in the UI.
    expect(block).not.toMatch(/0\.\d+\s*\*\s*s\.fcr/);
    // J: nothing outside `s.fcr.enabled` prints the note.
    expect(resultatSource.indexOf("results.benefit.ancillaryNote")).toBeGreaterThan(
      resultatSource.indexOf("s.fcr.enabled ?"),
    );
    // The customer-facing wording itself is unchanged, now centralized in the locale.
    expect(sv.results.benefit.ancillaryHint).toContain("Beräknat marknadsvärde");
    expect(sv.results.benefit.ancillaryNote).toContain("aggregator, balansansvarig");
    expect(sv.results.benefit.ancillaryNote).toContain("avtal, marknadstillträde");
  });
});

