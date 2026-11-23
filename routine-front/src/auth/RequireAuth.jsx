import { Navigate, Outlet, useLocation } from "react-router";
import { Spinner } from "@/components/ui/States";
import { useAuth } from "./AuthProvider";

/**
 * Guards private routes in the UI. This is a convenience only: the real
 * protection is the API, which rejects every request without a valid session.
 */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner label="Verificando sessão…" />
      </div>
    );
  }
  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}
