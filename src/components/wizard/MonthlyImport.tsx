/**
 * Monthly import: file/image -> extraction -> review -> the caller's twelve fields.
 *
 * The component never writes to wizard state itself and never talks to the Battery
 * Engine. It hands twelve confirmed kWh values to `onApply`, which fills exactly the
 * same fields manual entry fills.
 */

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MONTH_SHORT_SV } from "@/lib/consumption-profiles";
import { extractMonthlyFromDocument } from "@/lib/import/extractMonthly.functions";
import {
  extractFromText,
  missingMonthsMessage,
  reviewState,
  selectSeries,
  type ExtractionPayload,
  type NormalisedSeries,
  type SeriesKind,
} from "@/lib/import/monthly";

const TEXT_TYPES = /(csv|plain|tab-separated|text\/)/i;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error("read"));
    fr.onload = () => resolve(String(fr.result));
    fr.readAsDataURL(file);
  });
}

export function MonthlyImport({
  kind,
  description,
  onApply,
  onOpenChange,
}: {
  kind: Exclude<SeriesKind, "unknown">;
  description: string;
  onApply: (valuesKwh: number[]) => void;
  /** true while the picker/review overlay owns the month values. */
  onOpenChange?: (open: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<NormalisedSeries[] | null>(null);
  const [selfPct, setSelfPct] = useState<number | null>(null);
  const [values, setValues] = useState<(number | null)[] | null>(null);
  const [active, setActive] = useState<NormalisedSeries | null>(null);
  const [applied, setApplied] = useState(false);

  const open = !!(candidates || values);
  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  const close = () => {
    setValues(null);
    setCandidates(null);
    setActive(null);
    setError(null);
  };

  const useSeries = (s: NormalisedSeries) => {
    setActive(s);
    setValues(s.monthsKwh.slice(0, 12));
    setCandidates(null);
  };

  const handleFile = async (file: File) => {
    setBusy(true);
    setError(null);
    setApplied(false);
    try {
      let payload: ExtractionPayload;
      if (TEXT_TYPES.test(file.type) || /\.(csv|txt|tsv)$/i.test(file.name)) {
        payload = extractFromText(await file.text());
      } else {
        const dataUrl = await readAsDataUrl(file);
        const result = await extractMonthlyFromDocument({
          data: { dataUrl, mimeType: file.type || "image/jpeg", fileName: file.name },
        });
        if ("error" in result && result.error) {
          setError(result.error);
          setBusy(false);
          return;
        }
        payload = result;
      }

      setSelfPct(payload.selfConsumptionPct);
      const choice = selectSeries(payload, kind);
      if (choice.all.length === 0) {
        setError("Vi hittade ingen månadsdata i filen. Kontrollera att månaderna syns tydligt.");
      } else if (choice.preselected && !choice.needsChoice) {
        useSeries(choice.preselected);
      } else {
        setCandidates(choice.all);
      }
    } catch {
      setError("Filen kunde inte läsas. Försök med en tydligare bild eller en PDF.");
    } finally {
      setBusy(false);
    }
  };

  const review = values ? reviewState(values) : null;

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        <svg
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 16V4" />
          <path d="m7 9 5-5 5 5" />
          <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
        {busy
          ? "Läser dokumentet…"
          : applied
            ? "Importera på nytt"
            : "Importera månadsdata"}
      </Button>
      {applied ? (
        <p className="ui-help text-foreground">✓ 12 månaders värden importerade</p>
      ) : (
        <p className="ui-help">{description}</p>
      )}
      {error ? <p className="ui-help text-destructive">{error}</p> : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf,.csv,.txt,.tsv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />

      {candidates ? (
        <div className="ui-card space-y-2">
          <p className="ui-card-title">Vilken serie ska användas?</p>
          <p className="ui-help">
            Dokumentet innehåller flera serier. Välj den som gäller{" "}
            {kind === "consumption" ? "förbrukning" : "solproduktion"}.
          </p>
          {candidates.map((s, i) => (
            <Button
              key={`${s.label}-${i}`}
              type="button"
              variant="outline"
              className="w-full justify-between"
              onClick={() => useSeries(s)}
            >
              <span className="truncate">{s.label}</span>
              <span className="tabular-nums">{s.sumKwh.toLocaleString("sv-SE")} kWh</span>
            </Button>
          ))}
          <Button type="button" variant="ghost" className="w-full" onClick={close}>
            Avbryt
          </Button>
        </div>
      ) : null}

      {review ? (
        <div className="ui-card space-y-3">
          <p className="ui-card-title">Kontrollera importerade värden</p>
          {active?.label ? <p className="ui-caption">{active.label}</p> : null}
          {missingMonthsMessage(review.missing) ? (
            <p className="ui-help text-destructive">{missingMonthsMessage(review.missing)}</p>
          ) : null}
          {active?.annualMismatch ? (
            <p className="ui-help text-destructive">
              Summan av månadsvärdena skiljer sig från årsuppgiften i dokumentet. Kontrollera
              värdena innan du fortsätter.
            </p>
          ) : null}
          {selfPct !== null ? (
            <p className="ui-help">Dokumentet anger även {selfPct} % egenanvändning.</p>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            {MONTH_SHORT_SV.map((m, i) => {
              const missing = review.missing.includes(i);
              return (
                <label key={m} className="flex items-center gap-2">
                  <span className="field-label w-9 shrink-0">{m}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="kWh"
                    value={values?.[i] ?? ""}
                    onChange={(e) =>
                      setValues((prev) => {
                        const next = [...(prev ?? Array(12).fill(null))];
                        next[i] = e.target.value === "" ? null : Number(e.target.value);
                        return next;
                      })
                    }
                    className={`ui-control h-11 min-w-0 flex-1 tabular-nums ${
                      missing ? "border-destructive" : ""
                    }`}
                  />
                </label>
              );
            })}
          </div>

          <p className="ui-help">
            Summa: <span className="tabular-nums">{review.sumKwh.toLocaleString("sv-SE")}</span> kWh
          </p>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="cta"
              className="flex-1"
              disabled={!review.ok}
              onClick={() => {
                onApply(review.values.map((v) => v as number));
                setApplied(true);
                close();
              }}
            >
              Använd värden
            </Button>
            <Button type="button" variant="outline" className="flex-1" onClick={close}>
              Avbryt
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
