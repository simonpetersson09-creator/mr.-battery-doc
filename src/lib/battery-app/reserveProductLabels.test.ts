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

  it("G: no route hardcodes a product name", () => {
    expect(resultatSource).not.toContain('"Stödtjänster – FCR-D upp"');
    expect(batteriSource).not.toContain('"Stödtjänster – FCR-D upp"');
    expect(resultatSource).toContain("reserveProductLabel");
    expect(batteriSource).toContain("reserveProductLabel");
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

  it("H+I+J: the market-value note is tied to the ancillary row and changes no number", () => {
    // The note lives inside the same conditional block as the ancillary benefit row.
    const block = resultatSource.slice(
      resultatSource.indexOf("Stödtjänster – ${productLabel}"),
      resultatSource.indexOf("Stödtjänster – ${productLabel}") + 1200,
    );
    expect(block).toContain("Beräknat marknadsvärde");
    expect(block).toContain("aggregator, balansansvarig");
    expect(block).toContain("avtal, marknadstillträde");
    expect(block).toContain("moneyPerYear(s.fcr.grossSek)");
    // No fee/percentage is ever subtracted from the engine figure.
    expect(block).not.toMatch(/0\.\d+\s*\*\s*s\.fcr/);
    // J: nothing outside `s.fcr.enabled` prints the note.
    expect(resultatSource.indexOf("aggregator, balansansvarig")).toBeGreaterThan(
      resultatSource.indexOf("s.fcr.enabled ?"),
    );
  });
});
