"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { EventsTimeline } from "@/components/session/EventsTimeline";

interface SessionMeta {
  id: string;
  name?: string;
  title?: string;
  cwd?: string;
  repository?: string;
  branch?: string;
  created_at?: string;
  updated_at?: string;
  host_type?: string;
  client_name?: string;
}

interface CopilotEvent {
  type: string;
  data: Record<string, unknown>;
  id: string;
  timestamp: string;
  parentId: string | null;
}

interface CheckpointFile {
  name: string;
  content: string;
}

interface SessionStats {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalToolCalls: number;
  totalUserMessages: number;
  totalAssistantMessages: number;
  totalApiDurationMs: number;
  totalPremiumRequests: number;
  eventCount: number;
}

interface TokenHint {
  severity: "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  saving?: string;
  focus?: {
    categories?: string[];
    subKeys?: string[];
    search?: string;
  };
}

interface TokenAnalysis {
  hints: TokenHint[];
  topToolsByCount: { name: string; count: number }[];
  systemMessageChars: number;
  toolResultChars: number;
  assistantChars: number;
  compactionCount: number;
  hookEventCount: number;
}

interface SessionData {
  meta: SessionMeta;
  events: CopilotEvent[];
  files: string[];
  checkpoints: CheckpointFile[];
  research: string[];
  workspaceYaml: string;
  stats: SessionStats;
  tokenAnalysis: TokenAnalysis;
}

interface EventFocusRequest {
  nonce: number;
  categories?: string[];
  subKeys?: string[];
  search?: string;
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function formatTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("events");
  const [eventFocusRequest, setEventFocusRequest] = useState<EventFocusRequest | null>(null);

  useEffect(() => {
    fetch(`/api/sessions/${id}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Loading session...
      </div>
    );
  }

  if (!data || !data.meta) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Session not found
      </div>
    );
  }

  const { meta, events, files, checkpoints, research, workspaceYaml, stats, tokenAnalysis } = data;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Link href="/" className="hover:text-foreground transition-colors">🤖 Sessions</Link>
            <span>/</span>
            <span className="text-foreground truncate max-w-xs">{meta.title ?? meta.name?.split("\n")[0] ?? meta.id}</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {meta.title ?? (meta.name?.split("\n").map(l => l.trim()).filter(Boolean)[0]) ?? (
                  <span className="text-muted-foreground italic font-normal">Unnamed session</span>
                )}
              </h1>
              {meta.title && meta.name && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {meta.name.split("\n").map(l => l.trim()).filter(Boolean)[0]}
                </p>
              )}
              <p className="text-xs font-mono text-muted-foreground mt-1">{meta.id}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {meta.client_name && <Badge variant="secondary">{meta.client_name}</Badge>}
              {meta.host_type && <Badge variant="outline">{meta.host_type}</Badge>}
            </div>
          </div>
          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            {meta.repository && <span>📁 {meta.repository}</span>}
            {meta.branch && <span>🌿 {meta.branch}</span>}
            {meta.created_at && <span>🗓 {formatDate(meta.created_at)}</span>}
            {meta.updated_at && <span>🕐 Updated {formatDate(meta.updated_at)}</span>}
          </div>
        </div>
      </header>

      {/* Token / Stats Summary Bar */}
      {stats && (
        <div className="border-b border-border bg-muted/40 px-6 py-3">
          <div className="max-w-6xl mx-auto flex items-center gap-4 flex-wrap text-xs">
            <span className="font-medium text-muted-foreground uppercase tracking-wider">Session Stats</span>
            <div className="flex items-center gap-3 flex-wrap">
              {stats.totalInputTokens > 0 && (
                <TokenPill label="Input" value={formatTokens(stats.totalInputTokens)} colorCls="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800" />
              )}
              {stats.totalOutputTokens > 0 && (
                <TokenPill label="Output" value={formatTokens(stats.totalOutputTokens)} colorCls="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800" />
              )}
              {stats.totalCacheReadTokens > 0 && (
                <TokenPill label="Cache" value={formatTokens(stats.totalCacheReadTokens)} colorCls="bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800" />
              )}
              {(stats.totalInputTokens > 0 || stats.totalOutputTokens > 0) && (
                <TokenPill label="Total" value={formatTokens(stats.totalInputTokens + stats.totalOutputTokens)} colorCls="bg-muted text-foreground border-border" />
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap ml-auto">
              {stats.totalUserMessages > 0 && (
                <span className="text-muted-foreground">💬 <span className="text-foreground font-medium">{stats.totalUserMessages}</span> turns</span>
              )}
              {stats.totalToolCalls > 0 && (
                <span className="text-muted-foreground">🔧 <span className="text-foreground font-medium">{stats.totalToolCalls}</span> tool calls</span>
              )}
              {stats.totalPremiumRequests > 0 && (
                <span className="text-muted-foreground">⭐ <span className="text-foreground font-medium">{stats.totalPremiumRequests}</span> premium req</span>
              )}
              {stats.totalApiDurationMs > 0 && (
                <span className="text-muted-foreground">⏱ <span className="text-foreground font-medium">{(stats.totalApiDurationMs / 1000).toFixed(0)}s</span> API</span>
              )}
              <span className="text-muted-foreground">⚡ <span className="text-foreground font-medium">{stats.eventCount}</span> events</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="events">⚡ Events ({events.length})</TabsTrigger>
            <TabsTrigger value="checkpoints">🔖 Checkpoints ({checkpoints.length})</TabsTrigger>
            <TabsTrigger value="files">📂 Files ({files.length})</TabsTrigger>
            <TabsTrigger value="research">🔬 Research ({research.length})</TabsTrigger>
            <TabsTrigger value="workspace">📋 Workspace</TabsTrigger>
            <TabsTrigger value="optimizer" className="relative">
              💡 Token Optimizer
              {tokenAnalysis?.hints.some(h => h.severity === "high") && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-red-500 text-white rounded-full">
                  {tokenAnalysis.hints.filter(h => h.severity === "high").length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events">
            <EventsTimeline events={events} focusRequest={eventFocusRequest} />
          </TabsContent>

          <TabsContent value="checkpoints">
            <CheckpointsList checkpoints={checkpoints} />
          </TabsContent>

          <TabsContent value="files">
            <div className="space-y-2">
              {files.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No files</div>
              ) : (
                files.map((f) => (
                  <div key={f} className="flex items-center gap-3 px-4 py-3 bg-muted border border-border rounded-lg text-sm">
                    <span>📄</span>
                    <span className="font-mono text-foreground">{f}</span>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="research">
            <div className="space-y-2">
              {research.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No research files</div>
              ) : (
                research.map((r) => (
                  <div key={r} className="flex items-center gap-3 px-4 py-3 bg-muted border border-border rounded-lg text-sm">
                    <span>🔬</span>
                    <span className="font-mono text-foreground">{r}</span>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="workspace">
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b border-border bg-muted text-xs font-mono text-muted-foreground">
                workspace.yaml
              </div>
              <ScrollArea className="h-[60vh] w-full">
                <pre className="p-4 font-mono text-xs text-foreground whitespace-pre min-w-full w-max">
                  {workspaceYaml || "No workspace.yaml found"}
                </pre>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="optimizer">
            <TokenOptimizer
              analysis={tokenAnalysis}
              stats={stats}
              onFocusHint={(focus) => {
                setActiveTab("events");
                setEventFocusRequest({
                  nonce: Date.now(),
                  categories: focus.categories,
                  subKeys: focus.subKeys,
                  search: focus.search,
                });
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function TokenOptimizer({
  analysis,
  stats,
  onFocusHint,
}: {
  analysis: TokenAnalysis;
  stats: SessionStats;
  onFocusHint: (focus: NonNullable<TokenHint["focus"]>) => void;
}) {
  const severityConfig = {
    high:   { label: "High impact", icon: "🔴", cls: "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30" },
    medium: { label: "Medium impact", icon: "🟡", cls: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30" },
    low:    { label: "Info", icon: "🟢", cls: "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30" },
  };

  const totalChars = analysis.systemMessageChars + analysis.toolResultChars + analysis.assistantChars;

  return (
    <div className="space-y-6">
      {/* Context breakdown bar */}
      <div className="border border-border rounded-xl p-5 bg-card">
        <h2 className="text-sm font-semibold text-foreground mb-4">📊 Context Usage Breakdown</h2>
        <div className="space-y-3">
          {[
            { label: "System context (VS Code managed)", chars: analysis.systemMessageChars, color: "bg-red-400 dark:bg-red-600", textColor: "text-red-700 dark:text-red-400" },
            { label: "Tool results", chars: analysis.toolResultChars, color: "bg-amber-400 dark:bg-amber-600", textColor: "text-amber-700 dark:text-amber-400" },
            { label: "Assistant replies", chars: analysis.assistantChars, color: "bg-sky-400 dark:bg-sky-600", textColor: "text-sky-700 dark:text-sky-400" },
          ].map(({ label, chars, color, textColor }) => {
            const pct = totalChars > 0 ? Math.round((chars / totalChars) * 100) : 0;
            return (
              <div key={label} className="flex items-center gap-3">
                <div className="w-32 text-xs text-muted-foreground shrink-0">{label}</div>
                <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                </div>
                <div className={`text-xs font-mono font-semibold w-16 text-right ${textColor}`}>
                  {(chars / 1000).toFixed(0)}K chars
                </div>
                <div className="text-xs text-muted-foreground w-8 text-right">{pct}%</div>
              </div>
            );
          })}
        </div>

        {/* Tool usage distribution */}
        {analysis.topToolsByCount.length > 0 && (
          <div className="mt-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Top Tool Calls</h3>
            <div className="flex flex-wrap gap-2">
              {analysis.topToolsByCount.map(({ name, count }) => (
                <span key={name} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-muted border border-border rounded-lg text-xs">
                  <span className="font-mono text-foreground font-medium">{name}</span>
                  <span className="text-muted-foreground">×{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Summary stats */}
        <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Output tokens", value: stats.totalOutputTokens > 0 ? `${(stats.totalOutputTokens / 1000).toFixed(1)}K` : "—" },
            { label: "Input tokens", value: stats.totalInputTokens > 0 ? `${(stats.totalInputTokens / 1000).toFixed(1)}K` : "N/A (active)" },
            { label: "Compactions", value: String(analysis.compactionCount) },
            { label: "Hook events", value: String(analysis.hookEventCount) },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="text-base font-bold text-foreground font-mono">{value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Hints */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">
          💡 Optimization Hints
          {analysis.hints.length === 0 && <span className="ml-2 text-muted-foreground font-normal">— no issues detected</span>}
        </h2>
        <div className="space-y-3">
          {["high", "medium", "low"].flatMap((sev) =>
            analysis.hints
              .filter((h) => h.severity === sev)
              .map((hint) => {
                const cfg = severityConfig[hint.severity];
                return (
                  <div key={`${hint.category}-${hint.title}`} className={`border rounded-xl p-4 ${cfg.cls}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-base mt-0.5 shrink-0">{cfg.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{hint.category}</span>
                          {hint.saving && (
                            <span className="text-xs px-1.5 py-0.5 bg-background border border-border rounded font-mono text-foreground">
                              save ~{hint.saving}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-foreground mt-0.5">{hint.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{hint.description}</p>
                        {hint.focus && (
                          <button
                            onClick={() => onFocusHint(hint.focus)}
                            className="mt-2 text-xs px-2 py-1 rounded border border-border bg-background hover:bg-muted transition-colors text-foreground font-mono"
                          >
                            View related events
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
}

function TokenPill({ label, value, colorCls }: { label: string; value: string; colorCls: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-mono text-xs ${colorCls}`}>
      <span className="opacity-60">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

function CheckpointsList({ checkpoints }: { checkpoints: CheckpointFile[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (checkpoints.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">No checkpoints</div>;
  }

  function toggle(name: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {checkpoints.map((cp) => {
        const isOpen = expanded.has(cp.name);
        return (
          <div key={cp.name} className="border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => toggle(cp.name)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-muted hover:bg-muted/80 transition-colors text-left"
            >
            <span className="text-base">📄</span>
            <span className="font-mono text-sm text-foreground font-medium flex-1">{cp.name}</span>
            {cp.content && (
              <span className="text-xs text-muted-foreground">
                {cp.content.length.toLocaleString()} chars
              </span>
            )}
            <span className="text-muted-foreground text-xs ml-1">{isOpen ? "▼" : "▶"}</span>
          </button>
          {isOpen && cp.content && (
            <div className="border-t border-border">
              <ScrollArea className="h-[60vh] w-full">
                <pre className="p-4 font-mono text-xs text-foreground whitespace-pre min-w-full w-max">
                  {cp.content}
                </pre>
              </ScrollArea>
            </div>
          )}
            {isOpen && !cp.content && (
              <div className="p-4 text-sm text-muted-foreground border-t border-border">Empty file</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
