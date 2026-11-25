import { ArrowRight, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { useAuth } from "@/auth/AuthProvider";
import { GridLink } from "@/components/layout/GridLink";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { cn } from "@/lib/cn";
import { btnPrimary, PORTFOLIO, SOCIALS, WHATSAPP, YEAR } from "./public-links";

const SECTIONS = [
  ["/#como-funciona", "Como funciona"],
  ["/#recursos", "O que cadastrar"],
  ["/#relatorios", "Relatórios"],
  ["/#seus-dados", "Seus dados"],
];

export function Logo({ className }) {
  return <img src="/logo.svg" alt="" className={cn("size-8 rounded-[9px]", className)} />;
}

/** "Entrar" for visitors, "Abrir o Routine" when signed in. */
export function StartButton({ className, label, compact }) {
  const { status } = useAuth();
  const signedIn = status === "authenticated";
  return (
    <GridLink to={signedIn ? "/hoje" : "/login"} className={cn(btnPrimary, compact ? "h-11 px-4 text-[14px] sm:h-12 sm:px-5 sm:text-[14.5px]" : "h-12 text-[14.5px]", className)}>
      {signedIn ? "Abrir o Routine" : (label ?? "Entrar")}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </GridLink>
  );
}

/** A plain top bar: transparent over the hero, with the page color and a line after a little scroll. */
export function PublicHeader() {
  const { status } = useAuth();
  const signedIn = status === "authenticated";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const close = () => setOpen(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={cn("fixed inset-x-0 top-0 z-40 border-b transition-[background-color,border-color] duration-300", scrolled || open ? "border-rule bg-bg/95 backdrop-blur" : "border-transparent")}>
      <div data-calm className="mx-auto flex h-16 max-w-[1180px] items-center gap-8 px-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5 text-[16px] font-[680] tracking-[-0.02em]" aria-label="Routine — início">
          <Logo />
          Routine
        </Link>
        <nav aria-label="Seções" className="hidden items-center gap-6 text-[14px] md:flex">
          {SECTIONS.map(([to, label]) => (
            <Link key={to} to={to} className="text-muted transition-colors hover:text-ink">
              {label}
            </Link>
          ))}
          <GridLink to="/contato" className={cn("text-muted transition-colors hover:text-ink", pathname === "/contato" && "font-[600] text-ink")}>
            Contato
          </GridLink>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle className="size-9" />
          {signedIn ? (
            <GridLink to="/hoje" className={cn(btnPrimary, "h-10 px-4 text-[13.5px]")}>
              Abrir o app
            </GridLink>
          ) : (
            <>
              <GridLink to="/criar-conta" className="hidden px-2 text-[14px] font-[580] transition-colors hover:text-accent-text sm:inline">
                Criar conta
              </GridLink>
              <GridLink to="/login" className={cn(btnPrimary, "h-10 px-4 text-[13.5px]")}>
                Entrar
              </GridLink>
            </>
          )}
          <button
            type="button"
            className="grid size-10 place-items-center rounded-[10px] hover:bg-sunk md:hidden"
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
        <nav id="public-menu" aria-label="Seções" className="flex animate-[fade-up_200ms_ease] flex-col border-t border-rule px-5 pb-3 md:hidden">
          {SECTIONS.map(([to, label]) => (
            <Link key={to} to={to} onClick={close} className="border-b border-rule py-3.5 text-[15px]">
              {label}
            </Link>
          ))}
          <GridLink to="/contato" onClick={close} className="border-b border-rule py-3.5 text-[15px]">
            Contato
          </GridLink>
          {!signedIn && (
            <GridLink to="/criar-conta" onClick={close} className="py-3.5 text-[15px] font-[600] sm:hidden">
              Criar conta
            </GridLink>
          )}
        </nav>
      )}
    </header>
  );
}

/** One line: the brand, the links, the signature. */
export function PublicFooter() {
  return (
    <footer className="border-t border-rule">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-5 px-5 py-9 text-[13.5px] sm:px-8 md:flex-row md:items-center md:justify-between">
        <Link to="/" className="flex items-center gap-2.5 font-[680]">
          <Logo className="size-7" /> Routine
        </Link>
        <nav aria-label="Rodapé" className="flex flex-wrap gap-x-5 gap-y-2 text-ink-2">
          <GridLink to="/contato" className="hover:text-accent-text">
            Contato
          </GridLink>
          {SOCIALS.map(([label, href]) => (
            <a key={label} href={href} target="_blank" rel="noreferrer" className="hover:text-accent-text">
              {label}
            </a>
          ))}
        </nav>
        <p className="text-muted">
          © {YEAR} ·{" "}
          <a href={PORTFOLIO} target="_blank" rel="noreferrer" className="font-[600] text-ink-2 hover:text-accent-text">
            bycauazin
          </a>
        </p>
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

/** A small round WhatsApp button in the corner. */
export function FloatingActions() {
  return (
    <a
      href={WHATSAPP}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar com o Cauã pelo WhatsApp"
      title="Falar pelo WhatsApp"
      className="fixed right-4 bottom-4 z-40 grid size-12 place-items-center rounded-full bg-whatsapp text-whatsapp-ink shadow-lg transition-transform duration-200 hover:-translate-y-0.5 sm:right-6 sm:bottom-6"
    >
      <WhatsAppGlyph className="size-6" />
    </a>
  );
}
