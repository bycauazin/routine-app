import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { ripple } from "@/lib/ripple";

const VARIANTS = {
  primary: "bg-accent text-accent-ink hover:bg-accent-hover active:bg-accent-active",
  accent: "bg-ink text-paper hover:opacity-90 active:translate-y-px",
  secondary: "border border-rule-strong bg-paper text-ink hover:bg-sunk",
  ghost: "text-muted hover:text-ink hover:bg-sunk",
  danger: "bg-danger text-paper hover:opacity-90",
  "danger-ghost": "text-danger hover:bg-danger-soft",
};

const SIZES = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-sm",
  md: "h-10 px-4 text-sm gap-2 rounded-md",
  lg: "h-11 px-5 text-[14.5px] gap-2 rounded-md",
  icon: "h-9 w-9 justify-center rounded-md",
  "icon-sm": "h-8 w-8 justify-center rounded-sm",
};

export function Button({ variant = "primary", size = "md", loading = false, className, children, disabled, type = "button", onPointerDown, ...props }) {
  return (
    <button
      onPointerDown={(e) => {
        ripple(e);
        onPointerDown?.(e);
      }}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "relative inline-flex shrink-0 items-center overflow-hidden font-[560] whitespace-nowrap select-none",
        "transition-[background-color,border-color,color,transform,filter,box-shadow] duration-200 ease-out-soft active:scale-[0.97]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
