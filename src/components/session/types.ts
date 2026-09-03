export interface SessionMeta {
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

export interface CopilotEvent {
  type: string;
  data: Record<string, unknown>;
  id: string;
  timestamp: string;
  parentId: string | null;
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

export interface TokenHint {
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

export interface TokenAnalysis {
  hints: TokenHint[];
  topToolsByCount: { name: string; count: number }[];
  systemMessageChars: number;
  toolResultChars: number;
  assistantChars: number;
  compactionCount: number;
  hookEventCount: number;
}

export interface SessionData {
  meta: SessionMeta;
  events: CopilotEvent[];
  files: string[];
  checkpoints: CheckpointFile[];
  research: string[];
  workspaceYaml: string;
  stats: SessionStats;
  tokenAnalysis: TokenAnalysis;
}

export interface EventFocusRequest {
  nonce: number;
  categories?: string[];
  subKeys?: string[];
  search?: string;
}
