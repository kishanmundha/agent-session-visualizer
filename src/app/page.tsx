"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

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
  eventCount?: number;
  toolCallCount?: number;
  userMessageCount?: number;
  totalOutputTokens?: number;
  totalInputTokens?: number;
}

interface LogFile {
  name: string;
  mtime: string;
  size: number;
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function formatTokens(n?: number) {
  if (!n) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function timeAgo(iso?: string) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}


export default function HomePage() {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [logs, setLogs] = useState<LogFile[]>([]);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [logContent, setLogContent] = useState<string>("");
  const [loadingLog, setLoadingLog] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/sessions").then((r) => r.json()).then(setSessions);
    fetch("/api/logs").then((r) => r.json()).then(setLogs);
  }, []);

  // Sessions are already sorted by updated_at desc from the API
  const filteredSessions = sessions.filter((s) => {
    const q = search.toLowerCase();
    return !q || s.name?.toLowerCase().includes(q) ||
      s.repository?.toLowerCase().includes(q) ||
      s.branch?.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q);
  });

  async function loadLog(name: string) {
    setSelectedLog(name);
    setLoadingLog(true);
    const r = await fetch(`/api/logs?name=${encodeURIComponent(name)}`);
    const data = await r.json();
    setLogContent(data.content || "");
    setLoadingLog(false);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 bg-background sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🤖</span>
            <div>
              <h1 className="text-base font-bold tracking-tight leading-none">
                Copilot Session Visualizer
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                <code className="font-mono">~/.copilot</code>
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              <span className="font-medium text-foreground">{sessions.length}</span> sessions
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground">
              <span className="font-medium text-foreground">{logs.length}</span> log files
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <Tabs defaultValue="sessions">
          <TabsList className="mb-5">
            <TabsTrigger value="sessions">📋 Sessions ({sessions.length})</TabsTrigger>
            <TabsTrigger value="logs">📄 Logs ({logs.length})</TabsTrigger>
          </TabsList>

          {/* ── Sessions Tab ── */}
          <TabsContent value="sessions">
            <div className="flex items-center gap-3 mb-5">
              <div className="relative flex-1 max-w-sm">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">🔍</span>
                <input
                  type="text"
                  placeholder="Search sessions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {search && (
                <button onClick={() => setSearch("")} className="text-xs text-muted-foreground hover:text-foreground">
                  Clear
                </button>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {filteredSessions.length} result{filteredSessions.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid gap-2">
              {filteredSessions.map((s) => <SessionCard key={s.id} session={s} />)}
              {filteredSessions.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  {search ? `No sessions match "${search}"` : "No sessions found"}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Logs Tab ── */}
          <TabsContent value="logs">
            <div className="grid grid-cols-[280px_1fr] gap-4 h-[70vh]">
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider px-1">
                  Log Files
                </p>
                <ScrollArea className="flex-1 border border-border rounded-lg">
                  <div className="p-2 space-y-1">
                    {logs.map((log) => (
                      <button key={log.name} onClick={() => loadLog(log.name)}
                        className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors ${
                          selectedLog === log.name
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <div className="font-mono truncate">{log.name}</div>
                        <div className="text-muted-foreground mt-0.5 flex justify-between">
                          <span>{formatBytes(log.size)}</span>
                          <span>{timeAgo(log.mtime)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              <div className="flex flex-col border border-border rounded-lg overflow-hidden">
                {selectedLog ? (
                  <>
                    <div className="px-4 py-2 border-b border-border bg-muted text-xs font-mono text-muted-foreground">
                      {selectedLog}
                    </div>
                    <ScrollArea className="flex-1">
                      {loadingLog ? (
                        <div className="p-4 text-muted-foreground text-sm">Loading...</div>
                      ) : (
                        <LogContent content={logContent} />
                      )}
                    </ScrollArea>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    Select a log file to view
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SessionCard({ session: s }: { session: SessionMeta }) {
  const totalTokens = (s.totalInputTokens ?? 0) + (s.totalOutputTokens ?? 0);

  // Prefer AI-generated checkpoint title, fall back to first line of raw name
  const displayTitle = s.title ?? s.name?.split("\n").map((l) => l.trim()).filter(Boolean)[0];
  // Show first line of raw name as subtitle when we have a checkpoint title
  const rawNameFirstLine = s.name?.split("\n").map((l) => l.trim()).filter(Boolean)[0];
  const subtitle = s.title ? rawNameFirstLine : undefined;

  return (
    <Link href={`/sessions/${s.id}`} className="block group">
      <div className="border border-border rounded-xl px-4 py-3 bg-card hover:border-primary/50 hover:shadow-sm transition-all duration-150">
        <div className="flex items-start justify-between gap-3">
          {/* Left: title + id */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors break-words line-clamp-2">
              {displayTitle ?? <span className="text-muted-foreground italic font-normal">Unnamed session</span>}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 break-words">{subtitle}</p>
            )}
            <p className="text-xs font-mono text-muted-foreground mt-0.5 truncate">{s.id}</p>
          </div>

          {/* Right: time + client */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(s.updated_at)}</span>
            {s.client_name && (
              <Badge variant="secondary" className="text-xs hidden sm:inline-flex">{s.client_name}</Badge>
            )}
          </div>
        </div>

        {/* Meta row */}
        <div className="mt-2 flex items-center gap-3 flex-wrap">
          {s.branch && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              🌿 <span className="font-mono">{s.branch}</span>
            </span>
          )}
          {s.updated_at && (
            <span className="text-xs text-muted-foreground">{formatDate(s.updated_at)}</span>
          )}
        </div>

        {/* Stats row */}
        {(s.eventCount || s.toolCallCount || s.userMessageCount || totalTokens > 0) ? (
          <>
            <Separator className="my-2" />
            <div className="flex items-center gap-3 flex-wrap">
              {s.userMessageCount !== undefined && s.userMessageCount > 0 && (
                <Stat icon="💬" value={s.userMessageCount} label="turns" />
              )}
              {s.toolCallCount !== undefined && s.toolCallCount > 0 && (
                <Stat icon="🔧" value={s.toolCallCount} label="tools" />
              )}
              {s.eventCount !== undefined && s.eventCount > 0 && (
                <Stat icon="⚡" value={s.eventCount} label="events" />
              )}
              {totalTokens > 0 && (
                <div className="ml-auto flex items-center gap-1.5">
                  {s.totalInputTokens != null && s.totalInputTokens > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 font-mono">
                      ↑ {formatTokens(s.totalInputTokens)}
                    </span>
                  )}
                  {s.totalOutputTokens != null && s.totalOutputTokens > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 font-mono">
                      ↓ {formatTokens(s.totalOutputTokens)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </Link>
  );
}

function Stat({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <span>{icon}</span>
      <span className="font-medium text-foreground tabular-nums">{value}</span>
      <span>{label}</span>
    </span>
  );
}

function LogContent({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="p-4 font-mono text-xs space-y-0.5">
      {lines.map((line, i) => {
        const level = line.includes("[ERROR]") ? "error"
          : line.includes("[WARN]") ? "warn"
          : line.includes("[INFO]") ? "info"
          : "default";
        const colorMap = {
          error: "text-destructive",
          warn: "text-yellow-600 dark:text-yellow-400",
          info: "text-foreground",
          default: "text-muted-foreground",
        };
        return (
          <div key={i} className={`leading-5 whitespace-pre-wrap break-all ${colorMap[level]}`}>
            <span className="text-muted-foreground/40 select-none mr-2">{String(i + 1).padStart(4, " ")}</span>
            {line}
          </div>
        );
      })}
    </div>
  );
}
