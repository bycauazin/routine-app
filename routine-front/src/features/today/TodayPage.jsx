import { CalendarClock, CalendarHeart, GraduationCap, ListChecks, Repeat, Sparkles } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { Card } from "@/components/ui/Layout";
import { formatDayTitle, greeting, today } from "@/lib/dates";

/** What arrives on this screen, stage by stage (see PROMPT.md). */
const COMING = [
  { icon: Repeat, title: "Rotina fixa", text: "Blocos que se repetem nos dias da semana, com horário: trabalho, condução, estudo, treino." },
  { icon: ListChecks, title: "Tarefas avulsas", text: "O que é só de hoje, com ou sem horário. O que ficar para trás aparece como atrasado." },
  { icon: Sparkles, title: "Hábitos", text: "Duolingo, 10 minutos de estudo, 2 páginas de livro, com a sequência de dias seguidos." },
  { icon: GraduationCap, title: "Aulas", text: "Cada aluno no seu horário, e dá para atrasar, remarcar ou cancelar só aquela aula." },
  { icon: CalendarHeart, title: "Dias especiais", text: "Feriado, férias ou folga: o que não acontece nesses dias não conta como falha." },
];

/**
 * Hoje: the center of the app. For now (stage 1) it greets and shows what is
 * coming; the day's timeline with checks arrives in stage 2.
 */
export function TodayPage() {
  const { user } = useAuth();
  const first = user?.name?.split(" ")[0];
  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="label">{formatDayTitle(today())}</p>
        <h1 className="mt-0.5 text-[24px] font-[660] tracking-[-0.02em] md:text-[28px]">
          {greeting()}
          {first ? `, ${first}` : ""}
        </h1>
      </header>

      <Card className="flex flex-col items-start gap-3 px-5 py-6 sm:px-7">
        <span className="grid size-11 place-items-center rounded-full bg-selected text-accent-text">
          <CalendarClock className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-[17px] font-[640]">Sua rotina vai aparecer aqui</h2>
          <p className="mt-1 max-w-[60ch] text-[14.5px] text-muted">
            Esta é a tela Hoje: a linha do tempo do dia, em ordem de horário, com um check para cada coisa feita. A conta, o login e a segurança já estão
            prontos. O cadastro da rotina chega na próxima etapa.
          </p>
        </div>
      </Card>

      <section aria-labelledby="coming-title" className="flex flex-col gap-3">
        <h2 id="coming-title" className="label">
          O que vem por aí
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {COMING.map((item) => (
            <li key={item.title} className="sheet flex gap-3 px-4 py-4">
              <item.icon className="mt-0.5 size-[18px] shrink-0 text-accent-text" aria-hidden />
              <div className="min-w-0">
                <p className="text-[14.5px] font-[600]">{item.title}</p>
                <p className="mt-0.5 text-[13.5px] text-muted">{item.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
