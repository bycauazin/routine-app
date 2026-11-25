import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input, Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDate, today } from "@/lib/dates";
import { formatMinute, itemTime, nowMinute, parseTime, timeBody, timeValues } from "@/lib/minutes";
import { useApi } from "@/lib/use-api";
import { RuleDialog, WeekdayPicker } from "@/features/settings/RoutineSettings";
import { StepsEditor, fromEditorSteps, toEditorSteps } from "./StepsEditor";
import { TimeFields } from "./TimeFields";
import { IconField } from "@/components/ui/Pickers";
import { CATEGORY_TINT } from "@/lib/categories";
import { itemIcon } from "@/lib/icons";

/** Icon picker of an item: automatic follows the name (else the category, else the kind). */
function ItemIconField({ value, onChange, name, kind, categoryId, categories }) {
  const category = (categories ?? []).find((c) => c.id === categoryId) ?? null;
  return <IconField value={value} onChange={onChange} auto={itemIcon({ name, kind, category })} tint={category ? CATEGORY_TINT[category.colorKey] : undefined} />;
}

/** Radio cards with a title and a line of explanation. */
export function ChoiceCards({ name, legend, value, onChange, options }) {
  return (
    <fieldset className="grid gap-2">
      {legend && <legend className="mb-1.5 text-[13px] font-[560]">{legend}</legend>}
      {options.map(([key, label, hint]) => (
        <label key={key} className={cn("flex cursor-pointer gap-3 rounded-md border px-3 py-2.5 transition-colors", value === key ? "border-accent-text bg-selected" : "border-rule hover:bg-sunk")}>
          <input type="radio" name={name} value={key} checked={value === key} onChange={() => onChange(key)} className="mt-1 accent-[var(--accent-text)]" />
          <span>
            <span className="block text-[14px] font-[600]">{label}</span>
            {hint && <span className="block text-[12.5px] text-muted">{hint}</span>}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function NameField({ value, onChange, error, placeholder }) {
  return (
    <Field label="Nome" error={error}>
      {(p) => <Input {...p} value={value} onChange={(e) => onChange(e.target.value)} maxLength={60} placeholder={placeholder ?? "Ex.: Ligar pro banco"} />}
    </Field>
  );
}

function CategoryField({ value, onChange, error, categories }) {
  return (
    <Field label="Categoria" error={error} optional>
      {(p) => (
        <Select {...p} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Sem categoria</option>
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.isArchived ? " (arquivada)" : ""}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}

/** Shared save flow: sends, shows field errors, toasts and closes. */
function useSave(onSaved) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  async function save(request, message) {
    setSaving(true);
    setErrors({});
    try {
      await request();
      toast.success(message);
      onSaved();
    } catch (error) {
      setErrors(error.fields ?? {});
      if (!Object.keys(error.fields ?? {}).length) toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }
  return { saving, errors, save };
}

function Footer({ form, saving, onClose, label = "Salvar" }) {
  return (
    <>
      <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
      <Button type="submit" form={form} loading={saving}>{label}</Button>
    </>
  );
}

const TIME_HINTS = { none: "Fica em “Para hoje, sem horário” (no dia escolhido) e não aparece na grade da Semana.", period: "Fica no topo do dia na Semana, sem ocupar um horário exato." };

/**
 * Avulso: happens once. Date, period and time are all optional: without a
 * date it goes to "Quando der". With an exact time it can be marked as a
 * compromisso (dentista, reunião), which never turns "atrasado". With a date
 * it can also go inside a fixed block of that day, as a step only there
 * ("Mandar o relatório" inside Trabalho).
 */
export function OneOffDialog({ date, categories, onClose, onSaved }) {
  const [withDate, setWithDate] = useState(true);
  const [day, setDay] = useState(date);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [appointment, setAppointment] = useState(false);
  const [icon, setIcon] = useState(null);
  const [time, setTime] = useState(timeValues(null, "none"));
  const [insideId, setInsideId] = useState("");
  const [stepTime, setStepTime] = useState("");
  const { saving, errors, save } = useSave(onSaved);
  const isAppointment = appointment && time.timeMode === "exact";
  const { data: dayData } = useApi(withDate && day ? `/days/${day}` : null);
  const blocks = (dayData?.items ?? []).filter((i) => i.ruleId);
  const block = withDate ? blocks.find((b) => b.id === insideId) : null;

  function submit(e) {
    e.preventDefault();
    const base = { name, categoryId: categoryId || null, icon };
    if (!withDate) return save(() => api("/tasks", { method: "POST", body: base }), "Guardado em “Quando der”.");
    if (block) {
      const steps = [...block.steps.map((s) => ({ id: s.id, name: s.name, minute: s.minute })), { name, minute: parseTime(stepTime) }];
      return save(() => api(`/day-items/${block.id}/steps`, { method: "PUT", body: { steps } }), `Colocado dentro de ${block.name}.`);
    }
    const kind = isAppointment ? "APPOINTMENT" : "TASK";
    save(() => api(`/days/${day}/items`, { method: "POST", body: { kind, ...base, ...timeBody(time) } }), day === date ? "Adicionado." : `Adicionado em ${formatDate(day)}.`);
  }

  return (
    <Dialog open size="sm" onClose={onClose} title="Novo avulso" footer={<Footer form="one-off-form" saving={saving} onClose={onClose} />}>
      <form id="one-off-form" noValidate className="grid gap-4" onSubmit={submit}>
        <NameField value={name} onChange={setName} error={errors.name} />
        <label className="flex cursor-pointer items-center gap-2 text-[14px] font-[560]">
          <input type="checkbox" checked={withDate} onChange={(e) => setWithDate(e.target.checked)} className="size-4 accent-[var(--accent-text)]" />
          Tem data
        </label>
        {!withDate && <p className="-mt-2 text-[12.5px] text-muted">Vai para “Quando der” e aparece todo dia até você fazer ou escolher um dia.</p>}
        {withDate && (
          <>
            <Field label="Dia" error={errors.date}>
              {(p) => <Input {...p} type="date" value={day} onChange={(e) => setDay(e.target.value)} required />}
            </Field>
            {blocks.length > 0 && (
              <Field label="Onde fica" hint={block ? "Vira um afazer deste bloco, só neste dia." : "Solto no dia, ou dentro de um bloco fixo dele."}>
                {(p) => (
                  <Select {...p} value={insideId} onChange={(e) => setInsideId(e.target.value)}>
                    <option value="">Solto no dia</option>
                    {blocks.map((b) => (
                      <option key={b.id} value={b.id}>
                        Dentro de: {b.name} ({itemTime(b)})
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            )}
            {block && (
              <Field label="Hora" optional error={errors.steps}>
                {(p) => <Input {...p} type="time" value={stepTime} onChange={(e) => setStepTime(e.target.value)} />}
              </Field>
            )}
            {!block && <TimeFields values={time} setValues={setTime} errors={errors} hints={TIME_HINTS} />}
            {!block && time.timeMode === "exact" && (
              <label className="flex cursor-pointer gap-2 text-[14px]">
                <input type="checkbox" checked={appointment} onChange={(e) => setAppointment(e.target.checked)} className="mt-0.5 size-4 accent-[var(--accent-text)]" />
                <span>
                  <span className="block font-[560]">É um compromisso</span>
                  <span className="block text-[12.5px] text-muted">Hora marcada com alguém, como dentista ou reunião. Não fica atrasado se passar.</span>
                </span>
              </label>
            )}
          </>
        )}
        {!block && <CategoryField value={categoryId} onChange={setCategoryId} error={errors.categoryId} categories={categories} />}
        {!block && <ItemIconField value={icon} onChange={setIcon} name={name} kind={isAppointment ? "APPOINTMENT" : "TASK"} categoryId={categoryId} categories={categories} />}
      </form>
    </Dialog>
  );
}

/**
 * Editar: an item from the fixed routine can change "só neste dia" (only this
 * item) or "daqui pra frente" (the rule, from this day on; the past stays).
 */
export function EditItemDialog({ item, categories, onClose, onSaved, onListsChanged, recurringSteps = false }) {
  const fromRule = Boolean(item.ruleId);
  const [editor, setEditor] = useState(null);
  const [scope, setScope] = useState("day");
  const [name, setName] = useState(item.name);
  const [categoryId, setCategoryId] = useState(item.category?.id ?? "");
  const [icon, setIcon] = useState(item.icon ?? null);
  const [time, setTime] = useState(timeValues(item));
  const { data: rules, loading: loadingRules, error: rulesError, reload: reloadRules } = useApi(fromRule ? "/rules" : null);
  const blockRule = rules?.find((rule) => rule.id === item.ruleId);
  const ruleWeekdays = blockRule?.weekdays ?? null;
  const canLinkLists = blockRule && (blockRule.startMinute !== null || blockRule.period);
  const lists = (rules ?? []).filter((rule) => rule.id !== item.ruleId && rule.steps.length > 0 &&
    (rule.insideRuleIds.includes(item.ruleId) || (rule.startMinute === null && !rule.period)) &&
    rule.startDate <= item.date && (!rule.endDate || rule.endDate >= item.date));
  const [savingList, setSavingList] = useState(false);
  const toast = useToast();
  const [weekdays, setWeekdays] = useState(null);
  const chosenDays = weekdays ?? ruleWeekdays ?? [];
  const active = categories ?? [];
  const available = item.category && !active.some((category) => category.id === item.category.id) ? [...active, { ...item.category, isArchived: true }] : active;
  const { saving, errors, save } = useSave(onSaved);

  async function toggleList(list, checked) {
    const insideRuleIds = checked ? [...list.insideRuleIds, item.ruleId] : list.insideRuleIds.filter((id) => id !== item.ruleId);
    setSavingList(true);
    try {
      await api(`/rules/${list.id}`, { method: "PATCH", body: { insideRuleIds, from: item.date } });
      await reloadRules();
      onListsChanged?.();
      toast.success(checked ? `${list.name} agora aparece em ${item.name}.` : `${list.name} saiu de ${item.name}.`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingList(false);
    }
  }

  function submit(e) {
    e.preventDefault();
    const body = { name, categoryId: categoryId || null, icon, ...(item.date ? timeBody(time) : {}) };
    const some = ruleWeekdays && chosenDays.length < ruleWeekdays.length;
    if (scope === "rule" && some) save(() => api(`/rules/${item.ruleId}/split`, { method: "POST", body: { ...body, weekdays: chosenDays, from: item.date } }), "Mudou daqui pra frente nos dias escolhidos.");
    else if (scope === "rule") save(() => api(`/rules/${item.ruleId}`, { method: "PATCH", body: { ...body, from: item.date } }), "Mudou daqui pra frente.");
    else save(() => api(`/day-items/${item.id}`, { method: "PATCH", body }), fromRule ? "Mudou só neste dia." : "Item atualizado.");
  }

  if (editor === "steps") {
    return <StepsDialog item={item} initialScope={fromRule && recurringSteps ? "rule" : scope} onClose={() => setEditor(null)} onSaved={onSaved} />;
  }
  if (editor === "list") {
    return <RuleDialog insideBlock={blockRule} startDate={item.date} categories={categories} onClose={() => setEditor(null)} onSaved={onSaved} />;
  }

  return (
    <Dialog open size="sm" onClose={onClose} title={`Editar ${item.name}`} footer={<Footer form="edit-item-form" saving={saving} onClose={onClose} />}>
      <form id="edit-item-form" noValidate className="grid gap-4" onSubmit={submit}>
        {item.date && (
          <div className="grid gap-3 rounded-[12px] border border-rule p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13.5px] font-[600]">Afazeres deste bloco</span>
              <Button variant="secondary" size="sm" onClick={() => setEditor("steps")}>{item.steps?.length ? `Editar (${item.steps.length})` : "Adicionar"}</Button>
            </div>
            {item.steps?.length > 0 && (
              <ul className="grid list-disc gap-1 pl-4 text-[13px] text-muted">
                {item.steps.map((step) => <li key={step.id}>{step.name}</li>)}
              </ul>
            )}
            {fromRule && loadingRules && !rules && <p className="text-[13px] text-muted">Carregando listas…</p>}
            {rulesError && <Button variant="secondary" size="sm" onClick={reloadRules}>Tentar carregar listas de novo</Button>}
            {canLinkLists && (
              <fieldset disabled={savingList || loadingRules || saving} className="grid gap-2 border-t border-rule pt-2">
                <legend className="pr-2 text-[13.5px] font-[600]">Listas dentro deste bloco</legend>
                {lists.map((list) => {
                  const linked = list.insideRuleIds.includes(item.ruleId);
                  return (
                    <div key={list.id} className="grid gap-1">
                      <label className="flex cursor-pointer items-center gap-2 text-[14px]">
                        <input type="checkbox" checked={linked} onChange={(event) => toggleList(list, event.target.checked)} className="size-4 shrink-0 accent-[var(--accent-text)]" />
                        <span>{list.name} <span className="text-[12.5px] text-muted">· {list.steps.length} afazeres</span></span>
                      </label>
                      {linked && (
                        <ul className="grid list-disc gap-1 pl-9 text-[13px] text-muted">
                          {list.steps.map((step) => <li key={step.key}>{step.name}</li>)}
                        </ul>
                      )}
                    </div>
                  );
                })}
                <p className="text-[12.5px] text-muted">O vínculo vale a partir de {formatDate(item.date)}. Os afazeres de uma lista são compartilhados com os outros blocos do mesmo dia.</p>
                <Button variant="secondary" size="sm" className="justify-self-start" onClick={() => setEditor("list")}>Criar lista</Button>
              </fieldset>
            )}
            {!canLinkLists && item.lists?.length > 0 && (
              <p className="text-[13px] text-muted">Listas neste dia: {item.lists.map((list) => list.name).join(", ")}</p>
            )}
          </div>
        )}
        {fromRule && (
          <ChoiceCards
            name="scope"
            legend="Mudar"
            value={scope}
            onChange={setScope}
            options={[
              ["day", "Só neste dia", `Só o item de ${formatDate(item.date)}. A rotina fixa continua igual.`],
              ["rule", "Daqui pra frente", `Muda o item fixo a partir de ${formatDate(item.date)}. Os dias que já passaram ficam como estavam.`],
            ]}
          />
        )}
        {scope === "rule" && ruleWeekdays && ruleWeekdays.length > 1 && (
          <div className="grid gap-1">
            <WeekdayPicker legend="Em quais dias" value={chosenDays} onChange={(days) => setWeekdays(days.filter((d) => ruleWeekdays.includes(d)))} error={errors.weekdays} presets={false} />
            <p className="text-[12.5px] text-muted">Desmarque os dias que devem continuar como estão. Ex.: mudar o Acordar só nos dias de condução.</p>
          </div>
        )}
        <NameField value={name} onChange={setName} error={errors.name} />
        {item.date && <TimeFields values={time} setValues={setTime} errors={errors} hints={TIME_HINTS} />}
        <CategoryField value={categoryId} onChange={setCategoryId} error={errors.categoryId} categories={available} />
        <ItemIconField value={icon} onChange={setIcon} name={name} kind={item.kind} categoryId={categoryId} categories={available} />
      </form>
    </Dialog>
  );
}

/** Remarcar: moves this item to another day and/or time (the rule does not change). Also gives a day to a task from "Quando der". */
export function RescheduleDialog({ item, onClose, onSaved }) {
  const [date, setDate] = useState(item.date ?? today());
  const [time, setTime] = useState(timeValues(item));
  const { saving, errors, save } = useSave(onSaved);
  const label = item.date ? "Remarcar" : "Escolher um dia";

  function submit(e) {
    e.preventDefault();
    save(() => api(`/day-items/${item.id}`, { method: "PATCH", body: { date, ...timeBody(time) } }), date === item.date ? "Horário mudado." : `Marcado para ${formatDate(date)}.`);
  }

  return (
    <Dialog open size="sm" onClose={onClose} title={label} description={item.name} footer={<Footer form="reschedule-form" saving={saving} onClose={onClose} label={label} />}>
      <form id="reschedule-form" noValidate className="grid gap-4" onSubmit={submit}>
        <Field label="Dia" error={errors.date}>
          {(p) => <Input {...p} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />}
        </Field>
        <TimeFields values={time} setValues={setTime} errors={errors} hints={TIME_HINTS} modes={item.kind === "TASK" ? undefined : ["none", "exact"]} />
      </form>
    </Dialog>
  );
}

/**
 * Marcar como feito: when it was really done ("fiz em outro horário").
 * Today starts at the current time.
 */
export function DoneDialog({ item, onClose, onSaved }) {
  const [time, setTime] = useState(formatMinute(item.date === today() ? nowMinute() : item.startMinute));
  const { saving, errors, save } = useSave(onSaved);

  function submit(e) {
    e.preventDefault();
    const doneMinute = parseTime(time);
    const body = { status: "DONE", ...(doneMinute === null ? {} : { doneMinute }) };
    save(() => api(`/day-items/${item.id}/status`, { method: "PATCH", body }), doneMinute === null ? "Feito." : `Feito às ${formatMinute(doneMinute)}.`);
  }

  return (
    <Dialog open size="sm" onClose={onClose} title="Marcar como feito" description={item.name} footer={<Footer form="done-form" saving={saving} onClose={onClose} label="Feito" />}>
      <form id="done-form" noValidate className="grid gap-4" onSubmit={submit}>
        <Field label="Feito às" error={errors.doneMinute} optional hint="Se fez em outro horário, coloque a hora em que fez. Isso entra nos relatórios.">
          {(p) => <Input {...p} type="time" value={time} onChange={(e) => setTime(e.target.value)} />}
        </Field>
      </form>
    </Dialog>
  );
}

/**
 * Afazeres of an item on its day. A fixed block asks: only this day (the
 * day's list changes) or from this day on (the rule changes too, and this
 * day follows it). Steps already checked stay checked.
 */
export function StepsDialog({ item, initialScope = "day", onClose, onSaved }) {
  const fromRule = Boolean(item.ruleId);
  const [scope, setScope] = useState(initialScope);
  const [steps, setSteps] = useState(() => toEditorSteps(item.steps));
  const { saving, errors, save } = useSave(onSaved);

  function submit(e) {
    e.preventDefault();
    save(async () => {
      const { data } = await api(`/day-items/${item.id}/steps`, { method: "PUT", body: { steps: fromEditorSteps(steps, "id") } });
      if (scope === "rule") {
        const ruleSteps = data.steps.map((s) => ({ key: s.key, name: s.name, minute: s.minute }));
        await api(`/rules/${item.ruleId}`, { method: "PATCH", body: { steps: ruleSteps, from: item.date } });
      }
    }, scope === "rule" ? "Afazeres mudados daqui pra frente." : fromRule ? "Afazeres mudados só neste dia." : "Afazeres salvos.");
  }

  return (
    <Dialog open size="sm" onClose={onClose} title="Afazeres" description={item.name} footer={<Footer form="steps-form" saving={saving} onClose={onClose} />}>
      <form id="steps-form" noValidate className="grid gap-4" onSubmit={submit}>
        {fromRule && (
          <ChoiceCards
            name="steps-scope"
            legend="Mudar"
            value={scope}
            onChange={setScope}
            options={[
              ["day", "Só neste dia", `Só em ${formatDate(item.date)}. Ex.: a reunião de hoje dentro do Trabalho.`],
              ["rule", "Daqui pra frente", `Em todos os dias deste fixo a partir de ${formatDate(item.date)}.`],
            ]}
          />
        )}
        <StepsEditor steps={steps} onChange={setSteps} error={errors.steps} hint={null} />
      </form>
    </Dialog>
  );
}
