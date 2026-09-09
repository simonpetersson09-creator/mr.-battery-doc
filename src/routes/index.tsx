import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BatteryCharging, PiggyBank, Sun, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  { icon: BatteryCharging, key: "intro.points.capacity" },
  { icon: Gauge, key: "intro.points.power" },
  { icon: Sun, key: "intro.points.usage" },
  { icon: PiggyBank, key: "intro.points.economy" },
];

function Welcome() {
  const t = useT();
  return (
    <div className="app-shell surface-sun pt-safe pb-safe max-w-md justify-between px-5">
      <div className="flex flex-col items-center pt-10 text-center">
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
            className="ui-card flex items-center gap-4 rounded-2xl px-4 py-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Icon className="size-5" strokeWidth={2.5} />
            </span>
            <span className="ui-card-title">{t(key)}</span>
          </li>
        ))}
      </ul>

      <div className="pt-6">
        <Button
          asChild
          variant="cta"
          className="h-12 w-full rounded-[0.875rem] font-bold shadow-cta"
        >
          <Link to="/nat">
            {t("intro.cta")}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
