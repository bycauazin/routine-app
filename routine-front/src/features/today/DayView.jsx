import { AlertCircle, CalendarPlus, Clock, Droplet, ChevronLeft, ChevronRight, Inbox, Repeat, Sun, Zap } from "lucide-react";
import { Fragment, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { HelpButton, HelpPanel } from "@/components/ui/Help";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { formatDayTitle, greeting, shiftDate, today as todayDate } from "@/lib/dates";
import { ADD_OPTIONS } from "@/lib/kinds";
import { liters } from "@/lib/water";
import { SPECIAL } from "@/lib/special";
import { RuleDialog } from "@/features/settings/RoutineSettings";
import { formatMinute, sortMinute } from "@/lib/minutes";
import { useNowMinute } from "@/lib/use-now-minute";
import { useApi } from "@/lib/use-api";
import { DayItemRow } from "./DayItemRow";
import { DoneDialog, EditItemDialog, OneOffDialog, RescheduleDialog, StepsDialog, UnplannedDialog } from "./ItemDialogs";

function Progress({ progress }) {
  if (progress.percent === null) {
    return <p className="text-[13.5px] text-muted">{progress.total === 0 ? "Nada marcado para este dia." : "Tudo deste dia ficou como “não houve”."}</p>;
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13.5px] text-muted">
          <span className="num font-[650] text-ink">{progress.done}</span> de <span className="num">{progress.total - progress.skipped}</span> feitos
        </p>
        <p className="num text-[20px] font-[680] tracking-[-0.02em]">{progress.percent}%</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-sunk" role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso do dia">
        <div className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out" style={{ width: `${progress.percent}%` }} />
      </div>
    </div>
  );
}

/** The "agora" line between the timeline's items. */
function NowLine({ minute }) {
  return (
    <li aria-label={`Agora, ${formatMinute(minute)}`} className="flex items-center gap-2.5 py-0.5 sm:gap-3">
      <span className="flex w-14 shrink-0 justify-end sm:w-16">
        <span className="num rounded-full bg-accent px-2 py-0.5 text-[13px] font-[680] text-accent-ink">{formatMinute(minute)}</span>
      </span>
      <span className="h-0.5 flex-1 rounded-full bg-accent" />
    </li>
  );
}

function Section({ id, title, icon: Icon, tone, children }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className={`flex items-center gap-2 text-[16.5px] font-[660] tracking-[-0.01em] ${tone ?? "text-ink"}`}>
        {Icon && <Icon className="size-[18px]" aria-hidden />} {title}
      </h2>
      <ul className="flex flex-col gap-2">{children}</ul>
    </section>
  );
}

/**
 * Dia (the summary): the day's timeline in time order with a big check per
 * item (routine blocks with their steps), the progress on top,
 * late tasks and tasks without a date ("Quando der"), "para hoje, sem horário"
 * for what has no time, and quick actions. Other days through ‹ ›.
 */
export function DayView({ date, onDate }) {
  const { user } = useAuth();
  const toast = useToast();
  const realToday = todayDate();
  const isToday = date === realToday;
  const isPast = date < realToday;
  const now = useNowMinute();

  const { data: day, error, loading, reload } = useApi(`/days/${date}`);
  const { data: categories } = useApi("/categories");
  const [dialog, setDialog] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [addHelp, setAddHelp] = useState(false);

  const close = () => setDialog(null);
  const saved = () => {
    setDialog(null);
    reload();
  };

  async function act(id, request, message) {
    setBusyId(id);
    try {
      await request();
      if (message) toast.success(message);
      await reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const rowProps = (item, { showDate = false } = {}) => ({
    item,
    showDate,
    busy: busyId === item.id,
    missed: item.status === "PENDING" && item.date !== null && item.date < realToday,
    onStatus: (status) => act(item.id, () => api(`/day-items/${item.id}/status`, { method: "PATCH", body: { status } }), status === "SKIPPED" ? "Marcado como “não houve”." : null),
    onDone: () => setDialog({ type: "done", item }),
    onStep: (step, done) => act(item.id, () => api(`/day-items/${item.id}/steps/${step.id}`, { method: "PATCH", body: { done } })),
    onListStep: (listId, step, done) => act(item.id, () => api(`/day-items/${listId}/steps/${step.id}`, { method: "PATCH", body: { done } })),
    onShift: (minutes) => act(item.id, () => api(`/day-items/${item.id}/shift`, { method: "POST", body: { minutes } }), `Atrasado ${minutes >= 60 ? `${minutes / 60} h` : `${minutes} min`}.`),
    onEdit: () => setDialog({ type: "edit", item }),
    onSteps: () => setDialog({ type: "steps", item }),
    onReschedule: () => setDialog({ type: "reschedule", item }),
    onToInbox: () => act(item.id, () => api(`/day-items/${item.id}`, { method: "PATCH", body: { date: null } }), "Foi para “Quando der”."),
    onRemove: () => setDialog({ type: "remove", item }),
  });


  const first = user?.name?.split(" ")[0];
  const timed = day?.items ?? [];
  // Where the "agora" line goes: before the first item that has not started yet.
  const nowIndex = isToday ? timed.findIndex((i) => sortMinute(i) > now) : -1;
  const nowAtEnd = isToday && timed.length > 0 && nowIndex === -1;
  const empty = day && timed.length === 0 && day.anytime.length === 0 && day.overdue.length === 0 && day.inbox.length === 0;

  return (
    <>
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="icon" onClick={() => onDate(shiftDate(date, -1))} aria-label="Dia anterior">
            <ChevronLeft className="size-5" />
          </Button>
          <div className="min-w-0 text-center">
            <p className="label">{isToday ? "Hoje" : isPast ? "Dia que passou" : "Próximo dia"}</p>
            <h1 className="mt-0.5 text-balance text-[18px] font-[660] leading-tight tracking-[-0.02em] sm:text-[20px] md:text-[24px]">{formatDayTitle(date)}</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onDate(shiftDate(date, 1))} aria-label="Próximo dia">
            <ChevronRight className="size-5" />
          </Button>
        </div>
        {isToday ? (
          <p className="text-center text-[14px] text-muted">
            {greeting()}
            {first ? `, ${first}` : ""}!
          </p>
        ) : (
          <button type="button" onClick={() => onDate(realToday)} className="mx-auto text-[13.5px] font-[560] text-accent-text hover:underline">
            Voltar para hoje
          </button>
        )}
      </header>

      {error && !day && <ErrorState error={error} onRetry={reload} />}
      {loading && !day && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      )}

      {day && (
        <>
          <section className="sheet px-4 py-3.5">
            <Progress progress={day.progress} />
          </section>

          {day.special ? (
            <section className="sheet flex flex-wrap items-center gap-3 px-4 py-2.5">
              {(() => {
                const Icon = SPECIAL[day.special.kind].icon;
                return <Icon className="size-[18px] shrink-0 text-accent-text" aria-hidden />;
              })()}
              <span className="text-[14px] font-[600]">{day.special.name ?? SPECIAL[day.special.kind].label}</span>
              <span className="text-[12.5px] text-muted">{SPECIAL[day.special.kind].label} · o que pula em dias especiais não aparece</span>
              <Button variant="ghost" size="sm" className="ml-auto" loading={busyId === "special"} onClick={() => act("special", () => api(`/special-days/${day.special.id}`, { method: "DELETE" }), "Dia especial desmarcado.")}>Desmarcar</Button>
            </section>
          ) : (
            !isPast && (
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
                <span>{isToday ? "Hoje é" : "Este dia é"}</span>
                {["HOLIDAY", "SICK"].map((kind) => {
                  const Icon = SPECIAL[kind].icon;
                  return (
                    <Button key={kind} variant="secondary" size="sm" loading={busyId === `special-${kind}`} onClick={() => act(`special-${kind}`, () => api("/special-days", { method: "POST", body: { kind, from: date } }), `Marcado como ${SPECIAL[kind].label.toLowerCase()}.`)}>
                      <Icon className="size-4" aria-hidden /> {SPECIAL[kind].label}
                    </Button>
                  );
                })}
              </div>
            )
          )}

          {day.water && (
            <Link to={isToday ? "/agua" : `/agua?dia=${date}`} className="sheet flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-sunk">
              <Droplet className="size-[18px] shrink-0 text-[#4fb3c8]" aria-hidden />
              <span className="text-[14px]">
                Água: <span className="num font-[650]">{liters(day.water.totalMl)}</span> <span className="text-muted">de {liters(day.water.goalMl)}</span>
              </span>
              <span className="ml-auto h-1.5 w-20 overflow-hidden rounded-full bg-sunk" aria-hidden>
                <span className="block h-full rounded-full bg-[#4fb3c8]" style={{ width: `${Math.min(100, Math.round((day.water.totalMl / day.water.goalMl) * 100))}%` }} />
              </span>
            </Link>
          )}


          <section aria-labelledby="add-title" className="flex flex-col gap-2">
            <div className="flex items-center gap-1">
              <h2 id="add-title" className="text-[16.5px] font-[660] tracking-[-0.01em]">Adicionar</h2>
              <HelpButton open={addHelp} onClick={() => setAddHelp((value) => !value)} about="adicionar tarefas e compromissos" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {ADD_OPTIONS.map((option) => {
                const Icon = option.key === "fixed" ? Repeat : option.key === "unplanned" ? Zap : CalendarPlus;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setDialog({ type: option.key })}
                    className="sheet flex min-w-0 flex-col items-center gap-1.5 px-2 py-3 text-center transition-colors sm:flex-row sm:gap-3 sm:px-3.5 sm:text-left hover:bg-sunk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-selected text-accent-text">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="block max-w-full truncate text-[14px] font-[620]">{option.label}</span>
                  </button>
                );
              })}
            </div>
            {addHelp && (
              <HelpPanel>
                {ADD_OPTIONS.map((option) => (
                  <span key={option.key} className="mb-1.5 block">
                    <strong>{option.label}.</strong> {option.hint}
                  </span>
                ))}
                Tudo o que é fixo fica listado na{" "}
                <Link to="/configuracoes/rotina" className="font-[560] text-accent-text hover:underline">
                  rotina fixa
                </Link>
                .
              </HelpPanel>
            )}
          </section>

          {day.overdue.length > 0 && (
            <Section id="overdue-title" title="Atrasadas" icon={AlertCircle} tone="text-danger">
              {day.overdue.map((item) => (
                <DayItemRow key={item.id} {...rowProps(item, { showDate: true })} />
              ))}
            </Section>
          )}

          {day.anytime.length > 0 && (
            <Section id="anytime-title" title={isToday ? "Para hoje, sem horário" : "Neste dia, sem horário"} icon={Sun}>
              {day.anytime.map((item) => (
                <DayItemRow key={item.id} {...rowProps(item)} />
              ))}
            </Section>
          )}

          {timed.length > 0 && (
            <Section id="timeline-title" title="Linha do tempo" icon={Clock}>
              {timed.map((item, index) => (
                <Fragment key={item.id}>
                  {index === nowIndex && <NowLine minute={now} />}
                  <DayItemRow {...rowProps(item)} timeAside />
                </Fragment>
              ))}
              {nowAtEnd && <NowLine minute={now} />}
            </Section>
          )}

          {day.inbox.length > 0 && (
            <Section id="inbox-title" title="Quando der (sem dia marcado)" icon={Inbox}>
              {day.inbox.map((item) => (
                <DayItemRow key={item.id} {...rowProps(item)} />
              ))}
            </Section>
          )}


          {empty && (
            <EmptyState
              icon={Repeat}
              title={isPast ? "Nada neste dia" : "Dia livre"}
              description="Livre não é falha: é só um dia sem nada marcado. Cadastre sua rotina fixa (trabalho, treino, rotina diária, rotina de dormir…) para ela aparecer aqui nos dias certos."
              action={
                <Link to="/configuracoes/rotina" className="text-[14px] font-[600] text-accent-text hover:underline">
                  Cadastrar rotina fixa
                </Link>
              }
            />
          )}
        </>
      )}

      {dialog?.type === "unplanned" && <UnplannedDialog date={date} categories={categories} onClose={close} onSaved={saved} />}
      {dialog?.type === "oneOff" && <OneOffDialog date={date} categories={categories} onClose={close} onSaved={saved} />}
      {dialog?.type === "fixed" && <RuleDialog categories={categories} startDate={date} onClose={close} onSaved={saved} />}
      {dialog?.type === "edit" && <EditItemDialog item={dialog.item} categories={categories} onClose={close} onSaved={saved} onListsChanged={reload} />}
      {dialog?.type === "reschedule" && <RescheduleDialog item={dialog.item} onClose={close} onSaved={saved} />}
      {dialog?.type === "steps" && <StepsDialog item={dialog.item} onClose={close} onSaved={saved} />}
      {dialog?.type === "done" && <DoneDialog item={dialog.item} onClose={close} onSaved={saved} />}
      {dialog?.type === "remove" && (
        <ConfirmDialog
          open
          title={dialog.item.ruleId ? "Tirar da rotina?" : "Excluir item?"}
          description={dialog.item.ruleId ? `“${dialog.item.name}” sai a partir deste dia (${dialog.item.date.split("-").reverse().join("/")}), em todos os dias da semana dele. Os dias que já passaram ficam como estavam. Para pular só um dia, use “Não houve”.` : dialog.item.name}
          confirmLabel={dialog.item.ruleId ? "Tirar da rotina" : undefined}
          loading={busyId === dialog.item.id}
          onClose={close}
          onConfirm={() =>
            act(
              dialog.item.id,
              () => (dialog.item.ruleId ? api(`/rules/${dialog.item.ruleId}`, { method: "DELETE", query: { from: dialog.item.date } }) : api(`/day-items/${dialog.item.id}`, { method: "DELETE" })),
              dialog.item.ruleId ? "Saiu da rotina." : "Item excluído.",
            ).then(close)
          }
        />
      )}
    </>
  );
}
