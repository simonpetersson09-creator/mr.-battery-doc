import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export function SectionCard({
  title,
  description,
  children,
  action,
  icon,
  compact,
  className,
  titleClassName,
  descriptionClassName,
  centerTitle,
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  compact?: boolean;
  /** Optional surface override (used by the result page colour hierarchy). */
  className?: string;
  /** Optional page-local typography overrides; defaults keep every other page unchanged. */
  titleClassName?: string;
  descriptionClassName?: string;
  /** Center the title/description block (used by the result page). */
  centerTitle?: boolean;
}) {
  return (
    <section
      className={
        (compact ? "ui-card ui-card-compact" : "ui-card") + (className ? ` ${className}` : "")
      }
    >
      {(title || description || action) && (
        <div className="flex items-start justify-between gap-2">
          <div className={"flex min-w-0 items-start gap-2" + (centerTitle ? " w-full justify-center text-center" : "")}>
            {icon ? (
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent [&_svg]:size-4">
                {icon}
              </span>
            ) : null}
            <div className="min-w-0">
              {title ? <h2 className={titleClassName ?? "ui-card-title"}>{title}</h2> : null}
              {description ? (
                <p className={descriptionClassName ?? (title ? "ui-help mt-0.5" : "ui-help")}>{description}</p>
              ) : null}
            </div>
          </div>
          {action}
        </div>
      )}
      {children ? (
        <div className={title || description ? (compact ? "mt-1.5 space-y-1.5" : "mt-3 space-y-3") : compact ? "space-y-1.5" : "space-y-3"}>{children}</div>
      ) : null}
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
  badge,
  dense,
  compact,
}: {
  label: string;
  unit?: string;
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  hint?: string;
  step?: string;
  /** Purely visual marker, e.g. "Standardvärde" / "Ditt värde". */
  badge?: string;
  /** Compact variant: unit is rendered under the input so the field fits a 2-column grid. */
  dense?: boolean;
  /** Smaller height + text to match compact month grids. */
  compact?: boolean;
}) {
  const suffix = unit ? (
    <span className="ui-control-text-sm pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-medium text-muted-foreground">
      {unit}
    </span>
  ) : null;

  const input = (
    <input
      inputMode="decimal"
      type="number"
      step={step}
      className={`ui-control tabular-nums ${compact ? "h-9 ui-control-text-sm" : ""} ${unit ? "pr-[4.5rem]" : ""}`}
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
    />
  );
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-2">
        <span className="ui-label">{label}</span>
        {badge ? (
          <span className="rounded-full bg-secondary px-2 py-0.5 ui-control-text-sm font-semibold text-muted-foreground">
            {badge}
          </span>
        ) : null}
      </span>
      {dense ? (
        <span className="relative mt-1 block">
          {input}
          {suffix}
        </span>
      ) : (
        <span className="mt-1.5 flex items-center gap-2">
          {input}
          {unit ? (
            <span className="ui-body w-[5.5rem] shrink-0 font-medium text-muted-foreground">
              {unit}
            </span>
          ) : null}
        </span>
      )}
      {hint ? <span className="ui-help mt-1 block">{hint}</span> : null}
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
        "flex w-full items-center gap-2.5 rounded-[1.25rem] px-3.5 py-3 text-left transition-colors " +
        (selected ? "chip-selected" : "chip-unselected")
      }
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="ui-label block">{title}</span>
        {description ? (
          <span className="ui-help mt-0.5 block text-foreground/65">{description}</span>
        ) : null}
      </span>
      <span
        className={
          "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors " +
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
        "flex items-center justify-between gap-3 rounded-[1.25rem] px-3.5 py-3 transition-colors " +
        (checked ? "chip-selected" : "chip-unselected")
      }
    >
      <div className="min-w-0 flex-1">
        <p className="ui-label">{title}</p>
        {description ? (
          <p className="ui-help mt-0.5 text-foreground/65">{description}</p>
        ) : null}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="shrink-0 data-[state=checked]:border-[oklch(0.3172_0_0/0.3)] data-[state=checked]:bg-[var(--brand-yellow)]"
      />
    </div>
  );
}

/* The photo/file picker was removed in v1: document parsing is not implemented,
   so it would only be a dead end. State/types remain for a future parser. */
