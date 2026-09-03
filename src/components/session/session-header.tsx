"use client";

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarDays,
  Clock,
  Database,
  GitBranch,
  MessageSquare,
  Sparkles,
  Timer,
  Wrench,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CopyButton } from "@/components/common/copy-button";
import {
  firstLine,
  formatCount,
  formatDuration,
  formatFullDateTime,
  timeAgo,
} from "@/lib/format";
import type { SessionMeta, SessionStats } from "./types";
import { cn } from "@/lib/utils";

function formatTokenValue(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

/** One metric in the stats strip. `tone` tints the token-flow tiles. */
function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone = "neutral",
}: {
  icon: typeof Zap;
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "input" | "output" | "cache";
}) {
  const toneCls = {
    neutral: "text-foreground",
    input: "text-blue-600 dark:text-blue-400",
    output: "text-indigo-600 dark:text-indigo-400",
    cache: "text-teal-600 dark:text-teal-400",
  }[tone];

  const tile = (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5">
      <Icon className={cn("size-3.5 shrink-0 opacity-70", toneCls)} aria-hidden />
      <div className="min-w-0">
        <div className={cn("font-mono text-xs font-semibold tabular-nums", toneCls)}>
          {value}
        </div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
      </div>
    </div>
  );

  if (!hint) return tile;
  return (
    <Tooltip>
      <TooltipTrigger render={tile} />
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  );
}

export function SessionHeader({
  meta,
  stats,
}: {
  meta: SessionMeta;
  stats?: SessionStats;
}) {
  const rawName = firstLine(meta.name);
  const title = meta.title ?? rawName;
  const subtitle = meta.title ? rawName : undefined;
  const totalTokens =
    (stats?.totalInputTokens ?? 0) + (stats?.totalOutputTokens ?? 0);

  return (
    <div className="border-b border-border bg-card/40">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold leading-tight text-foreground sm:text-xl">
              {title ?? (
                <span className="font-normal italic text-muted-foreground">
                  Unnamed session
                </span>
              )}
            </h1>
            {subtitle && (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {subtitle}
              </p>
            )}
            <div className="mt-1.5 flex items-center gap-1">
              <span className="truncate font-mono text-xs text-muted-foreground">
                {meta.id}
              </span>
              <CopyButton value={meta.id} label="Copy session id" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
            {meta.client_name && (
              <Badge variant="secondary">{meta.client_name}</Badge>
            )}
            {meta.host_type && <Badge variant="outline">{meta.host_type}</Badge>}
          </div>
        </div>

        {/* Context row */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {meta.repository && (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Database className="size-3.5 shrink-0 opacity-70" aria-hidden />
              <span className="truncate font-mono text-foreground/80">
                {meta.repository}
              </span>
            </span>
          )}
          {meta.branch && (
            <span className="inline-flex items-center gap-1.5">
              <GitBranch className="size-3.5 opacity-70" aria-hidden />
              <span className="font-mono">{meta.branch}</span>
            </span>
          )}
          {meta.created_at && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5 opacity-70" aria-hidden />
              {formatFullDateTime(meta.created_at)}
            </span>
          )}
          {meta.updated_at && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-3.5 opacity-70" aria-hidden />
                    Updated {timeAgo(meta.updated_at)}
                  </span>
                }
              />
              <TooltipContent>{formatFullDateTime(meta.updated_at)}</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Stats strip */}
        {stats && (
          <div className="mt-4 flex flex-wrap gap-2">
            {stats.totalInputTokens > 0 && (
              <StatTile
                icon={ArrowUpFromLine}
                tone="input"
                label="Input"
                value={formatTokenValue(stats.totalInputTokens)}
                hint={`${stats.totalInputTokens.toLocaleString()} input tokens`}
              />
            )}
            {stats.totalOutputTokens > 0 && (
              <StatTile
                icon={ArrowDownToLine}
                tone="output"
                label="Output"
                value={formatTokenValue(stats.totalOutputTokens)}
                hint={`${stats.totalOutputTokens.toLocaleString()} output tokens`}
              />
            )}
            {stats.totalCacheReadTokens > 0 && (
              <StatTile
                icon={Database}
                tone="cache"
                label="Cache read"
                value={formatTokenValue(stats.totalCacheReadTokens)}
                hint={`${stats.totalCacheReadTokens.toLocaleString()} tokens read from cache`}
              />
            )}
            {totalTokens > 0 && (
              <StatTile
                icon={Zap}
                label="Total"
                value={formatTokenValue(totalTokens)}
                hint="Input + output tokens"
              />
            )}
            {stats.totalUserMessages > 0 && (
              <StatTile
                icon={MessageSquare}
                label="Turns"
                value={formatCount(stats.totalUserMessages)}
              />
            )}
            {stats.totalToolCalls > 0 && (
              <StatTile
                icon={Wrench}
                label="Tool calls"
                value={formatCount(stats.totalToolCalls)}
              />
            )}
            {stats.totalPremiumRequests > 0 && (
              <StatTile
                icon={Sparkles}
                label="Premium req"
                value={String(stats.totalPremiumRequests)}
              />
            )}
            {stats.totalApiDurationMs > 0 && (
              <StatTile
                icon={Timer}
                label="API time"
                value={formatDuration(stats.totalApiDurationMs)}
                hint="Cumulative time spent waiting on the model API"
              />
            )}
            <StatTile
              icon={Zap}
              label="Events"
              value={formatCount(stats.eventCount)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
