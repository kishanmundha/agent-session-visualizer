"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Floating "back to top" affordance for the long event/log views. */
export function ScrollToTop({ threshold = 600 }: { threshold?: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Back to top"
            tabIndex={visible ? 0 : -1}
            className={cn(
              "fixed bottom-6 right-6 z-30 inline-flex size-10 items-center justify-center rounded-full",
              "border border-border bg-card text-muted-foreground shadow-lg backdrop-blur",
              "transition-all hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              visible
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-2 opacity-0",
            )}
          >
            <ArrowUp className="size-4" aria-hidden />
          </button>
        }
      />
      <TooltipContent side="left">Back to top</TooltipContent>
    </Tooltip>
  );
}
