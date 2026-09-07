import type {
  MarketProfile,
  PaymentKind,
  PriceDataset,
  PricePoint,
  PriceResolution,
} from "./types";

/** Days per month, Jan..Dec (no leap year — same convention as the 8760 engine). */
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export interface RawUnit {
  currency: string;
  /** Per-power or per-energy denominator as written in the source. */
  denominator: "MW/h" | "MW" | "kW/h" | "kW" | "MWh" | "kWh";
}

/** Parses a unit string such as "SEK/MW/h" or "EUR/MWh". Returns null if unreadable. */
export function parseUnit(text: string): RawUnit | null {
  const t = text.trim().replace(/\s+/g, "").toUpperCase();
  const m = /^([A-Z]{3})\/(MW\/H|MW|KW\/H|KW|MWH|KWH)$/.exec(t);
  if (!m) return null;
  const map: Record<string, RawUnit["denominator"]> = {
    "MW/H": "MW/h",
    MW: "MW",
    "KW/H": "kW/h",
    KW: "kW",
    MWH: "MWh",
    KWH: "kWh",
  };
  return { currency: m[1]!, denominator: map[m[2]!]! };
}

export const isCapacityUnit = (u: RawUnit) =>
  u.denominator === "MW/h" || u.denominator === "MW" || u.denominator === "kW/h" || u.denominator === "kW";

/**
 * Normalises a price to the engine's internal units:
 *   capacity        → currency per kW and HOUR
 *   activated energy→ currency per kWh
 * Per-MW units are divided by 1000. "SEK/MW" without /h is ambiguous and must be
 * declared by the caller via `hoursInPeriod` (it is treated as per period, so it is
 * divided by the period length to get a per-hour price).
 */
export function normalisePrice(
  value: number,
  unit: RawUnit,
  hoursInPeriod: number,
): { value: number; kind: PaymentKind; warning?: string } {
  const perMw = unit.denominator.startsWith("MW");
  const scaled = perMw ? value / 1000 : value;
  if (unit.denominator === "MWh" || unit.denominator === "kWh") {
    return { value: scaled, kind: "activated-energy" };
  }
  if (unit.denominator === "MW/h" || unit.denominator === "kW/h") {
    return { value: scaled, kind: "capacity" };
  }
  // "/MW" or "/kW" without a time denominator: assumed to be per period.
  return {
    value: hoursInPeriod > 0 ? scaled / hoursInPeriod : 0,
    kind: "capacity",
    warning: `Enheten saknar tidsangivelse (${unit.currency}/${unit.denominator}) — tolkas som ersättning per period och delas med ${hoursInPeriod} timmar.`,
  };
}

/** Hours a period label covers. Supports YYYY-MM, YYYY-MM-DD, YYYY and plain month names. */
export function hoursInPeriod(period: string): { hours: number; resolution: PriceResolution } {
  const p = period.trim();
  if (/^\d{4}-\d{2}-\d{2}T?\d{0,2}/.test(p) && p.length > 10) return { hours: 1, resolution: "hourly" };
  if (/^\d{4}-\d{2}-\d{2}$/.test(p)) return { hours: 24, resolution: "daily" };
  const ym = /^(\d{4})-(\d{1,2})$/.exec(p);
  if (ym) {
    const mi = Math.min(12, Math.max(1, Number(ym[2]))) - 1;
    return { hours: MONTH_DAYS[mi]! * 24, resolution: "monthly" };
  }
  if (/^\d{4}$/.test(p)) return { hours: 8760, resolution: "annual" };
  const names = ["jan", "feb", "mar", "apr", "maj", "may", "jun", "jul", "aug", "sep", "okt", "oct", "nov", "dec"];
  const idx = names.findIndex((n) => p.toLowerCase().startsWith(n));
  if (idx >= 0) {
    const monthIdx = [0, 1, 2, 3, 4, 4, 5, 6, 7, 8, 9, 9, 10, 11][idx]!;
    return { hours: MONTH_DAYS[monthIdx]! * 24, resolution: "monthly" };
  }
  return { hours: 0, resolution: "unknown" };
}

export interface IngestOptions {
  market: MarketProfile;
  /** Unit string that applies to every value, e.g. "SEK/MW/h". */
  unit: string;
  source: string;
  /** Optional per-column unit overrides, keyed by the raw column header. */
  columnUnits?: Record<string, string>;
}

const splitCells = (line: string) =>
  (line.includes("\t") ? line.split("\t") : line.includes(";") ? line.split(";") : line.split(","))
    .map((c) => c.trim());

const toNumber = (cell: string): number | null => {
  const t = cell.replace(/\s|\u00a0/g, "").replace(",", ".");
  if (!t || !/^-?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
};

/**
 * Ingests a pasted table of market prices.
 *
 * Expected shape: first column = period, remaining columns = one service each.
 * Nothing is invented: unknown column headers, unreadable units and unparsable
 * values end up in `unmapped` / `warnings` so they can be reviewed before any
 * revenue is computed.
 */
export function ingestPriceTable(text: string, opts: IngestOptions): PriceDataset {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const warnings: string[] = [];
  const unmapped: string[] = [];
  const points: PricePoint[] = [];

  if (lines.length < 2) {
    return {
      marketId: opts.market.id,
      currency: opts.market.currency,
      resolution: "unknown",
      periodFrom: "",
      periodTo: "",
      points: [],
      source: opts.source,
      unmapped,
      warnings: ["Underlaget innehåller ingen rubrikrad plus datarad."],
    };
  }

  const header = splitCells(lines[0]!);
  const baseUnit = parseUnit(opts.unit);
  if (!baseUnit) warnings.push(`Enheten "${opts.unit}" kunde inte tolkas.`);
  if (baseUnit && baseUnit.currency !== opts.market.currency) {
    warnings.push(
      `Underlagets valuta (${baseUnit.currency}) skiljer sig från marknadens (${opts.market.currency}) — ingen växelkurs tillämpas.`,
    );
  }

  const columnService = header.slice(1).map((h) => {
    const key = opts.market.columnAliases[h.toLowerCase().trim()];
    if (!key) unmapped.push(h);
    return key ?? null;
  });

  const resolutions = new Set<PriceResolution>();
  const periods: string[] = [];

  for (const line of lines.slice(1)) {
    const cells = splitCells(line);
    const period = cells[0] ?? "";
    const { hours, resolution } = hoursInPeriod(period);
    if (resolution === "unknown" || hours === 0) {
      warnings.push(`Perioden "${period}" kunde inte tolkas — raden hoppas över.`);
      continue;
    }
    resolutions.add(resolution);
    periods.push(period);
    cells.slice(1).forEach((cell, i) => {
      const serviceKey = columnService[i];
      if (!serviceKey) return;
      const num = toNumber(cell);
      if (num === null) {
        if (cell) warnings.push(`Värdet "${cell}" (${period}, ${header[i + 1]}) kunde inte tolkas.`);
        return;
      }
      const unit = parseUnit(opts.columnUnits?.[header[i + 1] ?? ""] ?? opts.unit) ?? baseUnit;
      if (!unit) return;
      const norm = normalisePrice(num, unit, hours);
      if (norm.warning && !warnings.includes(norm.warning)) warnings.push(norm.warning);
      points.push({
        serviceKey,
        paymentKind: norm.kind,
        period,
        value: norm.value,
        hoursInPeriod: hours,
      });
    });
  }

  if (resolutions.size > 1) warnings.push("Underlaget blandar flera tidsupplösningar.");
  const resolution: PriceResolution = resolutions.size === 1 ? [...resolutions][0]! : "unknown";
  const sorted = [...periods].sort();

  return {
    marketId: opts.market.id,
    currency: baseUnit?.currency ?? opts.market.currency,
    resolution,
    periodFrom: sorted[0] ?? "",
    periodTo: sorted[sorted.length - 1] ?? "",
    points,
    source: opts.source,
    unmapped,
    warnings,
  };
}
