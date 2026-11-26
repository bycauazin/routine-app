import {
  AlertTriangle, BarChart3, CalendarDays, CalendarOff, Clock, Database, Droplet, Dumbbell, Flame, FlaskConical, Inbox, LayoutGrid, Layers,
  ListChecks, ListTodo, Plus, Repeat, Rocket, Send, ShieldCheck, Smartphone, Sparkles, Sun, Tags, Target, TrendingUp, UserRound, Users, Workflow, Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { cn } from "@/lib/cn";

/** Icons of the rail, by key (data-rail-icon) or found from the section's name. */
const RAIL_ICONS = {
  start: Sparkles, today: Sun, week: CalendarDays, timeline: Clock, tasks: ListTodo, inbox: Inbox, habits: Repeat, lists: ListChecks,
  goals: Target, progress: TrendingUp, reports: BarChart3, water: Droplet, workout: Dumbbell, streak: Flame, attention: AlertTriangle,
  unplanned: Zap, categories: Tags, special: CalendarOff, telegram: Send, profile: UserRound, security: ShieldCheck, users: Users,
  data: Database, devices: Smartphone, how: Workflow, features: LayoutGrid, simulate: FlaskConical, add: Plus, start2: Rocket, layers: Layers,
};

/** [key, words] in order: the first whose word is in the name wins. */
const KEYWORDS = [
  ["unplanned", ["imprevist"]], ["attention", ["atencao", "atras", "pendente"]], ["special", ["especia", "feriad", "ferias"]],
  ["water", ["agua", "beb"]], ["workout", ["trein", "exerc"]], ["streak", ["sequenc"]], ["goals", ["meta", "objetiv"]],
  ["progress", ["progress", "nota", "cumpr", "resumo"]], ["reports", ["relator", "grafic", "categorias e horas", "horas"]],
  ["timeline", ["linha do tempo", "agenda", "horario", "registros"]], ["inbox", ["quando der", "a fazer"]], ["tasks", ["tarefa", "fazer"]],
  ["lists", ["lista", "afazer", "sem horario"]], ["habits", ["rotina", "habito", "fixo"]], ["week", ["semana"]], ["today", ["hoje", "dia"]],
  ["categories", ["categor"]], ["telegram", ["telegram", "bot"]], ["profile", ["perfil", "conta", "nome"]], ["security", ["seguranc", "senha", "sess", "verificac"]],
  ["users", ["usuario", "pessoas"]], ["data", ["dados", "export", "privacid"]], ["devices", ["celular", "aparelho"]], ["how", ["como funciona", "passo"]],
  ["features", ["recurso", "tipos"]], ["simulate", ["simul"]], ["add", ["adicionar", "novo"]], ["start2", ["comec", "comece"]], ["start", ["inicio"]],
];
const plain = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const iconKeyFor = (name) => KEYWORDS.find(([, words]) => words.some((w) => plain(name).includes(w)))?.[0] ?? "layers";

const ROOM = 88; // the rail's width plus space before the content
const MIN_HEIGHT = 520;

/** The stops: blocks marked data-rail, or else the top-level cards and sections with a title. */
function findSections(root) {
  const marked = [...root.querySelectorAll("[data-rail]")];
  if (marked.length) return marked.map((el) => ({ el, label: el.dataset.rail, icon: el.dataset.railIcon || iconKeyFor(el.dataset.rail) }));
  const candidates = [...root.querySelectorAll("section")].filter((el) => el.querySelector("h2, h3"));
  return candidates
    .filter((el) => !candidates.some((other) => other !== el && other.contains(el)))
    .map((el) => {
      const label = el.querySelector("h2, h3").textContent.trim().slice(0, 42);
      return { el, label, icon: iconKeyFor(label) };
    })
    .filter((s) => s.label);
}

const sameList = (a, b) => a.length === b.length && a.every((s, i) => s.label === b[i].label && s.icon === b[i].icon && s.el === b[i].el);

/** Marks a block as a stop of the rail (same as data-rail on any element). */
export function RailSection({ as: Tag = "section", name, icon, ...props }) {
  return <Tag data-rail={name} data-rail-icon={icon} {...props} />;
}

/**
 * The column of icons at the right of the screen, one per section of the page
 * (from the portfolio's case rail). The active one has a marker that slides
 * to it, a click scrolls there, the name shows on hover/focus and the bar
 * under the icons shows how much of the page was scrolled. It only shows
 * where it fits beside the content (`fitRef`, else `rootRef`) and with two
 * sections or more.
 * `right` is its distance from the window's edge, in px.
 */
export function SectionRail({ rootRef, fitRef, right = 18 }) {
  const location = useLocation();
  const [sections, setSections] = useState([]);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const [fits, setFits] = useState(false);
  const list = useRef([]);

  // Which sections there are: on route change and whenever the content changes.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    let frame = 0;
    const read = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const found = findSections(root);
        if (sameList(found, list.current)) return;
        list.current = found;
        setSections(found.map(({ label, icon }) => ({ label, icon })));
      });
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [rootRef, location.pathname]);

  const measure = useCallback(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
    const line = window.innerHeight * 0.35;
    let current = 0;
    list.current.forEach((s, i) => {
      if (s.el.getBoundingClientRect().top <= line) current = i;
    });
    if (max > 0 && window.scrollY >= max - 4) current = list.current.length - 1;
    setActive(current);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const fit = () => {
      const reference = fitRef?.current ?? root;
      // The content's edge: the box minus its right padding.
      const right = reference ? reference.getBoundingClientRect().right - parseFloat(getComputedStyle(reference).paddingRight || "0") : window.innerWidth;
      setFits(window.innerWidth - right >= ROOM && window.innerHeight >= MIN_HEIGHT);
    };
    const update = () => {
      fit();
      measure();
    };
    update();
    const observer = new ResizeObserver(update);
    if (root) observer.observe(root);
    if (fitRef?.current) observer.observe(fitRef.current);
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", update);
    };
  }, [rootRef, fitRef, measure, sections]);

  if (!fits || sections.length < 2) return null;

  const go = (i) => {
    const el = list.current[i]?.el;
    if (!el) return;
    const header = [...document.querySelectorAll("header")].find((h) => ["fixed", "sticky"].includes(getComputedStyle(h).position));
    const offset = (header?.getBoundingClientRect().height ?? 0) + 16;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - offset), behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <nav aria-label="Seções da página" style={{ right }} className="section-rail fixed top-1/2 z-40 -translate-y-1/2 [--rail-size:40px] [--step:44px] [@media(max-height:820px)]:[--rail-size:34px] [@media(max-height:820px)]:[--step:38px]">
      <ul
        style={{ "--active": active }}
        className="relative flex max-h-[calc(100vh-120px)] flex-col gap-1 rounded-[18px] border border-rule bg-[color-mix(in_srgb,var(--paper)_92%,transparent)] p-1.5 shadow-[0_12px_32px_rgb(37_59_87/0.12)] backdrop-blur-[12px] dark:shadow-[0_18px_44px_rgb(0_0_0/0.32)]"
      >
        <li aria-hidden className="section-rail-marker pointer-events-none absolute top-1.5 left-1.5 size-[var(--rail-size)] rounded-[12px] bg-[color-mix(in_srgb,var(--accent-text)_15%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent-text)_30%,transparent)] [@media(max-height:820px)]:rounded-[10px]" />
        {sections.map((s, i) => {
          const Icon = RAIL_ICONS[s.icon] ?? Layers;
          const isActive = i === active;
          return (
            <li key={`${s.label}-${i}`} className="section-rail-item group relative" style={{ "--i": i }}>
              <button
                type="button"
                onClick={() => go(i)}
                aria-label={s.label}
                aria-current={isActive ? "location" : undefined}
                className={cn(
                  "relative z-[1] grid size-[var(--rail-size)] cursor-pointer place-items-center rounded-[12px] transition-[color,background-color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-text)] motion-reduce:transition-none [@media(max-height:820px)]:rounded-[10px]",
                  isActive ? "text-accent-text" : "text-muted hover:bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] hover:text-ink",
                )}
              >
                <Icon key={isActive ? "on" : "off"} className={cn("size-[19px] [@media(max-height:820px)]:size-[17px]", isActive && "section-rail-pop")} strokeWidth={1.7} aria-hidden />
              </button>
              <span className="pointer-events-none absolute top-1/2 right-[calc(100%+12px)] translate-x-[6px] -translate-y-1/2 rounded-[8px] bg-ink px-2.5 py-1.5 text-[12px] font-[550] whitespace-nowrap text-bg opacity-0 transition-[opacity,transform] duration-150 group-focus-within:translate-x-0 group-focus-within:opacity-100 group-hover:translate-x-0 group-hover:opacity-100 motion-reduce:transition-none">
                {s.label}
              </span>
            </li>
          );
        })}
        <li aria-hidden className="mx-auto mt-1 mb-0.5 h-1 w-6 overflow-hidden rounded-full bg-rule">
          <span className="block size-full origin-left bg-accent-text transition-transform duration-150 ease-linear motion-reduce:transition-none" style={{ transform: `scaleX(${progress})` }} />
        </li>
      </ul>
    </nav>
  );
}
