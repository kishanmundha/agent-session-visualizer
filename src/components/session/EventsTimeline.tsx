"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Braces,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Filter,
  Info,
  ListFilter,
  SearchX,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CopyButton } from "@/components/common/copy-button";
import { SearchInput } from "@/components/common/search-input";
import { cn } from "@/lib/utils";

interface CopilotEvent {
  type: string;
  data: Record<string, unknown>;
  id: string;
  timestamp: string;
  parentId: string | null;
}

interface Props {
  events: CopilotEvent[];
  focusRequest?: {
    nonce: number;
    categories?: string[];
    subKeys?: string[];
    search?: string;
  } | null;
}

// Per event type: display label plus light/dark-aware colour classes.
const EVENT_CONFIG: Record<string, {
  label: string;
  dotCls: string;      // circle dot
  typeCls: string;     // type label text color
}> = {
  "session.start": {
    label: "Session Start",
    dotCls: "bg-emerald-100 border-emerald-400 dark:bg-emerald-900/60 dark:border-emerald-700",
    typeCls: "text-emerald-700 dark:text-emerald-400",
  },
  "session.shutdown": {
    label: "Session Shutdown",
    dotCls: "bg-red-100 border-red-400 dark:bg-red-900/60 dark:border-red-700",
    typeCls: "text-red-700 dark:text-red-400",
  },
  "session.resume": {
    label: "Session Resume",
    dotCls: "bg-violet-100 border-violet-400 dark:bg-violet-900/60 dark:border-violet-700",
    typeCls: "text-violet-700 dark:text-violet-400",
  },
  "user.message": {
    label: "User Message",
    dotCls: "bg-violet-100 border-violet-400 dark:bg-violet-900/60 dark:border-violet-700",
    typeCls: "text-violet-700 dark:text-violet-400",
  },
  "assistant.message": {
    label: "Assistant",
    dotCls: "bg-sky-100 border-sky-400 dark:bg-sky-900/60 dark:border-sky-700",
    typeCls: "text-sky-700 dark:text-sky-400",
  },
  "assistant.turn_start": {
    label: "Turn Start",
    dotCls: "bg-cyan-100 border-cyan-400 dark:bg-cyan-900/60 dark:border-cyan-700",
    typeCls: "text-cyan-700 dark:text-cyan-400",
  },
  "assistant.turn_end": {
    label: "Turn End",
    dotCls: "bg-cyan-100 border-cyan-400 dark:bg-cyan-900/60 dark:border-cyan-700",
    typeCls: "text-cyan-700 dark:text-cyan-400",
  },
  "tool.execution_start": {
    label: "Tool Start",
    dotCls: "bg-amber-100 border-amber-400 dark:bg-amber-900/60 dark:border-amber-700",
    typeCls: "text-amber-700 dark:text-amber-400",
  },
  "tool.execution_complete": {
    label: "Tool Done",
    dotCls: "bg-amber-100 border-amber-400 dark:bg-amber-900/60 dark:border-amber-700",
    typeCls: "text-amber-700 dark:text-amber-400",
  },
  "external_tool.requested": {
    label: "External Tool Request",
    dotCls: "bg-lime-100 border-lime-400 dark:bg-lime-900/60 dark:border-lime-700",
    typeCls: "text-lime-700 dark:text-lime-400",
  },
  "external_tool.completed": {
    label: "External Tool Done",
    dotCls: "bg-lime-100 border-lime-400 dark:bg-lime-900/60 dark:border-lime-700",
    typeCls: "text-lime-700 dark:text-lime-400",
  },
  "permission.requested": {
    label: "Permission",
    dotCls: "bg-orange-100 border-orange-400 dark:bg-orange-900/60 dark:border-orange-700",
    typeCls: "text-orange-700 dark:text-orange-400",
  },
  "permission.completed": {
    label: "Permission Done",
    dotCls: "bg-orange-100 border-orange-400 dark:bg-orange-900/60 dark:border-orange-700",
    typeCls: "text-orange-700 dark:text-orange-400",
  },
  "hook.start": {
    label: "Hook Start",
    dotCls: "bg-cyan-100 border-cyan-400 dark:bg-cyan-900/60 dark:border-cyan-700",
    typeCls: "text-cyan-700 dark:text-cyan-400",
  },
  "hook.end": {
    label: "Hook End",
    dotCls: "bg-cyan-100 border-cyan-400 dark:bg-cyan-900/60 dark:border-cyan-700",
    typeCls: "text-cyan-700 dark:text-cyan-400",
  },
  "session.auto_mode_resolved": {
    label: "Auto Mode",
    dotCls: "bg-fuchsia-100 border-fuchsia-400 dark:bg-fuchsia-900/60 dark:border-fuchsia-700",
    typeCls: "text-fuchsia-700 dark:text-fuchsia-400",
  },
  "session.binary_asset": {
    label: "Binary Asset",
    dotCls: "bg-rose-100 border-rose-400 dark:bg-rose-900/60 dark:border-rose-700",
    typeCls: "text-rose-700 dark:text-rose-400",
  },
  "session.usage_checkpoint": {
    label: "Usage Checkpoint",
    dotCls: "bg-teal-100 border-teal-400 dark:bg-teal-900/60 dark:border-teal-700",
    typeCls: "text-teal-700 dark:text-teal-400",
  },
  "subagent.deselected": {
    label: "Subagent Deselected",
    dotCls: "bg-slate-100 border-slate-400 dark:bg-slate-900/60 dark:border-slate-700",
    typeCls: "text-slate-700 dark:text-slate-400",
  },
  "session.model_change": {
    label: "Model Change",
    dotCls: "bg-violet-100 border-violet-400 dark:bg-violet-900/60 dark:border-violet-700",
    typeCls: "text-violet-700 dark:text-violet-400",
  },
  "session.compaction_start": {
    label: "Compaction Start",
    dotCls: "bg-violet-100 border-violet-400 dark:bg-violet-900/60 dark:border-violet-700",
    typeCls: "text-violet-700 dark:text-violet-400",
  },
  "session.compaction_complete": {
    label: "Compaction Complete",
    dotCls: "bg-purple-100 border-purple-400 dark:bg-purple-900/60 dark:border-purple-700",
    typeCls: "text-purple-700 dark:text-purple-400",
  },
  "system.message": {
    label: "System",
    dotCls: "bg-slate-100 border-slate-400 dark:bg-slate-900/60 dark:border-slate-700",
    typeCls: "text-slate-700 dark:text-slate-400",
  },
};

const DEFAULT_CONFIG = {
  label: "Event",
  dotCls: "bg-muted border-border",
  typeCls: "text-muted-foreground",
  chipCls: "border-border bg-muted text-muted-foreground",
};

const CATEGORY_VISUAL: Record<string, { dotCls: string; typeCls: string; chipCls: string }> = {
  session: {
    dotCls: "bg-fuchsia-100 border-fuchsia-400 dark:bg-fuchsia-900/60 dark:border-fuchsia-700",
    typeCls: "text-fuchsia-700 dark:text-fuchsia-400",
    chipCls: "border-fuchsia-300 bg-fuchsia-100 text-fuchsia-800 dark:border-fuchsia-800 dark:bg-fuchsia-900/50 dark:text-fuchsia-300",
  },
  user: {
    dotCls: "bg-pink-100 border-pink-400 dark:bg-pink-900/60 dark:border-pink-700",
    typeCls: "text-pink-700 dark:text-pink-400",
    chipCls: "border-pink-300 bg-pink-100 text-pink-800 dark:border-pink-800 dark:bg-pink-900/50 dark:text-pink-300",
  },
  assistant: {
    dotCls: "bg-sky-100 border-sky-400 dark:bg-sky-900/60 dark:border-sky-700",
    typeCls: "text-sky-700 dark:text-sky-400",
    chipCls: "border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-800 dark:bg-sky-900/50 dark:text-sky-300",
  },
  tool: {
    dotCls: "bg-amber-100 border-amber-400 dark:bg-amber-900/60 dark:border-amber-700",
    typeCls: "text-amber-700 dark:text-amber-400",
    chipCls: "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  },
  external_tool: {
    dotCls: "bg-lime-100 border-lime-400 dark:bg-lime-900/60 dark:border-lime-700",
    typeCls: "text-lime-700 dark:text-lime-400",
    chipCls: "border-lime-300 bg-lime-100 text-lime-800 dark:border-lime-800 dark:bg-lime-900/50 dark:text-lime-300",
  },
  permission: {
    dotCls: "bg-red-100 border-red-400 dark:bg-red-900/60 dark:border-red-700",
    typeCls: "text-red-700 dark:text-red-400",
    chipCls: "border-red-300 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-900/50 dark:text-red-300",
  },
  hook: {
    dotCls: "bg-teal-100 border-teal-400 dark:bg-teal-900/60 dark:border-teal-700",
    typeCls: "text-teal-700 dark:text-teal-400",
    chipCls: "border-teal-300 bg-teal-100 text-teal-800 dark:border-teal-800 dark:bg-teal-900/50 dark:text-teal-300",
  },
  system: {
    dotCls: "bg-slate-100 border-slate-400 dark:bg-slate-900/60 dark:border-slate-700",
    typeCls: "text-slate-700 dark:text-slate-400",
    chipCls: "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300",
  },
  subagent: {
    dotCls: "bg-zinc-100 border-zinc-400 dark:bg-zinc-900/60 dark:border-zinc-700",
    typeCls: "text-zinc-700 dark:text-zinc-400",
    chipCls: "border-zinc-300 bg-zinc-100 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300",
  },
};

/** Events rendered per page; the rest load on demand. */
const PAGE_SIZE = 150;

const EVENT_TYPE_HELP: Record<string, string> = {
  "session.start": "Session initialization event. Captures the runtime context and selected model when a session begins.",
  "session.resume": "Session resumed from previous state. Indicates context reload and continuation.",
  "session.shutdown": "Session end summary. Usually includes usage, token totals, premium requests, and API timing.",
  "session.auto_mode_resolved": "Auto-mode model selection result. Shows predicted task profile and chosen model settings.",
  "session.binary_asset": "Binary payload captured in the session (typically screenshots/images). Can consume significant context/storage.",
  "session.usage_checkpoint": "Interim usage accounting snapshot (AIU/premium usage/cache state) while session is active.",
  "session.model_change": "Model configuration switched during the session (model/effort/context tier).",
  "session.compaction_start": "Context compaction started. Conversation is being summarized/compressed to reduce token load.",
  "session.compaction_complete": "Compaction finished, with success/failure metadata and request identifiers.",
  "user.message": "User input message that drives the next assistant turn.",
  "assistant.message": "Assistant output message, optionally with model/tool-request and token metadata.",
  "assistant.turn_start": "Start of a single assistant reasoning/execution turn.",
  "assistant.turn_end": "End of the assistant turn after reasoning/tools/output.",
  "tool.execution_start": "A local tool invocation started with tool name and arguments.",
  "tool.execution_complete": "A local tool invocation completed with status and result payload.",
  "external_tool.requested": "Request sent to an external tool bridge/service.",
  "external_tool.completed": "External tool request lifecycle completed.",
  "permission.requested": "Runtime requested user permission for an action (e.g., file/system/network).",
  "permission.completed": "Permission flow resolved (approved/denied).",
  "hook.start": "Lifecycle hook execution started (for example, prompt submission hooks).",
  "hook.end": "Lifecycle hook execution completed with success/failure state.",
  "subagent.deselected": "Subagent focus was cleared and control returned to the main agent context.",
  "system.message": "System-level instruction/context block injected into the conversation runtime.",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

function durationMs(a: string, b: string) {
  return new Date(b).getTime() - new Date(a).getTime();
}

function splitEventType(type: string) {
  const [category, ...rest] = type.split(".");
  return {
    category: category || "unknown",
    subCategory: rest.join(".") || "general",
  };
}

function eventHasTokenUsage(event: CopilotEvent): boolean {
  const data = event.data as Record<string, unknown>;

  const directOutput = data.outputTokens;
  if (typeof directOutput === "number" && directOutput > 0) return true;

  const directInput = data.inputTokens;
  if (typeof directInput === "number" && directInput > 0) return true;

  const directCache = data.cacheReadTokens;
  if (typeof directCache === "number" && directCache > 0) return true;

  const tokenDetails = data.tokenDetails as Record<string, Record<string, number>> | undefined;
  if (tokenDetails) {
    const input = tokenDetails.input?.tokenCount ?? 0;
    const output = tokenDetails.output?.tokenCount ?? 0;
    const cacheRead = tokenDetails.cache_read?.tokenCount ?? 0;
    if (input > 0 || output > 0 || cacheRead > 0) return true;
  }

  return false;
}

function formatCompactNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function UserMessageCard({ data }: { data: Record<string, unknown> }) {
  const content = (data.content as string) || "";
  const [expanded, setExpanded] = useState(false);
  const preview = content.slice(0, 300);
  const hasMore = content.length > 300;
  return (
    <div>
      <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
        {expanded ? content : preview}{hasMore && !expanded && "..."}
      </div>
      {hasMore && (
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-violet-600 dark:text-violet-400 hover:underline mt-1">
          {expanded ? "Show less" : `Show more (${content.length} chars)`}
        </button>
      )}
    </div>
  );
}

function AssistantMessageCard({ data }: { data: Record<string, unknown> }) {
  const content = (data.content as string) || "";
  const toolRequests = (data.toolRequests as unknown[]) || [];
  const model = data.model as string;
  const outputTokens = data.outputTokens as number | undefined;
  const [expanded, setExpanded] = useState(false);
  const preview = content.slice(0, 400);
  const hasMore = content.length > 400;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {model && (
          <Badge variant="secondary" className="text-xs font-mono">{model}</Badge>
        )}
        {outputTokens !== undefined && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-100 border border-violet-300 dark:bg-violet-950 dark:border-violet-800 rounded-full text-xs text-violet-700 dark:text-violet-300">
            <span className="opacity-60">out</span>
            <span className="font-semibold font-mono">{outputTokens.toLocaleString()}</span>
            <span className="opacity-60">tokens</span>
          </span>
        )}
      </div>
      {content && (
        <div>
          <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {expanded ? content : preview}{hasMore && !expanded && "..."}
          </div>
          {hasMore && (
            <button onClick={() => setExpanded(!expanded)} className="text-xs text-sky-600 dark:text-sky-400 hover:underline mt-1">
              {expanded ? "Show less" : `Show more (${content.length} chars)`}
            </button>
          )}
        </div>
      )}
      {toolRequests.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {toolRequests.map((tr: unknown, i) => {
            const tool = tr as Record<string, unknown>;
            return (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 border border-amber-300 dark:bg-amber-900/50 dark:border-amber-800 rounded text-xs text-amber-800 dark:text-amber-300 font-mono">
                🔧 {tool.name as string}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ToolExecutionCard({ data, type }: { data: Record<string, unknown>; type: string }) {
  const toolName = data.toolName as string;
  const args = data.arguments as Record<string, unknown>;
  const result = data.result as Record<string, unknown>;
  const success = data.success as boolean;
  const [showArgs, setShowArgs] = useState(false);
  const [showResult, setShowResult] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="font-mono text-amber-700 dark:text-amber-300 font-semibold">{toolName}</span>
        {type === "tool.execution_complete" && (
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
            success
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-400"
          }`}>
            {success ? "success" : "failed"}
          </span>
        )}
      </div>
      {args && Object.keys(args).length > 0 && (
        <div>
          <button onClick={() => setShowArgs(!showArgs)} className="text-xs text-amber-600 dark:text-amber-500 hover:underline">
            {showArgs ? "▼" : "▶"} Arguments
          </button>
          {showArgs && (
            <pre className="mt-1 p-2 bg-muted rounded text-xs text-foreground overflow-auto max-h-48 font-mono border border-border">
              {JSON.stringify(args, null, 2)}
            </pre>
          )}
        </div>
      )}
      {result && (
        <div>
          <button onClick={() => setShowResult(!showResult)} className="text-xs text-amber-600 dark:text-amber-500 hover:underline">
            {showResult ? "▼" : "▶"} Result
          </button>
          {showResult && (
            <pre className="mt-1 p-2 bg-muted rounded text-xs text-foreground overflow-auto max-h-48 font-mono border border-border">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function SessionShutdownCard({ data }: { data: Record<string, unknown> }) {
  const tokenDetails = data.tokenDetails as Record<string, Record<string, number>> | undefined;
  const totalApiDurationMs = data.totalApiDurationMs as number | undefined;
  const totalPremiumRequests = data.totalPremiumRequests as number | undefined;
  const shutdownType = data.shutdownType as string | undefined;

  const inputTokens = tokenDetails?.input?.tokenCount;
  const outputTokens = tokenDetails?.output?.tokenCount;
  const cacheReadTokens = tokenDetails?.cache_read?.tokenCount;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {shutdownType && (
          <Badge variant="outline" className="text-xs">{shutdownType}</Badge>
        )}
        {totalPremiumRequests !== undefined && (
          <span className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{totalPremiumRequests}</span> premium req
          </span>
        )}
        {totalApiDurationMs !== undefined && (
          <span className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{(totalApiDurationMs / 1000).toFixed(1)}s</span> API
          </span>
        )}
      </div>
      {(inputTokens !== undefined || outputTokens !== undefined) && (
        <div className="flex items-center gap-2 flex-wrap">
          {inputTokens !== undefined && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-cyan-100 border border-cyan-300 dark:bg-cyan-950 dark:border-cyan-800 rounded-full text-xs text-cyan-700 dark:text-cyan-300">
              <span className="opacity-60">in</span>
              <span className="font-semibold font-mono">{inputTokens.toLocaleString()}</span>
            </span>
          )}
          {outputTokens !== undefined && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-violet-100 border border-violet-300 dark:bg-violet-950 dark:border-violet-800 rounded-full text-xs text-violet-700 dark:text-violet-300">
              <span className="opacity-60">out</span>
              <span className="font-semibold font-mono">{outputTokens.toLocaleString()}</span>
            </span>
          )}
          {cacheReadTokens !== undefined && cacheReadTokens > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-100 border border-teal-300 dark:bg-teal-950 dark:border-teal-800 rounded-full text-xs text-teal-700 dark:text-teal-300">
              <span className="opacity-60">cache</span>
              <span className="font-semibold font-mono">{cacheReadTokens.toLocaleString()}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function SystemMessageCard({ data }: { data: Record<string, unknown> }) {
  const role = data.role as string | undefined;
  const interactionId = data.interactionId as string | undefined;
  const content = (data.content as string) || "";
  const [expanded, setExpanded] = useState(false);
  const preview = content.slice(0, 420);
  const hasMore = content.length > 420;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {role && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs border border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 font-mono">
            {role}
          </span>
        )}
        {interactionId && (
          <span className="text-xs text-muted-foreground font-mono">
            interaction: {interactionId}
          </span>
        )}
      </div>

      <div className="rounded-md border border-slate-200/80 dark:border-slate-800/80 bg-background/70 px-3 py-2">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
          System Prompt
        </p>
        <pre className="text-xs text-foreground whitespace-pre-wrap break-words leading-relaxed overflow-auto max-h-72 font-mono">
          {expanded ? content : preview}
          {hasMore && !expanded && "..."}
        </pre>
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-slate-700 dark:text-slate-300 hover:underline"
        >
          {expanded ? "Show less" : `Show full system prompt (${content.length.toLocaleString()} chars)`}
        </button>
      )}
    </div>
  );
}

function HookEventCard({ data, type }: { data: Record<string, unknown>; type: "hook.start" | "hook.end" }) {
  const hookType = data.hookType as string | undefined;
  const hookInvocationId = data.hookInvocationId as string | undefined;
  const success = data.success as boolean | undefined;
  const input = data.input as Record<string, unknown> | undefined;
  const prompt = input?.prompt as string | undefined;
  const [expanded, setExpanded] = useState(false);
  const preview = (prompt || "").slice(0, 300);
  const hasMore = (prompt || "").length > 300;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        {hookType && (
          <Badge variant="secondary" className="text-xs font-mono">
            {hookType}
          </Badge>
        )}
        {type === "hook.end" && success !== undefined && (
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium border ${
            success
              ? "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800"
          }`}>
            {success ? "success" : "failed"}
          </span>
        )}
        {hookInvocationId && (
          <span className="text-xs text-muted-foreground font-mono">
            {hookInvocationId}
          </span>
        )}
      </div>

      {type === "hook.start" && prompt && (
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Prompt Preview</p>
          <pre className="text-xs text-foreground whitespace-pre-wrap break-words leading-relaxed overflow-auto max-h-44 font-mono">
            {expanded ? prompt : preview}
            {hasMore && !expanded && "..."}
          </pre>
          {hasMore && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-cyan-700 dark:text-cyan-300 hover:underline mt-1"
            >
              {expanded ? "Show less" : `Show more (${prompt.length.toLocaleString()} chars)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AutoModeResolvedCard({ data }: { data: Record<string, unknown> }) {
  const chosenModel = data.chosenModel as string | undefined;
  const reasoningBucket = data.reasoningBucket as string | undefined;
  const predictedLabel = data.predictedLabel as string | undefined;
  const confidence = data.confidence as number | undefined;
  const candidateModels = (data.candidateModels as unknown[]) || [];
  const categoryScores = data.categoryScores as Record<string, unknown> | undefined;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {chosenModel && (
          <Badge className="text-xs font-mono bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-300 dark:bg-fuchsia-900/50 dark:text-fuchsia-300 dark:border-fuchsia-800">
            {chosenModel}
          </Badge>
        )}
        {reasoningBucket && (
          <Badge variant="outline" className="text-xs font-mono">
            reasoning: {reasoningBucket}
          </Badge>
        )}
        {predictedLabel && (
          <span className="text-xs text-muted-foreground">
            label: <span className="font-mono text-foreground">{predictedLabel}</span>
          </span>
        )}
        {typeof confidence === "number" && (
          <span className="text-xs text-muted-foreground">
            confidence: <span className="font-mono text-foreground">{Math.round(confidence * 100)}%</span>
          </span>
        )}
      </div>

      {candidateModels.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Candidate Models</p>
          <div className="flex flex-wrap gap-1.5">
            {candidateModels.slice(0, 8).map((candidate, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-0.5 rounded border border-fuchsia-300 bg-fuchsia-100/70 text-fuchsia-800 dark:border-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-300 text-xs font-mono"
              >
                {String(candidate)}
              </span>
            ))}
          </div>
        </div>
      )}

      {categoryScores && Object.keys(categoryScores).length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Category Scores</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {Object.entries(categoryScores).slice(0, 6).map(([name, value]) => (
              <div
                key={name}
                className="text-xs border border-fuchsia-200 bg-fuchsia-50/70 dark:border-fuchsia-900/80 dark:bg-fuchsia-950/25 rounded px-2 py-1 flex items-center justify-between gap-2"
              >
                <span className="text-muted-foreground">{name}</span>
                <span className="font-mono text-foreground">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ExternalToolCard({ data, type }: { data: Record<string, unknown>; type: "external_tool.requested" | "external_tool.completed" }) {
  const requestId = data.requestId as string | undefined;
  const toolName = data.toolName as string | undefined;
  const toolCallId = data.toolCallId as string | undefined;
  const workingDirectory = data.workingDirectory as string | undefined;
  const argumentsObj = data.arguments as Record<string, unknown> | undefined;
  const [showArgs, setShowArgs] = useState(false);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium ${
          type === "external_tool.requested"
            ? "bg-lime-100 text-lime-800 border-lime-300 dark:bg-lime-900/60 dark:text-lime-300 dark:border-lime-800"
            : "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-800"
        }`}>
          {type === "external_tool.requested" ? "requested" : "completed"}
        </span>
        {toolName && (
          <Badge variant="secondary" className="text-xs font-mono">
            {toolName}
          </Badge>
        )}
        {toolCallId && (
          <span className="text-xs text-muted-foreground font-mono">
            {toolCallId}
          </span>
        )}
      </div>

      {requestId && (
        <div className="text-xs text-muted-foreground font-mono">
          request: {requestId}
        </div>
      )}

      {type === "external_tool.requested" && workingDirectory && (
        <div className="text-xs text-muted-foreground">
          cwd: <span className="font-mono text-foreground break-all">{workingDirectory}</span>
        </div>
      )}

      {type === "external_tool.requested" && argumentsObj && Object.keys(argumentsObj).length > 0 && (
        <div>
          <button onClick={() => setShowArgs(!showArgs)} className="text-xs text-lime-700 dark:text-lime-400 hover:underline">
            {showArgs ? "▼" : "▶"} Arguments
          </button>
          {showArgs && (
            <pre className="mt-1 p-2 bg-background/70 rounded text-xs text-foreground overflow-auto max-h-40 font-mono border border-lime-200 dark:border-lime-800 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {JSON.stringify(argumentsObj, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function SessionBinaryAssetCard({ data }: { data: Record<string, unknown> }) {
  const assetId = data.assetId as string | undefined;
  const assetType = data.type as string | undefined;
  const mimeType = data.mimeType as string | undefined;
  const byteLength = data.byteLength as number | undefined;
  const rawData = data.data as string | undefined;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {assetType && <Badge variant="secondary" className="text-xs font-mono">{assetType}</Badge>}
        {mimeType && <span className="text-xs text-muted-foreground font-mono">{mimeType}</span>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
        {byteLength !== undefined && (
          <div className="rounded border border-rose-200 dark:border-rose-900 px-2 py-1 bg-rose-100/60 dark:bg-rose-950/25">
            size: <span className="font-mono text-foreground">{byteLength.toLocaleString()} bytes</span>
          </div>
        )}
        {rawData && (
          <div className="rounded border border-rose-200 dark:border-rose-900 px-2 py-1 bg-rose-100/60 dark:bg-rose-950/25">
            payload: <span className="font-mono text-foreground">{rawData.length.toLocaleString()} chars</span>
          </div>
        )}
      </div>
      {assetId && (
        <div className="text-xs text-muted-foreground font-mono break-all">
          asset: {assetId}
        </div>
      )}
    </div>
  );
}

function UsageCheckpointCard({ data }: { data: Record<string, unknown> }) {
  const totalNanoAiu = data.totalNanoAiu as number | undefined;
  const totalPremiumRequests = data.totalPremiumRequests as number | undefined;
  const modelCacheState = data.modelCacheState as unknown[] | undefined;
  const aiu = typeof totalNanoAiu === "number" ? totalNanoAiu / 1_000_000_000 : undefined;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
        {aiu !== undefined && (
          <div className="rounded border border-teal-200 dark:border-teal-900 px-2 py-1 bg-teal-100/60 dark:bg-teal-950/25">
            total AIU: <span className="font-mono text-foreground">{formatCompactNumber(aiu)}</span>
          </div>
        )}
        {totalPremiumRequests !== undefined && (
          <div className="rounded border border-teal-200 dark:border-teal-900 px-2 py-1 bg-teal-100/60 dark:bg-teal-950/25">
            premium req: <span className="font-mono text-foreground">{totalPremiumRequests}</span>
          </div>
        )}
      </div>
      {modelCacheState && (
        <div className="text-xs text-muted-foreground">
          cache state entries: <span className="font-mono text-foreground">{modelCacheState.length}</span>
        </div>
      )}
    </div>
  );
}

function ModelChangeCard({ data }: { data: Record<string, unknown> }) {
  const previousModel = data.previousModel as string | undefined;
  const newModel = data.newModel as string | undefined;
  const reasoningEffort = data.reasoningEffort as string | null | undefined;
  const contextTier = data.contextTier as string | null | undefined;

  return (
    <div className="space-y-2">
      <div className="text-sm text-foreground">
        <span className="font-mono">{previousModel || "unknown"}</span>
        <span className="mx-2 text-muted-foreground">→</span>
        <span className="font-mono font-semibold">{newModel || "unknown"}</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="px-2 py-0.5 rounded border border-violet-200 dark:border-violet-900 bg-violet-100/60 dark:bg-violet-950/25 text-muted-foreground">
          effort: <span className="font-mono text-foreground">{reasoningEffort ?? "default"}</span>
        </span>
        <span className="px-2 py-0.5 rounded border border-violet-200 dark:border-violet-900 bg-violet-100/60 dark:bg-violet-950/25 text-muted-foreground">
          context: <span className="font-mono text-foreground">{contextTier ?? "default"}</span>
        </span>
      </div>
    </div>
  );
}

function CompactionStartCard({ data }: { data: Record<string, unknown> }) {
  const model = data.model as string | undefined;
  const systemTokens = data.systemTokens as number | undefined;
  const conversationTokens = data.conversationTokens as number | undefined;
  const toolDefinitionsTokens = data.toolDefinitionsTokens as number | undefined;
  const total = [systemTokens, conversationTokens, toolDefinitionsTokens]
    .filter((v): v is number => typeof v === "number")
    .reduce((sum, v) => sum + v, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {model && <Badge variant="secondary" className="text-xs font-mono">{model}</Badge>}
        {total > 0 && (
          <span className="text-xs text-muted-foreground">
            total: <span className="font-mono text-foreground">{formatCompactNumber(total)}</span> tokens
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs">
        {systemTokens !== undefined && (
          <div className="rounded border border-violet-200 dark:border-violet-900 px-2 py-1 bg-violet-100/60 dark:bg-violet-950/25">
            system: <span className="font-mono text-foreground">{formatCompactNumber(systemTokens)}</span>
          </div>
        )}
        {conversationTokens !== undefined && (
          <div className="rounded border border-violet-200 dark:border-violet-900 px-2 py-1 bg-violet-100/60 dark:bg-violet-950/25">
            convo: <span className="font-mono text-foreground">{formatCompactNumber(conversationTokens)}</span>
          </div>
        )}
        {toolDefinitionsTokens !== undefined && (
          <div className="rounded border border-violet-200 dark:border-violet-900 px-2 py-1 bg-violet-100/60 dark:bg-violet-950/25">
            tools: <span className="font-mono text-foreground">{formatCompactNumber(toolDefinitionsTokens)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function CompactionCompleteCard({ data }: { data: Record<string, unknown> }) {
  const success = data.success as boolean | undefined;
  const error = data.error as string | undefined;
  const statusCode = data.statusCode as number | undefined;
  const requestId = data.requestId as string | undefined;
  const serviceRequestId = data.serviceRequestId as string | undefined;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium ${
          success
            ? "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800"
            : "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800"
        }`}>
          {success ? "success" : "failed"}
        </span>
        {statusCode !== undefined && (
          <span className="text-xs text-muted-foreground">
            status: <span className="font-mono text-foreground">{statusCode}</span>
          </span>
        )}
      </div>

      {error && (
        <div className="text-xs text-red-700 dark:text-red-300 bg-red-100/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded px-2 py-1.5 font-mono whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {error}
        </div>
      )}

      {requestId && (
        <div className="text-xs text-muted-foreground font-mono break-all">
          requestId: {requestId}
        </div>
      )}
      {serviceRequestId && (
        <div className="text-xs text-muted-foreground font-mono break-all">
          serviceRequestId: {serviceRequestId}
        </div>
      )}
    </div>
  );
}

function SubagentDeselectedCard() {
  return (
    <div className="text-xs text-muted-foreground">
      Active subagent context was cleared and focus returned to the main agent.
    </div>
  );
}

function AssistantTurnCard({ data, type }: { data: Record<string, unknown>; type: "assistant.turn_start" | "assistant.turn_end" }) {
  const model = data.model as string | undefined;
  const turnId = data.turnId as number | string | undefined;
  const interactionId = data.interactionId as string | undefined;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium ${
          type === "assistant.turn_start"
            ? "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800"
            : "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-900/60 dark:text-slate-300 dark:border-slate-700"
        }`}>
          {type === "assistant.turn_start" ? "turn started" : "turn finished"}
        </span>
        {turnId !== undefined && (
          <span className="text-xs text-muted-foreground">
            turn: <span className="font-mono text-foreground">{String(turnId)}</span>
          </span>
        )}
        {model && (
          <Badge variant="secondary" className="text-xs font-mono">
            {model}
          </Badge>
        )}
      </div>
      {interactionId && (
        <div className="text-xs text-muted-foreground font-mono">
          interaction: {interactionId}
        </div>
      )}
    </div>
  );
}

function GenericDataCard({ data }: { data: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);
  const json = JSON.stringify(data, null, 2);
  const preview = json.slice(0, 300);
  const hasMore = json.length > 300;
  return (
    <div>
      <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">
        {expanded ? json : preview}{hasMore && !expanded && "..."}
      </pre>
      {hasMore && (
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-muted-foreground hover:text-foreground mt-1 hover:underline">
          {expanded ? "Collapse" : "Expand"}
        </button>
      )}
    </div>
  );
}

/** Collapse whitespace and clip to a single scannable line. */
function shorten(value: unknown, max = 150) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** The argument most worth showing for a tool call, mirroring the CLI's own bias. */
function firstArg(input?: Record<string, unknown>) {
  if (!input) return "";
  for (const key of [
    "command",
    "filePath",
    "file_path",
    "path",
    "pattern",
    "query",
    "description",
    "url",
    "prompt",
  ]) {
    if (input[key]) return `${key}: ${shorten(input[key], 90)}`;
  }
  const keys = Object.keys(input);
  return keys.length ? shorten(JSON.stringify(input), 90) : "(no args)";
}

/**
 * One-line description of an event, so the timeline can stay collapsed by
 * default and still be readable at a glance.
 */
function eventSummary(event: CopilotEvent): { label: string; preview: string } {
  const d = event.data;
  const fallback = EVENT_CONFIG[event.type]?.label ?? splitEventType(event.type).subCategory;

  switch (event.type) {
    case "user.message":
      return { label: "User", preview: shorten(d.content) };
    case "assistant.message": {
      const toolRequests = (d.toolRequests as { name?: string }[]) ?? [];
      const content = shorten(d.content);
      if (content) return { label: "Assistant", preview: content };
      if (toolRequests.length) {
        return {
          label: "Assistant",
          preview: `requests ${toolRequests.map((t) => t.name).filter(Boolean).join(", ")}`,
        };
      }
      return { label: "Assistant", preview: "(no text)" };
    }
    case "assistant.turn_start":
    case "assistant.turn_end": {
      const turn = d.turnId;
      return {
        label: event.type === "assistant.turn_start" ? "Turn start" : "Turn end",
        preview: [turn !== undefined ? `turn ${turn}` : "", d.model as string]
          .filter(Boolean)
          .join(" · "),
      };
    }
    case "tool.execution_start":
      return {
        label: (d.toolName as string) || "Tool",
        preview: firstArg(d.arguments as Record<string, unknown> | undefined),
      };
    case "tool.execution_complete":
      return {
        label: (d.toolName as string) || "Tool",
        preview: d.success === false ? "failed" : "completed",
      };
    case "external_tool.requested":
    case "external_tool.completed":
      return {
        label: (d.toolName as string) || "External tool",
        preview:
          event.type === "external_tool.requested"
            ? firstArg(d.arguments as Record<string, unknown> | undefined)
            : "completed",
      };
    case "session.start":
    case "session.resume": {
      const ctx = d.context as Record<string, unknown> | undefined;
      return {
        label: event.type === "session.start" ? "Session start" : "Session resume",
        preview: [
          ctx?.branch ? `branch ${ctx.branch}` : "",
          d.selectedModel ? `model ${d.selectedModel}` : "",
        ]
          .filter(Boolean)
          .join(" · "),
      };
    }
    case "session.shutdown":
      return {
        label: "Shutdown",
        preview: [
          d.shutdownType as string,
          d.totalPremiumRequests !== undefined
            ? `${d.totalPremiumRequests} premium req`
            : "",
        ]
          .filter(Boolean)
          .join(" · "),
      };
    case "session.auto_mode_resolved":
      return {
        label: "Auto mode",
        preview: [
          d.chosenModel as string,
          d.predictedLabel ? `label ${d.predictedLabel}` : "",
        ]
          .filter(Boolean)
          .join(" · "),
      };
    case "session.binary_asset":
      return {
        label: "Binary asset",
        preview: [
          d.mimeType as string,
          typeof d.byteLength === "number"
            ? `${(d.byteLength / 1024).toFixed(0)} KB`
            : "",
        ]
          .filter(Boolean)
          .join(" · "),
      };
    case "session.usage_checkpoint":
      return {
        label: "Usage checkpoint",
        preview:
          d.totalPremiumRequests !== undefined
            ? `${d.totalPremiumRequests} premium req`
            : "usage snapshot",
      };
    case "session.model_change":
      return {
        label: "Model change",
        preview: `${d.previousModel ?? "unknown"} → ${d.newModel ?? "unknown"}`,
      };
    case "session.compaction_start":
      return { label: "Compaction", preview: `started · ${d.model ?? ""}`.trim() };
    case "session.compaction_complete":
      return {
        label: "Compaction",
        preview: d.success ? "completed" : `failed${d.error ? `: ${shorten(d.error, 80)}` : ""}`,
      };
    case "system.message": {
      const content = String(d.content ?? "");
      return {
        label: "System",
        preview: `${d.role ?? "system"} · ${content.length.toLocaleString()} chars`,
      };
    }
    case "hook.start":
    case "hook.end": {
      const input = d.input as Record<string, unknown> | undefined;
      if (event.type === "hook.end") {
        return {
          label: (d.hookType as string) || "Hook",
          preview: d.success === false ? "failed" : "success",
        };
      }
      return {
        label: (d.hookType as string) || "Hook",
        preview: shorten(input?.prompt, 90) || "started",
      };
    }
    case "permission.requested": {
      const pr = d.permissionRequest as Record<string, unknown> | undefined;
      return {
        label: "Permission",
        preview: [pr?.kind as string, shorten(pr?.intention, 90)]
          .filter(Boolean)
          .join(" · "),
      };
    }
    case "permission.completed": {
      const res = d.result as Record<string, unknown> | undefined;
      return { label: "Permission", preview: (res?.kind as string) ?? "resolved" };
    }
    case "subagent.deselected":
      return { label: "Subagent", preview: "focus returned to main agent" };
    default:
      return { label: fallback, preview: shorten(JSON.stringify(d), 90) };
  }
}

/** Token counts to show inline on a collapsed row, if the event reports any. */
function eventTokenBadge(event: CopilotEvent): { input: number; output: number } | null {
  const d = event.data;
  const details = d.tokenDetails as Record<string, { tokenCount?: number }> | undefined;
  const input =
    (typeof d.inputTokens === "number" ? d.inputTokens : 0) ||
    (details?.input?.tokenCount ?? 0);
  const output =
    (typeof d.outputTokens === "number" ? d.outputTokens : 0) ||
    (details?.output?.tokenCount ?? 0);
  if (input === 0 && output === 0) return null;
  return { input, output };
}

/** Conversation turns read best already open; the machinery starts collapsed. */
const DEFAULT_OPEN_TYPES = new Set(["user.message", "assistant.message"]);

function EventCard({
  event,
  prevTimestamp,
  expandAll,
}: {
  event: CopilotEvent;
  prevTimestamp?: string;
  /** Bumped by the toolbar; `open` forces every row open, `closed` closes them. */
  expandAll: { nonce: number; mode: "open" | "closed" } | null;
}) {
  const cfg = EVENT_CONFIG[event.type] || DEFAULT_CONFIG;
  const gap = prevTimestamp ? durationMs(prevTimestamp, event.timestamp) : null;
  const [showRaw, setShowRaw] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Local open state, re-seeded whenever the toolbar issues a new expand/collapse.
  const [openState, setOpenState] = useState({
    nonce: 0,
    open: DEFAULT_OPEN_TYPES.has(event.type),
  });
  const open =
    expandAll && expandAll.nonce !== openState.nonce
      ? expandAll.mode === "open"
      : openState.open;
  const setOpen = (next: boolean) =>
    setOpenState({ nonce: expandAll?.nonce ?? 0, open: next });

  const summary = eventSummary(event);
  const tokenBadge = eventTokenBadge(event);
  const typeParts = splitEventType(event.type);
  const categoryVisual = CATEGORY_VISUAL[typeParts.category];
  const visual = categoryVisual ?? cfg;
  const helpText = EVENT_TYPE_HELP[event.type] ?? `Event in "${typeParts.category}" category with "${typeParts.subCategory}" sub-category.`;

  function renderContent() {
    switch (event.type) {
      case "user.message":
        return <UserMessageCard data={event.data} />;
      case "assistant.message":
        return <AssistantMessageCard data={event.data} />;
      case "assistant.turn_start":
        return <AssistantTurnCard data={event.data} type="assistant.turn_start" />;
      case "assistant.turn_end":
        return <AssistantTurnCard data={event.data} type="assistant.turn_end" />;
      case "tool.execution_start":
      case "tool.execution_complete":
        return <ToolExecutionCard data={event.data} type={event.type} />;
      case "external_tool.requested":
        return <ExternalToolCard data={event.data} type="external_tool.requested" />;
      case "external_tool.completed":
        return <ExternalToolCard data={event.data} type="external_tool.completed" />;
      case "session.shutdown":
        return <SessionShutdownCard data={event.data} />;
      case "session.start":
      case "session.resume": {
        const ctx = event.data.context as Record<string, unknown> | undefined;
        return (
          <div className="text-xs text-muted-foreground space-y-1">
            {ctx && (
              <div>
                Branch: <span className="text-foreground">{ctx.branch as string}</span>
                {" · "}
                Model: <span className="text-foreground">{event.data.selectedModel as string}</span>
              </div>
            )}
          </div>
        );
      }
      case "hook.start":
        return <HookEventCard data={event.data} type="hook.start" />;
      case "hook.end":
        return <HookEventCard data={event.data} type="hook.end" />;
      case "session.auto_mode_resolved":
        return <AutoModeResolvedCard data={event.data} />;
      case "session.binary_asset":
        return <SessionBinaryAssetCard data={event.data} />;
      case "session.usage_checkpoint":
        return <UsageCheckpointCard data={event.data} />;
      case "subagent.deselected":
        return <SubagentDeselectedCard />;
      case "session.model_change":
        return <ModelChangeCard data={event.data} />;
      case "session.compaction_start":
        return <CompactionStartCard data={event.data} />;
      case "session.compaction_complete":
        return <CompactionCompleteCard data={event.data} />;
      case "system.message":
        return <SystemMessageCard data={event.data} />;
      case "permission.requested": {
        const pr = event.data.permissionRequest as Record<string, unknown>;
        return pr ? (
          <div className="text-xs text-muted-foreground">
            <span className="text-orange-600 dark:text-orange-400 font-medium">{pr.kind as string}</span>{" "}
            {pr.intention as string}
          </div>
        ) : null;
      }
      case "permission.completed": {
        const res = event.data.result as Record<string, unknown>;
        return res ? (
          <div className="text-xs">
            <span className={res.kind === "approved"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-destructive"
            }>
              {res.kind as string}
            </span>
          </div>
        ) : null;
      }
      default:
        return <GenericDataCard data={event.data} />;
    }
  }

  const content = renderContent();
  const rawJson = JSON.stringify(event, null, 2);
  // Every row is expandable: even without a rendered detail there is always the
  // raw event and the row actions to show.
  const hasDetail = Boolean(content);

  return (
    <div className="relative border-l-2 border-border pb-1.5 pl-6 last:border-l-transparent">
      {/* Small dot centred on the rail. */}
      <span
        className={`absolute -left-[5px] top-3 size-2 rounded-full border border-background ${visual.dotCls}`}
        aria-hidden
      />

      {/* Header and detail share one container, so an expanded event reads as a
          single object rather than two stacked cards. */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        >
          <ChevronRight
            className={cn(
              "size-3.5 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-90",
            )}
            aria-hidden
          />
          <span
            className={`max-w-[9rem] shrink-0 truncate rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold ${visual.chipCls ?? cfg.typeCls}`}
            title={summary.label}
          >
            {summary.label}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs text-foreground/90">
            {summary.preview}
          </span>

          {tokenBadge && (
            <span
              className="hidden shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground sm:inline"
              title={`${tokenBadge.input.toLocaleString()} in · ${tokenBadge.output.toLocaleString()} out`}
            >
              {tokenBadge.input > 0 && `↓${formatCompactNumber(tokenBadge.input)}`}
              {tokenBadge.input > 0 && tokenBadge.output > 0 && " "}
              {tokenBadge.output > 0 && `↑${formatCompactNumber(tokenBadge.output)}`}
            </span>
          )}

          {gap !== null && gap > 5000 && (
            <span
              className="hidden shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-muted-foreground sm:inline"
              title="Gap since the previous event"
            >
              +{gap > 60000 ? `${(gap / 60000).toFixed(1)}m` : `${(gap / 1000).toFixed(1)}s`}
            </span>
          )}

          {/* Timestamp is the row's right-hand anchor and never moves. */}
          <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
            {formatTime(event.timestamp)}
          </span>
        </button>

        {open && (
          <div className="border-t border-border">
            {hasDetail ? (
              <div className="px-3 py-2.5">{content}</div>
            ) : (
              <p className="px-3 py-2.5 text-xs text-muted-foreground">
                No structured detail for this event — see the raw event below.
              </p>
            )}

            {/* Occasional actions live at the foot of the detail, out of the
                scanning path of the collapsed rows. */}
            <div className="flex items-center gap-1 border-t border-border bg-muted/30 px-2 py-1.5">
              <span className="mr-auto truncate pl-1 font-mono text-[11px] text-muted-foreground">
                {event.type}
              </span>
              <button
                type="button"
                onClick={() => setShowHelp(!showHelp)}
                aria-expanded={showHelp}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
                  showHelp
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Info className="size-3.5" aria-hidden />
                About
              </button>
              <button
                type="button"
                onClick={() => setShowRaw(!showRaw)}
                aria-expanded={showRaw}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
                  showRaw
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Braces className="size-3.5" aria-hidden />
                {showRaw ? "Hide raw" : "Raw"}
              </button>
              <CopyButton value={rawJson} label="Copy raw JSON">
                <span className="text-[11px]">Copy</span>
              </CopyButton>
            </div>

            {/* Both panels open below the action bar, so toggling either one
                never shifts the button that controls it. They are ordered to
                match the buttons above them. */}
            {showHelp && (
              <div className="border-t border-border bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                {helpText}
              </div>
            )}

            {/* Raw JSON supplements the rendered detail rather than replacing it. */}
            {showRaw && (
              <div className="border-t border-border px-3 py-2.5">
                <p className="mb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                  Raw event
                </p>
                <pre className="max-h-64 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-muted p-2.5 font-mono text-xs leading-relaxed text-foreground [overflow-wrap:anywhere]">
                  {rawJson}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function getCategoryChipClass(category: string) {
  return CATEGORY_VISUAL[category]?.chipCls || "border-border bg-muted text-muted-foreground";
}

function getTypeChipClass(type: string) {
  const { category } = splitEventType(type);
  return getCategoryChipClass(category);
}

export function EventsTimeline({ events, focusRequest }: Props) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubKeys, setSelectedSubKeys] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [showSystem, setShowSystem] = useState(true);
  const [onlyTokenEvents, setOnlyTokenEvents] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandAll, setExpandAll] = useState<{
    nonce: number;
    mode: "open" | "closed";
  } | null>(null);

  const typedEvents = useMemo(() => {
    return events.map((event) => {
      const parts = splitEventType(event.type);
      return {
        ...event,
        category: parts.category,
        subCategory: parts.subCategory,
        subKey: `${parts.category}.${parts.subCategory}`,
      };
    });
  }, [events]);

  const visibleBySystem = useMemo(() => {
    return typedEvents.filter((event) => showSystem || event.type !== "system.message");
  }, [typedEvents, showSystem]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, { count: number; typeCounts: Map<string, number> }>();
    for (const event of visibleBySystem) {
      const current = counts.get(event.category) ?? { count: 0, typeCounts: new Map<string, number>() };
      current.count += 1;
      current.typeCounts.set(event.type, (current.typeCounts.get(event.type) || 0) + 1);
      counts.set(event.category, current);
    }
    return Array.from(counts.entries())
      .map(([category, value]) => {
        const representativeType = Array.from(value.typeCounts.entries())
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
        return { category, count: value.count, representativeType };
      })
      .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
  }, [visibleBySystem]);

  const subCategoryCounts = useMemo(() => {
    if (selectedCategories.length === 0) return [];
    const selectedSet = new Set(selectedCategories);
    const counts = new Map<string, { category: string; subCategory: string; count: number }>();
    for (const event of visibleBySystem) {
      if (!selectedSet.has(event.category)) continue;
      const current = counts.get(event.subKey);
      if (current) current.count += 1;
      else counts.set(event.subKey, { category: event.category, subCategory: event.subCategory, count: 1 });
    }
    return Array.from(counts.values()).sort((a, b) => b.count - a.count || a.subCategory.localeCompare(b.subCategory));
  }, [visibleBySystem, selectedCategories]);

  useEffect(() => {
    if (selectedCategories.length === 0 && selectedSubKeys.length > 0) {
      setSelectedSubKeys([]);
      return;
    }
    const available = new Set(subCategoryCounts.map((item) => `${item.category}.${item.subCategory}`));
    const next = selectedSubKeys.filter((key) => available.has(key));
    if (next.length !== selectedSubKeys.length) {
      setSelectedSubKeys(next);
    }
  }, [selectedCategories, selectedSubKeys, subCategoryCounts]);

  useEffect(() => {
    if (!focusRequest) return;
    setSelectedCategories(focusRequest.categories ?? []);
    setSelectedSubKeys(focusRequest.subKeys ?? []);
    setSearch(focusRequest.search ?? "");
    const wantsSystem =
      (focusRequest.categories ?? []).includes("system")
      || (focusRequest.subKeys ?? []).includes("system.message");
    if (wantsSystem) setShowSystem(true);
    // Reveal the chips so it is obvious which filters the hint applied.
    setFiltersOpen(true);
  }, [focusRequest]);

  const filtered = useMemo(() => {
    const categorySet = new Set(selectedCategories);
    const subKeySet = new Set(selectedSubKeys);
    return visibleBySystem.filter((event) => {
      if (categorySet.size > 0 && !categorySet.has(event.category)) return false;
      if (subKeySet.size > 0 && !subKeySet.has(event.subKey)) return false;
      if (onlyTokenEvents && !eventHasTokenUsage(event)) return false;
      if (search) {
        const q = search.toLowerCase();
        return JSON.stringify(event).toLowerCase().includes(q);
      }
      return true;
    });
  }, [visibleBySystem, selectedCategories, selectedSubKeys, onlyTokenEvents, search]);

  // Render in pages: huge sessions (thousands of events) would otherwise mount
  // every card up front and make the tab feel frozen. Tagging the page state
  // with the filter signature resets it back to page one whenever the filters
  // change, without an effect.
  const filterKey = `${selectedCategories.join()}|${selectedSubKeys.join()}|${search}|${showSystem}|${onlyTokenEvents}`;
  const [page, setPage] = useState({ key: filterKey, count: PAGE_SIZE });
  const visibleCount = page.key === filterKey ? page.count : PAGE_SIZE;

  const showMore = (count: number) => setPage({ key: filterKey, count });

  const shown = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );

  const groups = useMemo(() => {
    const g: { date: string; events: CopilotEvent[] }[] = [];
    for (const ev of shown) {
      const d = formatDate(ev.timestamp);
      const last = g[g.length - 1];
      if (!last || last.date !== d) g.push({ date: d, events: [ev] });
      else last.events.push(ev);
    }
    return g;
  }, [shown]);

  const activeFilterCount =
    selectedCategories.length +
    selectedSubKeys.length +
    (search ? 1 : 0) +
    (onlyTokenEvents ? 1 : 0) +
    (showSystem ? 0 : 1);

  function clearFilters() {
    setSelectedCategories([]);
    setSelectedSubKeys([]);
    setSearch("");
    setOnlyTokenEvents(false);
    setShowSystem(true);
  }

  return (
    <div className="flex flex-col">
      {/* Toolbar. Sticks below the page chrome so filters stay reachable
          while scrolling a long timeline. */}
      <div className="sticky top-[calc(var(--cv-topbar-h)+var(--cv-tabbar-h))] z-10 -mx-4 mb-4 border-b border-border bg-background/90 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            shortcut
            placeholder="Search events…"
            aria-label="Search events"
            className="w-full sm:w-56"
          />

          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
              selectedCategories.length + selectedSubKeys.length > 0
                ? "border-foreground/25 bg-muted text-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            <SlidersHorizontal className="size-3.5" aria-hidden />
            Filters
            {selectedCategories.length + selectedSubKeys.length > 0 && (
              <span className="rounded bg-foreground/10 px-1 tabular-nums">
                {selectedCategories.length + selectedSubKeys.length}
              </span>
            )}
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform",
                filtersOpen && "rotate-180",
              )}
              aria-hidden
            />
          </button>

          <ToolbarToggle
            active={!showSystem}
            onClick={() => setShowSystem(!showSystem)}
            icon={Filter}
            label="Hide system"
            title="Hide system.message events, which are usually large VS Code context blocks"
          />
          <ToolbarToggle
            active={onlyTokenEvents}
            onClick={() => setOnlyTokenEvents(!onlyTokenEvents)}
            icon={ListFilter}
            label="Token events"
            title="Show only events that report token usage"
          />

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
            >
              <X className="size-3.5" aria-hidden />
              Clear
            </button>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={() =>
                      setExpandAll({ nonce: Date.now(), mode: "open" })
                    }
                    aria-label="Expand all events"
                    className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                  >
                    <ChevronsUpDown className="size-3.5" aria-hidden />
                  </button>
                }
              />
              <TooltipContent>Expand all</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={() =>
                      setExpandAll({ nonce: Date.now(), mode: "closed" })
                    }
                    aria-label="Collapse all events"
                    className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                  >
                    <ChevronsDownUp className="size-3.5" aria-hidden />
                  </button>
                }
              />
              <TooltipContent>Collapse all</TooltipContent>
            </Tooltip>
            <span className="ml-1 text-xs tabular-nums text-muted-foreground">
              {filtered.length === events.length
                ? `${events.length} events`
                : `${filtered.length} of ${events.length} events`}
            </span>
          </div>
        </div>

        {filtersOpen && (
          <div className="mt-2.5 space-y-2 border-t border-border pt-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {categoryCounts.map(({ category, count, representativeType }) => {
                const isActive = selectedCategories.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() =>
                      setSelectedCategories((prev) =>
                        prev.includes(category)
                          ? prev.filter((value) => value !== category)
                          : [...prev, category],
                      )
                    }
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-xs transition-all",
                      "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
                      representativeType
                        ? getTypeChipClass(representativeType)
                        : getCategoryChipClass(category),
                      isActive
                        ? "ring-2 ring-ring ring-offset-1 ring-offset-background"
                        : "opacity-70 hover:opacity-100",
                    )}
                  >
                    <span>{category}</span>
                    <span className="font-bold tabular-nums">{count}</span>
                  </button>
                );
              })}
            </div>

            {selectedCategories.length > 0 && subCategoryCounts.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Sub-type
                </span>
                {subCategoryCounts.map(({ category, subCategory, count }) => {
                  const key = `${category}.${subCategory}`;
                  const isActive = selectedSubKeys.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={isActive}
                      title={key}
                      onClick={() =>
                        setSelectedSubKeys((prev) =>
                          prev.includes(key)
                            ? prev.filter((value) => value !== key)
                            : [...prev, key],
                        )
                      }
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-xs transition-all",
                        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
                        getTypeChipClass(key),
                        isActive
                          ? "ring-2 ring-ring ring-offset-1 ring-offset-background"
                          : "opacity-70 hover:opacity-100",
                      )}
                    >
                      {selectedCategories.length > 1 && (
                        <span className="opacity-70">{category}:</span>
                      )}
                      <span>{subCategory}</span>
                      <span className="font-bold tabular-nums">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="pr-2">
        {groups.map((group) => (
          <div key={group.date}>
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {group.date}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
            {group.events.map((event, i) => (
              <EventCard
                key={event.id}
                event={event}
                prevTimestamp={i > 0 ? group.events[i - 1].timestamp : undefined}
                expandAll={expandAll}
              />
            ))}
          </div>
        ))}

        {visibleCount < filtered.length && (
          <div className="flex flex-col items-center gap-2 py-6">
            <p className="text-xs text-muted-foreground">
              Showing {shown.length.toLocaleString()} of{" "}
              {filtered.length.toLocaleString()} matching events
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => showMore(visibleCount + PAGE_SIZE)}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
              >
                Load {Math.min(PAGE_SIZE, filtered.length - visibleCount)} more
              </button>
              <button
                type="button"
                onClick={() => showMore(filtered.length)}
                className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
              >
                Show all
              </button>
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-14 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <SearchX className="size-5" aria-hidden />
            </div>
            <p className="text-sm font-medium text-foreground">
              No events match your filters
            </p>
            <p className="max-w-sm text-xs text-muted-foreground">
              {events.length.toLocaleString()} events are recorded in this session.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-2 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Compact on/off control used by the timeline toolbar. */
function ToolbarToggle({
  active,
  onClick,
  icon: Icon,
  label,
  title,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Filter;
  label: string;
  title: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
              active
                ? "border-foreground/25 bg-muted text-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {label}
          </button>
        }
      />
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  );
}
