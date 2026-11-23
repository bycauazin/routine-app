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
