import { cn } from "@/lib/cn";

/** Wordmark: the Routine mark (a day with a check) + "Routine", signed bycauazin. */
export function Brand({ className, signature = true }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <img src="/logo.svg" alt="" className="size-8 rounded-[9px]" />
      <span className="text-[16.5px] font-[680] tracking-[-0.02em] text-ink">Routine</span>
      {signature && <span className="hidden text-[11px] font-[500] text-faint sm:inline">bycauazin</span>}
    </span>
  );
}
