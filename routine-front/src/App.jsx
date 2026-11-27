import { useEffect } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import { AuthProvider } from "@/auth/AuthProvider";
import { RequireAuth } from "@/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Spinner } from "@/components/ui/States";
import { ToastProvider } from "@/components/ui/Toast";
import { finishBoot } from "@/lib/grid-transition";
import { NotFoundPage } from "@/pages/NotFoundPage";

/** Loads a route's component on demand (one chunk per screen). */
const page = (loader, exportName) => async () => ({ Component: (await loader())[exportName] });

const router = createBrowserRouter([
  // Public presentation: always shown at "/", signed in or not (no personal data on it).
  { path: "/", lazy: page(() => import("@/pages/LandingPage"), "LandingPage") },
  { path: "/contato", lazy: page(() => import("@/pages/ContactPage"), "ContactPage") },
  // Signed-out screens.
  { path: "/login", lazy: page(() => import("@/pages/LoginPage"), "LoginPage") },
  { path: "/criar-conta", lazy: page(() => import("@/pages/SignupPage"), "SignupPage") },
  { path: "/esqueci-senha", lazy: page(() => import("@/pages/PasswordPages"), "ForgotPasswordPage") },
  { path: "/redefinir-senha", lazy: page(() => import("@/pages/PasswordPages"), "ResetPasswordPage") },
  // Links from the e-mails (work signed in or not).
  { path: "/confirmar-email", lazy: page(() => import("@/pages/EmailLinkPages"), "VerifyEmailPage") },
  { path: "/confirmar-novo-email", lazy: page(() => import("@/pages/EmailLinkPages"), "ConfirmEmailChangePage") },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        HydrateFallback: () => <Spinner className="p-10" />,
        children: [
          { path: "hoje", lazy: page(() => import("@/features/today/TodayPage"), "TodayPage") },
          { path: "agua", lazy: page(() => import("@/features/water/WaterPage"), "WaterPage") },
          { path: "relatorios", lazy: page(() => import("@/features/reports/ReportsPage"), "ReportsPage") },
          { path: "relatorios/pendentes", lazy: page(() => import("@/features/reports/PendingDaysPage"), "PendingDaysPage") },
          // Set-up screens, used once in a while, live under Configurações.
          {
            path: "configuracoes",
            lazy: page(() => import("@/features/settings/SettingsLayout"), "SettingsLayout"),
            children: [
              { index: true, element: <Navigate to="/configuracoes/rotina" replace /> },
              { path: "rotina", lazy: page(() => import("@/features/settings/RoutineSettings"), "RoutineSettings") },
              { path: "categorias", lazy: page(() => import("@/features/settings/CategoriesSettings"), "CategoriesSettings") },
              { path: "dias-especiais", lazy: page(() => import("@/features/settings/SpecialDaysSettings"), "SpecialDaysSettings") },
              { path: "telegram", lazy: page(() => import("@/features/settings/TelegramSettings"), "TelegramSettings") },
              { path: "perfil", lazy: page(() => import("@/features/settings/ProfileSettings"), "ProfileSettings") },
              { path: "seguranca", lazy: page(() => import("@/features/settings/SecuritySettings"), "SecuritySettings") },
              { path: "usuarios", lazy: page(() => import("@/features/settings/UsersSettings"), "UsersSettings") },
            ],
          },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);

/** Clears the loading tiles once the first screen (its lazy chunk included) is ready. */
function useFinishBoot() {
  useEffect(() => {
    const ready = (state) => state.initialized && state.navigation.state === "idle";
    if (ready(router.state)) {
      finishBoot();
      return undefined;
    }
    const unsubscribe = router.subscribe((state) => {
      if (!ready(state)) return;
      unsubscribe();
      finishBoot();
    });
    return unsubscribe;
  }, []);
}

export function App() {
  useFinishBoot();
  return (
    <ToastProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ToastProvider>
  );
}
