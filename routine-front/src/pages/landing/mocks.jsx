import { Flame } from "lucide-react";
import { CATEGORY_TINT as CAT } from "@/lib/categories";
import { cn } from "@/lib/cn";

/**
 * Static pictures of the app for the public pages, drawn with the real tokens
 * (they follow the theme). The data is fictional.
 */

function Check({ done, delay }) {
  return (
    <span
      className={cn("grid size-6 shrink-0 place-items-center rounded-full border-2", done ? "tick-in border-accent bg-accent" : "border-rule-strong")}
      style={delay ? { "--tick-delay": delay } : undefined}
      aria-hidden
    >
      {done && (
        <svg viewBox="0 0 16 16" className="size-3.5 text-accent-ink" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 8.5l3 3 6-7" />
        </svg>
      )}
    </span>
  );
}

const DAY = [
  { time: "07:00", name: "Acordar", cat: "personal", done: true },
  { time: "08:00", name: "Condução", note: "Ler 2 páginas", cat: "commute", done: true },
  { time: "09:00", name: "Trabalho", note: "3 tarefas · até 13:00", cat: "work", now: true },
  { time: "13:00", name: "Almoço e estudo", cat: "meal" },
  { time: "18:30", name: "Aula · Pedro", note: "Inglês · até 19:30", cat: "class" },
  { time: "20:00", name: "Academia", cat: "workout" },
];

/** The Hoje screen inside a phone. */
export function TodayMock({ className }) {
  return (
    <div className={cn("w-full max-w-[340px] rounded-[38px] bg-ink p-2.5 shadow-lg", className)} role="img" aria-label="Tela Hoje do Routine: a linha do tempo do dia com os itens feitos marcados">
      <div className="flex flex-col gap-3.5 overflow-hidden rounded-[30px] bg-bg px-4 pt-5 pb-4 tabular-nums">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11.5px] font-[500] text-muted">Hoje</p>
            <p className="text-[18px] font-[680] tracking-[-0.02em]">Segunda, 23 nov</p>
          </div>
          <div className="text-right">
            <p className="text-[11.5px] font-[500] text-muted">nota</p>
            <p className="text-[20px] font-[700] tracking-[-0.02em]">7,5</p>
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-sunk" aria-hidden>
          <div className="grow-x h-full w-[44%] rounded-full bg-accent-text" />
        </div>
        <ul className="flex flex-col gap-0.5">
          {DAY.map((item, i) => (
            <li key={item.time}>
              {item.now && <p className="px-2.5 pt-1 pb-0.5 text-[10.5px] font-[650] tracking-[0.04em] text-accent-text uppercase">agora · 10:42</p>}
              <div className={cn("grid grid-cols-[44px_1fr_auto] items-center gap-2.5 rounded-[12px] px-2.5 py-2", item.now && "bg-selected")}>
                <span className="text-[12px] font-[500] text-muted">{item.time}</span>
                <span className="flex min-w-0 items-center gap-2">
                  <span className={cn("h-7 w-1 shrink-0 rounded-full", CAT[item.cat])} aria-hidden />
                  <span className="min-w-0">
                    <span className={cn("block truncate text-[13.5px] font-[560]", item.done && "text-muted line-through decoration-rule-strong")}>{item.name}</span>
                    {item.note && <span className="block truncate text-[11.5px] text-muted">{item.note}</span>}
                  </span>
                </span>
                <Check done={item.done} delay={`${300 + i * 140}ms`} />
              </div>
            </li>
          ))}
        </ul>
        <p className="px-2.5 text-[10.5px] font-[650] tracking-[0.05em] text-muted uppercase">A qualquer hora</p>
        <div className="flex flex-wrap gap-2 px-1">
          <span className="flex items-center gap-1.5 rounded-full border border-accent-text bg-paper px-3 py-1.5 text-[12.5px]">
            Duolingo
            <b className="inline-flex items-center gap-0.5 font-[650] text-accent-text">
              <Flame className="size-3.5" aria-hidden /> 12
            </b>
          </span>
          <span className="rounded-full border border-rule bg-paper px-3 py-1.5 text-[12.5px]">Estudar 10 min</span>
        </div>
        <div className="flex gap-2">
          <span className="flex-1 rounded-[12px] bg-accent py-2.5 text-center text-[13px] font-[620] text-accent-ink">+ Tarefa</span>
          <span className="flex-1 rounded-[12px] border border-rule bg-paper py-2.5 text-center text-[13px] font-[560]">Marcar dia</span>
        </div>
      </div>
    </div>
  );
}

const DAYS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
const HOURS = ["07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22"];

/** Blocks of the sample week: [day index, first hour, hours, category, label]. */
const BLOCKS = [
  ...[0, 1, 2, 3, 4].flatMap((d) => [
    [d, 0, 1, "personal", "Acordar"],
    [d, 1, 1, "commute", "Condução"],
    [d, 2, 4, "work", "Trabalho"],
    [d, 6, 1, "meal", "Almoço"],
    [d, 7, 4, "work", "Trabalho"],
  ]),
  [0, 11, 2, "study", "Estudo"],
  [2, 11, 2, "study", "Estudo"],
  [4, 11, 2, "study", "Estudo"],
  [1, 11, 1, "class", "Aula"],
  [3, 11, 1, "class", "Aula"],
  [1, 12, 1, "workout", "Correr"],
  [3, 12, 1, "workout", "Correr"],
  [0, 14, 2, "workout", "Academia"],
  [2, 14, 2, "workout", "Academia"],
  [4, 14, 2, "workout", "Academia"],
  [5, 3, 2, "class", "Aula"],
];

/** The Semana screen: days in columns, hours in rows, one color per kind of block. */
export function WeekGrid({ className }) {
  return (
    <div className={cn("overflow-x-auto rounded-[20px] border border-rule bg-paper p-3 sm:p-4", className)}>
      <div
        className="grid min-w-[380px] gap-[3px] text-[11px] tabular-nums"
        style={{ gridTemplateColumns: "34px repeat(7, minmax(0, 1fr))", gridTemplateRows: `22px repeat(${HOURS.length}, 22px)` }}
        role="img"
        aria-label="Uma semana de rotina em grade: trabalho de segunda a sexta, estudo, aulas, treino e refeições, com o fim de semana livre"
      >
        {DAYS.map((d, i) => (
          <span key={d} className="self-center text-center font-[600] text-muted" style={{ gridColumn: i + 2, gridRow: 1 }}>
            {d}
          </span>
        ))}
        {HOURS.map((h, i) => (
          <span key={h} className="self-center pr-1 text-right text-faint" style={{ gridColumn: 1, gridRow: i + 2 }}>
            {h}h
          </span>
        ))}
        {BLOCKS.map(([day, start, span, cat, label]) => (
          <span
            key={`${day}-${start}`}
            className={cn("flex items-center overflow-hidden rounded-[5px] px-1.5 font-[540] text-ink", CAT[cat])}
            style={{ gridColumn: day + 2, gridRow: `${start + 2} / span ${span}` }}
          >
            <span className="truncate">{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}


const DESK_DAY = [
  ["07:00", "Acordar", "personal", true],
  ["08:00", "Condução", "commute", true],
  ["09:00", "Trabalho", "work", false, true],
  ["13:00", "Almoço e estudo", "meal"],
  ["14:00", "Trabalho", "work"],
  ["18:30", "Aula · Pedro", "class"],
  ["20:00", "Academia", "workout"],
  ["21:00", "Estudo", "study"],
];

/**
 * The Routine app on a computer (top bar, the day, the week and a report),
 * used only as the blurred picture behind the hero. Decorative: hidden from
 * screen readers.
 */
export function DesktopAppShot({ className }) {
  return (
    <div className={cn("w-[1120px] overflow-hidden rounded-[22px] border border-rule-strong bg-bg shadow-lg", className)} aria-hidden>
      <div className="flex h-12 items-center gap-6 border-b border-rule bg-paper px-5 text-[13px]">
        <span className="flex items-center gap-2 font-[700]">
          <span className="size-6 rounded-[7px] bg-ink" /> Routine
        </span>
        <span className="font-[650]">Hoje</span>
        <span className="text-muted">Semana</span>
        <span className="text-muted">Relatórios</span>
        <span className="text-muted">Configurações</span>
        <span className="ml-auto size-7 rounded-full bg-accent" />
      </div>
      <div className="grid grid-cols-[360px_minmax(0,1fr)] gap-5 p-5">
        <div className="flex flex-col gap-1 rounded-[16px] border border-rule bg-paper p-3">
          <p className="px-2 pt-1 text-[12px] text-muted">Hoje</p>
          <p className="px-2 pb-2 text-[20px] font-[700]">Segunda, 23 nov</p>
          {DESK_DAY.map(([time, name, cat, done, now]) => (
            <div key={time + name} className={cn("grid grid-cols-[48px_1fr_22px] items-center gap-2 rounded-[10px] px-2 py-2 text-[13px]", now && "bg-selected")}>
              <span className="text-muted tabular-nums">{time}</span>
              <span className="flex items-center gap-2">
                <span className={cn("h-6 w-1 rounded-full", CAT[cat])} />
                <span className={cn(done && "text-muted line-through")}>{name}</span>
              </span>
              <span className={cn("size-5 rounded-full border-2", done ? "border-accent bg-accent" : "border-rule-strong")} />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-5">
          <WeekGrid />
          <div className="grid grid-cols-3 gap-4">
            {[["82%", "da rotina na semana"], ["8,4", "nota de hoje"], ["12", "dias de Duolingo"]].map(([value, label]) => (
              <div key={label} className="rounded-[16px] border border-rule bg-paper p-4">
                <p className="text-[28px] font-[720] tabular-nums">{value}</p>
                <p className="text-[12.5px] text-muted">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
