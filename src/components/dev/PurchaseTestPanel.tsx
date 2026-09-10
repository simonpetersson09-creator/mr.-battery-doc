/**
 * DEVELOPMENT-ONLY purchase test panel.
 *
 * Rendered from Settings, but only inside `import.meta.env.DEV`. The Settings
 * page imports it lazily behind that same guard, so the component never enters
 * a production bundle or DOM.
 */
import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_TEST_CONFIG,
  getTestConfig,
  isDevBuild,
  resetPurchaseTestState,
  setDevPremiumState,
  setTestConfig,
  subscribeTestConfig,
  type PremiumState,
  type PurchaseScenario,
  type PurchaseTestConfig,
  type RestoreScenario,
} from "@/lib/access/devTestMode";

const PURCHASE_SCENARIOS: PurchaseScenario[] = [
  "success",
  "cancelled",
  "pending",
  "failed",
  "verificationRejected",
  "verificationError",
];
const RESTORE_SCENARIOS: RestoreScenario[] = ["success", "nothing", "failed"];
const PREMIUM_STATES: PremiumState[] = ["off", "active", "expired"];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-2">
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</p>
      <div className="mt-1 flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${
        active ? "border-foreground bg-foreground text-background" : "border-border bg-card"
      }`}
    >
      {children}
    </button>
  );
}

export function PurchaseTestPanel() {
  const [cfg, setCfg] = useState<PurchaseTestConfig>(DEFAULT_TEST_CONFIG);

  useEffect(() => {
    setCfg(getTestConfig());
    return subscribeTestConfig(() => setCfg(getTestConfig()));
  }, []);

  const patch = useCallback((p: Partial<PurchaseTestConfig>) => setCfg(setTestConfig(p)), []);

  // Belt and braces: even if something imported this in a production build, it
  // renders nothing.
  if (!isDevBuild()) return null;

  return (
    <section
      data-testid="purchase-test-panel"
      className="mt-2 rounded-[1rem] border border-dashed border-foreground/40 bg-card px-3 py-2.5"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-[13px] font-bold">Purchase Test Mode (dev)</p>
        <button
          type="button"
          data-testid="purchase-test-toggle"
          onClick={() => patch({ enabled: !cfg.enabled })}
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
            cfg.enabled ? "bg-accent text-accent-foreground" : "bg-muted"
          }`}
        >
          {cfg.enabled ? "PÅ" : "AV"}
        </button>
      </div>
      <p className="mt-1 text-[10px] leading-relaxed opacity-70">
        Simulerar StoreKit lokalt. Finns aldrig i App Store-bygget.
      </p>

      <Row label="Rapportköp">
        {PURCHASE_SCENARIOS.map((s) => (
          <Chip key={s} active={cfg.report === s} onClick={() => patch({ report: s })}>
            {s}
          </Chip>
        ))}
      </Row>

      <Row label="Premium-köp">
        {PURCHASE_SCENARIOS.map((s) => (
          <Chip key={s} active={cfg.premium === s} onClick={() => patch({ premium: s })}>
            {s}
          </Chip>
        ))}
      </Row>

      <Row label="Återställ köp">
        {RESTORE_SCENARIOS.map((s) => (
          <Chip key={s} active={cfg.restore === s} onClick={() => patch({ restore: s })}>
            {s}
          </Chip>
        ))}
      </Row>

      <Row label="Premium-status (direkt)">
        {PREMIUM_STATES.map((s) => (
          <Chip
            key={s}
            active={false}
            onClick={() => {
              setDevPremiumState(s);
              window.location.reload();
            }}
          >
            {s}
          </Chip>
        ))}
      </Row>

      <Row label="StoreKit">
        <Chip
          active={cfg.storeKitUnavailable}
          onClick={() => patch({ storeKitUnavailable: !cfg.storeKitUnavailable })}
        >
          StoreKit unavailable
        </Chip>
      </Row>

      <button
        type="button"
        data-testid="purchase-test-reset"
        onClick={() => {
          resetPurchaseTestState();
          window.location.reload();
        }}
        className="mt-2 h-9 w-full rounded-[0.75rem] border border-border text-[13px] font-semibold"
      >
        Nollställ testköp och state
      </button>
    </section>
  );
}

export default PurchaseTestPanel;
