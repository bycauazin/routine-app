import { ArrowRight, ArrowUp, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { useAuth } from "@/auth/AuthProvider";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { GridLink } from "@/components/layout/GridLink";
import { cn } from "@/lib/cn";
import { btnPrimary, PORTFOLIO, SOCIALS, WHATSAPP, YEAR } from "./public-links";

const SECTIONS = [
  ["/#planilha", "Da planilha"],
  ["/#recursos", "Recursos"],
  ["/#como-funciona", "Como funciona"],
  ["/#seguranca", "Segurança"],
  ["/contato", "Contato"],
];

export function Logo({ className }) {
  return <img src="/logo.svg" alt="" className={cn("size-8 rounded-[9px]", className)} />;
}

/** "Criar conta" for visitors, "Abrir o Routine" when signed in. compact: smaller on phones. */
export function StartButton({ className, label, compact }) {
  const { status } = useAuth();
  const signedIn = status === "authenticated";
  return (
    <GridLink to={signedIn ? "/hoje" : "/criar-conta"} className={cn(btnPrimary, compact ? "h-11 text-[14px] sm:h-12 sm:text-[14.5px]" : "h-12 text-[14.5px]", className)}>
      {signedIn ? "Abrir o Routine" : (label ?? "Criar minha conta")}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </GridLink>
  );
}

/** Floating pill header: transparent over the hero, with a background after a little scroll. */
export function PublicHeader() {
  const { status } = useAuth();
  const signedIn = status === "authenticated";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const close = () => setOpen(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5">
      <div
        data-calm
        className={cn(
          "mx-auto flex h-14 max-w-[1180px] items-center gap-4 rounded-full border px-2.5 pl-3 text-ink transition-[background,border-color,box-shadow] duration-300",
          scrolled || open ? "border-rule bg-paper/95 shadow-lg backdrop-blur" : "border-transparent",
        )}
      >
        <Link to="/" className="flex items-center gap-2.5 text-[16px] font-[680] tracking-[-0.02em]" aria-label="Routine — início">
          <Logo />
          Routine
        </Link>
        <nav aria-label="Seções" className="mx-auto hidden items-center gap-0.5 rounded-full border border-rule bg-paper/80 p-1 text-[13.5px] md:flex">
          {SECTIONS.map(([to, label]) => (
            <Link
              key={to}
              to={to}
              className={cn("rounded-full px-3.5 py-1.5 text-muted transition-colors hover:bg-sunk hover:text-ink", pathname === to && "bg-selected text-ink")}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5 md:ml-0">
          <ThemeToggle className="size-10" />
          <GridLink to={signedIn ? "/hoje" : "/login"} className={cn(btnPrimary, "h-10 px-4 text-[13.5px]")}>
            {signedIn ? "Abrir" : "Entrar"}
          </GridLink>
          <button
            type="button"
            className="grid size-10 place-items-center rounded-full hover:bg-sunk md:hidden"
            aria-expanded={open}
            aria-controls="public-menu"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="public-menu"
          aria-label="Seções"
          className="mx-auto mt-2 flex max-w-[1180px] animate-[fade-up_240ms_ease] flex-col rounded-[22px] border border-rule bg-paper p-2 text-ink shadow-lg md:hidden"
        >
          {SECTIONS.map(([to, label]) => (
            <Link key={to} to={to} onClick={close} className="rounded-[14px] px-4 py-3 text-[15px] hover:bg-sunk">
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-rule">
      <div className="mx-auto grid max-w-[1180px] gap-8 px-5 py-12 sm:grid-cols-[1.4fr_1fr_1fr] sm:px-8">
        <div>
          <Link to="/" className="flex items-center gap-2.5 text-[16px] font-[680]">
            <Logo /> Routine
          </Link>
          <p className="mt-3 max-w-xs text-[13.5px] leading-relaxed text-muted">A semana que vivia numa planilha, agora no celular: o que fazer hoje, a que horas, e o que já foi feito.</p>
        </div>
        <div className="hidden flex-col gap-2 text-[13.5px] sm:flex">
          <p className="mb-1 text-[12px] font-[600] text-faint">Produto</p>
          {SECTIONS.slice(0, 4).map(([to, label]) => (
            <Link key={to} to={to} className="w-fit text-ink-2 hover:text-accent-text">
              {label}
            </Link>
          ))}
        </div>
        <div className="flex flex-col gap-2 text-[13.5px]">
          <p className="mb-1 text-[12px] font-[600] text-faint">Contato</p>
          <GridLink to="/contato" className="w-fit text-ink-2 hover:text-accent-text">
            Fale comigo
          </GridLink>
          {SOCIALS.map(([label, href]) => (
            <a key={label} href={href} target="_blank" rel="noreferrer" className="w-fit text-ink-2 hover:text-accent-text">
              {label}
            </a>
          ))}
        </div>
      </div>
      <div className="mx-auto flex max-w-[1180px] flex-col gap-2 border-t border-rule px-5 py-5 text-[12.5px] text-muted sm:flex-row sm:justify-between sm:px-8">
        <span>
          © {YEAR} Cauã ·{" "}
          <a href={PORTFOLIO} target="_blank" rel="noreferrer" className="font-[560] text-ink-2 hover:text-accent-text">
            bycauazin
          </a>
        </span>
        <span>React · Node.js · PostgreSQL</span>
      </div>
    </footer>
  );
}

function WhatsAppGlyph({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm0 18.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 4.54 0 8.24 3.7 8.24 8.24 0 4.55-3.7 8.24-8.24 8.24Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.22-.16-.47-.29Z" />
    </svg>
  );
}

/** Floating WhatsApp (always) and "back to top" (after some scroll). */
export function FloatingActions() {
  const [showTop, setShowTop] = useState(false);
  const ticking = useRef(false);
  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        setShowTop(window.scrollY > window.innerHeight * 0.9);
        ticking.current = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-2.5 sm:right-6 sm:bottom-6">
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Voltar ao topo"
        title="Voltar ao topo"
        className={cn(
          "grid size-11 place-items-center rounded-full border border-rule bg-ink text-bg shadow-lg transition-[opacity,transform] duration-300 hover:-translate-y-0.5",
          showTop ? "opacity-100" : "pointer-events-none translate-y-3 opacity-0",
        )}
        tabIndex={showTop ? 0 : -1}
      >
        <ArrowUp className="size-[18px]" aria-hidden />
      </button>
      <a
        href={WHATSAPP}
        target="_blank"
        rel="noreferrer"
        aria-label="Falar com o Cauã pelo WhatsApp"
        title="Falar pelo WhatsApp"
        className="flex h-[50px] items-center gap-2 rounded-full bg-whatsapp px-4 text-[12.5px] font-[700] text-whatsapp-ink shadow-lg transition-[transform,filter] duration-200 hover:-translate-y-0.5 hover:brightness-105 max-sm:w-[50px] max-sm:justify-center max-sm:px-0"
      >
        <WhatsAppGlyph className="size-6" />
        <span className="max-sm:hidden">WhatsApp</span>
      </a>
    </div>
  );
}
