import { Check, ShieldCheck, Trash2, UserRoundCheck, Users } from "lucide-react";
import { useState } from "react";
import { Navigate } from "react-router";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Badge, PageHeader } from "@/components/ui/Layout";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";

const DATE = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short", year: "numeric" });

/** Where the account stands, in one badge. */
function Status({ user }) {
  if (user.approvedAt) return <Badge tone="positive">liberada</Badge>;
  if (!user.emailVerified) return <Badge tone="neutral">falta confirmar o e-mail</Badge>;
  return <Badge tone="warning">aguardando você</Badge>;
}

function UserRow({ user, me, onApprove, onRemove, busy }) {
  const waiting = !user.approvedAt;
  const removable = user.id !== me.id && user.role !== "ADMIN";
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 md:px-5">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-[14px] font-[560]">
          {user.name}
          {user.role === "ADMIN" && <Badge tone="accent">admin</Badge>}
          {user.id === me.id && <span className="text-[12px] font-normal text-faint">(você)</span>}
        </p>
        <p className="truncate text-[13px] text-muted">{user.email}</p>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-faint">
          <Status user={user} />
          <span>conta criada em {DATE.format(new Date(user.createdAt))}</span>
          {user.twoFactorEnabled && (
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="size-3.5" aria-hidden /> duas etapas
            </span>
          )}
        </p>
      </div>
      <span className="flex shrink-0 items-center gap-1.5">
        {waiting && (
          <Button size="sm" onClick={() => onApprove(user)} loading={busy === user.id}>
            <Check className="size-3.5" aria-hidden /> Liberar
          </Button>
        )}
        {removable && (
          <Button variant="danger-ghost" size="sm" onClick={() => onRemove(user)} disabled={busy === user.id}>
            <Trash2 className="size-3.5" aria-hidden /> {waiting ? "Recusar" : "Excluir"}
          </Button>
        )}
      </span>
    </li>
  );
}

/**
 * Configurações → Usuários (admins only): who has an account. New sign-ups
 * wait here until they are let in ("Liberar") or refused (the account is
 * deleted). Demo accounts are not listed: they delete themselves.
 */
export function UsersSettings() {
  const { user: me } = useAuth();
  const toast = useToast();
  const { data, error, loading, reload } = useApi(me?.role === "ADMIN" ? "/admin/users" : null);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(null);

  if (me?.role !== "ADMIN") return <Navigate to="/configuracoes" replace />;

  async function approve(user) {
    setBusy(user.id);
    try {
      await api(`/admin/users/${user.id}/approve`, { method: "POST" });
      toast.success(`${user.name} já pode entrar. Mandamos um e-mail avisando.`);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    const user = removing;
    setBusy(user.id);
    try {
      await api(`/admin/users/${user.id}`, { method: "DELETE" });
      toast.success(user.approvedAt ? "Conta excluída." : "Pedido recusado e conta excluída.");
      setRemoving(null);
      reload();
    } catch (err) {
      toast.error(err.message);
      setRemoving(null);
    } finally {
      setBusy(null);
    }
  }

  const users = data ?? [];
  const waiting = users.filter((u) => !u.approvedAt);
  const active = users.filter((u) => u.approvedAt);
  const row = (u) => <UserRow key={u.id} user={u} me={me} onApprove={approve} onRemove={setRemoving} busy={busy} />;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Usuários"
        description="Quem cria conta pelo site só entra depois que você libera. Quem quiser só conhecer o app pode usar a demonstração da tela de entrada, sem cadastro."
      />

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <Skeleton className="h-48" />
      ) : (
        <>
          <section className="sheet overflow-hidden">
            <p className="flex items-center gap-2 border-b border-rule bg-sunk/50 px-4 py-2 text-[12.5px] font-[580] text-muted md:px-5">
              <UserRoundCheck className="size-4" aria-hidden /> Pedidos de acesso {waiting.length > 0 && `(${waiting.length})`}
            </p>
            {waiting.length === 0 ? (
              <p className="px-4 py-5 text-[14px] text-muted md:px-5">Nenhum pedido esperando.</p>
            ) : (
              <ul className="divide-y divide-rule">{waiting.map(row)}</ul>
            )}
          </section>
          <section className="sheet overflow-hidden">
            <p className="flex items-center gap-2 border-b border-rule bg-sunk/50 px-4 py-2 text-[12.5px] font-[580] text-muted md:px-5">
              <Users className="size-4" aria-hidden /> Contas liberadas ({active.length})
            </p>
            <ul className="divide-y divide-rule">{active.map(row)}</ul>
          </section>
        </>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={remove}
        loading={Boolean(removing) && busy === removing?.id}
        confirmLabel={removing?.approvedAt ? "Excluir conta" : "Recusar"}
        title={removing?.approvedAt ? `Excluir a conta de ${removing?.name}?` : `Recusar o pedido de ${removing?.name}?`}
        description={
          removing?.approvedAt
            ? "A conta e todos os dados dela (meses, cartões, lançamentos) são apagados para sempre. Isso não pode ser desfeito."
            : "A conta é excluída. Se a pessoa tentar de novo, um novo pedido aparece aqui."
        }
      />
    </div>
  );
}
