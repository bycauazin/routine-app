import { ChevronLeft, ChevronRight, Droplet, Flame, Pencil, Trash2, Undo2 } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { formatDayTitle, shiftDate, today as todayDate } from "@/lib/dates";
import { liters } from "@/lib/water";
import { useApi } from "@/lib/use-api";

const timeOf = (iso) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

/** The goal, shown as text; a tap turns it into a field. */
function GoalEditor({ goalMl, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(goalMl));
  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-[13.5px] text-muted hover:text-ink">
        Meta: <span className="num font-[620] text-ink">{liters(goalMl)}</span> <Pencil className="size-3.5" aria-hidden />
      </button>
    );
  }
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await onSave(Number(value))) setEditing(false);
      }}
    >
      <Input aria-label="Meta do dia em ml" type="number" inputMode="numeric" min={250} max={10000} step={50} value={value} onChange={(e) => setValue(e.target.value)} className="w-28" autoFocus />
      <span className="text-[13px] text-muted">ml</span>
      <Button type="submit" size="sm">Salvar</Button>
      <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancelar</Button>
    </form>
  );
}

/**
 * Água: type how much you drank (ml) and register; the day's total against the
 * goal, the logs with their time (remove any, or undo the last one) and the
 * streak of days that reached the goal. Other days through ‹ › (?dia=…).
 */
export function WaterPage() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const realToday = todayDate();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.get("dia") ?? "") ? params.get("dia") : realToday;
  const isToday = date === realToday;
  const { data, error, loading, reload } = useApi(`/water/${date}`);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const goDate = (d) => setParams(d === realToday ? {} : { dia: d }, { replace: true });

  async function run(request, message) {
    setBusy(true);
    try {
      await request();
      reload();
      if (message) toast.success(message);
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function add(e) {
    e.preventDefault();
    const amountMl = Number(amount);
    if (!Number.isInteger(amountMl) || amountMl <= 0) return toast.error("Digite quanto bebeu, em ml. Ex.: 300");
    if (await run(() => api("/water", { method: "POST", body: { amountMl, date } }), `${amountMl} ml registrados.`)) setAmount("");
  }

  const percent = data ? Math.min(100, Math.round((data.totalMl / data.goalMl) * 100)) : 0;
  const reached = data && data.totalMl >= data.goalMl;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <header className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="icon" onClick={() => goDate(shiftDate(date, -1))} aria-label="Dia anterior">
          <ChevronLeft className="size-5" />
        </Button>
        <div className="min-w-0 text-center">
          <p className="label">Água</p>
          <h1 className="mt-0.5 text-[20px] font-[660] leading-tight tracking-[-0.02em] md:text-[24px]">{isToday ? "Hoje" : formatDayTitle(date)}</h1>
          {!isToday && (
            <button type="button" onClick={() => goDate(realToday)} className="mt-1 text-[13.5px] font-[560] text-accent-text hover:underline">
              Voltar para hoje
            </button>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => goDate(shiftDate(date, 1))} aria-label="Próximo dia" disabled={isToday}>
          <ChevronRight className="size-5" />
        </Button>
      </header>

      {error && !data && <ErrorState error={error} onRetry={reload} />}
      {loading && !data && <Skeleton className="h-64" />}

      {data && (
        <>
          <section className="sheet flex flex-col gap-4 px-5 py-5">
            <div className="flex items-end justify-between gap-3">
              <p className="flex items-baseline gap-2">
                <Droplet className="size-6 self-center text-[#4fb3c8]" aria-hidden />
                <span className="num text-[34px] font-[700] leading-none tracking-[-0.03em]">{liters(data.totalMl)}</span>
                <span className="text-[15px] text-muted">de {liters(data.goalMl)}</span>
              </p>
              <span className="num text-[20px] font-[680]">{percent}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-sunk" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Água do dia">
              <div className="h-full rounded-full bg-[#4fb3c8] transition-[width] duration-500 ease-out" style={{ width: `${percent}%` }} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <GoalEditor key={data.goalMl} goalMl={data.goalMl} onSave={(goalMl) => run(() => api("/water/goal", { method: "PATCH", body: { goalMl, date } }), "Meta salva.")} />
              <span className="inline-flex items-center gap-1 text-[13.5px] text-muted" title={`Recorde: ${data.streak.best} dias`}>
                <Flame className="size-4 text-accent-text" aria-hidden />
                <span className="num font-[650] text-ink">{data.streak.current}</span> {data.streak.current === 1 ? "dia seguido" : "dias seguidos"}
                <span className="num">· recorde {data.streak.best}</span>
              </span>
            </div>
            {reached && <p className="text-[13.5px] font-[560] text-accent-text">Meta do dia batida.</p>}
          </section>

          <form onSubmit={add} className="sheet flex items-end gap-2 px-4 py-4">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-[13px] font-[560]">Quanto você bebeu?</span>
              <span className="relative">
                <Input type="number" inputMode="numeric" min={1} max={5000} placeholder="Ex.: 300" value={amount} onChange={(e) => setAmount(e.target.value)} className="pr-10 text-[17px]" />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted">ml</span>
              </span>
            </label>
            <Button type="submit" loading={busy} disabled={!amount}>Registrar</Button>
          </form>

          <section aria-labelledby="logs-title" className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <h2 id="logs-title" className="text-[16.5px] font-[660] tracking-[-0.01em]">Registros</h2>
              {data.logs.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => run(() => api("/water/last", { method: "DELETE", query: { date } }), "Último registro desfeito.")} disabled={busy}>
                  <Undo2 className="size-4" aria-hidden /> Desfazer último
                </Button>
              )}
            </div>
            {data.logs.length === 0 ? (
              <p className="sheet px-4 py-4 text-[14px] text-muted">Nenhum registro {isToday ? "hoje" : "neste dia"}.</p>
            ) : (
              <ul className="sheet divide-y divide-rule">
                {[...data.logs].reverse().map((log) => (
                  <li key={log.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="num w-12 text-[14px] font-[620] text-muted">{timeOf(log.loggedAt)}</span>
                    <span className="num flex-1 text-[15px] font-[600]">{log.amountMl} ml</span>
                    <Button variant="ghost" size="icon-sm" onClick={() => run(() => api(`/water/logs/${log.id}`, { method: "DELETE" }), "Registro apagado.")} disabled={busy} aria-label={`Apagar ${log.amountMl} ml das ${timeOf(log.loggedAt)}`}>
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
