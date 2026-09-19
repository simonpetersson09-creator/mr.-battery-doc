/**
 * Count-up hook with ease-out curve and reduced-motion guard.
 *
 * Presentation only — no physics, no economics, no sizing.
 */
import { useEffect, useRef, useState } from "react";
import { formatNumber } from "@/i18n";

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Counts from 0 to `target` over `duration` ms with an ease-out curve.
 * Respects prefers-reduced-motion (jumps to target immediately).
 * `done` becomes true once the count reaches the target.
 */
export function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const [done, setDone] = useState(false);
  const rafRef = useRef(0);
  const completedRef = useRef(false);

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      setValue(target);
      setDone(true);
      completedRef.current = true;
      return;
    }

    let start: number | null = null;

    const tick = (now: number) => {
      if (start === null) start = now;
      const progress = Math.min((now - start) / duration, 1);
      setValue(Math.round(easeOut(progress) * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else if (!completedRef.current) {
        setValue(target);
        setDone(true);
        completedRef.current = true;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return { value, done };
}

/** Formats a number in the current UI language locale (e.g. 800000 → "800 000" or "800,000"). */
export function formatStatNumber(value: number): string {
  return formatNumber(value);
}
