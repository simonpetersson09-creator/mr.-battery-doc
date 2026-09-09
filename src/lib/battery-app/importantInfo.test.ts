import { describe, expect, it } from "vitest";
import { importantInfoFooter, importantInfoPoints, importantInfoTitle } from "./importantInfo";
import { SUPPORTED_LANGUAGES, i18n } from "@/i18n";

describe("important info section copy", () => {
  it("has the required title", () => {
    expect(importantInfoTitle()).toBe("Viktigt att känna till");
  });

  it("contains exactly the seven information points", () => {
    expect(importantInfoPoints()).toHaveLength(7);
  });

  it("covers estimate, prices, historical 2025 reserves, aggregator, market access, product variance and installer", () => {
    const all = importantInfoPoints().join(" ");
    expect(all).toContain("uppskattning");
    expect(all).toContain("Elpriser och nättariffer");
    expect(all).toContain("2025");
    expect(all).toContain("aggregator");
    expect(all).toContain("inte garanterat");
    expect(all).toContain("degradering");
    expect(all).toContain("elinstallatör");
  });

  it("includes the decision-support footer", () => {
    expect(importantInfoFooter()).toContain("beslutsstöd");
    expect(importantInfoFooter()).toContain("ersätter inte");
  });

  it("every point is a non-empty scannable string", () => {
    for (const p of importantInfoPoints()) {
      expect(p.length).toBeGreaterThan(20);
      expect(p.length).toBeLessThan(260);
    }
  });

  it("is localized in every supported language", async () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      await i18n.changeLanguage(lang);
      expect(importantInfoTitle().length).toBeGreaterThan(3);
      expect(importantInfoPoints()).toHaveLength(7);
      for (const p of importantInfoPoints()) expect(p.length).toBeGreaterThan(20);
      expect(importantInfoFooter().length).toBeGreaterThan(20);
    }
    await i18n.changeLanguage("sv");
  });
});
