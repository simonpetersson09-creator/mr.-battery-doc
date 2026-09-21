import {
  Children,
  Fragment,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { useT } from "@/i18n";

/**
 * One-card-at-a-time flow for the wizard steps.
 *
 * Presentation only: no validation, no engine state. Each card gets its own
 * "Next" button (yellow while pending, green once confirmed); cards further
 * down stay visible but dimmed and inert until the user reaches them.
 */
interface FlowValue {
  active: number;
  done: Set<number>;
  total: number;
  confirm: (index: number) => void;
}

const FlowContext = createContext<FlowValue | null>(null);
const CardIndexContext = createContext<number | null>(null);

/** Flatten fragments so a conditional <>two cards</> counts as two steps. */
function flatten(children: ReactNode): ReactNode[] {
  const out: ReactNode[] = [];
  for (const child of Children.toArray(children)) {
    if (isValidElement(child) && child.type === Fragment) {
      out.push(...flatten((child.props as { children?: ReactNode }).children));
    } else {
      out.push(child);
    }
  }
  return out;
}

/**
 * Session memory of confirmed cards, keyed by step path. Survives in-app
 * navigation (leaving a step and coming back) without touching the persisted
 * wizard schema. "Börja om" reloads the page, which clears it too.
 */
const flowMemory = new Map<string, number[]>();

export function CardFlow({
  children,
  className,
  onProgress,
  flowId,
}: {
  children: ReactNode;
  className?: string;
  /** Reports confirmed/total card counts so the page footer can mirror them. */
  onProgress?: (progress: { done: number; total: number }) => void;
  /** Stable id (step path) used to restore confirmed cards on return visits. */
  flowId?: string;
}) {
  const items = flatten(children);
  const [active, setActive] = useState(() => {
    if (!flowId) return 0;
    const restored = new Set(flowMemory.get(flowId) ?? []);
    for (let i = 0; i < items.length; i++) if (!restored.has(i)) return i;
    return Math.max(0, items.length - 1);
  });
  const [done, setDone] = useState<Set<number>>(() => {
    if (!flowId) return new Set();
    // Ignore stale indices if the card count changed since the last visit.
    return new Set((flowMemory.get(flowId) ?? []).filter((i) => i < items.length));
  });
  const refs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    if (flowId) flowMemory.set(flowId, [...done]);
    onProgress?.({ done: done.size, total: items.length });
  }, [done, items.length, onProgress, flowId]);

  const confirm = (index: number) => {
    const wasDone = done.has(index);
    setDone((prev) => {
      const next = new Set(prev);
      if (wasDone) {
        next.delete(index); // unlock — back to editing
      } else {
        next.add(index); // confirm — lock this card
      }
      return next;
    });
    if (wasDone) {
      // unlocking: bring the card back into view so the user can edit
      requestAnimationFrame(() => {
        refs.current[index]?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    } else {
      // confirming: advance to the next card
      const nxt = index + 1;
      setActive((a) => (nxt > a ? nxt : a));
      if (nxt < items.length) {
        requestAnimationFrame(() => {
          refs.current[nxt]?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      }
    }
  };

  return (
    <FlowContext.Provider value={{ active, done, total: items.length, confirm }}>
      <div className={className}>
        {items.map((item, i) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className={
              "transition-opacity duration-300 ease-out motion-reduce:transition-none " +
              (i > active ? "pointer-events-none opacity-40" : "opacity-100")
            }
            aria-hidden={i > active ? true : undefined}
          >
            <CardIndexContext.Provider value={i}>{item}</CardIndexContext.Provider>
          </div>
        ))}
      </div>
    </FlowContext.Provider>
  );
}

/**
 * True when the current card is confirmed/locked. SectionCard uses this to
 * disable its inputs until the user presses "Klar" again to reopen it.
 * Returns false outside a CardFlow.
 */
export function useCardLocked(): boolean {
  const flow = useContext(FlowContext);
  const index = useContext(CardIndexContext);
  if (!flow || index === null) return false;
  return flow.done.has(index);
}

/**
 * Rendered by SectionCard when it sits inside a CardFlow. Outside the flow this
 * returns null, so every other page keeps its current layout.
 */
export function CardFlowFooter() {
  const flow = useContext(FlowContext);
  const index = useContext(CardIndexContext);
  const t = useT();
  if (!flow || index === null) return null;

  const isDone = flow.done.has(index);
  const isLast = index === flow.total - 1;
  const isActive = flow.active === index;

  return (
    <>
      {/* Nudge arrow: only on the active card that hasn't been confirmed yet */}
      {isActive && !isDone ? (
        <div className="next-arrow mt-1 flex justify-center" aria-hidden="true">
          <ChevronDown className="size-5 text-[var(--brand-yellow-cta)]" />
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => flow.confirm(index)}
        className={
          "mt-1 flex h-9 w-full items-center justify-center gap-1.5 rounded-[0.75rem] text-[14px] font-bold transition-colors duration-300 ease-out active:scale-[0.99] motion-reduce:transition-none " +
          (isDone
            ? "bg-[var(--toggle-on)] text-white"
            : "bg-[var(--brand-yellow-cta)] text-[var(--brand-black)]")
        }
      >
        {isDone ? (
          <>
            {t("common.done")}
            <Check className="size-4" />
          </>
        ) : (
          <>
            {t("common.next")}
            {isLast ? <Check className="size-4" /> : <ArrowRight className="size-4" />}
          </>
        )}
      </button>
    </>
  );
}
