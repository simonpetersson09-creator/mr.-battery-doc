/**
 * REPORT RENDERER — turns the ReportModel content tree into a pdfmake document.
 *
 * Layout and typography only. It never reads the engine, never formats a number and
 * never decides what to show; every string it prints already exists in the model.
 *
 * Visual language (shared design system for every page of the report):
 * off-white page, soft rounded hero band in a light yellow gradient, rounded
 * information cards on very light yellow/neutral surfaces, small round yellow icon
 * containers, dark navy headings, grey explanations, green only for improvements,
 * and one discrete footer rule on every page.
 */

import type { ReportBlock, ReportIcon, ReportModel, SourceTag } from "./reportModel";
import logoDataUrl from "@/assets/mr-battery-doc-logo.png?inline";

/** Shared report palette (Mr. Battery Doc design system). */
export const REPORT_COLORS = {
  page: "#FFFFFF",
  primary: "#FFDC38",
  secondary: "#FFF0AE",
  detail: "#FFE879",
  cardYellow: "#FFF8E1",
  cardNeutral: "#FBFAF7",
  zebra: "#F8F7F4",
  text: "#16233A",
  muted: "#6E7480",
  line: "#E7E5E0",
  green: "#1E7A46",
  greenSoft: "#E9F5ED",
  barTrack: "#EDECE7",
};

/** Shared spacing scale, in points. */
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 44;
const MARGIN_TOP = 36;
const MARGIN_BOTTOM = 58;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const HERO_H = 118;
const CARD_GAP = 10;
const CARD_RADIUS = 10;
const PAD = 12;

/** Roboto (the embedded report font) has no U+2192, so use a Latin-1 glyph instead. */
const ARROW = "\u00BB";

/** Replace glyphs the embedded font cannot render (they would print as empty boxes). */
function sanitizeGlyphs<T>(node: T): T {
  if (typeof node === "string") {
    return node
      .replace(/\u2212/gu, "-")
      .replace(/[\u2190-\u21FF\u27F0-\u27FF\u2B00-\u2BFF]/gu, ARROW) as unknown as T;
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

/* ------------------------------------------------------------------ icons */

/**
 * Simple line icons drawn on a pdfmake canvas inside a round yellow container.
 * pdfmake has no icon font, so each glyph is a handful of primitives.
 */
function iconCanvas(icon: ReportIcon | undefined, tone: "yellow" | "green"): Node {
  const R = 12;
  const stroke = tone === "green" ? REPORT_COLORS.green : REPORT_COLORS.text;
  const shapes: Node[] = [
    {
      type: "ellipse",
      x: R,
      y: R,
      r1: R,
      r2: R,
      color: tone === "green" ? REPORT_COLORS.greenSoft : REPORT_COLORS.detail,
    },
  ];
  const line = (x1: number, y1: number, x2: number, y2: number) =>
    shapes.push({ type: "line", x1, y1, x2, y2, lineWidth: 1.2, lineColor: stroke });
  const rect = (x: number, y: number, w: number, h: number, r = 1) =>
    shapes.push({ type: "rect", x, y, w, h, r, lineWidth: 1.2, lineColor: stroke });

  switch (icon) {
    case "battery":
      rect(8, 6, 8, 13, 1.5);
      line(10.5, 5, 13.5, 5);
      rect(10, 12, 4, 5, 0.5);
      break;
    case "bolt":
      shapes.push({
        type: "polyline",
        lineWidth: 1.2,
        lineColor: stroke,
        closePath: true,
        points: [
          { x: 13.5, y: 5 },
          { x: 8.5, y: 13 },
          { x: 12, y: 13 },
          { x: 10.5, y: 19 },
          { x: 15.5, y: 11 },
          { x: 12, y: 11 },
        ],
      });
      break;
    case "coin":
      shapes.push({ type: "ellipse", x: 12, y: 9.5, r1: 5.5, r2: 2.6, lineWidth: 1.2, lineColor: stroke });
      shapes.push({ type: "ellipse", x: 12, y: 13, r1: 5.5, r2: 2.6, lineWidth: 1.2, lineColor: stroke });
      shapes.push({ type: "ellipse", x: 12, y: 16.5, r1: 5.5, r2: 2.6, lineWidth: 1.2, lineColor: stroke });
      break;
    case "chart":
      rect(7, 13, 3, 6, 0.6);
      rect(11, 9.5, 3, 9.5, 0.6);
      rect(15, 6, 3, 13, 0.6);
      break;
    case "house":
      shapes.push({
        type: "polyline",
        lineWidth: 1.2,
        lineColor: stroke,
        points: [
          { x: 6.5, y: 12 },
          { x: 12, y: 6.5 },
          { x: 17.5, y: 12 },
        ],
      });
      rect(8.5, 12, 7, 6.5, 0.8);
      break;
    case "leaf":
      shapes.push({ type: "ellipse", x: 12, y: 12, r1: 5.5, r2: 5.5, lineWidth: 1.2, lineColor: stroke });
      line(8.5, 15.5, 15.5, 8.5);
      break;
    case "grid":
      line(12, 5.5, 12, 19);
      line(7, 19, 12, 5.5);
      line(17, 19, 12, 5.5);
      line(8.8, 12.5, 15.2, 12.5);
      line(7.9, 15.8, 16.1, 15.8);
      break;
    case "flow":
      shapes.push({
        type: "polyline",
        lineWidth: 1.2,
        lineColor: stroke,
        points: [
          { x: 8, y: 10 },
          { x: 16, y: 10 },
          { x: 13.5, y: 7.5 },
        ],
      });
      shapes.push({
        type: "polyline",
        lineWidth: 1.2,
        lineColor: stroke,
        points: [
          { x: 16, y: 14.5 },
          { x: 8, y: 14.5 },
          { x: 10.5, y: 17 },
        ],
      });
      break;
    default:
      shapes.push({ type: "ellipse", x: 12, y: 12, r1: 3, r2: 3, lineWidth: 1.2, lineColor: stroke });
  }
  return { canvas: shapes, width: 24 };
}

/* ------------------------------------------------------------------ cards */

/**
 * A row of fixed height rounded cards. pdfmake has no rounded container, so the card
 * surfaces are drawn on a canvas and the text is laid on top with a negative margin.
 */
function cardRow(
  items: { fill?: string; stroke?: string; stack: Node[] }[],
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
          color: item.fill ?? REPORT_COLORS.cardYellow,
          ...(item.stroke ? { lineWidth: 0.6, lineColor: item.stroke } : {}),
        })),
        margin: [0, 0, 0, -height],
      },
      {
        columns: items.map((item) => ({
          width: w,
          stack: [...item.stack, { text: "", fontSize: 1, margin: [0, filler, 0, 0] }],
          margin: [PAD, 0, PAD, 0],
        })),
        columnGap: CARD_GAP,
      },
    ],
    unbreakable: true,
    margin: [0, 0, 0, bottom],
  };
}

/** Summary key figures: round yellow icon, small label, large value, optional sub. */
function cards(items: { label: string; value: string; sub?: string; icon?: ReportIcon }[]): Node {
  const hasSub = items.some((i) => i.sub);
  return cardRow(
    items.map((item) => ({
      fill: REPORT_COLORS.cardYellow,
      stack: [
        { ...iconCanvas(item.icon, "yellow"), margin: [0, PAD, 0, 0] },
        {
          text: item.label,
          fontSize: 8.5,
          color: REPORT_COLORS.text,
          lineHeight: 1.25,
          margin: [0, 10, 0, 0],
        },
        { text: item.value, fontSize: 15, bold: true, margin: [0, 7, 0, 0] },
        ...(item.sub
          ? [{ text: item.sub, fontSize: 8, color: REPORT_COLORS.muted, margin: [0, 5, 0, 0] }]
          : []),
      ],
    })),
    hasSub ? 132 : 118,
    hasSub ? 108 : 92,
  );
}

/** A small rounded badge, used for improvements (green) and neutral notes. */
function badge(text: string, improved: boolean | undefined, maxWidth: number): Node {
  const h = 20;
  /* pdfmake cannot size a canvas to its text, so approximate the pill width. */
  const width = Math.min(maxWidth, 18 + text.length * 4.3);
  return {
    stack: [
      {
        canvas: [
          {
            type: "rect",
            x: 0,
            y: 0,
            w: width,
            h,
            r: 6,
            color: improved === false ? REPORT_COLORS.zebra : REPORT_COLORS.greenSoft,
          },
        ],
        margin: [0, 0, 0, -h],
      },
      {
        text,
        fontSize: 8.5,
        bold: true,
        color: improved === false ? REPORT_COLORS.muted : REPORT_COLORS.green,
        margin: [8, 5.5, 8, 0],
      },
    ],
  };
}

/** Grouped parameter rows, shown as soft cards instead of an administrative table. */
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
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      fillColor: (i: number) => (i % 2 === 0 ? REPORT_COLORS.cardNeutral : null),
      paddingLeft: (i: number, node: unknown, col: number) => (col === 0 ? 12 : 0),
      paddingRight: (i: number, node: unknown, col: number, cols: number) =>
        col === cols - 1 ? 12 : 0,
      paddingTop: () => 8,
      paddingBottom: () => 8,
    },
    margin: [0, 0, 0, 12],
  };
}

/** Before/after outcome cards: icon, label, hint, before » after, bar and badge. */
function beforeAfter(block: Extract<ReportBlock, { kind: "beforeAfter" }>): Node {
  const perRow = block.rows.length >= 3 ? 3 : block.rows.length || 1;
  const groups: (typeof block.rows)[] = [];
  for (let i = 0; i < block.rows.length; i += perRow) groups.push(block.rows.slice(i, i + perRow));
  const hasHint = block.rows.some((r) => r.hint);
  const hasBar = block.rows.some((r) => r.afterPct !== undefined);
  const hasDelta = block.rows.some((r) => r.delta);
  const headH = 14 + (hasHint ? 24 : 0);
  const contentH = PAD + headH + 22 + (hasBar ? 13 : 0) + (hasDelta ? 28 : 0) + 4;
  const cardH = contentH + PAD;

  return {
    stack: groups.map((group, gi) => {
      const cols = group.length;
      const cardW = (CONTENT_W - CARD_GAP * (cols - 1)) / cols;
      const innerW = cardW - PAD * 2;
      return cardRow(
        group.map((row) => ({
          fill: REPORT_COLORS.cardNeutral,
          stroke: REPORT_COLORS.line,
          stack: [
            {
              table: {
                widths: ["*"],
                heights: [headH],
                body: [
                  [
                    {
                      columns: [
                        { width: 24, ...iconCanvas(row.icon, "yellow") },
                        {
                          width: "*",
                          stack: [
                            { text: row.label, fontSize: 9.5, bold: true },
                            ...(row.hint
                              ? [
                                  {
                                    text: row.hint,
                                    fontSize: 7.5,
                                    color: REPORT_COLORS.muted,
                                    lineHeight: 1.2,
                                    margin: [0, 2, 0, 0],
                                  },
                                ]
                              : []),
                          ],
                        },
                      ],
                      columnGap: 8,
                      border: [false, false, false, false],
                      margin: [0, 0, 0, 0],
                    },
                  ],
                ],
              },
              layout: "noBorders",
              margin: [0, PAD, 0, 0],
            },
            {
              text: [
                { text: row.before, fontSize: 11, color: REPORT_COLORS.text },
                { text: `  ${ARROW}  `, fontSize: 9, color: REPORT_COLORS.muted },
                {
                  text: row.after,
                  fontSize: 12,
                  bold: true,
                  color: row.improved === false ? REPORT_COLORS.text : REPORT_COLORS.green,
                },
              ],
              margin: [0, 10, 0, 0],
            },
            ...(row.afterPct !== undefined
              ? [
                  {
                    canvas: [
                      { type: "rect", x: 0, y: 0, w: innerW, h: 5, r: 2.5, color: REPORT_COLORS.barTrack },
                      {
                        type: "rect",
                        x: 0,
                        y: 0,
                        w: Math.max(4, (innerW * Math.max(0, Math.min(100, row.afterPct))) / 100),
                        h: 5,
                        r: 2.5,
                        color: REPORT_COLORS.primary,
                      },
                    ],
                    margin: [0, 8, 0, 0],
                  },
                ]
              : []),
            ...(row.delta ? [{ ...badge(row.delta, row.improved, innerW), margin: [0, 8, 0, 0] }] : []),
          ],
        })),
        cardH,
        contentH,
        gi === groups.length - 1 ? 14 : CARD_GAP,
      );
    }),
  };
}

/** Capacity alternatives: three cards, the recommended one on the yellow surface. */
function alternatives(block: Extract<ReportBlock, { kind: "alternatives" }>): Node {
  return cardRow(
    block.items.map((item) => ({
      fill: item.highlight ? REPORT_COLORS.cardYellow : REPORT_COLORS.cardNeutral,
      stroke: item.highlight ? REPORT_COLORS.detail : REPORT_COLORS.line,
      stack: [
        {
          text: item.label,
          fontSize: 8.5,
          bold: true,
          alignment: "center",
          color: REPORT_COLORS.muted,
          margin: [0, PAD, 0, 0],
        },
        { text: item.capacity, fontSize: 15, bold: true, alignment: "center", margin: [0, 7, 0, 0] },
        {
          text: item.power,
          fontSize: 8.5,
          alignment: "center",
          color: REPORT_COLORS.muted,
          margin: [0, 4, 0, 0],
        },
        { text: item.benefit, fontSize: 11, bold: true, alignment: "center", margin: [0, 6, 0, 0] },
      ],
    })),
    106,
    84,
  );
}

/** One wide rounded card with a round icon, a large value and a short explanation. */
function hero(block: Extract<ReportBlock, { kind: "hero" }>): Node {
  const green = block.tone === "green";
  const h = block.hint ? 82 : 66;
  return {
    stack: [
      {
        canvas: [
          {
            type: "rect",
            x: 0,
            y: 0,
            w: CONTENT_W,
            h,
            r: CARD_RADIUS,
            color: green ? REPORT_COLORS.greenSoft : REPORT_COLORS.cardYellow,
          },
        ],
        margin: [0, 0, 0, -h],
      },
      {
        columns: [
          { width: 24, ...iconCanvas(block.icon, green ? "green" : "yellow"), margin: [0, 20, 0, 0] },
          {
            width: "*",
            stack: [
              { text: block.value, fontSize: 16, bold: true },
              ...(block.hint
                ? [
                    {
                      text: block.hint,
                      fontSize: 9,
                      color: REPORT_COLORS.muted,
                      lineHeight: 1.35,
                      margin: [0, 5, 0, 0],
                    },
                  ]
                : []),
              { text: "", fontSize: 1 },
            ],
            margin: [0, 18, 0, 0],
          },
        ],
        columnGap: 12,
        margin: [16, 0, 16, 0],
      },
    ],
    unbreakable: true,
    margin: [0, 0, 0, 14],
  };
}

/** A soft, light panel used for FAQ entries and callouts. */
function panel(stack: Node[], fill: string, bottom: number): Node {
  return {
    table: { widths: ["*"], body: [[{ stack, fillColor: fill, margin: [14, 12, 14, 12] }]] },
    layout: "noBorders",
    unbreakable: true,
    margin: [0, 0, 0, bottom],
  };
}

/**
 * Value split: one row per benefit component with amount, share and a short bar.
 * The bar length mirrors the share the model already computed; a component without a
 * share (not priced, or negative) simply gets no bar.
 */
function distribution(block: Extract<ReportBlock, { kind: "distribution" }>): Node {
  const BAR_W = CONTENT_W - 28;
  return {
    stack: block.items.map((item) => {
      const pct = item.sharePct === null ? 0 : Math.max(0, Math.min(100, item.sharePct));
      return panel(
        [
          {
            columns: [
              { width: "*", text: item.label, fontSize: 10, bold: true },
              { width: "auto", text: item.value, fontSize: 10, bold: true, alignment: "right" },
            ],
            margin: [0, 0, 0, 7],
          },
          {
            canvas: [
              { type: "rect", x: 0, y: 0, w: BAR_W, h: 6, r: 3, color: REPORT_COLORS.barTrack },
              ...(pct > 0
                ? [
                    {
                      type: "rect",
                      x: 0,
                      y: 0,
                      w: Math.max(4, (BAR_W * pct) / 100),
                      h: 6,
                      r: 3,
                      color: REPORT_COLORS.primary,
                    },
                  ]
                : []),
            ],
            margin: [0, 0, 0, 5],
          },
          ...(item.share ? [{ text: item.share, fontSize: 8.5, color: REPORT_COLORS.muted }] : []),
          ...(item.hint
            ? [
                {
                  text: item.hint,
                  fontSize: 9,
                  lineHeight: 1.35,
                  color: REPORT_COLORS.muted,
                  margin: [0, 4, 0, 0],
                },
              ]
            : []),
        ],
        REPORT_COLORS.cardNeutral,
        9,
      );
    }),
    margin: [0, 0, 0, 4],
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
    case "distribution":
      return distribution(block);
    case "hero":
      return hero(block);
    case "subheading":
      return {
        stack: [
          { text: block.text, fontSize: 11, bold: true },
          ...(block.hint
            ? [{ text: block.hint, fontSize: 9, color: REPORT_COLORS.muted, margin: [0, 3, 0, 0] }]
            : []),
        ],
        margin: [0, 6, 0, 10],
      };
    case "text":
      return { text: block.text, fontSize: 9.5, lineHeight: 1.45, margin: [0, 0, 0, 10] };
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
      return { ul: block.items, fontSize: 9.5, lineHeight: 1.45, margin: [0, 0, 0, 12] };
    case "checklist":
      return {
        stack: block.items.map((item) => ({
          columns: [
            {
              width: 18,
              canvas: [
                {
                  type: "ellipse",
                  x: 5,
                  y: 5.5,
                  r1: 5,
                  r2: 5,
                  color: REPORT_COLORS.detail,
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
              { text: item.a, fontSize: 9, lineHeight: 1.45, color: REPORT_COLORS.muted },
            ],
            REPORT_COLORS.cardNeutral,
            10,
          ),
        ),
        margin: [0, 0, 0, 4],
      };
  }
}

/** Section title with an optional grey subtitle. */
function sectionTitle(text: string, subtitle: string | undefined, first: boolean): Node[] {
  return [
    { text, fontSize: 17, bold: true, margin: [0, first ? 0 : 20, 0, subtitle ? 4 : 10] },
    ...(subtitle
      ? [{ text: subtitle, fontSize: 9.5, color: REPORT_COLORS.muted, margin: [0, 0, 0, 12] }]
      : []),
  ];
}

/** Rounded hero band: light yellow gradient, brand block left, logo and date right. */
function heroBand(model: ReportModel): Node {
  const bands = [
    { y: 0, h: HERO_H * 0.42, color: REPORT_COLORS.secondary },
    { y: HERO_H * 0.42, h: HERO_H * 0.3, color: "#FFF6CB" },
    { y: HERO_H * 0.72, h: HERO_H * 0.28, color: "#FFFBE4" },
  ];
  return {
    stack: [
      {
        canvas: [
          { type: "rect", x: 0, y: 0, w: CONTENT_W, h: HERO_H, r: 14, color: REPORT_COLORS.secondary },
          ...bands.slice(1).map((b) => ({
            type: "rect",
            x: 0,
            y: b.y,
            w: CONTENT_W,
            h: b.h,
            r: 0,
            color: b.color,
          })),
          {
            type: "rect",
            x: 0,
            y: HERO_H - 14,
            w: CONTENT_W,
            h: 14,
            r: 14,
            color: "#FFFBE4",
          },
        ],
        margin: [0, 0, 0, -HERO_H],
      },
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: model.title, fontSize: 26, bold: true, margin: [0, 20, 0, 0] },
              {
                canvas: [{ type: "rect", x: 0, y: 0, w: 46, h: 3, r: 1.5, color: REPORT_COLORS.primary }],
                margin: [0, 9, 0, 0],
              },
              { text: model.brand, fontSize: 10.5, bold: true, margin: [0, 10, 0, 0] },
              {
                text: model.copy.tagline,
                fontSize: 9,
                color: REPORT_COLORS.muted,
                margin: [0, 3, 0, 0],
              },
            ],
          },
          {
            width: 130,
            stack: [
              { image: logoDataUrl, width: 96, alignment: "right", margin: [0, 18, 0, 0] },
              {
                text: `${model.copy.created}: ${model.createdISO}`,
                fontSize: 8.5,
                color: REPORT_COLORS.muted,
                alignment: "right",
                margin: [0, 12, 0, 0],
              },
            ],
          },
        ],
        margin: [20, 0, 20, 0],
      },
    ],
    unbreakable: true,
    margin: [0, 0, 0, 24],
  };
}

/** Full pdfmake document definition for a report model. */
export function buildDocDefinition(model: ReportModel): Record<string, unknown> {
  const content: Node[] = [heroBand(model)];

  let first = true;
  let firstNode = false;
  for (const section of model.sections) {
    const hardBreak = section.pageBreak && !firstNode;
    if (section.title) {
      const nodes = sectionTitle(section.title, section.subtitle, first || section.pageBreak);
      content.push({ ...(nodes[0] as Node), ...(hardBreak ? { pageBreak: "before" } : {}) });
      for (const extra of nodes.slice(1)) content.push(extra as Node);
      first = false;
      firstNode = false;
    } else if (hardBreak) {
      content.push({ text: "", pageBreak: "before" });
      firstNode = false;
    }
    for (const block of section.blocks) {
      content.push(sanitizeGlyphs(renderBlock(model, block)));
      firstNode = false;
    }
    /* A trailing bottom margin can spill past the page bottom and make pdfmake emit an
     * empty page before the next section's hard break, so drop it on the last node. */
    const last = content[content.length - 1] as { margin?: number[] } | undefined;
    if (last && Array.isArray(last.margin)) {
      last.margin = [last.margin[0] ?? 0, last.margin[1] ?? 0, last.margin[2] ?? 0, 0];
    }
  }

  return {
    pageSize: "A4",
    pageMargins: [MARGIN_X, MARGIN_TOP, MARGIN_X, MARGIN_BOTTOM],
    background: () => ({
      canvas: [{ type: "rect", x: 0, y: 0, w: PAGE_W, h: PAGE_H, color: REPORT_COLORS.page }],
    }),
    pageBreakBefore: (currentNode: { headlineLevel?: number; startPosition?: { top: number } }) =>
      currentNode.headlineLevel === 1 && (currentNode.startPosition?.top ?? 0) > MARGIN_TOP + 6,
    defaultStyle: { fontSize: 9.5, color: REPORT_COLORS.text, lineHeight: 1.25 },
    footer: (currentPage: number, pageCount: number) => ({
      margin: [MARGIN_X, 14, MARGIN_X, 0],
      stack: [
        {
          canvas: [
            { type: "line", x1: 0, y1: 0, x2: CONTENT_W, y2: 0, lineWidth: 0.6, lineColor: REPORT_COLORS.line },
          ],
          margin: [0, 0, 0, 8],
        },
        {
          columns: [
            {
              width: "*",
              stack: [
                { text: model.brand, fontSize: 8, bold: true },
                {
                  text: model.copy.footerTagline,
                  fontSize: 7.5,
                  color: REPORT_COLORS.muted,
                  margin: [0, 2, 0, 0],
                },
              ],
            },
            {
              width: "auto",
              stack: [
                {
                  text: `${model.copy.reportIdLabel}: ${model.reportId}`,
                  fontSize: 7.5,
                  color: REPORT_COLORS.muted,
                  alignment: "right",
                },
                {
                  text: `${model.copy.pageLabel} ${currentPage} ${model.copy.ofLabel} ${pageCount}`,
                  fontSize: 7.5,
                  color: REPORT_COLORS.muted,
                  alignment: "right",
                  margin: [0, 2, 0, 0],
                },
              ],
            },
          ],
        },
      ],
    }),
    info: { title: `${model.title} — ${model.reportId}`, author: model.brand },
    content,
  };
}
