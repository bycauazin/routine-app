import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/Button";
import { HelpButton, HelpPanel } from "@/components/ui/Help";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { formatDayTitle, monthStartForRange, shiftDate, today } from "@/lib/dates";
import { formatMinute } from "@/lib/minutes";
import { useApi } from "@/lib/use-api";
import { DateRange } from "./DateRange";

function PendingDay({ day, reload, loading }) {
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const ids = day.items.filter((item) => selected.includes(item.id)).map((item) => item.id);
  async function review(status) {
    setBusy(true);
    try {
      for (let start = 0; start < ids.length; start += 100) {
        await api(`/reports/pending/${day.date}`, { method: "POST", body: { ids: ids.slice(start, start + 100), status } });
      }
      setSelected([]);
      toast.success("Revisão salva.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      await reload();
      setBusy(false);
    }
  }
  return <section className="sheet grid gap-3 p-4" aria-label={formatDayTitle(day.date)}>
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="font-[650] first-letter:uppercase">{formatDayTitle(day.date)}</h2>
      <Link to={`/hoje?dia=${day.date}`} className="text-[13px] text-accent-text hover:underline">Abrir dia</Link>
    </div>
    <fieldset disabled={busy} className="grid gap-2">
      <legend className="sr-only">Itens para revisar</legend>
      <label className="flex min-h-9 cursor-pointer items-center gap-2 text-[13px] text-muted">
        <input type="checkbox" className="size-4 accent-[var(--accent-text)]" checked={ids.length === day.items.length} onChange={(e) => setSelected(e.target.checked ? day.items.map((item) => item.id) : [])} />
        Selecionar todos
      </label>
      <ul className="divide-y divide-rule border-y border-rule">
        {day.items.map((item) => <li key={item.id}>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 py-1.5 text-sm">
            <input type="checkbox" className="size-4 shrink-0 accent-[var(--accent-text)]" checked={ids.includes(item.id)} onChange={(e) => setSelected((current) => e.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} />
            <span className="min-w-0 break-words">{item.name}{(item.category || item.steps > 0) && <small className="block text-[12px] text-muted">{[item.category, item.steps > 0 ? `${item.stepsDone} de ${item.steps} afazeres` : null].filter(Boolean).join(" · ")}</small>}</span>
            {item.startMinute != null && <time className="num ml-auto text-muted">{formatMinute(item.startMinute)}</time>}
          </label>
        </li>)}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={!ids.length || busy || loading} onClick={() => review("DONE")}>Feito</Button>
        <Button size="sm" variant="secondary" disabled={!ids.length || busy || loading} onClick={() => review("NOT_DONE")}>Não feito</Button>
        <Button size="sm" variant="secondary" disabled={!ids.length || busy || loading} onClick={() => review("SKIPPED")}>Não houve</Button>
      </div>
    </fieldset>
  </section>;
}

export function PendingDaysPage() {
  const yesterday = shiftDate(today(), -1);
  const [range, setRange] = useState({ from: monthStartForRange(yesterday), to: yesterday });
  const { data, error, loading, reload } = useApi("/reports/pending", range);
  const days = data?.from === range.from && data?.to === range.to ? data.days : null;
  const [help, setHelp] = useState(false);
  return <div className="flex min-w-0 flex-col gap-4">
    <header className="grid gap-1">
      <Link to="/relatorios" className="justify-self-start text-[13px] font-[600] text-accent-text hover:underline">‹ Relatórios</Link>
      <h1 className="flex items-center gap-1 text-2xl font-[680] tracking-tight">Revisar dias pendentes <HelpButton open={help} onClick={() => setHelp((v) => !v)} about="a revisão de dias pendentes" /></h1>
      {help && <HelpPanel>Selecione os itens de um dia e indique o que aconteceu. “Não feito” mantém o item como pendência no relatório. “Não houve” tira o item do cálculo.</HelpPanel>}
    </header>
    <DateRange value={range} end={yesterday} onChange={setRange} pending />
    {error && <ErrorState error={error} onRetry={reload} />}
    {loading && !days && <Skeleton className="h-28" />}
    {days?.length === 0 && <p className="sheet p-4 text-sm text-muted">Nenhum dia pendente neste período.</p>}
    {days?.map((day) => <PendingDay key={day.date} day={day} reload={reload} loading={loading} />)}
  </div>;
}
