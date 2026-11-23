import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck, Monitor, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Field, Input, PasswordInput } from "@/components/ui/Field";
import { Card, CardHeader } from "@/components/ui/Layout";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { handleFormError } from "@/lib/form-errors";
import { useTheme } from "@/lib/theme";

const profileSchema = z.object({ name: z.string().trim().min(1, "Informe seu nome.").max(80) });

const emailSchema = z.object({
  newEmail: z.string().trim().min(1, "Informe o novo e-mail.").pipe(z.email("E-mail inválido.")),
  currentPassword: z.string().min(1, "Informe a senha atual."),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual."),
    newPassword: z.string().min(10, "A senha precisa ter pelo menos 10 caracteres.").max(128),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { path: ["confirmPassword"], message: "As senhas não conferem." });

function ProfileCard() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({ resolver: zodResolver(profileSchema), values: { name: user?.name ?? "" } });

  async function onSubmit(values) {
    try {
      const res = await api("/me", { method: "PATCH", body: values });
      setUser(res.data.user);
      reset({ name: res.data.user.name });
      toast.success("Perfil atualizado.");
    } catch (error) {
      handleFormError(error, setError, toast);
    }
  }

  return (
    <Card>
      <CardHeader title="Perfil" description="Como você aparece no Routine." />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5 p-5 sm:grid-cols-2">
        <Field label="Nome" error={errors.name?.message}>
          {(a11y) => <Input {...a11y} autoComplete="name" {...register("name")} />}
        </Field>
        <div className="sm:col-span-2">
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
            Salvar perfil
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** Login e-mail: changes only after the link sent to the new address is opened. */
function EmailCard() {
  const { user } = useAuth();
  const toast = useToast();
  const [pending, setPending] = useState(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(emailSchema), defaultValues: { newEmail: "", currentPassword: "" } });

  async function onSubmit(values) {
    try {
      const res = await api("/me/email", { method: "PUT", body: values });
      setPending(res.data.pendingEmail);
      reset();
    } catch (error) {
      handleFormError(error, setError, toast);
    }
  }

  return (
    <Card>
      <CardHeader title="E-mail" description={`Hoje você entra com ${user?.email ?? ""}.`} />
      {pending && (
        <p role="status" className="mx-5 mt-5 flex items-start gap-2 rounded-md bg-accent-soft px-3 py-2.5 text-sm text-accent-text">
          <MailCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Enviamos um link para <strong className="font-[600] break-all">{pending}</strong>. A troca acontece quando você abrir o link (vale por 1 hora).
          </span>
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5 p-5 sm:grid-cols-2">
        <Field label="Novo e-mail" error={errors.newEmail?.message}>
          {(a11y) => <Input {...a11y} type="email" autoComplete="email" {...register("newEmail")} />}
        </Field>
        <Field label="Senha atual" error={errors.currentPassword?.message}>
          {(a11y) => <PasswordInput {...a11y} autoComplete="current-password" {...register("currentPassword")} />}
        </Field>
        <div className="sm:col-span-2">
          <Button type="submit" loading={isSubmitting}>
            Trocar e-mail
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordCard() {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(passwordSchema), defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" } });

  async function onSubmit({ currentPassword, newPassword }) {
    try {
      const res = await api("/me/password", { method: "PUT", body: { currentPassword, newPassword } });
      reset();
      const others = res.data.otherSessionsSignedOut;
      toast.success(others > 0 ? `Senha alterada. ${others} outra(s) sessão(ões) encerrada(s).` : "Senha alterada.");
    } catch (error) {
      handleFormError(error, setError, toast);
    }
  }

  return (
    <Card>
      <CardHeader title="Senha" description="Ao trocar a senha, todos os outros dispositivos são desconectados." />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5 p-5 sm:grid-cols-3">
        <Field label="Senha atual" error={errors.currentPassword?.message}>
          {(a11y) => <PasswordInput {...a11y} autoComplete="current-password" {...register("currentPassword")} />}
        </Field>
        <Field label="Nova senha" error={errors.newPassword?.message} hint="Mínimo de 10 caracteres.">
          {(a11y) => <PasswordInput {...a11y} autoComplete="new-password" {...register("newPassword")} />}
        </Field>
        <Field label="Confirmar nova senha" error={errors.confirmPassword?.message}>
          {(a11y) => <PasswordInput {...a11y} autoComplete="new-password" {...register("confirmPassword")} />}
        </Field>
        <div className="sm:col-span-3">
          <Button type="submit" loading={isSubmitting}>
            Alterar senha
          </Button>
        </div>
      </form>
    </Card>
  );
}

const THEMES = [
  { value: "system", label: "Sistema", icon: Monitor },
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
];

function AppearanceCard() {
  const { preference, setPreference } = useTheme();
  return (
    <Card>
      <CardHeader title="Aparência" description="O tema fica salvo neste navegador." />
      <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-2 p-5 sm:max-w-md">
        {THEMES.map((t) => (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={preference === t.value}
            onClick={() => setPreference(t.value)}
            className={cn(
              "flex flex-col items-center gap-2 border px-3 py-4 text-sm transition-colors",
              preference === t.value ? "border-accent bg-accent-soft text-ink" : "border-rule text-muted hover:border-rule-strong hover:text-ink",
            )}
          >
            <t.icon className="size-5" aria-hidden />
            {t.label}
          </button>
        ))}
      </div>
    </Card>
  );
}

export function ProfileSettings() {
  return (
    <div className="flex flex-col gap-6">
      <ProfileCard />
      <EmailCard />
      <PasswordCard />
      <AppearanceCard />
    </div>
  );
}
