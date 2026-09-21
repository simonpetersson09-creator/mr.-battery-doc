import {
  Children,
  Fragment,
  createContext,
  isValidElement,
  useContext,
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

export function CardFlow({ children, className }: { children: ReactNode; className?: string }) {
  const items = flatten(children);
  const [active, setActive] = useState(0);
  const [done, setDone] = useState<Set<number>>(() => new Set());
  const refs = useRef<Array<HTMLDivElement | null>>([]);

  const confirm = (index: number) => {
    setDone((prev) => new Set(prev).add(index));
    const next = index + 1;
    setActive((a) => (next > a ? next : a));
    if (next < items.length) {
      requestAnimationFrame(() => {
        refs.current[next]?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
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

  return (
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
  );
}
