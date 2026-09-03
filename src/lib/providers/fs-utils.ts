import fs from "fs";
import path from "path";

export function safeReadFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

export function safeReaddir(dir: string): string[] {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

export function statOf(filePath: string): fs.Stats | null {
  try {
    return fs.statSync(filePath);
  } catch {
    return null;
  }
}

/** Parse a JSON-lines file, skipping blank and malformed lines. */
export function readJsonl<T>(filePath: string): T[] {
  const content = safeReadFile(filePath);
  if (!content) return [];
  const out: T[] = [];
  for (const line of content.split("\n")) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line) as T);
    } catch {
      /* skip malformed line */
    }
  }
  return out;
}

/** Recursively collect files matching a predicate, bounded by depth. */
export function walkFiles(
  dir: string,
  match: (name: string) => boolean,
  maxDepth = 6,
): string[] {
  if (maxDepth < 0) return [];
  const out: string[] = [];
  for (const entry of safeReaddir(dir)) {
    const full = path.join(dir, entry);
    const stat = statOf(full);
    if (!stat) continue;
    if (stat.isDirectory()) {
      out.push(...walkFiles(full, match, maxDepth - 1));
    } else if (match(entry)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Memoizes an expensive per-file parse, keyed on mtime+size so an edited
 * transcript is re-read but an unchanged one is not.
 */
export function createFileCache<T>(compute: (filePath: string) => T) {
  const cache = new Map<string, { key: string; value: T }>();
  return (filePath: string): T => {
    const stat = statOf(filePath);
    const key = stat ? `${stat.mtimeMs}:${stat.size}` : "missing";
    const hit = cache.get(filePath);
    if (hit && hit.key === key) return hit.value;
    const value = compute(filePath);
    cache.set(filePath, { key, value });
    return value;
  };
}
