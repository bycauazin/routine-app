import { addDays, todayIn } from "../../utils/dateUtils.js";
import { weekdayOf } from "../../utils/routineUtils.js";

/**
 * Rules that read a bot message (stage 7). Returns `{ intent, ... }` or
 * `{ intent: "unknown" }`; the AI fallback (7C) only sees the unknown ones.
 *
 *   "bebi 500", "tomei 1,5 l", "água 300ml"     → { intent: "water", amountMl }
 *   "resumo", "/resumo", "hoje"                  → { intent: "summary" }
 *   "ajuda", "/ajuda", "/start", "/help"         → { intent: "help" }
 *   "anotar comprar pão amanhã de manhã"         → { intent: "task", name, date, period, startMinute, endMinute }
 *                                                  (no day and no time: date null → "Quando der")
 *   "fiz treino", "feito flashcards"             → { intent: "done", query }
 *   "freelance sábado 14h às 21h",
 *   "imprevisto trânsito 18h às 19h30"           → { intent: "unplanned", name, date, startMinute, endMinute }
 */
const clean = (text) =>
  String(text ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/@\w+/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** "500" → 500 ml; "1,5 l" / "1.5 litro" → 1500 ml; "2l" → 2000 ml. */
function waterAmount(number, unit) {
  const value = Number(number.replace(",", "."));
  if (!Number.isFinite(value) || value <= 0) return null;
  const liters = /^l|^litro/.test(unit ?? "") || (!unit && value < 10 && number.match(/[,.]/));
  const ml = Math.round(liters ? value * 1000 : value);
  return ml >= 1 && ml <= 5000 ? ml : null;
}

// Word edges that also work with accented letters ("amanhã", "às").
const L = "(?<!\\p{L})";
const R = "(?!\\p{L})";
const re = (source) => new RegExp(source, "iu");
/** A time needs "h" or ":" ("14h", "14h30", "14:30"), so numbers in a name stay. */
const TIME = "(\\d{1,2})(?::(\\d{2})|h(\\d{2})?)";
const RANGE = re(`${L}(?:d[ae]s\\s+)?${TIME}\\s*(?:[àa]s|a|-|–|at[ée])\\s*${TIME}`);
const AT = re(`${L}(?:[àa]s\\s+)?${TIME}`);
const WEEKDAYS = [["domingo", 0], ["segunda", 1], ["ter[cç]a", 2], ["quarta", 3], ["quinta", 4], ["sexta", 5], ["s[áa]bado", 6]];
const PERIODS = [["manh[ãa]", "MORNING"], ["tarde", "AFTERNOON"], ["noite", "NIGHT"]];

const minute = (h, m1, m2) => {
  const hours = Number(h);
  const minutes = Number(m1 ?? m2 ?? 0);
  return hours <= 24 && minutes < 60 ? Math.min(1439, hours * 60 + minutes) : null;
};

/**
 * Takes the day, period and time out of a text. Returns what is left (the
 * name) and what was found. `date` is null when no day was said.
 */
export function extractWhen(text, today) {
  let rest = ` ${text} `;
  const take = (regex) => {
    const m = rest.match(regex);
    if (m) rest = rest.replace(m[0], " ");
    return m;
  };
  const out = { date: null, period: null, startMinute: null, endMinute: null };

  const range = take(RANGE);
  if (range) {
    out.startMinute = minute(range[1], range[2], range[3]);
    out.endMinute = minute(range[4], range[5], range[6]);
  } else {
    const at = take(AT);
    if (at) out.startMinute = minute(at[1], at[2], at[3]);
  }

  if (take(re(`${L}depois\\s+de\\s+amanh[ãa]${R}`))) out.date = addDays(today, 2);
  else if (take(re(`${L}amanh[ãa]${R}`))) out.date = addDays(today, 1);
  else if (take(re(`${L}hoje${R}`))) out.date = today;
  else {
    const dm = take(re(`${L}(?:dia\\s+)?(\\d{1,2})\\/(\\d{1,2})(?:\\/(\\d{2,4}))?(?!\\d)`));
    if (dm) {
      const year = dm[3] ? (dm[3].length === 2 ? 2000 + Number(dm[3]) : Number(dm[3])) : Number(today.slice(0, 4));
      const date = `${year}-${String(dm[2]).padStart(2, "0")}-${String(dm[1]).padStart(2, "0")}`;
      out.date = !dm[3] && date < today ? `${year + 1}${date.slice(4)}` : date;
    } else {
      for (const [name, wd] of WEEKDAYS) {
        if (take(re(`${L}(?:n[oa]\\s+|nest[ea]\\s+|pr[óo]xim[oa]\\s+)?${name}(?:-feira|\\s+feira)?${R}`))) {
          out.date = addDays(today, (wd - weekdayOf(today) + 7) % 7);
          break;
        }
      }
    }
  }

  for (const [name, period] of PERIODS) {
    if (take(re(`${L}(?:de|à|a|pela|na|da)\\s+${name}${R}`))) {
      if (out.startMinute === null) out.period = period;
      break;
    }
  }

  // Leftover glue words at the edges: "comprar pão de", "no", "pra".
  rest = rest.replace(/\s+/g, " ").trim().replace(re(`^(?:pra|para|de|no|na)${R}\\s*`), "").replace(re(`\\s*${L}(?:pra|para|de|no|na|do|da|às|as|a|e)$`), "").trim();
  return { rest, ...out };
}

const capitalize = (s) => (s ? s[0].toLocaleUpperCase("pt-BR") + s.slice(1) : s);

export function parseMessage(text, today = todayIn()) {
  const t = clean(text);
  if (!t) return { intent: "unknown" };
  if (/^\/?(ajuda|help|start|comandos)$/.test(t)) return { intent: "help" };
  if (/^\/?(resumo|hoje|dia)$/.test(t)) return { intent: "summary" };

  const water = t.match(/^\/?(?:bebi|tomei|agua|beber)\s+(?:mais\s+)?(\d+(?:[.,]\d+)?)\s*(ml|l|litros?)?(?:\s+de\s+agua)?$/);
  if (water) {
    const amountMl = waterAmount(water[1], water[2]);
    return amountMl ? { intent: "water", amountMl } : { intent: "unknown" };
  }

  const original = String(text ?? "").trim().replace(/\s+/g, " ");
  const done = original.match(re(`^\\/?(?:fiz|feito|terminei|conclu[íi])\\s+(?:o\\s+|a\\s+)?(.+)$`));
  if (done) return { intent: "done", query: done[1].trim() };

  const task = original.match(re(`^\\/?(?:anotar|anota|anote|lembrar\\s+de|lembra\\s+de|tarefa)\\s*:?\\s+(.+)$`));
  if (task) {
    const when = extractWhen(task[1], today);
    if (!when.rest) return { intent: "unknown" };
    const date = when.date ?? (when.startMinute !== null || when.period ? today : null);
    return { intent: "task", name: capitalize(when.rest), ...when, date, rest: undefined };
  }

  const explicit = original.match(re(`^\\/?imprevisto\\s*:?\\s+(.+)$`));
  const when = extractWhen(explicit ? explicit[1] : original, today);
  if (when.startMinute !== null && when.endMinute !== null && when.rest && (explicit || when.endMinute > when.startMinute)) {
    return { intent: "unplanned", name: capitalize(when.rest), date: when.date ?? today, startMinute: when.startMinute, endMinute: when.endMinute };
  }
  if (explicit) return { intent: "unplanned", name: capitalize(when.rest || explicit[1]), date: when.date ?? today, startMinute: null, endMinute: null };
  return { intent: "unknown" };
}
