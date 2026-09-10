/**
 * Numeric input that accepts both "1,50" and "1.50".
 *
 * A plain <input type="number"> drops the value when the iPhone decimal keypad
 * inserts the locale comma, so every numeric field in the app uses this control
 * instead. It keeps the raw keystrokes in local state (so "1," survives while the
 * user is still typing) and reports the parsed number upwards exactly as before.
 */
import { useEffect, useRef, useState } from "react";

import { parseDecimalInput, sanitizeDecimalText } from "@/lib/platform/decimalInput";

export function DecimalInput({
  value,
  onChange,
  placeholder,
  className,
  step,
  ariaLabel,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  className?: string;
  /** Kept for API compatibility with the previous number input. */
  step?: string;
  ariaLabel?: string;
}) {
  const [text, setText] = useState(value === null || value === undefined ? "" : String(value));
  const focused = useRef(false);

  // Outside changes (defaults, country switch, import) refresh the field, but never
  // while the user is typing in it.
  useEffect(() => {
    if (focused.current) return;
    const next = value === null || value === undefined ? "" : String(value);
    setText((current) => (parseDecimalInput(current) === value ? current : next));
  }, [value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      enterKeyHint="done"
      data-step={step}
      aria-label={ariaLabel}
      className={className}
      value={text}
      placeholder={placeholder}
      onFocus={() => {
        focused.current = true;
      }}
      onBlur={() => {
        focused.current = false;
        const parsed = parseDecimalInput(text);
        setText(parsed === null ? "" : String(parsed));
      }}
      onChange={(e) => {
        const raw = sanitizeDecimalText(e.target.value);
        setText(raw);
        onChange(parseDecimalInput(raw));
      }}
    />
  );
}
