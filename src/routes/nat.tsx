import { createFileRoute } from "@tanstack/react-router";
import { WizardShell } from "@/components/wizard/WizardShell";
import { NumberField, SectionCard } from "@/components/wizard/fields";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUPPORTED_COUNTRY_LIST, getCountry, type CountryCode } from "@/lib/country-config";
import { validateGridStep } from "@/lib/battery-app/stepValidation";
import { useWizard } from "@/state/wizard";

export const Route = createFileRoute("/nat")({
  head: () => ({
    meta: [
      { title: "Nät och huvudsäkring — Mr. Battery Doc" },
      {
        name: "description",
        content:
          "Välj land och ange huvudsäkring. Övriga nätvärden sätts automatiskt utifrån landet.",
      },
      { property: "og:title", content: "Nät och huvudsäkring — Mr. Battery Doc" },
      {
        property: "og:description",
        content: "Land, nätspänning, faser och huvudsäkring för din fastighet.",
      },
    ],
  }),
  component: GridStep,
});

function GridStep() {
  const { state, setCountry, update } = useWizard();
  const country = getCountry(state.grid.country);
  const validity = validateGridStep(state);

  return (
    <WizardShell
      stepIndex={0}
      title="Nät"
      intro="Börja med att välja land. Då sätts rätt nätvärden och standardpriser automatiskt."
      nextDisabled={!validity.ok}
      nextBlockedReason={validity.message}
    >
      <SectionCard title="Land" description="Var ligger fastigheten?">
        <Select
          value={state.grid.country}
          onValueChange={(v) => setCountry(v as CountryCode)}
        >
          <SelectTrigger className="h-12 w-full rounded-2xl border-foreground/15 bg-surface-cream text-base font-semibold">
            <SelectValue>
              {country.flag} {country.name}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_COUNTRY_LIST.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.flag} {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SectionCard>

      <SectionCard
        title="Huvudsäkring"
        description="Står oftast i elcentralen eller på elnätsfakturan."
      >
        <div className="flex flex-wrap gap-2">
          {country.grid.commonMainFuses.map((a) => {
            const active = !state.grid.mainFuseManual && state.grid.mainFuseA === a;
            return (
              <button
                key={a}
                type="button"
                onClick={() =>
                  update((s) => ({
                    ...s,
                    grid: { ...s.grid, mainFuseA: a, mainFuseManual: false },
                  }))
                }
                className={
                  "min-h-11 rounded-[14px] px-4 py-2 text-sm font-bold transition-colors " +
                  (active ? "chip-selected" : "chip-unselected")
                }
              >
                {a} A
              </button>
            );
          })}
        </div>
        <NumberField
          label="Annan huvudsäkring"
          unit="A"
          value={state.grid.mainFuseManual ? state.grid.mainFuseA : null}
          placeholder="Ange manuellt"
          onChange={(v) =>
            update((s) => ({
              ...s,
              grid: {
                ...s.grid,
                mainFuseA: v ?? country.grid.defaultMainFuse,
                mainFuseManual: v !== null,
              },
            }))
          }
        />
      </SectionCard>

      <SectionCard
        title="Nätvärden"
        description="Sätts automatiskt utifrån valt land."
      >
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Value label="Spänning" value={`${country.grid.voltage} V`} />
          <Value label="Faser" value={`${country.grid.phases}-fas`} />
          <Value label="Frekvens" value={`${country.grid.frequency} Hz`} />
          <Value label="Valuta" value={country.economy.currency} />
        </dl>
        <p className="text-xs text-muted-foreground">
          Standarder: {country.grid.standards.join(", ")}
        </p>
      </SectionCard>
    </WizardShell>
  );
}

function Value({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-secondary px-3 py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-display font-bold tracking-tight">{value}</dd>
    </div>
  );
}
