import { Presentation } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

/**
 * The same demo entry point from the landing page and the login form. Works
 * logged in too: the demo session replaces the current one (log in again after).
 */
export function DemoButton({ children = "Ver demonstração", variant = "secondary", size = "lg", className }) {
  const { status } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function open() {
    setLoading(true);
    setError(null);
    try {
      await api("/auth/demo", { method: "POST" });
      // Reload so AuthProvider reads the new session cookie.
      window.location.assign("/hoje");
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex min-w-0 flex-col gap-1.5">
      <Button variant={variant} size={size} className={className} onClick={open} disabled={status === "loading"} loading={loading}>
        {!loading && variant !== "ghost" && <Presentation className="size-4" aria-hidden />} {children}
      </Button>
      {error && <span className="max-w-64 text-[12.5px] text-danger" role="alert">{error}</span>}
    </span>
  );
}
