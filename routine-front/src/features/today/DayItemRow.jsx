import { useState } from "react";
import { CalendarClock, Check, ChevronDown, Clock, Clock4, Flame, Inbox, ListChecks, MoreHorizontal, Pencil, Repeat, RotateCcw, SkipForward, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { Menu } from "@/components/ui/Menu";
import { CATEGORY_TINT } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { colorForIcon, itemIcon } from "@/lib/icons";
import { itemKindLabel } from "@/lib/kinds";
import { PERIODS, formatMinute, itemTime } from "@/lib/minutes";

/** One step of a routine block: its own check, and its streak from 2 days in a row. */
function StepRow({ step, disabled, onToggle }) {
  const done = Boolean(step.doneAt);
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={done}
        aria-label={done ? `Desmarcar ${step.name}` : `Marcar ${step.name} como feito`}
        className="flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-sunk disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >
        <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors", done ? "border-accent bg-accent text-accent-ink" : "border-rule-strong bg-paper text-transparent")}>
          <Check className="size-3.5" strokeWidth={3} aria-hidden />
        </span>
        {step.minute !== null && step.minute !== undefined && <span className="num shrink-0 text-[13px] font-[650] text-ink/80">{formatMinute(step.minute)}</span>}
        <span className={cn("min-w-0 flex-1 text-[14px]", done && "text-muted line-through decoration-1")}>{step.name}</span>
        {step.streak >= 2 && (
          <span className="num inline-flex shrink-0 items-center gap-0.5 text-[12px] font-[600] text-accent-text" title={`${step.streak} dias seguidos`}>
            <Flame className="size-3.5" aria-hidden /> {step.streak}
          </span>
        )}
      </button>
    </li>
  );
}

/**
 * One item of the day: a big check, its time (or part of the day), name and
 * category, the steps of a routine block, and a menu with the rest (não houve,
 * atrasar, remarcar, editar, feito em outro horário, excluir).
 * `missed` = a pending item of a day that already passed ("não feita", only shown).
 */
/** The time column of the timeline: the start in big, the end under it (or the part of the day). */
export function TimeAside({ item }) {
  return (
    <div className="num w-14 shrink-0 pt-2.5 text-right sm:w-16">
      {item.period ? (
        <span className="block text-[15px] font-[680] leading-tight">{PERIODS[item.period].label}</span>
      ) : (
        <>
          <span className="block text-[18px] font-[700] leading-none tracking-[-0.01em]">{formatMinute(item.startMinute)}</span>
          {item.endMinute !== null && <span className="mt-1 block text-[13px] font-[560] text-muted">{formatMinute(item.endMinute)}</span>}
        </>
      )}
    </div>
  );
}

/** The item's icon on a tile of its category's color (or its icon theme's color, without a category). Same size as the check. */
function ItemTile({ item, muted }) {
  const icon = itemIcon(item);
  const color = colorForIcon(icon);
  return (
    <span
      className={cn("grid size-10 shrink-0 place-items-center rounded-[12px]", tint(item) ?? "", muted && "opacity-60")}
      style={tint(item) ? undefined : { backgroundColor: `${color}26`, color }}
      aria-hidden
    >
      <ItemIcon name={icon} className="size-5 text-ink" style={tint(item) ? undefined : { color }} />
    </span>
  );
}

const tint = (item) => (item.category ? CATEGORY_TINT[item.category.colorKey] : null);

function LinkedList({ list, blockName, busy, onStep }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mt-2 rounded-[10px] bg-sunk/70 px-2 py-1.5">
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex min-h-8 w-full items-center gap-1.5 px-1.5 text-left text-[12.5px] font-[620] text-muted hover:text-ink">
        <Repeat className="size-3.5 shrink-0" aria-hidden />
        <span>{list.name} <span className="num font-[500]">· {list.steps.filter((step) => step.doneAt).length} de {list.steps.length}</span></span>
        <ChevronDown className={cn("ml-auto size-4 shrink-0 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <ul className="flex flex-col" aria-label={`${list.name} dentro de ${blockName}`}>
          {list.steps.map((step) => (
            <StepRow key={step.id} step={step} disabled={busy || list.status === "SKIPPED"} onToggle={() => onStep(list.itemId, step, !step.doneAt)} />
          ))}
        </ul>
      )}
    </div>
  );
}

export function DayItemRow({ item, missed, showDate, timeAside, busy, onStatus, onDone, onStep, onListStep, onSteps, onShift, onEdit, onReschedule, onToInbox, onRemove }) {
  const done = item.status === "DONE";
  const skipped = item.status === "SKIPPED";
  const timed = item.startMinute !== null;
  const undated = item.date === null;
  const oneOffTask = item.kind === "TASK" && !item.ruleId;
  const steps = item.steps ?? [];
  const stepsDone = steps.filter((s) => s.doneAt).length;
  const tint = item.category ? CATEGORY_TINT[item.category.colorKey] : null;
  // A list (shown inside blocks) starts closed here: its steps are already in the timeline.
  const isList = (item.insideRuleIds ?? []).length > 0;
  const [open, setOpen] = useState(!isList);
  const check = () => onStatus(done ? "PENDING" : "DONE");

  return (
    <li className="flex items-start gap-2.5 sm:gap-3">
      {timeAside && <TimeAside item={item} />}
      <div className={cn("sheet flex min-w-0 flex-1 items-start gap-3 px-3 py-2.5 sm:px-4", done && !item.isUnplanned && "bg-paper/70", skipped && "opacity-70", item.isUnplanned && "border-dashed border-[#d97706]")}>
      {item.isUnplanned ? (
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#d97706]/15 text-[#d97706]" aria-hidden>
          <Zap className="size-5" />
        </span>
      ) : (
      <button
        type="button"
        onClick={check}
        disabled={busy || skipped}
        aria-pressed={done}
        aria-label={done ? `Desmarcar ${item.name}` : `Marcar ${item.name} como feito`}
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-full border-2 transition-[background-color,border-color,transform] duration-200 active:scale-95",
          "disabled:cursor-not-allowed",
          done ? "border-accent bg-accent text-accent-ink" : "border-rule-strong bg-paper text-transparent hover:border-accent-text hover:text-accent-text",
        )}
      >
        <Check className="size-5" strokeWidth={2.6} aria-hidden />
      </button>
      )}

      <ItemTile item={item} muted={(done && !item.isUnplanned) || skipped} />

      <div className="min-w-0 flex-1 pt-0.5">
        <p className={cn("truncate text-[15px] font-[600]", ((done && !item.isUnplanned) || skipped) && "text-muted line-through decoration-1")}>
          {item.name}
          {item.variant && <span className="font-[500] text-muted"> · {item.variant}</span>}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] text-muted">
          {!timeAside && itemTime(item) && <span className="num font-[560] text-ink/80">{itemTime(item)}</span>}
          {showDate && item.date && <span>{formatDate(item.date)}</span>}
          <span>{item.isUnplanned ? "Imprevisto" : itemKindLabel(item)}</span>
          {steps.length > 0 && <span className="num">{stepsDone} de {steps.length} afazeres</span>}
          {item.category && (
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-px text-ink", tint)}>
              <ItemIcon name={item.category.icon} className="size-3" aria-hidden />
              {item.category.name}
            </span>
          )}
          {skipped && <span className="font-[560]">não houve{item.skipReason && item.skipReason !== "Não houve" ? ` · ${item.skipReason}` : ""}</span>}
          {missed && <span className="font-[560] text-danger">não feita</span>}
          {item.displacedBy && !done && (
            <span className="inline-flex items-center gap-1 font-[560] text-[#d97706]">
              <Zap className="size-3" aria-hidden /> tirado por {item.displacedBy.name}
            </span>
          )}
          {item.isOverridden && item.ruleId && <span title="Mudado só neste dia">editado</span>}
        </p>
        {steps.length > 0 && isList && (
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="mt-1 inline-flex items-center gap-1 text-[13px] font-[560] text-accent-text hover:underline">
            <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden /> {open ? "Fechar" : "Ver afazeres"}
          </button>
        )}
        {steps.length > 0 && open && (
          <ul className="-ml-1.5 mt-1.5 flex flex-col" aria-label={`Afazeres de ${item.name}`}>
            {steps.map((step) => (
              <StepRow key={step.id} step={step} disabled={busy || skipped} onToggle={() => onStep(step, !step.doneAt)} />
            ))}
          </ul>
        )}
        {(item.lists ?? []).map((list) => (
          <LinkedList key={list.itemId} list={list} blockName={item.name} busy={busy} onStep={onListStep} />
        ))}
      </div>

      <Menu
        trigger={(p) => (
          <Button variant="ghost" size="icon-sm" onClick={p.toggle} aria-expanded={p["aria-expanded"]} aria-haspopup="menu" aria-label={`Mais ações de ${item.name}`} disabled={busy}>
            <MoreHorizontal className="size-4" />
          </Button>
        )}
        items={[
          { label: "Feito em outro horário…", icon: Clock4, onSelect: onDone, hidden: done || skipped || undated },
          { label: "Não houve", icon: SkipForward, onSelect: () => onStatus("SKIPPED"), hidden: skipped || done || undated },
          { label: "Voltar para pendente", icon: RotateCcw, onSelect: () => onStatus("PENDING"), hidden: !skipped },
          { label: "Atrasar 15 min", icon: Clock, onSelect: () => onShift(15), hidden: !timed || done || skipped },
          { label: "Atrasar 30 min", icon: Clock, onSelect: () => onShift(30), hidden: !timed || done || skipped },
          { label: "Atrasar 1 hora", icon: Clock, onSelect: () => onShift(60), hidden: !timed || done || skipped },
          { label: undated ? "Escolher um dia…" : "Remarcar…", icon: CalendarClock, onSelect: onReschedule, hidden: done },
          { label: "Mover para “Quando der”", icon: Inbox, onSelect: onToInbox, hidden: !oneOffTask || undated || done },
          { label: "Afazeres…", icon: ListChecks, onSelect: onSteps, hidden: undated },
          { label: "Editar…", icon: Pencil, onSelect: onEdit },
          { label: item.ruleId ? "Tirar da rotina…" : "Excluir", icon: Trash2, onSelect: onRemove, danger: true },
        ]}
      />
      </div>
    </li>
  );
}
