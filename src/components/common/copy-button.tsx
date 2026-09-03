"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Status = "idle" | "copied" | "failed";

export function CopyButton({
  value,
  label = "Copy",
  className,
  children,
}: {
  value: string;
  label?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus("idle"), 1600);
  }

  const Icon = status === "copied" ? Check : status === "failed" ? X : Copy;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={copy}
            aria-label={label}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs transition-colors",
              "text-muted-foreground hover:bg-muted hover:text-foreground",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
              status === "copied" && "text-emerald-600 dark:text-emerald-400",
              status === "failed" && "text-destructive",
              className,
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {children}
          </button>
        }
      />
      <TooltipContent>
        {status === "copied" ? "Copied" : status === "failed" ? "Copy failed" : label}
      </TooltipContent>
    </Tooltip>
  );
}
