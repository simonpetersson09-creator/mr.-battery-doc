import { describe, expect, it } from "vitest";
import {
  IMPORTANT_INFO_FOOTER,
  IMPORTANT_INFO_POINTS,
  IMPORTANT_INFO_TITLE,
} from "./importantInfo";

describe("important info section copy", () => {
  it("has the required title", () => {
    expect(IMPORTANT_INFO_TITLE).toBe("Viktigt att känna till");
  });

  it("contains exactly the seven information points", () => {
    expect(IMPORTANT_INFO_POINTS).toHaveLength(7);
  });

  it("covers estimate, prices, historical 2025 reserves, aggregator, market access, product variance and installer", () => {
    const all = IMPORTANT_INFO_POINTS.join(" ");
    expect(all).toContain("uppskattning");
    expect(all).toContain("Elpriser och nättariffer");
    expect(all).toContain("2025");
    expect(all).toContain("aggregator");
    expect(all).toContain("inte garanterat");
    expect(all).toContain("degradering");
    expect(all).toContain("elinstallatör");
  });

  it("includes the decision-support footer", () => {
    expect(IMPORTANT_INFO_FOOTER).toContain("beslutsstöd");
    expect(IMPORTANT_INFO_FOOTER).toContain("ersätter inte");
  });

  it("every point is a non-empty scannable string", () => {
    for (const p of IMPORTANT_INFO_POINTS) {
      expect(p.length).toBeGreaterThan(20);
      expect(p.length).toBeLessThan(220);
    }
  });
});
