import { CATEGORY_TINT } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { PERIODS, formatRange } from "@/lib/minutes";

/** One band: light category tint, dashed edge, the name and the period on top. Behind the timed cards. */
export function PeriodBand({ band, hour, onOpen, className }) {
  const { item, start, end, index, count } = band;
  const period = PERIODS[item.period];
  return (
    <button
      type="button"
      onClick={onOpen}
      title={`${period.label} · ${item.name}`}
      className={cn(
        "group absolute z-0 flex flex-col justify-start overflow-hidden rounded-[8px] border border-dashed border-ink/25 text-left text-[12.5px] leading-snug text-ink focus-visible:outline-2 focus-visible:outline-focus-ring",
        className,
      )}
      style={{
        top: (start / 60) * hour + 1,
        height: ((end - start) / 60) * hour - 2,
        left: `calc(${(index / count) * 100}% + 2px)`,
        width: `calc(${100 / count}% - 4px)`,
      }}
    >
      <span className={cn("absolute inset-0 opacity-55 transition-opacity group-hover:opacity-80", item.category ? CATEGORY_TINT[item.category.colorKey] : "bg-sunk")} aria-hidden />
      <span className="relative block px-2 py-1">
        <span className="block truncate font-[620]">{item.name}</span>
        <span className="num block truncate text-[11.5px] text-ink/70">
          {period.label} · {formatRange(start, end)}
        </span>
      </span>
    </button>
  );
}
