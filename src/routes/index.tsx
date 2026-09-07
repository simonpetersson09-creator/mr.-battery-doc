import { createFileRoute, Link } from "@tanstack/react-router";
import { BatteryCharging, Gauge, PiggyBank, Sun } from "lucide-react";
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
    <div className="app-shell justify-between px-5 py-7">
      <div>
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-card)]">
          <BatteryCharging className="size-6" />
        </div>
        <h1 className="mt-4 text-3xl leading-tight font-bold tracking-tight">
          Mr. Battery Doc
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Svara på några enkla frågor om din fastighet, så visar vi vilket batteri som passar dig.
        </p>

        <ul className="mt-5 space-y-2">
          {POINTS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 card-surface p-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Icon className="size-4.5" />
              </span>
              <span className="text-sm font-medium">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="pt-6">
        <Button asChild className="h-12 w-full text-base">
          <Link to="/nat">Kom igång</Link>
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Tar ungefär tre minuter. Dina svar sparas medan du fyller i.
        </p>
      </div>
    </div>
  );
}
