import { ArrowUpRight, MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { useTheme } from "@/lib/theme";
import { BrandIcon } from "./landing/brand-icons";
import { FloatingActions, PublicFooter, PublicHeader } from "./landing/public-chrome";
import { btnPrimary, PORTFOLIO, SOCIALS, WHATSAPP } from "./landing/public-links";
import "./landing/landing.css";

const TOPICS = ["Dúvida", "Sugestão", "Problema no app", "Outro assunto"];

const field =
  "w-full rounded-[12px] border border-rule-strong bg-paper px-3.5 py-3 text-[15px] text-ink outline-none transition-[border-color,box-shadow] placeholder:text-faint focus:border-accent-text focus:shadow-[0_0_0_3px_var(--accent-soft)]";

/**
 * "Fale comigo": no server involved — the form writes the message and opens
 * WhatsApp with it, ready to send.
 */
export function ContactPage() {
  useTheme();
  const [topic, setTopic] = useState(TOPICS[0]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (message.trim().length < 5) {
      setError("Escreva sua mensagem (pelo menos algumas palavras).");
      return;
    }
    setError("");
    const text = `Olá, Cauã! ${name.trim() ? `Aqui é ${name.trim()}. ` : ""}[Routine · ${topic}]\n\n${message.trim()}`;
    window.open(`${WHATSAPP}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };

  return (
    <div className="min-h-dvh overflow-x-clip bg-bg text-ink">
      <PublicHeader />
      <main>
        <section className="sheet-lines relative overflow-hidden border-b border-rule">
          <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_80%_at_30%_40%,transparent,var(--bg)_75%)]" aria-hidden />
          <div className="relative mx-auto max-w-[1180px] px-5 pt-32 pb-16 sm:px-8 md:pt-40 md:pb-20">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-rule bg-paper px-3.5 py-1.5 text-[12.5px] font-[560] text-muted">
              <span className="size-1.5 rounded-full bg-accent-text" aria-hidden /> Contato
            </p>
            <h1 className="max-w-[720px] text-[42px] leading-[1.02] font-[680] tracking-[-0.04em] sm:text-[60px]">
              <span className="rise-line" style={{ "--d": "100ms" }}>
                Uma dúvida, uma ideia
              </span>
              <span className="rise-line" style={{ "--d": "220ms" }}>
                ou um problema? <span className="mark-pink">Fale comigo.</span>
              </span>
            </h1>
            <p className="mt-6 max-w-[480px] animate-[fade-up_700ms_ease_400ms_backwards] text-[16.5px] leading-relaxed text-muted">
              Quem responde é o Cauã, que fez o Routine. Normalmente no mesmo dia.
            </p>
          </div>
        </section>

        <section className="mx-auto grid max-w-[1180px] gap-12 px-5 py-16 sm:px-8 md:py-24 lg:grid-cols-[1.25fr_1fr]">
          <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
            <fieldset>
              <legend className="mb-3 text-[13.5px] font-[600]">Sobre o quê?</legend>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map((t) => (
                  <label
                    key={t}
                    className={cn(
                      "cursor-pointer rounded-full border px-4 py-2 text-[14px] transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus-ring",
                      topic === t ? "border-ink bg-ink text-bg" : "border-rule-strong text-ink-2 hover:border-ink",
                    )}
                  >
                    <input type="radio" name="topic" value={t} checked={topic === t} onChange={() => setTopic(t)} className="sr-only" />
                    {t}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="flex flex-col gap-2">
              <span className="text-[13.5px] font-[600]">
                Seu nome <span className="font-[400] text-faint">(opcional)</span>
              </span>
              <input value={name} onChange={(e) => setName(e.target.value)} className={field} autoComplete="given-name" maxLength={60} />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[13.5px] font-[600]">Mensagem</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                maxLength={1500}
                placeholder="Conte o que aconteceu ou o que você gostaria de ver no Routine."
                className={cn(field, "resize-y")}
                aria-invalid={!!error}
                aria-describedby={error ? "contact-error" : undefined}
              />
              {error && (
                <span id="contact-error" role="alert" className="text-[13px] text-danger">
                  {error}
                </span>
              )}
            </label>
            <div className="flex flex-wrap items-center gap-4">
              <button type="submit" className={cn(btnPrimary, "h-12 text-[14.5px]")}>
                <Send className="size-4" aria-hidden /> Enviar pelo WhatsApp
              </button>
              <span className="text-[13px] text-muted">Abre o WhatsApp com a mensagem pronta.</span>
            </div>
          </form>

          <aside className="flex flex-col gap-3">
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-4 rounded-[18px] border border-rule bg-paper p-5 transition-colors hover:border-accent-text"
            >
              <span className="grid size-11 place-items-center rounded-full bg-whatsapp text-whatsapp-ink">
                <MessageCircle className="size-5" aria-hidden />
              </span>
              <span className="flex-1">
                <span className="block text-[16px] font-[600]">WhatsApp</span>
                <span className="block text-[13.5px] text-muted">O jeito mais rápido de falar comigo.</span>
              </span>
              <ArrowUpRight
                className="size-5 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent-text"
                aria-hidden
              />
            </a>
            <ul className="overflow-hidden rounded-[18px] border border-rule bg-paper">
              {SOCIALS.map(([label, href]) => {
                return (
                  <li key={label} className="border-b border-rule last:border-b-0">
                    <a href={href} target="_blank" rel="noreferrer" className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-sunk">
                      <BrandIcon name={label} className="size-5 text-ink-2" />
                      <span className="flex-1 text-[15px]">{label}</span>
                      <ArrowUpRight
                        className="size-4 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent-text"
                        aria-hidden
                      />
                    </a>
                  </li>
                );
              })}
              <li>
                <a href={PORTFOLIO} target="_blank" rel="noreferrer" className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-sunk">
                  <span className="grid size-5 place-items-center rounded-full bg-ink text-[10px] font-[700] text-bg" aria-hidden>
                    C
                  </span>
                  <span className="flex-1 text-[15px]">Portfólio · bycauazin</span>
                  <ArrowUpRight
                    className="size-4 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent-text"
                    aria-hidden
                  />
                </a>
              </li>
            </ul>
          </aside>
        </section>
      </main>
      <PublicFooter />
      <FloatingActions />
    </div>
  );
}
