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
      <Slider
        value={value}
        min={min}
        max={max}
        aria-label={ariaLabel}
        onValueChange={onValueChange}
      />
      {/* green tick marks at the common-range boundaries — painted on
          top of the slider so they stay visible even under the filled track. */}
      {[leftPct, rightPct].map((pct, i) => (
        <span
          key={i}
          className="pointer-events-none absolute top-1/2 z-10 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/70"
          style={{ left: `${pct}%` }}
        />
      ))}
    </div>
  );
}
