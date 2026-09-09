import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BatteryCharging, Gauge, PiggyBank, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      <div className="pt-5">
        <div className="flex size-12 items-center justify-center rounded-[1.125rem] bg-accent text-accent-foreground shadow-[var(--shadow-card)]">
          <BatteryCharging className="size-6" />
        </div>
        <h1 className="ink-gloss mt-3 font-display text-[2rem] leading-[1.05] font-extrabold tracking-tight">
          Mr. Battery
          <br />
          Doc
        </h1>
        <p className="ui-body mt-2 text-muted-foreground">{t("intro.lead")}</p>

        <ul className="mt-4 space-y-2">
          {POINTS.map(({ icon: Icon, key }) => (
            <li key={key} className="ui-card flex items-center gap-3 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[0.875rem] bg-accent text-accent-foreground">
                <Icon className="size-4.5" />
              </span>
              <span className="ui-label">{t(key)}</span>
            </li>
          ))}
        </ul>
      </div>

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
        <p className="ui-help mt-2 text-center">{t("intro.footnote")}</p>
      </div>
    </div>
  );
}
