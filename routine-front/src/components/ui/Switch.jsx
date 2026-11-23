import { cn } from "@/lib/cn";

/** Accessible on/off switch (button with role="switch"). */
export function Switch({ checked, onChange, label, disabled, className }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-200",
        checked ? "border-accent bg-accent" : "border-rule-strong bg-sunk",
        "disabled:opacity-50",
        className,
      )}
    >
      <span
        className={cn(
          "inline-block size-3.5 rounded-full transition-transform duration-200 ease-out-soft",
          checked ? "translate-x-[18px] bg-accent-ink" : "translate-x-[2px] bg-muted",
        )}
      />
    </button>
  );
}
