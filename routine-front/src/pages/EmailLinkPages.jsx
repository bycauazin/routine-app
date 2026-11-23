import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@/auth/AuthProvider";
import { AuthFooter, AuthNotice, AuthShell, authLink } from "@/components/layout/AuthShell";
import { Spinner } from "@/components/ui/States";
import { api } from "@/lib/api";
import { clearLinkToken, readLinkToken } from "@/lib/link-token";

/**
 * Sends the token of an e-mail link to the API once (the link works only
 * once, so a second call would fail). status: "working" | "done" | "error".
 */
function useLinkAction(path) {
  const [token] = useState(readLinkToken);
  const [state, setState] = useState(() => (token ? { status: "working" } : { status: "error", message: "Este link está incompleto. Abra o link do e-mail de novo." }));
  const sent = useRef(false);

  useEffect(() => {
    clearLinkToken();
    if (!token || sent.current) return;
    sent.current = true;
    api(path, { method: "POST", body: { token } })
      .then((res) => setState({ status: "done", data: res?.data }))
      .catch((error) => setState({ status: "error", message: error.message }));
  }, [path, token]);

  return state;
}

/** "Confirmar e-mail": opened from the sign-up e-mail. */
export function VerifyEmailPage() {
  const state = useLinkAction("/auth/verify-email");
  return (
    <AuthShell eyebrow="nova conta" title={state.status === "done" ? "E-mail confirmado" : "Confirmar e-mail"}>
      {state.status === "working" && <Spinner className="mt-8" label="Confirmando…" />}
      {state.status === "done" && (
        <>
          {state.data?.pendingApproval ? (
            <AuthNotice tone="ok">E-mail confirmado! Agora sua conta passa por uma liberação. Você recebe um e-mail assim que ela for aprovada.</AuthNotice>
          ) : (
            <>
              <AuthNotice tone="ok">Tudo certo! Sua conta está ativa.</AuthNotice>
              <Link to="/login" className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-accent px-5 text-[14.5px] font-[560] text-accent-ink hover:bg-accent-hover active:bg-accent-active">
                Entrar
              </Link>
            </>
          )}
        </>
      )}
      {state.status === "error" && (
        <>
          <AuthNotice>{state.message}</AuthNotice>
          <AuthFooter>
            Para receber outro link, tente{" "}
            <Link to="/login" className={authLink}>
              entrar
            </Link>{" "}
            com seu e-mail e senha.
          </AuthFooter>
        </>
      )}
    </AuthShell>
  );
}

/** "Confirmar novo e-mail": opened from the e-mail sent to the new address. */
export function ConfirmEmailChangePage() {
  const state = useLinkAction("/auth/confirm-email-change");
  const { status, setUser } = useAuth();

  // Signed in on this browser: show the new e-mail right away.
  useEffect(() => {
    if (state.status !== "done" || status !== "authenticated") return;
    api("/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => {});
  }, [state.status, status, setUser]);

  const next = status === "authenticated" ? { to: "/configuracoes/perfil", label: "Voltar para o app" } : { to: "/login", label: "Entrar" };

  return (
    <AuthShell eyebrow="e-mail" title={state.status === "done" ? "E-mail alterado" : "Confirmar novo e-mail"}>
      {state.status === "working" && <Spinner className="mt-8" label="Confirmando…" />}
      {state.status === "done" && (
        <>
          <AuthNotice tone="ok">Pronto! A partir de agora, entre com o novo e-mail.</AuthNotice>
          <Link to={next.to} className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-accent px-5 text-[14.5px] font-[560] text-accent-ink hover:bg-accent-hover active:bg-accent-active">
            {next.label}
          </Link>
        </>
      )}
      {state.status === "error" && (
        <>
          <AuthNotice>{state.message}</AuthNotice>
          <AuthFooter>
            Peça a troca de novo em{" "}
            <Link to="/configuracoes/perfil" className={authLink}>
              Configurações → Perfil
            </Link>
            .
          </AuthFooter>
        </>
      )}
    </AuthShell>
  );
}
