import { CATEGORY_TINT } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { formatHours } from "@/lib/agenda";

/**
 * Hours per category as small tiles (Simular: this simulation against the
 * current routine; Semana: planned against done). Each row:
 * { key, category, hours, note, badge: { text, strong } | null, solid, outline }.
 * The bar draws `solid` over `outline`, on the same scale for every tile.
 */
export function CategoryHours({ rows }) {
  const top = Math.max(1, ...rows.map((r) => Math.max(r.solid, r.outline)));
  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => {
        const tint = row.category ? CATEGORY_TINT[row.category.colorKey] : "bg-sunk";
        return (
          <li key={row.key} className="grid gap-2 rounded-[10px] border border-rule bg-bg/60 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className={cn("size-2.5 shrink-0 rounded-full border border-ink/15", tint)} aria-hidden />
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-[560]">{row.category?.name ?? "Sem categoria"}</span>
              {row.badge && (
                <span className={cn("num rounded-full px-2 py-0.5 text-[12px] font-[650]", row.badge.strong ? "bg-selected text-accent-text" : "bg-sunk text-muted")}>{row.badge.text}</span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="num text-[20px] font-[700] leading-none tracking-[-0.02em]">{formatHours(row.hours)}</span>
              <span className="num text-[12.5px] text-muted">{row.note}</span>
            </div>
            <div className="relative h-1.5 overflow-hidden rounded-full bg-sunk" aria-hidden>
              <span className="absolute inset-y-0 left-0 rounded-full border border-ink/25" style={{ width: `${(row.outline / top) * 100}%` }} />
              <span className={cn("absolute inset-y-0 left-0 rounded-full border border-ink/10", tint)} style={{ width: `${(row.solid / top) * 100}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
