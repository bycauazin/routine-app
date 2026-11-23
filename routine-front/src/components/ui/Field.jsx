import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";

export const controlClass = cn(
  "w-full h-10 rounded-sm border border-rule-strong bg-paper-2 px-3 text-sm text-ink",
  "placeholder:text-faint transition-[border-color,box-shadow] duration-200",
  "hover:border-muted focus:outline-none focus:border-accent-text focus:shadow-[0_0_0_3px_var(--accent-soft)]",
  "disabled:opacity-60 disabled:cursor-not-allowed",
  "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:shadow-[0_0_0_3px_var(--danger-soft)]",
);

/**
 * Label + control + hint/error, wired with ids for screen readers.
 * `children` is a render function receiving the a11y props for the control.
 * @param {{ label: string, error?: string, hint?: string, optional?: boolean, className?: string, children: (props: object) => React.ReactNode }} props
 */
export function Field({ label, error, hint, optional, className, children }) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[13px] font-[560] text-ink">
        {label}
        {optional && <span className="ml-1.5 font-normal text-faint">(opcional)</span>}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }) {
  return <input className={cn(controlClass, className)} {...props} />;
}

/** Password field with an eye button to show or hide what was typed. */
export function PasswordInput({ className, ...props }) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={cn(controlClass, "pr-11", className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Esconder senha" : "Mostrar senha"}
        aria-pressed={visible}
        title={visible ? "Esconder senha" : "Mostrar senha"}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-sm text-faint transition-colors hover:text-ink focus-visible:text-accent-text focus-visible:outline-none"
      >
        <Icon className="size-[18px]" aria-hidden />
      </button>
    </div>
  );
}

export function Select({ className, children, ...props }) {
  return (
    <select className={cn(controlClass, "appearance-none bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-9 select-chevron", className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }) {
  return <textarea className={cn(controlClass, "h-auto min-h-20 py-2.5", className)} {...props} />;
}
