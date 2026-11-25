import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Tag, Tags, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input } from "@/components/ui/Field";
import { HelpButton, HelpPanel } from "@/components/ui/Help";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { Badge, Card, CardHeader } from "@/components/ui/Layout";
import { Menu } from "@/components/ui/Menu";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { CATEGORY_LABEL, CATEGORY_TINT } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { useApi } from "@/lib/use-api";

const TONES = ["daily", "work", "commute", "study", "class", "workout", "meal", "personal"];
const ICON_LABELS = {
  sparkles: "Brilho", briefcase: "Maleta", bus: "Ônibus", "book-open": "Livro", "graduation-cap": "Formatura",
  dumbbell: "Halter", utensils: "Talheres", house: "Casa", "heart-pulse": "Saúde", tag: "Etiqueta",
};

function CategoryDialog({ category, onClose, onSaved }) {
  const [name, setName] = useState(category?.name ?? "");
  const [colorKey, setColorKey] = useState(category?.colorKey ?? "daily");
  const [icon, setIcon] = useState(category?.icon ?? "sparkles");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const close = () => { if (!saving) onClose(); };

  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrors({});
    try {
      await api(category ? `/categories/${category.id}` : "/categories", {
        method: category ? "PATCH" : "POST",
        body: { name, colorKey, icon },
      });
      onSaved(category ? "Categoria atualizada." : "Categoria criada.");
    } catch (error) {
      setErrors(error.fields ?? {});
      if (!Object.keys(error.fields ?? {}).length) toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open size="sm" title={category ? "Editar categoria" : "Nova categoria"} onClose={close}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={saving}>Cancelar</Button>
          <Button type="submit" form="category-form" loading={saving}>Salvar</Button>
        </>
      }
    >
      <form id="category-form" noValidate className="grid gap-4" onSubmit={submit}>
        <Field label="Nome" error={errors.name}>
          {(props) => <Input {...props} value={name} onChange={(event) => setName(event.target.value)} maxLength={60} />}
        </Field>

        <fieldset>
          <legend className="mb-2 text-[13px] font-[560]">Cor</legend>
          <div className="grid grid-cols-2 gap-1.5">
            {TONES.map((tone) => (
              <button
                key={tone} type="button" aria-pressed={colorKey === tone} onClick={() => setColorKey(tone)}
                className={cn("flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-[13px] text-ink",
                  colorKey === tone ? "border-accent-text bg-selected" : "border-rule hover:bg-sunk")}
              >
                <span className={cn("size-4 shrink-0 rounded-full border border-rule-strong", CATEGORY_TINT[tone])} aria-hidden />
                {CATEGORY_LABEL[tone]}
              </button>
            ))}
          </div>
          {errors.colorKey && <p role="alert" className="mt-1 text-sm text-danger">{errors.colorKey}</p>}
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-[13px] font-[560]">Ícone</legend>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(ICON_LABELS).map(([value, label]) => (
              <Button
                key={value} variant="secondary" size="icon-sm" aria-label={label} title={label}
                aria-pressed={icon === value} onClick={() => setIcon(value)}
                className={icon === value ? cn("border-accent-text text-ink", CATEGORY_TINT[colorKey]) : undefined}
              >
                <ItemIcon name={value} className="size-4" aria-hidden />
              </Button>
            ))}
          </div>
          {errors.icon && <p role="alert" className="mt-1 text-sm text-danger">{errors.icon}</p>}
        </fieldset>
      </form>
    </Dialog>
  );
}

export function CategoriesSettings() {
  const { data: categories, error, loading, reload } = useApi("/categories", { includeArchived: true });
  const toast = useToast();
  const [dialog, setDialog] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [help, setHelp] = useState(false);
  const close = () => { if (!busyId) setDialog(null); };
  const saved = (message) => {
    setDialog(null);
    toast.success(message);
    reload();
  };

  async function archive(category, isArchived) {
    if (busyId) return;
    setBusyId(category.id);
    try {
      await api(`/categories/${category.id}`, { method: "PATCH", body: { isArchived } });
      saved(isArchived ? "Categoria arquivada." : "Categoria reativada.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(category) {
    if (busyId) return;
    setBusyId(category.id);
    setDeleteError(null);
    try {
      await api(`/categories/${category.id}`, { method: "DELETE" });
      saved("Categoria excluída.");
    } catch (error) {
      setDeleteError(error);
    } finally {
      setBusyId(null);
    }
  }

  const toRemove = dialog?.type === "remove" ? dialog.category : null;
  const used = deleteError?.status === 409;

  return (
    <Card>
      <CardHeader
        title={<span className="flex items-center gap-1">Categorias <HelpButton open={help} onClick={() => setHelp((value) => !value)} about="a diferença entre arquivar e excluir uma categoria" /></span>}
        actions={<Button size="sm" onClick={() => setDialog({ type: "form" })}><Tag className="size-4" aria-hidden /> Nova categoria</Button>}
      />
      {help && <HelpPanel className="mx-4 mt-3 sm:mx-5">Arquivar tira a categoria das novas escolhas e mantém os itens que já a usam. Você pode reativá-la. Para excluir, a categoria precisa estar sem uso.</HelpPanel>}
      {error && !categories && <ErrorState error={error} onRetry={reload} className="m-4" />}
      {loading && !categories && <div className="p-4"><Skeleton className="h-12" /></div>}
      {categories?.length === 0 && <EmptyState className="m-4" icon={Tags} title="Nenhuma categoria" />}
      {categories?.length > 0 && (
        <ul className="divide-y divide-rule">
          {categories.map((category) => (
            <li key={category.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-[10px] text-ink", CATEGORY_TINT[category.colorKey])}>
                <ItemIcon name={category.icon} className="size-[17px]" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 break-words text-sm font-[600]">{category.name}</span>
              {category.isArchived && <Badge>Arquivada</Badge>}
              <Menu
                trigger={(props) => (
                  <Button variant="ghost" size="icon-sm" onClick={props.toggle} disabled={Boolean(busyId)} aria-haspopup="menu"
                    aria-expanded={props.open} aria-label={`Ações de ${category.name}`}>
                    <MoreHorizontal className="size-4" aria-hidden />
                  </Button>
                )}
                items={[
                  { label: "Editar…", icon: Pencil, onSelect: () => setDialog({ type: "form", category }) },
                  { label: category.isArchived ? "Reativar" : "Arquivar", icon: category.isArchived ? ArchiveRestore : Archive, onSelect: () => archive(category, !category.isArchived) },
                  { label: "Excluir…", icon: Trash2, danger: true, onSelect: () => { setDeleteError(null); setDialog({ type: "remove", category }); } },
                ]}
              />
            </li>
          ))}
        </ul>
      )}
      {dialog?.type === "form" && <CategoryDialog category={dialog.category} onClose={close} onSaved={saved} />}
      {toRemove && (
        <Dialog
          open size="sm" title={used ? "Categoria em uso" : "Excluir categoria?"} onClose={close}
          footer={
            <>
              <Button variant="secondary" onClick={close} disabled={Boolean(busyId)}>Cancelar</Button>
              {used
                ? !toRemove.isArchived && <Button loading={Boolean(busyId)} onClick={() => archive(toRemove, true)}>Arquivar</Button>
                : <Button variant="danger" loading={Boolean(busyId)} onClick={() => remove(toRemove)}>Excluir</Button>}
            </>
          }
        >
          <p className={cn("text-sm", deleteError ? "text-danger" : "text-muted")} role={deleteError ? "alert" : undefined}>
            {deleteError?.message ?? `Você quer excluir “${toRemove.name}”?`}
          </p>
        </Dialog>
      )}
    </Card>
  );
}
