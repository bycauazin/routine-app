import { ChartNoAxesColumn, CalendarCheck, Droplet, Settings } from "lucide-react";

/**
 * Main navigation. Set-up screens (fixed routine, categories, profile) live
 * under Configurações. The week is a tab on Hoje.
 */
export const NAV_ITEMS = [
  { to: "/hoje", label: "Hoje", short: "Hoje", icon: CalendarCheck },
  { to: "/agua", label: "Água", short: "Água", icon: Droplet },
  { to: "/relatorios", label: "Relatórios", short: "Relatórios", icon: ChartNoAxesColumn },
  { to: "/configuracoes", label: "Configurações", short: "Ajustes", icon: Settings },
];
