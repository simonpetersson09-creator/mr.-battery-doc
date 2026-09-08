import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BatteryCharging, Gauge, PiggyBank, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  { icon: BatteryCharging, text: "Hur stort batteri i kWh som passar din fastighet" },
  { icon: Gauge, text: "Vilken effekt i kW du behöver" },
  { icon: Sun, text: "Hur batteriet kan användas i vardagen" },
  { icon: PiggyBank, text: "Vilken nytta batteriet kan skapa" },
];

function Welcome() {
  return (
    <div className="app-shell surface-sun pt-safe pb-safe max-w-md justify-between px-6">
      <div className="pt-6">
        <div className="flex size-14 items-center justify-center rounded-[20px] bg-accent text-accent-foreground shadow-[var(--shadow-card)]">
          <BatteryCharging className="size-7" />
        </div>
        <h1 className="mt-5 font-display text-4xl leading-[1.05] font-extrabold tracking-tight ink-gloss">
          Mr. Battery
          <br />
          Doc
        </h1>
        <p className="mt-3 text-[15px] leading-snug text-muted-foreground">
          Svara på några enkla frågor om din fastighet, så visar vi vilket batteri som passar dig.
        </p>

        <ul className="mt-6 space-y-2.5">
          {POINTS.map(({ icon: Icon, text }) => (
            <li key={text} className="card-elevated flex items-center gap-3 p-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                <Icon className="size-4.5" />
              </span>
              <span className="text-sm font-semibold">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="pt-8">
        <Button
          asChild
          variant="cta"
          className="h-auto w-full rounded-[24px] py-4 text-base font-bold shadow-cta"
        >
          <Link to="/nat">
            Kom igång
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Tar ungefär tre minuter. Dina svar sparas medan du fyller i.
        </p>
      </div>
    </div>
  );
}
