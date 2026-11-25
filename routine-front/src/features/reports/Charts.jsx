import { useState } from "react";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { CATEGORY_TINT } from "@/lib/categories";
import { cn } from "@/lib/cn";

/**
 * Small charts of Relatórios, in plain HTML: thin bars with 4px rounded ends
 * anchored to the baseline, a 2px gap between bars, one color per series, a
 * hover/focus tooltip on every bar, values in text tokens (never the series
 * color), and a recessive guide line when there is a target.
 */

/** Vertical bars over time (one series). `max` fixes the scale; `target` draws a dashed line. */
export function ColumnChart({ data, color, max, target, targetLabel, format, label, height = 140 }) {
  const [active, setActive] = useState(null);
  const top = Math.max(max ?? 0, target ?? 0, ...data.map((d) => d.value ?? 0), 1);
  const shown = active === null ? null : data[active];
  return (
    <figure className="m-0 grid gap-2">
      <div className="flex min-h-5 items-baseline justify-between gap-2 text-[12.5px] text-muted" aria-live="polite">
        <span>{shown ? <><span className="font-[600] text-ink">{shown.label}</span> · {shown.value === null ? "sem dados" : format(shown.value)}</> : label}</span>
        {target !== undefined && <span className="inline-flex items-center gap-1"><span className="inline-block w-4 border-t-2 border-dashed border-ink/40" aria-hidden /> {targetLabel}</span>}
      </div>
      <div className="relative flex items-end gap-[2px] border-b border-rule-strong" style={{ height }} onMouseLeave={() => setActive(null)}>
        {target !== undefined && <div className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-ink/30" style={{ bottom: `${(target / top) * 100}%` }} aria-hidden />}
        {data.map((d, i) => (
          <button
            key={d.key}
            type="button"
            className="group relative flex h-full min-w-0 flex-1 items-end focus-visible:outline-2 focus-visible:outline-focus-ring"
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            aria-label={`${d.label}: ${d.value === null ? "sem dados" : format(d.value)}`}
          >
            <span
              className={cn("w-full rounded-t-[4px] transition-opacity", active !== null && active !== i && "opacity-45")}
              style={{ height: d.value ? `${Math.max(2, (d.value / top) * 100)}%` : 2, background: d.value ? color : "var(--rule)" }}
            />
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[11.5px] text-muted" aria-hidden>
        <span>{data[0]?.label}</span>
        {data.length > 2 && <span>{data[data.length - 1]?.label}</span>}
      </div>
    </figure>
  );
}

/** Horizontal bars with a label and value per row (ranked); color from the row's category tint or `color`. */
export function BarList({ rows, color, format, empty }) {
  if (!rows.length) return <p className="text-[13.5px] text-muted">{empty}</p>;
  const top = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="grid gap-2.5">
      {rows.map((r) => (
        <li key={r.key} className="grid gap-1">
          <div className="flex items-center gap-2 text-[13.5px]">
            {r.icon && (
              <span className={cn("grid size-6 shrink-0 place-items-center rounded-[7px] text-ink", r.colorKey ? CATEGORY_TINT[r.colorKey] : "bg-sunk")} aria-hidden>
                <ItemIcon name={r.icon} className="size-3.5" />
              </span>
            )}
            <span className="min-w-0 flex-1 truncate font-[560]">{r.name}</span>
            <span className="num shrink-0 font-[620]">{format(r.value)}</span>
            {r.extra && <span className="num w-16 shrink-0 text-right text-[12px] text-muted">{r.extra}</span>}
          </div>
          <div className="h-2.5 rounded-full bg-sunk" title={`${r.name}: ${format(r.value)}`}>
            <div
              className={cn("h-full rounded-full border border-ink/10", r.colorKey ? CATEGORY_TINT[r.colorKey] : "")}
              style={{ width: `${Math.max(2, (r.value / top) * 100)}%`, ...(r.colorKey ? {} : { background: color }) }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** A ring for one percentage (the headline "cumprido"). */
export function Ring({ value, color, size = 56 }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" aria-hidden className="shrink-0 -rotate-90">
      <circle cx="26" cy="26" r={r} fill="none" stroke="var(--sunk)" strokeWidth="6" />
      {value !== null && <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(c * value) / 100} ${c}`} />}
    </svg>
  );
}
