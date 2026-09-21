/**
 * INTERNAL USAGE PAGE — locked with a 4-digit PIN.
 *
 * Shows how many people use the app, how far they get in the wizard, where they
 * get stuck and how many buy a report. All data is anonymous; the PIN is
 * verified on the server, never in the browser.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Delete, Loader2, Lock, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { loadUsageStats, type StatsResult } from "@/lib/analytics/stats.functions";

export const Route = createFileRoute("/statistik")({
  head: () => ({
    meta: [
      { title: "Användning — Mr. Battery Doc" },
      { name: "description", content: "Låst sida med anonym användningsstatistik för appen." },
      { property: "og:title", content: "Användning — Mr. Battery Doc" },
      { property: "og:description", content: "Låst sida med anonym användningsstatistik." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: import.meta.env.DEV ? StatsPage : NotFound,
});

function NotFound() {
  return null;
}

const PIN_KEY = "mr-battery-doc:stats:pin:v1";
const RANGES = [7, 30, 90] as const;

function StatsPage() {
  const run = useServerFn(loadUsageStats);
  const [pin, setPin] = useState("");
  const [days, setDays] = useState<number>(30);
  const [unlockedPin, setUnlockedPin] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState(false);

  async function open(code: string, range: number) {
    setBusy(true);
    setWrong(false);
    try {
      const res = await run({ data: { pin: code, days: range } });
      if (!res.ok) {
        setWrong(true);
        setPin("");
        setUnlockedPin(null);
        try {
          sessionStorage.removeItem(PIN_KEY);
        } catch {
          /* ignore */
        }
        return;
      }
      setStats(res.stats);
      setUnlockedPin(code);
      try {
        sessionStorage.setItem(PIN_KEY, code);
      } catch {
        /* ignore */
      }
    } finally {
      setBusy(false);
    }
  }

  // Stay unlocked while the tab is open.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(PIN_KEY);
    } catch {
      saved = null;
    }
    if (saved) void open(saved, 30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pin.length === 4 && !busy) void open(pin, days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  if (!unlockedPin || !stats) {
    return (
      <div className="app-shell surface-sun min-h-dvh max-w-md px-5 pt-safe pb-safe">
        <div className="flex min-h-dvh flex-col items-center justify-center text-center">
          <Lock className="size-7 text-accent" strokeWidth={2.5} />
          <h1 className="mt-3 font-display text-[20px] font-bold">Användning</h1>
          <p className="ui-help mt-1">Ange din fyrsiffriga kod.</p>

          <div className="mt-5 flex gap-3">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`size-4 rounded-full border-2 ${i < pin.length ? "border-accent bg-accent" : "border-foreground/25"}`}
              />
            ))}
          </div>
          {wrong ? <p className="mt-3 text-[13px] font-semibold text-destructive">Fel kod. Försök igen.</p> : null}
          {busy ? <Loader2 className="mt-3 size-5 animate-spin text-muted-foreground" /> : null}

          <div className="mt-6 grid w-full max-w-[16rem] grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
              <Button
                key={n}
                variant="outline"
                className="h-12 rounded-[0.875rem] text-[18px] font-bold"
                onClick={() => setPin((p) => (p.length < 4 ? p + n : p))}
              >
                {n}
              </Button>
            ))}
            <span />
            <Button
              variant="outline"
              className="h-12 rounded-[0.875rem] text-[18px] font-bold"
              onClick={() => setPin((p) => (p.length < 4 ? p + "0" : p))}
            >
              0
            </Button>
            <Button
              variant="outline"
              aria-label="Radera"
              className="h-12 rounded-[0.875rem]"
              onClick={() => setPin((p) => p.slice(0, -1))}
            >
              <Delete className="size-5" />
            </Button>
          </div>

          <Button asChild variant="ghost" className="mt-6 h-10 text-[13px] font-semibold">
            <Link to="/">Tillbaka till appen</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell surface-sun min-h-dvh max-w-md px-4 pt-safe pb-safe">
      <div className="flex items-center justify-between pt-2">
        <h1 className="ui-page-title">Användning</h1>
        <Button
          variant="outline"
          className="h-9 rounded-[0.75rem] px-3 text-[13px] font-semibold"
          disabled={busy}
          onClick={() => void open(unlockedPin, days)}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        </Button>
      </div>

      <div className="mt-2 flex gap-2">
        {RANGES.map((r) => (
          <Button
            key={r}
            variant={r === days ? "cta" : "outline"}
            className="h-9 flex-1 rounded-[0.75rem] text-[13px] font-semibold"
            onClick={() => {
              setDays(r);
              void open(unlockedPin, r);
            }}
          >
            {r} dagar
          </Button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Metric label="Besök" value={String(stats.sessions)} />
        <Metric label="Startade guiden" value={String(stats.startedWizard)} />
        <Metric label="Nådde resultatet" value={String(stats.reachedResult)} />
        <Metric label="Såg betalväggen" value={String(stats.sawPaywall)} />
        <Metric label="Köp" value={String(stats.purchases)} />
        <Metric label="Köp av alla besök" value={`${stats.conversionPct} %`} />
        <Metric label="Köp efter betalvägg" value={`${stats.paywallConversionPct} %`} />
        <Metric label="Nedladdade rapport" value={String(stats.pdfDownloads)} />
      </div>

      <Card title="Så långt kommer besökarna">
        <div className="space-y-2">
          {stats.funnel.map((row) => (
            <div key={row.key}>
              <div className="flex items-baseline justify-between text-[12px] font-semibold">
                <span>{row.label}</span>
                <span className="tabular-nums">
                  {row.sessions}
                  <span className="ml-1 font-normal text-muted-foreground">{row.sharePct} %</span>
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-foreground/10">
                <div className="h-full rounded-full bg-accent" style={{ width: `${row.sharePct}%` }} />
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {row.dropPct > 0 ? `${row.dropPct} % tappas här` : "Inget tapp här"}
                {row.medianSeconds !== null ? ` · ${row.medianSeconds} s på sidan` : ""}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Störst tapp">
        {stats.dropOff.length === 0 ? (
          <Empty />
        ) : (
          <ul className="space-y-1">
            {stats.dropOff.map((row) => (
              <li key={row.step} className="flex justify-between text-[12px]">
                <span>{row.step}</span>
                <span className="font-semibold tabular-nums">−{row.sessions}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Här fastnar användaren">
        {stats.blockers.length === 0 ? (
          <Empty />
        ) : (
          <ul className="space-y-1.5">
            {stats.blockers.map((row) => (
              <li key={`${row.step}${row.reason}`} className="text-[12px]">
                <div className="flex justify-between gap-2">
                  <span className="font-semibold">{row.step}</span>
                  <span className="tabular-nums">{row.count}</span>
                </div>
                <p className="text-[11px] leading-snug text-muted-foreground">{row.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Avbrutna och misslyckade köp">
        {stats.purchaseIssues.length === 0 ? (
          <Empty />
        ) : (
          <ul className="space-y-1">
            {stats.purchaseIssues.map((row) => (
              <li key={row.detail} className="flex justify-between gap-2 text-[12px]">
                <span className="leading-snug">{row.detail}</span>
                <span className="font-semibold tabular-nums">{row.count}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Land">
        {stats.byCountry.length === 0 ? (
          <Empty />
        ) : (
          <ul className="space-y-1">
            {stats.byCountry.map((row) => (
              <li key={row.country} className="flex justify-between text-[12px]">
                <span>{row.country}</span>
                <span className="tabular-nums">
                  {row.sessions} besök · {row.purchases} köp
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Språk">
        {stats.byLanguage.length === 0 ? (
          <Empty />
        ) : (
          <ul className="space-y-1">
            {stats.byLanguage.map((row) => (
              <li key={row.language} className="flex justify-between text-[12px]">
                <span>{row.language}</span>
                <span className="tabular-nums">{row.sessions}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Dag för dag">
        {stats.byDay.length === 0 ? (
          <Empty />
        ) : (
          <ul className="space-y-1">
            {stats.byDay.map((row) => (
              <li key={row.day} className="flex justify-between text-[12px]">
                <span>{row.day}</span>
                <span className="tabular-nums">
                  {row.sessions} besök · {row.purchases} köp
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        {stats.totalEvents} registrerade händelser de senaste {stats.days} dagarna. Allt är anonymt.
      </p>

      <div className="mt-3 pb-4">
        <Button asChild variant="outline" className="h-10 w-full rounded-[0.75rem] text-[14px] font-semibold">
          <Link to="/">Tillbaka till appen</Link>
        </Button>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-border bg-card px-3 py-2">
      <p className="text-[11px] leading-tight text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-[19px] font-extrabold leading-none tabular-nums">{value}</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-3 rounded-[1rem] border border-border bg-card px-3 py-3">
      <h2 className="font-display text-[14px] font-bold">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Empty() {
  return <p className="text-[12px] text-muted-foreground">Ingen data ännu.</p>;
}
