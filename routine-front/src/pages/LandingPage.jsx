import { SectionRail } from "@/components/ui/SectionRail";
import { Check, Clock3, MoveRight } from "lucide-react";
import { useEffect, useRef } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { DemoButton } from "@/components/layout/DemoButton";
import { GridLink } from "@/components/layout/GridLink";
import { CATEGORY_TINT } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { useTheme } from "@/lib/theme";
import { DesktopAppShot, TodayMock } from "./landing/mocks";
import { FloatingActions, PublicFooter, PublicHeader, StartButton } from "./landing/public-chrome";
import { btnGhost, useHashScroll } from "./landing/public-links";
import { CompletionCard, HoursCard, ScoreCard, StreaksCard } from "./landing/report-mocks";
import { SkyDay } from "./landing/sky-day";
import { SnapCursor } from "./landing/snap-cursor";
import { StreakRun } from "./landing/streak-run";
import "./landing/landing.css";

/** Adds `is-visible` to every [data-reveal] inside the page as it scrolls into view. */
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const nodes = ref.current?.querySelectorAll("[data-reveal]") ?? [];
    if (!("IntersectionObserver" in window)) {
      nodes.forEach((n) => n.classList.add("is-visible"));
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, []);
  return ref;
}

const H2 = "text-[30px] leading-[1.08] font-[660] tracking-[-0.03em] sm:text-[40px]";

/**
 * The opening: a framed panel (the "telinha") that fits the screen. The
 * headline on the left gets the priority; on the right, the "Céu do dia"
 * window follows the hour of the pointer. The app screens, very blurred, rest
 * behind everything; the screens themselves come right below, in their own
 * section.
 */
function Hero() {
  return (
    <section data-rail="Início" data-rail-icon="start" className="px-3 pt-[72px] pb-3 sm:px-5 sm:pt-[76px]" aria-labelledby="hero-title">
      <div className="hero-panel relative isolate flex min-h-[calc(100dvh-84px)] flex-col overflow-hidden rounded-[28px] border-2 border-ink bg-bg">
        <div className="hero-shot" aria-hidden>
          <DesktopAppShot />
        </div>
        <div className="hero-shot-2" aria-hidden>
          <TodayMock />
        </div>
        <div className="relative mx-auto grid w-full max-w-[1360px] flex-1 items-center gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)] lg:gap-12">
          <div>
            <h1 id="hero-title" className="w-fit text-[38px] leading-[1.03] font-[700] tracking-[-0.04em] sm:text-[56px] lg:text-[64px]">
              <span className="rise-line" style={{ "--d": "60ms" }}>
                Sua semana inteira,
              </span>
              <span className="rise-line" style={{ "--d": "180ms" }}>
                <span className="mark-pink">um dia de cada vez.</span>
              </span>
            </h1>
            <p className="mt-5 max-w-[540px] animate-[fade-up_700ms_ease_360ms_backwards] text-[16.5px] leading-relaxed text-muted sm:text-[18px]">
              Cadastre uma vez o trabalho, as aulas, o treino e os hábitos. O Routine monta a lista de cada dia em ordem de horário, você marca o que fez e vê nos
              relatórios como foi a semana.
            </p>
            <div className="mt-7 flex flex-wrap items-start gap-2.5 animate-[fade-up_700ms_ease_460ms_backwards] sm:gap-3">
              <StartButton compact />
              <DemoButton className={cn(btnGhost, "h-11 border-ink bg-paper px-4 text-[14px] sm:h-12 sm:px-5 sm:text-[14.5px]")} />
            </div>
          </div>

          <figure className="m-0 flex animate-[fade-up_800ms_ease_420ms_backwards] flex-col gap-3">
            {/* the window: a navy frame (creme in the dark theme) around the sky */}
            <div className="relative h-[220px] overflow-hidden rounded-[26px] border-[7px] border-ink bg-ink shadow-lg sm:h-[360px] lg:h-[min(520px,calc(100dvh-260px))]">
              <div className="absolute inset-0 overflow-hidden rounded-[19px]">
                <SkyDay />
              </div>
            </div>
            <figcaption className="text-[13px] text-muted">Mova o mouse: o sol segue o cursor e o céu mostra a hora em que ele está. A cidade são os blocos da sua rotina.</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

/** Right below the opening: the app on a phone and on a computer, the same account on both. */
function Devices() {
  return (
    <section id="no-celular" data-rail="No celular" data-rail-icon="devices" className="lazy-section mx-auto max-w-[1180px] px-5 py-16 sm:px-8 md:py-24">
      <h2 className={H2}>No celular e no computador</h2>
      <p className="mt-4 max-w-[620px] text-[16px] leading-relaxed text-muted">
        O dia a dia fica no celular: a lista de hoje, em ordem de horário, para ir marcando. No computador dá para ver a semana inteira e os relatórios. É a
        mesma conta nos dois.
      </p>
      <div className="mt-10 grid items-end gap-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-10">
        <figure data-reveal className="m-0 flex flex-col gap-3">
          <figcaption className="flex items-baseline gap-2 text-[13px]">
            <span className="rounded-[6px] bg-ink px-2 py-0.5 font-[650] text-bg">Celular</span>
            <span className="text-muted">o Hoje</span>
          </figcaption>
          <TodayMock className="mx-auto lg:mx-0" />
        </figure>
        <figure data-reveal style={{ "--reveal-delay": "120ms" }} className="m-0 flex min-w-0 flex-col gap-3">
          <figcaption className="flex items-baseline gap-2 text-[13px]">
            <span className="rounded-[6px] bg-ink px-2 py-0.5 font-[650] text-bg">Computador</span>
            <span className="text-muted">o dia, a semana e os números</span>
          </figcaption>
          <DesktopAppShot fluid />
        </figure>
      </div>
    </section>
  );
}

/* ───── Como funciona: pieces of the real screens instead of icons ───── */

function RuleSnippet() {
  return (
    <div className="flex flex-col gap-3 rounded-[16px] border border-ink/25 bg-paper p-4 text-[13px]">
      <div className="flex items-center justify-between">
        <span className="font-[650]">Novo bloco fixo</span>
        <span className={cn("rounded-[6px] px-2 py-0.5 text-[12px] font-[560] text-ink", CATEGORY_TINT.work)}>Trabalho</span>
      </div>
      <div className="rounded-[10px] border border-rule-strong bg-paper-2 px-3 py-2">Trabalho</div>
      <div className="flex flex-wrap gap-1.5">
        {["seg", "ter", "qua", "qui", "sex", "sáb", "dom"].map((d, i) => (
          <span key={d} className={cn("grid h-8 min-w-9 place-items-center rounded-[8px] border px-1.5 text-[12px]", i < 5 ? "border-ink bg-ink font-[600] text-bg" : "border-rule-strong text-muted")}>
            {d}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2 tabular-nums">
        <span className="rounded-[10px] border border-rule-strong bg-paper-2 px-3 py-2">09:00</span>
        <span className="text-muted">até</span>
        <span className="rounded-[10px] border border-rule-strong bg-paper-2 px-3 py-2">18:00</span>
      </div>
    </div>
  );
}

function DaySnippet() {
  const rows = [
    ["07:00", "Acordar", true],
    ["08:00", "Condução", true],
    ["09:00", "Trabalho", false, true],
  ];
  return (
    <div className="flex flex-col gap-1 rounded-[16px] border border-ink/25 bg-paper p-3 text-[13px]">
      {rows.map(([time, name, done, now]) => (
        <div key={time} className={cn("grid grid-cols-[44px_1fr_22px] items-center gap-2 rounded-[10px] px-2 py-2", now && "bg-selected")}>
          <span className="text-muted tabular-nums">{time}</span>
          <span className={cn("font-[560]", done && "text-muted line-through")}>{name}</span>
          <span className={cn("grid size-[22px] place-items-center rounded-full border-2", done ? "border-accent bg-accent text-accent-ink" : "border-rule-strong")}>
            {done && <Check className="size-3" strokeWidth={3} aria-hidden />}
          </span>
        </div>
      ))}
      <div className="flex gap-2 px-2 pt-2 pb-1">
        <span className="inline-flex items-center gap-1 rounded-[8px] border border-rule-strong px-2.5 py-1 text-[12px]">
          <Clock3 className="size-3.5" aria-hidden /> Atrasar 30 min
        </span>
        <span className="rounded-[8px] border border-rule-strong px-2.5 py-1 text-[12px]">Remarcar</span>
      </div>
    </div>
  );
}

function WeekSnippet() {
  return (
    <div className="flex flex-col gap-3 rounded-[16px] border border-ink/25 bg-paper p-4 text-[13px]">
      <div className="flex items-baseline justify-between">
        <span className="font-[650]">Semana de 17 a 23 nov</span>
        <span className="text-[24px] leading-none font-[720] tabular-nums">82%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-sunk">
        <div className="h-full w-[82%] rounded-full bg-accent-text" />
      </div>
      <dl className="grid grid-cols-2 gap-y-1.5 text-[12.5px]">
        <dt className="text-muted">Melhor dia</dt>
        <dd className="m-0 text-right font-[600]">domingo · 100%</dd>
        <dt className="text-muted">Pior dia</dt>
        <dd className="m-0 text-right font-[600]">sábado · 60%</dd>
        <dt className="text-muted">Não feitos</dt>
        <dd className="m-0 text-right font-[600]">4 itens</dd>
      </dl>
    </div>
  );
}

const STEPS = [
  { view: RuleSnippet, title: "Cadastre a semana", text: "Cada bloco fixo com os dias e o horário. O mesmo para hábitos, aulas e refeições." },
  { view: DaySnippet, title: "Marque o dia", text: "Todo dia a lista já vem pronta. Se algo mudar, atrase ou remarque só aquele item." },
  { view: WeekSnippet, title: "Veja como foi", text: "No fim do dia e da semana, o quanto foi cumprido e o que ficou para trás." },
];

function HowItWorks() {
  return (
    <section id="como-funciona" data-rail="Como funciona" data-rail-icon="how" className="lazy-section mx-auto max-w-[1180px] px-5 py-16 sm:px-8 md:py-24">
      <h2 className={H2}>Como funciona</h2>
      <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-6">
        {STEPS.map((s, i) => (
          <li key={s.title} data-reveal style={{ "--reveal-delay": `${i * 100}ms` }} className="flex flex-col gap-4">
            <s.view />
            <div>
              <h3 className="text-[17px] font-[650]">
                <span className="text-accent-text tabular-nums">{i + 1}.</span> {s.title}
              </h3>
              <p className="mt-1 text-[14.5px] leading-relaxed text-muted">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ───── What you can register: a list with real examples ───── */

const KINDS = [
  ["Blocos fixos", "Repetem nos dias da semana que você escolher, com horário de início e fim.", "Trabalho · seg a sex · 09:00–18:00"],
  ["Tarefas do dia", "Só daquele dia, com ou sem horário. O que ficar para trás aparece como atrasado.", "Ligar para o banco · hoje"],
  ["Hábitos", "Com meta opcional (minutos, páginas) e a contagem de dias seguidos.", "Duolingo · todo dia · 12 dias"],
  ["Aulas", "Cada aluno no seu horário. Atrasar, remarcar ou cancelar muda só aquela aula.", "Pedro · ter e qui · 18:30"],
  ["Dias especiais", "Feriado, férias ou folga. O que não acontece nesses dias não conta como falha.", "15 nov · feriado"],
  ["Refeições", "O que comer em cada horário, com um check quando comer.", "Almoço · 13:00"],
];

function Kinds() {
  return (
    <section id="recursos" data-rail="Recursos" data-rail-icon="features" className="lazy-section bg-ink text-bg">
      <div className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 md:py-24">
        <h2 className={H2}>O que dá para cadastrar</h2>
        <dl className="mt-10 border-t border-bg/20">
          {KINDS.map(([kind, text, example], i) => (
            <div key={kind} data-reveal style={{ "--reveal-delay": `${(i % 3) * 60}ms` }} className="grid gap-2 border-b border-bg/20 py-5 md:grid-cols-[200px_minmax(0,1fr)_auto] md:items-center md:gap-8">
              <dt className="text-[17px] font-[650]">{kind}</dt>
              <dd className="m-0 text-[14.5px] leading-relaxed text-bg/75">{text}</dd>
              <dd className="m-0 w-fit rounded-[8px] bg-bg/10 px-3 py-1.5 text-[13px] font-[560] tabular-nums">{example}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

const REPORTS = [
  { view: CompletionCard, title: "Rotina cumprida", text: "A porcentagem do que foi feito no dia, na semana e no mês, e qual dia foi melhor ou pior." },
  { view: ScoreCard, title: "Nota do dia", text: "Uma nota de 0 a 10 por dia, semana e mês, com hábitos e compromissos pesando mais." },
  { view: StreaksCard, title: "Sequências", text: "Quantos dias seguidos cada hábito foi feito, e o recorde. Feriado e folga não quebram." },
  { view: HoursCard, title: "Horas por categoria", text: "Quanto da semana foi trabalho, aula, treino e estudo." },
];

function Reports() {
  return (
    <section id="relatorios" data-rail="Relatórios" data-rail-icon="reports" className="lazy-section mx-auto max-w-[1180px] px-5 py-16 sm:px-8 md:py-24">
      <h2 className={H2}>Relatórios</h2>
      <p className="mt-4 max-w-[600px] text-[16px] leading-relaxed text-muted">
        Calculados a partir do que você marca no dia a dia, sem preencher nada a mais. Os números abaixo são de exemplo.
      </p>
      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {REPORTS.map((r, i) => (
          <li key={r.title} data-reveal style={{ "--reveal-delay": `${i * 80}ms` }} className="flex flex-col gap-4">
            <r.view className="h-full min-h-[236px]" />
            <div>
              <h3 className="text-[16px] font-[640]">{r.title}</h3>
              <p className="mt-1 text-[14px] leading-relaxed text-muted">{r.text}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-[14px] text-muted">Também: aulas por aluno no mês (dadas, remarcadas e canceladas) e a semana em grade com o que foi feito em cada bloco.</p>
    </section>
  );
}

const DATA_FACTS = [
  ["Senha protegida", "Guardada com Argon2id: nem quem administra o servidor consegue lê-la."],
  ["Verificação em duas etapas", "Opcional, com um código do app autenticador do celular."],
  ["Contas separadas", "Cada pessoa só enxerga a própria rotina, e o banco de dados garante isso."],
  ["Exportar e excluir", "Baixe tudo o que está guardado ou apague a conta quando quiser."],
];

function YourData() {
  return (
    <section id="seus-dados" data-rail="Seus dados" data-rail-icon="data" className="lazy-section border-y border-rule bg-sunk/60">
      <div className="mx-auto grid max-w-[1180px] gap-8 px-5 py-14 sm:px-8 md:grid-cols-[240px_minmax(0,1fr)] md:py-16">
        <h2 className="text-[24px] leading-tight font-[660] tracking-[-0.02em]">Seus dados</h2>
        <ul className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
          {DATA_FACTS.map(([title, text]) => (
            <li key={title}>
              <p className="text-[15px] font-[640]">{title}</p>
              <p className="mt-1 text-[14px] leading-relaxed text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** The closing call is a task to check: "Criar minha conta". Hover (or focus) ticks it. */
function FinalCall() {
  const { status } = useAuth();
  const signedIn = status === "authenticated";
  return (
    <section data-rail="Comece agora" data-rail-icon="start2" className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 md:py-24">
      <h2 className={H2}>{signedIn ? "Sua rotina está esperando." : "Sua próxima tarefa:"}</h2>
      <GridLink
        to={signedIn ? "/hoje" : "/criar-conta"}
        data-reveal
        className="todo-cta group mt-8 flex w-full max-w-[680px] items-center gap-4 rounded-[18px] border-2 border-ink bg-paper px-5 py-5 transition-colors hover:bg-selected sm:px-7 sm:py-6"
      >
        <span className="todo-box grid size-9 shrink-0 place-items-center rounded-full border-2 border-ink transition-colors sm:size-10">
          <svg viewBox="0 0 16 16" className="size-4 sm:size-5" aria-hidden>
            <path className="todo-check" d="M3.5 8.5l3 3 6-7" />
          </svg>
        </span>
        <span className="flex-1 text-[20px] font-[660] tracking-[-0.01em] sm:text-[26px]">{signedIn ? "Abrir o Routine" : "Criar minha conta"}</span>
        <span className="hidden items-center gap-1.5 text-[13px] text-muted sm:flex">
          agora <MoveRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
        </span>
      </GridLink>
      {!signedIn && (
        <p className="mt-4 text-[14.5px] text-muted">
          Prefere olhar antes?{" "}
          <DemoButton variant="ghost" size="sm" className="inline-flex h-auto px-0 font-[600] text-accent-text underline underline-offset-2 hover:bg-transparent hover:no-underline">
            Abra a demonstração
          </DemoButton>
          .
        </p>
      )}
    </section>
  );
}

export function LandingPage() {
  useTheme();
  useHashScroll();
  const ref = useReveal();
  const mainRef = useRef(null);
  const fitRef = useRef(null);

  return (
    <div ref={ref} className="min-h-dvh overflow-x-clip bg-bg text-ink">
      <PublicHeader />
      <main ref={mainRef}>
        {/* The width of the page's content: the rail only shows where it fits beside it. */}
        <div ref={fitRef} aria-hidden className="pointer-events-none mx-auto h-0 max-w-[1180px] px-5 sm:px-8" />
        <Hero />
        <StreakRun />
        <Devices />
        <StreakRun />
        <HowItWorks />
        <StreakRun />
        <Kinds />
        <StreakRun />
        <Reports />
        <StreakRun />
        <YourData />
        <FinalCall />
      </main>
      <PublicFooter />
      {/* 32px: inside the line of the opening frame, which is 20px from the edge. */}
      <SectionRail rootRef={mainRef} fitRef={fitRef} right={32} />
      <FloatingActions />
      <SnapCursor />
    </div>
  );
}
