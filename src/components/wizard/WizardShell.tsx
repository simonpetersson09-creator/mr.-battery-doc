import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { WIZARD_STEPS } from "./steps";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";
import logo from "@/assets/mr-battery-doc-logo.png.asset.json";

interface WizardShellProps {
  stepIndex: number;
  title: string;
  intro?: string;
  children: ReactNode;
  nextLabel?: string;
  nextDisabled?: boolean;
  /** Shown above the buttons when the step is incomplete. */
  nextBlockedReason?: string | null;
  /** Replaces the "Next" button on the last step. */
  footerAction?: ReactNode;
  /** Tighter card spacing and page padding for dense steps. */
  compact?: boolean;
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
  compact,
}: WizardShellProps) {
  const t = useT();
  // Both back affordances follow the wizard's own step order.
  const prev = stepIndex > 0 ? WIZARD_STEPS[stepIndex - 1]!.path : "/";
  const next = stepIndex < WIZARD_STEPS.length - 1 ? WIZARD_STEPS[stepIndex + 1]!.path : null;

  return (
    <div className="app-shell surface-sun">
      <main className="pt-safe flex-1 px-4 pb-4">
        <div className="flex items-center justify-between pt-1">
          <h1 className="ui-page-title">{title}</h1>
          <Link to="/" className="flex items-center">
            <img
              src={logo.url}
              alt="Mr. Battery Doc"
              className="h-11 w-auto"
              width={1536}
              height={1024}
            />
          </Link>
        </div>
        <StepIndicator stepIndex={stepIndex} />

        <section className="mt-2">
          <p className="ui-caption">
            {t("common.step", { current: stepIndex + 1, total: WIZARD_STEPS.length })}
          </p>
          {intro ? <p className="ui-help mt-1">{intro}</p> : null}
          <div className={compact ? "mt-3 space-y-2" : "mt-4 space-y-3"}>{children}</div>
        </section>

        <nav className="pb-safe mt-4 pt-1" aria-label={t("common.step", { current: stepIndex + 1, total: WIZARD_STEPS.length })}>
          {nextDisabled && nextBlockedReason ? (
            <p className="ui-help mb-2" role="status">
              {nextBlockedReason}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button asChild variant="outline" className="h-12 flex-1 rounded-[0.875rem]">
              <Link to={prev}>{t("common.back")}</Link>
            </Button>
            {footerAction ? (
              footerAction
            ) : next ? (
              nextDisabled ? (
                <Button
                  variant="cta"
                  className="h-12 flex-[2] rounded-[0.875rem] font-bold shadow-cta"
                  disabled
                  aria-disabled="true"
                >
                  {nextLabel ?? t("common.next")}
                  <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button
                  asChild
                  variant="cta"
                  className="h-12 flex-[2] rounded-[0.875rem] font-bold shadow-cta"
                >
                  <Link to={next}>
                    {nextLabel ?? t("common.next")}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              )
            ) : (
              <Button
                asChild
                variant="cta"
                className="h-12 flex-[2] rounded-[0.875rem] font-bold shadow-cta"
              >
                <Link to="/">{t("common.done")}</Link>
              </Button>
            )}
          </div>
        </nav>
      </main>
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
