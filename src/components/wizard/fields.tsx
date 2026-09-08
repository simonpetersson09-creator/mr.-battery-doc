import type { ReactNode } from "react";
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
    <section className="card-surface p-3">
      {(title || action) && (
        <div className="flex items-start justify-between gap-2">
          <div>
            {title ? <h2 className="text-[15px] font-semibold">{title}</h2> : null}
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
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
      <div className="mt-1 flex items-center gap-2">
        <Input
          inputMode="decimal"
          type="number"
          step={step}
          className="h-10 rounded-xl text-[15px]"
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
        {unit ? (
          <span className="w-24 shrink-0 text-sm text-muted-foreground">{unit}</span>
        ) : null}
      </div>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
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
      className={
        "flex w-full items-start gap-2.5 rounded-2xl border p-3 text-left transition-colors " +
        (selected
          ? "border-primary bg-primary-soft"
          : "border-border bg-card active:bg-secondary")
      }
    >
      {icon ? <span className="mt-0.5 text-primary">{icon}</span> : null}
      <span className="flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        {description ? (
          <span className="mt-0.5 block text-[13px] text-muted-foreground">{description}</span>
        ) : null}
      </span>
      <span
        className={
          "mt-0.5 size-4.5 shrink-0 rounded-full border-2 " +
          (selected ? "border-primary bg-primary" : "border-input")
        }
      />
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
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card p-3">
      <div className="flex-1">
        <p className="text-sm font-semibold">{title}</p>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="mt-0.5" />
    </div>
  );
}

/**
 * Photo / file capture UI. Document interpretation is NOT implemented yet —
 * files are only registered with metadata and marked as pending parsing.
 */
export function AttachmentPicker({
  label,
  hint,
  attachments,
  onChange,
}: {
  label: string;
  hint: string;
  attachments: AttachmentMeta[];
  onChange: (next: AttachmentMeta[]) => void;
}) {
  function add(files: FileList | null, kind: AttachmentMeta["kind"]) {
    if (!files) return;
    const next = Array.from(files).map((f) => ({
      id: `${Date.now()}-${f.name}`,
      name: f.name,
      size: f.size,
      kind,
      status: "pending-parsing" as const,
    }));
    onChange([...attachments, ...next]);
  }

  return (
    <div>
      <span className="field-label">{label}</span>
      <div className="mt-1.5 grid grid-cols-2 gap-2">
        <label className="flex h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-input bg-secondary/50 text-[13px] font-medium active:bg-secondary">
          <Camera className="size-5 text-primary" />
          Ta foto
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => add(e.target.files, "image")}
          />
        </label>
        <label className="flex h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-input bg-secondary/50 text-[13px] font-medium active:bg-secondary">
          <Paperclip className="size-5 text-primary" />
          Bifoga fil
          <input
            type="file"
            accept="image/*,application/pdf,.csv,.xlsx"
            className="hidden"
            onChange={(e) => add(e.target.files, "file")}
          />
        </label>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
      {attachments.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-secondary px-3 py-2 text-xs"
            >
              <span className="truncate">{a.name}</span>
              <button
                type="button"
                className="shrink-0 text-muted-foreground underline"
                onClick={() => onChange(attachments.filter((x) => x.id !== a.id))}
              >
                Ta bort
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
