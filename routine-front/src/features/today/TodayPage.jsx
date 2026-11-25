import { CalendarDays, FlaskConical, ListChecks } from "lucide-react";
import { useSearchParams } from "react-router";
import { cn } from "@/lib/cn";
import { today as todayDate } from "@/lib/dates";
import { DayView } from "./DayView";
import { WeekView } from "./WeekView";
import { SimulationsView } from "@/features/simulations/SimulationsView";

const TABS = [
  ["dia", "Dia", ListChecks],
  ["semana", "Semana", CalendarDays],
  ["simular", "Simular", FlaskConical],
];

/**
 * Hoje: two tabs, on the phone and on the computer. Dia = the summary of a
 * day (list with checks); Semana = the agenda (hours × days). The URL keeps
 * both: ?aba=semana&dia=AAAA-MM-DD.
 */
export function TodayPage() {
  const [params, setParams] = useSearchParams();
  const realToday = todayDate();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.get("dia") ?? "") ? params.get("dia") : realToday;
  const tab = ["semana", "simular"].includes(params.get("aba")) ? params.get("aba") : "dia";

  const go = (nextTab, nextDate) => {
    const query = {};
    if (nextTab !== "dia") query.aba = nextTab;
    if (nextDate !== realToday) query.dia = nextDate;
    setParams(query, { replace: true });
  };

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Ver" className="mx-auto grid w-full max-w-sm grid-cols-3 gap-1 rounded-full bg-sunk p-1">
        {TABS.map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => go(key, date)}
            className={cn("flex h-9 items-center justify-center gap-1.5 rounded-full text-[14px] font-[600] transition-colors", tab === key ? "bg-paper text-ink shadow-sm" : "text-muted hover:text-ink")}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </button>
        ))}
      </div>
      {tab === "simular" ? (
        <SimulationsView />
      ) : tab === "semana" ? (
        <WeekView date={date} onWeek={(d) => go("semana", d)} onOpenDay={(d) => go("dia", d)} />
      ) : (
        <DayView date={date} onDate={(d) => go("dia", d)} />
      )}
    </div>
  );
}
