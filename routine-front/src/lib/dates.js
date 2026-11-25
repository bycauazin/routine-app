/** Calendar dates are "YYYY-MM-DD" strings, resolved in São Paulo time. */

export const TIME_ZONE = "America/Sao_Paulo";

export function today(timeZone = TIME_ZONE) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(),
  );
}

/** "2025-03-07" → "07/03/2025" */
export function formatDate(civilDate) {
  if (!civilDate) return "—";
  const [y, m, d] = civilDate.split("-");
  return `${d}/${m}/${y}`;
}

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "2025-03-07" → "7 de março de 2025" */
export function formatDateLong(civilDate) {
  const [y, m, d] = civilDate.split("-").map(Number);
  return `${d} de ${MONTHS[m - 1]} de ${y}`;
}

/** Greeting by local hour in São Paulo. */
export function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", hour12: false }).format(new Date()),
  );
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

/** "2026-11-23" → "segunda-feira, 23 de novembro" (the calendar day, no time zone shift). */
export function formatDayTitle(civilDate) {
  const [y, m, d] = civilDate.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday}, ${d} de ${MONTHS[m - 1]}`;
}

/** "2026-11-23" ± days, on the calendar (no time zone shift). */
export function shiftDate(civilDate, days) {
  const [y, m, d] = civilDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** First day of an inclusive range ending on `end` and covering a rolling calendar month. */
export function monthStartForRange(end) {
  const [year, month, day] = end.split("-").map(Number);
  const previousMonth = month - 2;
  const last = new Date(Date.UTC(year, previousMonth + 1, 0)).getUTCDate();
  const previousDate = new Date(Date.UTC(year, previousMonth, Math.min(day, last))).toISOString().slice(0, 10);
  return shiftDate(previousDate, 1);
}

/** Monday of the week of a date (weeks run Monday to Sunday, like the API). */
export function weekStart(civilDate) {
  const [y, m, d] = civilDate.split("-").map(Number);
  return shiftDate(civilDate, -((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7));
}

/** "23 a 29 de novembro", "30 de novembro a 6 de dezembro" (same year assumed unless it changes). */
export function formatWeekRange(from, to) {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  if (fy !== ty) return `${fd} de ${MONTHS[fm - 1]} de ${fy} a ${td} de ${MONTHS[tm - 1]} de ${ty}`;
  if (fm !== tm) return `${fd} de ${MONTHS[fm - 1]} a ${td} de ${MONTHS[tm - 1]}`;
  return `${fd} a ${td} de ${MONTHS[tm - 1]}`;
}
