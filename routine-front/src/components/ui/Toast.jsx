import { X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";

const ToastContext = createContext(null);

const DURATION = { success: 3800, error: 6500 };
const EXIT_MS = 200;

/** Check (or ×) drawn with a stroke animation inside a ring that pops in. */
function ToastMark({ type }) {
  const error = type === "error";
  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full animate-[ring-pop_420ms_cubic-bezier(.34,1.56,.64,1)_both]",
        error ? "bg-danger-soft text-danger" : "bg-done-soft text-done",
      )}
      aria-hidden
    >
      <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {error ? (
          <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" strokeDasharray="24" className="animate-[draw_380ms_200ms_cubic-bezier(.2,.8,.2,1)_both]" />
        ) : (
          <path d="M3.5 8.5l3 3 6-7" strokeDasharray="24" className="animate-[draw_380ms_200ms_cubic-bezier(.2,.8,.2,1)_both]" />
        )}
      </svg>
    </span>
  );
}

/**
 * Success / error feedback ("Tarefa criada", "Salvo"…), announced to
 * screen readers. Pauses while hovered; a thin bar shows the time left.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const timers = useRef(new Map());

  const remove = useCallback((id) => {
    setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), EXIT_MS);
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  const schedule = useCallback((id, ms) => timers.current.set(id, setTimeout(() => remove(id), ms)), [remove]);

  const push = useCallback(
    (type, message) => {
      const id = ++idRef.current;
      setToasts((list) => [...list.slice(-2), { id, type, message, paused: false }]);
      schedule(id, DURATION[type]);
    },
    [schedule],
  );

  // Hover pauses: simplest honest version — restart the full time on leave.
  const pause = (id) => {
    clearTimeout(timers.current.get(id));
    setToasts((list) => list.map((t) => (t.id === id ? { ...t, paused: true } : t)));
  };
  const resume = (t) => {
    setToasts((list) => list.map((x) => (x.id === t.id ? { ...x, paused: false, restart: (x.restart ?? 0) + 1 } : x)));
    schedule(t.id, DURATION[t.type]);
  };

  const toast = useMemo(() => ({ success: (m) => push("success", m), error: (m) => push("error", m) }), [push]);

  return (
    <ToastContext value={toast}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-3 bottom-24 z-[60] flex flex-col items-center gap-2 md:inset-x-auto md:right-6 md:bottom-6 md:items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.type === "error" ? "alert" : "status"}
            onMouseEnter={() => pause(t.id)}
            onMouseLeave={() => resume(t)}
            className={cn(
              "pointer-events-auto relative flex w-full max-w-sm items-center gap-3 overflow-hidden rounded-[12px] border border-rule bg-paper py-3 pr-3 pl-3.5 text-ink shadow-lg",
              t.leaving ? "animate-[toast-out_200ms_ease-in_both]" : "animate-[toast-up_380ms_cubic-bezier(.2,.8,.2,1)_both]",
            )}
          >
            <ToastMark type={t.type} />
            <div className="min-w-0 flex-1">
              <p className={cn("text-[12px] font-[600]", t.type === "error" ? "text-danger" : "text-done")}>{t.type === "error" ? "Não deu certo" : "Feito"}</p>
              <p className="text-[13.5px] leading-snug">{t.message}</p>
            </div>
            <button onClick={() => remove(t.id)} className="grid size-7 shrink-0 place-items-center rounded-full text-faint hover:bg-sunk hover:text-ink" aria-label="Fechar aviso">
              <X className="size-4" />
            </button>
            {/* time left */}
            <span
              key={t.restart ?? 0}
              className={cn("absolute bottom-0 left-0 h-[2px] w-full origin-left", t.type === "error" ? "bg-danger/60" : "bg-accent-text/70")}
              style={{ animation: `drain ${DURATION[t.type]}ms linear both`, animationPlayState: t.paused ? "paused" : "running" }}
              aria-hidden
            />
          </div>
        ))}
      </div>
    </ToastContext>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
