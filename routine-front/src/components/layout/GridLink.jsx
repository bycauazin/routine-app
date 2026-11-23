import { Link, useNavigate } from "react-router";
import { withGridTransition } from "@/lib/grid-transition";

/**
 * A Link that changes page behind the "Grade da semana" transition. Opening
 * in a new tab (Ctrl/⌘ click, middle click) keeps the normal behavior.
 */
export function GridLink({ to, onClick, ...props }) {
  const navigate = useNavigate();
  return (
    <Link
      to={to}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        withGridTransition(() => navigate(to));
      }}
      {...props}
    />
  );
}
