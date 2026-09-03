import type { ProviderId } from "@/lib/providers/types";

/**
 * Client-safe presentation data for each provider. Kept apart from the
 * adapters so components never pull `fs` into the browser bundle.
 */
export interface ProviderStyle {
  id: ProviderId;
  label: string;
  shortLabel: string;
  rootDir: string;
  /** Badge/chip colours, light and dark. */
  badgeCls: string;
  /** Solid accent used for dots and active states. */
  dotCls: string;
}

export const PROVIDER_STYLES: Record<ProviderId, ProviderStyle> = {
  copilot: {
    id: "copilot",
    label: "GitHub Copilot CLI",
    shortLabel: "Copilot",
    rootDir: "~/.copilot",
    badgeCls:
      "border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300",
    dotCls: "bg-sky-500",
  },
  claude: {
    id: "claude",
    label: "Claude Code",
    shortLabel: "Claude",
    rootDir: "~/.claude/projects",
    badgeCls:
      "border-orange-300 bg-orange-100 text-orange-800 dark:border-orange-900 dark:bg-orange-950/60 dark:text-orange-300",
    dotCls: "bg-orange-500",
  },
  codex: {
    id: "codex",
    label: "OpenAI Codex CLI",
    shortLabel: "Codex",
    rootDir: "~/.codex/sessions",
    badgeCls:
      "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300",
    dotCls: "bg-emerald-500",
  },
};

export const PROVIDER_ORDER: ProviderId[] = ["copilot", "claude", "codex"];

export function providerStyle(id: string | undefined): ProviderStyle {
  return PROVIDER_STYLES[(id ?? "copilot") as ProviderId] ?? PROVIDER_STYLES.copilot;
}
