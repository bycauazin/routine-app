import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Presentation } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { z } from "zod";
import { useAuth } from "@/auth/AuthProvider";
import { AuthFooter, AuthNotice, AuthShell, authLink } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/Button";
import { Field, Input, PasswordInput } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";

const schema = z.object({
  email: z.string().trim().min(1, "Informe o e-mail.").pipe(z.email("E-mail inválido.")),
  password: z.string().min(1, "Informe a senha."),
});

/** Account not confirmed yet: explain and offer a new link. */
function NotVerified({ email }) {
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState(null);

  async function resend() {
    setState("sending");
    try {
      await api("/auth/resend-verification", { method: "POST", body: { email } });
      setState("sent");
    } catch (e) {
      setError(e.message);
      setState("error");
    }
  }

  return (
    <AuthNotice tone="warn">
      Confirme seu e-mail para entrar. Procure o link que enviamos para <strong className="font-[600] break-all">{email}</strong>.
      {state === "sent" ? (
        <span className="mt-1.5 block text-done">Enviamos um novo link. Confira também o spam.</span>
      ) : (
        <button type="button" onClick={resend} disabled={state === "sending"} className="mt-1.5 block font-[600] underline underline-offset-2 disabled:opacity-60">
          {state === "sending" ? "Enviando…" : "Reenviar link"}
        </button>
      )}
      {state === "error" && <span className="mt-1 block text-danger">{error}</span>}
    </AuthNotice>
  );
}

/**
 * "Ver demonstração": a fictional account just for this visitor, no sign-up.
 * It is deleted when they leave it (or after a day).
 */
function DemoEntry() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function open() {
    setLoading(true);
    setError(null);
    try {
      await api("/auth/demo", { method: "POST" });
      // Full reload: the app starts fresh in the demo account.
      window.location.assign("/hoje");
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-2">
      <div className="flex items-center gap-3 text-[12px] text-faint" aria-hidden>
        <span className="h-px flex-1 bg-rule" /> ou <span className="h-px flex-1 bg-rule" />
      </div>
      <Button variant="secondary" size="lg" onClick={open} loading={loading}>
        <Presentation className="size-4" aria-hidden /> Ver demonstração
      </Button>
      <p className="text-center text-[12.5px] text-muted">Uma conta com dados fictícios, sem cadastro. Ela é apagada quando você sai.</p>
      {error && <p className="text-center text-[12.5px] text-danger">{error}</p>}
    </div>
  );
}

const codeSchema = z.object({ code: z.string().trim().min(1, "Informe o código.") });

/** Second step when two-step verification is on: the code from the app, or a recovery code. */
function CodeStep({ ticket, onDone, onExpired, onBack }) {
  const { loginWithCode } = useAuth();
  const [useRecovery, setUseRecovery] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(codeSchema), defaultValues: { code: "" } });

  async function onSubmit({ code }) {
    try {
      await loginWithCode(ticket, code);
      onDone();
    } catch (error) {
      if (error.code === "TWO_FACTOR_EXPIRED") onExpired(error.message);
      else setError("code", { message: error.fields?.code ?? error.message });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 flex flex-col gap-5">
      <AuthNotice tone="mail">
        {useRecovery ? "Digite um dos códigos de recuperação que você guardou. Cada um funciona uma vez só." : "Abra o app autenticador no celular e digite o código de 6 dígitos do Routine."}
      </AuthNotice>
      <Field label={useRecovery ? "Código de recuperação" : "Código do app"} error={errors.code?.message}>
        {(a11y) =>
          useRecovery ? (
            <Input key="recovery" {...a11y} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="abcde-fghjk" autoFocus {...register("code")} />
          ) : (
            <Input
              key="app"
              {...a11y}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              placeholder="123456"
              className="text-center font-mono text-lg tracking-[0.3em]"
              autoFocus
              {...register("code")}
            />
          )
        }
      </Field>
      <Button type="submit" size="lg" loading={isSubmitting} className="group justify-between">
        Entrar
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
      </Button>
      <div className="flex flex-wrap justify-between gap-2 text-[13px]">
        <button type="button" onClick={onBack} className="font-[540] text-muted hover:text-ink">
          Voltar
        </button>
        <button
          type="button"
          onClick={() => {
            setUseRecovery((v) => !v);
            setValue("code", "");
          }}
          className="font-[540] text-accent-text hover:underline"
        >
          {useRecovery ? "Usar o código do app" : "Perdi o celular: usar código de recuperação"}
        </button>
      </div>
    </form>
  );
}

export function LoginPage() {
  const { status, login, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const options = useApi("/auth/options");
  const [formError, setFormError] = useState(null);
  const [unverified, setUnverified] = useState(null);
  const [pending, setPending] = useState(null);
  const [ticket, setTicket] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: location.state?.email ?? "", password: "" } });

  if (status === "authenticated") return <Navigate to={location.state?.from ?? "/hoje"} replace />;

  const goIn = () => navigate(location.state?.from ?? "/hoje", { replace: true });

  async function onSubmit({ email, password }) {
    setFormError(null);
    setUnverified(null);
    setPending(null);
    try {
      const result = await login(email, password);
      if (result.twoFactorRequired) setTicket(result.ticket);
      else goIn();
    } catch (error) {
      if (error.code === "EMAIL_NOT_VERIFIED") setUnverified(email.trim().toLowerCase());
      else if (error.code === "ACCOUNT_PENDING") setPending(error.message);
      else setFormError(error.message);
    }
  }

  if (ticket) {
    return (
      <AuthShell eyebrow="verificação em duas etapas" title="Digite o código">
        <CodeStep
          ticket={ticket}
          onDone={goIn}
          onExpired={(message) => {
            setTicket(null);
            setFormError(message);
          }}
          onBack={() => setTicket(null)}
        />
      </AuthShell>
    );
  }

  const notice = location.state?.notice;

  return (
    <AuthShell eyebrow="sua conta" title="Entrar">
      {unverified ? (
        <NotVerified email={unverified} />
      ) : pending ? (
        <AuthNotice tone="warn">{pending}</AuthNotice>
      ) : formError ? (
        <AuthNotice>{formError}</AuthNotice>
      ) : notice ? (
        <AuthNotice tone="ok">{notice}</AuthNotice>
      ) : (
        sessionExpired && <AuthNotice tone="warn">Sua sessão expirou. Entre novamente para continuar.</AuthNotice>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 flex flex-col gap-5">
        <Field label="E-mail" error={errors.email?.message}>
          {(a11y) => <Input {...a11y} type="email" autoComplete="username" autoFocus {...register("email")} />}
        </Field>
        <div className="flex flex-col gap-1.5">
          <Field label="Senha" error={errors.password?.message}>
            {(a11y) => <PasswordInput {...a11y} autoComplete="current-password" {...register("password")} />}
          </Field>
          <Link to="/esqueci-senha" className="self-end text-[13px] font-[540] text-accent-text hover:underline">
            Esqueci minha senha
          </Link>
        </div>
        <Button type="submit" size="lg" loading={isSubmitting} className="group mt-2 justify-between">
          Entrar
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
        </Button>
      </form>

      {options.data?.demoEnabled && <DemoEntry />}

      {options.data?.signupEnabled && (
        <AuthFooter>
          Ainda não tem conta?{" "}
          <Link to="/criar-conta" className={authLink}>
            Criar conta
          </Link>
        </AuthFooter>
      )}
    </AuthShell>
  );
}
