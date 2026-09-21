/**
 * Full-screen "Simulerar" overlay shown while the battery simulation blocks.
 *
 * The calculation is synchronous and freezes the main thread for seconds on a
 * phone, so the progress ring MUST animate on the compositor thread (transform
 * only). The two-half rotation technique keeps moving while the engine runs.
 * The percentage number is NOT JS-driven (it would freeze); the ring fill IS
 * the progress signal, and it snaps to 100 % the instant the result is ready.
 */
import { useEffect, useState } from "react";
import { useT } from "@/i18n";

interface SimulatingOverlayProps {
  /** True while the simulation is running. */
  active: boolean;
  /** Set true when the computation finished — snaps the ring to 100 %. */
  done: boolean;
}

export function SimulatingOverlay({ active, done }: SimulatingOverlayProps) {
  const t = useT();
  // Keep the overlay mounted through the completion flash so the ring can
  // visibly reach 100 % before the navigation swaps the page.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active) setVisible(true);
    if (done) {
      const id = window.setTimeout(() => setVisible(false), 520);
      return () => window.clearTimeout(id);
    }
  }, [active, done]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--app-bg)] motion-reduce:hidden"
      role="status"
      aria-live="polite"
      aria-label={t("common.calculating")}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="radial-ring" aria-hidden="true">
          <div className="radial-track" />
          <div className="radial-fill-wrap">
            <div className={`radial-fill ${done ? "is-done" : ""}`} />
          </div>
          <div className="radial-mask-wrap">
            <div className={`radial-mask ${done ? "is-done" : ""}`} />
          </div>
          <div className="radial-inset">
            <span className="ui-page-title text-[1.05rem] font-bold tracking-[-0.02em]">
              {t("common.simulating")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
