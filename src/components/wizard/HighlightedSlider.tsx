import * as React from "react";
import { Slider } from "@/components/ui/slider";

/**
 * Slider with a subtle highlighted "common range" band drawn on the track.
 * Pure presentation — the band sits behind the Radix track so the filled
 * range and thumb always render on top.
 */
export function HighlightedSlider({
  min,
  max,
  commonMin,
  commonMax,
  label,
  value,
  onValueChange,
  className,
  "aria-label": ariaLabel,
}: {
  min: number;
  max: number;
  commonMin: number;
  commonMax: number;
  label?: string;
  value: number[];
  onValueChange: (v: number[]) => void;
  className?: string;
  "aria-label"?: string;
}) {
  const span = max - min || 1;
  const left = ((commonMin - min) / span) * 100;
  const width = ((commonMax - commonMin) / span) * 100;
  return (
    <div className={`relative ${className ?? ""}`}>
      {/* common-range label, centered above the band */}
      {label ? (
        <span
          className="pointer-events-none absolute -top-5 -translate-x-1/2 text-[10px] font-semibold text-emerald-600/90 whitespace-nowrap"
          style={{ left: `${left + width / 2}%` }}
        >
          {label}
        </span>
      ) : null}
      {/* common-range band, painted behind the slider track */}
      <span
        className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-emerald-500/40 ring-1 ring-inset ring-emerald-500/60"
        style={{ left: `${left}%`, width: `${width}%` }}
      />
      <Slider
        value={value}
        min={min}
        max={max}
        aria-label={ariaLabel}
        onValueChange={onValueChange}
      />
    </div>
  );
}
