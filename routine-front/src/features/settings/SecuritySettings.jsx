import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, Download, LogOut, Monitor, ShieldCheck, ShieldOff, Smartphone, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { z } from "zod";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input, PasswordInput } from "@/components/ui/Field";
import { HelpButton, HelpPanel } from "@/components/ui/Help";
import { Badge, Card } from "@/components/ui/Layout";
import { QrCode } from "@/components/ui/QrCode";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { handleFormError } from "@/lib/form-errors";
import { useApi } from "@/lib/use-api";
import { describeDevice } from "@/lib/user-agent";

/** Card title with an optional "?" that opens the explanation. */
function SectionHead({ title, help, actions }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-rule px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1 text-[15px] font-[620]">
          {title}
          {help && <HelpButton open={open} onClick={() => setOpen((v) => !v)} about={title.toLowerCase()} />}
        </h2>
        {actions}
      </div>
      {open && <HelpPanel className="mt-2">{help}</HelpPanel>}
    </div>
  );
}

function saveFile(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const today = () => new Date().toISOString().slice(0, 10);

// ───────────── Two-step verification ─────────────

const passwordSchema = z.object({ currentPassword: z.string().min(1, "Informe a senha atual.") });
const codeSchema = z.object({ code: z.string().trim().min(1, "Informe o código.") });
const passwordAndCodeSchema = passwordSchema.extend(codeSchema.shape);

/** Shown once, right after turning 2FA on or asking for new codes. */
function RecoveryCodes({ codes, onDone }) {
  const toast = useToast();
  const text = `Routine: códigos de recuperação (cada um funciona uma vez)\n\n${codes.join("\n")}\n`;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        Se perder o celular, você entra com um destes códigos. <strong className="font-[620]">Eles não aparecem de novo:</strong> guarde num gerenciador de senhas ou
        num papel.
      </p>
      <ul className="grid grid-cols-2 gap-2 rounded-[10px] bg-sunk p-3 font-mono text-[14px] sm:grid-cols-2">
        {codes.map((c) => (
          <li key={c} className="text-center">
            {c}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              toast.success("Códigos copiados.");
            } catch {
              toast.error("Não foi possível copiar. Use o botão de baixar.");
            }
          }}
        >
          <Copy className="size-4" aria-hidden /> Copiar
        </Button>
        <Button variant="secondary" size="sm" onClick={() => saveFile(`routine-codigos-recuperacao-${today()}.txt`, text, "text/plain")}>
          <Download className="size-4" aria-hidden /> Baixar .txt
        </Button>
        <Button size="sm" className="ml-auto" onClick={onDone}>
          Pronto, guardei
        </Button>
      </div>
    </div>
  );
}

/** Turning on: password → QR code + first code → recovery codes. */
function EnableFlow({ onClose, onEnabled }) {
  const toast = useToast();
  const [setup, setSetup] = useState(null);
  const [codes, setCodes] = useState(null);
  const passwordForm = useForm({ resolver: zodResolver(passwordSchema), defaultValues: { currentPassword: "" } });
  const codeForm = useForm({ resolver: zodResolver(codeSchema), defaultValues: { code: "" } });

  async function start(values) {
    try {
      setSetup((await api("/me/two-factor/setup", { method: "POST", body: values })).data);
    } catch (error) {
      handleFormError(error, passwordForm.setError, toast);
    }
  }

  async function confirm(values) {
    try {
      const res = await api("/me/two-factor/enable", { method: "POST", body: values });
      setCodes(res.data.recoveryCodes);
      onEnabled();
    } catch (error) {
      handleFormError(error, codeForm.setError, toast);
    }
  }

  const title = codes ? "Guarde os códigos de recuperação" : "Ativar verificação em duas etapas";
  return (
    <Dialog open onClose={codes ? () => onClose(true) : () => onClose(false)} title={title} size="sm">
      {codes ? (
        <RecoveryCodes codes={codes} onDone={() => onClose(true)} />
      ) : !setup ? (
        <form onSubmit={passwordForm.handleSubmit(start)} noValidate className="flex flex-col gap-4">
          <p className="text-sm text-muted">Confirme sua senha para começar.</p>
          <Field label="Senha atual" error={passwordForm.formState.errors.currentPassword?.message}>
            {(a11y) => <PasswordInput {...a11y} autoComplete="current-password" {...passwordForm.register("currentPassword")} />}
          </Field>
          <Button type="submit" loading={passwordForm.formState.isSubmitting}>
            Continuar
          </Button>
        </form>
      ) : (
        <form onSubmit={codeForm.handleSubmit(confirm)} noValidate className="flex flex-col gap-4">
          <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm">
            <li>
              Instale um app autenticador no celular: <strong className="font-[600]">Google Authenticator</strong>, Microsoft Authenticator ou outro.
            </li>
            <li>No app, toque em adicionar (+) e escaneie o QR code.</li>
            <li>Digite abaixo o código de 6 dígitos que aparecer.</li>
          </ol>
          <div className="flex justify-center">
            <QrCode value={setup.otpauthUrl} label="QR code para o app autenticador" />
          </div>
          <details className="text-[13px] text-muted">
            <summary className="cursor-pointer font-[540] text-accent-text">Não consigo escanear</summary>
            <p className="mt-2">No app, escolha digitar a chave e use:</p>
            <p className="mt-1 rounded-[8px] bg-sunk px-3 py-2 text-center font-mono text-[14px] break-all text-ink select-all">{setup.manualKey}</p>
          </details>
          <Field label="Código do app" error={codeForm.formState.errors.code?.message}>
            {(a11y) => (
              <Input
                {...a11y}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={7}
                placeholder="123456"
                className="text-center font-mono text-lg tracking-[0.3em]"
                {...codeForm.register("code")}
              />
            )}
          </Field>
          <Button type="submit" loading={codeForm.formState.isSubmitting}>
            Ativar
          </Button>
        </form>
      )}
    </Dialog>
  );
}

/** Password + code: turn off, or new recovery codes. */
function ConfirmWithCode({ title, action, submitLabel, danger, onClose, onDone }) {
  const toast = useToast();
  const [codes, setCodes] = useState(null);
  const form = useForm({ resolver: zodResolver(passwordAndCodeSchema), defaultValues: { currentPassword: "", code: "" } });

  async function submit(values) {
    try {
      const res = await api(action, { method: "POST", body: values });
      if (res?.data?.recoveryCodes) setCodes(res.data.recoveryCodes);
      else onDone();
    } catch (error) {
      handleFormError(error, form.setError, toast);
    }
  }

  return (
    <Dialog open onClose={codes ? onDone : onClose} title={codes ? "Seus novos códigos de recuperação" : title} size="sm">
      {codes ? (
        <RecoveryCodes codes={codes} onDone={onDone} />
      ) : (
        <form onSubmit={form.handleSubmit(submit)} noValidate className="flex flex-col gap-4">
          <Field label="Senha atual" error={form.formState.errors.currentPassword?.message}>
            {(a11y) => <PasswordInput {...a11y} autoComplete="current-password" {...form.register("currentPassword")} />}
          </Field>
          <Field label="Código do app (ou de recuperação)" error={form.formState.errors.code?.message}>
            {(a11y) => <Input {...a11y} autoComplete="one-time-code" autoCapitalize="none" spellCheck={false} placeholder="123456" {...form.register("code")} />}
          </Field>
          <Button type="submit" variant={danger ? "danger" : "primary"} loading={form.formState.isSubmitting}>
            {submitLabel}
          </Button>
        </form>
      )}
    </Dialog>
  );
}

function TwoFactorCard() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const status = useApi("/me/two-factor");
  const [dialog, setDialog] = useState(null); // enable | disable | codes

  const enabled = status.data?.enabled;
  const close = () => setDialog(null);
  const refresh = (twoFactorEnabled) => {
    setUser({ ...user, twoFactorEnabled });
    status.reload();
  };

  return (
    <Card>
      <SectionHead
        title="Verificação em duas etapas"
        help="Além da senha, o Routine pede um código de 6 dígitos que muda a cada 30 segundos no app autenticador do seu celular. Mesmo que alguém descubra sua senha, não entra sem o seu celular. Se perder o celular, use um dos códigos de recuperação."
        actions={enabled !== undefined && <Badge tone={enabled ? "positive" : "neutral"}>{enabled ? "Ativada" : "Desativada"}</Badge>}
      />
      <div className="flex flex-col gap-4 p-5">
        {status.loading && !status.data ? (
          <Skeleton className="h-10 w-48" />
        ) : status.error ? (
          <ErrorState error={status.error} onRetry={status.reload} />
        ) : enabled ? (
          <>
            <p className="flex items-center gap-2 text-sm">
              <ShieldCheck className="size-[18px] text-done" aria-hidden />
              Ao entrar, o Routine pede o código do app.
              <span className="text-muted">
                {status.data.recoveryCodesLeft} código(s) de recuperação restante(s).
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setDialog("codes")}>
                Gerar novos códigos de recuperação
              </Button>
              <Button variant="danger-ghost" onClick={() => setDialog("disable")}>
                <ShieldOff className="size-4" aria-hidden /> Desativar
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">Hoje basta a senha para entrar.</p>
            <Button onClick={() => setDialog("enable")}>
              <ShieldCheck className="size-4" aria-hidden /> Ativar
            </Button>
          </div>
        )}
      </div>

      {dialog === "enable" && (
        <EnableFlow
          onEnabled={() => refresh(true)}
          onClose={(done) => {
            close();
            if (done) toast.success("Verificação ativada. Os outros aparelhos foram desconectados.");
          }}
        />
      )}
      {dialog === "disable" && (
        <ConfirmWithCode
          title="Desativar verificação em duas etapas"
          action="/me/two-factor/disable"
          submitLabel="Desativar"
          danger
          onClose={close}
          onDone={() => {
            close();
            refresh(false);
            toast.success("Verificação em duas etapas desativada.");
          }}
        />
      )}
      {dialog === "codes" && (
        <ConfirmWithCode
          title="Gerar novos códigos de recuperação"
          action="/me/two-factor/recovery-codes"
          submitLabel="Gerar novos códigos"
          onClose={close}
          onDone={() => {
            close();
            status.reload();
          }}
        />
      )}
    </Card>
  );
}

// ───────────── Devices ─────────────

function ago(iso) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 2) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  if (minutes < 24 * 60) return `há ${Math.round(minutes / 60)} h`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function DevicesCard() {
  const toast = useToast();
  const sessions = useApi("/me/sessions");
  const [busy, setBusy] = useState(null);

  async function signOut(id) {
    setBusy(id ?? "all");
    try {
      const res = await api(id ? `/me/sessions/${id}` : "/me/sessions", { method: "DELETE" });
      toast.success(id ? "Aparelho desconectado." : `${res.data.signedOut} aparelho(s) desconectado(s).`);
      sessions.reload();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(null);
    }
  }

  const list = sessions.data ?? [];
  const others = list.filter((s) => !s.current).length;

  return (
    <Card>
      <SectionHead
        title="Aparelhos conectados"
        help="Onde sua conta está aberta agora. Se não reconhecer algum, desconecte e troque a senha. Por segurança, cada aparelho sai sozinho depois de 30 dias sem uso, e no máximo 90 dias depois de entrar."
      />
      {sessions.loading && !sessions.data ? (
        <div className="p-5">
          <Skeleton className="h-12 w-full" />
        </div>
      ) : sessions.error ? (
        <div className="p-5">
          <ErrorState error={sessions.error} onRetry={sessions.reload} />
        </div>
      ) : (
        <>
          <ul className="divide-y divide-rule">
            {list.map((s) => {
              const device = describeDevice(s.userAgent);
              const Icon = device.mobile ? Smartphone : Monitor;
              return (
                <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <Icon className="size-5 shrink-0 text-muted" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-[560]">
                      {device.name}
                      {s.current && <Badge tone="accent">Este aparelho</Badge>}
                    </p>
                    <p className="text-[12.5px] text-muted">
                      Último acesso {ago(s.lastSeenAt)} · entrou em {new Date(s.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  {!s.current && (
                    <Button variant="ghost" size="sm" loading={busy === s.id} onClick={() => signOut(s.id)}>
                      Sair
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
          {others > 0 && (
            <div className="border-t border-rule px-5 py-3">
              <Button variant="secondary" size="sm" loading={busy === "all"} onClick={() => signOut(null)}>
                <LogOut className="size-4" aria-hidden /> Sair de todos os outros
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

// ───────────── Your data ─────────────

const deleteSchema = (needsCode) =>
  z.object({
    currentPassword: z.string().min(1, "Informe a senha atual."),
    code: needsCode ? z.string().trim().min(1, "Informe o código.") : z.string().optional(),
    confirmation: z.string().refine((v) => v.trim().toUpperCase() === "EXCLUIR", "Digite EXCLUIR para confirmar."),
  });

function DeleteAccountDialog({ onClose }) {
  const { user, forget } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const needsCode = Boolean(user?.twoFactorEnabled);
  const form = useForm({ resolver: zodResolver(deleteSchema(needsCode)), defaultValues: { currentPassword: "", code: "", confirmation: "" } });

  async function submit({ currentPassword, code }) {
    try {
      await api("/me", { method: "DELETE", body: { currentPassword, ...(needsCode ? { code } : {}) } });
      forget();
      navigate("/login", { replace: true, state: { notice: "Sua conta e todos os dados foram excluídos." } });
    } catch (error) {
      handleFormError(error, form.setError, toast);
    }
  }

  const { errors, isSubmitting } = form.formState;
  return (
    <Dialog open onClose={onClose} title="Excluir conta" size="sm">
      <form onSubmit={form.handleSubmit(submit)} noValidate className="flex flex-col gap-4">
        <p className="rounded-[8px] bg-danger-soft px-3 py-2 text-sm text-danger">
          Isto apaga para sempre sua conta e tudo o que está nela: contas, cartões, lançamentos e relatórios. Não dá para desfazer. Se quiser uma cópia, baixe seus dados antes.
        </p>
        <Field label="Senha atual" error={errors.currentPassword?.message}>
          {(a11y) => <PasswordInput {...a11y} autoComplete="current-password" {...form.register("currentPassword")} />}
        </Field>
        {needsCode && (
          <Field label="Código do app (ou de recuperação)" error={errors.code?.message}>
            {(a11y) => <Input {...a11y} autoComplete="one-time-code" autoCapitalize="none" spellCheck={false} placeholder="123456" {...form.register("code")} />}
          </Field>
        )}
        <Field label="Digite EXCLUIR para confirmar" error={errors.confirmation?.message}>
          {(a11y) => <Input {...a11y} autoComplete="off" autoCapitalize="characters" spellCheck={false} {...form.register("confirmation")} />}
        </Field>
        <Button type="submit" variant="danger" loading={isSubmitting}>
          <Trash2 className="size-4" aria-hidden /> Excluir minha conta
        </Button>
      </form>
    </Dialog>
  );
}

function DataCard() {
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function download() {
    setDownloading(true);
    try {
      const res = await api("/me/export");
      saveFile(`routine-meus-dados-${today()}.json`, JSON.stringify(res.data, null, 2), "application/json");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Card>
      <SectionHead
        title="Seus dados"
        help="Pela LGPD, você pode baixar tudo o que o Routine guarda sobre você (um arquivo .json, que abre em qualquer editor de texto) e excluir sua conta quando quiser."
      />
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="secondary" loading={downloading} onClick={download}>
          <Download className="size-4" aria-hidden /> Baixar meus dados
        </Button>
        <Button variant="danger-ghost" onClick={() => setDeleting(true)}>
          <Trash2 className="size-4" aria-hidden /> Excluir conta
        </Button>
      </div>
      {deleting && <DeleteAccountDialog onClose={() => setDeleting(false)} />}
    </Card>
  );
}

export function SecuritySettings() {
  return (
    <div className="flex flex-col gap-6">
      <TwoFactorCard />
      <DevicesCard />
      <DataCard />
    </div>
  );
}
