import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { track } from "@/lib/analytics/track";
import { ArrowRight, BatteryFull, LineChart, PiggyBank, Settings, Zap, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSelect } from "@/components/LanguageSelect";
import { useCountUp, formatStatNumber } from "@/components/CountUp";
import logo from "@/assets/mr-battery-doc-logo.png";
import { useT } from "@/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mr. Battery Doc — hitta rätt batteri till din fastighet" },
      {
        name: "description",
        content:
          "Svara på några enkla frågor och få veta vilken batteristorlek och effekt som passar din fastighet.",
      },
      { property: "og:title", content: "Mr. Battery Doc — rätt batteri till din fastighet" },
      {
        property: "og:description",
        content: "Enkel guide som visar batteristorlek, effekt och nytta.",
      },
    ],
  }),
  component: Welcome,
});

const POINTS = [
  { icon: BatteryFull, key: "intro.points.capacity" },
  { icon: LineChart, key: "intro.points.economy" },
  { icon: PiggyBank, key: "intro.points.investment" },
];

/** Animated stat cards: count 0→max with ease-out, then glow-pulse once. */
function AnimatedStats({ t }: { t: ReturnType<typeof useT> }) {
  const power = useCountUp(200);
  const capacity = useCountUp(500);
  const sims = useCountUp(800_000, 1200);

  const powerDone = power.done && capacity.done;

  return (
    <div className="mt-5 flex w-full items-stretch justify-center gap-3">
      <div
        className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl border border-border bg-card px-2.5 py-2 text-center transition-shadow ${powerDone ? "stat-glow-pulse" : ""}`}
      >
        <Zap className="size-3.5 text-accent" strokeWidth={2.5} />
        <span className="text-[0.75rem] font-bold leading-tight">
          {power.value} kW / {capacity.value} kWh
        </span>
        <span className="text-[0.6875rem] leading-tight text-muted-foreground">
          {t("intro.stats.powerSub")}
        </span>
      </div>
      <div
        className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl border border-border bg-card px-2.5 py-2 text-center transition-shadow ${sims.done ? "stat-glow-pulse" : ""}`}
      >
        <Activity className="size-3.5 text-accent" strokeWidth={2.5} />
        <span className="text-[0.75rem] font-bold leading-tight">
          ≈ {formatStatNumber(sims.value)}
        </span>
        <span className="text-[0.6875rem] leading-tight text-muted-foreground">
          {t("intro.stats.simsSub")}
        </span>
      </div>
    </div>
  );
}

function Welcome() {
  const t = useT();
  return (
    <div className="app-shell surface-sun min-h-dvh max-w-md flex flex-col px-5 pt-safe pb-safe">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <h1 className="sr-only">Mr. Battery Doc</h1>
        <img
          src={logo}
          alt="Mr. Battery Doc"
          className="logo-float w-full max-w-[8.5rem]"
          width={480}
          height={320}
        />
        <h2 className="mt-4 text-[1.25rem] font-bold leading-tight tracking-tight">
          {t("intro.title")}
        </h2>
        <p className="mt-1.5 max-w-[20rem] text-[0.75rem] leading-snug text-muted-foreground">
          {t("intro.subtitle")}
        </p>

        <ul className="mt-5 w-full space-y-2.5 text-left">
          {POINTS.map(({ icon: Icon, key }, i) => (
            <li key={key} className="flex items-start gap-3 px-1 py-0.5">
              <span
                className="icon-tilt-pop flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground"
                style={{ animationDelay: `${i * 2}s` }}
              >
                <Icon className="size-4" strokeWidth={2.5} />
              </span>
              <span className="flex flex-col gap-0.5 pt-0.5">
                <span className="text-[0.8125rem] font-semibold leading-tight">
                  {t(`${key}.title`)}
                </span>
                <span className="text-[0.6875rem] leading-snug text-muted-foreground">
                  {t(`${key}.desc`)}
                </span>
              </span>
            </li>
          ))}
        </ul>

        <AnimatedStats t={t} />
      </div>

      <div className="flex w-full items-stretch gap-2 pt-6">
          <Button
            asChild
            variant="secondary"
            aria-label={t("settings.title")}
            className="h-12 w-12 shrink-0 rounded-[0.875rem] shadow-sm"
          >
            <Link to="/installningar">
              <Settings className="size-5" strokeWidth={2.5} />
            </Link>
          </Button>
          <Button
            asChild
            variant="cta"
            className="h-12 flex-1 rounded-[0.875rem] font-bold shadow-cta"
          >
            <Link to="/nat" onClick={() => track("wizard_start")}>
              {t("intro.cta")}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        <LanguageSelect />
      </div>
    </div>
  );
}
