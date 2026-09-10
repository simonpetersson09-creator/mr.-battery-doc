/**
 * REPORT RENDERER — turns the ReportModel content tree into a pdfmake document.
 *
 * Layout and typography only. It never reads the engine, never formats a number and
 * never decides what to show; every string it prints already exists in the model.
 *
 * The visual language is shared with the Mr. Solar Doc report: full-bleed yellow
 * header band, section titles with a short yellow accent rule, rounded yellow key
 * figure cards, light zebra parameter/value/source tables and a three part footer.
 */

import type { ReportBlock, ReportModel, SourceTag } from "./reportModel";

/** Shared report palette (Mr. Solar Doc / Mr. Battery Doc design system). */
export const REPORT_COLORS = {
  page: "#FFFFFF",
  primary: "#FFDC38",
  secondary: "#FFF0AE",
  detail: "#FFE879",
  zebra: "#F7F6F2",
  text: "#323232",
  muted: "#6E6A6B",
  line: "#E4E2DD",
};

/** Shared spacing scale, in points. */
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 50;
const MARGIN_TOP = 40;
const MARGIN_BOTTOM = 56;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const HEADER_H = 86;
const CARD_GAP = 8;
const CARD_RADIUS = 5;
const ACCENT_W = 58;

/** Roboto (the embedded report font) has no U+2192, so use a Latin-1 glyph instead. */
const ARROW = "\u00BB";

/** Replace glyphs the embedded font cannot render (they would print as empty boxes). */
function sanitizeGlyphs<T>(node: T): T {
  if (typeof node === "string") {
    return node.replace(/[\u2190-\u21FF\u27F0-\u27FF\u2B00-\u2BFF]/gu, ARROW) as unknown as T;
  }
  if (Array.isArray(node)) return node.map(sanitizeGlyphs) as unknown as T;
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      out[k] = typeof v === "function" ? v : sanitizeGlyphs(v);
    }
    return out as unknown as T;
  }
  return node;
}

type Node = Record<string, unknown>;

function sourceLabel(model: ReportModel, tag: SourceTag | undefined): string {
  if (!tag) return "";
  return model.copy.source[tag];
}

/**
 * A row of fixed height rounded cards. pdfmake has no rounded container, so the
 * card surfaces are drawn on a canvas and the text is laid on top with a negative
 * margin. Every card in a row shares one height, exactly like the Solar report.
 */
function cardRow(
  items: { fill?: string; stack: Node[] }[],
  height: number,
  contentHeight: number,
  bottom = 14,
): Node {
  const filler = Math.max(0, height - contentHeight);
  const n = items.length;
  const w = (CONTENT_W - CARD_GAP * (n - 1)) / n;
  return {
    stack: [
      {
        canvas: items.map((item, i) => ({
          type: "rect",
          x: i * (w + CARD_GAP),
          y: 0,
          w,
          h: height,
          r: CARD_RADIUS,
          color: item.fill ?? REPORT_COLORS.primary,
        })),
        margin: [0, 0, 0, -height],
      },
      {
        columns: items.map((item) => ({
          width: w,
          stack: [...item.stack, { text: "", fontSize: 1, margin: [0, filler, 0, 0] }],
          margin: [10, 0, 10, 0],
        })),
        columnGap: CARD_GAP,
      },
    ],
    unbreakable: true,
    margin: [0, 0, 0, bottom],
  };
}

/** Summary key figures: small muted label on top, large value below. */
function cards(items: { label: string; value: string }[]): Node {
  return cardRow(
    items.map((item) => ({
      stack: [
        { text: item.label, fontSize: 8, color: REPORT_COLORS.text, margin: [0, 10, 0, 0] },
        { text: item.value, fontSize: 13, bold: true, margin: [0, 8, 0, 0] },
      ],
    })),
    76,
    46,
  );
}

function rowsTable(model: ReportModel, block: Extract<ReportBlock, { kind: "rows" }>): Node {
  const showSource = block.rows.some((r) => r.source);
  const widths = showSource ? ["*", "auto", 82] : ["*", "auto"];
  return {
    table: {
      widths,
      body: block.rows.map((row) => {
        const label: Node = {
          stack: [
            { text: row.label, fontSize: 9.5 },
            ...(row.hint
              ? [{ text: row.hint, fontSize: 8, color: REPORT_COLORS.muted, margin: [0, 2, 0, 0] }]
              : []),
          ],
        };
        const value: Node = { text: row.value, fontSize: 10, bold: true, alignment: "right" };
        const src: Node = {
          text: sourceLabel(model, row.source),
          fontSize: 7.5,
          color: REPORT_COLORS.muted,
          alignment: "right",
          margin: [0, 1.5, 0, 0],
        };
        return showSource ? [label, value, src] : [label, value];
      }),
    },
    layout: {
      hLineWidth: (i: number, node: { table: { body: unknown[] } }) =>
        i === 0 || i === node.table.body.length ? 0 : 0.5,
      vLineWidth: () => 0,
      hLineColor: () => REPORT_COLORS.line,
      fillColor: (i: number) => (i % 2 === 0 ? REPORT_COLORS.zebra : null),
      paddingLeft: (i: number, node: unknown, col: number) => (col === 0 ? 10 : 0),
      paddingRight: (i: number, node: unknown, col: number, cols: number) =>
        col === cols - 1 ? 10 : 0,
      paddingTop: () => 7,
      paddingBottom: () => 7,
    },
    margin: [0, 0, 0, 12],
  };
}

/** Before/after key figures, shown as cards rather than as an administrative table. */
function beforeAfter(block: Extract<ReportBlock, { kind: "beforeAfter" }>): Node {
  const perRow = 2;
  const groups: (typeof block.rows)[] = [];
  for (let i = 0; i < block.rows.length; i += perRow) {
    groups.push(block.rows.slice(i, i + perRow));
  }
  return {
    stack: groups.map((group, gi) => {
      const padded = [...group];
      while (padded.length < perRow) {
        padded.push({ label: "", before: "", after: "" });
      }
      return cardRow(
        padded.map((row) => ({
          fill: row.label ? REPORT_COLORS.primary : REPORT_COLORS.page,
          stack: row.label
            ? [
                { text: row.label, fontSize: 8, color: REPORT_COLORS.text, margin: [0, 9, 0, 0] },
                {
                  text: [
                    { text: row.before, fontSize: 11 },
                    { text: `  ${ARROW}  `, fontSize: 10, color: REPORT_COLORS.text },
                    { text: row.after, fontSize: 12, bold: true },
                  ],
                  margin: [0, 7, 0, 0],
                },
              ]
            : [{ text: "", fontSize: 8 }],
        })),
        62,
        42,
        gi === groups.length - 1 ? 14 : CARD_GAP,
      );
    }),
    margin: [0, 0, 0, 0],
  };
}

/** Capacity alternatives: three cards, the recommended one on the primary surface. */
function alternatives(block: Extract<ReportBlock, { kind: "alternatives" }>): Node {
  return cardRow(
    block.items.map((item) => ({
      fill: item.highlight ? REPORT_COLORS.primary : REPORT_COLORS.secondary,
      stack: [
        {
          text: item.label,
          fontSize: 8,
          bold: true,
          alignment: "center",
          color: REPORT_COLORS.text,
          margin: [0, 10, 0, 0],
        },
        { text: item.capacity, fontSize: 14, bold: true, alignment: "center", margin: [0, 6, 0, 0] },
        {
          text: item.power,
          fontSize: 8.5,
          alignment: "center",
          color: REPORT_COLORS.text,
          margin: [0, 3, 0, 0],
        },
        { text: item.benefit, fontSize: 10, bold: true, alignment: "center", margin: [0, 5, 0, 0] },
      ],
    })),
    100,
    76,
  );
}

/** One wide, rounded key figure card. */
function hero(block: Extract<ReportBlock, { kind: "hero" }>): Node {
  return cardRow(
    [
      {
        stack: [
          {
            text: block.label,
            fontSize: 9,
            alignment: "center",
            color: REPORT_COLORS.text,
            margin: [0, 14, 0, 0],
          },
          {
            text: block.value,
            fontSize: 22,
            bold: true,
            alignment: "center",
            margin: [0, 6, 0, 0],
          },
        ],
      },
    ],
    80,
    60,
  );
}

/** A soft, light panel used for FAQ entries and callouts. */
function panel(stack: Node[], fill: string, bottom: number): Node {
  return {
    table: { widths: ["*"], body: [[{ stack, fillColor: fill, margin: [12, 11, 12, 11] }]] },
    layout: "noBorders",
    unbreakable: true,
    margin: [0, 0, 0, bottom],
  };
}

function renderBlock(model: ReportModel, block: ReportBlock): Node {
  switch (block.kind) {
    case "cards":
      return cards(block.items);
    case "rows":
      return rowsTable(model, block);
    case "beforeAfter":
      return beforeAfter(block);
    case "alternatives":
      return alternatives(block);
    case "hero":
      return hero(block);
    case "subheading":
      return { text: block.text, fontSize: 10.5, bold: true, margin: [0, 8, 0, 6] };
    case "text":
      return { text: block.text, fontSize: 9.5, lineHeight: 1.4, margin: [0, 0, 0, 10] };
    case "note":
      return {
        text: block.text,
        fontSize: 8.5,
        italics: true,
        color: REPORT_COLORS.muted,
        lineHeight: 1.4,
        margin: [0, 0, 0, 12],
      };
    case "list":
      return {
        ul: block.items,
        fontSize: 9.5,
        lineHeight: 1.4,
        margin: [0, 0, 0, 12],
      };
    case "checklist":
      return {
        stack: block.items.map((item) => ({
          columns: [
            {
              width: 18,
              canvas: [
                {
                  type: "rect",
                  x: 0,
                  y: 1.5,
                  w: 9,
                  h: 9,
                  r: 1.5,
                  lineWidth: 1,
                  lineColor: REPORT_COLORS.primary,
                },
              ],
            },
            { text: item, fontSize: 9.5, lineHeight: 1.35 },
          ],
          margin: [0, 0, 0, 10],
        })),
        margin: [0, 2, 0, 8],
      };
    case "faq":
      return {
        stack: block.items.map((item) =>
          panel(
            [
              { text: item.q, fontSize: 10, bold: true, margin: [0, 0, 0, 5] },
              {
                text: item.a,
                fontSize: 9,
                lineHeight: 1.4,
                color: REPORT_COLORS.muted,
              },
            ],
            REPORT_COLORS.zebra,
            10,
          ),
        ),
        margin: [0, 0, 0, 4],
      };
  }
}

/** Section title with the short yellow accent rule used across the report family. */
function sectionTitle(text: string, first: boolean): Node[] {
  return [
    { text, fontSize: 14, bold: true, margin: [0, first ? 0 : 18, 0, 5] },
    {
      canvas: [{ type: "rect", x: 0, y: 0, w: ACCENT_W, h: 2.5, color: REPORT_COLORS.primary }],
      margin: [0, 0, 0, 12],
    },
  ];
}

/** Full pdfmake document definition for a report model. */
export function buildDocDefinition(model: ReportModel): Record<string, unknown> {
  const content: Node[] = [
    {
      columns: [
        {
          width: "*",
          stack: [
            { text: model.title, fontSize: 22, bold: true },
            { text: model.brand, fontSize: 10, margin: [0, 4, 0, 0] },
          ],
        },
        {
          width: "auto",
          text: `${model.copy.created}: ${model.createdISO}`,
          fontSize: 9,
          alignment: "right",
          margin: [0, 28, 0, 0],
        },
      ],
      margin: [0, 0, 0, 34],
    },
  ];

  let first = true;
  for (const section of model.sections) {
    if (section.title) {
      const [title, rule] = sectionTitle(section.title, first || section.pageBreak);
      content.push({ ...title, ...(section.pageBreak ? { headlineLevel: 1 } : {}) });
      content.push(rule as Node);
      first = false;
    } else if (section.pageBreak) {
      content.push({ text: "", headlineLevel: 1 });
    }
    for (const block of section.blocks) content.push(sanitizeGlyphs(renderBlock(model, block)));
  }

  return {
    pageSize: "A4",
    pageMargins: [MARGIN_X, MARGIN_TOP, MARGIN_X, MARGIN_BOTTOM],
    background: (currentPage: number) => ({
      canvas: [
        { type: "rect", x: 0, y: 0, w: PAGE_W, h: PAGE_H, color: REPORT_COLORS.page },
        ...(currentPage === 1
          ? [
              { type: "rect", x: 0, y: 0, w: PAGE_W, h: HEADER_H, color: REPORT_COLORS.primary },
              {
                type: "rect",
                x: 0,
                y: HEADER_H,
                w: PAGE_W,
                h: 2,
                color: REPORT_COLORS.text,
              },
            ]
          : []),
      ],
    }),
    pageBreakBefore: (currentNode: { headlineLevel?: number; startPosition?: { top: number } }) =>
      currentNode.headlineLevel === 1 && (currentNode.startPosition?.top ?? 0) > MARGIN_TOP + 6,
    defaultStyle: { fontSize: 9.5, color: REPORT_COLORS.text, lineHeight: 1.25 },
    footer: (currentPage: number, pageCount: number) => ({
      margin: [MARGIN_X, 16, MARGIN_X, 0],
      columns: [
        { width: "*", text: model.brand, fontSize: 7.5, color: REPORT_COLORS.muted },
        {
          width: "auto",
          text: model.reportId,
          fontSize: 7.5,
          color: REPORT_COLORS.muted,
          alignment: "center",
        },
        {
          width: "*",
          text: `${currentPage} / ${pageCount}`,
          fontSize: 7.5,
          color: REPORT_COLORS.muted,
          alignment: "right",
        },
      ],
    }),
    info: { title: `${model.title} — ${model.reportId}`, author: model.brand },
    content,
  };
}
