import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { z } from "zod";
import { AuthFooter, AuthNotice, AuthShell, authLink } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/Button";
import { Field, Input, PasswordInput } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { handleFormError } from "@/lib/form-errors";
import { clearLinkToken, readLinkToken } from "@/lib/link-token";
import { newPasswordRules } from "@/lib/password-rules";

const emailSchema = z.object({ email: z.string().trim().min(1, "Informe o e-mail.").pipe(z.email("E-mail inválido.")) });

const resetSchema = z
  .object({ password: newPasswordRules, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "As senhas não conferem." });

function BackToLogin() {
  return (
    <AuthFooter>
      <Link to="/login" className={authLink}>
        Voltar para entrar
      </Link>
    </AuthFooter>
  );
}

/** "Esqueci minha senha": asks for the e-mail and sends a reset link. */
export function ForgotPasswordPage() {
  const toast = useToast();
  const [sentTo, setSentTo] = useState(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(emailSchema), defaultValues: { email: "" } });

  async function onSubmit({ email }) {
    try {
      await api("/auth/forgot-password", { method: "POST", body: { email } });
      setSentTo(email.trim().toLowerCase());
    } catch (error) {
      handleFormError(error, setError, toast);
    }
  }

  return (
    <AuthShell eyebrow="senha" title="Esqueci minha senha">
      {sentTo ? (
        <>
          <AuthNotice tone="mail">
            Se existir uma conta com <strong className="font-[600] break-all">{sentTo}</strong>, enviamos um link para criar uma nova senha. Ele vale por 30 minutos.
          </AuthNotice>
          <p className="mt-4 text-[13.5px] text-muted">Não chegou em alguns minutos? Veja se o e-mail foi digitado certo e confira o spam.</p>
        </>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 flex flex-col gap-5">
          <Field label="E-mail da conta" error={errors.email?.message}>
            {(a11y) => <Input {...a11y} type="email" autoComplete="email" autoFocus {...register("email")} />}
          </Field>
          <Button type="submit" size="lg" loading={isSubmitting} className="group mt-2 justify-between">
            Enviar link
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </Button>
        </form>
      )}
      <BackToLogin />
    </AuthShell>
  );
}

/** Opened from the e-mail: sets the new password. */
export function ResetPasswordPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [token] = useState(readLinkToken);
  const [linkError, setLinkError] = useState(token ? null : "Este link está incompleto. Abra o link do e-mail de novo ou peça outro.");
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(resetSchema), defaultValues: { password: "", confirmPassword: "" } });

  useEffect(clearLinkToken, []);

  async function onSubmit({ password }) {
    try {
      await api("/auth/reset-password", { method: "POST", body: { token, password } });
      navigate("/login", { replace: true, state: { notice: "Senha alterada. Entre com a nova senha." } });
    } catch (error) {
      if (error.code === "INVALID_TOKEN" || error.fields?.token) setLinkError(error.message);
      else handleFormError(error, setError, toast);
    }
  }

  return (
    <AuthShell eyebrow="senha" title="Criar nova senha">
      {linkError ? (
        <>
          <AuthNotice>{linkError}</AuthNotice>
          <AuthFooter>
            <Link to="/esqueci-senha" className={authLink}>
              Pedir um novo link
            </Link>
          </AuthFooter>
        </>
      ) : (
        <>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 flex flex-col gap-5">
            <Field label="Nova senha" error={errors.password?.message} hint="Mínimo de 10 caracteres.">
              {(a11y) => <PasswordInput {...a11y} autoComplete="new-password" autoFocus {...register("password")} />}
            </Field>
            <Field label="Confirmar nova senha" error={errors.confirmPassword?.message}>
              {(a11y) => <PasswordInput {...a11y} autoComplete="new-password" {...register("confirmPassword")} />}
            </Field>
            <Button type="submit" size="lg" loading={isSubmitting} className="group mt-2 justify-between">
              Salvar nova senha
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </Button>
          </form>
          <p className="mt-4 text-[13px] text-muted">Ao salvar, todos os aparelhos conectados saem da conta.</p>
        </>
      )}
    </AuthShell>
  );
}
