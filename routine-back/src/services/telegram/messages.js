/** Texts the bot sends (HTML parse mode: only <b>, <i>, escaped user text). */

export const esc = (text) => String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const hhmm = (minute) => `${String(Math.floor((minute % 1440) / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
export const liters = (ml) => (ml < 1000 ? `${ml} ml` : `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(ml / 1000)} L`);

const PERIOD = { MORNING: "Manhã", AFTERNOON: "Tarde", NIGHT: "Noite" };
const mark = (item) => (item.status === "DONE" ? "✅" : item.status === "SKIPPED" ? "➖" : "▫️");

export const help = () =>
  [
    "<b>O que eu entendo</b>",
    "• <b>anotar comprar pão amanhã de manhã</b>: uma tarefa (sem dia, vai para “Quando der”)",
    "• <b>fiz treino</b>: marca como feito (também um afazer, como <i>fiz flashcards</i>)",
    "• <b>freelance sábado 14h às 21h</b>: um imprevisto, e o que ele tirou do lugar",
    "• <b>bebi 500</b> (ou 1,5 l): registra água",
    "• <b>resumo</b>: o seu dia de hoje",
    "• <b>ajuda</b>: esta lista",
  ].join("\n");

export const linked = (name) => `Pronto, ${esc(name)}! Seu Telegram está ligado ao nuCorre.\n\n${help()}`;
export const notLinked = () => "Ainda não sei quem é você. Abra o nuCorre em <b>Configurações → Telegram</b> e toque em <b>Conectar</b>.";
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

// ── 7B: tarefas, feito, imprevistos ──

const WEEKDAY = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const dayLabel = (date, today) => {
  if (!date) return "Quando der";
  if (date === today) return "hoje";
  const [y, m, d] = date.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${WEEKDAY[wd]} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
};
const when = (p) => {
  if (p.startMinute !== null && p.startMinute !== undefined) return p.endMinute !== null && p.endMinute !== undefined ? `${hhmm(p.startMinute)}–${hhmm(p.endMinute)}` : hhmm(p.startMinute);
  return p.period ? PERIOD[p.period].toLowerCase() : "";
};

export const SAVE_CANCEL = (id) => [[{ text: "Salvar", data: `s:${id}` }, { text: "Cancelar", data: `c:${id}` }]];

export const taskDraft = (p, today) => [`📝 <b>Anotar:</b> ${esc(p.name)}`, `${dayLabel(p.date, today)}${when(p) ? ` · ${when(p)}` : ""}`, p.viaAI ? "<i>(li com a IA: confira)</i>" : ""].filter(Boolean).join("\n");
export const unplannedDraft = (p, today) =>
  [
    `⚡ <b>Imprevisto:</b> ${esc(p.name)}`,
    `${dayLabel(p.date, today)} · ${when(p)}`,
    p.taken.length ? `Tira do lugar: ${p.taken.map(esc).join(", ")} (continua contando na nota)` : "Não cai em cima de nada do plano.",
    p.viaAI ? "<i>(li com a IA: confira)</i>" : "",
  ]
    .filter(Boolean)
    .join("\n");
export const unplannedNeedsTime = () => "Para um imprevisto, diga de que horas a que horas. Ex.: <b>trânsito hoje 18h às 19h30</b>";
export const saved = (text) => `✅ Salvo.\n${text}`;
export const cancelled = () => "Cancelado.";
export const expired = () => "Esse rascunho já foi salvo, cancelado ou expirou.";
export const doneItem = (name) => `✅ Feito: <b>${esc(name)}</b>`;
export const undone = (name) => `↩️ Voltou para pendente: <b>${esc(name)}</b>`;
export const notFound = (query) => `Não achei “${esc(query)}” pendente hoje. Mande <b>resumo</b> para ver o dia.`;
export const choose = (query) => `Qual destes? (“${esc(query)}”)`;

// ── 7D: resumo da manhã ──

export function morning(day, { name, yesterday }) {
  const first = String(name ?? "").split(" ")[0];
  const lines = [summary(day, { title: `Bom dia${first ? `, ${first}` : ""}! Seu dia hoje` })];
  if (yesterday.length) lines.push("", `<b>Ontem ficou sem fazer:</b> ${yesterday.map(esc).join(", ")}. Dá para encaixar hoje?`);
  if (day.overdue?.length) lines.push(`<b>Atrasadas:</b> ${day.overdue.map((i) => esc(i.name)).join(", ")}`);
  return lines.join("\n");
}
