import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/cn";

/** Sun/moon switch. Follows the system until the user picks one. */
export function ThemeToggle({ className }) {
  const { setPreference } = useTheme();
  const isDark = typeof document !== "undefined" && document.documentElement.dataset.theme === "dark";
  return (
    <button
      type="button"
      onClick={() => setPreference(isDark ? "light" : "dark")}
      aria-label={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      title={isDark ? "Tema claro" : "Tema escuro"}
      className={cn(
        "group relative grid size-9 place-items-center overflow-hidden rounded-full border border-rule-strong text-ink transition-colors hover:border-ink",
        className,
      )}
    >
      <Sun className={cn("absolute size-4 transition-all duration-500 ease-spring", isDark ? "translate-y-0 rotate-0 opacity-100" : "translate-y-6 rotate-90 opacity-0")} aria-hidden />
      <Moon className={cn("absolute size-4 transition-all duration-500 ease-spring", isDark ? "-translate-y-6 -rotate-90 opacity-0" : "translate-y-0 rotate-0 opacity-100")} aria-hidden />
    </button>
  );
}
