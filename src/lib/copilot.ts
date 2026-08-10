import fs from "fs";
import path from "path";
import os from "os";
import readline from "readline";
import yaml from "js-yaml";
import Database from "better-sqlite3";

export const COPILOT_DIR = path.join(os.homedir(), ".copilot");
export const SESSION_STATE_DIR = path.join(COPILOT_DIR, "session-state");
export const LOGS_DIR = path.join(COPILOT_DIR, "logs");
const SESSION_STORE_DB = path.join(COPILOT_DIR, "session-store.db");

export interface SessionMeta {
  id: string;
  name?: string;
  title?: string; // AI-generated title from checkpoints DB
  cwd?: string;
  repository?: string;
  branch?: string;
  created_at?: string;
  updated_at?: string;
  host_type?: string;
  client_name?: string;
  user_named?: boolean;
  // Quick stats from events (computed at list time)
  eventCount?: number;
  toolCallCount?: number;
  userMessageCount?: number;
  totalOutputTokens?: number;
  totalInputTokens?: number;
}

export interface CopilotEvent {
  type: string;
  data: Record<string, unknown>;
  id: string;
  timestamp: string;
  parentId: string | null;
}

export interface LogFile {
  name: string;
  path: string;
  mtime: string;
  size: number;
}

/** Returns a map of sessionId → latest checkpoint title from session-store.db */
function loadCheckpointTitles(): Map<string, string> {
  const map = new Map<string, string>();
  if (!fs.existsSync(SESSION_STORE_DB)) return map;
  try {
    const db = new Database(SESSION_STORE_DB, { readonly: true, fileMustExist: true });
    const rows = db.prepare(
      "SELECT session_id, title FROM checkpoints WHERE title IS NOT NULL AND title != '' ORDER BY id DESC"
    ).all() as { session_id: string; title: string }[];
    // First row per session_id wins (highest id = latest checkpoint)
    for (const row of rows) {
      if (!map.has(row.session_id)) map.set(row.session_id, row.title);
    }
    db.close();
  } catch { /* ignore */ }
  return map;
}

function getQuickStats(id: string): Partial<SessionMeta> {
  const eventsPath = path.join(SESSION_STATE_DIR, id, "events.jsonl");
  if (!fs.existsSync(eventsPath)) return {};
  try {
    const content = fs.readFileSync(eventsPath, "utf-8");
    const lines = content.split("\n").filter(Boolean);
    let eventCount = 0;
    let toolCallCount = 0;
    let userMessageCount = 0;
    let totalOutputTokens = 0;
    let assistantOutputTokenSum = 0;
    let totalInputTokens = 0;
    let latestShutdown: { input: number; output: number } | null = null;
    for (const line of lines) {
      try {
        const e = JSON.parse(line) as CopilotEvent;
        eventCount++;
        if (e.type === "tool.execution_start") toolCallCount++;
        if (e.type === "user.message") userMessageCount++;
        if (e.type === "assistant.message") {
          const tokens = (e.data as Record<string, unknown>).outputTokens as number | undefined;
          if (tokens) assistantOutputTokenSum += tokens;
        }
        if (e.type === "session.shutdown") {
          const td = (e.data.tokenDetails as Record<string, Record<string, number>>) ?? {};
          latestShutdown = {
            input: td?.input?.tokenCount ?? 0,
            output: td?.output?.tokenCount ?? 0,
          };
        }
      } catch { /* skip */ }
    }
    if (latestShutdown) {
      // Some sessions report partial shutdown snapshots; keep the larger output value.
      totalInputTokens = latestShutdown.input;
      totalOutputTokens = Math.max(latestShutdown.output, assistantOutputTokenSum);
    } else {
      totalOutputTokens = assistantOutputTokenSum;
    }
    return { eventCount, toolCallCount, userMessageCount, totalOutputTokens, totalInputTokens };
  } catch {
    return {};
  }
}


function parseYaml(content: string): Record<string, unknown> {
  try {
    return (yaml.load(content) as Record<string, unknown>) ?? {};
  } catch {
    return {};
  }
}

export function listSessions(): SessionMeta[] {
  if (!fs.existsSync(SESSION_STATE_DIR)) return [];

  const checkpointTitles = loadCheckpointTitles();

  const dirs = fs.readdirSync(SESSION_STATE_DIR).filter((d) => {
    try {
      return fs.statSync(path.join(SESSION_STATE_DIR, d)).isDirectory();
    } catch {
      return false;
    }
  });

  return dirs
    .map((id) => {
      const yamlPath = path.join(SESSION_STATE_DIR, id, "workspace.yaml");
      if (!fs.existsSync(yamlPath)) return { id };
      try {
        const content = fs.readFileSync(yamlPath, "utf-8");
        const parsed = parseYaml(content);
        const str = (k: string) => {
          const v = parsed[k];
          if (v == null) return undefined;
          if (v instanceof Date) return v.toISOString();
          return String(v);
        };
        const quickStats = getQuickStats(id);
        return {
          id,
          name: str("name"),
          title: checkpointTitles.get(id),
          cwd: str("cwd"),
          repository: str("repository"),
          branch: str("branch"),
          created_at: str("created_at"),
          updated_at: str("updated_at"),
          host_type: str("host_type"),
          client_name: str("client_name"),
          user_named: parsed.user_named === true || parsed.user_named === "true",
          ...quickStats,
        };
      } catch {
        return { id };
      }
    })
    .sort((a, b) => {
      const at = Date.parse((a as SessionMeta).updated_at ?? (a as SessionMeta).created_at ?? "0");
      const bt = Date.parse((b as SessionMeta).updated_at ?? (b as SessionMeta).created_at ?? "0");
      return bt - at;
    });
}

export function getSessionMeta(id: string): SessionMeta | null {
  const sessionDir = path.join(SESSION_STATE_DIR, id);
  if (!fs.existsSync(sessionDir)) return null;

  const yamlPath = path.join(sessionDir, "workspace.yaml");
  if (!fs.existsSync(yamlPath)) return { id };

  try {
    const content = fs.readFileSync(yamlPath, "utf-8");
    const parsed = parseYaml(content);
    const str = (k: string) => {
      const v = parsed[k];
      if (v == null) return undefined;
      if (v instanceof Date) return v.toISOString();
      return String(v);
    };
    // Get checkpoint title from store DB
    const titles = loadCheckpointTitles();
    return {
      id,
      name: str("name"),
      title: titles.get(id),
      cwd: str("cwd"),
      repository: str("repository"),
      branch: str("branch"),
      created_at: str("created_at"),
      updated_at: str("updated_at"),
      host_type: str("host_type"),
      client_name: str("client_name"),
      user_named: parsed.user_named === true || parsed.user_named === "true",
    };
  } catch {
    return { id };
  }
}

export async function getSessionEvents(id: string): Promise<CopilotEvent[]> {
  const eventsPath = path.join(SESSION_STATE_DIR, id, "events.jsonl");
  if (!fs.existsSync(eventsPath)) return [];

  const events: CopilotEvent[] = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(eventsPath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      // skip malformed lines
    }
  }

  return events;
}

export function computeSessionStats(events: CopilotEvent[]): SessionStats {
  const stats: SessionStats = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCacheReadTokens: 0,
    totalToolCalls: 0,
    totalUserMessages: 0,
    totalAssistantMessages: 0,
    totalApiDurationMs: 0,
    totalPremiumRequests: 0,
    eventCount: events.length,
  };
  let hasShutdown = false;
  let assistantOutputTokenSum = 0;
  let latestShutdownSnapshot: {
    input: number;
    output: number;
    cacheRead: number;
    apiDurationMs: number;
    premiumRequests: number;
  } | null = null;
  let lastUsageCheckpoint: Record<string, unknown> | null = null;

  for (const e of events) {
    if (e.type === "user.message") stats.totalUserMessages++;
    if (e.type === "tool.execution_start") stats.totalToolCalls++;
    if (e.type === "assistant.message") {
      stats.totalAssistantMessages++;
      // outputTokens is per-message when no shutdown aggregates it
      const tokens = (e.data as Record<string, unknown>).outputTokens as number | undefined;
      if (tokens) assistantOutputTokenSum += tokens;
    }
    if (e.type === "session.shutdown") {
      hasShutdown = true;
      const d = e.data as Record<string, unknown>;
      const td = d.tokenDetails as Record<string, Record<string, number>> | undefined;
      latestShutdownSnapshot = {
        input: td?.input?.tokenCount ?? 0,
        output: td?.output?.tokenCount ?? 0,
        cacheRead: td?.cache_read?.tokenCount ?? 0,
        apiDurationMs: (d.totalApiDurationMs as number) ?? 0,
        premiumRequests: (d.totalPremiumRequests as number) ?? 0,
      };
    }
    if (e.type === "session.usage_checkpoint") {
      lastUsageCheckpoint = e.data as Record<string, unknown>;
    }
  }

  if (latestShutdownSnapshot) {
    // Some sessions emit partial shutdown snapshots; prefer the larger output value.
    stats.totalInputTokens = latestShutdownSnapshot.input;
    stats.totalOutputTokens = Math.max(latestShutdownSnapshot.output, assistantOutputTokenSum);
    stats.totalCacheReadTokens = latestShutdownSnapshot.cacheRead;
    stats.totalApiDurationMs = latestShutdownSnapshot.apiDurationMs;
    stats.totalPremiumRequests = latestShutdownSnapshot.premiumRequests;
  } else {
    stats.totalOutputTokens = assistantOutputTokenSum;
  }

  // For active sessions (no shutdown), use last usage_checkpoint for premium requests
  if (!hasShutdown && lastUsageCheckpoint) {
    stats.totalPremiumRequests = (lastUsageCheckpoint.totalPremiumRequests as number) ?? 0;
  }

  return stats;
}

export interface TokenHint {
  severity: "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  saving?: string; // estimated savings description
  focus?: {
    categories?: string[];
    subKeys?: string[];
    search?: string;
  };
}

export interface TokenAnalysis {
  hints: TokenHint[];
  topToolsByCount: { name: string; count: number }[];
  systemMessageChars: number;
  toolResultChars: number;
  assistantChars: number;
  compactionCount: number;
  hookEventCount: number;
}

export function analyzeTokenUsage(events: CopilotEvent[]): TokenAnalysis {
  const toolCallCounts: Record<string, number> = {};
  const toolResultSizes: number[] = [];
  let systemMessageChars = 0;
  let systemMessageCount = 0;
  let toolResultChars = 0;
  let assistantChars = 0;
  let compactionCount = 0;
  let hookEventCount = 0;
  let largeToolResults = 0;
  let screenshotCount = 0;
  let readPageCount = 0;
  let totalOutputTokens = 0;
  const uniqueSystemMessages = new Set<string>();

  for (const e of events) {
    const d = e.data as Record<string, unknown>;

    if (e.type === "assistant.message") {
      const tokens = d.outputTokens as number | undefined;
      if (tokens) totalOutputTokens += tokens;
      assistantChars += ((d.content as string) || "").length;
      for (const tr of (d.toolRequests as { name: string }[]) || []) {
        toolCallCounts[tr.name] = (toolCallCounts[tr.name] || 0) + 1;
        if (tr.name === "screenshotPage") screenshotCount++;
        if (tr.name === "readPage") readPageCount++;
      }
    }
    if (e.type === "system.message") {
      const content = (d.content as string) || "";
      systemMessageChars += content.length;
      systemMessageCount++;
      uniqueSystemMessages.add(content.slice(0, 200));
    }
    if (e.type === "tool.execution_complete") {
      const result = d.result as Record<string, unknown> | undefined;
      const content = String(result?.content || "");
      toolResultChars += content.length;
      toolResultSizes.push(content.length);
      if (content.length > 10_000) largeToolResults++;
    }
    if (e.type === "session.compaction_start") compactionCount++;
    if (e.type === "hook.start" || e.type === "hook.end") hookEventCount++;
  }

  const topToolsByCount = Object.entries(toolCallCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  const hints: TokenHint[] = [];

  // System message overhead is platform-managed (VS Code runtime), not user-actionable.
  if (systemMessageCount > 1 && systemMessageChars > 10_000) {
    const perMsg = Math.round(systemMessageChars / systemMessageCount);
    hints.push({
      severity: "low",
      category: "Platform Context",
      title: "System context is VS Code managed",
      description: `System context repeats each turn (~${(perMsg / 1000).toFixed(1)}K chars × ${systemMessageCount} turns). This is expected in Copilot runtime and usually not directly user-configurable.`,
      focus: {
        categories: ["system"],
        subKeys: ["system.message"],
      },
    });
  }

  // Too many tool calls
  const totalToolCalls = Object.values(toolCallCounts).reduce((a, b) => a + b, 0);
  if (totalToolCalls > 50) {
    const topTool = topToolsByCount[0];
    hints.push({
      severity: totalToolCalls > 150 ? "high" : "medium",
      category: "Tool Calls",
      title: `High tool call volume (${totalToolCalls} calls)`,
      description: `Most used: ${topTool?.name} (${topTool?.count}x). Each tool call adds its arguments and result to context. Prefer batching operations and using targeted commands.`,
      saving: "Varies",
      focus: {
        categories: ["tool", "external_tool"],
      },
    });
  }

  // Large tool results
  if (largeToolResults > 0) {
    const avgSize = toolResultSizes.length
      ? Math.round(toolResultSizes.reduce((a, b) => a + b, 0) / toolResultSizes.length)
      : 0;
    hints.push({
      severity: largeToolResults > 5 ? "high" : "medium",
      category: "Tool Results",
      title: `${largeToolResults} tool results exceed 10KB`,
      description: `Large tool outputs (avg ${(avgSize / 1000).toFixed(1)}KB) consume significant context. Use targeted file reads (view_range), limit bash output with head/tail, and avoid reading entire large files.`,
      saving: `~${Math.round((largeToolResults * 5000) / 4 / 1000)}K+ tokens`,
      focus: {
        categories: ["tool"],
        subKeys: ["tool.execution_complete"],
      },
    });
  }

  // Screenshots consuming tokens
  if (screenshotCount > 5) {
    hints.push({
      severity: "medium",
      category: "Browser Tools",
      title: `${screenshotCount} screenshots taken`,
      description: `Screenshots are image tokens and can be expensive. Prefer readPage (accessibility snapshot) over screenshotPage when you just need structure, not visuals.`,
      saving: `~${screenshotCount * 800} tokens`,
      focus: {
        categories: ["assistant"],
        subKeys: ["assistant.message"],
        search: "screenshotPage",
      },
    });
  }

  // No compaction on long session
  if (totalOutputTokens > 50_000 && compactionCount === 0) {
    hints.push({
      severity: "medium",
      category: "Context Management",
      title: "No context compaction detected",
      description: `Long session (${(totalOutputTokens / 1000).toFixed(0)}K output tokens) with no compaction. Enable auto-compaction or manually trigger it to shrink the context window and reduce per-turn input costs.`,
      focus: {
        categories: ["session"],
        search: "compaction",
      },
    });
  }

  // Compaction happened — acknowledge it
  if (compactionCount > 0) {
    hints.push({
      severity: "low",
      category: "Context Management",
      title: `Context compacted ${compactionCount} time${compactionCount > 1 ? "s" : ""}`,
      description: "Compaction summarizes conversation history to reduce context size. This is working as intended — consider more frequent compaction for very long sessions.",
      focus: {
        categories: ["session"],
        subKeys: ["session.compaction_start", "session.compaction_complete"],
      },
    });
  }

  // Too many bash calls
  const bashCount = toolCallCounts["bash"] || 0;
  if (bashCount > 30) {
    hints.push({
      severity: "low",
      category: "Tool Calls",
      title: `${bashCount} bash calls`,
      description: "Frequent bash calls each add output to context. Combine multiple shell commands with ; or &&, and pipe to head/tail to limit output size.",
      focus: {
        categories: ["tool"],
        subKeys: ["tool.execution_start"],
        search: "bash",
      },
    });
  }

  return {
    hints,
    topToolsByCount,
    systemMessageChars,
    toolResultChars,
    assistantChars,
    compactionCount,
    hookEventCount,
  };
}

export function getSessionFiles(id: string): string[] {
  const filesDir = path.join(SESSION_STATE_DIR, id, "files");
  if (!fs.existsSync(filesDir)) return [];
  try {
    return fs.readdirSync(filesDir);
  } catch {
    return [];
  }
}

export interface CheckpointFile {
  name: string;
  content: string;
}

export interface SessionStats {
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

export function getSessionCheckpoints(id: string): CheckpointFile[] {
  const checkpointsDir = path.join(SESSION_STATE_DIR, id, "checkpoints");
  if (!fs.existsSync(checkpointsDir)) return [];
  try {
    return fs.readdirSync(checkpointsDir).map((name) => {
      const filePath = path.join(checkpointsDir, name);
      let content = "";
      try { content = fs.readFileSync(filePath, "utf-8"); } catch { /* skip */ }
      return { name, content };
    });
  } catch {
    return [];
  }
}

export function getSessionResearch(id: string): string[] {
  const researchDir = path.join(SESSION_STATE_DIR, id, "research");
  if (!fs.existsSync(researchDir)) return [];
  try {
    return fs.readdirSync(researchDir);
  } catch {
    return [];
  }
}

export function getWorkspaceYaml(id: string): string {
  const yamlPath = path.join(SESSION_STATE_DIR, id, "workspace.yaml");
  if (!fs.existsSync(yamlPath)) return "";
  try {
    return fs.readFileSync(yamlPath, "utf-8");
  } catch {
    return "";
  }
}

export function listLogs(): LogFile[] {
  if (!fs.existsSync(LOGS_DIR)) return [];
  try {
    return fs
      .readdirSync(LOGS_DIR)
      .filter((f) => f.endsWith(".log"))
      .map((name) => {
        const p = path.join(LOGS_DIR, name);
        const stat = fs.statSync(p);
        return {
          name,
          path: p,
          mtime: stat.mtime.toISOString(),
          size: stat.size,
        };
      })
      .sort((a, b) => b.mtime.localeCompare(a.mtime));
  } catch {
    return [];
  }
}

export function getLogContent(name: string): string {
  const logPath = path.join(LOGS_DIR, name);
  if (!fs.existsSync(logPath)) return "";
  try {
    return fs.readFileSync(logPath, "utf-8");
  } catch {
    return "";
  }
}
