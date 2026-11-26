import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

/**
 * Modal built on the native <dialog>: focus trapping, Esc to close and
 * inert background come from the browser. Renders as a bottom sheet on
 * small screens and a centered panel from `sm` up.
 */
export function Dialog({ open, onClose, title, description, children, footer, size = "md" }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // showModal focuses the first focusable element (the close button);
      // start on the first form field instead.
      dialog.querySelector("form input:not([type=hidden]), form select, form textarea")?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Phones (same as Cacau): keep the bottom sheet above the on-screen keyboard. iOS does not
  // resize the page for the keyboard, so the sheet follows the visual viewport: lifted by the
  // covered height (--kb) and fitting the visible height (--vvh). The focused field is
  // scrolled into view inside the sheet once the keyboard is up.
  useEffect(() => {
    const dialog = ref.current;
    const vv = window.visualViewport;
    if (!open || !dialog || !vv) return undefined;
    const small = window.matchMedia("(max-width: 639px)");
    const fit = () => {
      if (!small.matches) {
        dialog.style.removeProperty("--kb");
        dialog.style.removeProperty("--vvh");
        return;
      }
      const covered = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      dialog.style.setProperty("--kb", `${covered}px`);
      dialog.style.setProperty("--vvh", `${Math.round(vv.height)}px`);
    };
    let timer = 0;
    const onFocus = (e) => {
      if (!small.matches || !e.target.matches?.("input, select, textarea")) return;
      clearTimeout(timer);
      timer = setTimeout(() => e.target.scrollIntoView({ block: "nearest" }), 320);
    };
    fit();
    vv.addEventListener("resize", fit);
    vv.addEventListener("scroll", fit);
    dialog.addEventListener("focusin", onFocus);
    return () => {
      clearTimeout(timer);
      vv.removeEventListener("resize", fit);
      vv.removeEventListener("scroll", fit);
      dialog.removeEventListener("focusin", onFocus);
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // backdrop click
      }}
      aria-labelledby="dialog-title"
      className={cn(
        "m-0 mt-auto mb-[var(--kb,0px)] w-full max-w-none rounded-t-[18px] border border-rule bg-paper text-ink shadow-lg backdrop:bg-overlay backdrop:backdrop-blur-[3px]",
        "sm:m-auto sm:rounded-lg",
        size === "sm" ? "sm:max-w-md" : "sm:max-w-xl",
        "max-h-[calc(var(--vvh,100dvh)*0.92)] open:animate-[dialog-in_240ms_cubic-bezier(.2,.8,.2,1)]",
      )}
    >
      {open && (
        <div className="flex max-h-[calc(var(--vvh,100dvh)*0.92)] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-rule px-4 py-3 sm:px-6 sm:py-4">
            <div>
              <h2 id="dialog-title" className="display text-[18px]">
                {title}
              </h2>
              {description && <p className="mt-0.5 text-[13px] text-muted sm:text-sm">{description}</p>}
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Fechar">
              <X className="size-4" />
            </Button>
          </header>
          <div className="overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">{children}</div>
          {footer && (
            <footer className="flex gap-2 border-t border-rule bg-sunk/40 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] *:flex-1 sm:justify-end sm:px-6 sm:py-4 sm:*:flex-none">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  );
}

/** Confirmation for destructive actions. */
export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = "Excluir", loading }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted">{description}</p>
    </Dialog>
  );
}
