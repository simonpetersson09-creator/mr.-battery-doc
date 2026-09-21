import * as React from "react";
import { Slider } from "@/components/ui/slider";

/**
 * Slider with discrete green triangle markers at the boundaries of a
 * "common range" — no band, just two small ▼ marks on the track at
 * commonMin and commonMax. Pure presentation; markers render behind the
 * Radix track so the filled range and thumb always paint on top.
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
  const leftPct = ((commonMin - min) / span) * 100;
  const rightPct = ((commonMax - min) / span) * 100;
  const centerPct = (leftPct + rightPct) / 2;
  return (
    <div className={`relative ${className ?? ""}`}>
      {/* "Vanligast" label, centered between the two markers */}
      {label ? (
        <span
          className="pointer-events-none absolute -top-4 -translate-x-1/2 text-[10px] font-semibold text-emerald-600/90 whitespace-nowrap"
          style={{ left: `${centerPct}%` }}
        >
          {label}
        </span>
      ) : null}
      {/* green triangle markers at the common-range boundaries */}
      {[leftPct, rightPct].map((pct, i) => (
        <span
          key={i}
          className="pointer-events-none absolute top-0 -translate-x-1/2"
          style={{ left: `${pct}%` }}
        >
          <svg width="8" height="5" viewBox="0 0 8 5" fill="none" aria-hidden="true">
            <path d="M4 5L0 0H8L4 5Z" fill="#10b981" fillOpacity="0.7" />
          </svg>
        </span>
      ))}
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
