import { CalendarOff, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { HelpButton, HelpPanel } from "@/components/ui/Help";
import { Card, CardHeader } from "@/components/ui/Layout";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { formatDate, shiftDate, today } from "@/lib/dates";
import { SPECIAL } from "@/lib/special";
import { useApi } from "@/lib/use-api";

/**
 * Configurações → Dias especiais: feriados and férias (periods) ahead and the
 * recent ones. Fixed items marked "pula em dias especiais" do not happen on them.
 */
export function SpecialDaysSettings() {
  const toast = useToast();
  const { data, error, loading, reload } = useApi("/special-days", { from: shiftDate(today(), -60) });
  const [form, setForm] = useState({ kind: "HOLIDAY", from: today(), to: "", name: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [help, setHelp] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function add(e) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await api("/special-days", { method: "POST", body: { kind: form.kind, from: form.from, to: form.to || form.from, name: form.name || null } });
      toast.success("Dia especial marcado.");
      setForm((f) => ({ ...f, to: "", name: "" }));
      reload();
    } catch (err) {
      setErrors(err.fields ?? {});
      if (!Object.keys(err.fields ?? {}).length) toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    try {
      await api(`/special-days/${id}`, { method: "DELETE" });
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-1">Dias especiais <HelpButton open={help} onClick={() => setHelp((v) => !v)} about="os dias especiais" /></span>} />
      {help && (
        <HelpPanel className="mx-4 mt-3 sm:mx-5">
          Feriado, férias ou doente. Nesses dias, os fixos marcados “Pula em dias especiais” (ex.: Trabalho, Condução) não aparecem. Os outros, como Rotina diária e Rotina de dormir, continuam, e se ficarem sem fazer aparecem como ponto de atenção nos Relatórios.
        </HelpPanel>
      )}
      <form onSubmit={add} className="grid gap-3 border-b border-rule px-4 py-4 sm:grid-cols-[9rem_1fr_1fr] sm:px-5" noValidate>
        <Field label="Tipo">
          {(p) => (
            <Select {...p} value={form.kind} onChange={set("kind")}>
              {Object.entries(SPECIAL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          )}
        </Field>
        <Field label="De" error={errors.from}>{(p) => <Input {...p} type="date" value={form.from} onChange={set("from")} />}</Field>
        <Field label="Até" optional error={errors.to}>{(p) => <Input {...p} type="date" min={form.from} value={form.to} onChange={set("to")} />}</Field>
        <Field label="Nome" optional className="sm:col-span-2">{(p) => <Input {...p} value={form.name} onChange={set("name")} maxLength={60} placeholder="Ex.: Natal, Férias de janeiro" />}</Field>
        <Button type="submit" loading={saving} className="self-end">Marcar</Button>
      </form>
      {error && !data && <ErrorState error={error} onRetry={reload} className="p-5" />}
      {loading && !data && <Skeleton className="m-5 h-12" />}
      {data?.length === 0 && <EmptyState className="py-8" icon={CalendarOff} title="Nenhum dia especial" />}
      {data?.length > 0 && (
        <ul className="divide-y divide-rule">
          {data.map((s) => {
            const Icon = SPECIAL[s.kind].icon;
            return (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <Icon className="size-5 shrink-0 text-accent-text" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-[600]">{s.name ?? SPECIAL[s.kind].label}</span>
                  <span className="block text-[12.5px] text-muted">{SPECIAL[s.kind].label} · {s.from === s.to ? formatDate(s.from) : `${formatDate(s.from)} a ${formatDate(s.to)}`}</span>
                </span>
                <Button variant="ghost" size="icon-sm" onClick={() => remove(s.id)} aria-label={`Desmarcar ${s.name ?? SPECIAL[s.kind].label}`}>
                  <Trash2 className="size-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
