import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

/** Placeholder while loading: a calm pulse. */
export function Skeleton({ className }) {
  return <div className={cn("rounded-[10px] bg-rule animate-[skeleton-pulse_1.6s_ease-in-out_infinite]", className)} aria-hidden />;
}

export function Spinner({ label = "Carregando…", className }) {
  return (
    <div role="status" className={cn("flex items-center gap-2 text-sm text-muted", className)}>
      <Loader2 className="size-4 animate-spin" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

/** Empty list: explains what goes here and offers the next action. */
export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn("sheet flex flex-col items-center gap-3 border-dashed px-6 py-12 text-center", className)}>
      {Icon && (
        <div className="grid size-11 place-items-center rounded-full bg-sunk text-muted" aria-hidden>
          <Icon className="size-5" />
        </div>
      )}
      <div className="max-w-sm">
        <h3 className="text-[16px] font-[600]">{title}</h3>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Load error with a retry button. Shows the API's safe message. */
export function ErrorState({ error, onRetry, className }) {
  return (
    <div role="alert" className={cn("flex flex-col items-center gap-3 border border-danger/30 bg-danger-soft px-6 py-10 text-center", className)}>
      <AlertTriangle className="size-6 text-danger" aria-hidden />
      <div>
        <h3 className="text-base">Não foi possível carregar</h3>
        <p className="mt-1 text-sm text-muted">{error?.message ?? "Erro inesperado."}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
