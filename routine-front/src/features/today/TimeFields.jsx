import { Field, Input, Select } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { PERIODS, formatMinute } from "@/lib/minutes";

const MODES = { none: "Sem horário", period: "Período", exact: "Horário" };

/**
 * When in the day: no time ("a qualquer hora"), a part of the day (manhã,
 * tarde, noite) or exact start and end. `modes` limits the choices.
 */
export function TimeFields({ values, setValues, errors, hints = {}, modes = ["none", "period", "exact"] }) {
  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));
  return (
    <div className="grid gap-3">
      {modes.length > 1 && (
        <div role="radiogroup" aria-label="Quando no dia" className="grid gap-1 rounded-md bg-sunk p-1" style={{ gridTemplateColumns: `repeat(${modes.length}, minmax(0, 1fr))` }}>
          {modes.map((mode) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={values.timeMode === mode}
              onClick={() => setValues((v) => ({ ...v, timeMode: mode }))}
              className={cn("h-9 rounded-[7px] text-[13px] font-[580] transition-colors", values.timeMode === mode ? "bg-paper text-ink shadow-sm" : "text-muted hover:text-ink")}
            >
              {MODES[mode]}
            </button>
          ))}
        </div>
      )}
      {hints[values.timeMode] && <p className="text-[12.5px] text-muted">{hints[values.timeMode]}</p>}
      {values.timeMode === "period" && (
        <Field label="Período" error={errors.period ?? errors.startMinute}>
          {(p) => (
            <Select {...p} value={values.period} onChange={set("period")}>
              {Object.entries(PERIODS).map(([key, period]) => (
                <option key={key} value={key}>
                  {period.label} ({formatMinute(period.start)} às {formatMinute(period.end)})
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}
      {values.timeMode === "exact" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Início" error={errors.startMinute}>
            {(p) => <Input {...p} type="time" value={values.start} onChange={set("start")} />}
          </Field>
          <Field label="Fim" error={errors.endMinute} optional>
            {(p) => <Input {...p} type="time" value={values.end} onChange={set("end")} disabled={!values.start} />}
          </Field>
        </div>
      )}
    </div>
  );
}
