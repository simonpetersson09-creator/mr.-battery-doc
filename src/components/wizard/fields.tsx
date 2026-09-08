import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export function SectionCard({
  title,
  description,
  children,
  action,
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="card-elevated p-4">
      {(title || action) && (
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {title ? (
              <h2 className="font-display text-[15px] font-bold tracking-tight">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {action}
        </div>
      )}
      {children ? <div className={title ? "mt-3 space-y-3" : "space-y-3"}>{children}</div> : null}
    </section>
  );
}

export function NumberField({
  label,
  unit,
  value,
  onChange,
  placeholder,
  hint,
  step,
}: {
  label: string;
  unit?: string;
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  hint?: string;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <div className="mt-1.5 flex items-center gap-2">
        <Input
          inputMode="decimal"
          type="number"
          step={step}
          className="h-12 rounded-2xl border-foreground/15 bg-surface-cream text-base font-semibold"
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
        {unit ? (
          <span className="w-24 shrink-0 text-[13px] font-medium text-muted-foreground">
            {unit}
          </span>
        ) : null}
      </div>
      {hint ? (
        <p className="mt-1.5 text-xs leading-snug text-muted-foreground">{hint}</p>
      ) : null}
    </label>
  );
}

export function OptionCard({
  title,
  description,
  selected,
  onSelect,
  icon,
}: {
  title: string;
  description?: string;
  selected: boolean;
  onSelect: () => void;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={
        "flex w-full items-start gap-3 rounded-[22px] p-3.5 text-left transition-colors " +
        (selected ? "chip-selected" : "chip-unselected")
      }
    >
      {icon ? <span className="mt-0.5">{icon}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{title}</span>
        {description ? (
          <span className="mt-0.5 block text-[13px] leading-snug text-foreground/65">
            {description}
          </span>
        ) : null}
      </span>
      <span
        className={
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors " +
          (selected
            ? "border-foreground/45 bg-foreground text-background"
            : "border-foreground/25 bg-transparent")
        }
      >
        {selected ? <Check className="size-3" /> : null}
      </span>
    </button>
  );
}

export function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className={
        "flex items-start justify-between gap-3 rounded-[22px] p-3.5 transition-colors " +
        (checked ? "chip-selected" : "chip-unselected")
      }
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{title}</p>
        {description ? (
          <p className="mt-1 text-[13px] leading-snug text-foreground/65">{description}</p>
        ) : null}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="mt-0.5 data-[state=checked]:bg-foreground"
      />
    </div>
  );
}

/* The photo/file picker was removed in v1: document parsing is not implemented,
   so it would only be a dead end. State/types remain for a future parser. */
