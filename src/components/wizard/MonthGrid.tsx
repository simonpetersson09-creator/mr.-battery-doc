/**
 * Twelve compact month inputs + an automatically calculated sum.
 *
 * Presentation only: the sum is derived output, never an editable field, and the
 * values are the single source of truth handed back through `onChange`.
 */

import { formatNumber, useT } from "@/i18n";
import { monthShortLabels } from "@/i18n/labels";

export function MonthGrid({
  values,
  onChange,
}: {
  values: (number | null)[];
  onChange: (index: number, value: number | null) => void;
}) {
  const t = useT();
  const months = monthShortLabels();
  const sum = values.reduce<number>((a, b) => a + (b ?? 0), 0);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
        {months.map((m, i) => (
          <label key={m} className="flex items-center gap-1.5">
            <span className="field-label w-8 shrink-0 font-normal">{m}</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="kWh"
              value={values[i] ?? ""}
              onChange={(e) => onChange(i, e.target.value === "" ? null : Number(e.target.value))}
              className="ui-control h-9 min-w-0 flex-1 tabular-nums"
            />
          </label>
        ))}
      </div>
      <p className="ui-help">
        {t("monthlyImport.sum")}{" "}
        <span className="tabular-nums text-foreground">{formatNumber(sum)}</span> kWh
      </p>
    </div>
  );
}
