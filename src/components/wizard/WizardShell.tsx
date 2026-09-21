import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { useState, type ReactNode } from "react";
import { WIZARD_STEPS } from "./steps";
import { CardFlow, clearFlowMemory } from "./cardFlow";
import { useWizard } from "@/state/wizard";
import { clearCalculationCache } from "@/lib/access/calculationCache";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";
import logo from "@/assets/mr-battery-doc-logo.png";

interface WizardShellProps {
  stepIndex: number;
  title: string;
  intro?: string;
  children: ReactNode;
  nextLabel?: string;
  nextDisabled?: boolean;
  /** Shown above the buttons when the step is incomplete. */
  nextBlockedReason?: string | null;
  /** Optional full-width action rendered below the back/next row (e.g. PDF report). */
  footerExtra?: ReactNode;
  /** Replaces the "Next" button on the last step. */
  footerAction?: ReactNode;
  /** Tighter card spacing and page padding for dense steps. */
  compact?: boolean;
  /** One-card-at-a-time flow: each card gets its own confirm button. */
  cardFlow?: boolean;
  /** Optional page-local typography overrides; defaults keep every other page unchanged. */
  titleClassName?: string;
  eyebrowClassName?: string;
  introClassName?: string;
  navButtonClassName?: string;
}

export function WizardShell({
  stepIndex,
  title,
  intro,
  children,
  nextLabel,
  nextDisabled,
  nextBlockedReason,
  footerAction,
  footerExtra,
  compact,
  cardFlow,
  titleClassName,
  eyebrowClassName,
  introClassName,
  navButtonClassName,
}: WizardShellProps) {
  const t = useT();
  const { reset } = useWizard();
  const navigate = useNavigate();
  const [confirmReset, setConfirmReset] = useState(false);
  const [flowProgress, setFlowProgress] = useState<{ done: number; total: number } | null>(null);
  // Both back affordances follow the wizard's own step order.
  const prev = stepIndex > 0 ? WIZARD_STEPS[stepIndex - 1]!.path : "/";
  const next = stepIndex < WIZARD_STEPS.length - 1 ? WIZARD_STEPS[stepIndex + 1]!.path : null;

  return (
    <div className="app-shell surface-sun">
      <main className="pt-safe flex flex-1 flex-col px-4 pb-4">
        <div className="flex items-center justify-between pt-1">
          <h1 className={titleClassName ?? "ui-page-title"}>{title}</h1>
          <Link to="/" className="flex items-center">
            <img
              src={logo}
              alt="Mr. Battery Doc"
              className="logo-float h-14 w-auto"
              width={480}
              height={320}
            />
          </Link>
        </div>
        <StepIndicator stepIndex={stepIndex} />

        <section className="mt-2">
          {cardFlow ? (
            <CardFlow
              className={compact ? "mt-3 space-y-2" : "mt-4 space-y-3"}
              onProgress={setFlowProgress}
              flowId={WIZARD_STEPS[stepIndex]?.path ?? String(stepIndex)}
            >
              {children}
            </CardFlow>
          ) : (
            <div className={compact ? "mt-3 space-y-2" : "mt-4 space-y-3"}>{children}</div>
          )}
        </section>

        <nav className="pb-safe mt-auto pt-4" aria-label="Wizard navigation">
          {confirmReset ? (
            <div className="mb-2 rounded-[1rem] border border-border bg-card px-3 py-2">
              <p className="text-[13px] font-semibold leading-snug">{t("settings.reset.confirm")}</p>
              <div className="mt-2 flex gap-2">
                <Button
                  variant="outline"
                  className="h-9 flex-1 rounded-[0.75rem] text-[13px] font-semibold"
                  onClick={() => setConfirmReset(false)}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  variant="cta"
                  className="h-9 flex-1 rounded-[0.75rem] text-[14px] font-bold"
                  onClick={() => {
                    clearCalculationCache();
                    clearFlowMemory();
                    reset();
                    setConfirmReset(false);
                    void navigate({ to: "/" });
                  }}
                >
                  {t("common.restart")}
                </Button>
              </div>
            </div>
          ) : null}
          {/* Row 1: Tillbaka + Börja om. Row 2: Nästa/Beräkna, full width. */}
          <div className="flex gap-2">
            <Button asChild variant="outline" className={`h-10 flex-1 rounded-[0.75rem] text-[15px] font-semibold${navButtonClassName ? ` ${navButtonClassName}` : ""}`}>
              <Link to={prev}>{t("common.back")}</Link>
            </Button>
            <Button
              variant="outline"
              className={`h-10 flex-1 rounded-[0.75rem] text-[15px] font-semibold${navButtonClassName ? ` ${navButtonClassName}` : ""}`}
              onClick={() => setConfirmReset(true)}
            >
              {t("common.restart")}
            </Button>
          </div>
          {footerAction ? (
            <div className="mt-2 [&>*]:w-full">{footerAction}</div>
          ) : next ? (
              (() => {
                // On card-flow pages the badge mirrors confirmed/total cards on
                // this page; elsewhere it keeps the wizard step counter.
                const counter = cardFlow && flowProgress
                  ? `${flowProgress.done}/${flowProgress.total}`
                  : `${stepIndex + 1}/${WIZARD_STEPS.length - 1}`;
                // The nudge arrow only appears once every card on the page is
                // confirmed and the step's own inputs are valid.
                const allCardsDone = !cardFlow || (flowProgress !== null && flowProgress.done === flowProgress.total);
                const pageDone = !nextDisabled && allCardsDone;
                const badge = (
                  <span className="rounded-full bg-foreground/15 px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums">
                    {counter}
                  </span>
                );
                return (
                  <div className="mt-2">
                     {nextDisabled || !allCardsDone ? (
                      <Button
                        variant="cta"
                        className={`h-10 w-full rounded-[0.75rem] text-[15px] font-bold shadow-cta${navButtonClassName ? ` ${navButtonClassName}` : ""}`}
                        disabled
                        aria-disabled="true"
                      >
                        {badge}
                        {nextLabel ?? t("common.next")}
                        <ArrowRight className="size-4" />
                      </Button>
                    ) : (
                      <Button
                        asChild
                        variant="cta"
                        className={`h-10 w-full rounded-[0.75rem] text-[15px] font-bold shadow-cta${pageDone ? " bg-[var(--done-fill)] text-[var(--done-foreground)] hover:bg-[var(--done-fill)]" : ""}${navButtonClassName ? ` ${navButtonClassName}` : ""}`}
                      >
                        <Link to={next}>
                          {badge}
                          {nextLabel ?? t("common.next")}
                          <Check className="size-4" />
                        </Link>
                      </Button>
                    )}
                  </div>
                );
              })()
            ) : (
              <Button
                asChild
                variant="cta"
                className={`mt-2 h-10 w-full rounded-[0.75rem] text-[15px] font-bold shadow-cta${navButtonClassName ? ` ${navButtonClassName}` : ""}`}
              >
                <Link to="/">{t("common.done")}</Link>
              </Button>
            )}
          {footerExtra ? <div className="mt-2">{footerExtra}</div> : null}
        </nav>
      </main>
    </div>
  );
}

function StepIndicator({ stepIndex }: { stepIndex: number }) {
  return (
    <div className="mt-1 flex items-center">
      {WIZARD_STEPS.map((step, i) => (
        <div key={step.path} className="flex flex-1 items-center last:flex-none">
          <span
            className={
              "flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold transition-[background-color,color,box-shadow,transform,border-color] duration-200 ease-out motion-reduce:transition-none " +
              (i < stepIndex
                ? "bg-foreground text-background"
                : i === stepIndex
                  ? "scale-110 bg-accent text-accent-foreground ring-4 ring-accent/25"
                  : "border-2 border-foreground/15 bg-transparent text-muted-foreground")
            }
          >
            {i === WIZARD_STEPS.length - 1 ? "R" : i + 1}
          </span>
          {i < WIZARD_STEPS.length - 1 ? (
            <span
              className={
                "mx-1 h-0.5 flex-1 rounded-full transition-colors duration-200 ease-out " +
                (i < stepIndex ? "bg-foreground" : "bg-foreground/12")
              }
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
