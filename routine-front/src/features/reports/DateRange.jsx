import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { formatDate, monthStartForRange, shiftDate } from "@/lib/dates";

export function DateRange({ value, end, onChange, pending }) {
  const [custom, setCustom] = useState(false);
  const [draft, setDraft] = useState(value);
  const presets = [["7 dias", shiftDate(end, -6)], ["1 mês", monthStartForRange(end)]];
  if (!pending) presets.unshift(["Hoje", end]);
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Período">
        {presets.map(([label, from]) => {
          const selected = !custom && value.from === from && value.to === end;
          return <Button key={label} size="sm" variant={selected ? "primary" : "secondary"} aria-pressed={selected} onClick={() => {
            setCustom(false);
            onChange({ from, to: end });
          }}>{label}</Button>;
        })}
        <Button variant={custom ? "primary" : "secondary"} size="sm" aria-expanded={custom} onClick={() => {
          setDraft(value);
          setCustom(!custom);
        }}>Datas livres</Button>
        <span className="text-[13px] text-muted sm:ml-2">{value.from === value.to ? formatDate(value.from) : `${formatDate(value.from)} a ${formatDate(value.to)}`}</span>
      </div>
      {custom && <form className="grid min-w-0 grid-cols-2 items-end gap-2 sm:grid-cols-[minmax(0,11rem)_minmax(0,11rem)_auto] sm:justify-start" onSubmit={(e) => {
        e.preventDefault();
        onChange(draft);
      }}>
        <Field label="De">{(props) => <Input {...props} className="min-w-0" type="date" min="1900-01-01" max={draft.to || end} value={draft.from} required onChange={(e) => setDraft({ ...draft, from: e.target.value })} />}</Field>
        <Field label="Até">{(props) => <Input {...props} className="min-w-0" type="date" min={draft.from || "1900-01-01"} max={pending ? end : "9998-12-31"} value={draft.to} required onChange={(e) => setDraft({ ...draft, to: e.target.value })} />}</Field>
        <Button variant="secondary" type="submit" className="col-span-2 justify-self-start sm:col-span-1">Aplicar</Button>
      </form>}
    </div>
  );
}
