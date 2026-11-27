import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { bandInset, layoutDay, periodBands } from "@/lib/agenda";
import { CATEGORY_TINT } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { formatWeekRange, shiftDate, today as todayDate, weekStart } from "@/lib/dates";
import { formatMinute, formatRange } from "@/lib/minutes";
import { useApi } from "@/lib/use-api";
import { WEEKDAY_SHORT } from "@/lib/weekdays";
import { useNowMinute } from "@/lib/use-now-minute";
import { SPECIAL } from "@/lib/special";
import { EditItemDialog } from "./ItemDialogs";
import { PeriodBand } from "./PeriodBand";

/** Height of one hour in the grid, in px, and the hour the grid opens at (scroll to see earlier). */
const HOUR = 56;
const OPEN_AT_HOUR = 6;
const HOURS = Array.from({ length: 24 }, (_, h) => h);

const weekdayOf = (date) => new Date(`${date}T12:00:00Z`).getUTCDay();
const statusClass = (status) => (status === "DONE" ? "opacity-60" : status === "SKIPPED" ? "opacity-45 line-through" : "");

/** A card of the grid: from its start to its end, sharing the width with what happens at the same time. */
function Card({ placed, inset = 0, onOpen }) {
  const { item, start, end, column, columns } = placed;
  const tall = end - start >= 45;
  return (
    <button
      type="button"
      onClick={onOpen}
      title={`${formatRange(item.startMinute, item.endMinute)} · ${item.name}${item.variant ? ` · ${item.variant}` : ""}`}
      className={cn(
        "absolute z-[1] overflow-hidden rounded-[8px] border border-ink/10 px-2 py-1 text-left text-[13px] leading-snug text-ink transition-[filter] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-focus-ring",
        item.category ? CATEGORY_TINT[item.category.colorKey] : "bg-sunk",
        statusClass(item.status),
      )}
      style={{
        top: (start / 60) * HOUR + 1,
        height: ((end - start) / 60) * HOUR - 2,
        left: `calc(${inset}px + (100% - ${inset}px) * ${column / columns} + 2px)`,
        width: `calc((100% - ${inset}px) / ${columns} - 4px)`,
      }}
    >
      <span className="flex items-center gap-1 font-[620]">
        {item.status === "DONE" && <Check className="size-3 shrink-0" strokeWidth={3} aria-label="feito" />}
        <span className="truncate">{item.name}</span>
      </span>
      {tall && <span className="num block truncate text-[12.5px] text-ink/70">{formatRange(item.startMinute, item.endMinute)}</span>}
    </button>
  );
}

/**
 * Semana: an agenda like Google Agenda or Outlook. Hours on the left (one row
 * per hour), the days on top (Monday to Sunday), each item as a card from its
 * start to its end; items at the same time stand side by side. Parts of the
 * day ("de manhã") are bands the whole period tall behind the timed cards; items without a time are only
 * counted under the day name (they live in the Dia tab). A tap on a card edits it (só neste
 * dia / daqui pra frente); a tap on a day name opens that day.
 */
export function WeekView({ date, onWeek, onOpenDay }) {
  const from = weekStart(date);
  const realToday = todayDate();
  const thisWeek = weekStart(realToday) === from;
  const { data: week, error, loading, reload } = useApi(`/weeks/${from}`);
  const { data: categories } = useApi("/categories");
  const [editing, setEditing] = useState(null);
  const now = useNowMinute();
  const scrollRef = useRef(null);
  const ready = Boolean(week);

  // Opens at 06:00; earlier hours are a scroll away.
  useEffect(() => {
    const box = scrollRef.current;
    if (!ready || !box) return;
    box.scrollTop = OPEN_AT_HOUR * HOUR;
    // On a phone three days fit: start at today (the first column sits right after the hours).
    const todayCol = box.querySelector("[data-today-col]");
    box.scrollLeft = todayCol ? todayCol.offsetLeft - box.querySelector("[data-day-col]").offsetLeft : 0;
  }, [ready, from]);

  return (
    <>
      <header className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="icon" onClick={() => onWeek(shiftDate(from, -7))} aria-label="Semana anterior">
          <ChevronLeft className="size-5" />
        </Button>
        <div className="min-w-0 text-center">
          <p className="label">{thisWeek ? "Esta semana" : "Semana"}</p>
          <h1 className="mt-0.5 text-balance text-[18px] font-[660] leading-tight tracking-[-0.02em] sm:text-[20px] md:text-[24px]">{formatWeekRange(from, shiftDate(from, 6))}</h1>
          {!thisWeek && (
            <button type="button" onClick={() => onWeek(realToday)} className="mt-1 text-[13.5px] font-[560] text-accent-text hover:underline">
              Voltar para esta semana
            </button>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => onWeek(shiftDate(from, 7))} aria-label="Próxima semana">
          <ChevronRight className="size-5" />
        </Button>
      </header>

      {error && !week && <ErrorState error={error} onRetry={reload} />}
      {loading && !week && <Skeleton className="h-[60dvh]" />}

      {week && (
        <div ref={scrollRef} className="sheet week-scroll relative max-h-[calc(100dvh-15rem)] min-h-[24rem] overflow-auto md:max-h-[calc(100dvh-13rem)]">
          <div className="week-grid grid">
            {/* Day names, sticky on top; the count of items without a time under each name. */}
            <div className="sticky left-0 top-0 z-30 border-b border-rule bg-paper" />
            {week.days.map((day) => {
              const isToday = day.date === realToday;
              return (
                <div key={day.date} className={cn("sticky top-0 z-20 flex flex-col gap-1 border-b border-l border-rule px-2 py-2.5", isToday ? "bg-selected" : "bg-paper")}>
                  <button type="button" onClick={() => onOpenDay(day.date)} className="flex items-center justify-between gap-1 rounded-md text-left hover:text-accent-text" aria-label={`Abrir ${WEEKDAY_SHORT[weekdayOf(day.date)]}, dia ${Number(day.date.slice(8))}`}>
                    <span>
                      <span className="block text-[13px] font-[600] uppercase tracking-[0.04em] text-muted">{WEEKDAY_SHORT[weekdayOf(day.date)]}</span>
                      {day.special && <span className="mt-0.5 block truncate text-[11.5px] font-[600] text-accent-text">{day.special.name ?? SPECIAL[day.special.kind].label}</span>}
                      <span className={cn("num mt-0.5 block text-[24px] font-[700] leading-none", isToday && "text-accent-text")}>{Number(day.date.slice(8))}</span>
                    </span>
                    <span className="flex flex-col items-end gap-0.5 text-[13px] font-[560] text-muted">
                      {day.progress.percent !== null && <span className="num">{day.progress.percent}%</span>}
                    </span>
                  </button>
                  {day.anytime.length > 0 && (
                    <button type="button" onClick={() => onOpenDay(day.date)} className="text-left text-[12.5px] text-muted hover:text-ink">
                      {day.anytime.length} sem horário
                    </button>
                  )}
                </div>
              );
            })}

            {/* Hours on the left, sticky. */}
            <div className="sticky left-0 z-10 bg-paper" style={{ height: 24 * HOUR }}>
              {HOURS.map((h) => (
                <span key={h} className="num absolute right-2 -translate-y-1/2 text-[13.5px] font-[600] text-muted" style={{ top: h * HOUR }}>
                  {h === 0 ? "" : formatMinute(h * 60)}
                </span>
              ))}
            </div>
            {week.days.map((day) => (
              <div
                key={day.date}
                data-day-col
                data-today-col={day.date === realToday || undefined}
                className="relative border-l border-rule"
                style={{ height: 24 * HOUR, backgroundImage: "linear-gradient(to bottom, var(--rule) 1px, transparent 1px)", backgroundSize: `100% ${HOUR}px` }}
              >
                {(() => {
                  const bands = periodBands(day.items);
                  return (
                    <>
                      {bands.map((band) => (
                        <PeriodBand key={band.item.id} band={band} hour={HOUR} onOpen={() => setEditing(band.item)} className={statusClass(band.item.status)} />
                      ))}
                      {layoutDay(day.items).map((placed) => (
                        <Card key={placed.item.id} placed={placed} inset={bandInset(bands, placed.start, placed.end)} onOpen={() => setEditing(placed.item)} />
                      ))}
                    </>
                  );
                })()}
                {day.date === realToday && (
                  <div aria-label={`Agora, ${formatMinute(now)}`} className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: (now / 60) * HOUR }}>
                    <span className="-ml-1 size-2 rounded-full bg-accent" />
                    <span className="h-0.5 flex-1 bg-accent" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {editing && (
        <EditItemDialog
          item={editing}
          categories={categories}
          recurringSteps
          onClose={() => setEditing(null)}
          onListsChanged={reload}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </>
  );
}
