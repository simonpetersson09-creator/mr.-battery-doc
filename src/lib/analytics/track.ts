/**
 * Anonymous usage tracking.
 *
 * Records which steps people reach, where they get stuck and whether they buy.
 * No personal data is stored — only a random per-visit id that is thrown away
 * when the app is closed. Tracking never throws and never blocks the UI.
 */
import { supabase } from "@/integrations/supabase/client";
import { currentLanguage } from "@/i18n";
import { platformName } from "@/lib/platform/runtime";

export type AnalyticsEvent =
  | "app_open"
  | "wizard_start"
  | "step_view"
  | "step_next"
  | "step_blocked"
  | "paywall_view"
  | "purchase_start"
  | "purchase_success"
  | "purchase_cancel"
  | "purchase_error"
  | "result_view"
  | "pdf_download";

const SESSION_KEY = "mr-battery-doc:analytics:session:v1";

function sessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = `s_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    window.sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return null;
  }
}

/** Events that should only be counted once per visit (page views). */
const onceSeen = new Set<string>();

let stepEnteredAt: number | null = null;

interface TrackOptions {
  step?: string;
  detail?: string;
  country?: string;
  /** Count at most once per visit for this key. */
  once?: boolean;
  /** Attach how long the user spent on the current step. */
  withDuration?: boolean;
}

export function track(event: AnalyticsEvent, options: TrackOptions = {}): void {
  if (typeof window === "undefined") return;
  const session = sessionId();
  if (!session) return;

  const key = `${event}:${options.step ?? ""}`;
  if (options.once) {
    if (onceSeen.has(key)) return;
    onceSeen.add(key);
  }

  const msOnStep =
    options.withDuration && stepEnteredAt !== null
      ? Math.min(Math.round(performance.now() - stepEnteredAt), 3_600_000)
      : null;

  const row = {
    session_id: session,
    event,
    step: options.step ?? null,
    detail: options.detail ? options.detail.slice(0, 120) : null,
    country: options.country ?? null,
    language: currentLanguage(),
    platform: platformName(),
    ms_on_step: msOnStep,
  };

  void supabase
    .from("analytics_events")
    .insert(row)
    .then(undefined, () => {
      /* never surface tracking failures to the user */
    });
}

/** Called when a wizard step becomes visible, so time-on-step can be measured. */
export function markStepEntered(): void {
  if (typeof window === "undefined") return;
  stepEnteredAt = performance.now();
}
