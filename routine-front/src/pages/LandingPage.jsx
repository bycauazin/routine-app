import { ArrowRight, CalendarHeart, Download, GraduationCap, KeyRound, ListChecks, Repeat, ShieldCheck, Smartphone, Sparkles, Star, Utensils } from "lucide-react";
import { useEffect, useRef } from "react";
import { GridLink } from "@/components/layout/GridLink";
import { cn } from "@/lib/cn";
import { useTheme } from "@/lib/theme";
import { CATEGORY_LABEL, CATEGORY_TINT } from "@/lib/categories";
import { LiveSheet } from "./landing/live-sheet";
import { TodayMock, WeekGrid } from "./landing/mocks";
import { FloatingActions, PublicFooter, PublicHeader, StartButton } from "./landing/public-chrome";
import { btnGhost, useHashScroll } from "./landing/public-links";
import { SnapCursor } from "./landing/snap-cursor";
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

/** onInk: the title sits on a band painted with the 30% color (navy in light, creme in dark). */
const SectionTitle = ({ kicker, children, className, onInk }) => (
  <div className={cn("max-w-[640px]", className)}>
    <p className={cn("mb-3 text-[13px] font-[620]", onInk ? "text-accent-on-ink" : "text-accent-text")}>{kicker}</p>
    <h2 className="text-[32px] leading-[1.05] font-[640] tracking-[-0.03em] sm:text-[44px]">{children}</h2>
  </div>
);

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-rule" aria-labelledby="hero-title">
      {/* "Planilha viva": the spreadsheet grid lights up under the pointer, never behind [data-calm] */}
      <LiveSheet />
      <div className="relative mx-auto grid max-w-[1180px] items-center gap-12 px-5 pt-28 pb-16 sm:px-8 md:pt-36 lg:grid-cols-[1.15fr_1fr] lg:pb-24">
        <div>
          <p data-calm className="mb-6 inline-flex items-center gap-2 rounded-full border border-rule bg-paper px-3.5 py-1.5 text-[12.5px] font-[560] text-muted">
            <span className="size-1.5 rounded-full bg-accent-text" aria-hidden /> Controle de rotina · bycauazin
          </p>
          <h1 id="hero-title" data-calm className="text-[44px] leading-[1.02] font-[680] tracking-[-0.04em] sm:text-[62px] lg:text-[70px]">
            <span className="rise-line" style={{ "--d": "80ms" }}>
              Sua semana inteira,
            </span>
            <span className="rise-line" style={{ "--d": "200ms" }}>
              <span className="mark-pink">um dia de cada vez.</span>
            </span>
          </h1>
          <p data-calm className="mt-6 w-fit max-w-[500px] animate-[fade-up_700ms_ease_380ms_backwards] text-[17px] leading-relaxed text-muted">
            Configure uma vez o trabalho, as aulas, o treino e os hábitos. Todo dia o Routine monta a sua lista em ordem de horário, com um check para cada
            coisa feita.
          </p>
          <div data-calm className="mt-8 flex w-fit flex-col gap-3 animate-[fade-up_700ms_ease_480ms_backwards] sm:flex-row">
            <StartButton compact />
            <GridLink to="/login" className={cn(btnGhost, "h-11 bg-paper text-[14px] sm:h-12 sm:text-[14.5px]")}>
              Ver a demonstração
            </GridLink>
          </div>
        </div>
        <div className="flex justify-center lg:justify-end">
          <TodayMock className="float-a" />
        </div>
      </div>
    </section>
  );
}

function FromSheet() {
  return (
    <section id="planilha" className="mx-auto grid max-w-[1180px] items-center gap-10 px-5 py-16 sm:px-8 md:py-24 lg:grid-cols-[1fr_1.25fr]">
      <div data-reveal>
        <SectionTitle kicker="Da planilha para o bolso">Começou numa planilha.</SectionTitle>
        <p className="mt-5 max-w-[480px] text-[16px] leading-relaxed text-muted">
          Dias nas colunas, horários nas linhas e cada bloco com uma cor: trabalho, condução, estudo, aula, treino. Funcionava, mas não dizia o que já
          tinha sido feito, nem lembrava do Duolingo.
        </p>
        <p className="mt-4 max-w-[480px] text-[16px] leading-relaxed text-muted">
          O Routine guarda a mesma semana e transforma cada dia numa lista para marcar. O fim de semana sem nada continua livre, sem contar como falha.
        </p>
        <ul className="mt-6 flex flex-wrap gap-2" aria-label="Cores dos blocos">
          {["work", "commute", "study", "class", "workout", "meal"].map((cat) => (
            <li key={cat} className={cn("rounded-full px-3 py-1 text-[12.5px] font-[540] text-ink", CATEGORY_TINT[cat])}>
              {CATEGORY_LABEL[cat]}
            </li>
          ))}
        </ul>
      </div>
      <div data-reveal style={{ "--reveal-delay": "120ms" }} className="min-w-0">
        <WeekGrid />
      </div>
    </section>
  );
}

const FEATURES = [
  { icon: Repeat, title: "Rotina fixa e avulsa", text: "Blocos que se repetem nos dias certos da semana, e tarefas que são só de hoje. O que não foi feito fica como atrasado." },
  { icon: Sparkles, title: "Hábitos com sequência", text: "Estudar 10 minutos, ler 2 páginas, o Duolingo. Marque quanto fez e acompanhe quantos dias seguidos." },
  { icon: GraduationCap, title: "Aulas e alunos", text: "Cada aluno com seu horário fixo. Atrasou meia hora ou passou para amanhã? Muda só aquela aula." },
  { icon: CalendarHeart, title: "Feriados e férias", text: "Marque o dia e o que não acontece nele sai da conta, sem quebrar a sequência dos hábitos." },
  { icon: Star, title: "Nota do dia", text: "Quanto da rotina foi cumprido no dia, na semana e no mês, com os hábitos pesando mais que os blocos." },
  { icon: Utensils, title: "Refeições", text: "O que comer em cada horário, do café ao lanche da noite, e um check quando comer." },
];

function Features() {
  return (
    <section id="recursos" className="lazy-section bg-ink text-bg">
      <div className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 md:py-24">
        <SectionTitle kicker="Recursos" onInk>Tudo o que a planilha fazia, e o que ela não fazia.</SectionTitle>
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <li key={f.title} data-reveal style={{ "--reveal-delay": `${(i % 3) * 80}ms` }} className="flex flex-col gap-3 rounded-[14px] border border-bg/15 bg-bg/[0.06] p-5">
              <span className="grid size-10 place-items-center rounded-full bg-accent text-accent-ink">
                <f.icon className="size-[18px]" aria-hidden />
              </span>
              <h3 className="text-[16.5px] font-[640]">{f.title}</h3>
              <p className="text-[14px] leading-relaxed text-bg/75">{f.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const STEPS = [
  { icon: Repeat, title: "Monte a semana", text: "Cadastre os blocos fixos com dia e horário, os hábitos e os alunos. Uma vez só." },
  { icon: ListChecks, title: "Abra o Hoje", text: "O dia já vem pronto, em ordem de horário. Marque o que fez, atrase ou remarque o que mudou." },
  { icon: Star, title: "Veja como foi", text: "A nota do dia, a semana em grade e a sequência de cada hábito mostram onde a rotina escapa." },
];

function HowItWorks() {
  return (
    <section id="como-funciona" className="lazy-section mx-auto max-w-[1180px] px-5 py-16 sm:px-8 md:py-24">
      <SectionTitle kicker="Como funciona">Três passos, e o resto é marcar.</SectionTitle>
      <ol className="mt-10 grid gap-6 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} data-reveal style={{ "--reveal-delay": `${i * 100}ms` }} className="flex flex-col gap-3 border-t-2 border-ink pt-5">
            <span className="text-[13px] font-[650] text-accent-text tabular-nums">Passo {i + 1}</span>
            <h3 className="flex items-center gap-2 text-[19px] font-[650] tracking-[-0.01em]">
              <s.icon className="size-5 text-muted" aria-hidden /> {s.title}
            </h3>
            <p className="text-[14.5px] leading-relaxed text-muted">{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

const SECURITY = [
  { icon: KeyRound, title: "Senha bem guardada", text: "Argon2id, o mesmo padrão recomendado para senhas hoje. Nem quem cuida do servidor consegue ler." },
  { icon: Smartphone, title: "Duas etapas, se quiser", text: "Além da senha, um código do app autenticador do celular. Ninguém entra só com a senha." },
  { icon: ShieldCheck, title: "Cada um vê só o seu", text: "O próprio banco de dados recusa ligar um registro seu ao de outra pessoa." },
  { icon: Download, title: "Seus dados são seus", text: "Baixe tudo o que está guardado sobre você, ou exclua a conta quando quiser (LGPD)." },
];

function Security() {
  return (
    <section id="seguranca" className="lazy-section border-t border-rule bg-sunk/60">
      <div className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 md:py-24">
        <SectionTitle kicker="Segurança">A sua rotina diz muito sobre você.</SectionTitle>
        <p className="mt-5 max-w-[520px] text-[16px] leading-relaxed text-muted">Onde você está a cada hora fica guardado com o mesmo cuidado de um app de banco.</p>
        <ul className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {SECURITY.map((s, i) => (
            <li key={s.title} data-reveal style={{ "--reveal-delay": `${(i % 2) * 80}ms` }} className="flex gap-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-bg">
                <s.icon className="size-[17px]" aria-hidden />
              </span>
              <div>
                <h3 className="text-[16px] font-[640]">{s.title}</h3>
                <p className="mt-1 text-[14px] leading-relaxed text-muted">{s.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** The closing panel: the 30% color (navy in light, creme in dark) as ground. */
function FinalCall() {
  return (
    <section className="px-3 py-6 sm:px-5">
      <div data-reveal className="mx-auto flex max-w-[1180px] flex-col items-center rounded-[32px] bg-ink px-5 py-16 text-center text-bg sm:py-24">
        <h2 className="max-w-[640px] text-[34px] leading-[1.04] font-[660] tracking-[-0.03em] sm:text-[52px]">Comece pela semana que você já tem.</h2>
        <p className="mt-5 max-w-[460px] text-[16px] leading-relaxed opacity-80">
          O Routine está sendo construído em etapas. A conta já funciona, e cada parte da rotina chega assim que fica pronta.
        </p>
        <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          <StartButton className="w-full sm:w-auto" />
          <GridLink
            to="/contato"
            className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-full border border-bg/30 px-5 text-[14.5px] font-[560] transition-colors hover:border-bg sm:w-auto"
          >
            Falar comigo <ArrowRight className="size-4" aria-hidden />
          </GridLink>
        </div>
      </div>
    </section>
  );
}

export function LandingPage() {
  useTheme();
  useHashScroll();
  const ref = useReveal();

  return (
    <div ref={ref} className="min-h-dvh overflow-x-clip bg-bg text-ink">
      <PublicHeader />
      <main>
        <Hero />
        <FromSheet />
        <Features />
        <HowItWorks />
        <Security />
        <FinalCall />
      </main>
      <PublicFooter />
      <FloatingActions />
      <SnapCursor />
    </div>
  );
}
