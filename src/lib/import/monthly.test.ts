import { describe, expect, it } from "vitest";
import {
  extractFromText,
  monthIndexOf,
  normaliseSeries,
  parseSwedishNumber,
  reviewState,
  selectSeries,
  type ExtractedSeries,
  type ExtractionPayload,
} from "./monthly";

const CONSUMPTION = [2400, 2000, 1800, 1600, 1400, 1300, 1200, 1300, 1500, 1800, 2200, 2700];
const PRODUCTION = [100, 300, 800, 1400, 1800, 2200, 2300, 2000, 1600, 900, 400, 100];

const series = (over: Partial<ExtractedSeries>): ExtractedSeries => ({
  kind: "consumption",
  label: "Förbrukning",
  unit: "kWh",
  months: CONSUMPTION,
  annualTotalStated: null,
  ...over,
});

describe("month name recognition", () => {
  it("reads Swedish and English month names", () => {
    expect(monthIndexOf("Jan")).toBe(0);
    expect(monthIndexOf("maj")).toBe(4);
    expect(monthIndexOf("Oktober")).toBe(9);
    expect(monthIndexOf("December")).toBe(11);
    expect(monthIndexOf("May")).toBe(4);
    expect(monthIndexOf("October")).toBe(9);
    expect(monthIndexOf("Summa")).toBeNull();
  });
});

describe("Swedish number formats", () => {
  it("handles spaces, commas, dots and units", () => {
    expect(parseSwedishNumber("2 400").value).toBe(2400);
    expect(parseSwedishNumber("2\u00a0400").value).toBe(2400);
    expect(parseSwedishNumber("2400").value).toBe(2400);
    expect(parseSwedishNumber("2 400,5").value).toBe(2400.5);
    expect(parseSwedishNumber("2.400").value).toBe(2400);
    expect(parseSwedishNumber("1.234.567").value).toBe(1234567);
    expect(parseSwedishNumber("2.5").value).toBe(2.5);
    expect(parseSwedishNumber("2 400 kWh").value).toBe(2400);
    expect(parseSwedishNumber("saknas").value).toBeNull();
  });

  it("flags the ambiguous dot-thousands case", () => {
    expect(parseSwedishNumber("2.400").ambiguous).toBe(true);
    expect(parseSwedishNumber("2,5").ambiguous).toBe(false);
  });
});

describe("A. twelve correct consumption months", () => {
  it("normalises to exactly 20 000 kWh", () => {
    const n = normaliseSeries(series({}));
    expect(n.monthsKwh).toEqual(CONSUMPTION);
    expect(n.sumKwh).toBe(20000);
    expect(n.complete).toBe(true);
    expect(n.missingMonths).toEqual([]);
  });
});

describe("B. twelve correct production months", () => {
  it("normalises to exactly 14 000 kWh", () => {
    const n = normaliseSeries(series({ kind: "production", label: "Produktion", months: PRODUCTION }));
    expect(n.monthsKwh).toEqual(PRODUCTION);
    expect(n.sumKwh).toBe(14000);
  });
});

describe("C. both series in the same document", () => {
  const payload: ExtractionPayload = {
    series: [
      series({}),
      series({ kind: "production", label: "Solproduktion", months: PRODUCTION }),
    ],
    selfConsumptionPct: 45,
    notes: [],
  };

  it("picks the consumption series on the consumption page", () => {
    const c = selectSeries(payload, "consumption");
    expect(c.needsChoice).toBe(false);
    expect(c.preselected?.sumKwh).toBe(20000);
  });

  it("picks the production series on the production page", () => {
    const p = selectSeries(payload, "production");
    expect(p.needsChoice).toBe(false);
    expect(p.preselected?.sumKwh).toBe(14000);
  });

  it("never turns the stated self-consumption into an engine value", () => {
    expect(payload.selfConsumptionPct).toBe(45);
    const c = selectSeries(payload, "consumption").preselected;
    expect(Object.keys(c ?? {})).not.toContain("selfConsumptionPct");
  });

  it("asks the user when the classification is uncertain", () => {
    const uncertain: ExtractionPayload = {
      series: [series({ kind: "unknown", label: "Serie A" }), series({ kind: "unknown", label: "Serie B" })],
      selfConsumptionPct: null,
      notes: [],
    };
    expect(selectSeries(uncertain, "consumption").needsChoice).toBe(true);
  });
});

describe("D/E. incomplete extraction", () => {
  it("reports 10 of 12 months without guessing", () => {
    const months = [...CONSUMPTION];
    months[3] = null as unknown as number;
    months[7] = null as unknown as number;
    const n = normaliseSeries(series({ months }));
    expect(n.missingMonths).toEqual([3, 7]);
    expect(n.complete).toBe(false);
    expect(reviewState(n.monthsKwh).ok).toBe(false);
  });

  it("treats a negative value as unreadable", () => {
    const months = [...CONSUMPTION];
    months[5] = -10;
    const n = normaliseSeries(series({ months }));
    expect(n.invalidMonths).toEqual([5]);
    expect(n.monthsKwh[5]).toBeNull();
  });
});

describe("F. MWh input", () => {
  it("converts 1 MWh to 1000 kWh exactly", () => {
    const mwh = CONSUMPTION.map((v) => v / 1000);
    const n = normaliseSeries(series({ unit: "MWh", months: mwh }));
    expect(n.sumKwh).toBeCloseTo(20000, 6);
    expect(n.monthsKwh[0]).toBeCloseTo(2400, 6);
  });
});

describe("G. Swedish thousand separators in a text table", () => {
  const text = `Månad;Förbrukning;Produktion
Jan;2 400;100
Feb;2 000;300
Mar;1 800;800
Apr;1 600;1 400
Maj;1 400;1 800
Jun;1 300;2 200
Jul;1 200;2 300
Aug;1 300;2 000
Sep;1 500;1 600
Okt;1 800;900
Nov;2 200;400
Dec;2 700;100
Egenanvändning av solelen: 45 %`;

  it("reads both labelled series and both totals", () => {
    const payload = extractFromText(text);
    const c = selectSeries(payload, "consumption").preselected;
    const p = selectSeries(payload, "production").preselected;
    expect(c?.sumKwh).toBe(20000);
    expect(p?.sumKwh).toBe(14000);
    expect(payload.selfConsumptionPct).toBe(45);
  });
});

describe("7. stated annual total", () => {
  it("flags a clear mismatch and never changes the numbers", () => {
    const n = normaliseSeries(series({ annualTotalStated: 25000 }));
    expect(n.annualMismatch).toBe(true);
    expect(n.sumKwh).toBe(20000);
  });

  it("accepts a matching annual total", () => {
    expect(normaliseSeries(series({ annualTotalStated: 20000 })).annualMismatch).toBe(false);
  });
});

describe("H/I. user edits", () => {
  it("recomputes the sum when a value is edited before confirmation", () => {
    const edited = [...CONSUMPTION];
    edited[0] = 2500;
    const r = reviewState(edited);
    expect(r.ok).toBe(true);
    expect(r.sumKwh).toBe(20100);
  });

  it("lets a missing month be filled in manually", () => {
    const withGap: (number | null)[] = [...CONSUMPTION];
    withGap[2] = null;
    expect(reviewState(withGap).ok).toBe(false);
    withGap[2] = 1800;
    const fixed = reviewState(withGap);
    expect(fixed.ok).toBe(true);
    expect(fixed.sumKwh).toBe(20000);
  });
});

describe("apply step delivers plain monthly data", () => {
  it("produces exactly the twelve numbers manual entry would produce", () => {
    const imported = reviewState(normaliseSeries(series({})).monthsKwh).values;
    const manual = CONSUMPTION.slice();
    expect(imported).toEqual(manual);
  });
});
