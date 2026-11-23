import { AlertCircle, ArrowLeft, CircleCheck, MailCheck } from "lucide-react";
import { Link } from "react-router";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { cn } from "@/lib/cn";
import { useTheme } from "@/lib/theme";
import { TodayMock } from "@/pages/landing/mocks";
import "@/pages/landing/landing.css";

const YEAR = new Date().getFullYear();

/**
 * Frame of the signed-out screens (entrar, criar conta, senha, links do
 * e-mail): one centered card over the creme page with the faint week-sheet
 * lines, and the Hoje screen resting behind it on wide screens.
 */
export function AuthShell({ eyebrow, title, children }) {
  useTheme();
  return (
    <div className="sheet-lines relative isolate flex min-h-dvh flex-col overflow-hidden bg-bg text-ink">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <TodayMock className="absolute top-[12%] right-[-60px] hidden rotate-[8deg] opacity-40 blur-[1.5px] lg:block xl:right-[6%]" />
        <span className="absolute inset-0 bg-[radial-gradient(60%_70%_at_50%_45%,var(--bg)_35%,transparent)]" />
      </div>

      <header className="flex items-center justify-between px-5 pt-5 sm:px-8">
        <Link to="/" aria-label="Routine — início" className="flex items-center gap-2.5 text-[16px] font-[680] tracking-[-0.02em]">
          <img src="/logo.svg" alt="" className="size-8 rounded-[9px]" />
          Routine
        </Link>
        <ThemeToggle className="size-10" />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-[420px] animate-[fade-up_520ms_cubic-bezier(.2,.8,.2,1)]">
          <div className="rounded-[26px] border border-rule bg-paper px-6 py-8 text-ink shadow-lg sm:px-9 sm:py-10">
            <Link to="/" className="group mb-7 inline-flex w-fit items-center gap-1.5 text-[13.5px] font-[540] text-muted transition-colors hover:text-accent-text">
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />
              Voltar para o início
            </Link>
            {eyebrow && <p className="label mb-2">{eyebrow}</p>}
            <h1 className="display text-[28px]">{title}</h1>
            {children}
          </div>
          <p className="mt-6 text-center text-[12.5px] text-muted">© {YEAR} Cauã · bycauazin</p>
        </div>
      </main>
    </div>
  );
}

const NOTICE = {
  error: { icon: AlertCircle, className: "bg-danger-soft text-danger", role: "alert" },
  warn: { icon: AlertCircle, className: "bg-warn-soft text-warn", role: "status" },
  ok: { icon: CircleCheck, className: "bg-done-soft text-done", role: "status" },
  mail: { icon: MailCheck, className: "bg-accent-soft text-accent-text", role: "status" },
};

/** Message box of the signed-out screens. */
export function AuthNotice({ tone = "error", className, children }) {
  const n = NOTICE[tone];
  return (
    <div role={n.role} className={cn("mt-6 flex items-start gap-2 rounded-md px-3 py-2.5 text-sm", n.className, className)}>
      <n.icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Small link line under a form ("Já tem conta? Entrar"). */
export function AuthFooter({ children }) {
  return <p className="mt-8 text-[13.5px] text-muted">{children}</p>;
}

export const authLink = "font-[560] text-accent-text hover:underline";
