import { ShieldCheck, UserRound, Users } from "lucide-react";
import { NavLink, Outlet } from "react-router";
import { useAuth } from "@/auth/AuthProvider";
import { cn } from "@/lib/cn";

/** Set-up screens: things you register once and touch now and then. The routine itself joins in stage 2. */
const TABS = [
  { to: "/configuracoes/perfil", label: "Perfil e senha", icon: UserRound },
  { to: "/configuracoes/seguranca", label: "Segurança", icon: ShieldCheck },
];

/** Admins only: new sign-ups wait here to be let in. */
const ADMIN_TABS = [{ to: "/configuracoes/usuarios", label: "Usuários", icon: Users }];

export function SettingsLayout() {
  const { user } = useAuth();
  const tabs = user?.role === "ADMIN" && !user?.demo ? [...TABS, ...ADMIN_TABS] : TABS;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="label">Configurações</p>
        <p className="mt-1 text-[14px] text-muted">Cadastros que você mexe de vez em quando. No dia a dia, use a tela Hoje.</p>
      </div>
      <nav aria-label="Seções de configurações" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-1 rounded-[12px] bg-sunk p-1 sm:w-auto sm:flex-wrap">
          {tabs.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-[8px] px-3 py-2 text-[13.5px] whitespace-nowrap transition-colors",
                    isActive ? "bg-paper font-[580] text-ink shadow-sm" : "text-muted hover:text-ink",
                  )
                }
              >
                <tab.icon className="size-4" aria-hidden />
                {tab.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  );
}
