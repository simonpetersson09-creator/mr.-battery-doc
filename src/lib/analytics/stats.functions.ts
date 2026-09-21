/**
 * Usage statistics for the PIN-protected internal page.
 *
 * The PIN is checked on the server against the ANALYTICS_PIN secret; the raw
 * event rows never leave the server without a correct PIN.
 */
import { createServerFn } from "@tanstack/react-start";

export const FUNNEL_STEPS = [
  { key: "app_open", label: "Öppnade appen" },
  { key: "/nat", label: "1. Nät" },
  { key: "/forbrukning", label: "2. Förbrukning" },
  { key: "/produktion", label: "3. Produktion" },
  { key: "/batteri", label: "4. Batteri" },
  { key: "/ekonomi", label: "5. Ekonomi" },
  { key: "/resultat", label: "Resultat" },
  { key: "paywall_view", label: "Såg betalväggen" },
  { key: "purchase_start", label: "Startade köp" },
  { key: "purchase_success", label: "Köpte" },
] as const;

export interface FunnelRow {
  key: string;
  label: string;
  sessions: number;
  /** Share of all sessions that opened the app. */
  sharePct: number;
  /** Share lost compared with the previous row. */
  dropPct: number;
  /** Median seconds spent on this step before moving on. */
  medianSeconds: number | null;
}

export interface StatsResult {
  days: number;
  sessions: number;
  startedWizard: number;
  reachedResult: number;
  sawPaywall: number;
  purchases: number;
  conversionPct: number;
  paywallConversionPct: number;
  pdfDownloads: number;
  funnel: FunnelRow[];
  blockers: { step: string; reason: string; count: number }[];
  dropOff: { step: string; sessions: number }[];
  purchaseIssues: { detail: string; count: number }[];
  byCountry: { country: string; sessions: number; purchases: number }[];
  byLanguage: { language: string; sessions: number }[];
  byDay: { day: string; sessions: number; purchases: number }[];
  totalEvents: number;
}

interface EventRow {
  created_at: string;
  session_id: string;
  event: string;
  step: string | null;
  detail: string | null;
  country: string | null;
  language: string | null;
  ms_on_step: number | null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

function topCounts<T extends string>(map: Map<T, number>, limit: number): [T, number][] {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

export const loadUsageStats = createServerFn({ method: "POST" })
  .inputValidator((input: { pin: string; days?: number }) => ({
    pin: String(input?.pin ?? "").slice(0, 12),
    days: Math.min(Math.max(Number(input?.days ?? 30) || 30, 1), 365),
  }))
  .handler(async ({ data }): Promise<{ ok: false } | { ok: true; stats: StatsResult }> => {
    if (!import.meta.env.DEV) return { ok: false };
    const expected = process.env["ANALYTICS_PIN"] ?? "";
    if (!expected || data.pin.length !== expected.length || data.pin !== expected) {
      // Slow down brute-force guessing of a 4-digit code.
      await new Promise((resolve) => setTimeout(resolve, 600));
      return { ok: false };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - data.days * 86_400_000).toISOString();
    const { data: rows, error } = await supabaseAdmin
      .from("analytics_events")
      .select("created_at, session_id, event, step, detail, country, language, ms_on_step")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(100_000);
    if (error) throw new Error(error.message);

    const events = (rows ?? []) as EventRow[];

    const sessionsWith = new Map<string, Set<string>>();
    const durations = new Map<string, number[]>();
    const blockers = new Map<string, number>();
    const purchaseIssues = new Map<string, number>();
    const countrySessions = new Map<string, Set<string>>();
    const countryPurchases = new Map<string, number>();
    const languageSessions = new Map<string, Set<string>>();
    const daySessions = new Map<string, Set<string>>();
    const dayPurchases = new Map<string, number>();
    const allSessions = new Set<string>();

    const addSession = (key: string, session: string) => {
      const set = sessionsWith.get(key) ?? new Set<string>();
      set.add(session);
      sessionsWith.set(key, set);
    };

    for (const row of events) {
      allSessions.add(row.session_id);
      const day = row.created_at.slice(0, 10);
      const daySet = daySessions.get(day) ?? new Set<string>();
      daySet.add(row.session_id);
      daySessions.set(day, daySet);

      if (row.country) {
        const set = countrySessions.get(row.country) ?? new Set<string>();
        set.add(row.session_id);
        countrySessions.set(row.country, set);
      }
      if (row.language) {
        const set = languageSessions.get(row.language) ?? new Set<string>();
        set.add(row.session_id);
        languageSessions.set(row.language, set);
      }

      if (row.event === "step_view" && row.step) addSession(row.step, row.session_id);
      else addSession(row.event, row.session_id);

      if (row.event === "step_next" && row.step && row.ms_on_step != null) {
        const list = durations.get(row.step) ?? [];
        list.push(row.ms_on_step / 1000);
        durations.set(row.step, list);
      }
      if (row.event === "step_blocked" && row.step) {
        const key = `${row.step}||${row.detail ?? "okänd orsak"}`;
        blockers.set(key, (blockers.get(key) ?? 0) + 1);
      }
      if (row.event === "purchase_error" || row.event === "purchase_cancel") {
        const key = `${row.event === "purchase_cancel" ? "Avbrutet köp" : "Fel"}: ${row.detail ?? "okänt"}`;
        purchaseIssues.set(key, (purchaseIssues.get(key) ?? 0) + 1);
      }
      if (row.event === "purchase_success") {
        if (row.country) countryPurchases.set(row.country, (countryPurchases.get(row.country) ?? 0) + 1);
        dayPurchases.set(day, (dayPurchases.get(day) ?? 0) + 1);
      }
    }

    const count = (key: string) => sessionsWith.get(key)?.size ?? 0;
    const base = Math.max(count("app_open"), allSessions.size);

    const funnel: FunnelRow[] = FUNNEL_STEPS.map((step, i) => {
      const sessions = step.key === "app_open" ? base : count(step.key);
      const prev = i === 0 ? base : count(FUNNEL_STEPS[i - 1]!.key);
      const prevCount = i === 0 ? base : (FUNNEL_STEPS[i - 1]!.key === "app_open" ? base : prev);
      return {
        key: step.key,
        label: step.label,
        sessions,
        sharePct: base > 0 ? Math.round((sessions / base) * 1000) / 10 : 0,
        dropPct:
          prevCount > 0 ? Math.max(0, Math.round(((prevCount - sessions) / prevCount) * 1000) / 10) : 0,
        medianSeconds: (() => {
          const m = median(durations.get(step.key) ?? []);
          return m === null ? null : Math.round(m);
        })(),
      };
    });

    const dropOff = funnel
      .slice(1)
      .map((row, i) => ({
        step: row.label,
        sessions: Math.max(0, (funnel[i]!.sessions ?? 0) - row.sessions),
      }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 5);

    const purchases = count("purchase_success");
    const sawPaywall = count("paywall_view");

    return {
      ok: true,
      stats: {
        days: data.days,
        sessions: base,
        startedWizard: count("/nat"),
        reachedResult: count("/resultat"),
        sawPaywall,
        purchases,
        conversionPct: base > 0 ? Math.round((purchases / base) * 1000) / 10 : 0,
        paywallConversionPct: sawPaywall > 0 ? Math.round((purchases / sawPaywall) * 1000) / 10 : 0,
        pdfDownloads: count("pdf_download"),
        funnel,
        blockers: topCounts(blockers, 8).map(([key, value]) => {
          const [step, reason] = key.split("||");
          return { step: step ?? "", reason: reason ?? "", count: value };
        }),
        dropOff,
        purchaseIssues: topCounts(purchaseIssues, 6).map(([detail, c]) => ({ detail, count: c })),
        byCountry: [...countrySessions.entries()]
          .map(([country, set]) => ({
            country,
            sessions: set.size,
            purchases: countryPurchases.get(country) ?? 0,
          }))
          .sort((a, b) => b.sessions - a.sessions),
        byLanguage: [...languageSessions.entries()]
          .map(([language, set]) => ({ language, sessions: set.size }))
          .sort((a, b) => b.sessions - a.sessions),
        byDay: [...daySessions.entries()]
          .map(([day, set]) => ({ day, sessions: set.size, purchases: dayPurchases.get(day) ?? 0 }))
          .sort((a, b) => a.day.localeCompare(b.day))
          .slice(-30),
        totalEvents: events.length,
      },
    };
  });
