import { useEffect } from "react";
import { useLocation } from "react-router";

export const WHATSAPP = "https://wa.me/5521988120757";
export const PORTFOLIO = "https://bycauazin.web.app";
export const SOCIALS = [
  ["GitHub", "https://github.com/bycauazin"],
  ["Instagram", "https://www.instagram.com/bycauazin/"],
  ["LinkedIn", "https://www.linkedin.com/in/caua-santana-dev/"],
];
export const YEAR = new Date().getFullYear();

/** The two button styles of the public pages (same role = same look). */
export const btnPrimary =
  "group inline-flex items-center justify-center gap-2.5 rounded-full bg-accent px-5 font-[620] whitespace-nowrap text-accent-ink transition-[background,transform] duration-200 hover:-translate-y-0.5 hover:bg-accent-hover active:translate-y-0 active:bg-accent-active";
export const btnGhost =
  "group inline-flex items-center justify-center gap-2.5 rounded-full border border-rule-strong px-5 font-[560] whitespace-nowrap text-ink transition-[background,border-color] duration-200 hover:border-ink hover:bg-paper";

/** Links to "/#x" from another page land on x, scrolling smoothly. */
export function useHashScroll() {
  const { hash, pathname } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth" }));
  }, [hash, pathname]);
}
