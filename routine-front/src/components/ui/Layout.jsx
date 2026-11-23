import { useState } from "react";
import { cn } from "@/lib/cn";
import { HelpButton, HelpPanel } from "./Help";

/**
 * Page title + optional actions. The explanation (`description`) stays behind
 * a "?" beside the title, so pages open with no subtitle text.
 */
export function PageHeader({ eyebrow, title, description, actions }) {
  const [showHelp, setShowHelp] = useState(false);
  return (
    <header className="flex flex-col gap-3 pb-1">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="label mb-0.5">{eyebrow}</p>}
          <h1 className="flex items-center gap-1.5 text-[22px] font-[640] tracking-[-0.02em] md:text-[26px]">
            {title}
            {description && <HelpButton open={showHelp} onClick={() => setShowHelp((v) => !v)} about={title} />}
          </h1>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
      {description && showHelp && <HelpPanel className="max-w-xl">{description}</HelpPanel>}
    </header>
  );
}

export function Card({ className, children, ...props }) {
  return (
    <section className={cn("sheet overflow-hidden", className)} {...props}>
      {children}
    </section>
  );
}

export function CardHeader({ title, description, actions, className }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-rule px-5 py-4", className)}>
      <div>
        <h2 className="text-[15px] font-[620]">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

const BADGE_TONES = {
  neutral: "text-muted bg-sunk",
  accent: "text-accent-text bg-accent-soft",
  positive: "text-done bg-done-soft",
  negative: "text-danger bg-danger-soft",
  warning: "text-warn bg-warn-soft",
};

export function Badge({ tone = "neutral", className, children }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-[600] whitespace-nowrap", BADGE_TONES[tone], className)}>
      {children}
    </span>
  );
}

/** Key figure. */
export function Stat({ label, value, hint, tone, className }) {
  return (
    <div className={cn("sheet flex flex-col gap-2 px-5 py-4", className)}>
      <p className="label">{label}</p>
      <p className={cn("display text-[26px]", tone === "positive" && "text-done", tone === "negative" && "text-danger")}>{value}</p>
      {hint && <p className="text-[13px] text-muted">{hint}</p>}
    </div>
  );
}
