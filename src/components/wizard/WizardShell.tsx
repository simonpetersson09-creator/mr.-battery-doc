import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import { WIZARD_STEPS } from "./steps";
import { CardFlow } from "./cardFlow";
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
            >
              {children}
            </CardFlow>
          ) : (
            <div className={compact ? "mt-3 space-y-2" : "mt-4 space-y-3"}>{children}</div>
          )}
        </section>

        <nav className="pb-safe mt-auto pt-4" aria-label="Wizard navigation">
          <div className="flex gap-2">
            <Button asChild variant="outline" className={`h-10 flex-1 rounded-[0.75rem] text-[15px] font-semibold${navButtonClassName ? ` ${navButtonClassName}` : ""}`}>
              <Link to={prev}>{t("common.back")}</Link>
            </Button>
            {footerAction ? (
              footerAction
            ) : next ? (
              (() => {
                const totalNextSteps = WIZARD_STEPS.length - 1;
                const counter = `${stepIndex + 1}/${totalNextSteps}`;
                const pageDone = !nextDisabled;
                const badge = (
                  <span className="rounded-full bg-foreground/15 px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums">
                    {counter}
                  </span>
                );
                return (
                  <div className="flex flex-[2] flex-col">
                    {pageDone ? (
                      <div className="next-arrow mb-0.5 flex justify-center" aria-hidden="true">
                        <ChevronDown className="size-5 text-[var(--brand-yellow-cta)]" />
                      </div>
                    ) : null}
                    {nextDisabled ? (
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
                        className={`h-10 w-full rounded-[0.75rem] text-[15px] font-bold shadow-cta${navButtonClassName ? ` ${navButtonClassName}` : ""}`}
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
                className={`h-10 flex-[2] rounded-[0.75rem] text-[15px] font-bold shadow-cta${navButtonClassName ? ` ${navButtonClassName}` : ""}`}
              >
                <Link to="/">{t("common.done")}</Link>
              </Button>
            )}
          </div>
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
