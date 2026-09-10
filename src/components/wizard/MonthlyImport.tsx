/**
 * Monthly import: file/image -> extraction -> review -> the caller's twelve fields.
 *
 * The component never writes to wizard state itself and never talks to the Battery
 * Engine. It hands twelve confirmed kWh values to `onApply`, which fills exactly the
 * same fields manual entry fills.
 */

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatNumber, useT } from "@/i18n";
import { monthShortLabels } from "@/i18n/labels";
import { extractMonthlyDocument } from "@/lib/import/extractMonthlyTransport";
import {
  IMPORT_ACCEPT,
  isTextImport,
  rejectionFor,
  resolveMimeType,
} from "@/lib/import/fileRules";
import {
  nativePickersAvailable,
  pickFrom,
  type PickedDocument,
  type PickerSource,
} from "@/lib/import/nativePicker";
import {
  ImageConversionError,
  prepareFileUpload,
  prepareImageUpload,
  textFromDataUrl,
} from "@/lib/import/prepareUpload";
import {
  extractFromText,
  reviewState,
  selectSeries,
  type ExtractionPayload,
  type NormalisedSeries,
  type SeriesKind,
} from "@/lib/import/monthly";
import { DecimalInput } from "./DecimalInput";


export function MonthlyImport({
  kind,
  description,
  onApply,
  onOpenChange,
}: {
  kind: Exclude<SeriesKind, "unknown">;
  description: string;
  onApply: (valuesKwh: number[], selfConsumptionPct?: number | null) => void;
  /** true while the picker/review overlay owns the month values. */
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useT();
  const months = monthShortLabels();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pickedName, setPickedName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<NormalisedSeries[] | null>(null);
  const [selfPct, setSelfPct] = useState<number | null>(null);
  const [values, setValues] = useState<(number | null)[] | null>(null);
  const [active, setActive] = useState<NormalisedSeries | null>(null);
  const [applied, setApplied] = useState(false);
  const native = nativePickersAvailable();

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

  /**
   * One analysis path for every source (web input, camera, photo library, Files).
   * On any failure the existing month values stay exactly as they were and the
   * loading state is always released.
   */
  const analyze = async (doc: PickedDocument & { text?: string }) => {
    setBusy(true);
    setError(null);
    setApplied(false);
    setPickedName(doc.name);
    try {
      let payload: ExtractionPayload;
      if (isTextImport(doc.name, doc.mimeType)) {
        payload = extractFromText(doc.text ?? textFromDataUrl(doc.dataUrl));
      } else {
        const upload = await prepareImageUpload(doc.dataUrl, doc.mimeType, doc.name);
        const result = await extractMonthlyDocument({
          dataUrl: upload.dataUrl,
          mimeType: upload.mimeType,
          fileName: doc.name,
        });
        if ("error" in result && result.error) {
          const code = (result as { errorCode?: string }).errorCode;
          const key = code
            ? `errors.import${code.charAt(0).toUpperCase()}${code.slice(1)}`
            : "errors.importUnreadable";
          const localized = t(key);
          setError(localized === key ? t("errors.importUnreadable") : localized);
          return;
        }
        payload = result;
      }

      setSelfPct(payload.selfConsumptionPct);
      const choice = selectSeries(payload, kind);
      if (choice.all.length === 0) {
        setError(t("errors.importNoData"));
      } else if (choice.preselected && !choice.needsChoice) {
        useSeries(choice.preselected);
      } else {
        setCandidates(choice.all);
      }
    } catch (err) {
      // A HEIC we could not convert is aborted here: nothing raw is ever uploaded.
      setError(t(err instanceof ImageConversionError ? "errors.importImageUnreadable" : "errors.importUnreadable"));
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (file: File) => {
    const mimeType = resolveMimeType(file.name, file.type);
    const rejection = rejectionFor({ name: file.name, mimeType, size: file.size });
    if (rejection) {
      setPickedName(file.name);
      setError(t(rejection === "tooLarge" ? "errors.importTooLarge" : "errors.importUnsupportedType"));
      return;
    }
    try {
      if (isTextImport(file.name, mimeType)) {
        await analyze({ name: file.name, mimeType, dataUrl: "", size: file.size, text: await file.text() });
        return;
      }
      const upload = await prepareFileUpload(file);
      await analyze({
        name: file.name,
        mimeType: upload.mimeType,
        dataUrl: upload.dataUrl,
        size: file.size,
      });
    } catch (err) {
      setError(t(err instanceof ImageConversionError ? "errors.importImageUnreadable" : "errors.importUnreadable"));
      setBusy(false);
    }
  };

  /** Camera / photo library / Files inside the iOS app. */
  const handleNativePick = async (source: PickerSource) => {
    if (busy) return;
    setError(null);
    const outcome = await pickFrom(source);
    switch (outcome.status) {
      case "picked":
        await analyze(outcome.file);
        return;
      case "cancelled":
        return;
      case "denied":
      case "restricted":
        setError(
          t(
            source === "camera"
              ? "errors.importCameraDenied"
              : source === "photos"
                ? "errors.importPhotosDenied"
                : "errors.importFilesDenied",
          ),
        );
        return;
      case "unsupported":
        setError(t("errors.importPickerUnavailable"));
        return;
      case "tooLarge":
        setError(t("errors.importTooLarge"));
        return;
      case "unsupportedType":
        setError(t("errors.importUnsupportedType"));
        return;
      default:
        setError(t("errors.importUnreadable"));
    }
  };


  const review = values ? reviewState(values) : null;

  const importIcon = (
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
  );

  const label = busy
    ? t("monthlyImport.reading")
    : applied
      ? t("monthlyImport.reimport")
      : t("monthlyImport.import");

  return (
    <div className="space-y-2">
      {native ? (
        <div className="space-y-2">
          <Button
            type="button"
            variant="ghost"
            className="cta-primary w-full"
            disabled={busy}
            onClick={() => void handleNativePick("camera")}
          >
            {importIcon}
            {busy ? label : t("monthlyImport.takePhoto")}
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={busy}
              onClick={() => void handleNativePick("photos")}
            >
              {t("monthlyImport.choosePhoto")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={busy}
              onClick={() => void handleNativePick("files")}
            >
              {t("monthlyImport.chooseFile")}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          className="cta-primary w-full"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {importIcon}
          {label}
        </Button>
      )}
      {pickedName && !applied ? (
        <p className="ui-help text-foreground truncate text-center">{pickedName}</p>
      ) : null}
      {applied ? (
        <p className="ui-help text-foreground text-center">{t("monthlyImport.applied")}</p>
      ) : (
        <p className="ui-help text-center">{description}</p>
      )}
      {error ? <p className="ui-help text-destructive text-center">{error}</p> : null}

      <input
        ref={inputRef}
        type="file"
        accept={IMPORT_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />


      {candidates ? (
        <div className="ui-card space-y-2">
          <p className="ui-card-title">{t("monthlyImport.chooseSeriesTitle")}</p>
          <p className="ui-help">
            {t("monthlyImport.chooseSeriesText", {
              kind: t(
                kind === "consumption"
                  ? "monthlyImport.kindConsumption"
                  : "monthlyImport.kindProduction",
              ),
            })}
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
              <span className="tabular-nums">{formatNumber(s.sumKwh)} kWh</span>
            </Button>
          ))}
          <Button type="button" variant="ghost" className="w-full" onClick={close}>
            {t("common.cancel")}
          </Button>
        </div>
      ) : null}

      {review ? (
        <div className="ui-card space-y-3">
          <p className="ui-card-title">{t("monthlyImport.reviewTitle")}</p>
          {active?.label ? <p className="ui-caption">{active.label}</p> : null}
          {review.missing.length > 0 ? (
            <p className="ui-help text-destructive">
              {t("monthlyImport.missingMonths", { read: 12 - review.missing.length })}
            </p>
          ) : null}
          {active?.annualMismatch ? (
            <p className="ui-help text-destructive">{t("monthlyImport.annualMismatch")}</p>
          ) : null}
          {selfPct !== null ? (
            <p className="ui-help">{t("monthlyImport.selfPctFound", { pct: selfPct })}</p>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            {months.map((m, i) => {
              const missing = review.missing.includes(i);
              return (
                <label key={m} className="flex items-center gap-1.5">
                  <span className="field-label w-8 shrink-0 font-normal">{m}</span>
                  <DecimalInput
                    ariaLabel={m}
                    placeholder="kWh"
                    value={values?.[i] ?? null}
                    onChange={(v) =>
                      setValues((prev) => {
                        const next = [...(prev ?? Array(12).fill(null))];
                        next[i] = v;
                        return next;
                      })
                    }
                    className={`ui-control ui-control-sm h-9 min-w-0 flex-1 tabular-nums ${
                      missing ? "border-destructive" : ""
                    }`}
                  />
                </label>
              );
            })}
          </div>

          <p className="ui-help">
            {t("monthlyImport.sum")}{" "}
            <span className="tabular-nums">{formatNumber(review.sumKwh)}</span> kWh
          </p>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="cta"
              className="flex-1"
              disabled={!review.ok}
              onClick={() => {
                onApply(review.values.map((v) => v as number), selfPct);
                setApplied(true);
                close();
              }}
            >
              {t("monthlyImport.apply")}
            </Button>
            <Button type="button" variant="outline" className="flex-1" onClick={close}>
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
