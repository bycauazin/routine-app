import { CalendarOff, Repeat, ShieldCheck, Tags, UserRound, Users, Send } from "lucide-react";
import { useEffect, useRef } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { useAuth } from "@/auth/AuthProvider";
import { cn } from "@/lib/cn";

const TABS = [
  { to: "/configuracoes/rotina", label: "Rotina fixa", icon: Repeat },
  { to: "/configuracoes/categorias", label: "Categorias", icon: Tags },
  { to: "/configuracoes/dias-especiais", label: "Dias especiais", icon: CalendarOff },
  { to: "/configuracoes/telegram", label: "Telegram", icon: Send },
  { to: "/configuracoes/perfil", label: "Perfil e senha", icon: UserRound },
  { to: "/configuracoes/seguranca", label: "Segurança", icon: ShieldCheck },
];

/** Admins only: new sign-ups wait here to be let in. */
const ADMIN_TABS = [{ to: "/configuracoes/usuarios", label: "Usuários", icon: Users }];

export function SettingsLayout() {
  const { user } = useAuth();
  const tabs = user?.role === "ADMIN" && !user?.demo ? [...TABS, ...ADMIN_TABS] : TABS;
  const { pathname } = useLocation();
  const navRef = useRef(null);
  // Phone row (same as Cacau): keep the open tab in view (Telegram, Segurança… sit past the edge).
  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector("a[aria-current=page]");
    if (nav && active && nav.scrollWidth > nav.clientWidth) nav.scrollTo({ left: active.offsetLeft - 16, behavior: "smooth" });
  }, [pathname]);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="label">Configurações</p>
        <p className="mt-1 text-[14px] text-muted">Cadastros que você mexe de vez em quando. No dia a dia, use a tela Hoje.</p>
      </div>
      {/* Phone: one row that scrolls sideways. From md up: a column on the left, the screen on the right. */}
      <div className="flex flex-col gap-6 md:grid md:grid-cols-[210px_minmax(0,1fr)] md:items-start md:gap-8">
        <nav
          ref={navRef}
          aria-label="Seções de configurações"
          className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 md:sticky md:top-24 md:overflow-visible [&::-webkit-scrollbar]:hidden"
        >
          <ul className="flex w-max gap-1 rounded-[12px] bg-sunk p-1 md:w-full md:flex-col">
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
                  <tab.icon className="size-4 shrink-0" aria-hidden />
                  {tab.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
