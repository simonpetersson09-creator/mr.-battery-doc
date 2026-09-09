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
import {
  SUPPORTED_COUNTRY_LIST,
  defaultFuseA,
  fuseOptions,
  getCountry,
  type CountryCode,
} from "@/lib/country-config";
import { marketAreaOptions, type MarketArea } from "@/lib/reserve-market";
import { validateGridStep } from "@/lib/battery-app/stepValidation";
import { useWizard } from "@/state/wizard";
import { useT } from "@/i18n";
import { countryName, marketAreaName } from "@/i18n/labels";

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
  const t = useT();
  const { state, setCountry, update } = useWizard();
  const country = getCountry(state.grid.country);
  const validity = validateGridStep(state);
  const areaOptions = marketAreaOptions(state.grid.country);

  return (
    <WizardShell
      stepIndex={0}
      title={t("network.title")}
      intro={t("network.intro")}
      nextDisabled={!validity.ok}
      nextBlockedReason={validity.message}
      compact
    >
      <SectionCard title={t("network.country.title")} description={t("network.country.description")}>
        <Select
          value={state.grid.country}
          onValueChange={(v) => setCountry(v as CountryCode)}
        >
          <SelectTrigger className="ui-control">
            <SelectValue>
              {country.flag} {countryName(state.grid.country)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_COUNTRY_LIST.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.flag} {countryName(c.code)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SectionCard>

      {areaOptions.length > 0 ? (
        <SectionCard title={t("network.area.title")} description={t("network.area.description")}>
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
              <SelectValue placeholder={t("network.area.placeholder")}>
                {state.grid.marketArea ? marketAreaName(state.grid.marketArea) : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {areaOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {marketAreaName(o.value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SectionCard>
      ) : null}

      <SectionCard title={t("network.fuse.title")} description={t("network.fuse.description")}>
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
              {state.grid.mainFuseManual
                ? t("network.fuse.otherWith", { amps: state.grid.mainFuseA })
                : `${state.grid.mainFuseA} A`}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {fuseOptions(state.grid.country).map((a) => (
              <SelectItem key={a} value={String(a)}>
                {a} A
              </SelectItem>
            ))}
            <SelectItem value="custom">{t("network.fuse.other")}</SelectItem>
          </SelectContent>
        </Select>

        {state.grid.mainFuseManual ? (
          <NumberField
            label={t("network.fuse.other")}
            unit="A"
            value={state.grid.mainFuseA}
            placeholder={t("network.fuse.manualPlaceholder")}
            onChange={(v) =>
              update((s) => ({
                ...s,
                grid: {
                  ...s.grid,
                  mainFuseA: v ?? defaultFuseA(s.grid.country),
                  mainFuseManual: true,
                },
              }))
            }
          />
        ) : null}
      </SectionCard>

      <SectionCard title={t("network.values.title")} description={t("network.values.description")}>
        <dl className="grid grid-cols-2 gap-2">
          <Value label={t("network.values.voltage")} value={`${country.grid.voltage} V`} />
          <Value
            label={t("network.values.phases")}
            value={t("units.phases", { count: country.grid.phases })}
          />
          <Value label={t("network.values.frequency")} value={`${country.grid.frequency} Hz`} />
          <Value label={t("network.values.currency")} value={country.economy.currency} />
        </dl>
        <p className="ui-help">
          {t("network.values.standards", { list: country.grid.standards.join(", ") })}
        </p>

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
          <span className="ui-label">{t("network.values.confirm")}</span>
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
