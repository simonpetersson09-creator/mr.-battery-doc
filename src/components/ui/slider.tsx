import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

type SliderProps = React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
  /** Label shown in the floating chip above the thumb. When omitted the chip is hidden. */
  valueLabel?: string;
};

const Slider = React.forwardRef<React.ElementRef<typeof SliderPrimitive.Root>, SliderProps>(
  ({ className, valueLabel, ...props }, ref) => (
    <SliderPrimitive.Root
      ref={ref}
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1 w-full grow overflow-visible rounded-full bg-brand-black/10">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-[linear-gradient(90deg,var(--brand-yellow-selected),var(--brand-yellow))] shadow-[inset_0_1px_0_oklch(1_0_0/0.35)]" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="relative block size-[18px] rounded-full border-2 border-brand-yellow bg-card shadow-[0_2px_6px_oklch(0.3172_0_0/0.25),inset_0_1px_0_oklch(1_0_0/0.8)] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-110 disabled:pointer-events-none disabled:opacity-50">
        {valueLabel ? (
          <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-yellow px-2 py-0.5 text-xs font-bold tabular-nums text-brand-black shadow-md">
            {valueLabel}
          </span>
        ) : null}
      </SliderPrimitive.Thumb>
    </SliderPrimitive.Root>
  ),
);
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
