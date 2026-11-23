import { CircleHelp } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * "?" beside a title. The explanation stays closed so the screen stays short
 * (mobile first); one tap opens it, another closes it.
 */
export function HelpButton({ open, onClick, about }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={open ? `Fechar explicação de ${about}` : `O que é ${about}?`}
      className={cn("grid size-7 shrink-0 place-items-center rounded-full transition-colors hover:bg-sunk", open ? "text-accent-text" : "text-faint hover:text-accent-text")}
    >
      <CircleHelp className="size-[17px]" aria-hidden />
    </button>
  );
}

export function HelpPanel({ children, className }) {
  return <p className={cn("rounded-[8px] bg-sunk px-3 py-2 text-[13px] leading-snug font-[450] tracking-normal text-ink-2 animate-[fade-up_160ms_ease-out]", className)}>{children}</p>;
}
