import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BatteryFull, LineChart, PiggyBank, Settings, Zap, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSelect } from "@/components/LanguageSelect";
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
  { icon: BatteryFull, key: "intro.points.capacity", anim: "icon-anim-battery" },
  { icon: LineChart, key: "intro.points.economy", anim: "icon-anim-chart" },
  { icon: PiggyBank, key: "intro.points.investment", anim: "icon-anim-piggy" },
];

function Welcome() {
  const t = useT();
  return (
    <div className="app-shell surface-sun min-h-dvh max-w-md flex flex-col px-5 pt-safe pb-safe">
      <div className="flex flex-1 flex-col items-center justify-start pt-1 text-center">
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
          {POINTS.map(({ icon: Icon, key, anim }) => (
            <li key={key} className="flex items-start gap-3 px-1 py-0.5">
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground ${anim}`}>
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

        <div className="mt-5 flex w-full items-stretch justify-center gap-3">
          <div className="flex flex-1 flex-col items-center gap-0.5 rounded-xl border border-border bg-card px-2.5 py-2 text-center">
            <Zap className="icon-anim-zap size-3.5 text-accent" strokeWidth={2.5} />
            <span className="text-[0.75rem] font-bold leading-tight">
              {t("intro.stats.powerLabel")}
            </span>
            <span className="text-[0.6875rem] leading-tight text-muted-foreground">
              {t("intro.stats.powerSub")}
            </span>
          </div>
          <div className="flex flex-1 flex-col items-center gap-0.5 rounded-xl border border-border bg-card px-2.5 py-2 text-center">
            <Activity className="icon-anim-activity size-3.5 text-accent" strokeWidth={2.5} />
            <span className="text-[0.75rem] font-bold leading-tight">
              {t("intro.stats.simsLabel")}
            </span>
            <span className="text-[0.6875rem] leading-tight text-muted-foreground">
              {t("intro.stats.simsSub")}
            </span>
          </div>
        </div>

        <div className="mt-6 flex w-full items-stretch gap-2">
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
            <Link to="/nat">
              {t("intro.cta")}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <LanguageSelect />
        </div>
      </div>
    </div>
  );
}
