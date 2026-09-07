import { Link, useRouter } from "@tanstack/react-router";
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
}

export function WizardShell({
  stepIndex,
  title,
  intro,
  children,
  nextLabel,
  nextDisabled,
}: WizardShellProps) {
  const router = useRouter();
  const prev = stepIndex > 0 ? WIZARD_STEPS[stepIndex - 1]!.path : "/";
  const next = stepIndex < WIZARD_STEPS.length - 1 ? WIZARD_STEPS[stepIndex + 1]!.path : null;


  return (
    <div className="app-shell">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <button
            onClick={() => router.history.back()}
            aria-label="Tillbaka"
            className="flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors active:bg-muted"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <BatteryCharging className="size-4 text-primary" />
            Mr. Battery Doc
          </div>
        </div>
        <StepIndicator stepIndex={stepIndex} />
      </header>

      <main className="flex-1 px-4 pt-5 pb-32">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {intro ? <p className="mt-1.5 text-sm text-muted-foreground">{intro}</p> : null}
        <div className="mt-5 space-y-4">{children}</div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[30rem] border-t border-border bg-background/95 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md">
        <div className="flex gap-3">
          <Button asChild variant="outline" size="lg" className="flex-1">
            <Link to={prev}>Tillbaka</Link>
          </Button>
          {next ? (
            <Button asChild size="lg" className="flex-[2]" disabled={nextDisabled}>
              <Link to={next} disabled={nextDisabled === true}>
                {nextLabel ?? "Nästa"}
                <ArrowRight className="size-4" />

              </Link>
            </Button>
          ) : (
            <Button asChild size="lg" className="flex-[2]">
              <Link to="/">Börja om</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ stepIndex }: { stepIndex: number }) {
  return (
    <div className="flex items-center gap-1.5 px-4 pb-3">
      {WIZARD_STEPS.map((step, i) => (
        <div key={step.path} className="flex flex-1 flex-col gap-1">
          <div
            className={
              "h-1 rounded-full transition-colors " +
              (i <= stepIndex ? "bg-primary" : "bg-border")
            }
          />
          <span
            className={
              "truncate text-[10px] font-medium " +
              (i === stepIndex ? "text-primary" : "text-muted-foreground")
            }
          >
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}
