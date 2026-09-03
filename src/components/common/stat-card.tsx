import { cn } from "@/lib/utils";

/**
 * Summary metric: small uppercase label, large value, muted sub-line.
 * Laid out by `StatCardGrid`, which auto-fills to the available width.
 */
export function StatCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-1.5 text-2xl font-bold leading-none tabular-nums",
          accent ? "text-brand" : "text-foreground",
        )}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-1 truncate text-xs text-muted-foreground" title={sub}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function StatCardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
      {children}
    </div>
  );
}
