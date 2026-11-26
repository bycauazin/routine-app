import { Send, Unlink } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Layout";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";

/**
 * Configurações → Telegram (stage 7): connect the bot with a one-time link,
 * see which chat is connected, disconnect.
 */
export function TelegramSettings() {
  const toast = useToast();
  const { data, error, loading, reload } = useApi("/telegram");
  const [busy, setBusy] = useState(false);

  async function connect() {
    setBusy(true);
    try {
      const { data: link } = await api("/telegram/link", { method: "POST" });
      window.open(link.url, "_blank", "noopener");
      toast.success(`Abra o Telegram e toque em Começar. O link vale ${link.expiresInMinutes} minutos.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      await api("/telegram/link", { method: "DELETE" });
      toast.success("Telegram desconectado.");
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Telegram" />
      <div className="grid gap-4 px-4 py-4 sm:px-5">
        {error && !data && <ErrorState error={error} onRetry={reload} />}
        {loading && !data && <Skeleton className="h-20" />}
        {data && !data.enabled && (
          <p className="text-[14px] text-muted">
            O bot ainda não está configurado neste servidor. Crie um bot no <b>@BotFather</b> e coloque <code>TELEGRAM_BOT_TOKEN</code> e <code>TELEGRAM_BOT_USERNAME</code> no .env do back.
          </p>
        )}
        {data?.enabled && !data.linked && (
          <>
            <p className="text-[14px] text-muted">
              Com o bot você anota tarefas (“anotar comprar pão amanhã”), marca o que fez (“fiz treino”), registra imprevistos (“freelance sábado 14h às 21h”) e água (“bebi 500”), e recebe o resumo do dia na hora do Acordar. Toque em Conectar, abra o <b>@{data.botUsername}</b> e toque em <b>Começar</b>.
            </p>
            <Button className="justify-self-start" onClick={connect} loading={busy}>
              <Send className="size-4" aria-hidden /> Conectar
            </Button>
            <Button variant="ghost" size="sm" className="justify-self-start" onClick={reload}>Já toquei em Começar</Button>
          </>
        )}
        {data?.enabled && data.linked && (
          <>
            <p className="text-[14px]">
              Conectado {data.username ? <>como <b>@{data.username}</b></> : null} ao <b>@{data.botUsername}</b>.
            </p>
            <Button variant="secondary" className="justify-self-start" onClick={disconnect} loading={busy}>
              <Unlink className="size-4" aria-hidden /> Desconectar
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
