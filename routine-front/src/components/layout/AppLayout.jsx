import { api } from "@/lib/api";
import { Globe, LogOut, Presentation, Settings } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useAuth } from "@/auth/AuthProvider";
import { Menu } from "@/components/ui/Menu";
import { SnapCursor } from "@/pages/landing/snap-cursor";
import { SectionRail } from "@/components/ui/SectionRail";
import { cn } from "@/lib/cn";
import { withGridTransition } from "@/lib/grid-transition";
import { useTheme } from "@/lib/theme";
import { Brand } from "./Brand";
import { NAV_ITEMS } from "./navigation";
import { ThemeToggle } from "./ThemeToggle";

/** Leaving the demo: it is deleted, and the visitor goes back to the login screen. */
function useLeaveDemo() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return async () => {
    await logout();
    navigate("/login", { replace: true, state: { notice: "Você saiu da demonstração e ela foi apagada. Volte quando quiser." } });
  };
}

/** Shown on every screen of the demo account. */
/**
 * Clicking a main section (Hoje, Água, Relatórios, Configurações) changes the
 * screen behind the tile transition. Inside the same section (Dia/Semana tabs,
 * the settings pages) and Ctrl/middle clicks it is a normal link.
 */
function useSectionClick() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const section = (path) => path.split("/")[1];
  return (to) => (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (section(to) === section(pathname)) return;
    e.preventDefault();
    withGridTransition(() => navigate(to));
  };
}

function DemoBanner() {
  const leave = useLeaveDemo();
  return (
    <div className="border-b border-warn/30 bg-warn-soft text-warn">
      <div className="mx-auto flex max-w-[1080px] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 text-[13px] sm:px-6">
        <span className="flex items-center gap-2 font-[560]">
          <Presentation className="size-4 shrink-0" aria-hidden /> Conta de demonstração · dados fictícios
        </span>
        <button type="button" onClick={leave} className="font-[620] underline underline-offset-2 hover:no-underline">
          Sair da demonstração
        </button>
      </div>
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const leaveDemo = useLeaveDemo();
  const initials = user?.name?.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const items = [
    { label: "Configurações", icon: Settings, onSelect: () => navigate("/configuracoes") },
    { label: "Página de apresentação", icon: Globe, onSelect: () => navigate("/") },
    ...(user?.demo
      ? []
      : [
          {
            label: "Ver demonstração",
            icon: Presentation,
            onSelect: async () => {
              await api("/auth/demo", { method: "POST" });
              window.location.assign("/hoje");
            },
          },
        ]),
    user?.demo
      ? { label: "Sair da demonstração", icon: LogOut, danger: true, onSelect: leaveDemo }
      : {
          label: "Sair",
          icon: LogOut,
          danger: true,
          onSelect: async () => {
            await logout();
            navigate("/login", { replace: true });
          },
        },
  ];
  return (
    <>
      <UserMenuButton items={items} initials={initials} name={user?.name} />
    </>
  );
}

function UserMenuButton({ items, initials, name }) {
  return (
    <Menu
      items={items}
      trigger={(props) => (
        <button
          type="button"
          onClick={props.toggle}
          aria-expanded={props["aria-expanded"]}
          aria-haspopup="menu"
          aria-label={`Conta de ${name}`}
          className="group flex items-center gap-1.5 rounded-full py-0.5 pr-0.5 pl-0.5 active:scale-95"
        >
          <span className="grid size-9 place-items-center rounded-full bg-accent text-[13px] font-[650] text-accent-ink transition-transform group-hover:scale-105">{initials}</span>
          {/* small caret: there are more options here */}
          <svg
            viewBox="0 0 10 6"
            className={cn("h-[6px] w-[10px] text-muted transition-[transform,color] duration-300 group-hover:text-ink", props["aria-expanded"] && "rotate-180 text-ink")}
            aria-hidden
          >
            <path d="M0 0h10L5 6z" fill="currentColor" />
          </svg>
        </button>
      )}
    />
  );
}

/** Desktop sections with a pill that slides to the active one. */
function DesktopNav() {
  const { pathname } = useLocation();
  const sectionClick = useSectionClick();
  const listRef = useRef(null);
  const [pill, setPill] = useState(null);

  useLayoutEffect(() => {
    const measure = () => {
      const list = listRef.current;
      const active = list?.querySelector("a[aria-current=page]");
      if (!active) return setPill(null);
      // Relative to the list (the link sits inside a positioned <li>).
      const box = list.getBoundingClientRect();
      const r = active.getBoundingClientRect();
      setPill({ left: r.left - box.left, width: r.width });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [pathname]);

  return (
    <nav aria-label="Principal" className="hidden flex-1 md:block">
      <ul ref={listRef} className="relative flex w-fit items-center gap-0.5">
        {pill && (
          <span
            className="absolute inset-y-0 rounded-[8px] bg-accent-soft transition-[left,width] duration-300 ease-out-soft"
            style={{ left: pill.left, width: pill.width }}
            aria-hidden
          />
        )}
        {NAV_ITEMS.map((item) => (
          <li key={item.to} className="relative">
            <NavLink
              to={item.to}
              onClick={sectionClick(item.to)}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-2 rounded-[8px] px-3 py-1.5 text-[13.5px] font-[520] transition-colors duration-200",
                  isActive ? "font-[600] text-ink" : "text-muted hover:text-ink",
                )
              }
            >
              <item.icon className="size-4 transition-transform duration-300 group-hover:-translate-y-px group-hover:scale-110" aria-hidden />
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Shell, phone first: a slim top bar and a tab bar docked at the bottom.
 * From md up the same sections move to the top bar and the content widens.
 */
export function AppLayout() {
  useTheme(); // re-render toggles when the theme changes
  const { pathname } = useLocation();
  // Only a new section replays the entrance cascade.
  const section = pathname.split("/").slice(0, pathname.startsWith("/configuracoes") ? 3 : 2).join("/");
  const { user } = useAuth();
  const sectionClick = useSectionClick();
  const mainRef = useRef(null);
  return (
    <div className="min-h-dvh">
      <SnapCursor />
      {user?.demo && <DemoBanner />}
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-paper">
        Pular para o conteúdo
      </a>

      <header className="sticky top-0 z-30 border-b border-rule bg-bg">
        <div className="mx-auto flex h-14 max-w-[1080px] items-center gap-6 px-4 sm:px-6 md:h-16">
          <NavLink to="/hoje" onClick={sectionClick("/hoje")} aria-label="nuCorre — hoje">
            <Brand />
          </NavLink>

          <DesktopNav />

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <main ref={mainRef} id="conteudo" className="mx-auto w-full max-w-[1080px] px-4 pt-5 pb-[calc(8rem+env(safe-area-inset-bottom))] sm:px-6 md:pt-9 md:pb-20">
        <div key={section} className="page-enter">
          <Outlet />
        </div>
      </main>
      <SectionRail rootRef={mainRef} />

      {/* Phone navigation: tab bar docked at the bottom */}
      <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-paper md:hidden">
        <ul className="grid pb-[env(safe-area-inset-bottom)]" style={{ gridTemplateColumns: `repeat(${NAV_ITEMS.length}, minmax(0, 1fr))` }}>
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={sectionClick(item.to)}
                className={({ isActive }) =>
                  cn("relative flex h-[60px] flex-col items-center justify-center gap-1 text-[11.5px] font-[520] transition-colors active:bg-sunk", isActive ? "font-[620] text-ink" : "text-muted")
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute inset-x-5 top-0 h-[2px] origin-center animate-[ink-fill_300ms_cubic-bezier(.2,.8,.2,1)] rounded-b-full bg-accent-text" aria-hidden />}
                    <item.icon className={cn("size-[21px]", isActive && "animate-[ring-pop_380ms_cubic-bezier(.34,1.56,.64,1)]")} strokeWidth={isActive ? 2.2 : 1.8} aria-hidden />
                    {item.short}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
