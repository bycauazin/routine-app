import { Flame } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Pictures of the Routine reports for the public pages (fictional data, drawn
 * with the theme tokens). Chart rules (dataviz): one hue for a single series,
 * the validated --chart-* colors in fixed order for categories, 2px gaps
 * between fills, rounded data ends on the baseline, direct labels instead of
 * color alone, and text always in ink tokens.
 */

/** % of the routine done each day of the week (single series). */
const WEEK = [
  ["seg", 92],
  ["ter", 78],
  ["qua", 88],
  ["qui", 70],
  ["sex", 85],
  ["sáb", 60],
  ["dom", 100],
];

export function CompletionCard({ className }) {
  const best = Math.max(...WEEK.map(([, v]) => v));
  return (
    <div className={cn("flex flex-col gap-4 rounded-[18px] border border-ink/25 bg-paper p-5", className)} role="img" aria-label="Exemplo: 82% da rotina cumprida na semana, 6 pontos a mais que a semana passada; o melhor dia foi domingo, com 100%">
      <div>
        <p className="text-[12.5px] font-[560] text-muted">Rotina cumprida · semana</p>
        <p className="mt-1 flex items-baseline gap-2 tabular-nums">
          <span className="text-[34px] leading-none font-[720] tracking-[-0.03em]">82%</span>
          <span className="text-[12.5px] font-[600] text-done">+6 pts</span>
        </p>
      </div>
      <div className="grid h-[96px] grid-cols-7 items-end gap-[6px]">
        {WEEK.map(([day, v]) => (
          <div key={day} className="flex h-full flex-col items-center justify-end gap-1">
            {v === best && <span className="text-[10.5px] font-[650] text-ink tabular-nums">{v}%</span>}
            <span className="grow-y w-full max-w-[22px] rounded-t-[4px] bg-accent-text" style={{ height: `${v * 0.7}%` }} />
          </div>
        ))}
      </div>
      <div className="-mt-2 grid grid-cols-7 gap-[6px] border-t border-rule pt-1.5 text-center text-[10.5px] text-muted">
        {WEEK.map(([day]) => (
          <span key={day}>{day}</span>
        ))}
      </div>
    </div>
  );
}

export function ScoreCard({ className }) {
  const score = 8.4;
  const circumference = 2 * Math.PI * 34;
  return (
    <div className={cn("flex flex-col gap-4 rounded-[18px] border border-ink/25 bg-paper p-5", className)} role="img" aria-label="Exemplo: nota 8,4 de 10 hoje; 7,9 na semana e 7,6 no mês">
      <p className="text-[12.5px] font-[560] text-muted">Nota do dia</p>
      <div className="flex items-center gap-5">
        <svg viewBox="0 0 80 80" className="size-[88px] shrink-0 -rotate-90" aria-hidden>
          <circle cx="40" cy="40" r="34" fill="none" stroke="var(--sunk)" strokeWidth="8" />
          <circle cx="40" cy="40" r="34" fill="none" stroke="var(--accent-text)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(score / 10) * circumference} ${circumference}`} />
        </svg>
        <div className="tabular-nums">
          <p className="text-[34px] leading-none font-[720] tracking-[-0.03em]">
            8,4<span className="text-[15px] font-[560] text-muted"> /10</span>
          </p>
          <p className="mt-2 text-[12.5px] text-muted">Semana 7,9 · Mês 7,6</p>
        </div>
      </div>
      <p className="text-[12.5px] leading-relaxed text-muted">Hábitos e compromissos pesam mais que os blocos de rotina.</p>
    </div>
  );
}

const STREAKS = [
  ["Duolingo", 12, "11111111111111"],
  ["Ler 2 páginas", 5, "11011110111111"],
  ["Estudar 10 min", 3, "10110101100111"],
];

export function StreaksCard({ className }) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-[18px] border border-ink/25 bg-paper p-5", className)} role="img" aria-label="Exemplo: sequências dos hábitos — Duolingo 12 dias seguidos, Ler 2 páginas 5 dias, Estudar 10 minutos 3 dias">
      <p className="text-[12.5px] font-[560] text-muted">Sequências · últimos 14 dias</p>
      {STREAKS.map(([name, days, pattern]) => (
        <div key={name} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2 text-[13.5px]">
            <span className="font-[580]">{name}</span>
            <span className="inline-flex items-center gap-1 text-[12.5px] font-[650] text-ink tabular-nums">
              <Flame className="size-3.5 text-accent-text" aria-hidden /> {days} dias
            </span>
          </div>
          <div className="flex gap-[3px]" aria-hidden>
            {[...pattern].map((d, i) => (
              <span key={i} className={cn("h-2.5 flex-1 rounded-[3px]", d === "1" ? "bg-accent-text" : "bg-sunk")} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Hours of the week by category: validated chart colors, fixed order, always direct-labeled. */
const HOURS = [
  ["Trabalho", 40, "bg-chart-work"],
  ["Aulas", 6, "bg-chart-class"],
  ["Treino", 7, "bg-chart-workout"],
  ["Estudo", 8, "bg-chart-study"],
];

export function HoursCard({ className }) {
  const total = HOURS.reduce((sum, [, h]) => sum + h, 0);
  return (
    <div className={cn("flex flex-col gap-4 rounded-[18px] border border-ink/25 bg-paper p-5", className)} role="img" aria-label={`Exemplo: horas por categoria na semana — ${HOURS.map(([n, h]) => `${n} ${h}h`).join(", ")}`}>
      <div className="flex items-baseline justify-between">
        <p className="text-[12.5px] font-[560] text-muted">Horas por categoria · semana</p>
        <p className="text-[12.5px] font-[600] text-ink tabular-nums">{total}h</p>
      </div>
      <div className="flex h-3.5 gap-[2px] overflow-hidden rounded-[4px]" aria-hidden>
        {HOURS.map(([name, h, color]) => (
          <span key={name} className={cn("grow-x h-full", color)} style={{ width: `${(h / total) * 100}%` }} />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
        {HOURS.map(([name, h, color]) => (
          <li key={name} className="flex items-center gap-2">
            <span className={cn("size-2.5 shrink-0 rounded-[3px]", color)} aria-hidden />
            <span className="flex-1">{name}</span>
            <span className="font-[600] tabular-nums">{h}h</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
