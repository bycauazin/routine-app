import { CheckCircle2, ChevronDown, Clock, Droplet, Dumbbell, Flame, Star, Table2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { HelpButton, HelpPanel } from "@/components/ui/Help";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { cn } from "@/lib/cn";
import { formatDate, today as todayDate } from "@/lib/dates";
import { useApi } from "@/lib/use-api";
import { liters } from "@/lib/water";
import { DateRange } from "./DateRange";
import { Goals } from "./Goals";
import { BarList, ColumnChart, Ring } from "./Charts";

const weekdayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const weekdays = [1, 2, 3, 4, 5, 6, 0];
const hours = Array.from({ length: 24 }, (_, hour) => hour);
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const percent = (value) => value == null ? "—" : `${value}%`;
const score = (value) => value == null ? "—" : `${number.format(value)}/10`;

const ACCENT = "var(--accent)";
const WATER = "#4fb3c8";

/** A headline number with its icon on a tile of its own color. */
function Metric({ icon: Icon, color, title, value, detail, ring }) {
  return <div className="sheet flex items-center gap-3 px-4 py-3">
    {ring !== undefined ? <Ring value={ring} color={color} /> : <span className="grid size-11 shrink-0 place-items-center rounded-[12px]" style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color }} aria-hidden><Icon className="size-5" /></span>}
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-[12.5px] text-muted">{ring !== undefined && <Icon className="size-3.5" style={{ color }} aria-hidden />}{title}</p>
      <p className="num text-[22px] font-[700] leading-tight tracking-[-0.02em]">{value}</p>
      {detail && <p className="truncate text-[12px] text-muted">{detail}</p>}
    </div>
  </div>;
}

/** A section card: title with an icon and the "?" that hides its explanation. */
function Panel({ icon: Icon, color, title, help, children, className }) {
  const [open, setOpen] = useState(false);
  return <section className={cn("sheet grid min-w-0 gap-3 p-4", className)}>
    <div className="flex items-center gap-2">
      <Icon className="size-[18px] shrink-0" style={{ color }} aria-hidden />
      <h2 className="text-[16.5px] font-[660] tracking-[-0.01em]">{title}</h2>
      {help && <HelpButton open={open} onClick={() => setOpen((v) => !v)} about={title.toLowerCase()} />}
    </div>
    {help && open && <HelpPanel>{help}</HelpPanel>}
    {children}
  </section>;
}

function DailyTable({ days }) {
  return <details className="sheet group px-4 py-3">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-[650]">
      <span className="inline-flex items-center gap-2"><Table2 className="size-4 text-muted" aria-hidden /> Ver em tabela</span> <ChevronDown className="size-4 group-open:rotate-180" aria-hidden />
    </summary>
    <table className="mt-3 w-full text-left text-[13px]">
      <thead className="border-b border-rule text-muted"><tr><th className="py-2">Dia</th><th>Feitos</th><th>Cumprido</th><th>Nota</th></tr></thead>
      <tbody className="divide-y divide-rule">{days.map((day) => <tr key={day.date}>
        <th scope="row" className="py-2 font-[550]"><Link className="text-accent-text hover:underline" to={`/hoje?dia=${day.date}`}>{formatDate(day.date)}</Link></th>
        <td className="num">{day.done}/{day.total - day.skipped}</td><td className="num">{percent(day.percent)}</td><td className="num">{score(day.score)}</td>
      </tr>)}</tbody>
    </table>
  </details>;
}

function DelayHeatmap({ delays }) {
  const [selected, setSelected] = useState(null);
  const cells = new Map(delays.cells.map((cell) => [cell.weekday * 24 + cell.hour, cell]));
  const active = cells.get(selected);
  const scale = Math.max(1, ...delays.cells.map((cell) => cell.count));
  return <Panel icon={Clock} color="var(--chart-study)" title="Quando você mais atrasa" help="Cada quadrado é um dia da semana × hora planejada. Quanto mais forte a cor, mais itens daquele horário ficaram sem fazer, foram feitos depois ou remarcados. Itens sem hora entram só nos totais. Toque num quadrado para ver os detalhes.">
    <div className="flex flex-wrap gap-2 text-[12.5px]">
      <span className="rounded-full bg-sunk px-2.5 py-1"><b className="num">{delays.totals.missed}</b> não feitos</span>
      <span className="rounded-full bg-sunk px-2.5 py-1"><b className="num">{delays.totals.late}</b> feitos depois</span>
      <span className="rounded-full bg-sunk px-2.5 py-1"><b className="num">{delays.totals.moved}</b> remarcados</span>
    </div>
    {delays.cells.length ? <>
      <div className="mt-3 overflow-x-auto pb-2" role="region" aria-label="Mapa de calor, role para ver todos os horários" tabIndex={0}>
        <table className="w-full min-w-[48rem] table-fixed border-separate border-spacing-0.5 text-center text-[11px]">
          <caption className="sr-only">Quantidade de atividades por dia da semana e hora planejada</caption>
          <thead><tr><th className="w-9"><span className="sr-only">Dia</span></th>{hours.map((hour) => <th key={hour} scope="col" className="num font-[550] text-muted">{hour}h</th>)}</tr></thead>
          <tbody>{weekdays.map((weekday) => <tr key={weekday}>
            <th scope="row" className="text-left font-[550] text-muted">{weekdayLabels[weekday]}</th>
            {hours.map((hour) => {
              const key = weekday * 24 + hour;
              const cell = cells.get(key);
              return <td className="h-8 bg-sunk" key={hour}>{cell && <button type="button"
                className={cn("num h-full w-full font-[700] text-ink focus-visible:outline-2", selected === key && "outline-2 -outline-offset-2 outline-accent-text")}
                aria-label={`${weekdayLabels[weekday]}, ${hour}h · ${cell.count} atividades, ${cell.missed} não feitas, ${cell.late} feitas depois, ${cell.moved} remarcadas`}
                aria-pressed={selected === key} onClick={() => setSelected(key)}
                style={{ background: `color-mix(in srgb, var(--chart-study) ${15 + Math.round(35 * cell.count / scale)}%, var(--paper))` }}>{cell.count}</button>}</td>;
            })}
          </tr>)}</tbody>
        </table>
      </div>
      <p className="min-h-5 text-[13px] text-muted" aria-live="polite">{active
        ? `${weekdayLabels[active.weekday]}, ${active.hour}h · ${active.missed} não feitos · ${active.late} feitos depois · ${active.moved} remarcados.`
        : ""}</p>
    </> : <p className="text-[13px] text-muted">Nada com horário neste período.</p>}
  </Panel>;
}

function hoursLabel(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours} h${rest ? ` ${rest} min` : ""}` : `${rest} min`;
}

export function ReportsPage() {
  const today = todayDate();
  const [range, setRange] = useState({ from: today, to: today });
  const { data, loading, error, reload } = useApi("/reports", range);
  const report = data?.from === range.from && data?.to === range.to ? data : null;
  return <div className="flex min-w-0 flex-col gap-4">
    <header className="flex flex-wrap items-start justify-between gap-2">
      <h1 className="text-2xl font-[680] tracking-tight">Relatórios</h1>
      <Link to="/relatorios/pendentes" className="inline-flex min-h-9 items-center rounded-sm border border-rule-strong bg-paper px-3 text-[13px] font-[600] hover:bg-sunk">Revisar dias pendentes</Link>
    </header>
    <DateRange value={range} end={today} onChange={setRange} />
    {error && <ErrorState error={error} onRetry={reload} />}
    {loading && !report && <Skeleton className="h-32" />}
    {report && <div className="grid min-w-0 gap-4" aria-busy={loading}>
      {report.to > report.today && <p className="text-[13px] text-muted">{report.through ? `Até ${formatDate(report.through)}; os dias seguintes ainda estão planejados.` : "O período ainda não começou."}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={CheckCircle2} color={ACCENT} ring={report.progress.percent} title="Cumprido" value={percent(report.progress.percent)} detail={`${report.progress.done} de ${report.progress.total - report.progress.skipped} feitos`} />
        <Metric icon={Star} color="#d4a03f" title="Nota" value={score(report.score)} />
        <Metric icon={Droplet} color={WATER} title="Água por dia" value={report.water.averageMl == null ? "—" : liters(report.water.averageMl)} detail={`${report.water.reached} de ${report.water.days} dias na meta`} />
        <Metric icon={Dumbbell} color="var(--chart-workout)" title="Treinos" value={report.workouts.reduce((sum, workout) => sum + workout.count, 0)} />
      </div>
      {report.days.length > 1 && <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <Panel icon={CheckCircle2} color={ACCENT} title="Cumprido por dia" help="A barra de cada dia mostra quanto da rotina foi feito (dias sem nada marcado ficam vazios). Passe o dedo ou o mouse para ver o valor.">
          <ColumnChart data={report.days.map((d) => ({ key: d.date, label: formatDate(d.date), value: d.percent }))} color={ACCENT} max={100} format={(v) => `${v}%`} label="% da rotina feita" />
        </Panel>
        <Panel icon={Droplet} color={WATER} title="Água por dia" help={`A linha tracejada é a sua meta (${liters(report.water.goalMl)}). Conta a partir do seu primeiro registro.`}>
          {report.water.daily?.length ? <ColumnChart data={report.water.daily.map((d) => ({ key: d.date, label: formatDate(d.date), value: d.amountMl }))} color={WATER} target={report.water.goalMl} targetLabel="meta" format={liters} label="Quanto você bebeu" /> : <p className="text-[13.5px] text-muted">Sem registros de água no período.</p>}
        </Panel>
      </div>}
      {report.days.length > 1 && <DailyTable days={report.days} />}
      <Goals goals={report.goals} reload={reload} />
      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <Panel icon={Clock} color="var(--chart-work)" title="Horas por categoria" help="Tempo dos itens feitos, pela duração planejada. O número à direita é quanto daquela categoria foi cumprido.">
          <BarList rows={report.categories.filter((c) => c.minutes > 0).map((c) => ({ key: c.key, name: c.name, icon: c.icon, colorKey: c.colorKey, value: c.minutes, extra: percent(c.percent) }))} color="var(--chart-work)" format={hoursLabel} empty="Nada feito com horário neste período." />
        </Panel>
        <Panel icon={Dumbbell} color="var(--chart-workout)" title="Treinos">
          <BarList rows={report.workouts.map((w) => ({ key: w.name, name: w.name, value: w.count }))} color="var(--chart-workout)" format={(n) => `${n}×`} empty="Nenhum treino feito neste período." />
        </Panel>
      </div>
      <DelayHeatmap key={`${report.from}-${report.to}`} delays={report.delays} />
      <Panel icon={Flame} color={ACCENT} title="Sequências de afazeres" help="Dias seguidos em que cada afazer foi feito (atual e recorde) e quanto dele foi cumprido no período.">
        {report.streaks.length ? <ul className="grid gap-2 sm:grid-cols-2">
          {report.streaks.map((s) => <li key={s.key ?? s.name} className="flex items-center gap-3 rounded-[10px] bg-sunk/70 px-3 py-2">
            <span className="num inline-flex w-12 shrink-0 items-center gap-1 text-[15px] font-[700]"><Flame className="size-4 text-accent-text" aria-hidden />{s.current}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-[580]">{s.name}</span>
              <span className="block truncate text-[12px] text-muted">{s.itemName ? `${s.itemName} · ` : ""}recorde {s.best} · {percent(s.percent)}</span>
            </span>
          </li>)}
        </ul> : <p className="text-[13.5px] text-muted">Nenhum afazer no período.</p>}
      </Panel>
    </div>}
  </div>;
}
