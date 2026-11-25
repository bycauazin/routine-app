/**
 * Names shown for each kind of item, in one place (Hoje, Rotina fixa, dialogs).
 * An item is FIXO when it comes from the fixed routine (it repeats on the
 * chosen weekdays) and AVULSO when it was added just for one day.
 */

/** Base name, the fixed/one-off words (gender agrees with the name) and what it is for. */
export const KINDS = {
  ROUTINE: { name: "Bloco", fixed: "fixo", oneOff: "", hint: "Um pedaço do dia, com ou sem horário: trabalho, condução, estudo. Pode ter uma lista de afazeres, como a rotina diária (ler, flashcards, Duolingo) e a rotina de dormir." },
  TASK: { name: "Tarefa", fixed: "fixa", oneOff: "avulsa", hint: "Algo para fazer e marcar como feito, com ou sem horário." },
  APPOINTMENT: { name: "Compromisso", fixed: "fixo", oneOff: "avulso", hint: "Tem hora marcada, com alguém ou em algum lugar: consulta, reunião." },
  WORKOUT: { name: "Treino", fixed: "", oneOff: "", hint: "Atividade física com horário: muay thai, corrida, academia." },
  HABIT: { name: "Hábito", fixed: "", oneOff: "", hint: "Algo pequeno que você quer fazer todo dia, com sequência de dias seguidos." },
  CLASS: { name: "Aula", fixed: "", oneOff: "", hint: "Aula com um aluno, que pode atrasar, remarcar ou cancelar." },
};

/** "Tarefa avulsa", "Compromisso fixo", "Bloco da rotina"… for an item of the day. */
export function itemKindLabel(item) {
  const kind = KINDS[item.kind];
  if (!kind) return "";
  const word = item.ruleId || item.fromRule ? kind.fixed : kind.oneOff;
  return word ? `${kind.name} ${word}` : kind.name;
}

/** The two ways to add something on Hoje: it repeats (fixo, needs a rule) or it happens once (avulso). */
export const ADD_OPTIONS = [
  { key: "fixed", label: "Fixo", hint: "Se repete. Você escolhe a regra: em quais dias da semana, em que horário (ou período, ou sem horário) e a partir de quando. Ex.: trabalho de seg a sex, 8h às 17h." },
  { key: "oneOff", label: "Avulso", hint: "Acontece uma vez. Data, período e horário são opcionais: sem data, vai para “Quando der”. Se tiver dia e não fizer, fica como atrasado até você fazer (menos compromissos, como dentista)." },
];
