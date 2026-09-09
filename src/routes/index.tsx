import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BatteryFull, Gauge, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSelect } from "@/components/LanguageSelect";
import logo from "@/assets/mr-battery-doc-logo.png.asset.json";
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
  { icon: Gauge, key: "intro.points.usage" },
  { icon: TrendingUp, key: "intro.points.economy" },
  { icon: Wallet, key: "intro.points.investment" },
];

function Welcome() {
  const t = useT();
  return (
    <div className="app-shell surface-sun pt-safe pb-safe max-w-md justify-between px-5">
      <div className="flex flex-col items-center pt-16 text-center">
        <h1 className="sr-only">Mr. Battery Doc</h1>
        <img
          src={logo.url}
          alt="Mr. Battery Doc"
          className="w-full max-w-[11rem]"
          width={1536}
          height={1024}
        />
      </div>

      <ul className="mt-4 space-y-3">
        {POINTS.map(({ icon: Icon, key }) => (
          <li
            key={key}
            className="flex items-start gap-3 px-1 py-1"
          >
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

      <div className="flex items-stretch gap-2 pt-6">
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
  );
}
