/** Texts the bot sends (HTML parse mode: only <b>, <i>, escaped user text). */

export const esc = (text) => String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const hhmm = (minute) => `${String(Math.floor((minute % 1440) / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
export const liters = (ml) => (ml < 1000 ? `${ml} ml` : `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(ml / 1000)} L`);

const PERIOD = { MORNING: "Manhã", AFTERNOON: "Tarde", NIGHT: "Noite" };
const mark = (item) => (item.status === "DONE" ? "✅" : item.status === "SKIPPED" ? "➖" : "▫️");

export const help = () =>
  [
    "<b>O que eu entendo</b>",
    "• <b>bebi 500</b> (ou 1,5 l): registra água",
    "• <b>resumo</b>: o seu dia de hoje",
    "• <b>ajuda</b>: esta lista",
  ].join("\n");

export const linked = (name) => `Pronto, ${esc(name)}! Seu Telegram está ligado ao Routine.\n\n${help()}`;
export const notLinked = () => "Ainda não sei quem é você. Abra o Routine em <b>Configurações → Telegram</b> e toque em <b>Conectar</b>.";
export const linkExpired = () => "Esse link expirou ou já foi usado. Gere outro em <b>Configurações → Telegram</b>.";
export const unknown = () => `Não entendi.\n\n${help()}`;
export const failed = () => "Algo deu errado aqui. Tente de novo em instantes.";

export const water = (day) => {
  const left = Math.max(0, day.goalMl - day.totalMl);
  const tail = left === 0 ? "Meta do dia batida! 💧" : `Faltam ${liters(left)}.`;
  return `💧 Registrado. Hoje: <b>${liters(day.totalMl)}</b> de ${liters(day.goalMl)}. ${tail}`;
};

/** The day: timeline with checks, what has no time, lists' progress, water. */
export function summary(day, { title = "Seu dia" } = {}) {
  const lines = [`<b>${esc(title)}</b>`];
  const timed = day.items ?? [];
  if (timed.length) {
    lines.push("");
    for (const item of timed) {
      const when = item.period ? PERIOD[item.period] : item.startMinute !== null ? hhmm(item.startMinute) : "";
      lines.push(`${mark(item)} ${when} ${esc(item.name)}`.replace(/\s+/g, " "));
    }
  }
  const anytime = day.anytime ?? [];
  if (anytime.length) {
    lines.push("", "<b>Sem horário</b>");
    for (const item of anytime) {
      const steps = item.steps?.length ? ` (${item.steps.filter((s) => s.doneAt).length}/${item.steps.length})` : "";
      lines.push(`${mark(item)} ${esc(item.name)}${steps}`);
    }
  }
  if (day.overdue?.length) lines.push("", `⚠️ ${day.overdue.length} ${day.overdue.length === 1 ? "tarefa atrasada" : "tarefas atrasadas"}`);
  if (day.water) lines.push("", `💧 Água: ${liters(day.water.totalMl)} de ${liters(day.water.goalMl)}`);
  if (!timed.length && !anytime.length) lines.push("", "Nada marcado para hoje.");
  return lines.join("\n");
}
