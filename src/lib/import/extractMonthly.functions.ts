/**
 * Document/image extraction for the monthly import.
 *
 * Runs server-side, calls the Lovable AI Gateway with the uploaded image or PDF and
 * returns a raw ExtractionPayload. Everything after this point (normalisation,
 * validation, review, wizard state) is plain app logic — the Battery Engine is never
 * involved and never learns that a file existed.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ExtractionPayload } from "./monthly";

const inputSchema = z.object({
  /** data:<mime>;base64,<data> */
  dataUrl: z.string().min(16),
  mimeType: z.string().min(3),
  fileName: z.string().default("underlag"),
});

const SYSTEM = `Du läser svenska energiunderlag (elräkning, årsrapport, skärmdump, tabell).
Uppgift: hitta månadsvis energi (Jan–Dec) för förbrukning och/eller solproduktion.
Regler:
- Gissa ALDRIG ett värde. Kan en månad inte läsas: sätt null.
- Returnera värden exakt som i dokumentet, utan avrundning.
- Ange enheten som står i dokumentet ("kWh" eller "MWh"). Räkna inte om själv.
- Flera serier (t.ex. förbrukning och produktion) returneras som separata poster.
- kind: "consumption" om serien avser förbrukning/inköpt el, "production" om den avser
  solproduktion, annars "unknown".
- annualTotalStated: årssumman som står i dokumentet, annars null.
- selfConsumptionPct: procent egenanvändning om det anges, annars null.
Svara ENDAST med JSON enligt:
{"series":[{"kind":"consumption","label":"...","unit":"kWh","months":[12 tal eller null],"annualTotalStated":null}],"selfConsumptionPct":null,"notes":[]}`;

export const extractMonthlyFromDocument = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<ExtractionPayload & { error?: string; errorCode?: string }> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      return { series: [], selfConsumptionPct: null, notes: [], error: "AI service not configured.", errorCode: "notConfigured" };
    }

    const isPdf = data.mimeType.includes("pdf");
    const content = isPdf
      ? [
          { type: "text", text: "Läs ut månadsdata ur detta dokument." },
          {
            type: "file",
            file: { filename: `${data.fileName}.pdf`, file_data: data.dataUrl },
          },
        ]
      : [
          { type: "text", text: "Läs ut månadsdata ur denna bild." },
          { type: "image_url", image_url: { url: data.dataUrl } },
        ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      const errorCode =
        res.status === 429
          ? "rateLimited"
          : res.status === 402
            ? "creditsExhausted"
            : "unreadable";
      return {
        series: [],
        selfConsumptionPct: null,
        notes: [body.slice(0, 200)],
        error: `Document could not be read (${res.status}).`,
        errorCode,
      };
    }

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content ?? "";
    try {
      const parsed = JSON.parse(raw.replace(/^```(?:json)?|```$/g, "").trim()) as ExtractionPayload;
      const series = Array.isArray(parsed.series) ? parsed.series : [];
      return {
        series: series.map((s) => ({
          kind: s.kind === "consumption" || s.kind === "production" ? s.kind : "unknown",
          label: typeof s.label === "string" ? s.label : "Serie",
          unit: s.unit === "MWh" ? "MWh" : "kWh",
          months: Array.from({ length: 12 }, (_, i) => {
            const v = s.months?.[i];
            return typeof v === "number" && Number.isFinite(v) ? v : null;
          }),
          annualTotalStated:
            typeof s.annualTotalStated === "number" && Number.isFinite(s.annualTotalStated)
              ? s.annualTotalStated
              : null,
        })),
        selfConsumptionPct:
          typeof parsed.selfConsumptionPct === "number" ? parsed.selfConsumptionPct : null,
        notes: Array.isArray(parsed.notes) ? parsed.notes.filter((n) => typeof n === "string") : [],
      };
    } catch {
      return {
        series: [],
        selfConsumptionPct: null,
        notes: [],
        error: "Document content could not be interpreted.",
        errorCode: "unparsable",
      };
    }
  });
