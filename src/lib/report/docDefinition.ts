/**
 * REPORT RENDERER — turns the ReportModel content tree into a pdfmake document.
 *
 * Layout and typography only. It never reads the engine, never formats a number and
 * never decides what to show; every string it prints already exists in the model.
 */

import type { ReportBlock, ReportModel, SourceTag } from "./reportModel";

/** Mr. Battery Doc surface palette, matched to the app. */
export const REPORT_COLORS = {
  page: "#FCFBF7",
  primary: "#FFDC38",
  secondary: "#FFF0AE",
  detail: "#FFE879",
  text: "#323232",
  muted: "#6B6B63",
  line: "#E6E2D6",
};

/** Roboto (pdfmake default font) has no U+2192, so use a Latin-1 glyph instead. */
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

const MARGIN_X = 42;

type Node = Record<string, unknown>;

function sourceLabel(model: ReportModel, tag: SourceTag | undefined): string {
  if (!tag) return "";
  return model.copy.source[tag];
}

function cards(items: { label: string; value: string }[]): Node {
  return {
    table: {
      widths: items.map(() => "*"),
      body: [
        items.map((item) => ({
          stack: [
            { text: item.label, fontSize: 8, color: REPORT_COLORS.muted },
            { text: item.value, fontSize: 13, bold: true, margin: [0, 3, 0, 0] },
          ],
          fillColor: REPORT_COLORS.primary,
          margin: [8, 8, 8, 8],
        })),
      ],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 4,
      vLineColor: () => REPORT_COLORS.page,
paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
    margin: [0, 0, 0, 12],
  };
}

function rowsTable(model: ReportModel, block: Extract<ReportBlock, { kind: "rows" }>): Node {
  const showSource = block.rows.some((r) => r.source);
  const widths = showSource ? ["*", "auto", 78] : ["*", "auto"];
  return {
    table: {
      widths,
      body: block.rows.map((row) => {
        const label: Node = {
          stack: [
            { text: row.label, fontSize: 9.5 },
            ...(row.hint
              ? [{ text: row.hint, fontSize: 8, color: REPORT_COLORS.muted, margin: [0, 1, 0, 0] }]
              : []),
          ],
        };
        const value: Node = { text: row.value, fontSize: 9.5, bold: true, alignment: "right" };
        const src: Node = {
          text: sourceLabel(model, row.source),
          fontSize: 7.5,
          color: REPORT_COLORS.muted,
          alignment: "right",
        };
        return showSource ? [label, value, src] : [label, value];
      }),
    },
    layout: {
      hLineWidth: (i: number, node: { table: { body: unknown[] } }) =>
        i === 0 || i === node.table.body.length ? 0 : 0.5,
      vLineWidth: () => 0,
      hLineColor: () => REPORT_COLORS.line,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 5,
      paddingBottom: () => 5,
    },
    margin: [0, 0, 0, 10],
  };
}

function beforeAfter(
  model: ReportModel,
  block: Extract<ReportBlock, { kind: "beforeAfter" }>,
): Node {
  return {
    table: {
      widths: ["*", "auto", 12, "auto"],
      body: [
        [
          { text: "", fontSize: 8 },
          { text: model.copy.before, fontSize: 7.5, color: REPORT_COLORS.muted, alignment: "right" },
          { text: "", fontSize: 8 },
          { text: model.copy.after, fontSize: 7.5, color: REPORT_COLORS.muted, alignment: "right" },
        ],
        ...block.rows.map((row) => [
          { text: row.label, fontSize: 9.5 },
          { text: row.before, fontSize: 9.5, color: REPORT_COLORS.muted, alignment: "right" },
          { text: ARROW, fontSize: 9, color: REPORT_COLORS.muted, alignment: "center" },
          { text: row.after, fontSize: 9.5, bold: true, alignment: "right" },
        ]),
      ],
    },
    layout: {
      hLineWidth: (i: number) => (i <= 1 ? 0 : 0.5),
      vLineWidth: () => 0,
      hLineColor: () => REPORT_COLORS.line,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 5,
      paddingBottom: () => 5,
    },
    margin: [0, 0, 0, 10],
  };
}

function alternatives(block: Extract<ReportBlock, { kind: "alternatives" }>): Node {
  return {
    table: {
      widths: block.items.map(() => "*"),
      body: [
        block.items.map((item) => ({
          stack: [
            {
              text: item.label,
              fontSize: 8,
              bold: true,
              alignment: "center",
              color: REPORT_COLORS.text,
            },
            { text: item.capacity, fontSize: 13, bold: true, alignment: "center", margin: [0, 4, 0, 0] },
            { text: item.power, fontSize: 9, alignment: "center", color: REPORT_COLORS.muted },
            { text: item.benefit, fontSize: 9.5, bold: true, alignment: "center", margin: [0, 4, 0, 0] },
          ],
          fillColor: item.highlight ? REPORT_COLORS.primary : REPORT_COLORS.secondary,
          margin: [6, 8, 6, 8],
        })),
      ],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 4,
      vLineColor: () => REPORT_COLORS.page,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
    margin: [0, 0, 0, 12],
  };
}

function hero(block: Extract<ReportBlock, { kind: "hero" }>): Node {
  return {
    table: {
      widths: ["*"],
      body: [
        [
          {
            stack: [
              { text: block.label, fontSize: 8.5, alignment: "center", color: REPORT_COLORS.text },
              { text: block.value, fontSize: 22, bold: true, alignment: "center", margin: [0, 4, 0, 0] },
            ],
            fillColor: REPORT_COLORS.primary,
            margin: [10, 12, 10, 12],
          },
        ],
      ],
    },
    layout: "noBorders",
    margin: [0, 0, 0, 12],
  };
}

function renderBlock(model: ReportModel, block: ReportBlock): Node {
  switch (block.kind) {
    case "cards":
      return cards(block.items);
    case "rows":
      return rowsTable(model, block);
    case "beforeAfter":
      return beforeAfter(model, block);
    case "alternatives":
      return alternatives(block);
    case "hero":
      return hero(block);
    case "subheading":
      return { text: block.text, fontSize: 10.5, bold: true, margin: [0, 4, 0, 6] };
    case "text":
      return { text: block.text, fontSize: 9.5, lineHeight: 1.35, margin: [0, 0, 0, 8] };
    case "note":
      return {
        text: block.text,
        fontSize: 8,
        color: REPORT_COLORS.muted,
        lineHeight: 1.35,
        margin: [0, 0, 0, 10],
      };
    case "list":
      return {
        ul: block.items,
        fontSize: 9.5,
        lineHeight: 1.35,
        margin: [0, 0, 0, 10],
      };
    case "checklist":
      return {
        stack: block.items.map((item) => ({
          columns: [
            {
              width: 14,
              canvas: [
                {
                  type: "rect",
                  x: 0,
                  y: 1,
                  w: 8,
                  h: 8,
                  lineWidth: 0.8,
                  lineColor: REPORT_COLORS.muted,
                },
              ],
            },
            { text: item, fontSize: 9.5, lineHeight: 1.3 },
          ],
          margin: [0, 0, 0, 6],
        })),
        margin: [0, 0, 0, 8],
      };
    case "faq":
      return {
        stack: block.items.flatMap((item) => [
          { text: item.q, fontSize: 10, bold: true, margin: [0, 6, 0, 2] },
          { text: item.a, fontSize: 9.5, lineHeight: 1.35, color: REPORT_COLORS.text },
        ]),
        margin: [0, 0, 0, 8],
      };
  }
}

/** Full pdfmake document definition for a report model. */
export function buildDocDefinition(model: ReportModel): Record<string, unknown> {
  const content: Node[] = [
    {
      table: {
        widths: ["*"],
        body: [
          [
            {
              stack: [
                { text: model.title, fontSize: 22, bold: true },
                { text: model.brand, fontSize: 11, margin: [0, 2, 0, 0] },
                {
                  text: `${model.copy.created}: ${model.createdISO}`,
                  fontSize: 8.5,
                  color: REPORT_COLORS.text,
                  margin: [0, 6, 0, 0],
                },
              ],
              fillColor: REPORT_COLORS.primary,
              margin: [14, 16, 14, 16],
            },
          ],
        ],
      },
      layout: "noBorders",
      margin: [0, 0, 0, 16],
    },
  ];

  for (const section of model.sections) {
    if (section.title) {
      content.push({
        text: section.title,
        fontSize: 15,
        bold: true,
        margin: [0, 0, 0, 8],
        ...(section.pageBreak ? { pageBreak: "before" } : {}),
      });
    } else if (section.pageBreak) {
      content.push({ text: "", pageBreak: "before" });
    }
    for (const block of section.blocks) content.push(sanitizeGlyphs(renderBlock(model, block)));
  }

  return {
    pageSize: "A4",
    pageMargins: [MARGIN_X, 40, MARGIN_X, 52],
    background: () => ({
      canvas: [
        { type: "rect", x: 0, y: 0, w: 595.28, h: 841.89, color: REPORT_COLORS.page },
      ],
    }),
    defaultStyle: { fontSize: 9.5, color: REPORT_COLORS.text, lineHeight: 1.25 },
    footer: (currentPage: number, pageCount: number) => ({
      margin: [MARGIN_X, 12, MARGIN_X, 0],
      columns: [
        { text: model.footerText, fontSize: 7.5, color: REPORT_COLORS.muted },
        {
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
