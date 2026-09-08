import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BatteryCharging } from "lucide-react";
import type { ReactNode } from "react";
import { WIZARD_STEPS } from "./steps";
import { Button } from "@/components/ui/button";

interface WizardShellProps {
  stepIndex: number;
  title: string;
  intro?: string;
  children: ReactNode;
  nextLabel?: string;
  nextDisabled?: boolean;
  /** Shown above the buttons when the step is incomplete. */
  nextBlockedReason?: string | null;
  /** Replaces the "Nästa" button on the last step. */
  footerAction?: ReactNode;
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
}: WizardShellProps) {
  // Both back affordances follow the wizard's own step order.
  const prev = stepIndex > 0 ? WIZARD_STEPS[stepIndex - 1]!.path : "/";
  const next = stepIndex < WIZARD_STEPS.length - 1 ? WIZARD_STEPS[stepIndex + 1]!.path : null;

  return (
    <div className="app-shell surface-sun">
      <header className="pt-safe sticky top-0 z-20 px-4 pb-1.5 backdrop-blur-md">
        <div className="flex items-center gap-3 pt-1">
          <Link
            to={prev}
            aria-label="Tillbaka"
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-secondary"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <BatteryCharging className="size-4" />
            </span>
            <span className="truncate font-display text-sm font-bold tracking-tight">
              Mr. Battery Doc
            </span>
          </div>
        </div>
        <StepIndicator stepIndex={stepIndex} />
      </header>

      <main className="flex-1 px-4 pt-1 pb-32">
        <p className="ui-caption">
          Steg {stepIndex + 1} av {WIZARD_STEPS.length}
        </p>
        <h1 className="ui-page-title mt-1">{title}</h1>
        {intro ? <p className="ui-help mt-1">{intro}</p> : null}
        <div className="mt-4 space-y-3">{children}</div>
      </main>


      <div className="pb-safe fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[32rem] border-t border-border/70 bg-background/90 px-4 pt-2 backdrop-blur-md">
        {nextDisabled && nextBlockedReason ? (
          <p className="ui-help mb-2" role="status">
            {nextBlockedReason}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button asChild variant="outline" className="h-12 flex-1 rounded-[0.875rem] text-[15px]">
            <Link to={prev}>Tillbaka</Link>
          </Button>
          {footerAction ? (
            footerAction
          ) : next ? (
            nextDisabled ? (
              <Button
                variant="cta"
                className="h-12 flex-[2] rounded-[0.875rem] text-[15px] font-bold shadow-cta"
                disabled
                aria-disabled="true"
              >
                {nextLabel ?? "Nästa"}
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button
                asChild
                variant="cta"
                className="h-12 flex-[2] rounded-[0.875rem] text-[15px] font-bold shadow-cta"
              >
                <Link to={next}>
                  {nextLabel ?? "Nästa"}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            )
          ) : (
            <Button
              asChild
              variant="cta"
              className="h-12 flex-[2] rounded-[0.875rem] text-[15px] font-bold shadow-cta"
            >
              <Link to="/">Klar</Link>
            </Button>
          )}
        </div>
      </div>

    </div>
  );
}

function StepIndicator({ stepIndex }: { stepIndex: number }) {
  return (
    <div className="mt-3 flex items-center gap-1.5">
      {WIZARD_STEPS.map((step, i) => (
        <div
          key={step.path}
          className={
            "h-1.5 flex-1 rounded-full transition-colors " +
            (i < stepIndex
              ? "bg-foreground"
              : i === stepIndex
                ? "bg-accent"
                : "bg-foreground/12")
          }
        />
      ))}
    </div>
  );
}
