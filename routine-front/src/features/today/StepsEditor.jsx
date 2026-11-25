import { ArrowUp, ListPlus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { formatMinute, parseTime } from "@/lib/minutes";

let nextUid = 0;
const uid = () => `step-${++nextUid}`;

/** Editor rows from saved steps (of a rule or of a day item): keeps `key` / `id`, the time as "HH:MM". */
export function toEditorSteps(steps) {
  return (steps ?? []).map((s) => ({ uid: uid(), id: s.id, key: s.key, name: s.name, time: formatMinute(s.minute) }));
}

/** Editor rows → what the API takes: no empty names, the time in minutes (or null). */
export function fromEditorSteps(steps, idField) {
  return steps
    .filter((s) => s.name.trim())
    .map((s) => ({ ...(s[idField] ? { [idField]: s[idField] } : {}), name: s.name.trim(), minute: parseTime(s.time) }));
}

/**
 * Afazeres of a block: a name and an optional time each ("Reunião com cliente"
 * at 15:00 inside Trabalho). Up to 20, in the order given.
 */
export function StepsEditor({ steps, onChange, error, hint = "Pequenas tarefas deste bloco, marcadas uma a uma no Dia. A hora é opcional." }) {
  const update = (i, changes) => onChange(steps.map((s, j) => (j === i ? { ...s, ...changes } : s)));
  const remove = (i) => onChange(steps.filter((_, j) => j !== i));
  const moveUp = (i) => onChange(steps.map((s, j) => (j === i - 1 ? steps[i] : j === i ? steps[i - 1] : s)));
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1.5 text-[13px] font-[560]">
        Afazeres <span className="font-normal text-faint">(opcional)</span>
      </legend>
      {hint && <p className="-mt-1 text-[12.5px] text-muted">{hint}</p>}
      {steps.map((step, i) => (
        <div key={step.uid} className="flex items-center gap-1">
          <Input aria-label={`Afazer ${i + 1}`} value={step.name} onChange={(e) => update(i, { name: e.target.value })} maxLength={60} placeholder="Ex.: Ler 2 páginas de um livro" />
          <Input aria-label={`Hora do afazer ${i + 1} (opcional)`} type="time" value={step.time ?? ""} onChange={(e) => update(i, { time: e.target.value })} className="w-[6.5rem] shrink-0" />
          <Button variant="ghost" size="icon-sm" onClick={() => moveUp(i)} disabled={i === 0} aria-label={`Subir ${step.name || "afazer"}`}>
            <ArrowUp className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => remove(i)} aria-label={`Tirar ${step.name || "afazer"}`}>
            <X className="size-4" />
          </Button>
        </div>
      ))}
      {steps.length < 20 && (
        <Button variant="secondary" size="sm" className="justify-self-start" onClick={() => onChange([...steps, { uid: uid(), name: "", time: "" }])}>
          <ListPlus className="size-4" aria-hidden /> Adicionar afazer
        </Button>
      )}
      {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
    </fieldset>
  );
}
