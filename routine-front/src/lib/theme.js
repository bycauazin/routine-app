import { useSyncExternalStore } from "react";

/**
 * Theme preference: "system" | "light" | "dark", persisted per browser.
 * A tiny shared store so every toggle on screen stays in sync. The initial
 * theme is applied before first paint by the inline script in index.html.
 */
const STORAGE_KEY = "routine-theme";
const listeners = new Set();
const media = () => window.matchMedia("(prefers-color-scheme: dark)");

function read() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "system";
  } catch {
    return "system";
  }
}

let preference = read();

function apply() {
  const dark = preference === "dark" || (preference === "system" && media().matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  // The browser bar takes the page background (the --bg token of the theme just applied).
  const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
  if (bg) document.querySelector('meta[name="theme-color"]')?.setAttribute("content", bg);
}

media().addEventListener("change", () => {
  if (preference === "system") apply();
});

export function setThemePreference(next) {
  preference = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // storage unavailable (private mode): still applies for this session
  }
  apply();
  listeners.forEach((l) => l());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTheme() {
  const current = useSyncExternalStore(subscribe, () => preference);
  return { preference: current, setPreference: setThemePreference };
}
