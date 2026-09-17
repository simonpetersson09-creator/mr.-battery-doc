import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BatteryFull, Settings, TrendingUp, Wallet, Zap, Activity } from "lucide-react";
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
  { icon: BatteryFull, key: "intro.points.capacity" },
  { icon: TrendingUp, key: "intro.points.economy" },
  { icon: Wallet, key: "intro.points.investment" },
];

function Welcome() {
  const t = useT();
  return (
    <div className="app-shell surface-sun min-h-dvh max-w-md flex flex-col px-5 pt-safe pb-safe">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <h1 className="sr-only">Mr. Battery Doc</h1>
        <img
          src={logo}
          alt="Mr. Battery Doc"
          className="w-full max-w-[8.5rem]"
          width={480}
          height={320}
        />
        <h2 className="mt-4 text-[1.375rem] font-bold leading-tight tracking-tight">
          {t("intro.title")}
        </h2>
        <p className="mt-1.5 max-w-[20rem] text-[0.8125rem] leading-snug text-muted-foreground">
          {t("intro.subtitle")}
        </p>

        <ul className="mt-5 w-full space-y-2.5 text-left">
          {POINTS.map(({ icon: Icon, key }) => (
            <li key={key} className="flex items-start gap-3 px-1 py-0.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Icon className="size-4" strokeWidth={2.5} />
              </span>
              <span className="flex flex-col gap-0.5 pt-0.5">
                <span className="text-[0.875rem] font-semibold leading-tight">
                  {t(`${key}.title`)}
                </span>
                <span className="text-[0.75rem] leading-snug text-muted-foreground">
                  {t(`${key}.desc`)}
                </span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex w-full items-stretch justify-center gap-3">
          <div className="flex flex-1 flex-col items-center gap-1 rounded-xl border border-border bg-card px-2.5 py-2.5 text-center">
            <Zap className="size-4 text-accent" strokeWidth={2.5} />
            <span className="text-[0.875rem] font-bold leading-tight">
              {t("intro.stats.powerLabel")}
            </span>
            <span className="text-[0.6875rem] leading-tight text-muted-foreground">
              {t("intro.stats.powerSub")}
            </span>
          </div>
          <div className="flex flex-1 flex-col items-center gap-1 rounded-xl border border-border bg-card px-2.5 py-2.5 text-center">
            <Activity className="size-4 text-accent" strokeWidth={2.5} />
            <span className="text-[0.875rem] font-bold leading-tight">
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
            variant="cta"
            aria-label={t("settings.title")}
            className="h-12 w-12 shrink-0 rounded-[0.875rem] shadow-cta"
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
