import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate } from "react-router";
import { z } from "zod";
import { useAuth } from "@/auth/AuthProvider";
import { AuthFooter, AuthNotice, AuthShell, authLink } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/Button";
import { Field, Input, PasswordInput } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { handleFormError } from "@/lib/form-errors";
import { newPasswordRules } from "@/lib/password-rules";
import { useApi } from "@/lib/use-api";

const schema = z
  .object({
    name: z.string().trim().min(1, "Informe seu nome.").max(80, "Use no máximo 80 caracteres."),
    email: z.string().trim().min(1, "Informe o e-mail.").pipe(z.email("E-mail inválido.")),
    password: newPasswordRules,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "As senhas não conferem." });

/** After signing up: check the inbox; a new link can be asked for. */
export function CheckInbox({ email, what = "ativar sua conta", note }) {
  const [state, setState] = useState("idle"); // idle | sending | sent
  const toast = useToast();

  async function resend() {
    setState("sending");
    try {
      await api("/auth/resend-verification", { method: "POST", body: { email } });
      setState("sent");
    } catch (e) {
      toast.error(e.message);
      setState("idle");
    }
  }

  return (
    <>
      <AuthNotice tone="mail">
        Enviamos um link para <strong className="font-[600] break-all">{email}</strong>. Abra o e-mail para {what}.
      </AuthNotice>
      {note && <p className="mt-4 text-[13.5px] text-ink-2">{note}</p>}
      <p className="mt-4 text-[13.5px] text-muted">
        Não chegou? Confira o spam ou{" "}
        {state === "sent" ? (
          <span className="text-done">enviamos de novo.</span>
        ) : (
          <button type="button" onClick={resend} disabled={state === "sending"} className={`${authLink} disabled:opacity-60`}>
            {state === "sending" ? "enviando…" : "envie de novo"}
          </button>
        )}
      </p>
      <AuthFooter>
        <Link to="/login" className={authLink}>
          Voltar para entrar
        </Link>
      </AuthFooter>
    </>
  );
}

export function SignupPage() {
  const { status } = useAuth();
  const options = useApi("/auth/options");
  const toast = useToast();
  const [sentTo, setSentTo] = useState(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { name: "", email: "", password: "", confirmPassword: "" } });

  if (status === "authenticated") return <Navigate to="/hoje" replace />;

  async function onSubmit({ name, email, password }) {
    try {
      const res = await api("/auth/register", { method: "POST", body: { name, email, password } });
      setSentTo(res.data.email);
    } catch (error) {
      handleFormError(error, setError, toast);
    }
  }

  if (sentTo) {
    return (
      <AuthShell eyebrow="quase lá" title="Confira seu e-mail">
        <CheckInbox email={sentTo} what="confirmar seu e-mail" note="Depois de confirmar, sua conta passa por uma liberação. Você recebe um e-mail assim que ela for aprovada." />
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow="nova conta" title="Criar conta">
      {options.loading ? (
        <Spinner className="mt-8" />
      ) : options.data && !options.data.signupEnabled ? (
        <>
          <AuthNotice tone="warn">O cadastro está fechado no momento.</AuthNotice>
          <AuthFooter>
            Já tem conta?{" "}
            <Link to="/login" className={authLink}>
              Entrar
            </Link>
          </AuthFooter>
        </>
      ) : (
        <>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 flex flex-col gap-5">
            <Field label="Nome" error={errors.name?.message}>
              {(a11y) => <Input {...a11y} autoComplete="name" autoFocus {...register("name")} />}
            </Field>
            <Field label="E-mail" error={errors.email?.message}>
              {(a11y) => <Input {...a11y} type="email" autoComplete="email" {...register("email")} />}
            </Field>
            <Field label="Senha" error={errors.password?.message} hint="Mínimo de 10 caracteres.">
              {(a11y) => <PasswordInput {...a11y} autoComplete="new-password" {...register("password")} />}
            </Field>
            <Field label="Confirmar senha" error={errors.confirmPassword?.message}>
              {(a11y) => <PasswordInput {...a11y} autoComplete="new-password" {...register("confirmPassword")} />}
            </Field>
            <Button type="submit" size="lg" loading={isSubmitting} className="group mt-2 justify-between">
              Criar conta
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </Button>
          </form>
          <AuthFooter>
            Já tem conta?{" "}
            <Link to="/login" className={authLink}>
              Entrar
            </Link>
          </AuthFooter>
        </>
      )}
    </AuthShell>
  );
}
