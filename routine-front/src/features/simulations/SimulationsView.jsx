import { AlertTriangle, CalendarCheck2, Copy, FlaskConical, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { Field, Input, Select } from "@/components/ui/Field";
import { Menu } from "@/components/ui/Menu";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { WeekdayPicker } from "@/features/settings/RoutineSettings";
import { ChoiceCards } from "@/features/today/ItemDialogs";
import { StepsEditor, fromEditorSteps, toEditorSteps } from "@/features/today/StepsEditor";
import { PeriodBand } from "@/features/today/PeriodBand";
import { TimeFields } from "@/features/today/TimeFields";
import { api } from "@/lib/api";
import { bandInset, layoutDay, periodBands } from "@/lib/agenda";
import { CATEGORY_TINT } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { formatDate, shiftDate, today } from "@/lib/dates";
import { formatMinute, formatRange, timeBody, timeValues } from "@/lib/minutes";
import { hoursByCategory, moveBlock, newKey, overlaps, removeDay, snap } from "@/lib/simulation";
import { useApi } from "@/lib/use-api";
import { WEEKDAY_SHORT } from "@/lib/weekdays";

const HOUR = 56;
const DAYS = [1, 2, 3, 4, 5, 6, 0];
const fmtHours = (h) => `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(h)} h`;

/** New simulation: a name and where it starts from. */
function NewDialog({ simulations, onClose, onCreated }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [from, setFrom] = useState("current");
  const [other, setOther] = useState(simulations[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api("/simulations", { method: "POST", body: { name, from: from === "other" ? other : from } });
      onCreated(data);
    } catch (err) {
      toast.error(err.fields?.name ?? err.message);
    } finally {
      setSaving(false);
    }
  }
  const options = [
    ["current", "Cópia da rotina atual", "Vem com tudo o que você tem hoje."],
    ...(simulations.length ? [["other", "Cópia de outra simulação", "Para testar uma variação."]] : []),
    ["empty", "Vazia", "Grade em branco."],
  ];
  return (
    <Dialog open size="sm" onClose={onClose} title="Nova simulação" footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form="new-sim" loading={saving}>Criar</Button></>}>
      <form id="new-sim" className="grid gap-4" onSubmit={submit} noValidate>
        <Field label="Nome">{(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Ex.: Com academia 18h" />}</Field>
        <ChoiceCards name="from" legend="Começar de" value={from} onChange={setFrom} options={options} />
        {from === "other" && (
          <Field label="Qual simulação">
            {(p) => (
              <Select {...p} value={other} onChange={(e) => setOther(e.target.value)}>
                {simulations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            )}
          </Field>
        )}
      </form>
    </Dialog>
  );
}

/** Create or edit a block of the simulation (all its weekdays). */
function BlockDialog({ block, day, categories, onClose, onSave, onDuplicate, onRemoveDay, onRemove }) {
  const editing = Boolean(block.key);
  const [name, setName] = useState(block.name ?? "");
  const [weekdays, setWeekdays] = useState(block.weekdays ?? [day]);
  const [categoryId, setCategoryId] = useState(block.categoryId ?? "");
  const [time, setTime] = useState(timeValues(block, "exact"));
  const [steps, setSteps] = useState(() => toEditorSteps(block.steps));
  function submit(e) {
    e.preventDefault();
    if (!name.trim() || weekdays.length === 0) return;
    onSave({ ...block, key: block.key ?? newKey(), name: name.trim(), weekdays, categoryId: categoryId || null, ...timeBody(time), steps: fromEditorSteps(steps, "none"), insideKeys: block.insideKeys ?? [] });
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title={editing ? `Bloco: ${block.name}` : "Novo bloco"}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form="sim-block">Salvar</Button></>}
    >
      <form id="sim-block" className="grid gap-4" onSubmit={submit} noValidate>
        <Field label="Nome">{(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Ex.: Academia" autoFocus={!editing} />}</Field>
        <WeekdayPicker value={weekdays} onChange={setWeekdays} />
        <TimeFields values={time} setValues={setTime} errors={{}} />
        <Field label="Categoria" optional>
          {(p) => (
            <Select {...p} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Sem categoria</option>
              {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          )}
        </Field>
        <StepsEditor steps={steps} onChange={setSteps} hint={null} />
        {editing && (
          <div className="flex flex-wrap gap-2 border-t border-rule pt-3">
            <Button variant="secondary" size="sm" onClick={onDuplicate}><Copy className="size-4" aria-hidden /> Duplicar</Button>
            {block.weekdays.length > 1 && <Button variant="secondary" size="sm" onClick={onRemoveDay}>Tirar só de {WEEKDAY_SHORT[day]}</Button>}
            <Button variant="danger-ghost" size="sm" onClick={onRemove}><Trash2 className="size-4" aria-hidden /> Apagar bloco</Button>
          </div>
        )}
      </form>
    </Dialog>
  );
}

/** Hours per category: the current routine against this simulation, and overlaps. */
function Compare({ blocks, current, categories }) {
  const now = hoursByCategory(current ?? []);
  const sim = hoursByCategory(blocks);
  const names = new Map((categories ?? []).map((c) => [c.id, c]));
  const keys = [...new Set([...Object.keys(now), ...Object.keys(sim)])].sort((a, b) => (sim[b] ?? 0) - (sim[a] ?? 0));
  const used = Object.values(sim).reduce((a, b) => a + b, 0);
  const clashes = overlaps(blocks);
  return (
    <section className="sheet grid gap-3 px-4 py-4">
      <h3 className="text-[15px] font-[660]">Comparar com a rotina atual <span className="text-[12.5px] font-[450] text-muted">(horas por semana)</span></h3>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {keys.map((k) => {
          const a = now[k] ?? 0;
          const b = sim[k] ?? 0;
          const diff = b - a;
          const cat = names.get(k);
          return (
            <li key={k} className="flex items-center gap-2 text-[13.5px]">
              <span className={cn("size-3 shrink-0 rounded-full", cat ? CATEGORY_TINT[cat.colorKey] : "bg-sunk")} aria-hidden />
              <span className="min-w-0 flex-1 truncate">{cat?.name ?? "Sem categoria"}</span>
              <span className="num text-muted">{fmtHours(a)} →</span>
              <span className="num font-[650]">{fmtHours(b)}</span>
              {Math.abs(diff) >= 0.05 && <span className={cn("num w-14 text-right text-[12.5px] font-[600]", diff > 0 ? "text-accent-text" : "text-muted")}>{diff > 0 ? "+" : "−"}{fmtHours(Math.abs(diff))}</span>}
            </li>
          );
        })}
      </ul>
      <p className="text-[13px] text-muted">Livre na semana (das 24 h × 7): <span className="num font-[620] text-ink">{fmtHours(168 - used)}</span></p>
      {clashes.length > 0 && (
        <div className="grid gap-1 rounded-md bg-sunk px-3 py-2 text-[13px]">
          <span className="flex items-center gap-1.5 font-[600] text-danger"><AlertTriangle className="size-4" aria-hidden /> Blocos no mesmo horário</span>
          {clashes.slice(0, 6).map((c, i) => <span key={i}>{WEEKDAY_SHORT[c.day]}: {c.a} e {c.b}</span>)}
        </div>
      )}
    </section>
  );
}

/**
 * Simular: draft routines on the same grid as Semana. Tap an empty slot to add
 * a block, tap a block to edit it, drag it to move (time in 15 min steps, or
 * another day: a block of several days then splits). Saved as you go; it only
 * touches the real routine with "Usar esta rotina a partir de…".
 */
export function SimulationsView() {
  const toast = useToast();
  const { data: simulations, error, loading, reload } = useApi("/simulations");
  const { data: categories } = useApi("/categories");
  const { data: currentData } = useApi("/simulations/current");
  const [selectedId, setSelectedId] = useState(null);
  const [blocks, setBlocks] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [applyFrom, setApplyFrom] = useState(shiftDate(today(), 1));
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);
  const saveTimer = useRef(null);
  const drag = useRef(null);

  const selected = simulations?.find((s) => s.id === selectedId) ?? simulations?.[0] ?? null;
  useEffect(() => {
    if (selected) setBlocks(selected.blocks);
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 6 * HOUR;
  }, [selected?.id]);

  /** Local change now, saved to the server a moment later (one request per burst of edits). */
  function change(next) {
    setBlocks(next);
    clearTimeout(saveTimer.current);
    const id = selected.id;
    saveTimer.current = setTimeout(async () => {
      try {
        await api(`/simulations/${id}`, { method: "PATCH", body: { blocks: next } });
      } catch (err) {
        toast.error(err.message);
      }
    }, 500);
  }

  const byDay = useMemo(() => {
    const map = new Map(DAYS.map((d) => [d, []]));
    for (const b of blocks ?? []) for (const d of b.weekdays) map.get(d)?.push({ ...b, id: `${b.key}:${d}`, category: categories?.find((c) => c.id === b.categoryId) ?? null });
    return map;
  }, [blocks, categories]);
  const bandsByDay = useMemo(() => new Map(DAYS.map((d) => [d, periodBands(byDay.get(d))])), [byDay]);

  function minuteAt(column, clientY) {
    const rect = column.getBoundingClientRect();
    return snap(((clientY - rect.top) / HOUR) * 60);
  }

  // Dragging is for the mouse only. A finger is not precise enough and has to
  // scroll the grid, so on touch a card just opens for editing (time typed in).
  function onCardDown(e, block, day) {
    e.stopPropagation();
    const touch = e.pointerType !== "mouse";
    if (!touch) e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { key: block.key, day, x: e.clientX, y: e.clientY, offset: e.clientY - e.currentTarget.getBoundingClientRect().top, moved: false, touch };
  }
  function onCardMove(e) {
    const d = drag.current;
    if (!d) return;
    if (d.touch) {
      if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 10) drag.current = null;
      return;
    }
    if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 6) d.moved = true;
    if (d.moved) e.currentTarget.style.transform = `translate(${e.clientX - d.x}px, ${e.clientY - d.y}px)`;
  }
  function onCardUp(e, block, day) {
    const d = drag.current;
    drag.current = null;
    e.currentTarget.style.transform = "";
    if (!d) return;
    if (!d.moved || d.touch) return setDialog({ type: "block", block, day });
    e.currentTarget.style.visibility = "hidden";
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-sim-day]");
    e.currentTarget.style.visibility = "";
    if (!target) return;
    const toDay = Number(target.dataset.simDay);
    const start = minuteAt(target, e.clientY - d.offset);
    change(moveBlock(blocks, block.key, day, toDay, start));
  }

  async function apply() {
    setBusy(true);
    try {
      const { data } = await api(`/simulations/${selected.id}/apply`, { method: "POST", body: { from: applyFrom } });
      toast.success(`Pronto: ${data.applied} blocos viraram sua rotina a partir de ${formatDate(data.from)}.`);
      setDialog(null);
    } catch (err) {
      toast.error(err.fields?.from ?? err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeSimulation() {
    setBusy(true);
    try {
      await api(`/simulations/${selected.id}`, { method: "DELETE" });
      setSelectedId(null);
      setDialog(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function rename(name) {
    try {
      await api(`/simulations/${selected.id}`, { method: "PATCH", body: { name } });
      reload();
      setDialog(null);
    } catch (err) {
      toast.error(err.fields?.name ?? err.message);
    }
  }

  if (error && !simulations) return <ErrorState error={error} onRetry={reload} />;
  if (loading && !simulations) return <Skeleton className="h-[60dvh]" />;

  // Parts of the day are bands in the grid; only blocks with no time at all sit under the day name.
  const untimed = (blocks ?? []).filter((b) => b.startMinute === null && !b.period);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center gap-2">
        {simulations?.length > 0 && (
          <Select aria-label="Simulação" value={selected?.id ?? ""} onChange={(e) => setSelectedId(e.target.value)} className="w-auto min-w-48 flex-1 sm:flex-none">
            {simulations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        )}
        <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={() => setDialog({ type: "new" })}><Plus className="size-4" aria-hidden /> Nova<span className="hidden sm:inline"> simulação</span></Button>
        {selected && (
          <>
            <Button onClick={() => setDialog({ type: "apply" })}><CalendarCheck2 className="size-4" aria-hidden /> Usar esta rotina</Button>
            <Menu
              trigger={(p) => (
                <Button variant="ghost" size="icon" onClick={p.toggle} aria-expanded={p["aria-expanded"]} aria-haspopup="menu" aria-label="Mais ações da simulação">
                  <MoreHorizontal className="size-4" />
                </Button>
              )}
              items={[
                { label: "Renomear…", icon: Pencil, onSelect: () => setDialog({ type: "rename" }) },
                { label: "Apagar simulação…", icon: Trash2, danger: true, onSelect: () => setDialog({ type: "remove" }) },
              ]}
            />
          </>
        )}
        </div>
      </header>

      {!selected && (
        <EmptyState
          icon={FlaskConical}
          title="Teste rotinas sem medo"
          description="Monte versões da sua semana (academia às 18h, home trocado, treino em outro dia) e compare. Nada muda na rotina real até você escolher “Usar esta rotina”."
          action={<Button onClick={() => setDialog({ type: "new" })}>Nova simulação</Button>}
        />
      )}

      {selected && blocks && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="min-w-0 flex-1 text-[13px] text-muted">
              <span className="pointer-coarse:hidden">Clique num horário vazio para criar um bloco, clique num bloco para editar, arraste para mudar a hora ou o dia.</span>
              <span className="hidden pointer-coarse:inline">Toque em “Novo bloco” ou num bloco para escrever o nome, os dias e o horário. Deslize para ver os outros dias.</span>
              {" "}Salva sozinho.
            </p>
            <Button size="sm" onClick={() => setDialog({ type: "block", block: { weekdays: [new Date().getDay()], startMinute: 8 * 60, endMinute: 9 * 60, period: null }, day: new Date().getDay() })}>
              <Plus className="size-4" aria-hidden /> Novo bloco
            </Button>
          </div>
          <div ref={scrollRef} className="sheet week-scroll relative max-h-[calc(100dvh-16rem)] min-h-[24rem] overflow-auto">
            <div className="week-grid grid">
              <div className="sticky left-0 top-0 z-30 border-b border-rule bg-paper" />
              {DAYS.map((d) => (
                <div key={d} className="sticky top-0 z-20 flex flex-col gap-1 border-b border-l border-rule bg-paper px-2 py-2.5">
                  <span className="text-[13px] font-[600] uppercase tracking-[0.04em] text-muted">{WEEKDAY_SHORT[d]}</span>
                  {untimed.filter((b) => b.weekdays.includes(d)).map((b) => (
                    <button key={b.key} type="button" onClick={() => setDialog({ type: "block", block: b, day: d })} className="truncate rounded-[6px] bg-sunk px-1.5 py-0.5 text-left text-[12px] font-[560]">
                      {b.name}
                    </button>
                  ))}
                </div>
              ))}
              <div className="sticky left-0 z-10 bg-paper" style={{ height: 24 * HOUR }}>
                {Array.from({ length: 24 }, (_, h) => (
                  <span key={h} className="num absolute right-2 -translate-y-1/2 text-[13.5px] font-[600] text-muted" style={{ top: h * HOUR }}>{h === 0 ? "" : formatMinute(h * 60)}</span>
                ))}
              </div>
              {DAYS.map((d) => (
                <div
                  key={d}
                  data-sim-day={d}
                  data-day-col
                  className="relative cursor-copy border-l border-rule"
                  style={{ height: 24 * HOUR, backgroundImage: "linear-gradient(to bottom, var(--rule) 1px, transparent 1px)", backgroundSize: `100% ${HOUR}px` }}
                  onClick={(e) => {
                    if (e.target !== e.currentTarget) return;
                    const start = minuteAt(e.currentTarget, e.clientY);
                    setDialog({ type: "block", block: { weekdays: [d], startMinute: start, endMinute: Math.min(1440, start + 60), period: null }, day: d });
                  }}
                >
                  {bandsByDay.get(d).map((band) => (
                    <PeriodBand key={band.item.id} band={band} hour={HOUR} onOpen={() => setDialog({ type: "block", block: band.item, day: d })} />
                  ))}
                  {layoutDay(byDay.get(d)).map(({ item, start, end, column, columns }) => {
                    const inset = bandInset(bandsByDay.get(d), start, end);
                    return (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onPointerDown={(e) => onCardDown(e, item, d)}
                      onPointerMove={onCardMove}
                      onPointerUp={(e) => onCardUp(e, item, d)}
                      onPointerCancel={() => { drag.current = null; }}
                      onKeyDown={(e) => e.key === "Enter" && setDialog({ type: "block", block: item, day: d })}
                      title={`${formatRange(item.startMinute, item.endMinute)} · ${item.name}`}
                      className={cn("absolute z-[1] cursor-pointer select-none pointer-fine:cursor-grab pointer-fine:touch-none pointer-fine:active:cursor-grabbing overflow-hidden rounded-[8px] border border-ink/10 px-2 py-1 text-[13px] leading-snug text-ink", item.category ? CATEGORY_TINT[item.category.colorKey] : "bg-sunk")}
                      style={{ top: (start / 60) * HOUR + 1, height: ((end - start) / 60) * HOUR - 2, left: `calc(${inset}px + (100% - ${inset}px) * ${column / columns} + 2px)`, width: `calc((100% - ${inset}px) / ${columns} - 4px)` }}
                    >
                      <span className="block truncate font-[620]">{item.name}</span>
                      {end - start >= 45 && <span className="num block truncate text-[12.5px] text-ink/70">{formatRange(item.startMinute, item.endMinute)}</span>}
                    </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <Compare blocks={blocks} current={currentData?.blocks} categories={categories} />
        </>
      )}

      {dialog?.type === "new" && (
        <NewDialog
          simulations={simulations ?? []}
          onClose={() => setDialog(null)}
          onCreated={(s) => {
            setDialog(null);
            setSelectedId(s.id);
            reload();
          }}
        />
      )}
      {dialog?.type === "block" && (
        <BlockDialog
          block={dialog.block}
          day={dialog.day}
          categories={categories}
          onClose={() => setDialog(null)}
          onSave={(b) => {
            change(blocks.some((x) => x.key === b.key) ? blocks.map((x) => (x.key === b.key ? b : x)) : [...blocks, b]);
            setDialog(null);
          }}
          onDuplicate={() => {
            change([...blocks, { ...dialog.block, key: newKey(), name: `${dialog.block.name} (cópia)`, insideKeys: [] }]);
            setDialog(null);
          }}
          onRemoveDay={() => {
            change(removeDay(blocks, dialog.block.key, dialog.day));
            setDialog(null);
          }}
          onRemove={() => {
            change(blocks.filter((x) => x.key !== dialog.block.key).map((x) => ({ ...x, insideKeys: (x.insideKeys ?? []).filter((k) => k !== dialog.block.key) })));
            setDialog(null);
          }}
        />
      )}
      {dialog?.type === "apply" && (
        <Dialog open size="sm" onClose={() => setDialog(null)} title="Usar esta rotina?" footer={<><Button variant="secondary" onClick={() => setDialog(null)}>Cancelar</Button><Button onClick={apply} loading={busy}>Usar a partir desta data</Button></>}>
          <div className="grid gap-3">
            <p className="text-[14px] text-muted">A partir do dia escolhido, seus fixos atuais saem e os blocos de “{selected.name}” viram a sua rotina. Os dias antes disso, os relatórios e as sequências ficam como estavam.</p>
            <Field label="A partir de">{(p) => <Input {...p} type="date" min={today()} value={applyFrom} onChange={(e) => setApplyFrom(e.target.value)} />}</Field>
          </div>
        </Dialog>
      )}
      {dialog?.type === "rename" && <RenameDialog name={selected.name} onClose={() => setDialog(null)} onSave={rename} />}
      {dialog?.type === "remove" && (
        <ConfirmDialog open title="Apagar simulação?" description={`“${selected.name}” será apagada. Sua rotina real não muda.`} confirmLabel="Apagar" loading={busy} onClose={() => setDialog(null)} onConfirm={removeSimulation} />
      )}
    </div>
  );
}

function RenameDialog({ name, onClose, onSave }) {
  const [value, setValue] = useState(name);
  return (
    <Dialog open size="sm" onClose={onClose} title="Renomear" footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form="rename-sim">Salvar</Button></>}>
      <form id="rename-sim" onSubmit={(e) => { e.preventDefault(); onSave(value); }}>
        <Field label="Nome">{(p) => <Input {...p} value={value} onChange={(e) => setValue(e.target.value)} maxLength={60} autoFocus />}</Field>
      </form>
    </Dialog>
  );
}
