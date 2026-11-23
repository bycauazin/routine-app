import { CalendarCheck, Settings } from "lucide-react";

/**
 * Main navigation: only what is used every day. Set-up screens (fixed
 * routine, habits, students, profile) live under Configurações.
 * Semana and Relatórios join as their stages are built.
 */
export const NAV_ITEMS = [
  { to: "/hoje", label: "Hoje", short: "Hoje", icon: CalendarCheck },
  { to: "/configuracoes", label: "Configurações", short: "Ajustes", icon: Settings },
];
