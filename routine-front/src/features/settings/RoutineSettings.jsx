import { CalendarRange, MoreHorizontal, Pencil, Repeat, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { Field, Input, Select } from "@/components/ui/Field";
import { HelpButton, HelpPanel } from "@/components/ui/Help";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { Card, CardHeader } from "@/components/ui/Layout";
import { Menu } from "@/components/ui/Menu";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { CATEGORY_TINT } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { formatDate, today } from "@/lib/dates";
import { itemTime, timeBody, timeValues } from "@/lib/minutes";
import { useApi } from "@/lib/use-api";
import { WEEKDAY_LETTER, WEEKDAY_ORDER, WEEKDAY_PRESETS, WEEKDAY_SHORT, weekdaysLabel } from "@/lib/weekdays";
import { StepsEditor, fromEditorSteps, toEditorSteps } from "@/features/today/StepsEditor";
import { TimeFields } from "@/features/today/TimeFields";
import { IconField } from "@/components/ui/Pickers";
import { itemIcon } from "@/lib/icons";

/** Day filter of the list: all, or one weekday. */
function DayFilter({ value, onChange }) {
  const options = [{ value: "all", label: "Todos" }, ...WEEKDAY_ORDER.map((d) => ({ value: d, label: WEEKDAY_SHORT[d] }))];
  return (
    <div role="group" aria-label="Mostrar os itens de" className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-8 shrink-0 rounded-full px-2 text-[12px] font-[560] capitalize transition-colors sm:px-3 sm:text-[13px]",
            value === o.value ? "bg-ink text-paper" : "bg-sunk text-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function WeekdayPicker({ value, onChange, error, legend = "Dias da semana", presets = true }) {
  const toggle = (d) => onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d]);
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-[13px] font-[560]">{legend}</legend>
      <div className="flex gap-1.5">
        {WEEKDAY_ORDER.map((d) => {
          const on = value.includes(d);
          return (
            <button
              key={d}
              type="button"
              aria-pressed={on}
              aria-label={WEEKDAY_SHORT[d]}
              title={WEEKDAY_SHORT[d]}
              onClick={() => toggle(d)}
              className={cn(
                "grid size-10 place-items-center rounded-full border text-[13.5px] font-[620] transition-colors",
                on ? "border-accent bg-accent text-accent-ink" : "border-rule-strong bg-paper text-muted hover:text-ink",
              )}
            >
              {WEEKDAY_LETTER[d]}
            </button>
          );
        })}
      </div>
      <div className={cn("flex flex-wrap gap-1.5", !presets && "hidden")}>
        {WEEKDAY_PRESETS.map((p) => (
          <button key={p.label} type="button" onClick={() => onChange(p.days)} className="rounded-full bg-sunk px-2.5 py-1 text-[12.5px] font-[560] text-muted hover:text-ink">
            {p.label}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
    </fieldset>
  );
}

/** The checklist of a routine block: one line per step, in order. */
/**
 * "Mostrar dentro de": the blocks this list shows inside (Rotina diária inside
 * Condução and Almoço). Checking a step there checks it here.
 */
function InsidePicker({ ruleId, value, onChange, error }) {
  const { data: rules } = useApi("/rules");
  const options = (rules ?? []).filter((r) => r.id !== ruleId && (r.startMinute !== null || r.period));
  const toggle = (id) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1.5 text-[13px] font-[560]">
        Mostrar estes afazeres dentro de <span className="font-normal text-faint">(opcional)</span>
      </legend>
      <p className="-mt-1 text-[12.5px] text-muted">Vira uma lista, como a Rotina diária: aparece dentro dos blocos marcados (ex.: Condução, Almoço). Marcar lá marca aqui também.</p>
      {options.length === 0 && <p className="text-[12.5px] text-muted">Cadastre blocos com horário para escolher aqui.</p>}
      <div className="grid gap-1.5 sm:grid-cols-2">
        {options.map((r) => (
          <label key={r.id} className={cn("flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-[13.5px] transition-colors", value.includes(r.id) ? "border-accent-text bg-selected" : "border-rule hover:bg-sunk")}>
            <input type="checkbox" checked={value.includes(r.id)} onChange={() => toggle(r.id)} className="size-4 accent-[var(--accent-text)]" />
            <span className="min-w-0">
              <span className="block truncate font-[600]">{r.name}</span>
              <span className="block truncate text-[12px] text-muted">
                {itemTime(r)} · {weekdaysLabel(r.weekdays)}
              </span>
            </span>
          </label>
        ))}
      </div>
      {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
    </fieldset>
  );
}

/**
 * Create or edit a fixed item. Editing applies "daqui pra frente" from the
 * chosen day (default today): the days that passed keep what they had.
 */
export function RuleDialog({ rule, insideBlock, categories, startDate, onClose, onSaved }) {
  const editing = Boolean(rule);
  const toast = useToast();
  const [values, setValues] = useState({
    name: rule?.name ?? "",
    weekdays: rule?.weekdays ?? insideBlock?.weekdays ?? [1, 2, 3, 4, 5],
    categoryId: rule?.categoryId ?? "",
    icon: rule?.icon ?? null,
    steps: toEditorSteps(rule?.steps),
    insideRuleIds: rule?.insideRuleIds ?? (insideBlock ? [insideBlock.id] : []),
    date: editing ? (rule.startDate > today() ? rule.startDate : today()) : startDate && startDate > today() ? startDate : today(),
  });
  const [time, setTime] = useState(timeValues(rule, insideBlock ? "none" : "exact"));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [fieldHelp, setFieldHelp] = useState(false);
  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const steps = fromEditorSteps(values.steps, "key");
    if (insideBlock && steps.length === 0) {
      setErrors({ steps: "Adicione pelo menos um afazer à lista." });
      return;
    }
    setSaving(true);
    setErrors({});
    const body = {
      kind: "ROUTINE",
      name: values.name,
      weekdays: values.weekdays,
      ...timeBody(time),
      categoryId: values.categoryId || null,
      mode: null,
      icon: values.icon,
      steps,
      insideRuleIds: values.insideRuleIds,
    };
    try {
      if (editing) await api(`/rules/${rule.id}`, { method: "PATCH", body: { ...body, from: values.date } });
      else await api("/rules", { method: "POST", body: { ...body, startDate: values.date } });
      toast.success(editing ? `Mudou a partir de ${formatDate(values.date)}.` : insideBlock ? "Lista criada." : "Item fixo adicionado.");
      onSaved();
    } catch (error) {
      setErrors(error.fields ?? {});
      if (!Object.keys(error.fields ?? {}).length) toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={editing ? "Editar fixo" : insideBlock ? "Nova lista de afazeres" : "Novo fixo"}
      description={insideBlock ? `Dentro de ${insideBlock.name}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" form="rule-form" loading={saving}>Salvar</Button>
        </>
      }
    >
      <form id="rule-form" noValidate className="grid gap-5" onSubmit={submit}>
        <div className="grid gap-1">
          <div className="flex items-center gap-1">
            <span className="text-[13px] font-[560]">Como preencher</span>
            <HelpButton open={fieldHelp} onClick={() => setFieldHelp((value) => !value)} about="o preenchimento do item fixo" />
          </div>
          {fieldHelp && (
            <HelpPanel>
              <span className="mb-1.5 block"><strong>Dias da semana.</strong> Escolha quando o item aparece no Hoje.</span>
              <span className="mb-1.5 block"><strong>Horário.</strong> Sem horário, o item fica em “Para hoje, sem horário” e não entra na grade da Semana. Período (manhã, tarde, noite) fica no topo do dia. Informe um fim se quiser mostrar a duração.</span>
              <span className="block"><strong>{editing ? "Vale a partir de." : "Começa em."}</strong> {editing ? "Os dias antes desta data ficam como estavam." : "A partir desta data, o item aparece nos dias escolhidos."}</span>
            </HelpPanel>
          )}
        </div>
        <Field label="Nome" error={errors.name}>
          {(p) => <Input {...p} value={values.name} onChange={set("name")} maxLength={60} placeholder="Ex.: Trabalho, Muay Thai, Condução" />}
        </Field>

        <WeekdayPicker value={values.weekdays} onChange={(weekdays) => setValues((v) => ({ ...v, weekdays }))} error={errors.weekdays} />

        <TimeFields values={time} setValues={setTime} errors={errors} />

        <StepsEditor steps={values.steps} onChange={(steps) => setValues((v) => ({ ...v, steps }))} error={errors.steps} />
        {values.steps.some((s) => s.name.trim()) && (
          <InsidePicker ruleId={rule?.id} value={values.insideRuleIds} onChange={(insideRuleIds) => setValues((v) => ({ ...v, insideRuleIds }))} error={errors.insideRuleIds} />
        )}

        <Field label="Categoria" error={errors.categoryId} optional>
          {(p) => (
            <Select {...p} value={values.categoryId} onChange={set("categoryId")}>
              <option value="">Sem categoria</option>
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.isArchived ? " (arquivada)" : ""}</option>
              ))}
            </Select>
          )}
        </Field>

        {(() => {
          const category = (categories ?? []).find((c) => c.id === values.categoryId) ?? null;
          return (
            <IconField
              value={values.icon}
              onChange={(icon) => setValues((v) => ({ ...v, icon }))}
              auto={itemIcon({ name: values.name, kind: "ROUTINE", category })}
              tint={category ? CATEGORY_TINT[category.colorKey] : undefined}
            />
          );
        })()}

        <Field
          label={editing ? "Vale a partir de" : "Começa em"}
          error={errors.from ?? errors.startDate}
        >
          {(p) => <Input {...p} type="date" value={values.date} onChange={set("date")} />}
        </Field>
      </form>
    </Dialog>
  );
}

function RuleRow({ rule, category, insideNames, onEdit, onRemove }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3 sm:px-5">
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-[10px] text-ink", category ? CATEGORY_TINT[category.colorKey] : "bg-sunk")}>
        <ItemIcon name={category?.icon ?? "repeat"} className="size-[17px]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-[600]">{rule.name}</p>
        <p className="mt-0.5 flex flex-wrap gap-x-2 text-[12.5px] text-muted">
          <span className="num font-[560] text-ink/80">{itemTime(rule) || "sem horário"}</span>
          <span>{weekdaysLabel(rule.weekdays)}</span>
          {rule.steps.length > 0 && <span>{rule.steps.length} afazeres</span>}
          {insideNames?.length > 0 && <span>dentro de {insideNames.join(", ")}</span>}
          {rule.variant && <span>{rule.variant}</span>}
          {category && <span>{category.name}</span>}
          {rule.startDate > today() && <span className="text-accent-text">começa em {formatDate(rule.startDate)}</span>}
          {rule.endDate && <span className="text-warn">até {formatDate(rule.endDate)}</span>}
        </p>
      </div>
      <Menu
        trigger={(p) => (
          <Button variant="ghost" size="icon-sm" onClick={p.toggle} aria-expanded={p["aria-expanded"]} aria-haspopup="menu" aria-label={`Ações de ${rule.name}`}>
            <MoreHorizontal className="size-4" />
          </Button>
        )}
        items={[
          { label: "Editar…", icon: Pencil, onSelect: onEdit },
          { label: "Tirar da rotina…", icon: Trash2, onSelect: onRemove, danger: true },
        ]}
      />
    </li>
  );
}

/** Configurações → Rotina fixa: what repeats every week. */
export function RoutineSettings() {
  const toast = useToast();
  const { data: rules, error, loading, reload } = useApi("/rules");
  const { data: categories } = useApi("/categories", { includeArchived: true });
  const [day, setDay] = useState("all");
  const [dialog, setDialog] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [help, setHelp] = useState(false);
  const byId = new Map((categories ?? []).map((c) => [c.id, c]));
  const rulesById = new Map((rules ?? []).map((r) => [r.id, r]));
  const available = (categories ?? []).filter((c) => !c.isArchived || c.id === dialog?.rule?.categoryId);
  const shown = (rules ?? []).filter((r) => day === "all" || r.weekdays.includes(day));
  const saved = () => {
    setDialog(null);
    reload();
  };

  async function remove(rule) {
    setRemoving(true);
    try {
      await api(`/rules/${rule.id}`, { method: "DELETE", query: { from: today() } });
      toast.success("Saiu da rotina a partir de hoje.");
      saved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader
          title={<span className="flex items-center gap-1">Rotina fixa <HelpButton open={help} onClick={() => setHelp((value) => !value)} about="a rotina fixa" /></span>}
          actions={
            <Button size="sm" onClick={() => setDialog({ type: "rule" })}>
              <Repeat className="size-4" aria-hidden /> Novo fixo
            </Button>
          }
        />
        {help && (
          <HelpPanel className="mx-4 mt-3 sm:mx-5">
            <span className="mb-1.5 block">O que se repete toda semana aparece sozinho no Hoje, nos dias escolhidos.</span>
            Cada fixo é um bloco: nome, dias, horário, categoria e, se quiser, afazeres dentro. Para algo de um só dia, use <strong>Avulso</strong> no{" "}
            <Link to="/hoje" className="font-[560] text-accent-text hover:underline">Hoje</Link>.
          </HelpPanel>
        )}
        <div className="border-b border-rule px-4 py-3 sm:px-5">
          <DayFilter value={day} onChange={setDay} />
        </div>

        {error && !rules && <ErrorState error={error} onRetry={reload} className="p-5" />}
        {loading && !rules && (
          <div className="flex flex-col gap-2 p-5">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        )}
        {rules && shown.length === 0 && (
          <EmptyState
            className="py-10"
            icon={CalendarRange}
            title={rules.length ? "Nada fixo neste dia" : "Sua rotina fixa está vazia"}
            description={rules.length ? "Dia livre: não é falha." : "Comece pelo que mais se repete: trabalho, estudo, treino, ler 2 páginas…"}
            action={!rules.length && <Button onClick={() => setDialog({ type: "rule" })}>Novo fixo</Button>}
          />
        )}
        {shown.length > 0 && (
          <ul className="divide-y divide-rule">
            {shown.map((rule) => (
              <RuleRow key={rule.id} rule={rule} category={byId.get(rule.categoryId)} insideNames={[...new Set((rule.insideRuleIds ?? []).map((id) => rulesById.get(id)?.name).filter(Boolean))]} onEdit={() => setDialog({ type: "rule", rule })} onRemove={() => setDialog({ type: "remove", rule })} />
            ))}
          </ul>
        )}
        {dialog?.type === "rule" && <RuleDialog rule={dialog.rule} categories={available} onClose={() => setDialog(null)} onSaved={saved} />}
        {dialog?.type === "remove" && (
          <ConfirmDialog
            open
            title="Tirar da rotina?"
            description={`“${dialog.rule.name}” sai do Hoje a partir de hoje. Os dias que já passaram ficam como estavam.`}
            confirmLabel="Tirar da rotina"
            loading={removing}
            onClose={() => setDialog(null)}
            onConfirm={() => remove(dialog.rule)}
          />
        )}
      </Card>
    </div>
  );
}
