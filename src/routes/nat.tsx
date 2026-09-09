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
import { marketAreaOptions, type MarketArea } from "@/lib/reserve-market";
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
  const areaOptions = marketAreaOptions(state.grid.country);

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
          <SelectTrigger className="ui-control">
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

      {areaOptions.length > 0 ? (
        <SectionCard title="Elområde" description="Välj var i landet fastigheten ligger.">
          <Select
            value={state.grid.marketArea ?? ""}
            onValueChange={(v) =>
              update((s) => ({
                ...s,
                grid: { ...s.grid, marketArea: v as MarketArea },
              }))
            }
          >
            <SelectTrigger className="ui-control">
              <SelectValue placeholder="Välj elområde">
                {areaOptions.find((o) => o.value === state.grid.marketArea)?.label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {areaOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SectionCard>
      ) : null}

      <SectionCard title="Huvudsäkring" description="Finns oftast på elnätsfakturan.">
        <Select
          value={state.grid.mainFuseManual ? "custom" : String(state.grid.mainFuseA)}
          onValueChange={(v) =>
            update((s) => ({
              ...s,
              grid:
                v === "custom"
                  ? { ...s.grid, mainFuseManual: true }
                  : { ...s.grid, mainFuseA: Number(v), mainFuseManual: false },
            }))
          }
        >
          <SelectTrigger className="ui-control">
            <SelectValue>
              {state.grid.mainFuseManual ? "Annan" : `${state.grid.mainFuseA} A`}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {country.grid.commonMainFuses.map((a) => (
              <SelectItem key={a} value={String(a)}>
                {a} A
              </SelectItem>
            ))}
            <SelectItem value="custom">Annan</SelectItem>
          </SelectContent>
        </Select>

        {state.grid.mainFuseManual ? (
          <NumberField
            label="Annan huvudsäkring"
            unit="A"
            value={state.grid.mainFuseA}
            placeholder="Ange manuellt"
            onChange={(v) =>
              update((s) => ({
                ...s,
                grid: {
                  ...s.grid,
                  mainFuseA: v ?? country.grid.defaultMainFuse,
                  mainFuseManual: true,
                },
              }))
            }
          />
        ) : null}
      </SectionCard>

      <SectionCard
        title="Nätvärden"
        description="Automatiskt baserat på valt land."
      >
        <dl className="grid grid-cols-2 gap-2">
          <Value label="Spänning" value={`${country.grid.voltage} V`} />
          <Value label="Faser" value={`${country.grid.phases}-fas`} />
          <Value label="Frekvens" value={`${country.grid.frequency} Hz`} />
          <Value label="Valuta" value={country.economy.currency} />
        </dl>
        <p className="ui-help">Standarder: {country.grid.standards.join(", ")}</p>

        <label className="flex items-start gap-2.5 rounded-[1.25rem] px-3.5 py-3 transition-colors chip-unselected cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 accent-foreground"
            checked={state.grid.gridValuesConfirmed}
            onChange={(e) =>
              update((s) => ({
                ...s,
                grid: { ...s.grid, gridValuesConfirmed: e.target.checked },
              }))
            }
          />
          <span className="ui-label">Jag har kontrollerat att nätvärdena stämmer</span>
        </label>
      </SectionCard>

    </WizardShell>
  );
}

function Value({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[0.875rem] bg-secondary px-3 py-2">
      <dt className="ui-help">{label}</dt>
      <dd className="ui-label font-display">{value}</dd>
    </div>
  );
}

