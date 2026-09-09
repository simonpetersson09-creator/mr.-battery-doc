/**
 * MONTHLY DATA IMPORT — pure app-layer logic.
 *
 * document/image -> extraction -> THIS MODULE (normalisation + validation)
 * -> review UI -> wizard state -> existing adapter -> Battery Engine.
 *
 * Contains no physics, no economics and nothing the Battery Engine knows about.
 * The engine never sees files, images, OCR or extraction metadata — only the same
 * twelve monthly numbers a user could have typed by hand.
 */

export type SeriesKind = "consumption" | "production" | "unknown";
export type EnergyUnit = "kWh" | "MWh";

/** One raw series as read out of a document, before normalisation. */
export interface ExtractedSeries {
  kind: SeriesKind;
  /** The document's own wording for the series, e.g. "Förbrukning 2024". */
  label: string;
  unit: EnergyUnit;
  /** Twelve slots, Jan..Dec. null = the month could not be read. */
  months: (number | null)[];
  /** Annual figure stated in the document itself, if any (same unit). */
  annualTotalStated: number | null;
}

export interface ExtractionPayload {
  series: ExtractedSeries[];
  /** Informational only — never fed into the engine. */
  selfConsumptionPct: number | null;
  notes: string[];
}

export const MONTH_KEYS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "maj",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "dec",
] as const;

/** Swedish + English month spellings mapped to their 0-based index. */
const MONTH_ALIASES: Record<string, number> = {};
{
  const table: string[][] = [
    ["jan", "januari", "january"],
    ["feb", "februari", "february"],
    ["mar", "mars", "march"],
    ["apr", "april"],
    ["maj", "may"],
    ["jun", "juni", "june"],
    ["jul", "juli", "july"],
    ["aug", "augusti", "august"],
    ["sep", "sept", "september"],
    ["okt", "oktober", "oct", "october"],
    ["nov", "november"],
    ["dec", "december"],
  ];
  table.forEach((names, i) => {
    for (const n of names) MONTH_ALIASES[n] = i;
  });
}

/** Month index for a word, or null when the word is not a month name. */
export function monthIndexOf(word: string): number | null {
  const key = word
    .toLowerCase()
    .replace(/[^a-zåäö]/g, "")
    .trim();
  if (!key) return null;
  const hit = MONTH_ALIASES[key];
  return hit === undefined ? null : hit;
}

export interface ParsedNumber {
  value: number | null;
  /** True when the separator could mean either thousands or decimals. */
  ambiguous: boolean;
}

/**
 * Swedish-first number parsing.
 *  "2 400" / "2 400" / "2400" -> 2400
 *  "2 400,5"                   -> 2400.5   (comma = decimal)
 *  "2.400"                     -> 2400     (dot + exactly 3 digits = thousands, flagged)
 *  "2.5"                       -> 2.5      (dot = decimal)
 *  "1.234.567"                 -> 1234567
 */
export function parseSwedishNumber(raw: string): ParsedNumber {
  if (raw === null || raw === undefined) return { value: null, ambiguous: false };
  let s = String(raw)
    .replace(/[\u00a0\u202f\u2009]/g, " ")
    .replace(/(kwh|mwh|kw|per\s*år|\/år)/gi, "")
    .trim();
  s = s.replace(/\s+/g, "");
  if (!s) return { value: null, ambiguous: false };
  if (!/^-?[\d.,]+$/.test(s)) return { value: null, ambiguous: false };

  const hasDot = s.includes(".");
  const hasComma = s.includes(",");
  let ambiguous = false;

  if (hasDot && hasComma) {
    // Dot = thousands, comma = decimal (Swedish/European).
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    const parts = s.split(",");
    if (parts.length > 2) s = s.replace(/,/g, "");
    else s = s.replace(",", ".");
  } else if (hasDot) {
    const parts = s.split(".");
    const last = parts[parts.length - 1] ?? "";
    if (parts.length > 2 || last.length === 3) {
      // 2.400 or 1.234.567 -> Swedish thousands grouping.
      s = parts.join("");
      if (parts.length === 2) ambiguous = true;
    }
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return { value: null, ambiguous: false };
  return { value: n, ambiguous };
}

/** MWh -> kWh. Never rounds. */
export function toKwh(value: number | null, unit: EnergyUnit): number | null {
  if (value === null) return null;
  return unit === "MWh" ? value * 1000 : value;
}

export interface NormalisedSeries {
  kind: SeriesKind;
  label: string;
  /** Twelve values in kWh, Jan..Dec. null = missing. */
  monthsKwh: (number | null)[];
  /** Sum of the readable months, kWh. */
  sumKwh: number;
  /** The document's own annual figure converted to kWh, if stated. */
  statedAnnualKwh: number | null;
  missingMonths: number[];
  /** Values that are negative or non-numeric were dropped and listed here. */
  invalidMonths: number[];
  complete: boolean;
  /** Stated annual differs from the month sum by more than 2 %. */
  annualMismatch: boolean;
}

export function normaliseSeries(series: ExtractedSeries): NormalisedSeries {
  const monthsKwh: (number | null)[] = [];
  const missingMonths: number[] = [];
  const invalidMonths: number[] = [];

  for (let i = 0; i < 12; i++) {
    const raw = series.months[i] ?? null;
    const v = toKwh(raw, series.unit);
    if (v === null || !Number.isFinite(v)) {
      monthsKwh.push(null);
      missingMonths.push(i);
      continue;
    }
    if (v < 0) {
      monthsKwh.push(null);
      invalidMonths.push(i);
      missingMonths.push(i);
      continue;
    }
    monthsKwh.push(v);
  }

  const sumKwh = monthsKwh.reduce<number>((a, b) => a + (b ?? 0), 0);
  const statedAnnualKwh = toKwh(series.annualTotalStated, series.unit);
  const complete = missingMonths.length === 0;
  const annualMismatch =
    complete &&
    statedAnnualKwh !== null &&
    statedAnnualKwh > 0 &&
    Math.abs(statedAnnualKwh - sumKwh) / statedAnnualKwh > 0.02;

  return {
    kind: series.kind,
    label: series.label,
    monthsKwh,
    sumKwh,
    statedAnnualKwh,
    missingMonths,
    invalidMonths,
    complete,
    annualMismatch,
  };
}

export interface SeriesChoice {
  /** Series that match the page the user is on. */
  matching: NormalisedSeries[];
  /** All series in the document, normalised. */
  all: NormalisedSeries[];
  /** The one series to preselect, or null when the user must choose. */
  preselected: NormalisedSeries | null;
  needsChoice: boolean;
}

/** Picks the series for the page the user is on. Never guesses silently. */
export function selectSeries(payload: ExtractionPayload, want: SeriesKind): SeriesChoice {
  const all = payload.series.map(normaliseSeries);
  const matching = all.filter((s) => s.kind === want);

  if (matching.length === 1) {
    return { matching, all, preselected: matching[0] ?? null, needsChoice: false };
  }
  if (matching.length === 0 && all.length === 1) {
    const only = all[0] ?? null;
    // A single unlabelled series may be used, but the user still confirms it.
    return { matching: [], all, preselected: only, needsChoice: only?.kind === "unknown" ? false : true };
  }
  return { matching, all, preselected: null, needsChoice: all.length > 0 };
}

/* ------------------------- Text / CSV extraction ------------------------- */

const CONSUMPTION_WORDS = /(förbruk|forbruk|konsum|användning|anvandning|inköpt|import|consumption|usage)/i;
const PRODUCTION_WORDS = /(produkt|solel|solprod|generation|produced|pv)/i;

function kindOfLabel(label: string): SeriesKind {
  if (PRODUCTION_WORDS.test(label)) return "production";
  if (CONSUMPTION_WORDS.test(label)) return "consumption";
  return "unknown";
}

/** Splits one text line into cells for both delimited and whitespace tables. */
function splitCells(line: string): string[] {
  return line
    .split(/[;\t|]|,(?=\s*[A-Za-zÅÄÖåäö])|\s{2,}/)
    .map((c) => c.trim())
    .filter((c, i, arr) => !(c === "" && i === arr.length - 1));
}

/** Unit for one column: an explicit MWh in the header wins over the document default. */
function unitOfLabel(label: string, fallback: EnergyUnit): EnergyUnit {
  if (/\bMWh\b/i.test(label)) return "MWh";
  if (/\bkWh\b/i.test(label)) return "kWh";
  return fallback;
}

/**
 * Column-oriented layout: month names on one row, one series per following row.
 *   Månad;jan;feb;...;dec
 *   Förbrukning;2400;2000;...
 */
function extractTransposed(lines: string[], fallbackUnit: EnergyUnit): ExtractedSeries[] {
  for (let h = 0; h < lines.length; h++) {
    const header = splitCells(lines[h] ?? "");
    const monthAt = header.map((c) => monthIndexOf(c.split(/\s+/)[0] ?? ""));
    if (monthAt.filter((m) => m !== null).length < 6) continue;

    const series: ExtractedSeries[] = [];
    for (let r = h + 1; r < lines.length; r++) {
      const cells = splitCells(lines[r] ?? "");
      if (cells.length < 2) continue;
      const label = cells[0] ?? `Rad ${r}`;
      if (monthIndexOf(label.split(/\s+/)[0] ?? "") !== null) continue;
      const months: (number | null)[] = Array(12).fill(null);
      let seen = 0;
      for (let c = 1; c < cells.length; c++) {
        const mi = monthAt[c];
        if (mi === null || mi === undefined) continue;
        const parsed = parseSwedishNumber(cells[c] ?? "");
        if (parsed.value === null) continue;
        months[mi] = parsed.value;
        seen++;
      }
      if (seen === 0) continue;
      series.push({
        kind: kindOfLabel(label),
        label,
        unit: unitOfLabel(label, fallbackUnit),
        months,
        annualTotalStated: null,
      });
    }
    if (series.length > 0) return series;
  }
  return [];
}

/**
 * Extracts monthly series from plain text (CSV, TSV, pasted tables, PDF text).
 * Handles both row-oriented tables (one month per line) and column-oriented
 * tables (month names in a header row).
 */
export function extractFromText(text: string): ExtractionPayload {
  const notes: string[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  const unit: EnergyUnit = /\bMWh\b/i.test(text) && !/\bkWh\b/i.test(text) ? "MWh" : "kWh";
  const selfMatch = /egenanvändning[^0-9]{0,30}(\d{1,3})\s*%/i.exec(text);
  const selfConsumptionPct = selfMatch ? Number(selfMatch[1]) : null;

  // Column labels come from the first line that has no month name in it.
  let headers: string[] = [];
  const rows: { month: number; cells: string[] }[] = [];

  for (const line of lines) {
    const cells = splitCells(line);
    const first = cells[0] ?? "";
    const mi = monthIndexOf(first.split(/\s+/)[0] ?? "");
    if (mi === null) {
      if (headers.length === 0 && cells.length > 1) headers = cells;
      continue;
    }
    rows.push({ month: mi, cells: cells.slice(1) });
  }

  if (rows.length === 0) {
    const transposed = extractTransposed(lines, unit);
    if (transposed.length > 0) return { series: transposed, selfConsumptionPct, notes };
    return { series: [], selfConsumptionPct, notes: ["Inga månadsrader hittades."] };
  }

  const columnCount = Math.max(...rows.map((r) => r.cells.length));
  const series: ExtractedSeries[] = [];

  for (let c = 0; c < columnCount; c++) {
    const label = headers[c + 1] ?? headers[c] ?? `Kolumn ${c + 1}`;
    const months: (number | null)[] = Array(12).fill(null);
    let seen = 0;
    let duplicate = false;
    for (const row of rows) {
      const parsed = parseSwedishNumber(row.cells[c] ?? "");
      if (parsed.value === null) continue;
      if (months[row.month] !== null) duplicate = true;
      months[row.month] = parsed.value;
      seen++;
      if (parsed.ambiguous) notes.push(`Talformatet i ${MONTH_KEYS[row.month]} kan tolkas på flera sätt — kontrollera värdet.`);
    }
    if (duplicate) notes.push("Dokumentet innehåller flera värden för samma månad — kontrollera värdena.");
    if (seen === 0) continue;
    series.push({
      kind: kindOfLabel(label),
      label,
      unit: unitOfLabel(label, unit),
      months,
      annualTotalStated: null,
    });
  }

  return { series, selfConsumptionPct, notes };
}


/* --------------------------- Review-step helpers -------------------------- */

export interface ReviewState {
  values: (number | null)[];
  sumKwh: number;
  missing: number[];
  ok: boolean;
}

/** Validation for the review step: exactly 12 numeric values >= 0, Jan..Dec. */
export function reviewState(values: (number | null)[]): ReviewState {
  const missing: number[] = [];
  for (let i = 0; i < 12; i++) {
    const v = values[i];
    if (v === null || v === undefined || !Number.isFinite(v) || v < 0) missing.push(i);
  }
  const sumKwh = values.reduce<number>(
    (a, b) => a + (b !== null && b !== undefined && Number.isFinite(b) && b >= 0 ? b : 0),
    0,
  );
  return { values: values.slice(0, 12), sumKwh, missing, ok: missing.length === 0 };
}

export function missingMonthsMessage(missing: number[]): string | null {
  if (missing.length === 0) return null;
  const read = 12 - missing.length;
  return `Vi kunde läsa ${read} av 12 månader. Kontrollera eller fyll i de saknade värdena.`;
}
