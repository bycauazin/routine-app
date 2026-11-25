import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { Field, Input, Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { formatDateLong, formatWeekRange } from "@/lib/dates";
import { useApi } from "@/lib/use-api";
import { liters } from "@/lib/water";

const subjects = {
  ROUTINE: ["Rotina inteira", ["PERCENT", "COUNT", "MINUTES"]],
  WATER: ["Água", ["ML"]],
  WORKOUT: ["Treinos", ["COUNT", "MINUTES", "PERCENT"]],
  CATEGORY: ["Categoria", ["COUNT", "MINUTES", "PERCENT"]],
  ITEM: ["Item da rotina", ["COUNT", "MINUTES", "PERCENT"]],
  STEP: ["Afazer", ["COUNT", "PERCENT"]],
};
const units = { COUNT: "Vezes", ML: "Mililitros (ml)", MINUTES: "Minutos", PERCENT: "Porcentagem (%)" };
const periods = { DAY: "Por dia", WEEK: "Por semana", MONTH: "Por mês" };
const hasTarget = (subject) => ["CATEGORY", "ITEM", "STEP"].includes(subject);
const periodLabel = ({ from, to }) => from === to ? formatDateLong(from) : formatWeekRange(from, to);

function measured(value, unit) {
  if (value === null) return "—";
  if (unit === "ML") return liters(value);
  if (unit === "PERCENT") return `${value}%`;
  return `${value} ${unit === "MINUTES" ? "min" : value === 1 ? "vez" : "vezes"}`;
}

function GoalDialog({ goal, onClose, onSave }) {
  const [values, setValues] = useState(goal ? { ...goal, amount: String(goal.amount) } : { name: "", subject: "ROUTINE", targetKey: "", amount: "", unit: "PERCENT", period: "WEEK" });
  const { data: options, loading, error, reload } = useApi(hasTarget(values.subject) ? "/goals/options" : null);
  const targets = options?.[values.subject] ?? [];
  const currentTargetMissing = values.targetKey && goal?.targetKey === values.targetKey && !targets.some(({ id }) => id === values.targetKey);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const field = (key) => ({ value: values[key] ?? "", onChange: (e) => setValues((current) => ({ ...current, [key]: e.target.value })) });

  async function save(e) {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      const { name, subject, targetKey, unit, period, amount } = values;
      await api(goal ? `/goals/${goal.id}` : "/goals", { method: goal ? "PUT" : "POST", body: { name, subject, targetKey: targetKey || null, unit, period, amount: Number(amount) } });
      toast.success(goal ? "Meta atualizada." : "Meta criada.");
      onSave();
    } catch (err) {
      setErrors(err.fields ?? {});
      if (!err.fields) toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return <Dialog open title={goal ? "Editar meta" : "Nova meta"} onClose={onClose} size="sm" footer={<>
    <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
    <Button type="submit" form="goal-form" loading={saving}>Salvar</Button>
  </>}>
    <form id="goal-form" className="grid gap-3" onSubmit={save}>
      <Field label="Nome" error={errors.name}>{(props) => <Input {...props} {...field("name")} placeholder="Ex. Treinar três vezes" maxLength={60} required />}</Field>
      <Field label="O que acompanhar" error={errors.subject}>{(props) => <Select {...props} value={values.subject} onChange={(e) => {
        const subject = e.target.value;
        setValues((current) => ({ ...current, subject, targetKey: "", unit: subjects[subject][1][0] }));
      }}>{Object.entries(subjects).map(([key, [label]]) => <option key={key} value={key}>{label}</option>)}</Select>}</Field>
      {hasTarget(values.subject) && <Field label={subjects[values.subject][0]} error={errors.targetKey ?? (error ? error.message : null)}>{(props) => <Select {...props} {...field("targetKey")} required disabled={loading}>
        <option value="">{loading ? "Carregando…" : "Escolha na sua rotina"}</option>
        {currentTargetMissing && <option value={values.targetKey}>{goal.targetName}</option>}
        {targets.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
      </Select>}</Field>}
      {hasTarget(values.subject) && error && <Button variant="secondary" size="sm" className="justify-self-start" onClick={reload}>Tentar novamente</Button>}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Quantidade" error={errors.amount}>{(props) => <Input {...props} {...field("amount")} type="number" inputMode="numeric" min={1} max={values.unit === "PERCENT" ? 100 : 1_000_000} required />}</Field>
        <Field label="Unidade" error={errors.unit}>{(props) => <Select {...props} {...field("unit")}>{subjects[values.subject][1].map((key) => <option key={key} value={key}>{units[key]}</option>)}</Select>}</Field>
      </div>
      <Field label="Período da meta" error={errors.period}>{(props) => <Select {...props} {...field("period")}>{Object.entries(periods).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select>}</Field>
    </form>
  </Dialog>;
}

function GoalResults({ goal }) {
  if (!goal.results.length) return <p className="text-sm text-muted">Nenhum período apurado.</p>;
  const last = goal.results.at(-1);
  const status = (result) => result.reached ? "Batida" : result.open ? "Em andamento" : result.value === null ? "Sem base" : "Não batida";
  return <>
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
      <strong className="num">{measured(last.value, goal.unit)} de {measured(goal.amount, goal.unit)}</strong>
      <span className={last.reached ? "text-done" : "text-muted"}>{status(last)}</span>
    </div>
    <p className="text-[13px] text-muted">{periodLabel(last)}</p>
    {goal.results.length > 1 && <details className="mt-1 text-[13px]">
      <summary className="cursor-pointer text-accent-text">{goal.results.filter((result) => result.reached).length} de {goal.results.length} períodos batidos</summary>
      <ul className="mt-2 max-h-60 divide-y divide-rule overflow-auto">
        {goal.results.map((result) => <li key={result.from} className="flex flex-wrap justify-between gap-x-2 py-1.5 text-muted">
          <span>{periodLabel(result)}</span><span className="num">{measured(result.value, goal.unit)} · {status(result)}</span>
        </li>)}
      </ul>
    </details>}
  </>;
}

export function Goals({ goals, reload }) {
  const [dialog, setDialog] = useState(null);
  const [removing, setRemoving] = useState(false);
  const toast = useToast();
  const saved = () => {
    setDialog(null);
    reload();
  };
  async function remove() {
    setRemoving(true);
    try {
      await api(`/goals/${dialog.goal.id}`, { method: "DELETE" });
      toast.success("Meta excluída.");
      saved();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setRemoving(false);
    }
  }
  return <section className="sheet grid gap-3 p-4" aria-labelledby="goals-title">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-lg font-[650]" id="goals-title">Metas pessoais</h2>
      <Button size="sm" variant="secondary" onClick={() => setDialog({ type: "edit" })}>Nova meta</Button>
    </div>
    {goals.length ? <ul className="divide-y divide-rule border-t border-rule">
      {goals.map((goal) => <li key={goal.id} className="flex items-start justify-between gap-2 py-3">
        <div className="min-w-0">
          <h3 className="break-words font-[650]">{goal.name}</h3>
          <p className="mb-1 break-words text-[13px] text-muted">{goal.targetName ?? subjects[goal.subject][0]} · {periods[goal.period]}</p>
          <GoalResults goal={goal} />
        </div>
        <div className="flex shrink-0">
          <Button variant="ghost" size="icon" aria-label={`Editar meta ${goal.name}`} onClick={() => setDialog({ type: "edit", goal })}><Pencil className="size-4" /></Button>
          <Button variant="ghost" size="icon" aria-label={`Excluir meta ${goal.name}`} onClick={() => setDialog({ type: "remove", goal })}><Trash2 className="size-4" /></Button>
        </div>
      </li>)}
    </ul> : <p className="text-sm text-muted">Crie uma meta para acompanhar a rotina, a água ou uma atividade específica.</p>}
    {dialog?.type === "edit" && <GoalDialog goal={dialog.goal} onClose={() => setDialog(null)} onSave={saved} />}
    {dialog?.type === "remove" && <ConfirmDialog open title="Excluir meta?" description={dialog.goal.name} onClose={() => setDialog(null)} onConfirm={remove} loading={removing} />}
  </section>;
}
